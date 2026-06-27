import feedparser
import urllib.parse
import base64
import re

feed_url = "https://news.google.com/rss/search?q=site:deepika.com&hl=ml&gl=IN&ceid=IN:ml"
feed = feedparser.parse(feed_url)

for entry in feed.entries[:5]:
    link = entry.link
    print("Original:", link)
    
    # Try decoding
    try:
        base64_str = urllib.parse.urlparse(link).path.split('/')[-1]
        base64_str += "=" * ((4 - len(base64_str) % 4) % 4)
        decoded = base64.urlsafe_b64decode(base64_str)
        # print("Decoded bytes:", decoded)
        
        match = re.search(b'(https?://[a-zA-Z0-9.-]+[a-zA-Z0-9./_?&%=-]*)', decoded)
        if match:
            print("Extracted:", match.group(1).decode('utf-8', errors='ignore'))
        else:
            print("NO REGEX MATCH IN DECODED BYTES:")
            print(decoded)
    except Exception as e:
        print("EXCEPTION:", e)
    print("-" * 50)
