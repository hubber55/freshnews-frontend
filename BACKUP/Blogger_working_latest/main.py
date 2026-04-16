"""
FreshNews Main Script (Continuous Daemon Mode)
----------------------------------------------
Runs infinitely. Fetches articles, removes duplicates, summarizes with Groq AI, 
and perfectly drip-feeds them to Blogger 30 seconds apart. 
Then sleeps a bit and checks for new news again.
"""

import logging
import sys
import time
from datetime import datetime, timezone

from config import MAX_ARTICLES_PER_RUN, MALAYALAM_RSS_FEEDS
from news_fetcher import fetch_feed_articles, enrich_with_images, scrape_full_text_if_needed
from deduplicator import deduplicate_articles, rank_articles
from summarizer import summarize_article
from blogger_publisher import get_access_token, get_recent_post_titles, publish_post

# ─── Logging Setup ───
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("freshnews.log", encoding="utf-8"),
    ]
)
logger = logging.getLogger(__name__)

# ─── Tuning ───
POST_DELAY_SECONDS = 60 * 15   # Wait 15 minutes before grabbing and posting the next article

def run_rotation():
    logger.info("=" * 60)
    logger.info("🔄 FreshNews — Starting Source Rotation...")
    logger.info("=" * 60)

    # 1. Get existing posts for deduplication
    try:
        access_token = get_access_token()
        existing_titles = get_recent_post_titles(access_token)
    except Exception as e:
        logger.warning(f"⚠️  Could not fetch Blogger posts: {e}. Deduplication skipped.")
        existing_titles = []

    # Iterate continuously through each source
    for feed_config in MALAYALAM_RSS_FEEDS:
        articles = fetch_feed_articles(feed_config, max_articles=5)
        if not articles:
            continue

        # 2. Deduplicate
        unique_articles = deduplicate_articles(articles, existing_titles)
        if not unique_articles:
            logger.info(f"  ⏭️ No new unique articles for {feed_config['name']}. Skipping.")
            continue

        # 3. Pick the top active article (just 1)
        ranked_articles = rank_articles(unique_articles)
        best_article = ranked_articles[0]
        
        logger.info("-" * 50)
        logger.info(f"✨ Processing 1 article from {best_article['source_name']}: {best_article['title'][:60]}...")
        
        try:
            # A. Scrape full content if truncated
            best_article = scrape_full_text_if_needed(best_article)
            
            # B. Enrich Image
            best_article = enrich_with_images([best_article])[0]
                 
            # C. Summarize AI
            result = summarize_article(best_article)
            if not result:
                logger.warning("  ⚠️ Skipping article due to AI failure.")
                continue
            
            summary, tags = result
            best_article["summary"] = summary
            best_article["tags"] = tags
            
            # D. Publish
            fresh_token = get_access_token()
            if publish_post(best_article, fresh_token):
                logger.info(f"  ✅ Published! Adding to existing titles list.")
                existing_titles.append(best_article["title"])
                
        except Exception as e:
             logger.error(f"  ❌ Article Pipeline failed: {e}")
             
        # E. Sleep 30 seconds before hitting the next news source
        logger.info(f"  ⏳ Waiting for {POST_DELAY_SECONDS} seconds before moving to the next source...\n")
        time.sleep(POST_DELAY_SECONDS)

def daemon_mode():
    logger.info("🤖 FreshNews Daemon Started (Continuous Rotation Mode)")
    while True:
        try:
            run_rotation()
        except Exception as e:
            logger.error(f"❌ Critical error in rotation: {e}")
            time.sleep(POST_DELAY_SECONDS)

if __name__ == "__main__":
    daemon_mode()
