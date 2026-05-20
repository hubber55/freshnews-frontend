#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "================================================"
echo "🚀 Starting WhatsApp Evolution API Deploy Script"
echo "================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run this script as root (use sudo ./deploy.sh)"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 1. Set up Docker Directories
echo "📂 Creating Docker volumes directories..."
mkdir -p postgres_data instances
chmod 777 instances

# 2. Configure Nginx Reverse Proxy
echo "🌐 Configuring Nginx reverse proxy..."
NGINX_CONF_PATH="/etc/nginx/sites-available/wa.freshnews.top"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/wa.freshnews.top"

# Copy configuration
cp nginx.conf "$NGINX_CONF_PATH"
echo "✅ Copied nginx.conf to $NGINX_CONF_PATH"

# Create symlink if not exists
if [ ! -L "$NGINX_ENABLED_PATH" ]; then
  ln -s "$NGINX_CONF_PATH" "$NGINX_ENABLED_PATH"
  echo "✅ Enabled Nginx site symlink"
fi

# Test Nginx Config
echo "🔍 Testing Nginx configuration..."
if nginx -t; then
  echo "✅ Nginx configuration syntax is OK"
  echo "🔄 Reloading Nginx server..."
  systemctl reload nginx
  echo "✅ Nginx reloaded successfully!"
else
  echo "❌ Nginx configuration test FAILED. Please review nginx.conf manually."
  exit 1
fi

# 3. Start Docker services
echo "🐳 Starting Evolution API & PostgreSQL containers..."
if command -v docker-compose &> /dev/null; then
  docker-compose up -d
elif docker compose version &> /dev/null; then
  docker compose up -d
else
  echo "❌ Neither 'docker-compose' nor 'docker compose' was found. Please install Docker Compose."
  exit 1
fi

echo "================================================"
echo "🎉 Deployment Completed Successfully!"
echo "📡 The Evolution API is running locally on port 8082."
echo "🔗 Nginx is routing wa.freshnews.top -> port 8082."
echo "👉 Make sure to point wa.freshnews.top to this droplet IP in Cloudflare!"
echo "================================================"
