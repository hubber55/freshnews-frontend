"""Robust Playwright test."""
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
        
        print("Clicking Create New Post with mouse movement...")
        button = page.locator('div[aria-label="Create New Post"]:visible').first
        box = button.wait_for(state="visible", timeout=10000)
        box = button.bounding_box()
        page.mouse.move(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
        time.sleep(0.5)
        page.mouse.down()
        time.sleep(0.1)
        page.mouse.up()
        
        print("Waiting for editor to load...")
        # URL has changed to editor with a dynamic ID. Wait for Title input.
        
        print("Filling Title...")
        # URL has changed to editor. Wait for Title input.
        title_input = page.locator('input[aria-label="Title"]')
        title_input.wait_for(state="visible", timeout=15000)
        title_input.first.fill("Test Post UI Automation")
        
        print("Switching to HTML view...")
        try:
            view_btn = page.locator('div[aria-label="View mode"], div[aria-label="Compose view"]').filter(state="visible").first
            view_btn.click()
            time.sleep(1)
            page.locator('text="HTML view"').first.click()
            time.sleep(1)
        except Exception as e:
            print(f"HTML view switch failed: {e}")
        
        print("Filling body...")
        try:
            # HTML Editor is a textarea when in HTML view
            textarea = page.locator('textarea[aria-label="Body"], textarea.FKS72b').first
            textarea.wait_for(state="visible", timeout=5000)
            textarea.fill("<b>HTML Automation Body</b><br>Works perfectly.")
        except Exception as e:
             print(f"Fallback to typing body: {e}")
             page.keyboard.press("Tab")
             page.keyboard.type("Fallback body")
             
        print("Filling labels...")
        try:
            # Label section is an accordion
            page.locator('div:has-text("Labels")').last.click()
            time.sleep(0.5)
            label_input = page.locator('input[aria-label="Separate labels by commas"]')
            label_input.wait_for(state="visible", timeout=5000)
            label_input.first.fill("Automated, Scripts")
        except:
             print("Could not fill labels.")
             
        print("Publishing...")
        page.locator('div[aria-label="Publish"]:visible').first.click()
        time.sleep(0.5)
        page.locator('div[aria-label="Confirm"]:visible').first.click()
        
        # Wait for redirect back to posts
        page.wait_for_url("**/*/posts/*", timeout=10000)
        print("SUCCESSFULLY PUBLISHED VIA PLAYWRIGHT!")
        context.close()

if __name__ == "__main__":
    test()
