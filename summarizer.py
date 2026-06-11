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

# ─── TEMPORARY: Pause AI title/summary rewriting ───────────────────────────
# Set to True  → articles pass through with ORIGINAL title & content.
#                 FAQ, comments, and tags are still AI-generated.
# Set to False → full Mistral/Gemini rewrite is enabled (normal mode).
PAUSE_AI_REWRITE = True
# ────────────────────────────────────────────────────────────────────────────

SUMMARIZE_PROMPT = """You are an expert Malayalam News Editor.
Your task is to REWRITE the following news article while ensuring ABSOLUTE accuracy and maintaining the original message perfectly.

Instructions:
1. MEANINGFUL TITLE: Create a highly engaging, professional, and meaningful title in Malayalam that perfectly captures the essence of the news. IT MUST BE UNDER 12 WORDS.
2. REWRITE THE CONTENT: Rephrase the article professionally in Malayalam. Target 250 to 500 words. Ensure the Malayalam is natural and fluent. DO NOT repeat words.
3. ACCURACY & MEANING: DO NOT change the original meaning. Rely ONLY on the provided original content. DO NOT correct facts, names, roles, or titles using external knowledge or pre-trained memory (even if you believe the original text has a typo, error, or factually incorrect statement, you MUST summarize it exactly as stated in the original content). Do not extrapolate, assume, or guess anything that is not explicitly present in the original text. NO HALLUCINATIONS. Do not generate fake words or endless repetitions (like "beniath").
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

STRICT RULE: Do not change the title, role, or name of any person from the original text (e.g. if the original text describes someone as "Chief Minister" / "മുഖ്യമന്ത്രി", keep them as "Chief Minister" / "മുഖ്യമന്ത്രി" in your output Malayalam translation/summary, even if you think they are actually the "Opposition Leader" / "പ്രതിപക്ഷ നേതാവ്"). Do not use any external knowledge to correct the input text. Treat the original text as the absolute truth.
"""

CLEAN_CONTENT_PROMPT = """You are an expert Malayalam News Editor.
Your task is to clean the provided news article content by identifying and removing all non-article/extraneous text. 

Non-article text to remove:
- Navigation menus, headers, footers, website names.
- Advertisements, sponsor promotions, or commercial messages.
- Social media sharing icons/prompts, follow us text, or email subscription prompts.
- Cookie consents, privacy policy notifications, or terms of service agreements.
- "Also Read", "Related Articles", "Read More" links, or bulletins linking to other stories.
- Links to download apps (e.g., "Click here to download app", Play Store/App Store icons).
- Author signatures, email addresses, or phone numbers that are not part of the news body.
- Any other boilerplate, utility, or junk text.

STRICT RULES:
1. DO NOT summarize the article. Do not shorten or condense the actual news content.
2. DO NOT reword, rephrase, edit, translate, or rewrite any part of the actual news content.
3. Keep the original wording, sentences, grammar, and paragraph structure of the actual article exactly as is.
4. If the content is already clean, return it exactly as it is.
5. Extract 5 relevant English keywords (strictly English) based on the news. If the article is about cinema, include "Movies" as one of the keywords.
6. Generate 3 FAQ items (q and a) in Malayalam based on the news.

You must reply with a valid JSON object in EXACTLY this format:
{{
  "cleaned_content": "The exact original article text with extraneous/non-article text removed. Original wording must be preserved.",
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

def clean_boilerplate(text):
    """Remove common newspaper disclaimers and metadata boilerplates."""
    if not text:
        return ""
    # Remove Mathrubhumi comment disclaimers
    disclaimer_pat = r"Kindly avoid objectionable,\s*derogatory,\s*unlawful\s*and\s*lewd\s*comments,\s*while\s*responding\s*to\s*reports\.\s*Such\s*comments\s*are\s*punishable\s*under\s*cyber\s*laws\.\s*Please\s*keep\s*away\s*from\s*personal\s*attacks\.\s*The\s*opinions\s*expressed\s*here\s*are\s*the\s*personal\s*opinions\s*of\s*readers\s*and\s*not\s*that\s*of\s*[A-Za-z0-9]+\.?"
    text = re.sub(disclaimer_pat, "", text, flags=re.IGNORECASE)
    
    # Clean split fragments of it
    text = re.sub(r"Such comments are punishable under cyber laws\.", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Please keep away from personal attacks\.", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Disclaimer:\s*Kindly avoid objectionable.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"Published:\s*\d+\s+[A-Za-z]+\s+\d{4},\s*\d+:\d+\s*(?:am|pm)\s*IST", "", text, flags=re.IGNORECASE)
    
    return text.strip()


def clean_hallucinations(text):
    """Remove repeating hallucinated words like 'beniath' from AI output and clean disclaimers."""
    if not text:
        return ""
    # Clean boilerplate disclaimers first
    cleaned = clean_boilerplate(text)
    
    # Remove the specific word that was hallucinated
    cleaned = re.sub(r'\bbeniath\b', '', cleaned, flags=re.IGNORECASE)
    # Remove any word that repeats 4 or more times in a row
    cleaned = re.sub(r'\b(\w+)(?:\s+\1){3,}\b', r'\1', cleaned, flags=re.IGNORECASE)
    # Clean up extra spaces (excluding newlines)
    cleaned = re.sub(r'[ \t]{2,}', ' ', cleaned)
    # Collapse multiple newlines (3 or more) to exactly two
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def call_mistral(prompt):
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
            {"role": "system", "content": "You are a professional Malayalam news editor. You strictly follow instructions to process only what is present in the source text. You never correct facts, names, roles, or titles using external knowledge. You must treat the provided text as the absolute truth, even if it has errors. You only output valid JSON."},
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

            if response.status_code == 401:
                logger.error("  🚫 Mistral API key invalid or expired (401). Skipping Mistral entirely.")
                return None  # No point retrying — key is bad

            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

        except Exception as e:
            logger.warning(f"  ⚠️ Mistral error: {e}")
            time.sleep(3)
    return None


def _try_gemini_keys(prompt, model_name):
    """Try all Gemini keys for a given model. Returns content string or None."""
    shuffled_keys = list(GOOGLE_API_KEYS)
    random.shuffle(shuffled_keys)

    for api_key in shuffled_keys:
        logger.info(f"  🤖 Using Google Gemini ({model_name}) - Key: {api_key[:8]}...")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "systemInstruction": {
                "parts": [{
                    "text": "You are a professional Malayalam news editor. You strictly follow instructions to process only what is present in the source text. You never correct facts, names, roles, or titles using external knowledge. You must treat the provided text as the absolute truth, even if it has errors. You only output valid JSON."
                }]
            },
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        for attempt in range(2): # 2 attempts per key
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=90)
                
                if response.status_code == 429:
                    logger.warning(f"  ⏳ Gemini rate limit hit for key {api_key[:8]}. Trying another key...")
                    break # Break out of attempt loop to try next key

                if response.status_code == 403:
                    logger.warning(f"  🚫 Gemini key {api_key[:8]} rejected (leaked/disabled). Skipping...")
                    break # Try next key

                if response.status_code != 200:
                    logger.warning(f"  ⚠️ Gemini API error: {response.status_code} - {response.text[:200]}")
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


def call_gemini(prompt, fast_fail=False):
    """Call Google Gemini API with key rotation and optional wait-retry.

    fast_fail=True: return immediately when all keys are rate-limited.
    Use this for low-priority calls (e.g. semantic dedup) so they never
    block the pipeline. Full summarization calls use fast_fail=False (default)
    and will wait 30 minutes for the quota window to reset.
    """
    if not GOOGLE_API_KEYS:
        logger.debug("  ⏭️ Gemini: No API keys configured, skipping.")
        return None

    # Attempt 1: Try all keys with the configured model
    result = _try_gemini_keys(prompt, GEMINI_MODEL)
    if result:
        return result

    # Low-priority call — don't burn time on fallbacks or long waits
    if fast_fail:
        logger.debug("  ⏭️ Gemini: all keys rate-limited (fast_fail=True), giving up.")
        return None

    # Attempt 2: No model fallback — gemini-2.5-flash uses thinking tokens
    # (10x quota cost) and shares the same rate-limit pool as flash-lite.
    # Falling back to it wastes quota without improving success rate.
    # Go straight to giving up (to prevent blocking the pipeline/watchdog).

    logger.warning("  ⏳ All Gemini keys rate-limited. Failing fast to avoid blocking the pipeline.")
    return None


# ─── Cascade: Try each provider in order ───

PROVIDERS = [
    ("Mistral", call_mistral),  # PRIMARY: 1B tokens/month free tier — use first
    ("Gemini", call_gemini),    # FALLBACK: only when Mistral fails/rate-limits
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
    """Generate 0-4 AI comments for an article randomly.
    Skipped 50% of the time to conserve AI token quota."""
    # 50% chance to skip entirely — halves comment-related token spend
    # without affecting core news summarization
    if random.random() < 0.5:
        logger.debug("  💬 Bogus comments: skipped (token-save roll)")
        return []

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

    When PAUSE_AI_REWRITE=True: skips title+summary rewriting, uses original content.
    FAQ, comments and tags are still AI-generated.
    """
    title = article.get("title", "")
    description = article.get("description", "")

    if not description:
        description = title

    # ── PAUSED MODE: skip rewrite, keep FAQ + comments + tags ──
    if PAUSE_AI_REWRITE:
        logger.info("  ⏸️ AI rewrite paused — using original title & content.")

        # Call AI to clean extraneous text and generate tags/FAQs
        faq_prompt = CLEAN_CONTENT_PROMPT.format(
            title=title,
            description=description[:3000]
        )
        faq = []
        tags = []
        cleaned_content = None

        for provider_name, provider_fn in PROVIDERS:
            content = provider_fn(faq_prompt)
            if content:
                try:
                    parsed = json.loads(content)
                    cleaned_content = str(parsed.get("cleaned_content", description)).strip()
                    raw_tags = [str(t).strip() for t in parsed.get("keywords", []) if str(t).strip()]
                    raw_faq = parsed.get("faq", [])

                    # Tags
                    content_to_check = (title + " " + description).lower()
                    cinema_keywords = ['cinema', 'film', 'movie', 'actor', 'actress', 'director',
                                       'mollywood', 'bollywood', 'സിനിമ', 'ചിത്രം', 'നടൻ', 'നടി', 'സംവിധായകൻ']
                    is_cinema = any(kw in content_to_check for kw in cinema_keywords)
                    if is_cinema and 'Movies' not in [t.capitalize() for t in raw_tags]:
                        raw_tags.insert(0, 'Movies')
                    tags = [t for t in raw_tags if len(t) < 20][:5]

                    # FAQ
                    if isinstance(raw_faq, list):
                        for item in raw_faq[:5]:
                            if isinstance(item, dict) and item.get("q") and item.get("a"):
                                faq.append({"q": str(item["q"]).strip(), "a": str(item["a"]).strip()})
                    break
                except Exception as e:
                    logger.warning(f"  ⚠️ Error parsing AI response (paused mode): {e}")
                    continue

        # Use original title (truncated) and cleaned content
        kept_title = truncate_title(title, 10)
        final_description = cleaned_content if (cleaned_content and len(cleaned_content) > 50) else description
        kept_summary = clean_hallucinations(final_description[:5000])

        bogus_comments = generate_bogus_comments(kept_title, kept_summary[:500])

        logger.info(f"  ✅ Passed through (no rewrite): {kept_title[:50]}...")
        return kept_title, kept_summary, tags, faq, bogus_comments

    # ── NORMAL MODE: full AI rewrite ──
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
    In PAUSE_AI_REWRITE mode, all articles pass through (none are dropped).
    """
    if PAUSE_AI_REWRITE:
        logger.info(f"⏸️ AI rewrite PAUSED — passing through {len(articles)} articles with original content (FAQ+comments still AI-generated).")
    else:
        logger.info(f"🤖 Summarizing {len(articles)} articles with AI (Mistral → Gemini cascade)...")

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
            if PAUSE_AI_REWRITE:
                # In paused mode, never drop articles — pass through as-is
                article.setdefault("tags", [])
                article.setdefault("faq", [])
                article.setdefault("bogus_comments", [])
                valid_articles.append(article)
            else:
                logger.warning(f"  ⚠️ Dropping article '{article['title'][:40]}' due to summarization failure.")

        if i < len(articles) - 1:
            time.sleep(delay_seconds)

    logger.info(f"✅ Done! {len(valid_articles)}/{len(articles)} articles ready.")
    return valid_articles
