import feedparser
import requests
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def test_feed_dates(url):
    print(f"📡 Fetching Feed: {url}")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    response = requests.get(url, headers=headers, timeout=15)
    feed = feedparser.parse(response.content)
    
    now_ist = datetime.now(IST)
    today_ist = now_ist.date()
    print(f"Current Date (IST): {today_ist}")
    print(f"Current Time (IST): {now_ist.strftime('%I:%M %p')}")
    print("=" * 70)
    
    for entry in feed.entries[:10]:
        title = entry.get("title", "")
        published_parsed = entry.get("published_parsed")
        published_str = entry.get("published") or entry.get("pubDate")
        
        # Mimic news_fetcher.py parsing
        published_dt = None
        if published_parsed:
            try:
                published_dt = datetime(*published_parsed[:6], tzinfo=timezone.utc)
            except Exception as e:
                print(f"❌ Error converting structured tuple: {e}")
                
        if published_dt:
            published_ist_dt = published_dt.astimezone(IST)
            published_ist_date = published_ist_dt.date()
            is_today = (published_ist_date == today_ist)
            
            print(f"📰 Title: {title[:50]}...")
            print(f"  Raw string in RSS: {published_str}")
            print(f"  Parsed UTC Datetime: {published_dt}")
            print(f"  Parsed IST Datetime: {published_ist_dt}")
            print(f"  Is Today (IST)?: {'✅ YES' if is_today else '❌ NO (OLD)'}")
        else:
            print(f"📰 Title: {title[:50]}...")
            print(f"  ❌ Failed to parse date! (Raw: {published_str})")
        print("-" * 50)

if __name__ == "__main__":
    # Test on Express Kerala search feed
    test_feed_dates("https://news.google.com/rss/search?q=site%3Aexpresskerala.com+international&hl=ml&gl=IN&ceid=IN:ml")
