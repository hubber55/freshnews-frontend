import logging
import sys
import os

# Set up PYTHONPATH and logging
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", handlers=[logging.StreamHandler(sys.stdout)])

from news_fetcher import fetch_feed_articles

def test_fetcher():
    feed_config = {
        "name": "Gizbot Malayalam",
        "url": "https://news.google.com/rss/search?q=site%3Amalayalam.gizbot.com&hl=ml&gl=IN&ceid=IN:ml",
        "category": "technology"
    }
    print(f"Testing fetch_feed_articles on: {feed_config['url']}\n")
    articles = fetch_feed_articles(feed_config, max_articles=20)
    print(f"\nSuccessfully returned {len(articles)} publishable articles.")

if __name__ == "__main__":
    test_fetcher()
