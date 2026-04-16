"""
Summarizer
----------
Uses Groq API to summarize Malayalam news articles.
Generates a concise Malayalam summary from the article title + description.
"""

import logging
import time
import requests
import json
import re

from config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger(__name__)

SUMMARIZE_PROMPT = """You are an expert Malayalam News Editor working for a digital newspaper.
Your task is to rephrase the following news article into a detailed Malayalam article.

Instructions:
1. Rephrase the article in Malayalam. Create at least 2 or 3 distinct paragraphs.
2. Provide detail but do not exceed 500-600 words. Do not hallucinate. Do not use HTML tags.
3. DO NOT include prefixes like "സമ്മറി:", "Summary:", or "കീവേർഡുകൾ:". Provide only the clean article text.
4. You must extract exactly 4 keywords related to the article. THESE 4 KEYWORDS MUST BE IN ENGLISH ONLY. Do NOT write keywords in Malayalam!

You must reply with a valid JSON object in EXACTLY this format:
{{
  "summary": "Full Malayalam article text separated by \\n\\n for paragraphs. Do not use the word summary in the text.",
  "keywords": ["EnglishTag1", "EnglishTag2", "EnglishTag3", "EnglishTag4"]
}}

Article Title: {title}

Article Content: {description}
"""

def summarize_article(article):
    """
    Generate a Malayalam summary for a news article using Groq API via JSON mode.
    Returns (summary_string, list_of_tags) or None if it fails.
    """
    title = article.get("title", "")
    description = article.get("description", "")
    
    if not description:
        description = title
    
    prompt = SUMMARIZE_PROMPT.format(
        title=title,
        description=description[:1000]  # Very strict limit to save input tokens for the 8B model's output
    )
    
    if not GROQ_API_KEY:
        logger.error("  ❌ No Groq API Key found!")
        return None
        
    logger.info(f"  🤖 Trying Groq model: {GROQ_MODEL}")
    
    try:
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
            "max_tokens": 2500,  # Must be huge so Malayalam JSON can finish without 400 'max completion tokens reached' error
            "temperature": 0.4
        }
        for attempt in range(3):
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=40
            )
            
            # Handle TPM or RPM rate limits smartly
            if response.status_code == 429:
                try:
                    err_data = response.json()
                    err_msg = err_data.get("error", {}).get("message", "")
                    match = re.search(r'try again in ([\d\.]+)s', err_msg)
                    if match:
                        wait_t = float(match.group(1)) + 1.5
                        logger.warning(f"  ⏳ Groq TPM Limit hit. Pausing for {wait_t:.1f}s then retrying...")
                        time.sleep(wait_t)
                        continue
                except Exception:
                    pass
            
            response.raise_for_status()
            break
        data = response.json()
        content = data["choices"][0]["message"]["content"].strip()
        
        # Parse JSON reliably
        parsed = json.loads(content)
        summary = str(parsed.get("summary", "")).strip()
        tags = [str(t).strip() for t in parsed.get("keywords", []) if str(t).strip()]
        
        # Ensure we only have 4 tags maximum
        tags = tags[:4]
        
        logger.info(f"  ✅ Summarized: {title[:50]}... | Tags: {tags}")
        return summary, tags
        
    except Exception as e:
        error_msg = str(e).lower()
        if hasattr(e, 'response') and e.response is not None:
            error_msg += " | Response: " + e.response.text
            
        logger.error(f"  ❌ API error: {error_msg}")
        if "401" in error_msg:
            logger.error("  ❌ Invalid Authentication Key! Please check GROQ_API_KEY in .env")
            
        logger.error("  ❌ Summarization Failed! Skipping article.")
        return None

def summarize_batch(articles, delay_seconds=15):
    """
    Summarize a list of articles. Returns only the successfully summarized ones.
    """
    logger.info(f"🤖 Summarizing {len(articles)} articles with AI...")
    
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
