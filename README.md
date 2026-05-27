# FreshNews

FreshNews is a Malayalam news and classifieds app running on a DigitalOcean droplet with a Next.js frontend and a self-hosted Supabase-compatible backend stack.

## Live Setup
- Frontend site: `https://freshnews.top`
- Backend/API base: `https://freshnews.top` proxied to `http://127.0.0.1:8000`
- Admin server: DigitalOcean droplet in BLR1
- Main app checkout on server: `/root/website`
- Backend stack checkout on server: `/root/supabase`

## What the app uses
- Posts, submissions, profiles, comments, and auth all talk to the backend through the public proxy on `freshnews.top`
- Environment variables now use backend-agnostic names:
  - `NEXT_PUBLIC_BACKEND_URL`
  - `NEXT_PUBLIC_BACKEND_ANON_KEY`
  - `BACKEND_SERVICE_ROLE_KEY`
  - `BACKEND_URL`
  - `BACKEND_KEY`

## Important flows
- Users sign in with WhatsApp OTP
- Profile page lets users edit username, email, and submissions
- `/delete-account` sends a WhatsApp OTP and permanently deletes the user record plus user content after confirmation
- Classified images must use HTTPS URLs; `http://` storage links will fail on `https://freshnews.top`

## Deployment notes
- PM2 runs the frontend on the server
- Nginx proxies `/rest/`, `/auth/`, and `/storage/` to the backend stack
- If tags are selected on the home page, the tag view should remain active until the page is refreshed; refresh returns to Latest home

## Docs to read first
- **`SERVER_RECOVERY.md`** (Start here! Complete guide for server crashes, updating code, and DB architecture)
- `SELF_HOSTING_GUIDE.md`
- `SETUP_GUIDE.md`
- `AGENTS.md`
