"""Dump the HTML of the new post page to find selectors."""
from playwright.sync_api import sync_playwright
import os
import time

BLOGGER_BLOG_ID = "6713653696036308181"
PROFILE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "playwright_profile"))

def dump_html():
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=True,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"]
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto(f"https://www.blogger.com/blog/post/edit/{BLOGGER_BLOG_ID}/create", wait_until="networkidle")
        time.sleep(5) # wait for angular to load
        html = page.content()
        with open("blogger_new_post.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("HTML dumped successfully.")
        context.close()

if __name__ == "__main__":
    dump_html()
