"""Quick test for Playwright publishing."""
from playwright_publisher import publish_via_playwright
import logging, sys

logging.basicConfig(level=logging.INFO, stream=sys.stdout)

article = {
    "title": "FreshNews Playwright Test (Browser Automation)",
    "summary": "This post was created purely by Python driving a real Google Chrome browser. No API quota used!",
    "source_name": "TestSource",
    "tags": ["Automation", "Playwright", "Blogger"]
}

print("Starting playwright publisher test...")
success = publish_via_playwright(article)
if success:
    print("✅ Successfully published via Playwright!")
else:
    print("❌ Failed to publish via Playwright.")
