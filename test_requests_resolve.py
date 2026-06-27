import requests
import re

url = "https://news.google.com/rss/articles/CBMi7wFBVV95cUxQQlJubmFzSmNXZWtzMWZ6bVFTQUlId0Y3clE5WElDcklUbkMwNnhZbnEwdFp2Q1lCbzcwMjdYdTRsUm1fV3V1dUhIcHItWmpGSlBDVzJqOEYxZzdZdl9mNU40b1Z1SEZpT3N2cWtRb29lTkd6bVhmNXZmRjE5MndlTkJkdkpsNnFmUE5yckQ2V3pWTE5sSUtTR01pYW8zUmp6aU80Tk54WldjMEVnQWR0NzdUenI4OGY2Vnh6UUNFSkRtYWZlVjdCNE54MjlZTEtHTVdSV28tZWRKTE9sbm5wWG5fWk1uTktEczhXcm03MExuSVBpd1k1SFE?oc=5"

headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1"
}

print("Trying with requests.get (allow_redirects=True)...")
try:
    res = requests.get(url, headers=headers, timeout=10)
    print("Final URL:", res.url)
    print("History:")
    for r in res.history:
        print(f"  {r.status_code} -> {r.url}")
    
    # Search for any links or script redirect in HTML
    html = res.text
    print("\nChecking for redirect patterns in HTML (first 500 chars):")
    print(html[:500])
    
    # Find any href in HTML
    urls = re.findall(r'href="([^"]+)"', html)
    print("Found hrefs:")
    for u in urls[:5]:
        print("  ", u)
        
    urls2 = re.findall(r'window.location.replace\("([^"]+)"\)', html)
    print("Found window.location.replace:")
    for u in urls2:
        print("  ", u)
        
except Exception as e:
    print("Error:", e)
