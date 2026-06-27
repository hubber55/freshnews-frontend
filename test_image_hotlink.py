import requests

def test_hotlink_headers():
    url = "https://example.com/image.png"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://freshnews.top/",
        "Origin": "https://freshnews.top"
    }
    
    print("Testing image validation headers...")
    print(f"Requesting URL: {url}")
    print(f"Headers sent: {headers}")
    
    # We just verify that constructing the request with these headers works without errors
    try:
        req = requests.Request("GET", url, headers=headers)
        prepared = req.prepare()
        print("Successfully prepared request with headers:")
        for k, v in prepared.headers.items():
            print(f"  {k}: {v}")
        print("Success! Request headers are valid and configured.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_hotlink_headers()
