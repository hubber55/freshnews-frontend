"""
FreshNews Main Script (Continuous Supabase Daemon)
--------------------------------------------------
Runs infinitely. Fetches articles, removes duplicates, summarizes with AI 
(Mistral primary -> Groq fallback), and pushes them to Supabase DB.

Schedule:
  - Daytime  (6 AM - 10 PM IST): 1 article per minute   (~960/day)
  - Nighttime (10 PM - 6 AM IST): 1 article per 15 minutes (~32/night)
"""

import logging
import sys
import time
import re
import random
from datetime import datetime, timezone, timedelta

from config import (
    MALAYALAM_RSS_FEEDS,
    DAY_START_HOUR, DAY_END_HOUR,
    DAY_DELAY_SECONDS, NIGHT_DELAY_SECONDS,
)
from news_fetcher import fetch_feed_articles, enrich_with_images, scrape_full_text_if_needed, is_image_valid
from deduplicator import deduplicate_articles, rank_articles
from summarizer import summarize_article
from supabase_publisher import publish_via_supabase, get_existing_posts, get_recent_posts, soft_delete_post

# --- Logging Setup ---
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

# --- IST Timezone ---
IST = timezone(timedelta(hours=5, minutes=30))
MIN_ARTICLE_WORDS = 50
BLOCKED_TITLE_PATTERNS = [
    r"\bcontact\b",
    r"\babout\b",
    r"\bprivacy\b",
    r"\bterms\b",
    r"\blogin\b",
    r"\bsign[\s-]?in\b",
    r"\bsubscribe\b",
]

# Global state for source rotation
recent_sources = []

def get_current_delay():
    """Return the appropriate delay based on current IST time."""
    now_ist = datetime.now(IST)
    hour = now_ist.hour
    if DAY_START_HOUR <= hour < DAY_END_HOUR:
        return DAY_DELAY_SECONDS
    else:
        return NIGHT_DELAY_SECONDS


def cleanup_broken_images():
    """Verify images of recent posts and delete if broken."""
    logger.info("  🔍 Checking for accidentally posted broken images...")
    recent = get_recent_posts(limit=15)
    for p in recent:
        if not is_image_valid(p.get('image_url')):
            soft_delete_post(p['id'], reason="Broken Image cleanup")


def run_rotation():
    logger.info("=" * 60)
    logger.info("FreshNews (Supabase) -- Starting Source Rotation...")
    now_ist = datetime.now(IST)
    delay = get_current_delay()
    mode = "DAY" if DAY_START_HOUR <= now_ist.hour < DAY_END_HOUR else "NIGHT"
    pub_method = "SUPABASE DB (Unlimited)"
    logger.info(f"   Mode: {mode} | Time: {now_ist.strftime('%I:%M %p')} IST | Delay: {delay}s | Publisher: {pub_method}")
    logger.info("=" * 60)

    # 0. Cleanup broken images from recent posts
    cleanup_broken_images()

    # 1. Get existing posts for deduplication straight from DB
    existing_posts = get_existing_posts()

    # Shuffle feeds to randomize the order each rotation
    feeds = list(MALAYALAM_RSS_FEEDS)
    random.shuffle(feeds)

    # Iterate continuously through each source
    for feed_config in feeds:
        feed_name = feed_config['name']
        
        # Group similar sources (e.g., "Kerala Kaumudi Cinema" -> "Kerala Kaumudi")
        base_source = feed_name.replace(" Cinema", "").replace(" Latest", "").strip()
        
        # Ensure we don't publish from the same source back-to-back
        if base_source in recent_sources:
            logger.info(f"  ⏭️ Skipping {feed_name} to rotate sources (published recently).")
            continue

        articles = fetch_feed_articles(feed_config, max_articles=20)
        if not articles:
            continue

        # 2. Deduplicate
        unique_articles = deduplicate_articles(articles, existing_posts)
        if not unique_articles:
            logger.info(f"  No new unique articles for {feed_config['name']}. Skipping.")
            continue

        # 3. Rank and try candidates until we find a publishable article
        ranked_articles = rank_articles(unique_articles)
        selected_article = None
        selected_word_count = 0
        selected_idx = -1

        for idx, candidate in enumerate(ranked_articles, start=1):
            title = candidate.get("title", "")
            title_lower = title.lower()
            if any(re.search(pattern, title_lower) for pattern in BLOCKED_TITLE_PATTERNS):
                logger.info(f"  ⏭️ Candidate {idx}: skipped low-value page title '{title[:40]}...'")
                continue

            candidate = scrape_full_text_if_needed(candidate)
            wc = len((candidate.get("description", "") or "").split())

            if wc < MIN_ARTICLE_WORDS:
                logger.info(f"  ⏭️ Candidate {idx}: too short ({wc} words) for '{title[:40]}...'")
                continue

            selected_article = candidate
            selected_word_count = wc
            selected_idx = idx
            break

        if not selected_article:
            logger.warning(f"  No publishable article found for {feed_config['name']} after trying {len(ranked_articles)} candidates.")
            continue

        best_article = selected_article
        logger.info("-" * 50)
        logger.info(
            f"Processing candidate {selected_idx} from {best_article['source_name']}: "
            f"{best_article['title'][:60]}... ({selected_word_count} words)"
        )
        
        try:
            # A. Final safety check for content length
            input_content = best_article.get("description", "")
            word_count = len(input_content.split())
            if word_count < MIN_ARTICLE_WORDS:
                logger.warning(
                    f"  ⏭️ Skipping article '{best_article['title'][:30]}' because content is too short ({word_count} words)."
                )
                continue
            
            # B. Enrich Image
            best_article = enrich_with_images([best_article])[0]
            
            if not best_article.get("image_url"):
                logger.warning("  Skipping article because no valid image was found.")
                continue
                 
            # C. Summarize with AI (Mistral primary)
            result = summarize_article(best_article)
            if not result:
                logger.warning("  Skipping article due to AI failure.")
                continue
            
            new_title, summary, keywords, faq = result
            
            # Update title with rewritten version
            best_article["title"] = new_title
            
            # Generate Date Tag (e.g. 13th April 26)
            def get_day_suffix(n):
                if 11 <= n <= 13: return "th"
                return {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
            
            now_ist = datetime.now(IST)
            day = now_ist.day
            date_tag = now_ist.strftime(f"{day}{get_day_suffix(day)} %B %y")
            
            # Final Tag List: Date (1) + Content (3). 
            # (Note: Supabase publisher automatically adds Source Name as the 1st tag)
            
            # Ensure we have exactly 3 keywords to hit the 5-tag total
            ai_keywords = keywords[:3]
            while len(ai_keywords) < 3:
                ai_keywords.append(["Trending", "News", "Update"][len(ai_keywords)])
            
            final_tags = [date_tag] + ai_keywords
            
            best_article["summary"] = summary + f"\n\nPhoto and News Source: {best_article['source_name']}"
            best_article["tags"] = final_tags
            best_article["faq"] = faq
            
            # D. Publish directly to Supabase Postgre DB!
            if publish_via_supabase(best_article):
                existing_posts.append({
                    "title": best_article.get("title", ""),
                    "original_url": best_article.get("link", ""),
                })
                
                # Update recent sources to prevent consecutive posts from same source
                recent_sources.append(base_source)
                if len(recent_sources) > 3:
                    recent_sources.pop(0)
                
        except Exception as e:
             logger.error(f"  Article Pipeline failed: {e}")
             
        # E. Smart delay
        current_delay = get_current_delay()
        now_ist = datetime.now(IST)
        mode_str = "DAY" if DAY_START_HOUR <= now_ist.hour < DAY_END_HOUR else "NIGHT"
        logger.info(f"  [{mode_str}] Waiting {current_delay}s before next article ({now_ist.strftime('%I:%M %p')} IST)\n")
        time.sleep(current_delay)


def daemon_mode():
    logger.info(f"FreshNews Supabase Daemon Started | AI: Mistral->Groq | Publisher: Supabase (No Limits!)")
    logger.info(f"   Schedule: DAY ({DAY_START_HOUR}:00-{DAY_END_HOUR}:00 IST) = {DAY_DELAY_SECONDS}s | NIGHT = {NIGHT_DELAY_SECONDS}s")
    while True:
        try:
            run_rotation()
        except Exception as e:
            logger.error(f"Critical error in rotation: {e}")
            time.sleep(get_current_delay())


if __name__ == "__main__":
    daemon_mode()
