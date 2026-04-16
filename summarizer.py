"""
Summarizer
----------
Multi-provider AI summarizer for Malayalam news articles.
PRIMARY:  Mistral AI  (1B tokens/month free tier — massive!)
FALLBACK: Groq        (500K tokens/day free tier)

Automatically falls back if the primary provider hits rate limits.
"""

import logging
import time
import requests
import json
import re

from config import GROQ_API_KEY, GROQ_MODEL, MISTRAL_API_KEY, MISTRAL_MODEL

logger = logging.getLogger(__name__)

SUMMARIZE_PROMPT = """You are an expert Malayalam News Editor working for a digital newspaper.
Your task is to rephrase the following news article into a detailed Malayalam article.

Instructions:
1. Rephrase the article in Malayalam. Target EXACTLY 100 to 150 words (Maximum 170). 
2. EXTREMELY IMPORTANT: Create frequent paragraphs. You MUST start a new paragraph approximately every 30 to 50 words to ensure maximum readability. Every paragraph must be separated by exactly one blank line. 
3. DO NOT include prefixes like "സമ്മറി:", "Summary:", or "കീവേർഡുകൾ:". Provide only the clean article text.
4. You must extract exactly 3 keywords related to the article. THESE 3 KEYWORDS MUST BE IN ENGLISH ONLY AND MUST BE SINGLE WORDS. Do NOT write keywords in Malayalam!
5. Rewrite the wording to be concise and newspaper-like. Avoid overlong headlines and avoid repeating the title sentence inside the opening paragraph.

You must reply with a valid JSON object in EXACTLY this format:
{{
  "summary": "Full Malayalam article text separated by \\n\\n for paragraphs. Do not use the word summary in the text.",
  "keywords": ["Word1", "Word2", "Word3"]
}}

Article Title: {title}

Article Content: {description}
"""

# ─── Provider Definitions ───

def _call_mistral(prompt):
    """Call Mistral AI API (PRIMARY provider)."""
    if not MISTRAL_API_KEY or MISTRAL_API_KEY == "PASTE_YOUR_MISTRAL_KEY_HERE":
        logger.debug("  ⏭️ Mistral: No API key configured, skipping.")
        return None

    logger.info(f"  🤖 Trying PRIMARY: Mistral ({MISTRAL_MODEL})")

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MISTRAL_MODEL,
        "messages": [
            {"role": "system", "content": "You are a system that ONLY outputs standard, valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 2500,
        "temperature": 0.4
    }

    for attempt in range(3):
        try:
            response = requests.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60  # Mistral can be slower than Groq
            )

            # Handle rate limits
            if response.status_code == 429:
                try:
                    err_data = response.json()
                    err_msg = err_data.get("message", "") or str(err_data.get("error", ""))
                    # Try to extract retry-after
                    retry_after = response.headers.get("Retry-After", "")
                    if retry_after:
                        wait_t = float(retry_after) + 1.0
                    else:
                        match = re.search(r'(\d+\.?\d*)\s*s', err_msg)
                        wait_t = float(match.group(1)) + 1.5 if match else 10.0
                    logger.warning(f"  ⏳ Mistral rate limit hit. Waiting {wait_t:.1f}s (attempt {attempt+1}/3)...")
                    time.sleep(wait_t)
                    continue
                except Exception:
                    logger.warning(f"  ⏳ Mistral 429, waiting 10s (attempt {attempt+1}/3)...")
                    time.sleep(10)
                    continue

            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            return content

        except requests.exceptions.HTTPError as e:
            logger.warning(f"  ⚠️ Mistral HTTP error (attempt {attempt+1}/3): {e}")
            if attempt < 2:
                time.sleep(3)
                continue
            return None
        except Exception as e:
            logger.warning(f"  ⚠️ Mistral error (attempt {attempt+1}/3): {e}")
            if attempt < 2:
                time.sleep(3)
                continue
            return None

    return None


def _call_groq(prompt):
    """Call Groq API (FALLBACK provider)."""
    if not GROQ_API_KEY:
        logger.debug("  ⏭️ Groq: No API key configured, skipping.")
        return None

    logger.info(f"  🤖 Trying FALLBACK: Groq ({GROQ_MODEL})")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "You are a system that ONLY outputs standard, valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 2500,
        "temperature": 0.4
    }

    for attempt in range(3):
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=40
            )

            if response.status_code == 429:
                try:
                    err_data = response.json()
                    err_msg = err_data.get("error", {}).get("message", "")
                    match = re.search(r'try again in ([\d\.]+)s', err_msg)
                    if match:
                        wait_t = float(match.group(1)) + 1.5
                        logger.warning(f"  ⏳ Groq rate limit hit. Waiting {wait_t:.1f}s (attempt {attempt+1}/3)...")
                        time.sleep(wait_t)
                        continue
                except Exception:
                    pass
                logger.warning(f"  ⏳ Groq 429, waiting 10s (attempt {attempt+1}/3)...")
                time.sleep(10)
                continue

            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"].strip()
            return content

        except requests.exceptions.HTTPError as e:
            logger.warning(f"  ⚠️ Groq HTTP error (attempt {attempt+1}/3): {e}")
            if attempt < 2:
                time.sleep(3)
                continue
            return None
        except Exception as e:
            logger.warning(f"  ⚠️ Groq error (attempt {attempt+1}/3): {e}")
            if attempt < 2:
                time.sleep(3)
                continue
            return None

    return None


# ─── Cascade: Try each provider in order ───

PROVIDERS = [
    ("Mistral", _call_mistral),
    ("Groq", _call_groq),
]


def summarize_article(article):
    """
    Generate a Malayalam summary for a news article using multi-provider cascade.
    Tries Mistral first (1B tokens/month), falls back to Groq (500K tokens/day).
    Returns (summary_string, list_of_tags) or None if all providers fail.
    """
    title = article.get("title", "")
    description = article.get("description", "")

    if not description:
        description = title

    prompt = SUMMARIZE_PROMPT.format(
        title=title,
        description=description[:1500]  # Slightly more generous limit for Mistral's bigger context
    )

    # Try each provider in order
    for provider_name, provider_fn in PROVIDERS:
        content = provider_fn(prompt)
        if content:
            try:
                parsed = json.loads(content)
                summary = str(parsed.get("summary", "")).strip()
                tags = [str(t).strip() for t in parsed.get("keywords", []) if str(t).strip()]
                tags = tags[:4]

                if summary and len(summary) > 50:
                    logger.info(f"  ✅ [{provider_name}] Summarized: {title[:50]}... | Tags: {tags}")
                    return summary, tags
                else:
                    logger.warning(f"  ⚠️ [{provider_name}] Empty/short summary, trying next provider...")
                    continue
            except json.JSONDecodeError as e:
                logger.warning(f"  ⚠️ [{provider_name}] Invalid JSON response: {e}")
                # Try to salvage — sometimes the model wraps JSON in markdown
                try:
                    json_match = re.search(r'\{.*\}', content, re.DOTALL)
                    if json_match:
                        parsed = json.loads(json_match.group())
                        summary = str(parsed.get("summary", "")).strip()
                        tags = [str(t).strip() for t in parsed.get("keywords", []) if str(t).strip()][:4]
                        if summary and len(summary) > 50:
                            logger.info(f"  ✅ [{provider_name}] Salvaged JSON. Summarized: {title[:50]}... | Tags: {tags}")
                            return summary, tags
                except Exception:
                    pass
                continue

    logger.error("  ❌ All AI providers failed! Skipping article.")
    return None


def summarize_batch(articles, delay_seconds=15):
    """
    Summarize a list of articles. Returns only the successfully summarized ones.
    """
    logger.info(f"🤖 Summarizing {len(articles)} articles with AI (Mistral → Groq cascade)...")

    valid_articles = []
    for i, article in enumerate(articles):
        logger.info(f"  [{i+1}/{len(articles)}] {article['title'][:60]}...")

        result = summarize_article(article)
        if result:
            summary, tags = result
            article["summary"] = summary
            article["tags"] = tags
            valid_articles.append(article)
        else:
            logger.warning(f"  ⚠️ Dropping article '{article['title'][:40]}' due to summarization failure.")

        if i < len(articles) - 1:
            time.sleep(delay_seconds)

    logger.info(f"✅ Summarization complete! {len(valid_articles)}/{len(articles)} succeeded.")
    return valid_articles
