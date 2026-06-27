import feedparser
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

feed_url = "https://news.google.com/rss/search?q=site:sathyamonline.com&hl=ml&gl=IN&ceid=IN:ml"

# 1. Fetch feed
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
res = requests.get(feed_url, headers=headers)
feed = feedparser.parse(res.content)

print(f"Fetched {len(feed.entries)} entries from feed.")

# Check the first 5 entries
for entry in feed.entries[:5]:
    title = entry.get("title", "")
    link = entry.get("link", "")
    
    # Extract image from entry
    img_from_entry = None
    if hasattr(entry, "media_content") and entry.media_content:
        img_from_entry = entry.media_content[0].get("url")
    elif hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        img_from_entry = entry.media_thumbnail[0].get("url")
    
    print(f"\nTitle: {title}")
    print(f"Link: {link}")
    print(f"Image from entry: {img_from_entry}")
    
    # Try to resolve redirect using requests HEAD
    try:
        r = requests.head(link, allow_redirects=True, timeout=10)
        resolved_url = r.url
        print(f"Resolved URL: {resolved_url}")
        
        # Check if resolved URL is accessible and try to scrape OG image
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        pg_res = requests.get(resolved_url, headers=headers, timeout=10)
        soup = BeautifulSoup(pg_res.text, "html.parser")
        
        og_img = soup.find("meta", property="og:image")
        og_img_url = og_img.get("content") if og_img else None
        print(f"Scraped OG Image: {og_img_url}")
        
        # Test if image is valid/accessible
        if og_img_url:
            img_res = requests.get(og_img_url, headers=headers, timeout=10)
            print(f"Image Status: {img_res.status_code}")
            print(f"Image Content-Type: {img_res.headers.get('Content-Type')}")
            print(f"Image Content-Length: {img_res.headers.get('Content-Length')}")
            
    except Exception as e:
        print(f"Error checking: {e}")
