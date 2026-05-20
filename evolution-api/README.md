# 🚀 WhatsApp Evolution API Migration & Setup Guide

This guide walks you through deploying the Evolution API v2 on your DigitalOcean droplet (`139.59.37.87`) with Nginx reverse proxy and HTTPS (via Cloudflare).

---

## 📋 Prerequisites

### 1. Cloudflare DNS Setup
In your Cloudflare Dashboard for **freshnews.top**, add a new DNS record:
*   **Type:** `A`
*   **Name:** `wa`
*   **IPv4 Address:** `139.59.37.87`
*   **Proxy Status:** `Proxied` (Orange Cloud) — this is important as Cloudflare handles the SSL/HTTPS certificate for you!

---

## 🛠️ Step-by-Step Droplet Deployment

### Step 1: Push Local Files to GitHub
On your local machine, commit and push these new configurations:
```bash
git add evolution-api/
git commit -m "add: Evolution API Docker and Nginx configs for droplet migration"
git push origin main
```

### Step 2: SSH into your Droplet
Connect to your DigitalOcean droplet via your terminal:
```bash
ssh root@139.59.37.87
```

### Step 3: Pull Code on Droplet
Navigate to your website directory and pull the latest changes:
```bash
cd ~/website
git pull
```

### Step 4: Run the Deployment Script
Make the script executable and run it as root:
```bash
cd evolution-api
chmod +x deploy.sh
sudo ./deploy.sh
```

This script will automatically:
1. Create directories for data persistence (`postgres_data/` and `instances/`).
2. Copy `nginx.conf` to `/etc/nginx/sites-available/wa.freshnews.top`.
3. Create the symbolic link to enable it.
4. Test your Nginx configuration and reload it.
5. Boot up the PostgreSQL and Evolution API containers via Docker Compose on port `8082`.

---

## 🔗 Reconnecting your WhatsApp Instance

Once the deployment finishes and Nginx is running:

1. Open your browser and navigate to: **`https://wa.freshnews.top/manager/`**
2. It will ask for connection settings. Enter:
   *   **API URL:** `https://wa.freshnews.top`
   *   **Global API Key:** `Maramon7#5*`
3. Click login. You will see a clean dashboard with **"No instances found"** (as it's a fresh installation).
4. Click **Create Instance**:
   *   **Instance Name:** `VercelBot2`
   *   **Integration:** `WHATSAPP-BAILEYS`
   *   **API Key:** (Leave blank! The system will automatically generate a secure one for you).
5. Click **Save**.
6. The instance will show up on the dashboard. Click it and scan the **QR Code** using your WhatsApp mobile app (`Linked Devices` -> `Link a Device`).

---

## 💻 Environment Variables Update

Once WhatsApp is connected, you need to update the environment variables of your frontend so it routes requests to your droplet:

1. In your **Vercel Project Settings**, add a new environment variable:
   *   **Key:** `WA_API_URL`
   *   **Value:** `https://wa.freshnews.top`
2. Save and redeploy the frontend.
3. Update the `.env` on your droplet if you run backend processes there.
