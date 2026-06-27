import threading
from playwright.sync_api import sync_playwright

def run():
    try:
        p = sync_playwright().start()
        print("Started Playwright")
        browser = p.chromium.launch()
        print("Launched Browser")
        browser.close()
        p.stop()
        print("OK")
    except Exception as e:
        print("Error:", e)

t = threading.Thread(target=run)
t.start()
t.join()
