# FreshNews Setup Guide

This guide covers the app-side setup that matters for the current DigitalOcean deployment.

## What Changed
- The web app now uses backend-agnostic env names
- The public app runs on `https://freshnews.top`
- Tags, classifieds, profile, and account deletion are all part of the same app

## Env Names Used by the App
Set these in the frontend `.env` files:
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_ANON_KEY`
- `BACKEND_SERVICE_ROLE_KEY`
- `BACKEND_URL`
- `BACKEND_KEY`

## Local Dev
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
pm2 restart freshnews-frontend --update-env
```

## Important Pages
- `/`
- `/classifieds`
- `/profile`
- `/delete-account`

## Important Notes
- Browser-visible image URLs must be HTTPS on production
- Tag refresh returns the user to Latest home
- Classifed insertion should not show while viewing a tag-filtered home page
- Admins can edit post/classified images from the admin forms and review modal

## If You Are Updating This Project
Before changing code, read:
- `AGENTS.md`
- `SELF_HOSTING_GUIDE.md`

Keep this file short and current. Do not reintroduce old hosted-Supabase assumptions unless they are still true in the codebase.
