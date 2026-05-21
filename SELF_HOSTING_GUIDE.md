# FreshNews Self-Hosting Guide

This guide reflects the current DigitalOcean deployment.

## 1. Server Layout
- Frontend app: `/root/website`
- Backend stack: `/root/supabase`
- Public site: `https://freshnews.top`
- Nginx serves HTTPS for the site and proxies backend routes to the local stack

## 2. Backend Model
FreshNews no longer depends on the old hosted Supabase project. The app uses the self-hosted backend stack on the droplet, exposed through `freshnews.top`.

Nginx proxies these paths to the backend:
- `/rest/`
- `/auth/`
- `/storage/`
- `/realtime/`

The backend stack is still Supabase-compatible, so the app code talks to it through the backend-agnostic env names below.

## 3. Required Environment Variables
Use these names in the frontend `.env` files:
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_ANON_KEY`
- `BACKEND_SERVICE_ROLE_KEY`
- `BACKEND_URL`
- `BACKEND_KEY`

Recommended values:
- `NEXT_PUBLIC_BACKEND_URL=https://freshnews.top`
- `BACKEND_URL=https://freshnews.top`
- `NEXT_PUBLIC_BACKEND_ANON_KEY=<anon key from local backend stack>`
- `BACKEND_SERVICE_ROLE_KEY=<service role key from local backend stack>`
- `BACKEND_KEY=<admin/service key if needed by scripts>`

## 4. Frontend Runtime
The frontend is run with PM2.

Useful commands:
```bash
cd /root/website
npm run build
pm2 restart freshnews-frontend --update-env
```

If the server is changed significantly:
```bash
cd /root/website
git pull
npm run build
pm2 restart freshnews-frontend --update-env
```

## 5. WhatsApp OTP
- OTP delivery uses Evolution API on the WhatsApp server
- Registered number receives OTP for login and account deletion
- Account deletion requires OTP confirmation before permanent removal

## 6. Account Deletion
Route:
- `/delete-account`

Behavior:
- Send WhatsApp OTP to the logged-in user's registered number
- Confirm OTP on the deletion page
- Permanently delete the user record and related content:
  - `wa_users`
  - `submissions`
  - `posts`
  - `comments`
  - `wa_otps`
  - `whatsapp_marketing`

## 7. Classified Images
Classified image URLs must resolve over HTTPS.

Use this pattern:
- `https://freshnews.top/storage/v1/object/public/...`

Do not keep raw `http://139.59.37.87:8000/...` image URLs in production on an HTTPS site.

## 8. Tag Refresh Behavior
- Clicking a tag should show the tag page
- Refreshing a tag page should return the user to Latest home
- The home feed should not insert classifieds/ad cards when a tag filter is active

## 9. Cleanup Guidance
If you are updating docs for another AI or maintainer, keep only current server layout, env names, and live routes. Remove old hosted-Supabase instructions unless they are explicitly needed for historical context.
