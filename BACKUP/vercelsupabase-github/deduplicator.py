"""
Deduplicator
------------
Detects duplicate articles using title similarity.
Compares against recently published Blogger posts.
"""

from difflib import SequenceMatcher
import logging
import re

from config import SIMILARITY_THRESHOLD

logger = logging.getLogger(__name__)


def normalize_title(title):
    """Normalize a title for comparison - remove extra spaces, punctuation."""
    title = title.strip().lower()
    # Remove common Malayalam/English punctuation and extra whitespace
    title = re.sub(r'[:\-–—|•·,;!?\'\"()[\]{}]', ' ', title)
    title = re.sub(r'\s+', ' ', title)
    return title.strip()


def title_similarity(title1, title2):
    """Calculate similarity ratio between two titles."""
    t1 = normalize_title(title1)
    t2 = normalize_title(title2)
    return SequenceMatcher(None, t1, t2).ratio()


def deduplicate_articles(articles, existing_titles):
    """
    Remove duplicate articles.
    
    Args:
        articles: List of article dicts from RSS feeds
        existing_titles: List of titles already published on Blogger
    
    Returns:
        List of unique articles not yet published
    """
    unique_articles = []
    seen_titles = list(existing_titles)  # Copy existing titles
    
    for article in articles:
        title = article["title"]
        is_duplicate = False
        
        # Check against existing Blogger posts and already-selected articles
        for existing_title in seen_titles:
            similarity = title_similarity(title, existing_title)
            if similarity >= SIMILARITY_THRESHOLD:
                logger.debug(
                    f"🔄 Duplicate ({similarity:.0%}): '{title[:50]}...' "
                    f"≈ '{existing_title[:50]}...'"
                )
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique_articles.append(article)
            seen_titles.append(title)
    
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
