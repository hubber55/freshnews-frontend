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
import random

from config import GROQ_API_KEY, GROQ_MODEL, MISTRAL_API_KEY, MISTRAL_MODEL, GOOGLE_API_KEYS, GEMINI_MODEL

logger = logging.getLogger(__name__)

SUMMARIZE_PROMPT = """You are an expert Malayalam News Editor.
Your task is to REWRITE the following news article while ensuring ABSOLUTE accuracy and maintaining the original message perfectly.

Instructions:
1. MEANINGFUL TITLE: Create a highly engaging, professional, and meaningful title in Malayalam that perfectly captures the essence of the news. IT MUST BE UNDER 12 WORDS.
2. REWRITE THE CONTENT: Rephrase the article professionally in Malayalam. Target 250 to 500 words. Ensure the Malayalam is natural and fluent. DO NOT repeat words.
3. ACCURACY & MEANING: DO NOT change the original meaning. NO HALLUCINATIONS. Do not generate fake words or endless repetitions (like "beniath").
4. QUOTES: Keep direct quotes translated with zero change in essence.
5. LANGUAGE RULES: Use Malayalam script. English is ONLY allowed for proper nouns.
6. READABILITY & STRUCTURE: Use liberal paragraph breaks. Start a new paragraph every 4 to 6 lines (approx. 50-70 words) to ensure the article is easy to read on mobile devices. Use well-structured paragraphs with \n\n between them.
7. NO PREFIXES: Do not include "Summary:", "സമ്മറി:", etc.
8. KEYWORDS: Extract 5 relevant English keywords (strictly English). If the article is about cinema, include "Movies" as one of the keywords.
9. FAQ: Generate 3 FAQ items (q and a) in Malayalam based on the news.

You must reply with a valid JSON object in EXACTLY this format:
{{
  "title": "Rewritten Malayalam Title",
  "summary": "Full rewritten Malayalam article text with \\n\\n between paragraphs.",
  "keywords": ["Word1", "Word2", "Word3", "Word4", "Word5"],
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

def clean_hallucinations(text):
    """Remove repeating hallucinated words like 'beniath' from AI output."""
    if not text:
        return ""
    # Remove the specific word that was hallucinated
    cleaned = re.sub(r'\bbeniath\b', '', text, flags=re.IGNORECASE)
    # Remove any word that repeats 4 or more times in a row
    cleaned = re.sub(r'\b(\w+)(?:\s+\1){3,}\b', r'\1', cleaned, flags=re.IGNORECASE)
    # Clean up extra spaces
    cleaned = re.sub(r'\s{2,}', ' ', cleaned)
    return cleaned.strip()


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


def _call_gemini(prompt):
    """Call Google Gemini API (PRIMARY provider) with key rotation."""
    if not GOOGLE_API_KEYS:
        logger.debug("  ⏭️ Gemini: No API keys configured, skipping.")
        return None

    # Shuffle keys for this attempt
    shuffled_keys = list(GOOGLE_API_KEYS)
    random.shuffle(shuffled_keys)

    for api_key in shuffled_keys:
        logger.info(f"  🤖 Using Google Gemini ({GEMINI_MODEL}) - Key: {api_key[:8]}...")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        for attempt in range(2): # 2 attempts per key
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=60)
                
                if response.status_code == 429:
                    logger.warning(f"  ⏳ Gemini rate limit hit for key {api_key[:8]}. Trying another key...")
                    break # Break out of attempt loop to try next key

                if response.status_code != 200:
                    logger.warning(f"  ⚠️ Gemini API error: {response.status_code} - {response.text}")
                    break # Try next key

                data = response.json()
                
                if "candidates" in data and len(data["candidates"]) > 0:
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return content.strip()
                
                break # Try next key

            except Exception as e:
                logger.warning(f"  ⚠️ Gemini error: {e}")
                time.sleep(2)
    
    return None


# ─── Cascade: Try each provider in order ───

PROVIDERS = [
    ("Gemini", _call_gemini),
    ("Mistral", _call_mistral),
]




BOGUS_USERNAMES = [
    "Arjun_Varghese", "Binu_Tvm", "Amit_Kochi", "Priya_Menon", "Latha_Dxb",
    "Sanjay_Nair", "Vikram_Blr", "Jayan_Varkala", "Naveen_George", "Sneha_Tvm",
    "Mini_Varghese", "Rajesh_Kollam", "Kiran_Nair", "Ravi_Pala", "Sameer_Kochi",
    "Meera_Varghese", "Shibu_Tvm", "Vivek_Pillai", "Rohan_Thomas", "Vinu_Aluva",
    "Kartik_Nair", "Anjali_Varghese", "Suku_Tvm", "Harish_Kurup", "Suresh_Kochi",
    "Reena_Mathew", "Vinod_Tvm", "Divya_Varghese", "Anu_Kottayam", "Lokesh_Nair",
    "Akash_Tvm", "Kichu_Kochi", "Arun_Varghese", "Neeta_Thrissur", "Babu_Nair",
    "Jitin_Tvm", "Varun_Varghese", "Sabu_Kochi", "Pranav_Pillai", "Pooja_Tvm",
    "Tinu_Varghese", "Sagar_Kochi", "Abhi_Nair", "Achu_Tvm", "Gokul_Varghese",
    "Kavya_Kochi", "Monu_Nair", "Nithin_Tvm", "Rahul_Varghese", "Ammu_Kochi",
    "Faisal_Nair", "Sunil_Tvm", "Rinu_Varghese", "Umesh_Kochi", "Isha_Nair",
    "Appu_Tvm", "Tarun_Varghese", "Manoj_Kochi", "Chinu_Nair", "Ashok_Tvm",
    "Kalesh_Varghese", "Prakash_Kochi", "Salim_Tvm", "Geetha_Nair", "Biju_Varghese",
    "Maya_Kochi", "Soniya_Tvm", "Deepu_Varghese", "Sree_Kochi", "Hari_Nair",
    "Vijay_Tvm", "Madhu_Varghese", "Indu_Kochi", "Sami_Nair", "Lijo_Tvm",
    "Anil_Varghese", "Renu_Kochi", "Dinesh_Nair", "Saji_Tvm", "Binu_Varghese",
    "Joy_Kochi", "Sibi_Nair", "Raji_Tvm", "Aji_Varghese", "Vysakh_Kochi",
    "Midhun_Nair", "Rahul_Tvm", "Shaji_Varghese", "Nisha_Kochi", "Tessa_Nair",
    "Jinto_Tvm", "Libin_Varghese", "Dona_Kochi", "Kevin_Nair", "Riya_Tvm",
    "Sana_Varghese", "Zayan_Kochi", "Omar_Nair", "Farah_Tvm", "Esha_Varghese"
]

COMMENT_PROMPT = """You are a regular person reading a news article. 
Your task is to generate exactly 4 short, realistic comments based on the article provided. 

Rules:
1. TONE: Natural, conversational, "common man" style.
2. LANGUAGE: Mix of Malayalam and English. Some comments can be purely English (e.g., "Good work", "Wow!"), some purely Malayalam, and some a mix of both (Manglish).
3. VARIETY: Vary the lengths. Some should be just 1 word (e.g., "Super", "True"), some 1-line reactions, and some a short sentence.
4. FORMAT: Return a valid JSON list of objects.
   Each object must have:
   - "text": The comment text.
   - "is_reply": Boolean, true if this is a reply to another comment in this list.
   - "reply_index": If is_reply is true, the 0-based index of the parent comment in this list. Otherwise null.

Article Title: {title}
Article Summary: {summary}
"""

def generate_bogus_comments(title, summary):
    """Generate 0-4 AI comments for an article randomly."""
    # Determine number of comments to keep (0 to 4)
    num_comments = random.randint(0, 4)
    if num_comments == 0:
        return []

    prompt = COMMENT_PROMPT.format(title=title, summary=summary)
    
    for provider_name, provider_fn in PROVIDERS:
        content = provider_fn(prompt)
        if content:
            try:
                comments = json.loads(content)
                if not isinstance(comments, list):
                    continue
                
                final_comments = []
                # Pick unique random usernames
                usernames = random.sample(BOGUS_USERNAMES, min(len(comments), len(BOGUS_USERNAMES)))
                
                for i, c in enumerate(comments[:num_comments]):
                    final_comments.append({
                        "username": usernames[i],
                        "text": str(c.get("text", "")).strip(),
                        "is_reply": c.get("is_reply", False),
                        "reply_index": c.get("reply_index")
                    })
                
                return final_comments
            except Exception:
                continue
    return []


def summarize_article(article):
    """
    Generate a Malayalam summary, rewritten title, tags, and bogus comments using AI.
    Returns (rewritten_title, summary_string, list_of_tags, faq_list, bogus_comments) or None.
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
                summary = clean_hallucinations(str(parsed.get("summary", "")).strip())
                new_title = clean_hallucinations(str(parsed.get("title", "")).strip())
                if not new_title:
                    new_title = truncate_title(title, 10)
                
                tags = [str(t).strip() for t in parsed.get("keywords", []) if str(t).strip()]
                
                # Mandatory "Movies" tag logic
                content_to_check = (title + " " + summary).lower()
                cinema_keywords = ['cinema', 'film', 'movie', 'actor', 'actress', 'director', 'mollywood', 'bollywood', 'സിനിമ', 'ചിത്രം', 'നടൻ', 'നടി', 'സംവിധായകൻ']
                is_cinema = any(kw in content_to_check for kw in cinema_keywords)
                
                if is_cinema and 'Movies' not in [t.capitalize() for t in tags]:
                    tags.insert(0, 'Movies')

                tags = [t for t in tags if len(t) < 20][:5]
                
                raw_faq = parsed.get("faq", [])
                faq = []
                if isinstance(raw_faq, list):
                    for item in raw_faq[:5]:
                        if isinstance(item, dict) and item.get("q") and item.get("a"):
                            faq.append({"q": str(item["q"]).strip(), "a": str(item["a"]).strip()})

                if summary and len(summary) > 50:
                    logger.info(f"  ✅ Summarized: {new_title[:50]}...")
                    
                    # Generate bogus comments as well
                    bogus_comments = generate_bogus_comments(new_title, summary)
                    
                    return new_title, summary, tags, faq, bogus_comments
            except Exception as e:
                logger.warning(f"  ⚠️ Error parsing AI response: {e}")
                continue

    return None


def summarize_batch(articles, delay_seconds=15):
    """
    Summarize a list of articles. Returns only the successfully summarized ones.
    """
    logger.info(f"🤖 Summarizing {len(articles)} articles with AI (Gemini → Mistral cascade)...")

    valid_articles = []
    for i, article in enumerate(articles):
        logger.info(f"  [{i+1}/{len(articles)}] {article['title'][:60]}...")

        result = summarize_article(article)
        if result:
            new_title, summary, tags, faq, bogus_comments = result
            article["title"] = new_title
            article["summary"] = summary
            article["tags"] = tags
            article["faq"] = faq
            article["bogus_comments"] = bogus_comments
            valid_articles.append(article)
        else:
            logger.warning(f"  ⚠️ Dropping article '{article['title'][:40]}' due to summarization failure.")

        if i < len(articles) - 1:
            time.sleep(delay_seconds)

    logger.info(f"✅ Summarization complete! {len(valid_articles)}/{len(articles)} succeeded.")
    return valid_articles
