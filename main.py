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
import os
import gc
from datetime import datetime, timezone, timedelta

from config import (
    MALAYALAM_RSS_FEEDS,
    DAY_START_HOUR, DAY_END_HOUR,
    DAY_DELAY_SECONDS, NIGHT_DELAY_SECONDS,
)
from news_fetcher import fetch_feed_articles, enrich_with_images, scrape_full_text_if_needed, set_shared_browser
from deduplicator import deduplicate_articles, rank_articles, is_duplicate_title, ai_semantic_dedup
from summarizer import summarize_article
from supabase_publisher import publish_via_supabase, get_existing_posts, prune_oldest_post

# --- Logging Setup ---
LOG_FILE = "freshnews.log"
MAX_LOG_LINES = 100

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ]
)
logger = logging.getLogger(__name__)


def trim_log_file():
    """Keep only the last MAX_LOG_LINES lines in the log file."""
    try:
        with open(LOG_FILE, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
        if len(lines) > MAX_LOG_LINES:
            with open(LOG_FILE, "w", encoding="utf-8") as f:
                f.writelines(lines[-MAX_LOG_LINES:])
    except Exception:
        pass  # Non-critical; never crash the daemon over log trimming

# --- IST Timezone ---
IST = timezone(timedelta(hours=5, minutes=30))
MIN_ARTICLE_WORDS = 150
MAX_AI_DEDUP_PER_ROTATION = 5   # Cap AI semantic dedup calls to preserve token quota
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
global_published_count = 0

def get_current_delay():
    """Return the appropriate delay based on current IST time."""
    now_ist = datetime.now(IST)
    hour = now_ist.hour
    if DAY_START_HOUR <= hour < DAY_END_HOUR:
        return DAY_DELAY_SECONDS
    else:
        return NIGHT_DELAY_SECONDS

def run_rotation():
    global global_published_count
    global_published_count = 0
    logger.info("=" * 60)
    logger.info("FreshNews (Supabase) -- Starting Source Rotation...")
    now_ist = datetime.now(IST)
    delay = get_current_delay()
    mode = "DAY" if DAY_START_HOUR <= now_ist.hour < DAY_END_HOUR else "NIGHT"
    pub_method = "SUPABASE DB (Unlimited)"
    logger.info(f"   Mode: {mode} | Time: {now_ist.strftime('%I:%M %p')} IST | Delay: {delay}s | Publisher: {pub_method}")
    logger.info("=" * 60)

    # 0. Cleanup any zombie Playwright/Chromium processes from previous cycles
    # This acts as an aggressive garbage collector to keep CPU/Memory low
    logger.info("  🧹 Running aggressive garbage collection (killing stuck browsers)...")
    os.system("pkill -f playwright; pkill -f chrome; pkill -f chromium")

    # 2. Get existing posts for deduplication straight from DB
    existing_posts = get_existing_posts()

    # Per-rotation counter — AI semantic dedup is capped to save token quota
    ai_dedup_calls = 0

    # Shuffle feeds to randomize the order each rotation
    feeds = list(MALAYALAM_RSS_FEEDS)
    random.shuffle(feeds)

    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            logger.info("  🌐 Initializing Shared Playwright Browser...")
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-site-isolation-trials',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                ]
            )
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='America/New_York',
            )
            set_shared_browser(context)
            logger.info("  ✅ Shared Browser Ready!")

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
                    time.sleep(1.5)
                    continue

                # 2. Deduplicate
                unique_articles = deduplicate_articles(articles, existing_posts)
                if not unique_articles:
                    logger.info(f"  No new unique articles for {feed_config['name']}. Skipping.")
                    time.sleep(1.5)
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

                    # AI Semantic Deduplication — capped at MAX_AI_DEDUP_PER_ROTATION
                    # to prevent burning token quota on every candidate
                    if ai_dedup_calls < MAX_AI_DEDUP_PER_ROTATION:
                        if ai_semantic_dedup(title, [ep.get("title") for ep in existing_posts]):
                            logger.info(f"  ⏭️ Candidate {idx}: AI flagged as semantic duplicate '{title[:40]}...'")
                            ai_dedup_calls += 1
                            continue
                        ai_dedup_calls += 1
                    else:
                        logger.debug(f"  ℹ️ AI dedup cap reached ({MAX_AI_DEDUP_PER_ROTATION}/rotation) — heuristic-only for '{title[:40]}...'")

                    candidate["original_title"] = candidate.get("title", "")
                    candidate["unresolved_url"] = candidate.get("link", "")
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
                         
                    # Image Deduplication: Check if the enriched image already exists
                    img_dup = False
                    for ep in existing_posts:
                        if ep.get("image_url") and best_article["image_url"] == ep.get("image_url"):
                            logger.warning(f"  🔁 Skipping: Image is already used by an existing post.")
                            img_dup = True
                            break
                            
                    if img_dup:
                        continue
                         
                    # C. Summarize with AI (Mistral primary)
                    result = summarize_article(best_article)
                    if not result:
                        logger.warning("  Skipping article due to AI failure.")
                        continue
                    
                    new_title, summary, keywords, faq, bogus_comments = result
                    
                    # Enforce strict minimum word count on final summary text
                    final_wc = len((summary or "").split())
                    if final_wc < MIN_ARTICLE_WORDS:
                        logger.warning(
                            f"  ⏭️ Skipping article '{new_title[:30]}' because final summary/content is too short ({final_wc} words)."
                        )
                        continue
                        
                    best_article["bogus_comments"] = bogus_comments
                    
                    # Update title with rewritten version
                    best_article["title"] = new_title
                    
                    # Secondary Deduplication: Ensure the AI rewritten title isn't a duplicate of what's already published
                    ai_dup = False
                    for ep in existing_posts:
                        is_dup_title, sim, overlap = is_duplicate_title(new_title, ep.get("title", ""))
                        if is_dup_title:
                            logger.warning(f"  🔁 Skipping: AI generated title '{new_title[:40]}...' is a duplicate of existing post.")
                            ai_dup = True
                            break
                            
                    if ai_dup:
                        continue
                    
                    # Final Tag List: 4 AI Keywords. 
                    # (Note: Supabase publisher automatically adds Source Name as the 1st tag)
                    
                    # Ensure we have exactly 4 keywords to hit the 5-tag total
                    ai_keywords = keywords[:4]
                    while len(ai_keywords) < 4:
                        ai_keywords.append(["Trending", "News", "Update", "Flash"][len(ai_keywords)])
                    
                    best_article["summary"] = summary + f"\n\nPhoto and News Source: {best_article['source_name']}"
                    best_article["tags"] = ai_keywords
                    best_article["faq"] = faq
                    
                    # D. Publish directly to Supabase Postgre DB!
                    if publish_via_supabase(best_article):
                        global_published_count += 1
                        existing_posts.append({
                            "title": best_article.get("title", ""),
                            "original_url": best_article.get("link", ""),
                            "image_url": best_article.get("image_url", ""),
                            "faq": best_article.get("faq", []),
                        })

                        # Prune the oldest eligible post to keep the DB lean
                        prune_oldest_post()

                        # Update recent sources to prevent consecutive posts from same source
                        recent_sources.append(base_source)
                        if len(recent_sources) > 3:
                            recent_sources.pop(0)
                    else:
                        # If publishing failed (e.g. duplicate blocked by DB), skip delay and go to next source
                        continue
                        
                except Exception as e:
                     logger.error(f"  Article Pipeline failed: {e}")
                     
                # E. Smart delay
                current_delay = get_current_delay()
                now_ist = datetime.now(IST)
                mode_str = "DAY" if DAY_START_HOUR <= now_ist.hour < DAY_END_HOUR else "NIGHT"
                logger.info(f"  [{mode_str}] Waiting {current_delay}s before next article ({now_ist.strftime('%I:%M %p')} IST)\n")
                time.sleep(current_delay)

    finally:
        set_shared_browser(None)
        logger.info("  🧹 Rotation complete. Shared browser closed.")


def daemon_mode():
    logger.info(f"FreshNews Supabase Daemon Started | AI: Mistral->Groq | Publisher: Supabase (No Limits!)")
    logger.info(f"   Schedule: DAY ({DAY_START_HOUR}:00-{DAY_END_HOUR}:00 IST) = {DAY_DELAY_SECONDS}s | NIGHT = {NIGHT_DELAY_SECONDS}s")

    # Auto-restart settings: exit cleanly so PM2 restarts a fresh process
    MAX_ROTATIONS = 50            # Restart after this many rotations
    MAX_UPTIME_SECONDS = 6 * 3600 # Restart after 6 hours
    daemon_start_time = time.time()
    rotation_count = 0

    logger.info(f"   Auto-restart: every {MAX_ROTATIONS} rotations or {MAX_UPTIME_SECONDS // 3600}h uptime")

    while True:
        try:
            # ── Check if it's time for a fresh restart ──
            uptime = time.time() - daemon_start_time
            rotation_count += 1

            if rotation_count > MAX_ROTATIONS or uptime > MAX_UPTIME_SECONDS:
                hrs = int(uptime // 3600)
                mins = int((uptime % 3600) // 60)
                logger.critical(f"🔄 AUTO-RESTART: {rotation_count} rotations, {hrs}h {mins}m uptime. Killing browsers and exiting for PM2 restart...")
                os.system("pkill -f playwright; pkill -f chrome; pkill -f chromium")
                gc.collect()
                time.sleep(3)
                os._exit(0)  # Clean exit — PM2 will restart us fresh

            logger.info(f"📊 Rotation #{rotation_count} | Uptime: {int(uptime // 60)}m | Next restart at #{MAX_ROTATIONS} or {MAX_UPTIME_SECONDS // 3600}h")

            import threading
            rotation_thread = threading.Thread(target=run_rotation, daemon=True)
            rotation_start = time.time()
            rotation_thread.start()
            rotation_thread.join(timeout=600)  # 10 minute hard limit per rotation

            if rotation_thread.is_alive():
                elapsed = int(time.time() - rotation_start)
                logger.critical(f"⚠️ WATCHDOG: Rotation stuck for {elapsed}s! Killing all browsers and moving on...")
                os.system("pkill -f playwright; pkill -f chrome; pkill -f chromium")
                time.sleep(5)  # Brief cooldown after force-kill
            else:
                # Normal completion: add a cooldown delay before the next rotation starts
                if global_published_count == 0:
                    idle_delay = 300  # 5 minutes
                    logger.info(f"✨ Rotation complete (0 articles published). Idle cooldown: waiting {idle_delay}s before starting next rotation...\n")
                    time.sleep(idle_delay)
                else:
                    delay = get_current_delay()
                    logger.info(f"✨ Rotation complete ({global_published_count} articles published). Waiting {delay}s before starting next rotation...\n")
                    time.sleep(delay)
        except Exception as e:
            logger.error(f"Critical error in rotation: {e}")
            time.sleep(get_current_delay())
        finally:
            # Force garbage collection to reclaim memory from abandoned threads
            gc.collect()
            # Trim log to last 100 lines after every rotation
            trim_log_file()


if __name__ == "__main__":
    daemon_mode()

