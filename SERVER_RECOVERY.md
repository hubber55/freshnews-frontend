# 🚨 FRESHNEWS SERVER RECOVERY & MANAGEMENT GUIDE 🚨

This document is your **single source of truth** for managing the DigitalOcean server, updating the code, and recovering from crashes. 

If you ever move to a new server or the current server goes down, refer to this guide.

---

## 1. Architecture Overview
Everything runs locally on a **single DigitalOcean droplet** (Ubuntu, logged in as `root`).
- **Website Folder:** `/root/website` (Contains the Next.js app and the Python scraper)
- **Database:** Self-Hosted Supabase running in **Docker**.
- **Process Manager:** **PM2** handles keeping the Next.js website and the Python scraper alive.

---

## 2. The Environment (`.env`)
Your app connects to your own local self-hosted Supabase, **not** the cloud version. 
Inside `/root/website/.env`, the key variables are:
```env
# Points to the local Docker Supabase
SUPABASE_URL="http://localhost:8000"
SUPABASE_KEY="<your-local-service-role-jwt-token>"
```
*(Do not change these to `supabase.co` or your site will break!)*

---

## 3. How to Update Code (Routine Maintenance)
If you push changes to GitHub and want them live on your server, run these exact commands in your DigitalOcean terminal:

```bash
cd /root/website
git pull origin main

# Update node modules and rebuild the website
npm install
npm run build

# Restart the website and the python news fetcher
pm2 restart freshnews-frontend
pm2 restart freshnews-daemon

# Save the PM2 state so they restart if the server reboots
pm2 save
```

---

## 4. Crash Recovery (If the server reboots or goes down)

If DigitalOcean restarts your droplet, everything *should* come back up automatically. But if it doesn't, follow these steps:

### Step A: Check the Database (Docker)
Your self-hosted Supabase runs in Docker containers. Check if they are running:
```bash
docker ps
```
You should see about 15 containers (like `supabase-db`, `supabase-kong`, `supabase-auth`, etc.). 
If they are NOT running, you need to go to wherever your Supabase docker-compose file is (usually `/root/supabase` or similar) and start it:
```bash
# Example if your supabase docker setup is here:
cd /root/supabase 
docker compose up -d
```

### Step B: Check the Apps (PM2)
Check if the website and python scraper are running:
```bash
pm2 ls
```
You should see **both** of these with status `online`:
1. `freshnews-frontend` 
2. `freshnews-daemon` 

If they are stopped, restart them:
```bash
pm2 restart all
```

If they are completely missing from PM2 (because PM2 lost its saved list), here is how to recreate them from scratch:

**1. Recreate the Website Process:**
```bash
cd /root/website
pm2 start npm --name "freshnews-frontend" -- start
```

**2. Recreate the Python Scraper Process:**
```bash
cd /root/website
pm2 start /root/website/venv/bin/python3 --name "freshnews-daemon" -- main.py
```

**3. Save the new list:**
```bash
pm2 save
```

---

## 5. View Live Logs (Debugging)
If the site is throwing errors or the scraper isn't fetching news, you can watch the live logs:

**To watch the website logs:**
```bash
pm2 logs freshnews-frontend
```

**To watch the python scraper logs:**
```bash
pm2 logs freshnews-daemon
```
*(Press `Ctrl+C` to exit the log viewer)*

---

## 6. Known Server Quirks
- **Kerala Kaumudi / Playwright Hanging:** If the Python scraper hangs due to heavy Javascript sites like Kerala Kaumudi, it has a built-in 45-second hard timeout. If the scraper ever completely freezes, just run `pm2 restart freshnews-daemon`.
- **Database Pruning:** The python scraper is designed to permanently delete the oldest un-locked post every time it successfully fetches a new one. This keeps the Supabase database lean so you don't run out of disk space on the droplet.
- **Evolution API:** Your WhatsApp OTPs run through a separate Docker container called `evolution_api` running on port `8080`. This should also automatically start with Docker.
