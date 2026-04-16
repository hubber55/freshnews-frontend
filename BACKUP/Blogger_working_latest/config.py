"""
FreshNews Configuration
-----------------------
All settings for the Malayalam news aggregator bot.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# â”€â”€â”€ API Keys (loaded from .env or GitHub Secrets) â”€â”€â”€
# ─── API Keys (loaded from .env or GitHub Secrets) ───
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
BLOGGER_BLOG_ID = os.getenv("BLOGGER_BLOG_ID", "")
BLOGGER_CLIENT_ID = os.getenv("BLOGGER_CLIENT_ID", "")
BLOGGER_CLIENT_SECRET = os.getenv("BLOGGER_CLIENT_SECRET", "")
BLOGGER_REFRESH_TOKEN = os.getenv("BLOGGER_REFRESH_TOKEN", "")

# ─── Malayalam RSS Feeds ───
# We use direct Malayalam news providers that do not implement Cloudflare 
# blocking or Google News obfuscation to ensure we get full descriptions and images.
MALAYALAM_RSS_FEEDS = [
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
        "name": "Kerala Kaumudi",
        "url": "https://keralakaumudi.com/rss/news.xml",
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
    }
]

# ─── Processing Settings ───
MAX_ARTICLES_PER_RUN = 10         # Safe to increase since we drip-feed with a 30s delay now!
SIMILARITY_THRESHOLD = 0.65       # 65% similar title = duplicate (skip)
SUMMARY_MAX_SENTENCES = 4         # Keep summaries short
FETCH_TIMEOUT_SECONDS = 15        # Timeout for HTTP requests
MAX_RECENT_POSTS_CHECK = 50       # Check last N Blogger posts for duplicates

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

# ─── Groq Model Settings ───
# Changed to llama-3.1-8b-instant for the massive 500K Tokens-Per-Day (TPD) limit.
# The 70b-versatile model only has a 100K TPD limit, causing 429 Too Many Requests errors.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
