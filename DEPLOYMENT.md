# Deployment Guide

| Layer | Platform | Cost |
|---|---|---|
| Frontend | Vercel | Free |
| Backend | Render | Free |
| Database | Neon | Free ✅ Already set up |

---

## Database — Already Done ✅
- Neon DB is set up, PostGIS enabled, 847 buildings loaded.
- Connection string:
  ```
  postgresql://neondb_owner:<password>@ep-muddy-river-ahoyujxl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```

---

## Backend — Render

### Step 1 — Sign up
Go to https://render.com → Sign up with GitHub (free)

### Step 2 — Create a new Web Service
1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Fill in:
   - **Name**: `gis-mvp-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

### Step 3 — Add environment variables
In the Render service → **Environment** tab, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | your full Neon connection string |
| `CORS_ORIGINS` | `https://your-app.vercel.app,http://localhost:5173` ← fill in Vercel URL after next section |
| `PYTHON_VERSION` | `3.12.0` |

### Step 4 — Deploy
Click **Deploy**. First deploy takes ~3-5 minutes.
Your backend URL will be: `https://gis-mvp-api.onrender.com`

> ⚠️ Free tier spins down after 15 min inactivity. First request after sleep takes ~30s.

---

## Frontend — Vercel

### Step 1 — Sign up
Go to https://vercel.com → Sign up with GitHub (free)

### Step 2 — Import project
1. Dashboard → **Add New** → **Project**
2. Import your GitHub repo
3. Vercel auto-detects Vite — confirm settings:
   - **Framework**: Vite
   - **Root Directory**: `.` (leave as root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3 — Add environment variable
In the project settings → **Environment Variables**, add:

| Key | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://gis-mvp-api.onrender.com` |

### Step 4 — Deploy
Click **Deploy**. Done in ~1 minute.
Your frontend URL will be: `https://your-app.vercel.app`

---

## Final Step — Update CORS on Render

Once you have your Vercel URL, go back to Render → Environment and update:
```
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```
Then click **Save** — Render will redeploy automatically.

---

## Local Development

```bash
# Backend (in one terminal)
cd backend
DATABASE_URL="your-neon-url" uv run run.py

# Frontend (in another terminal)
VITE_API_BASE_URL=http://localhost:8000 npm run dev
```
