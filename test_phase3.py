import logging
from news_fetcher import is_placeholder_image_url

# Setup logging
logging.basicConfig(level=logging.INFO)

def test_placeholder_blocking():
    # Test cases that should be BLOCKED (return True)
    blocked_urls = [
        "https://sirajlive.com/wp-content/uploads/2026/06/editorial.jpg",
        "https://sirajlive.com/wp-content/uploads/2026/06/siraj-logo.png",
        "https://sirajlive.com/wp-content/uploads/2026/06/siraj_editorial.jpg",
        "https://kaumudi.com/Kaumudi-Logo.png",
        "https://gstatic.com/images/branding/googlelogo/1x/googlelogo_color_150x54dp.png"
    ]
    
    # Test cases that should NOT be blocked (return False)
    allowed_urls = [
        "https://sirajlive.com/wp-content/uploads/2026/06/real-news-photo.jpg",
        "https://keralakaumudi.com/news/kerala/general/uploads/news-photo.jpg",
        "https://mathrubhumi.com/image-12345.jpg"
    ]
    
    print("Testing is_placeholder_image_url updates...")
    
    for url in blocked_urls:
        res = is_placeholder_image_url(url)
        print(f"Blocked? {res} - {url}")
        assert res == True, f"Failed: {url} should be blocked!"
        
    for url in allowed_urls:
        res = is_placeholder_image_url(url)
        print(f"Blocked? {res} - {url}")
        assert res == False, f"Failed: {url} should be allowed!"
        
    print("Success! Placeholder blocking logic verified.")

if __name__ == "__main__":
    test_placeholder_blocking()
