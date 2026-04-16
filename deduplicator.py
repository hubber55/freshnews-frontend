"""
Deduplicator
------------
Detects duplicate articles using title similarity.
Compares against recently published Blogger posts.
"""

from difflib import SequenceMatcher
import logging
import re
from urllib.parse import urlparse, parse_qsl, urlencode

from config import SIMILARITY_THRESHOLD

logger = logging.getLogger(__name__)


def normalize_title(title):
    """Normalize a title for comparison - remove extra spaces, punctuation."""
    title = title.strip().lower()
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

    # Backward compatible: accept either list[str] or list[dict]
    for entry in existing_posts or []:
        if isinstance(entry, dict):
            title = entry.get("title", "")
            url = normalize_url(entry.get("original_url", ""))
        else:
            title = str(entry or "")
            url = ""
        if title:
            seen_titles.append(title)
        if url:
            seen_urls.add(url)
    
    for article in articles:
        title = article["title"]
        article_url = normalize_url(article.get("link", ""))
        is_duplicate = False

        # 1) URL-level duplicate (strongest signal)
        if article_url and article_url in seen_urls:
            logger.debug(f"🔄 Duplicate URL: '{title[:50]}...' ({article_url})")
            is_duplicate = True
        
        # 2) Title-level duplicate checks
        for existing_title in seen_titles:
            is_dup_title, similarity, overlap = is_duplicate_title(title, existing_title)
            if is_dup_title:
                logger.debug(
                    f"🔄 Duplicate (sim={similarity:.0%}, overlap={overlap:.0%}): '{title[:50]}...' "
                    f"≈ '{existing_title[:50]}...'"
                )
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique_articles.append(article)
            seen_titles.append(title)
            if article_url:
                seen_urls.add(article_url)
    
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
