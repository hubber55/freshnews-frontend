import requests
from bs4 import BeautifulSoup

def get_og_image(url):
    print(f"\n🌐 Fetching default OG image for: {url}")
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        r = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')
        
        # Check og:image meta tag
        meta = soup.find('meta', {'property': 'og:image'})
        if meta and meta.get('content'):
            print(f"  OG Image: {meta['content']}")
            return meta['content']
            
        # Check twitter:image meta tag
        meta_tw = soup.find('meta', {'name': 'twitter:image'})
        if meta_tw and meta_tw.get('content'):
            print(f"  Twitter Image: {meta_tw['content']}")
            return meta_tw['content']
            
        print("  ❌ No OG/Twitter image tag found on homepage!")
    except Exception as e:
        print(f"  ❌ Error fetching: {e}")

if __name__ == "__main__":
    get_og_image("https://janamtv.com")
    get_og_image("https://www.expresskerala.com")
    get_og_image("https://keralakaumudi.com")
    get_og_image("https://www.deepika.com")
    get_og_image("https://www.samakalikamalayalam.com")
    get_og_image("https://kairalinewsonline.com")
    get_og_image("https://janmabhumi.in")
    get_og_image("https://sirajlive.com")
    get_og_image("https://suprabhaatham.com")
    get_og_image("https://www.mathrubhumi.com")
    get_og_image("https://malayalam.oneindia.com")
    get_og_image("https://kalipanthu.com")
    get_og_image("https://malayalam.gizbot.com")
    get_og_image("https://malayalam.filmibeat.com")
