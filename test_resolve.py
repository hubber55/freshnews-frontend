import re
from config import MALAYALAM_RSS_FEEDS
from news_fetcher import fetch_feed_articles, scrape_full_text_if_needed, set_shared_browser

def test_resolve():
    print("Initializing Playwright...")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
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
        print("Playwright Ready.")
        
        feed_config = MALAYALAM_RSS_FEEDS[0] # Try first feed
        print(f"Fetching from {feed_config['name']}...")
        articles = fetch_feed_articles(feed_config, max_articles=1)
        if articles:
            candidate = articles[0]
            print(f"Original Link: {candidate['link']}")
            result = scrape_full_text_if_needed(candidate)
            print(f"Resolved Link: {result['link']}")
        else:
            print("No articles fetched.")

if __name__ == "__main__":
    test_resolve()
