import os
import sys

# Add workspace root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
from news_fetcher import extract_full_article_text, fetch_feed_articles
from config import MALAYALAM_RSS_FEEDS

# Configure logging to stdout
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=[logging.StreamHandler(sys.stdout)])

def test():
    print("=== Testing Scraper Optimizations ===")
    
    # 1. Test Image Validation on harvested default brand cards
    print("\n📸 Testing New Default Logo/Card Filtering:")
    test_urls = [
        "https://janamtv.com/wp-content/uploads/2019/05/janam-news-card.jpg",
        "https://www.expresskerala.com/news/wp-content/uploads/2023/09/social.jpg",
        "https://keralakaumudi.com/news/images/kerala-kaumudi-card.jpg",
        "https://www.deepika.com/assets/images/cs/og-image.jpg",
        "https://cf-images.assettype.com/samakalikamalayalam%2Fnie_logo_600X390.jpeg",
        "https://janmabhumi.in/wp-content/uploads/2023/08/janmabhumi-fallback-image.jpg",
        "https://assets.sirajlive.com/2021/08/sirajlive.jpg",
        "https://img.mathrubhumi.com/view/acePublic/alias/contentid/YTgxNGE2MmYtYzdmYy00/0/facebook.png",
        # Valid News Images (should pass)
        "https://keralakaumudi.com/web-news/2026/05/NMAN0676248/image/gold.1.3839373.jpg",
        "https://janmabhumi.in/wp-content/uploads/2026/05/russianattack.webp"
    ]
    
    from news_fetcher import is_placeholder_image_url
    for url in test_urls:
        blocked = is_placeholder_image_url(url)
        status = "❌ BLOCKED (Success)" if blocked else "✅ ALLOWED (Real Image)"
        print(f"  URL: {url[:60]}... -> {status}")
    
    # 2. Test Express Kerala Query Feed Resolution
    ek_config = next((f for f in MALAYALAM_RSS_FEEDS if "Express Kerala International" in f["name"]), None)
    if ek_config:
        print(f"\n📡 Fetching feed articles for: {ek_config['name']}")
        print(f"URL: {ek_config['url']}")
        articles = fetch_feed_articles(ek_config, max_articles=3)
        print(f"✅ Fetched {len(articles)} articles!")
        for idx, art in enumerate(articles, 1):
            print(f"  [{idx}] {art['title']}")
            print(f"      Link: {art['link']}")
            
            # Try to scrape the first article
            if idx == 1:
                print(f"\n📝 Attempting standard scrape on: {art['link']}")
                text = extract_full_article_text(art['link'])
                if text:
                    print(f"✅ Successfully scraped {len(text)} characters!")
                    print(f"Preview: {text[:200]}...")
                else:
                    print("❌ Scrape returned None or too short!")
    else:
        print("❌ Express Kerala International config not found!")

if __name__ == "__main__":
    test()
