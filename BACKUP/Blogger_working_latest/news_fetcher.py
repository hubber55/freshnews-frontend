"""
News Fetcher
------------
Fetches articles from Malayalam RSS feeds.
Extracts title, link, description, published date, and OG image.
"""

import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone
import logging
import re
import base64
from config import MALAYALAM_RSS_FEEDS, FETCH_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)



def clean_html(text):
    """Remove HTML tags from text."""
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    return soup.get_text(strip=True)


def extract_full_article_text(url):
    """Scrape the original news site to extract the full article text from paragraph tags."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = requests.get(url, headers=headers, timeout=FETCH_TIMEOUT_SECONDS)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Scrape all primary paragraph tags (which contain the news body)
        paragraphs = soup.find_all("p")
        
        text_blocks = []
        for p in paragraphs:
            text = p.get_text(strip=True)
            # Filter out tiny boilerplate texts or empty strings
            if len(text) > 30:
                text_blocks.append(text)
                
        full_text = " ".join(text_blocks)
        
        if len(full_text) > 200:
            return full_text
        return None
    except Exception as e:
        logger.debug(f"Failed to extract full text from {url}: {e}")
        return None


def extract_og_image(url):
    """Extract Open Graph image from article URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=FETCH_TIMEOUT_SECONDS)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Try og:image first
        og_image = soup.find("meta", property="og:image")
        if og_image and og_image.get("content"):
            return og_image["content"]
        
        # Try twitter:image
        twitter_image = soup.find("meta", attrs={"name": "twitter:image"})
        if twitter_image and twitter_image.get("content"):
            return twitter_image["content"]
        
        # Try first large image in article
        for img in soup.find_all("img"):
            src = img.get("src", "")
            width = img.get("width", "0")
            if src and (int(width) > 300 if width.isdigit() else True):
                if not any(skip in src.lower() for skip in ["logo", "icon", "avatar", "ad", "banner", "pixel"]):
                    return src
        
        return None
    except Exception as e:
        logger.debug(f"Failed to extract image from {url}: {e}")
        return None


def extract_image_from_entry(entry):
    """Try to get image from RSS entry itself before scraping."""
    # Check media:content
    if hasattr(entry, "media_content") and entry.media_content:
        for media in entry.media_content:
            if media.get("medium") == "image" or "image" in media.get("type", ""):
                return media.get("url")
    
    # Check media:thumbnail
    if hasattr(entry, "media_thumbnail") and entry.media_thumbnail:
        return entry.media_thumbnail[0].get("url")
    
    # Check enclosures
    if hasattr(entry, "enclosures") and entry.enclosures:
        for enc in entry.enclosures:
            if "image" in enc.get("type", ""):
                return enc.get("href")
    
    # Check for image in description/summary HTML
    summary = entry.get("summary", "") or entry.get("description", "")
    content = entry.get("content", [])
    if content:
        summary += " " + content[0].get("value", "")
        
    soup = BeautifulSoup(summary, "html.parser")
    img = soup.find("img")
    if img and img.get("src"):
        return img["src"]
        
    return None


def parse_date(entry):
    """Parse published date from RSS entry."""
    date_fields = ["published_parsed", "updated_parsed", "created_parsed"]
    for field in date_fields:
        parsed = entry.get(field)
        if parsed:
            try:
                return datetime(*parsed[:6], tzinfo=timezone.utc)
            except Exception:
                continue
    return datetime.now(timezone.utc)


def fetch_feed_articles(feed_config, max_articles=5):
    """Fetch articles from a single configured RSS feed."""
    feed_name = feed_config["name"]
    feed_url = feed_config["url"]
    category = feed_config["category"]
    
    logger.info(f"📡 Requesting: {feed_name}")
    
    articles = []
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = requests.get(feed_url, headers=headers, timeout=15)
        response.raise_for_status()
        feed = feedparser.parse(response.content)
        
        if feed.bozo and not feed.entries:
            logger.warning(f"⚠️  Failed to parse {feed_name}: {feed.bozo_exception}")
            return []
            
        for entry in feed.entries[:max_articles]:
            title = clean_html(entry.get("title", ""))
            link = entry.get("link", "")
            description = clean_html(entry.get("summary", "") or entry.get("description", ""))
            
            if "content" in entry and entry.content:
                full_text = clean_html(entry.content[0].get("value", ""))
                if len(full_text) > len(description):
                    description = full_text
                    
            published = parse_date(entry)
            if not title or not link:
                continue
                
            image_url = extract_image_from_entry(entry)
            
            articles.append({
                "title": title,
                "link": link,
                "description": description,
                "published": published,
                "source_name": feed_name,
                "category": category,
                "image_url": image_url,
            })
            
        return articles
    except Exception as e:
        logger.error(f"  ❌ Error fetching {feed_name}: {e}")
        return []

def scrape_full_text_if_needed(article):
    """Scrapes full text if the article is missing detailed content."""
    desc = article.get("description", "")
    if len(desc) < 400 or desc.strip().endswith("..."):
        logger.info(f"    -> Text truncated for '{article['title'][:30]}...'. Scraping web for full article...")
        scraped = extract_full_article_text(article["link"])
        if scraped:
            article["description"] = scraped
    return article



def enrich_with_images(articles):
    """
    For articles without images, try to extract OG image from the article URL.
    Only enriches articles that don't already have images.
    """
    enriched = 0
    for article in articles:
        if not article.get("image_url"):
            image = extract_og_image(article["link"])
            if image:
                article["image_url"] = image
                enriched += 1
    
    logger.info(f"🖼️  Enriched {enriched} articles with images")
    return articles
