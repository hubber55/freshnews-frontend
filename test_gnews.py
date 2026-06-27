from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        page = context.new_page()
        
        url = "https://news.google.com/rss/articles/CBMi1wFBVV95cUxOd0dReEpORnJDTXFzTTNkZGcyV1d5QTllaXh2ZEFzZnR4UlQ2OVJKNzlKM3drVjA1NUhxd0hDdlBSdFZ5aGpPenhGUnhzWU15TDhManM0d1JKNkw0S0lvY2VoeE1iQTRvYWhqV21hUHVGaGNaRWJPd0hsNE9OaWd2WlFUaUpVcFNaeDA1UGUxSlFEYU1RVXFmVVNIT3FndEdWV1laXzdNM2lRSHRndlYyQ0ZZQ2RrbDhZUHhEN3FsTTk0QWNuYlFyREZxQ211UE1Kbzh4SW5PSdIB3gFBVV95cUxNN0RudGQ1VVQzWXRNUWNTZHZYeTZCeDdDUzhVUmdOUXhFU0dKbF9feU53NWxKVDVKRGpFYzhmNGVTenlNOHhFNXlZMEk3RWRyeUZNX3dwNHZidV81MWltT3Q5VlRjRkxIR0Z5MHpJWWUxM3VMVXFDdUhsQXMyeTlvNFhQZnAtUXl4NG9qcl9pMUN3VlRJcWg4T0ZNcU5WNURYWWdmZzZTRVZHNEF0SUFFWGJ2NGZGcU91YnZaei1BblJrXzd4cUpjdFF3V2tQOUxRVlV6RFlxZElfc3JhV2c?oc=5"
        print("Goto URL...")
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(3000)
        print("Result URL:", page.url)
        browser.close()

if __name__ == "__main__":
    test()
