"""
Deduplicator
------------
Detects duplicate articles using title similarity.
Compares against recently published Blogger posts.
"""

from difflib import SequenceMatcher
import logging
import re
import json
import requests
from urllib.parse import urlparse, parse_qsl, urlencode

from config import SIMILARITY_THRESHOLD, MISTRAL_API_KEY, MISTRAL_MODEL, GOOGLE_API_KEYS
from summarizer import call_gemini, call_mistral

logger = logging.getLogger(__name__)


def normalize_title(title):
    """Normalize a title for comparison - remove extra spaces, punctuation."""
    title = title.strip().lower()
    # Remove trailing source segment (e.g. "... - Some Source")
    title = re.sub(r"\s[-|]\s[a-z0-9 .]{2,}$", "", title)
    # Remove common Malayalam/English punctuation and extra whitespace
    title = re.sub(r'[:\-–—|•·,;!?\'\"()[\]{}]', ' ', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip()


def normalize_url(url):
    """Normalize URL for duplicate checks."""
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        scheme = (parsed.scheme or "https").lower()
        netloc = parsed.netloc.lower().replace("www.", "")
        path = parsed.path.rstrip("/")
        params = parse_qsl(parsed.query, keep_blank_values=True)
        tracking_prefixes = ("utm_", "fbclid", "gclid", "igshid", "mc_cid", "mc_eid")
        filtered = []
        for k, v in params:
            key = (k or "").lower()
            if key in ("ref", "ref_src", "source", "from", "feature", "spm"):
                continue
            if any(key.startswith(prefix) for prefix in tracking_prefixes):
                continue
            filtered.append((key, v))
        filtered.sort(key=lambda x: (x[0], x[1]))
        query = urlencode(filtered, doseq=True)
        return f"{scheme}://{netloc}{path}" + (f"?{query}" if query else "")
    except Exception:
        return url.strip()


def title_similarity(title1, title2):
    """Calculate similarity ratio between two titles."""
    t1 = normalize_title(title1)
    t2 = normalize_title(title2)
    return SequenceMatcher(None, t1, t2).ratio()


def token_overlap_ratio(title1, title2):
    """Token overlap ratio: intersection / smaller token set."""
    t1 = set(normalize_title(title1).split())
    t2 = set(normalize_title(title2).split())
    if not t1 or not t2:
        return 0.0
    common = len(t1.intersection(t2))
    return common / min(len(t1), len(t2))


def normalize_snippet(text):
    """Normalize article snippet for near-duplicate detection across sources."""
    if not text:
        return ""
    text = text.strip().lower()
    text = re.sub(r"<[^>]*>", " ", text)
    text = re.sub(r'[:\-–—|•·,;!?\'\"()[\]{}]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    tokens = text.split()
    # First 40 tokens usually capture the core event details.
    return " ".join(tokens[:40])


def is_duplicate_title(new_title, existing_title):
    """Multi-signal duplicate check for close titles."""
    norm_new = normalize_title(new_title)
    norm_existing = normalize_title(existing_title)
    if not norm_new or not norm_existing:
        return False, 0.0, 0.0

    if norm_new == norm_existing:
        return True, 1.0, 1.0

    similarity = SequenceMatcher(None, norm_new, norm_existing).ratio()
    overlap = token_overlap_ratio(norm_new, norm_existing)

    # Accept duplicate if:
    # 1) very high sequence similarity OR
    # 2) one title contains the other + high token overlap
    contains_match = norm_new in norm_existing or norm_existing in norm_new
    is_dup = similarity >= SIMILARITY_THRESHOLD or (contains_match and overlap >= 0.80)
    return is_dup, similarity, overlap


def deduplicate_articles(articles, existing_posts):
    """
    Remove duplicate articles.
    
    Args:
        articles: List of article dicts from RSS feeds
        existing_posts: List of existing post entries ({title, original_url}) or title strings
    
    Returns:
        List of unique articles not yet published
    """
    unique_articles = []
    seen_titles = []
    seen_urls = set()
    seen_snippets = set()
    seen_images = set()

    # Backward compatible: accept either list[str] or list[dict]
    seen_original_titles = []
    seen_unresolved_urls = set()
    
    for entry in existing_posts or []:
        if isinstance(entry, dict):
            title = entry.get("title", "")
            url = normalize_url(entry.get("original_url", ""))
            image_url = entry.get("image_url", "")
            
            # Parse original title and unresolved URL from the faq JSON list
            faq = entry.get("faq")
            if isinstance(faq, list):
                for item in faq:
                    if isinstance(item, dict) and "original_title" in item:
                        orig_t = item.get("original_title", "")
                        unres_u = normalize_url(item.get("unresolved_url", ""))
                        if orig_t:
                            seen_original_titles.append(orig_t)
                        if unres_u:
                            seen_unresolved_urls.add(unres_u)
                        break
        else:
            title = str(entry or "")
            url = ""
            image_url = ""
            
        if title:
            seen_titles.append(title)
        if url:
            seen_urls.add(url)
        if image_url:
            seen_images.add(image_url)
    
    for article in articles:
        title = article["title"]
        article_url = normalize_url(article.get("link", ""))
        article_snippet = normalize_snippet(article.get("description", ""))
        article_image = article.get("image_url", "")
        is_duplicate = False

        # 1) URL-level duplicate (strongest signal)
        if article_url and (article_url in seen_urls or article_url in seen_unresolved_urls):
            logger.debug(f"🔄 Duplicate URL: '{title[:50]}...' ({article_url})")
            is_duplicate = True
        
        # 2) Title-level duplicate checks (rewritten titles)
        if not is_duplicate:
            for existing_title in seen_titles:
                is_dup_title, similarity, overlap = is_duplicate_title(title, existing_title)
                if is_dup_title:
                    logger.debug(
                        f"🔄 Duplicate rewritten title (sim={similarity:.0%}, overlap={overlap:.0%}): '{title[:50]}...' "
                        f"≈ '{existing_title[:50]}...'"
                    )
                    is_duplicate = True
                    break

        # 2b) Title-level duplicate checks (original titles)
        if not is_duplicate:
            for orig_title in seen_original_titles:
                is_dup_orig, similarity, overlap = is_duplicate_title(title, orig_title)
                if is_dup_orig:
                    logger.debug(
                        f"🔄 Duplicate original title (sim={similarity:.0%}, overlap={overlap:.0%}): '{title[:50]}...' "
                        f"≈ '{orig_title[:50]}...'"
                    )
                    is_duplicate = True
                    break

        # 3) Snippet-level duplicate across current batch/source variants
        if not is_duplicate and article_snippet:
            if article_snippet in seen_snippets:
                logger.debug(f"🔄 Duplicate snippet: '{title[:50]}...'")
                is_duplicate = True

        # 4) Image-level duplicate across current batch/source variants
        if not is_duplicate and article_image:
            # We must verify the image is not just a generic placeholder because 
            # if multiple articles have the same generic image, they aren't necessarily duplicates.
            # But the backend news_fetcher.py already blocks generic placeholders.
            if article_image in seen_images:
                logger.debug(f"🔄 Duplicate image: '{title[:50]}...'")
                is_duplicate = True
        
        if not is_duplicate:
            unique_articles.append(article)
            seen_titles.append(title)
            if article_url:
                seen_urls.add(article_url)
            if article_snippet:
                seen_snippets.add(article_snippet)
            if article_image:
                seen_images.add(article_image)
    
    duplicates_found = len(articles) - len(unique_articles)
    logger.info(
        f"🔍 Deduplication: {len(articles)} articles → "
        f"{len(unique_articles)} unique ({duplicates_found} duplicates removed)"
    )
    
    return unique_articles


def rank_articles(articles):
    """
    Rank articles by freshness and source diversity.
    Returns sorted list (most important first).
    """
    # Sort by published date (newest first)
    articles.sort(key=lambda a: a.get("published", ""), reverse=True)
    
    # Ensure source diversity - don't take too many from same source
    seen_sources = {}
    ranked = []
    remaining = []
    
    for article in articles:
        source = article["source_name"]
        count = seen_sources.get(source, 0)
        
        if count < 3:  # Max 3 per source
            ranked.append(article)
            seen_sources[source] = count + 1
        else:
            remaining.append(article)
    
    # Add remaining if needed
    ranked.extend(remaining)
    
    return ranked


def ai_semantic_dedup(candidate_title, existing_titles):
    """
    Use Gemini (with key rotation) or Mistral AI to perform a semantic check of the candidate title
    against the last 50 published titles to catch duplicates with different wordings.
    Returns True if duplicate, False otherwise.
    """
    if not candidate_title or not existing_titles:
        return False
        
    if not GOOGLE_API_KEYS and not MISTRAL_API_KEY:
        return False
        
    # Filter existing titles by fast similarity heuristics first.
    # If the candidate doesn't share any similarity or token overlap with an existing title,
    # it is guaranteed not to be a duplicate.
    similar_titles_with_scores = []
    for t in existing_titles:
        if not t:
            continue
        sim = title_similarity(candidate_title, t)
        overlap = token_overlap_ratio(candidate_title, t)
        if sim >= 0.30 or overlap >= 0.20:
            similar_titles_with_scores.append((t, max(sim, overlap)))

    if not similar_titles_with_scores:
        logger.debug(f"  ⏭️ Skipping AI Semantic Deduplication for '{candidate_title[:50]}...' (No similar titles found by heuristics)")
        return False

    # Sort by score (descending) and take top 10 most similar to keep the prompt small
    similar_titles_with_scores.sort(key=lambda x: x[1], reverse=True)
    similar_titles = [item[0] for item in similar_titles_with_scores[:10]]

    logger.info(f"  🧠 Running AI Semantic Deduplication for: '{candidate_title[:50]}...' against {len(similar_titles)} candidate matches")
    
    prompt = f"You are a news deduplication system.\n\nCandidate News Title: {candidate_title}\n\nRecent Published Titles:\n"
    for t in similar_titles:
        prompt += f"- {t}\n"
            
    prompt += """
Is the Candidate News Title reporting the EXACT SAME specific news event or story as ANY of the Recent Published Titles?
Focus on the core meaning. If they are about the exact same incident involving the same people, return YES. If it is a different event, return NO.
Reply with a valid JSON object ONLY: {"is_duplicate": true} or {"is_duplicate": false}
"""
    
    # 1. Try Gemini first — fast_fail=True so we never block the pipeline
    # waiting on rate limits just for a dedup check
    if GOOGLE_API_KEYS:
        try:
            gemini_resp = call_gemini(prompt, fast_fail=True)
            if gemini_resp:
                # Clean potential markdown block fences if any
                cleaned = re.sub(r"^```json\s*|\s*```$", "", gemini_resp.strip(), flags=re.IGNORECASE)
                result = json.loads(cleaned)
                is_dup = result.get("is_duplicate", False)
                if is_dup:
                    logger.warning(f"  🛑 AI Semantic Dedup (Gemini) flagged as duplicate!")
                return is_dup
        except Exception as e:
            logger.warning(f"  ⚠️ AI Semantic Dedup (Gemini) failed/skipped: {e}")

    # 2. Fallback to Mistral AI
    if MISTRAL_API_KEY:
        try:
            mistral_resp = call_mistral(prompt)
            if mistral_resp:
                cleaned = re.sub(r"^```json\s*|\s*```$", "", mistral_resp.strip(), flags=re.IGNORECASE)
                result = json.loads(cleaned)
                is_dup = result.get("is_duplicate", False)
                if is_dup:
                    logger.warning(f"  🛑 AI Semantic Dedup (Mistral) flagged as duplicate!")
                return is_dup
        except Exception as e:
            logger.warning(f"  ⚠️ AI Semantic Dedup (Mistral) failed: {e}")
        
    return False
