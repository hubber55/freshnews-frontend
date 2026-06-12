import traceback
from playwright.sync_api import sync_playwright

def test():
    print("Testing Playwright...")
    try:
        with sync_playwright() as p:
            print("1. sync_playwright started")
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
            print("2. chromium launched")
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='America/New_York',
            )
            print("3. context created")
            page = context.new_page()
            print("4. page created")
            
            url = 'https://news.google.com/rss/articles/CBMi1wFBVV95cUxOd0dReEpORnJDTXFzTTNkZGcyV1d5QTllaXh2ZEFzZnR4UlQ2OVJKNzlKM3drVjA1NUhxd0hDdlBSdFZ5aGpPenhGUnhzWU15TDhManM0d1JKNkw0S0lvY2VoeE1iQTRvYWhqV21hUHVGaGNaRWJPd0hsNE9OaWd2WlFUaUpVcFNaeDA1UGUxSlFEYU1RVXFmVVNIT3FndEdWV1laXzdNM2lRSHRndlYyQ0ZZQ2RrbDhZUHhEN3FsTTk0QWNuYlFyREZxQ211UE1Kbzh4SW5PSdIB3gFBVV95cUxNN0RudGQ1VVQzWXRNUWNTZHZYeTZCeDdDUzhVUmdOUXhFU0dKbF9feU53NWxKVDVKRGpFYzhmNGVTenlNOHhFNXlZMEk3RWRyeUZNX3dwNHZidV81MWltT3Q5VlRjRkxIR0Z5MHpJWWUxM3VMVXFDdUhsQXMyeTlvNFhQZnAtUXl4NG9qcl9pMUN3VlRJcWg4T0ZNcU5WNURYWWdmZzZTRVZHNEF0SUFFWGJ2NGZGcU91YnZaei1BblJrXzd4cUpjdFF3V2tQOUxRVlV6RFlxZElfc3JhV2c?oc=5'
            print("5. navigating to URL...")
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            print("6. waiting 3 seconds...")
            page.wait_for_timeout(3000)
            print("7. Result URL:", page.url)
            browser.close()
            print("SUCCESS!")
    except Exception as e:
        print("ERROR OCCURRED:")
        traceback.print_exc()

if __name__ == "__main__":
    test()
