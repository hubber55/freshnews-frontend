# FreshNews Self-Hosting Guide

## 🚀 Server Details
- **Droplet IP:** `139.59.37.87`
- **Region:** Bangalore (BLR1)
- **Spec:** 2GB RAM / 1 CPU ($12/mo)

## 🛠️ Supabase Dashboard (Studio)
- **URL:** [http://139.59.37.87:8000](http://139.59.37.87:8000)
- **Username:** `supabase`
- **Password:** `this_password_is_insecure_and_should_be_updated`

## 🔑 Database Credentials (Postgres)
- **Host:** `localhost` (inside server) or `139.59.37.87` (external)
- **Port:** `5432`
- **User:** `postgres`
- **Password:** `RdKtQCL7HECyTByZ`

## 🔐 Application Keys (for .env)
- **NEXT_PUBLIC_SUPABASE_URL:** `http://139.59.37.87:8000`
- **NEXT_PUBLIC_SUPABASE_ANON_KEY:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc4ODY5ODAwLCJleHAiOjE5MzY2MzYyMDB9.9s1We9fcPL4DNehqzfFFk4fVGV_fUfrglkniEd0Yk7s`
- **SUPABASE_SERVICE_ROLE_KEY:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3Nzg4Njk4MDAsImV4cCI6MTkzNjYzNjIwMH0.vS80d1W9ijGQoqg1ON0_SkEzepIARJDlxKNj7QnM9jM`
- **JWT_SECRET:** `2ab66d967f03456470870b033c50532498c96d42961655e224fad6d1abbbe5d5`

## 📂 Backup Command (Run on Server)
To take a new backup manually:
```bash
docker exec -it supabase-db pg_dump -U postgres -d postgres > backup_$(date +%F).sql
```
