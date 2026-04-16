"""Playwright script to list all buttons on the Create Post page."""
from playwright.sync_api import sync_playwright
import os

BLOGGER_BLOG_ID = "6713653696036308181"
PROFILE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "playwright_profile"))

def list_buttons():
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
        
        print("Clicking Create New Post...")
        page.locator('div[aria-label="Create New Post"]:visible').first.click()
        page.wait_for_load_state("networkidle")
        
        # Get all aria-labels from div and span roles
        elements = page.locator('*[aria-label]').all()
        for el in elements:
            try:
                print(el.get_attribute("aria-label"))
            except:
                pass
                
        context.close()

if __name__ == "__main__":
    list_buttons()
