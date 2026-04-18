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
    # Kerala Kaumudi feeds (prioritized first)
    {
        "name": "Kerala Kaumudi",
        "url": "https://keralakaumudi.com/rss/news.xml",
        "category": "general",
    },
    {
        "name": "Kerala Kaumudi Cinema",
        "url": "https://keralakaumudi.com/news/section.php?cid=4&format=rss",
        "category": "entertainment",
    },
    {
        "name": "Kerala Kaumudi Latest",
        "url": "https://keralakaumudi.com/news/latest.php?format=rss",
        "category": "general",
    },
    google_news_query_feed("Malayalam Reporter", "Malayalam Reporter"),
    google_news_query_feed("Asianet News Malayalam", "Asianet News Malayalam"),
    google_news_site_feed("Deepika", "deepika.com"),
    google_news_query_feed("News10 Malayalam", "News10 Malayalam"),
    {
        "name": "Sathyam Online",
        "url": "https://www.sathyamonline.com/rss",
        "category": "general",
    },
    {
        "name": "Newsthen",
        "url": "https://newsthen.com/feed",
        "category": "general",
    },
    {
        "name": "Media Mangalam",
        "url": "https://mediamangalam.com/feed",
        "category": "general",
    },
    google_news_site_feed("OneIndia Malayalam", "malayalam.oneindia.com"),
    {
        "name": "Kvartha",
        "url": "https://www.kvartha.com/feed.xml",
        "category": "general",
    },
    {
        "name": "24 News",
        "url": "https://www.twentyfournews.com/feed",
        "category": "general",
    },
    {
        "name": "Kerala Online News",
        "url": "https://keralaonlinenews.com/feed",
        "category": "general",
    },
    {
        "name": "Dhanam",
        "url": "https://dhanamonline.com/feed",
        "category": "general",
    },
    {
        "name": "Malayali Life",
        "url": "https://malayalilife.com/feed",
        "category": "general",
    },
    {
        "name": "Malayalam Express",
        "url": "https://malayalamexpress.in/feed",
        "category": "general",
    },
    {
        "name": "Samakalika Malayalam",
        "url": "https://samakalikamalayalam.com/feed",
        "category": "general",
    },

    # Existing legacy/default sources
    {
        "name": "Mathrubhumi",
        "url": "https://www.mathrubhumi.com/sitemaps/mathrubhumi/rss",
        "category": "general"
    },
    {
        "name": "Marunadan Malayali",
        "url": "https://marunadanmalayalee.com/google_feeds.xml",
        "category": "general"
    },
    {
        "name": "Kairali News",
        "url": "https://www.kairalinewsonline.com/feed",
        "category": "general"
    },
    {
        "name": "Janam TV",
        "url": "https://janamtv.com/feed/",
        "category": "general"
    },
    {
        "name": "Janmabhumi",
        "url": "https://janmabhumi.in/feed/",
        "category": "general"
    },
    {
        "name": "Siraj Live",
        "url": "https://www.sirajlive.com/feed/",
        "category": "general"
    },
    {
        "name": "Suprabhaatham",
        "url": "https://www.suprabhaatham.com/feed/",
        "category": "general"
    },
    
    # DriveSpark (moved to last since it's working)
    google_news_query_feed("DriveSpark", "DriveSpark Malayalam"),
]

# ─── Processing Settings ───
MAX_ARTICLES_PER_RUN = 10         # Safe to increase since we drip-feed with a 30s delay now!
SIMILARITY_THRESHOLD = 0.65       # 65% similar title = duplicate (skip)
SUMMARY_MAX_SENTENCES = 4         # Keep summaries short
FETCH_TIMEOUT_SECONDS = 15        # Timeout for HTTP requests
MAX_RECENT_POSTS_CHECK = 1000     # Check last N Supabase posts for duplicates

# ─── Day/Night Scheduling ───
# Daytime: 6 AM - 10 PM IST → 1 article per 5 minutes
# Nighttime: 10 PM - 6 AM IST → 1 article per 15 minutes
DAY_START_HOUR = 6                # 6 AM IST
DAY_END_HOUR = 22                 # 10 PM IST
DAY_DELAY_SECONDS = 300           # 5 minutes
NIGHT_DELAY_SECONDS = 900         # 15 minutes

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
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
