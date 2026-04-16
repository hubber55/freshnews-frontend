"""Debug script to test the full pipeline end-to-end."""
import feedparser
import requests
import base64
import re
from bs4 import BeautifulSoup

# Step 1: Fetch one Google News RSS entry
print("=" * 60)
print("STEP 1: Fetching Google News RSS...")
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
response = requests.get(
    "https://news.google.com/rss/headlines?hl=ml&gl=IN&ceid=IN:ml",
    headers=headers, timeout=15
)
feed = feedparser.parse(response.content)
print(f"  Found {len(feed.entries)} entries")

if not feed.entries:
    print("ERROR: No entries found!")
    exit()

entry = feed.entries[0]
print(f"\n  Title: {entry.title}")
print(f"  Link: {entry.link}")

# Step 2: Check if description has an image
desc = entry.get("summary", "") or entry.get("description", "")
print(f"\n  Description HTML: {desc[:300]}")

soup = BeautifulSoup(desc, "html.parser")
img = soup.find("img")
if img:
    print(f"  Image from RSS: {img.get('src', 'N/A')}")
    print(f"  ^ THIS is the Google News placeholder logo that keeps showing!")
else:
    print("  No image in RSS description")

# Step 3: Test URL decoder
print("\n" + "=" * 60)
print("STEP 2: Testing Google News URL decoder...")
google_url = entry.link
print(f"  Google URL: {google_url}")

real_url = None
if "/articles/" in google_url:
    encoded = google_url.split('/articles/')[1].split('?')[0]
    print(f"  Encoded part: {encoded[:80]}...")
    encoded_padded = encoded + "=" * ((4 - len(encoded) % 4) % 4)
    try:
        decoded = base64.urlsafe_b64decode(encoded_padded)
        print(f"  Raw decoded bytes (hex): {decoded[:100].hex()}")
        decoded_str = decoded.decode('latin1')
        print(f"  Decoded string: {decoded_str[:200]}")
        match = re.search(r'(https?://[^\x00-\x1F\x7F]+)', decoded_str)
        if match:
            real_url = match.group(1)
            print(f"\n  REAL URL: {real_url}")
        else:
            print("\n  Could not find URL in decoded string")
    except Exception as e:
        print(f"  Decode error: {e}")
else:
    print("  Not a Google News article link")

# Step 4: Try to get OG image from real URL
print("\n" + "=" * 60)
print("STEP 3: Testing OG image extraction...")
if real_url:
    try:
        r = requests.get(real_url, headers=headers, timeout=15)
        print(f"  HTTP status: {r.status_code}")
        soup2 = BeautifulSoup(r.text, "html.parser")
        og = soup2.find("meta", property="og:image")
        if og and og.get("content"):
            print(f"  OG IMAGE FOUND: {og['content']}")
        else:
            print("  No og:image meta tag found")
            twitter = soup2.find("meta", attrs={"name": "twitter:image"})
            if twitter and twitter.get("content"):
                print(f"  Twitter image found: {twitter['content']}")
    except Exception as e:
        print(f"  Error: {e}")
else:
    print("  Skipped (no real_url decoded)")

# Write results to file
with open("debug_output.txt", "w", encoding="utf-8") as f:
    f.write(f"Title: {entry.title}\n")
    f.write(f"Google Link: {entry.link}\n")
    f.write(f"Description: {desc[:500]}\n")
    if img:
        f.write(f"RSS Image: {img.get('src', 'N/A')}\n")
    if real_url:
        f.write(f"Real URL: {real_url}\n")
    f.write("Done.\n")
