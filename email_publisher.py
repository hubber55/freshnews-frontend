"""
Email Publisher
---------------
Publishes news articles to Blogger by sending emails.
This COMPLETELY bypasses the Blogger API quota!

How it works:
  - Blogger has a "Post using email" feature
  - Send an HTML email to the secret Blogger address
  - Subject line = Post title
  - Email body = Post HTML content
  - Posts appear on the blog automatically

Quota: Gmail's sending limit (500/day free, 2000/day Workspace)
"""

import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone, timedelta

from config import (
    GMAIL_ADDRESS,
    GMAIL_APP_PASSWORD,
    BLOGGER_POST_EMAIL,
)

logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))


def build_post_html(article):
    """Build the HTML content for the email body. Same format as API publisher."""
    title = article.get("title", "")
    summary = article.get("summary", "")
    image_url = article.get("image_url", "")
    link = article.get("link", "#")
    source_name = article.get("source_name", "")

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


def publish_via_email(article):
    """
    Publish a single article to Blogger by sending an email.
    Returns True on success, False on failure.
    """
    if not all([GMAIL_ADDRESS, GMAIL_APP_PASSWORD, BLOGGER_POST_EMAIL]):
        logger.error("  Email publishing not configured! Check GMAIL_ADDRESS, GMAIL_APP_PASSWORD, BLOGGER_POST_EMAIL in .env")
        return False

    title = article.get("title", "Untitled")
    source_name = article.get("source_name", "News")
    ai_tags = article.get("tags", [])

    # Build labels for the subject line
    # Blogger email posting: labels go at the end of subject in parentheses
    day = datetime.now(IST).day
    suffix = "th" if 11 <= day <= 13 else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    date_str = datetime.now(IST).strftime(f"{day}{suffix} %B %Y")

    labels = [source_name, date_str] + ai_tags
    labels_str = ", ".join(labels)

    # Subject: Title (label1, label2, ...)
    subject = f"{title} ({labels_str})"

    # Build HTML body
    html_body = build_post_html(article)

    try:
        # Create the email
        msg = MIMEMultipart("alternative")
        msg["From"] = GMAIL_ADDRESS
        msg["To"] = BLOGGER_POST_EMAIL
        msg["Subject"] = subject

        # Attach HTML content
        html_part = MIMEText(html_body, "html", "utf-8")
        msg.attach(html_part)

        # Send via Gmail SMTP
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_ADDRESS, BLOGGER_POST_EMAIL, msg.as_string())

        logger.info(f"  Published via email: {title[:60]}...")
        return True

    except smtplib.SMTPAuthenticationError as e:
        logger.error(f"  Gmail authentication failed! Check app password. Error: {e}")
        return False
    except smtplib.SMTPRecipientsRefused as e:
        logger.error(f"  Blogger email address rejected: {e}")
        return False
    except Exception as e:
        logger.error(f"  Email publishing failed: {e}")
        return False
