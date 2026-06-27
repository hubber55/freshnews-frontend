import requests
import json
import re
from urllib.parse import urlparse, quote
from selectolax.parser import HTMLParser

def custom_decode(source_url):
    try:
        url_parsed = urlparse(source_url)
        path = url_parsed.path.split("/")
        if url_parsed.hostname != "news.google.com" or len(path) <= 1 or path[-2] not in ["articles", "read"]:
            return {"status": False, "message": "Invalid Google News URL format."}
        
        base64_str = path[-1]
        
        # 1. Fetch decoding params with proper headers
        url = f"https://news.google.com/articles/{base64_str}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        parser = HTMLParser(response.text)
        data_element = parser.css_first("c-wiz > div[jscontroller]")
        if data_element is None:
            # Try fallback rss format
            url_fallback = f"https://news.google.com/rss/articles/{base64_str}"
            response = requests.get(url_fallback, headers=headers, timeout=10)
            response.raise_for_status()
            parser = HTMLParser(response.text)
            data_element = parser.css_first("c-wiz > div[jscontroller]")
            if data_element is None:
                return {"status": False, "message": "Failed to fetch data attributes."}
                
        signature = data_element.attributes.get("data-n-a-sg")
        timestamp = data_element.attributes.get("data-n-a-ts")
        
        # 2. Decode URL
        api_url = "https://news.google.com/_/DotsSplashUi/data/batchexecute"
        payload = [
            "Fbv4je",
            f'["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"{base64_str}",{timestamp},"{signature}"]',
        ]
        
        post_headers = {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        
        post_data = f"f.req={quote(json.dumps([[payload]]))}"
        res = requests.post(api_url, headers=post_headers, data=post_data, timeout=10)
        res.raise_for_status()
        
        parsed_data = json.loads(res.text.split("\n\n")[1])[:-2]
        decoded_url = json.loads(parsed_data[0][2])[1]
        
        return {"status": True, "decoded_url": decoded_url}
    except Exception as e:
        return {"status": False, "message": str(e)}

test_url = "https://news.google.com/rss/articles/CBMi7wFBVV95cUxQQlJubmFzSmNXZWtzMWZ6bVFTQUlId0Y3clE5WElDcklUbkMwNnhZbnEwdFp2Q1lCbzcwMjdYdTRsUm1fV3V1dUhIcHItWmpGSlBDVzJqOEYxZzdZdl9mNU40b1Z1SEZpT3N2cWtRb29lTkd6bVhmNXZmRjE5MndlTkJkdkpsNnFmUE5yckQ2V3pWTE5sSUtTR01pYW8zUmp6aU80Tk54WldjMEVnQWR0NzdUenI4OGY2Vnh6UUNFSkRtYWZlVjdCNE54MjlZTEtHTVdSV28tZWRKTE9sbm5wWG5fWk1uTktEczhXcm03MExuSVBpd1k1SFE?oc=5"
print("Decoding:", test_url)
print("Result:", custom_decode(test_url))
