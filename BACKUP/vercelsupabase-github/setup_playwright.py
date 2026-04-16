"""
Setup Playwright Profile
------------------------
Run this script ONCE to log into your Google Account.
Playwright will save your login cookies so the daemon can post automatically.
"""
from playwright.sync_api import sync_playwright
import os

PROFILE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "playwright_profile"))

def setup_login():
    print("="*60)
    print("🌐 Setting up Browser Authentication for Blogger")
    print("="*60)
    print("1. A browser window will open.")
    print("2. Please log in to your Google Account.")
    print("3. Navigate to your Blogger dashboard.")
    print("4. Come back to this terminal and press ENTER when you are done.")
    print("="*60)

    with sync_playwright() as p:
        # Launch persistent context
        context = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE_DIR,
            headless=False,
            viewport={"width": 1280, "height": 720},
            channel="chrome",  # Use real Chrome instead of Chromium
            args=["--disable-blink-features=AutomationControlled"],
            ignore_default_args=["--enable-automation"]
        )
        
        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://www.blogger.com/", wait_until="commit")
        
        input("\n✅ Press ENTER here ONLY AFTER you have logged in and can see your Blogger dashboard! ")
        
        context.close()
        print("\n🎉 Browser profile saved successfully! The daemon can now post for you.")

if __name__ == "__main__":
    setup_login()
