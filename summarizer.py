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

SUMMARIZE_PROMPT = """You are an expert Malayalam News Editor.
Your task is to REWRITE the following news article while ensuring ABSOLUTE accuracy and maintaining the original message perfectly.

Instructions:
1. SUMMARIZE THE TITLE: Create a concise title in Malayalam that preserves the EXACT meaning of the original. IT MUST BE UNDER 10 WORDS. Do not rewrite or creatively change the title; simply ensure it fits the word limit without losing any core information. Simple truncation or literal translation is preferred.
2. REWRITE THE CONTENT: Rephrase the article professionally in Malayalam. Target 250 to 500 words based on the original length. Ensure the Malayalam is natural and fluent.
3. ACCURACY & MEANING: DO NOT change the original meaning. If a sentence or concept is complex, do not take risks with rephrasing that could distort or reverse the intended meaning. Preservation of truth is the top priority.
4. QUOTES: Any text enclosed in double quotes " " or single quotes ' ' (representing direct quotes or official statements) MUST be kept mostly as-is or translated with zero change in essence.
5. LANGUAGE RULES: Use Malayalam script. English is ONLY allowed for proper nouns or technical terms with no Malayalam equivalent.
6. STRUCTURE: Use well-structured paragraphs. Start a new paragraph every 60-80 words.
7. NO PREFIXES: Do not include "Summary:", "സമ്മറി:", etc.
8. KEYWORDS: Extract 3 relevant English keywords (strictly English).
9. FAQ: Generate 3 FAQ items (q and a) in Malayalam based on the news.

You must reply with a valid JSON object in EXACTLY this format:
{{
  "title": "Rewritten Malayalam Title",
  "summary": "Full rewritten Malayalam article text with \\n\\n between paragraphs.",
  "keywords": ["Word1", "Word2", "Word3"],
  "faq": [
    {{"q": "Question?", "a": "Answer."}},
    {{"q": "Question?", "a": "Answer."}},
    {{"q": "Question?", "a": "Answer."}}
  ]
}}

Original Title: {title}
Original Content: {description}
"""

def truncate_title(title, max_words=10):
    """Truncate title to max_words without cutting words in half."""
    if not title:
        return ""
    words = title.split()
    if len(words) <= max_words:
        return title
    return " ".join(words[:max_words]) + "......"


def _call_mistral(prompt):
    """Call Mistral AI API (PRIMARY provider)."""
    if not MISTRAL_API_KEY or MISTRAL_API_KEY == "PASTE_YOUR_MISTRAL_KEY_HERE":
        logger.debug("  ⏭️ Mistral: No API key configured, skipping.")
        return None

    logger.info(f"  🤖 Using Mistral AI ({MISTRAL_MODEL})")

    headers = {
        "Authorization": f"Bearer {MISTRAL_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": MISTRAL_MODEL,
        "messages": [
            {"role": "system", "content": "You are a professional news editor. You only output valid JSON."},
            {"role": "user", "content": prompt}
        ],
        "response_format": {"type": "json_object"},
        "max_tokens": 3500,
        "temperature": 0.3 # Lower temperature for more consistent professional tone
    }

    for attempt in range(3):
        try:
            response = requests.post(
                "https://api.mistral.ai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code == 429:
                logger.warning("  ⏳ Mistral rate limit hit. Waiting 10s...")
                time.sleep(10)
                continue

            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

        except Exception as e:
            logger.warning(f"  ⚠️ Mistral error: {e}")
            time.sleep(3)
    return None


# ─── Cascade: Try each provider in order ───

PROVIDERS = [
    ("Mistral", _call_mistral),
    # Groq fallback removed as per user request
]


def summarize_article(article):
    """
    Generate a Malayalam summary and rewritten title using Mistral AI.
    Returns (rewritten_title, summary_string, list_of_tags, faq_list) or None.
    """
    title = article.get("title", "")
    description = article.get("description", "")

    if not description:
        description = title

    prompt = SUMMARIZE_PROMPT.format(
        title=title,
        description=description[:3000]
    )

    for provider_name, provider_fn in PROVIDERS:
        content = provider_fn(prompt)
        if content:
            try:
                parsed = json.loads(content)
                summary = str(parsed.get("summary", "")).strip()
                
                # Use the original title truncated to 10 words instead of AI rewritten title
                new_title = truncate_title(title, 10)
                
                tags = [str(t).strip() for t in parsed.get("keywords", []) if str(t).strip()]
                tags = [t for t in tags if len(t) < 20][:4]
                
                raw_faq = parsed.get("faq", [])
                faq = []
                if isinstance(raw_faq, list):
                    for item in raw_faq[:5]:
                        if isinstance(item, dict) and item.get("q") and item.get("a"):
                            faq.append({"q": str(item["q"]).strip(), "a": str(item["a"]).strip()})

                if summary and len(summary) > 50:
                    logger.info(f"  ✅ Summarized: {new_title[:50]}...")
                    return new_title, summary, tags, faq
            except Exception as e:
                logger.warning(f"  ⚠️ Error parsing AI response: {e}")
                continue

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
            new_title, summary, tags, faq = result
            article["title"] = new_title
            article["summary"] = summary
            article["tags"] = tags
            article["faq"] = faq
            valid_articles.append(article)
        else:
            logger.warning(f"  ⚠️ Dropping article '{article['title'][:40]}' due to summarization failure.")

        if i < len(articles) - 1:
            time.sleep(delay_seconds)

    logger.info(f"✅ Summarization complete! {len(valid_articles)}/{len(articles)} succeeded.")
    return valid_articles
