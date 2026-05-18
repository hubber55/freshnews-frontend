"""
FreshNews Configuration
-----------------------
All settings for the Malayalam news aggregator bot.
"""

import os
from dotenv import load_dotenv
from urllib.parse import quote_plus

load_dotenv()

# â”€â”€â”€ API Keys (loaded from .env or GitHub Secrets) â”€â”€â”€
# ─── API Keys (loaded from .env or GitHub Secrets) ───
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
# Collect all Google API keys for rotation
GOOGLE_API_KEYS = []
for i in range(1, 21):
    key_name = "GOOGLE_API_KEY" if i == 1 else f"GOOGLE_API_KEY_{i}"
    key = os.getenv(key_name)
    if key:
        GOOGLE_API_KEYS.append(key)

GOOGLE_API_KEYS = [k for k in GOOGLE_API_KEYS if k]
# Backward compatibility
GOOGLE_API_KEY = GOOGLE_API_KEYS[0] if GOOGLE_API_KEYS else ""
BLOGGER_BLOG_ID = os.getenv("BLOGGER_BLOG_ID", "")
BLOGGER_CLIENT_ID = os.getenv("BLOGGER_CLIENT_ID", "")
BLOGGER_CLIENT_SECRET = os.getenv("BLOGGER_CLIENT_SECRET", "")
BLOGGER_REFRESH_TOKEN = os.getenv("BLOGGER_REFRESH_TOKEN", "")

# --- Email Configuration ---
GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")
BLOGGER_POST_EMAIL = os.getenv("BLOGGER_POST_EMAIL")

# --- Supabase Configuration ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# ─── Malayalam RSS Feeds ───
# We use direct Malayalam news providers that do not implement Cloudflare 
# blocking or Google News obfuscation to ensure we get full descriptions and images.
def google_news_site_feed(name: str, domain: str, category: str = "general"):
    query = quote_plus(f"site:{domain}")
    return {
        "name": name,
        "url": f"https://news.google.com/rss/search?q={query}&hl=ml&gl=IN&ceid=IN:ml",
        "category": category,
    }


def google_news_query_feed(name: str, query_text: str, category: str = "general"):
    query = quote_plus(query_text)
    return {
        "name": name,
        "url": f"https://news.google.com/rss/search?q={query}&hl=ml&gl=IN&ceid=IN:ml",
        "category": category,
    }


MALAYALAM_RSS_FEEDS = [
    # Kerala Kaumudi feeds via Google News (prioritized first)
    google_news_site_feed("Kerala Kaumudi", "keralakaumudi.com"),
    google_news_query_feed("Kerala Kaumudi Cinema", "keralakaumudi cinema entertainment", "entertainment"),
    google_news_query_feed("Kerala Kaumudi Latest", "keralakaumudi"),
    google_news_query_feed("Reporter", "Malayalam Reporter"),
    google_news_query_feed("Asianet News", "Asianet News Malayalam"),
    google_news_site_feed("Deepika", "deepika.com"),
    google_news_query_feed("News10 Malayalam", "News10 Malayalam"),
    google_news_query_feed("Filmibeat", "Filmibeat Malayalam", "entertainment"),
    google_news_site_feed("Express Kerala", "expresskerala.com"),
    google_news_site_feed("Pathram Online", "pathramonline.com"),
    google_news_site_feed("Time Kerala", "timekerala.com"),
    google_news_site_feed("Anweshanam", "anweshanam.com"),
    google_news_query_feed("TV9 Malayalam", "TV9 Malayalam"),
    google_news_query_feed("B4blaze News", "B4blaze Malayalam"),
    google_news_query_feed("MyKhel Malayalam", "MyKhel Malayalam", "sports"),
    google_news_site_feed("Sathyam Online", "sathyamonline.com"),
    google_news_site_feed("Newsthen", "newsthen.com"),
    google_news_site_feed("Media Mangalam", "mediamangalam.com"),
    google_news_site_feed("OneIndia Malayalam", "malayalam.oneindia.com"),
    google_news_site_feed("Kvartha", "kvartha.com"),
    google_news_query_feed("24 News", "24 News Malayalam"),
    google_news_site_feed("Kerala Online News", "keralaonlinenews.com"),
    google_news_site_feed("Dhanam", "dhanamonline.com"),
    google_news_site_feed("Malayali Life", "malayalilife.com"),
    google_news_site_feed("Malayalam Express", "malayalamexpress.in"),
    google_news_site_feed("Samakalika Malayalam", "samakalikamalayalam.com"),

    # Legacy/Default sources converted to Google RSS proxy to bypass XML/403 errors
    google_news_site_feed("Mathrubhumi", "mathrubhumi.com"),
    google_news_site_feed("Marunadan Malayali", "marunadanmalayalee.com"),
    google_news_site_feed("Kairali News", "kairalinewsonline.com"),
    google_news_site_feed("Janam TV", "janamtv.com"),
    google_news_site_feed("Janmabhumi", "janmabhumi.in"),
    google_news_site_feed("Siraj Live", "sirajlive.com"),
    google_news_site_feed("Suprabhaatham", "suprabhaatham.com"),
    
    # DriveSpark (moved to last since it's working)
    google_news_query_feed("DriveSpark", "DriveSpark Malayalam"),

    # Newly Added News Sources
    google_news_site_feed("Kalipanthu", "kalipanthu.com", "sports"),
    google_news_site_feed("Express Kerala International", "expresskerala.com/news/international", "world"),
    google_news_site_feed("Express Kerala Technology", "expresskerala.com/news/technology", "technology"),
    google_news_site_feed("Express Kerala National", "expresskerala.com/news/national", "india"),
    google_news_site_feed("Gizbot Malayalam", "malayalam.gizbot.com", "technology"),
]

# ─── Processing Settings ───
MAX_ARTICLES_PER_RUN = 10         # Safe to increase since we drip-feed with a 30s delay now!
SIMILARITY_THRESHOLD = 0.60       # Lower = more aggressive skipping (60% similar = duplicate)
SUMMARY_MAX_SENTENCES = 4         # Keep summaries short
FETCH_TIMEOUT_SECONDS = 15        # Timeout for HTTP requests
MAX_RECENT_POSTS_CHECK = 200      # Check last 200 posts to ensure no duplicates today

# ─── Day/Night Scheduling ───
# Daytime: 5 AM - 11 PM IST → 30 seconds interval
# Nighttime: 11 PM - 5 AM IST → 3 minutes interval
DAY_START_HOUR = 5                # 5 AM IST
DAY_END_HOUR = 23                 # 11 PM IST
DAY_DELAY_SECONDS = 30            # 30 seconds
NIGHT_DELAY_SECONDS = 180         # 3 minutes

# â”€â”€â”€ Blogger Post Settings â”€â”€â”€
BLOGGER_LABELS_MAP = {
    "general": "à´µà´¾àµ¼à´¤àµà´¤",         # News
    "kerala": "à´•àµ‡à´°à´³à´‚",            # Kerala
    "india": "à´‡à´¨àµà´¤àµà´¯",             # India
    "sports": "à´•à´¾à´¯à´¿à´•à´‚",           # Sports
    "technology": "à´Ÿàµ†à´•àµà´¨àµ‹à´³à´œà´¿",     # Technology
    "technology": "à´Ÿàµ†à´•àµ à´¨àµ‹à´³à´œà´¿",     # Technology
    "entertainment": "à´µà´¿à´¨àµ‹à´¦à´‚",     # Entertainment
    "business": "à´¬à´¿à´¸à´¿à´¨à´¸àµ ",        # Business
    "world": "à´²àµ‹à´•à´‚",              # World
}

# ─── AI Model Settings ───
# Mistral = PRIMARY (1B tokens/month free tier!)
# Groq   = FALLBACK (500K tokens/day)
MISTRAL_MODEL = os.getenv("MISTRAL_MODEL", "mistral-small-latest")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
