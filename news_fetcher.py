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
from urllib.parse import urlparse
from config import MALAYALAM_RSS_FEEDS, FETCH_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


def http_request(method, url, **kwargs):
    """
    Execute HTTP requests with environment proxies disabled.
    This avoids failures when local proxy env vars point to dead endpoints.
    """
    with requests.Session() as session:
        session.trust_env = False
        return session.request(method=method, url=url, **kwargs)


def is_placeholder_image_url(url):
    """Reject known generic/logo/placeholder image URLs."""
    if not url:
        return True

    try:
        parsed = urlparse(url)
        host = (parsed.netloc or "").lower()
        path = (parsed.path or "").lower()
        full = f"{host}{path}"

        blocked_hosts = [
            "news.google.com",
            "gstatic.com",
            "googleusercontent.com",
        ]
        blocked_tokens = [
            "logo",
            "favicon",
            "icon",
            "sprite",
            "placeholder",
            "default",
            "google-news",
            "googlenews",
            "news_icon",
        ]

        if any(h in host for h in blocked_hosts):
            return True
        if any(token in full for token in blocked_tokens):
            return True
        return False
    except Exception:
        return True



def clean_html(text):
    """Remove HTML tags from text."""
    if not text:
        return ""
    soup = BeautifulSoup(text, "html.parser")
    return soup.get_text(strip=True)


def extract_full_article_text(url):
    """Scrape the original news site to extract the full article text from paragraph tags."""
    logger.info(f"    🔍 extract_full_article_text called for: {url[:60]}...")
    
    # Follow Google News redirects to get actual URL
    actual_url = url
    if "news.google.com" in url:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            response = http_request("GET", url, headers=headers, timeout=10, allow_redirects=True)
            actual_url = response.url
            
            # If still Google News URL, try to extract from page content
            if "news.google.com" in actual_url:
                soup = BeautifulSoup(response.text, "html.parser")
                # Try meta refresh
                meta_refresh = soup.find("meta", attrs={"http-equiv": "refresh"})
                if meta_refresh:
                    content = meta_refresh.get("content", "")
                    if "url=" in content:
                        actual_url = content.split("url=")[1].strip()
                # Try canonical link
                if "news.google.com" in actual_url:
                    canonical = soup.find("link", rel="canonical")
                    if canonical and canonical.get("href"):
                        actual_url = canonical["href"]
                # Try article link in content
                if "news.google.com" in actual_url:
                    article_link = soup.find("a", href=True)
                    if article_link:
                        href = article_link["href"]
                        if href.startswith("http"):
                            actual_url = href
            
            logger.info(f"    🔄 Google News resolved to: {actual_url[:60]}...")
        except Exception as e:
            logger.debug(f"    Could not resolve Google News redirect: {e}")
    
    # Check if it's a JavaScript-heavy site that needs Playwright
    url_lower = actual_url.lower()
    if "drivespark" in url_lower or "drivespark.com" in url_lower:
        logger.info(f"    🎯 DriveSpark detected! Using Playwright...")
        return extract_with_playwright(actual_url)
    else:
        logger.info(f"    📝 Not DriveSpark (domain: {url_lower.split('/')[2] if '://' in url_lower else 'unknown'}), using standard scraper")
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = http_request("GET", url, headers=headers, timeout=FETCH_TIMEOUT_SECONDS)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, "html.parser")

        # Remove obvious non-content blocks first
        for tag in soup(["script", "style", "noscript", "svg", "iframe", "footer", "nav", "aside", "form"]):
            tag.decompose()

        # Prefer likely article containers
        candidate_selectors = [
            "article",
            "main",
            "[itemprop='articleBody']",
            ".article-content",
            ".article-body",
            ".entry-content",
            ".post-content",
            ".story-content",
            ".content-body",
            "#article-body",
            "#content",
            # DriveSpark specific selectors
            ".ds-text-content",
            ".ds-article-content",
            ".ds-news-content",
            "[class*='content']",
        ]

        candidate_nodes = []
        for selector in candidate_selectors:
            candidate_nodes.extend(soup.select(selector))

        # Fallback to whole document body
        if not candidate_nodes:
            candidate_nodes = [soup.body or soup]

        def extract_blocks(node):
            blocks = []
            for el in node.find_all(["p", "li", "h2", "h3"]):
                text = el.get_text(" ", strip=True)
                if len(text) >= 30:
                    blocks.append(text)
            return blocks

        best_blocks = []
        for node in candidate_nodes:
            blocks = extract_blocks(node)
            if len(" ".join(blocks)) > len(" ".join(best_blocks)):
                best_blocks = blocks

        # Fallback to all paragraphs if container-specific scrape is weak
        if len(" ".join(best_blocks)) < 200:
            all_blocks = []
            for p in soup.find_all("p"):
                text = p.get_text(" ", strip=True)
                if len(text) >= 30:
                    all_blocks.append(text)
            if len(" ".join(all_blocks)) > len(" ".join(best_blocks)):
                best_blocks = all_blocks

        full_text = " ".join(best_blocks).strip()
        if len(full_text) > 200:
            return full_text
        return None
    except Exception as e:
        logger.debug(f"Failed to extract full text from {url}: {e}")
        return None


def extract_with_playwright(url):
    """Use Playwright to render JavaScript-heavy pages and extract article text."""
    logger.info(f"    🎭 PLAYWRIGHT: Starting extraction for {url[:60]}...")
    
    try:
        # Check if playwright is available
        try:
            from playwright.sync_api import sync_playwright
            logger.info("    🎭 PLAYWRIGHT: Import successful")
        except ImportError as ie:
            logger.error(f"    💥 PLAYWRIGHT: Import failed - {ie}")
            return None
        
        logger.info(f"    🎭 PLAYWRIGHT: Launching browser for {url[:50]}...")
        
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Wait for content to load
            page.wait_for_timeout(3000)
            
            # Try to find article content with more specific selectors
            content_selectors = [
                "article",
                "[itemprop='articleBody']",
                ".article-content",
                ".article-body",
                ".entry-content",
                ".post-content",
                ".story-content",
                ".content-body",
                ".ds-text-content",
                ".ds-article-content",
                ".ds-news-content",
                "[class*='article']",
                "[class*='content']",
                "main",
                ".content",
                "#content",
                "#article-body",
            ]
            
            content_html = None
            used_selector = None
            for selector in content_selectors:
                try:
                    element = page.locator(selector).first
                    if element.is_visible():
                        content_html = element.inner_html()
                        used_selector = selector
                        logger.info(f"    📍 Found content with selector: {selector}")
                        break
                except Exception as e:
                    logger.debug(f"    Selector {selector} failed: {e}")
                    continue
            
            # Fallback to body if no article container found
            if not content_html:
                logger.info(f"    ⚠️ No article container found, using body")
                content_html = page.locator("body").inner_html()
                used_selector = "body"
            
            # Get page title for context
            try:
                title = page.title()
                logger.info(f"    📝 Page title: {title[:60]}")
            except:
                title = ""
            
            browser.close()
            
            # Parse with BeautifulSoup
            soup = BeautifulSoup(content_html, "html.parser")
            
            # Remove unwanted elements
            for tag in soup(["script", "style", "noscript", "svg", "iframe", "footer", "nav", "aside", "form", "header", "button", "a"]):
                tag.decompose()
            
            # Try multiple extraction strategies
            # Strategy 1: All paragraphs and divs with text
            blocks = []
            for el in soup.find_all(["p", "div", "section", "span"]):
                text = el.get_text(" ", strip=True)
                # Filter out short fragments and navigation-like text
                if len(text) >= 20 and not any(skip in text.lower() for skip in ["home", "menu", "login", "sign up", "subscribe", "copyright"]):
                    blocks.append(text)
            
            # Strategy 2: All visible text if strategy 1 is weak
            if len(" ".join(blocks)) < 200:
                logger.info(f"    🔄 Trying aggressive text extraction")
                # Get all text nodes
                all_text = soup.get_text(" ", strip=True)
                # Split into sentences/paragraphs
                lines = [line.strip() for line in all_text.split("\n") if len(line.strip()) >= 15]
                blocks = lines
            
            full_text = " ".join(blocks).strip()
            
            # Debug logging
            logger.info(f"    📊 Extracted {len(blocks)} text blocks, total {len(full_text)} chars using {used_selector}")
            if len(full_text) > 0:
                preview = full_text[:150].replace("\n", " ")
                logger.info(f"    👁️ Preview: {preview}...")
            
            if len(full_text) > 200:
                logger.info(f"    ✅ Playwright extracted {len(full_text)} chars")
                return full_text
            else:
                logger.warning(f"    ❌ Playwright only got {len(full_text)} chars (need >200)")
                return None
            
    except Exception as e:
        logger.error(f"    💥 Playwright extraction failed for {url}: {e}")
        import traceback
        logger.debug(traceback.format_exc())
        return None


def extract_og_image(url):
    """Extract Open Graph image from article URL."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = http_request("GET", url, headers=headers, timeout=FETCH_TIMEOUT_SECONDS)
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
        response = http_request("GET", feed_url, headers=headers, timeout=15)
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



def is_image_valid(url):
    """Check if the image URL is accessible and returns a valid image content type."""
    if not url:
        return False
    if is_placeholder_image_url(url):
        return False
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        response = http_request("HEAD", url, headers=headers, timeout=10, allow_redirects=True)
        if response.status_code != 200:
            # Fallback to GET if HEAD is not allowed
            response = http_request("GET", url, headers=headers, stream=True, timeout=10)
        if response.status_code == 200:
            content_type = response.headers.get("Content-Type", "")
            if "image" not in content_type:
                return False
            final_url = str(getattr(response, "url", url) or url)
            if is_placeholder_image_url(final_url):
                return False
            return True
        return False
    except Exception as e:
        logger.debug(f"Image validation failed for {url}: {e}")
        return False


def enrich_with_images(articles):
    """
    For articles without images, try to extract OG image from the article URL.
    Only enriches articles that don't already have images.
    Also validates existing images.
    """
    enriched = 0
    for article in articles:
        # Validate existing image if any
        if article.get("image_url") and not is_image_valid(article["image_url"]):
            article["image_url"] = None

        # Fetch new image if missing
        if not article.get("image_url"):
            image = extract_og_image(article["link"])
            if image and is_image_valid(image):
                article["image_url"] = image
                enriched += 1
    
    logger.info(f"🖼️  Enriched/Validated {enriched} articles with images")
    return articles
