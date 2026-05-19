"""
News Fetcher
------------
Fetches articles from Malayalam RSS feeds.
Extracts title, link, description, published date, and OG image.
"""

import feedparser
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta
import logging
import re
import base64
from urllib.parse import urlparse
from config import MALAYALAM_RSS_FEEDS, FETCH_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)
IST = timezone(timedelta(hours=5, minutes=30))


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
            "profile_blank",
            "avatar",
            "silhouette",
            "no-image",
            "card",
            "social",
            "facebook",
            "fallback",
            "sirajlive.jpg",
            "share",
            "-og",
            "_og",
            "og-image",
            "og_image",
            "kerala-kaumudi-card",
            "janam-news-card",
            "keralakaumudidaily",
            "kaumudi-logo",
            "logo-og",
            "default_image"
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
    """Scrape the original news site to extract the full article text from paragraph tags.
    Returns tuple of (text, resolved_url)."""
    logger.info(f"    🔍 extract_full_article_text called for: {url[:60]}...")
    
    # Follow Google News redirects to get actual URL (they use JS redirects)
    actual_url = url
    if "news.google.com" in url:
        try:
            from playwright.sync_api import sync_playwright
            # Navigate and wait for redirect
            logger.info(f"    🌐 Using Playwright to resolve Google News redirect...")
            
            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=['--no-sandbox', '--disable-dev-shm-usage']
                )
                context = browser.new_context(
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                )
                page = context.new_page()
                # Navigate with shorter wait - just need the redirect
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=10000)
                    # Poll every 200ms until page redirects away from news.google.com
                    for _ in range(30):
                        if "news.google.com" not in page.url:
                            break
                        page.wait_for_timeout(200)
                except:
                    pass  # Timeout is OK, we just need the URL
                # Get final URL after all redirects
                actual_url = page.url
                browser.close()
            
            logger.info(f"    🔄 Google News resolved to: {actual_url[:80]}...")
        except Exception as e:
            logger.warning(f"    Could not resolve Google News redirect with Playwright: {e}")
    
    # Skip index, archive, category, tag, author, photo gallery and cartoon pages
    url_lower = actual_url.lower()
    if any(p in url_lower for p in ["/tag/", "/category/", "/author/", "/page/", "/search/", "/photogallery/", "/cartoon/"]):
        logger.warning(f"    ⚠️ Skipping index/archive/gallery URL: {actual_url}")
        return None
    
    # Check if it's a JavaScript-heavy site that needs Playwright
    if any(site in url_lower for site in ["drivespark.com", "keralakaumudi.com", "oneindia.com"]):
        if "drivespark" in url_lower:
            site_name = "DriveSpark"
        elif "keralakaumudi" in url_lower:
            site_name = "Kerala Kaumudi"
        else:
            site_name = "OneIndia"
            
        logger.info(f"    🎯 {site_name} detected! Using Playwright...")
        return extract_with_playwright(actual_url)
    else:
        logger.info(f"    📝 Not DriveSpark (domain: {url_lower.split('/')[2] if '://' in url_lower else 'unknown'}), using standard scraper")
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        response = http_request("GET", actual_url, headers=headers, timeout=FETCH_TIMEOUT_SECONDS)
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
    
    # Skip non-article URLs (photo galleries, cartoons, etc.)
    if "keralakaumudi.com" in url.lower():
        if "/photogallery/" in url or "/cartoon/" in url:
            logger.warning(f"    ⚠️ PLAYWRIGHT: Skipping non-article URL: {url[:60]}...")
            return None
    
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
            # Launch with stealth arguments to bypass detection
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--disable-site-isolation-trials',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920,1080',
                ]
            )
            
            # Create context with realistic user agent
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
                timezone_id='America/New_York',
            )
            
            page = context.new_page()
            
            # Set extra headers to appear more like a real browser
            page.set_extra_http_headers({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0',
            })
            
            # Navigate and wait for redirect
            logger.info(f"    🎭 PLAYWRIGHT: Navigating to {url[:50]}...")
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait for either content or cloudflare challenge
            try:
                # Wait for article content to appear
                page.wait_for_selector('article, .article-content, .entry-content, .post-content, main', timeout=5000)
                logger.info(f"    ✅ Content selector found")
            except:
                logger.info(f"    ⏳ No content selector found, waiting longer...")
                page.wait_for_timeout(5000)
            
            # Check if page loaded successfully
            try:
                title = page.title()
                logger.info(f"    📝 Page title: {title[:60]}")
                if title == "404 Not Found" or "not found" in title.lower():
                    logger.warning(f"    ⚠️ Page returned 404, skipping")
                    browser.close()
                    return None
            except:
                pass
            
            # Try to find article content with more specific selectors
            # Include Kerala Kaumudi specific selectors
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
                "#news-content",  # Kerala Kaumudi
                ".news-detail-content",  # Kerala Kaumudi
                ".story-details",  # Kerala Kaumudi
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
    logger.info(f"    🖼️  extract_og_image called for: {url[:60]}...")
    
    # Resolve Google News redirects first
    actual_url = url
    if "news.google.com" in url:
        try:
            from playwright.sync_api import sync_playwright
            logger.info(f"    🌐 Resolving Google News redirect for image...")
            
            resolved_url = url
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
                context = browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
                page = context.new_page()
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=10000)
                    # Poll every 200ms until page redirects away from news.google.com
                    for _ in range(30):
                        if "news.google.com" not in page.url:
                            break
                        page.wait_for_timeout(200)
                    resolved_url = page.url
                except:
                    pass
                browser.close()
            
            # If we got a real URL (not still Google News), use it
            if "news.google.com" not in resolved_url:
                actual_url = resolved_url
                logger.info(f"    🔄 Resolved to: {actual_url[:60]}...")
            else:
                logger.info(f"    ⚠️  Could not resolve Google News URL, using cached URL if available")
        except Exception as e:
            logger.warning(f"    Could not resolve redirect: {e}")
    
    # For JavaScript-heavy sites, use Playwright to bypass Cloudflare
    url_lower = actual_url.lower()
    if any(site in url_lower for site in ["drivespark.com", "keralakaumudi.com", "oneindia.com"]):
        if "drivespark" in url_lower:
            site_name = "DriveSpark"
        elif "keralakaumudi" in url_lower:
            site_name = "Kerala Kaumudi"
        else:
            site_name = "OneIndia"
            
        logger.info(f"    🎯 {site_name} image - using Playwright")
        return extract_image_with_playwright(actual_url)
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = http_request("GET", actual_url, headers=headers, timeout=FETCH_TIMEOUT_SECONDS)
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
        logger.debug(f"Failed to extract image from {actual_url}: {e}")
        return None


def extract_image_with_playwright(url):
    """Use Playwright to extract image from JavaScript-heavy sites like DriveSpark."""
    # Skip non-article URLs
    if "keralakaumudi.com" in url.lower():
        if "/photogallery/" in url or "/cartoon/" in url:
            logger.warning(f"    🖼️  Skipping image extraction for non-article URL: {url[:60]}...")
            return None
    
    try:
        from playwright.sync_api import sync_playwright
        logger.info(f"    🖼️  Using Playwright to extract image from {url[:50]}...")
        
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                ]
            )
            
            context = browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport={'width': 1920, 'height': 1080},
            )
            
            page = context.new_page()
            # Use domcontentloaded for faster page load (don't wait for all network requests)
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
            except:
                # If timeout, try with even shorter wait
                logger.info(f"    ⏱️  Timeout waiting for page, trying immediate extraction...")
            page.wait_for_timeout(3000)  # Give JS time to set meta tags
            
            # Try to get image URL from page
            image_url = None
            
            # Method 1: Get og:image meta tag
            try:
                og_image = page.locator("meta[property='og:image']").first
                if og_image:
                    image_url = og_image.get_attribute("content")
                    logger.info(f"    ✅ Found og:image: {image_url[:60]}..." if image_url else "    ⚠️ og:image empty")
            except:
                pass
            
            # Method 2: Get first large image in article
            if not image_url:
                try:
                    # Try article images first
                    images = page.locator("article img, .article-content img, .entry-content img").all()
                    for img in images:
                        src = img.get_attribute("src")
                        if src and not any(skip in src.lower() for skip in ["logo", "icon", "avatar", "ad"]):
                            image_url = src
                            logger.info(f"    ✅ Found article image: {image_url[:60]}...")
                            break
                except:
                    pass
            
            # Method 3: Get any large image on page
            if not image_url:
                try:
                    all_images = page.locator("img").all()
                    for img in all_images:
                        src = img.get_attribute("src")
                        if src and (src.startswith("http") or src.startswith("//")):
                            if not any(skip in src.lower() for skip in ["logo", "icon", "avatar", "ad", "banner", "pixel", "tracking"]):
                                image_url = src
                                logger.info(f"    ✅ Found page image: {image_url[:60]}...")
                                break
                except:
                    pass
            
            browser.close()
            
            if image_url:
                # Handle relative URLs
                if image_url.startswith("//"):
                    image_url = "https:" + image_url
                elif image_url.startswith("/"):
                    from urllib.parse import urljoin
                    image_url = urljoin(url, image_url)
                
                logger.info(f"    🖼️  Returning image URL: {image_url[:60]}...")
                return image_url
            else:
                logger.warning(f"    ❌ No image found with Playwright")
                return None
                
    except Exception as e:
        logger.error(f"    💥 Playwright image extraction failed: {e}")
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
    return None


def fetch_feed_articles(feed_config, max_articles=20):
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
            
        now_ist = datetime.now(IST)
        today_ist = now_ist.date()

        for entry in feed.entries:
            if len(articles) >= max_articles:
                break

            title = clean_html(entry.get("title", ""))
            link = entry.get("link", "")
            description = clean_html(entry.get("summary", "") or entry.get("description", ""))
            
            if "content" in entry and entry.content:
                full_text = clean_html(entry.content[0].get("value", ""))
                if len(full_text) > len(description):
                    description = full_text
                    
            if not title or not link:
                continue

            # 1. Broad listing/archive filter
            title_lower = title.lower()
            link_lower = link.lower()
            
            is_listing = False
            listing_patterns = [
                r"/tag/",
                r"/category/",
                r"/author/",
                r"/search/",
                r"/page/\d+",
                r"archives",
                r"ആർക്കൈവ്സ്",
                r"untitled",
            ]
            
            if any(re.search(pat, link_lower) for pat in listing_patterns) or \
               any(pat in title_lower for pat in ["archives", "ആർക്കൈവ്സ്", "untitled"]):
                is_listing = True
                
            if is_listing:
                logger.info(f"  ⏭️ Skipping INDEX/LISTING URL: {title[:50]}... ({link})")
                continue

            published = parse_date(entry)
            if not published:
                logger.debug(f"  ⏭️ Skipping undated article: {title[:60]}...")
                continue

            # Convert to IST for comparison
            published_ist_dt = published.astimezone(IST)
            published_ist_date = published_ist_dt.date()
            
            # STRICT DATE FILTER: Only today's news (IST)
            if published_ist_date < today_ist:
                logger.info(f"  ⏭️ Skipping OLD article ({published_ist_date}): {title[:50]}...")
                continue
                
            # Skip FUTURE articles that are more than 2 hours ahead of our current IST time
            # (Allows mild 2-hour clock drift, but completely blocks tomorrow or beyond)
            if published_ist_dt > now_ist + timedelta(hours=2):
                logger.info(f"  ⏭️ Skipping FUTURE article ({published_ist_dt}): {title[:50]}...")
                continue
                
            articles.append({
                "title": title,
                "link": link,
                "description": description,
                "published": published,
                "source_name": feed_name,
                "category": category,
                "image_url": extract_image_from_entry(entry),
            })
            
        logger.info(f"  ✅ Fetched {len(articles)} articles from {feed_name} for {today_ist}")
        return articles
    except Exception as e:
        logger.error(f"  ❌ Error fetching {feed_name}: {e}")
        return []

def scrape_full_text_if_needed(article):
    """Scrapes full text if the article is missing detailed content.
    Also resolves the actual URL from Google News redirects."""
    desc = article.get("description", "")
    original_link = article["link"]
    
    # Resolve actual URL first (for Google News feeds)
    actual_url = original_link
    if "news.google.com" in original_link:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
                context = browser.new_context(user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
                page = context.new_page()
                try:
                    page.goto(original_link, wait_until="domcontentloaded", timeout=10000)
                    page.wait_for_timeout(2000)
                except:
                    pass
                actual_url = page.url
                browser.close()
            if "news.google.com" not in actual_url:
                article["link"] = actual_url  # Update with resolved URL
                logger.info(f"    🔗 Updated article URL to: {actual_url[:60]}...")
        except Exception as e:
            logger.debug(f"Could not resolve URL: {e}")
    
    if len(desc) < 400 or desc.strip().endswith("..."):
        logger.info(f"    -> Text truncated for '{article['title'][:30]}...'. Scraping web for full article...")
        scraped = extract_full_article_text(actual_url)
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
            
            content_length = int(response.headers.get("Content-Length", 0))
            if content_length > 0 and content_length < 5000: # Less than 5KB is likely a placeholder/icon
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
