"""
Supabase Publisher
------------------
Publishes news articles directly to the Supabase PostgreSQL database.
"""

import os
import logging
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY

logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        logger.error(f"  \u274c Failed to initialize Supabase client: {e}")

def get_existing_titles():
    """
    Fetch the last 50 article titles to prevent deduplication.
    """
    if not supabase:
        return []
        
    try:
        # Fetch the most recent titles
        response = supabase.table('posts').select('title').order('published_at', desc=True).limit(50).execute()
        return [row['title'] for row in response.data]
    except Exception as e:
        logger.error(f"  \u274c Failed to fetch existing titles from Supabase: {e}")
        return []

def publish_via_supabase(article):
    """
    Publish a single article to the Supabase 'posts' table.
    """
    if not supabase:
        logger.error("  \u274c Supabase client not initialized. Check your .env file.")
        return False

    title = article.get("title", "Untitled")
    summary = article.get("summary", "")
    image_url = article.get("image_url", "")
    source_name = article.get("source_name", "News")
    # Store tags as a list for Postgres array
    tags = [source_name] + article.get("tags", [])
    original_url = article.get("link", "")

    try:
        # Insert row into the 'posts' table
        data, count = supabase.table('posts').insert({
            "title": title,
            "summary": summary,
            "image_url": image_url,
            "source_name": source_name,
            "tags": tags,
            "original_url": original_url
        }).execute()

        logger.info(f"  \u2705 Inserted successfully into Supabase!")
        return True
    except Exception as e:
        logger.error(f"  ❌ Supabase insert failed: {e}")
        return False

def get_recent_posts(limit=20):
    """Fetch the most recent posts to check for broken images."""
    if not supabase:
        return []
    try:
        response = supabase.table('posts').select('id, title, image_url').eq('is_deleted', False).order('published_at', desc=True).limit(limit).execute()
        return response.data
    except Exception as e:
        logger.error(f"  ❌ Failed to fetch recent posts: {e}")
        return []

def soft_delete_post(post_id, reason="Admin Request"):
    """Mark a post as deleted instead of removing it (SEO safety)."""
    if not supabase:
        return False
    try:
        supabase.table('posts').update({"is_deleted": True}).eq('id', post_id).execute()
        logger.warning(f"  🗑️ Soft deleted post {post_id}: {reason}")
        return True
    except Exception as e:
        logger.error(f"  ❌ Soft delete failed for {post_id}: {e}")
        return False

