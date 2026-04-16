import requests
import feedparser

feeds = [
    ("Malayalam Reporter", "https://www.reporterlive.com/feed"),
    ("Asianet News", "https://www.asianetnews.com/rss/news"),
    ("Deepika", "https://www.deepika.com/RSS/DeepikaRSS.xml"),
    ("News18", "https://malayalam.news18.com/rss/kerala.xml"),
    ("Sathyam Online", "https://sathyamonline.com/feed/"),
    ("Newsthen", "https://newsthen.com/feed/"),
    ("Media Mangalam", "https://mediamangalam.com/feed/"),
    ("Oneindia", "https://malayalam.oneindia.com/rss/malayalam-news-kerala-fb.xml"),
    ("Kvartha", "https://www.kvartha.com/feeds/posts/default?alt=rss"),
    ("24 News", "https://www.24newslive.com/feed"),
    ("Kerala Online", "https://keralaonlinenews.com/feed/"),
    ("Dhanam", "https://dhanamonline.com/feed/"),
    ("Malayali Life", "https://www.malayalilife.com/feed/"),
    ("Malayalam Express", "https://www.malayamexpressonline.com/feed/"),
    ("Samakalika Malayalam", "https://www.samakalikamalayalam.com/feeds/index.rss")
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

for name, url in feeds:
    print(f"Checking {name}: {url}")
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            feed = feedparser.parse(response.content)
            if feed.entries:
                print(f"  [OK] Found {len(feed.entries)} entries.")
                print(f"  Example: {feed.entries[0].title}")
            else:
                print(f"  [EMPTY] No entries found.")
        else:
            print(f"  [FAIL] Status code: {response.status_code}")
    except Exception as e:
        print(f"  [ERROR] {e}")
    print("-" * 20)
