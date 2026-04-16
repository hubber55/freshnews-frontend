"""Click New Post and dump editor HTML."""
from playwright.sync_api import sync_playwright
import os
import time

BLOGGER_BLOG_ID = "6713653696036308181"
PROFILE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "playwright_profile"))

def debug_editor():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=True,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(f"https://www.blogger.com/blog/posts/{BLOGGER_BLOG_ID}", wait_until="networkidle")
        
        # Click the Create New Post button using correct aria-label
        print("Clicking Create New Post...")
        page.locator('div[aria-label="Create New Post"]:visible').first.click()
        
        # Wait for the editor to load by waiting for network to be idle
        page.wait_for_load_state("networkidle")
        time.sleep(3)
        
        html = page.content()
        with open("blogger_editor.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("Editor HTML saved to blogger_editor.html")
        context.close()

if __name__ == "__main__":
    debug_editor()
