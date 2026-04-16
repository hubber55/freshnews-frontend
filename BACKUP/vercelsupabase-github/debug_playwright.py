"""Take a screenshot of Blogger Create Post page."""
from playwright.sync_api import sync_playwright
import os
import time

BLOGGER_BLOG_ID = "6713653696036308181"
PROFILE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "playwright_profile"))

def take_screenshot():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=False,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(f"https://www.blogger.com/blog/post/edit/{BLOGGER_BLOG_ID}/create", wait_until="networkidle")
        time.sleep(5)
        page.screenshot(path="playwright_debug.png")
        context.close()

if __name__ == "__main__":
    take_screenshot()
