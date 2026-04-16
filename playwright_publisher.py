"""
Playwright Publisher
--------------------
Publishes news articles to Blogger by automating a real browser.
This COMPLETELY bypasses the Blogger API quota!
"""

import logging
import os
import time
from playwright.sync_api import sync_playwright

from config import BLOGGER_BLOG_ID

logger = logging.getLogger(__name__)

PROFILE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "playwright_profile"))

def build_post_html(article):
    """Build the HTML content for the body."""
    title = article.get("title", "")
    summary = article.get("summary", "")
    image_url = article.get("image_url", "")
    source_name = article.get("source_name", "")

    image_html = ""
    courtesy_html = ""
    if image_url:
        image_html = f'<img src="{image_url}" alt="{title}" style="max-width: 100%; border-radius: 8px;" /><br /><br />'
        courtesy_html = f'<br /><br /><small><i>Photo courtesy - {source_name}</i></small>'

    summary_html = summary.replace('\n', '<br/>')

    html = f"""
{image_html}
<b>{title}</b><br/><br/>
{summary_html}
{courtesy_html}
"""
    return html


def publish_via_playwright(article):
    """
    Publish a single article to Blogger using headless browser automation.
    """
    title = article.get("title", "Untitled")
    labels = [article.get("source_name", "News")] + article.get("tags", [])
    html_body = build_post_html(article)

    if not os.path.exists(PROFILE_DIR):
        logger.error("  \u274c Missing playwright profile. Please run `python setup_playwright.py` first!")
        return False

    logger.info("  \U0001f916 Launching browser...")
    try:
        with sync_playwright() as p:
            context = p.chromium.launch_persistent_context(
                user_data_dir=PROFILE_DIR,
                headless=False,  # Running non-headless to be safe, can change to True later if needed
                viewport={"width": 1280, "height": 720},
                channel="chrome",
                args=["--disable-blink-features=AutomationControlled"],
                ignore_default_args=["--enable-automation"]
            )
            page = context.pages[0] if context.pages else context.new_page()
            
            # Go to dashboard first
            page.goto(f"https://www.blogger.com/blog/posts/{BLOGGER_BLOG_ID}", wait_until="networkidle")
            
            # Click the invisible Create New Post button
            page.locator('div[aria-label="Create New Post"]:visible').first.click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            # 1. Fill title
            page.locator('input[aria-label="Title"]').first.fill(title[:100])
            
            # 2. Fill body logic: 
            # Inject HTML directly into the rich text editor
            editor = page.locator('[contenteditable="true"]').first
            if editor.is_visible():
                editor.evaluate(f"el => el.innerHTML = `{html_body}`")
            else:
                # Type it normally
                page.keyboard.press("Tab")
                page.keyboard.type(html_body)

            # 3. Add labels (Tags)
            labels_accordion = page.locator('div:has-text("Labels")').last
            try:
                # Sometimes it's already open, but clicking it is safe
                if page.locator('input[aria-label="Separate labels by commas"]').count() == 0:
                    labels_accordion.click()
            except:
                pass
                
            label_input = page.locator('input[aria-label="Separate labels by commas"]')
            if label_input.count() > 0:
                label_input.first.fill(", ".join(labels))

            # 4. Publish
            page.locator('div[aria-label="Publish"]:visible').first.click()
            time.sleep(1)
            
            # Confirm publish dialog
            confirm_btn = page.locator('div[aria-label="Confirm"]:visible')
            if confirm_btn.count() > 0:
                confirm_btn.first.click()

            time.sleep(3)
            context.close()
            logger.info("  \u2705 Published via Playwright!")
            return True
            
    except Exception as e:
         logger.error(f"  \u274c Browser automation failed: {e}")
         return False
