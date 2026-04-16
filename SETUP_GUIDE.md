# FreshNews Malayalam — Complete Setup Guide

## Project Overview
```
FreshNews/
├── main.py                    ← Run this to start the pipeline
├── config.py                  ← All settings & RSS feeds
├── news_fetcher.py            ← Fetches RSS feeds + extracts images
├── deduplicator.py            ← Removes duplicate articles
├── summarizer.py              ← Gemini AI Malayalam summarizer
├── blogger_publisher.py       ← Publishes posts to Blogger
├── get_refresh_token.py       ← One-time: get Blogger OAuth token
├── requirements.txt           ← Python dependencies
├── .env.example               ← Template for your secrets
├── .gitignore                 ← Keeps secrets out of GitHub
└── .github/
    └── workflows/
        └── fetch_news.yml     ← GitHub Actions (auto-run every 30 min)
```

---

## STEP 1 — Prerequisites

Install Python 3.10+ from https://python.org if not already installed.

Check with:
```bash
python --version
```

---

## STEP 2 — Get Your Gemini API Key (Free)

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (looks like: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)
5. Keep it safe - you'll add it to `.env` and GitHub Secrets

---

## STEP 3 — Create a Blogger Blog

1. Go to **https://www.blogger.com**
2. Sign in with your Google account
3. Click **"Create new blog"**
4. Enter:
   - **Title**: FreshNews Malayalam (or your desired name)
   - **Address**: freshnews-malayalam (or any available name)
5. Click **Create**
6. **Find your Blog ID**:
   - Go to your Blogger Dashboard
   - Look at the URL:  
     `https://www.blogger.com/blog/posts/` **`1234567890123456789`**
   - That number is your **BLOGGER_BLOG_ID**

---

## STEP 4 — Set Up Blogger API (Google Cloud Console)

### 4a. Create a Google Cloud Project
1. Go to **https://console.cloud.google.com/**
2. Click the project dropdown → **"New Project"**
3. Name: `FreshNews` → Click **Create**

### 4b. Enable Blogger API
1. Go to **APIs & Services → Library**
2. Search for **"Blogger API v3"**
3. Click it → Click **Enable**

### 4c. Create OAuth2 Credentials
1. Go to **APIs & Services → Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. If asked, configure the consent screen first:
   - User Type: **External**
   - App name: `FreshNews`
   - Add your email → Save
4. Back to Create OAuth client ID:
   - Application type: **Web application**
   - Name: `FreshNews Bot`
   - Authorized redirect URIs: Add `http://localhost:8080`
   - Click **Create**
5. Copy your **Client ID** and **Client Secret**

---

## STEP 5 — Local Setup & Get Refresh Token

### 5a. Set up the project
```bash
# Go to your project folder
cd D:\WEBSITES\FRESHNEWS

# Install dependencies
pip install -r requirements.txt

# Create your .env file from template
copy .env.example .env
```

### 5b. Edit your .env file
Open `.env` in Notepad and fill in:
```
GEMINI_API_KEY=AIzaSyXXXXXXXXXX...
BLOGGER_BLOG_ID=1234567890123456789
BLOGGER_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
BLOGGER_CLIENT_SECRET=GOCSPX-XXXXXXXXXX
BLOGGER_REFRESH_TOKEN=        ← leave blank for now
```

### 5c. Get your Refresh Token (run ONCE)
```bash
python get_refresh_token.py
```
- Your browser will open → Sign in to Google → Click Allow
- Copy the token shown in the terminal
- Paste it into `.env` as `BLOGGER_REFRESH_TOKEN=<token>`

---

## STEP 6 — Test Locally

Run the pipeline manually to verify everything works:
```bash
python main.py
```

You should see output like:
```
✅ FreshNews pipeline complete!
   📥 Fetched      : 42 articles
   🆕 Unique       : 28 articles
   🤖 Processed    : 8 articles
   ✅ Published    : 8 posts
   ❌ Failed       : 0 posts
```

Check your Blogger dashboard — you should see new posts! 🎉

---

## STEP 7 — Deploy to GitHub Actions (Auto-Run)

### 7a. Create a GitHub Repository
1. Go to **https://github.com** → Sign in → **"New repository"**
2. Name: `freshnews-malayalam`
3. Set to **Private** (to protect your code)
4. Click **Create repository**

### 7b. Push your code
```bash
cd D:\WEBSITES\FRESHNEWS

git init
git add .
git commit -m "Initial FreshNews setup"
git remote add origin https://github.com/YOURUSERNAME/freshnews-malayalam.git
git push -u origin main
```

### 7c. Add GitHub Secrets
1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"** and add each one:

| Secret Name | Value |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key |
| `BLOGGER_BLOG_ID` | Your Blog ID number |
| `BLOGGER_CLIENT_ID` | OAuth Client ID |
| `BLOGGER_CLIENT_SECRET` | OAuth Client Secret |
| `BLOGGER_REFRESH_TOKEN` | The token from Step 5c |

### 7d. Enable GitHub Actions
1. Go to your repo → **Actions** tab
2. Click **"I understand my workflows, go ahead and enable them"**
3. The workflow will now run **automatically every 30 minutes!**

### 7e. Test Manual Trigger
1. Go to **Actions → FreshNews - Malayalam Auto Publisher**
2. Click **"Run workflow"** → **"Run workflow"**
3. Watch the logs — you should see posts published to Blogger!

---

## STEP 8 — Customize (Optional)

### Add/Remove RSS Feeds
Edit `config.py`:
```python
MALAYALAM_RSS_FEEDS = [
    {"name": "Your Source", "url": "https://example.com/rss", "category": "general"},
    ...
]
```

### Change Posting Frequency
Edit `.github/workflows/fetch_news.yml`:
```yaml
- cron: '*/30 * * * *'   # Every 30 minutes
- cron: '0 * * * *'      # Every 1 hour
- cron: '0 */2 * * *'    # Every 2 hours
```

### Change Max Articles Per Run
Edit `config.py`:
```python
MAX_ARTICLES_PER_RUN = 8   # Increase or decrease
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `GEMINI_API_KEY not valid` | Double-check key in `.env` / GitHub Secrets |
| `HTTP 401` from Blogger | Re-run `get_refresh_token.py` to get a fresh token |
| No articles fetched | Check RSS feed URLs in `config.py` — some may have changed |
| Duplicate posts | Lower `SIMILARITY_THRESHOLD` in `config.py` (e.g., `0.55`) |
| Too slow | Reduce `delay_seconds` in `summarizer.py` (risk: rate limit) |
| GitHub Actions not running | Check Actions tab is enabled in repo settings |

---

## Free Tier Limits Summary

| Service | Free Limit | Our Usage |
|---|---|---|
| Gemini API | ~1500 req/day | ~8 per run × 48 runs = 384/day ✅ |
| GitHub Actions | 2000 min/month | ~2 min × 1440 runs = well within ✅ |
| Blogger | Unlimited posts | ✅ |
| Total Cost | **₹0/month** | ✅ |

---

*Built with ❤️ for Malayalam news readers | FreshNews 2025*
