"""
Blogger Publisher
-----------------
Publishes processed news articles to Blogger using the Blogger API v3.
Also fetches recent post titles for deduplication.
"""

import requests
import logging
import time
from datetime import datetime, timezone
from config import (
    BLOGGER_BLOG_ID,
    BLOGGER_CLIENT_ID,
    BLOGGER_CLIENT_SECRET,
    BLOGGER_REFRESH_TOKEN,
    BLOGGER_LABELS_MAP,
    MAX_RECENT_POSTS_CHECK,
)

logger = logging.getLogger(__name__)

BLOGGER_API_BASE = "https://www.googleapis.com/blogger/v3"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def get_access_token():
    """Get a fresh Google OAuth2 access token using the refresh token."""
    response = requests.post(GOOGLE_TOKEN_URL, data={
        "client_id": BLOGGER_CLIENT_ID,
        "client_secret": BLOGGER_CLIENT_SECRET,
        "refresh_token": BLOGGER_REFRESH_TOKEN,
        "grant_type": "refresh_token",
    })
    response.raise_for_status()
    token_data = response.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise ValueError(f"Failed to get access token: {token_data}")
    return access_token


def get_recent_post_titles(access_token):
    """Fetch titles of recently published posts from Blogger for deduplication."""
    url = f"{BLOGGER_API_BASE}/blogs/{BLOGGER_BLOG_ID}/posts"
    params = {
        "maxResults": MAX_RECENT_POSTS_CHECK,
        "fields": "items(title)",
        "status": "live",
    }
    headers = {"Authorization": f"Bearer {access_token}"}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
        data = response.json()
        titles = [item.get("title", "") for item in data.get("items", [])]
        return titles
    except Exception as e:
        logger.error(f"❌ Failed to fetch recent posts: {e}")
        return []


def build_post_html(article):
    """Build the HTML content. Extremely simple so Blogger's index engine finds the image!"""
    title = article.get("title", "")
    summary = article.get("summary", "")
    image_url = article.get("image_url", "")
    link = article.get("link", "#")
    source_name = article.get("source_name", "")
    
    # We put the image right at the top so Blogger's auto-thumbnailer grabs it easily.
    image_html = ""
    courtesy_html = ""
    if image_url:
        image_html = f'<img src="{image_url}" alt="{title}" style="max-width: 100%; border-radius: 8px;" /><br /><br />'
        courtesy_html = f'<br /><br /><small><i>Photo courtesy - {source_name}</i></small>'

    summary_html = summary.replace('\n', '<br/>')
    
    html = f"""
{image_html}
<b>{title}</b><br/><br/>
{summary_html}
{courtesy_html}
"""
    return html


def publish_post(article, access_token):
    """Publish a single article as a Blogger post."""
    url = f"{BLOGGER_API_BASE}/blogs/{BLOGGER_BLOG_ID}/posts/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    
    category = article.get("category", "general")
    source_name = article.get("source_name", "News")
    ai_tags = article.get("tags", [])
    
    day = datetime.now(timezone.utc).day
    suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    date_str = datetime.now(timezone.utc).strftime(f"{day}{suffix} %B %Y")
    
    labels = [source_name, date_str] + ai_tags
    
    post_data = {
        "title": article["title"],
        "content": build_post_html(article),
        "labels": labels,
    }
    
    try:
        response = requests.post(url, headers=headers, json=post_data, timeout=20)
        
        if response.status_code == 200:
            logger.info(f"  ✅ Published: {article['title'][:60]}...")
            return True
        else:
            logger.error(
                f"  ❌ Failed to publish '{article['title'][:40]}' "
                f"— HTTP {response.status_code}: {response.text[:200]}"
            )
            if response.status_code == 429 and "quota" in response.text.lower():
                logger.warning("  🚨 GOOGLE BLOGGER DAILY POST QUOTA EXHAUSTED!")
                logger.warning("  🚨 Sleeping for 3 hours before attempting to publish again...")
                time.sleep(3 * 60 * 60)
            return False
            
    except Exception as e:
        logger.error(f"  ❌ Error publishing '{article['title'][:40]}': {e}")
        return False


def publish_all(articles):
    """Publish all processed articles to Blogger with rate limiting."""
    if not articles:
        return 0, 0
    
    try:
        access_token = get_access_token()
    except Exception as e:
        logger.error(f"❌ Cannot get access token: {e}")
        return 0, len(articles)
    
    published = 0
    failed = 0
    
    for i, article in enumerate(articles):
        logger.info(f"  [{i+1}/{len(articles)}] Publishing: {article['title'][:60]}...")
        
        if publish_post(article, access_token):
            published += 1
        else:
            failed += 1
            
        # VERY IMPORTANT: Blogger API rate limits are extremely fast to trigger!
        # Adding a 3-second delay between posts prevents HTTP 429 errors.
        time.sleep(3)
    
    return published, failed
