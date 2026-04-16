"""Debugging Playwright Title issue."""
from playwright.sync_api import sync_playwright
import os
import time

BLOGGER_BLOG_ID = "6713653696036308181"
PROFILE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "playwright_profile"))

def test():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=False,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(f"https://www.blogger.com/blog/posts/{BLOGGER_BLOG_ID}", wait_until="networkidle")
        
        print("1. Clicking Create New Post...")
        page.locator('div[aria-label="Create New Post"]:visible').first.click()
        time.sleep(5)
        
        try:
            print("2. Filling Title...")
            page.locator('input[aria-label="Title"]').first.fill("Test Post Automation")
        except Exception as e:
            print(f"Failed finding title: {e}")
            page.screenshot(path="playwright_title_fail.png")
            print("Screenshot saved to playwright_title_fail.png")

        context.close()

if __name__ == "__main__":
    test()
