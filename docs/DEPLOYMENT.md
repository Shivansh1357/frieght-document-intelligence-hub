# Deployment Guide

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Netlify     │────►│   Render      │────►│  Neon / RDS   │
│   (Frontend)  │     │   (Backend)   │     │  (PostgreSQL) │
│   Next.js 16  │     │   FastAPI     │     │              │
└──────────────┘     └──────┬───────┘     └──────────────┘
                             │
                      ┌──────▼───────┐
                      │  Anthropic    │
                      │  Claude API   │
                      └──────────────┘
```

---

## Step 1: Deploy PostgreSQL (Neon)

1. Go to [neon.tech](https://neon.tech) and create a free project
2. Create a database named `freight_hub`
3. Copy the connection string from Neon — it will look like:
   ```
   postgresql://user:pass@host/neondb?sslmode=require&channel_binding=require
   ```
4. Convert it for asyncpg — **two changes required**:
   - Replace `postgresql://` with `postgresql+asyncpg://`
   - Replace `?sslmode=require` with `?ssl=require` (asyncpg uses `ssl=`, not `sslmode=`)
   - Drop `&channel_binding=require` — asyncpg doesn't support this param
   
   Final format:
   ```
   postgresql+asyncpg://user:pass@host/neondb?ssl=require
   ```

> **⚠️ Common mistake**: Pasting the Neon URL as-is with `sslmode=require` will cause a `TypeError: connect() got an unexpected keyword argument 'sslmode'` crash. Always use `ssl=require` with asyncpg.

**Note**: Render also offers a managed PostgreSQL add-on if you prefer keeping everything in one place (free tier available).

---

## Step 2: Deploy Backend (Render)

Render auto-detects the `Dockerfile` in the `backend/` directory and builds a Docker-based web service.

### Option A: Render Dashboard (Recommended)

1. Go to [render.com](https://render.com) and sign in (GitHub login recommended)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository (`frieght-document-intelligence-hub`)
4. Configure the service:
   - **Name**: `freight-hub-backend` (or any name)
   - **Region**: Choose closest to your users (e.g., Oregon US West)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: **Docker** ← Render will auto-detect the Dockerfile
   - **Instance Type**: Free (or Starter for always-on)
5. Scroll to **Environment Variables** and add:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql+asyncpg://user:pass@host/freight_hub?sslmode=require` |
   | `ANTHROPIC_API_KEY` | `sk-ant-...` |
   | `CLAUDE_MODEL` | `claude-sonnet-4-5-20250929` |
   | `CORS_ORIGINS` | `["https://your-app.vercel.app"]` |
   | `DEFAULT_ORG_ID` | `00000000-0000-0000-0000-000000000001` |
   | `UPLOAD_DIR` | `uploads` |
   | `MAX_FILE_SIZE` | `20971520` |
   | `APP_NAME` | `Freight Document Intelligence Hub` |

6. Click **Create Web Service** — Render will build and deploy automatically.
7. Your backend URL will be: `https://freight-hub-backend.onrender.com`

> **Free tier note**: Free Render services spin down after 15 minutes of inactivity and take ~30s to cold-start. Use the Starter plan ($7/mo) for always-on behaviour.

---

### Option B: Render CLI (render-cli)

```bash
# Install the Render CLI
npm install -g @render-com/cli
# or via homebrew:
brew install render

# Authenticate
render login

# From the project root, deploy using render.yaml (see below)
render deploy
```

To use the CLI, create a `render.yaml` file in the **project root**:

```yaml
# render.yaml
services:
  - type: web
    name: freight-hub-backend
    runtime: docker
    rootDir: backend
    dockerfilePath: ./Dockerfile
    envVars:
      - key: DATABASE_URL
        sync: false          # Set manually in Render dashboard
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: CLAUDE_MODEL
        value: claude-sonnet-4-5-20250929
      - key: CORS_ORIGINS
        value: '["https://your-app.vercel.app"]'
      - key: DEFAULT_ORG_ID
        value: "00000000-0000-0000-0000-000000000001"
      - key: UPLOAD_DIR
        value: uploads
      - key: MAX_FILE_SIZE
        value: "20971520"
      - key: APP_NAME
        value: "Freight Document Intelligence Hub"
    healthCheckPath: /api/v1/health
```

---

### Run Migrations on Render

After the service is deployed, open the **Shell** tab in the Render dashboard for your web service and run:

```bash
# Run Alembic migrations
alembic upgrade head

# Seed the demo organization
python -c "
import asyncio
from app.db.session import async_session
from app.models.organization import Organization
import uuid

async def seed():
    async with async_session() as session:
        org = Organization(
            id=uuid.UUID('00000000-0000-0000-0000-000000000001'),
            name='Demo Organization',
            slug='demo'
        )
        session.add(org)
        await session.commit()
        print('Done')

asyncio.run(seed())
"
```

> **Alternative**: You can also add a startup command in Render → Settings → **Pre-Deploy Command**:
> ```
> alembic upgrade head
> ```
> This runs migrations automatically before every deploy.

---

### Verify Backend

```bash
curl https://freight-hub-backend.onrender.com/api/v1/health
# Should return: {"status": "healthy", ...}
```

---

## Step 3: Deploy Frontend (Netlify)

Next.js on Netlify requires the `@netlify/plugin-nextjs` adapter, which handles SSR, API routes, and image optimization automatically.

### netlify.toml (add to `frontend/` directory)

Create `frontend/netlify.toml` with the following content:

```toml
[build]
  base    = "frontend"
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
```

Install the Netlify Next.js plugin as a dev dependency:

```bash
cd frontend
npm install -D @netlify/plugin-nextjs
```

---

### Option A: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Authenticate
ntl login

# Link to a new or existing Netlify site (run from repo root)
ntl init

# Set environment variables
ntl env:set NEXT_PUBLIC_API_URL "https://freight-hub-backend.onrender.com/api/v1"
ntl env:set NEXT_PUBLIC_ORG_ID  "00000000-0000-0000-0000-000000000001"

# Deploy to production
ntl deploy --prod
```

### Option B: Netlify Dashboard

1. Go to [netlify.com](https://netlify.com) and sign in (GitHub login recommended)
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository (`frieght-document-intelligence-hub`)
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`
5. Expand **Environment variables** and add:
   - `NEXT_PUBLIC_API_URL` = `https://freight-hub-backend.onrender.com/api/v1`
   - `NEXT_PUBLIC_ORG_ID` = `00000000-0000-0000-0000-000000000001`
6. Click **Deploy site**
7. Your frontend URL will be: `https://your-site.netlify.app`

### Verify Frontend

Visit `https://your-site.netlify.app` — you should see the dashboard.

---

## Step 4: Update CORS

After deploying the frontend, update the backend's CORS setting in the Render dashboard:

1. Go to your Render web service → **Environment**
2. Update `CORS_ORIGINS`:
   ```
   ["https://your-site.netlify.app"]
   ```
3. Click **Save Changes** — Render will auto-redeploy with the updated CORS configuration.

---

## Environment Variables Reference

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (asyncpg) |
| `ANTHROPIC_API_KEY` | Yes | — | Claude API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-5-20250929` | Claude model to use |
| `CORS_ORIGINS` | No | `["http://localhost:3000"]` | Allowed CORS origins (JSON array) |
| `DEFAULT_ORG_ID` | No | `00000000-...0001` | Default organization UUID |
| `UPLOAD_DIR` | No | `uploads` | File upload directory |
| `MAX_FILE_SIZE` | No | `20971520` (20MB) | Max upload size in bytes |
| `APP_NAME` | No | `Freight DIH` | Application name |
| `DEBUG` | No | `false` | Debug mode |

### Frontend (.env.local)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:8000/api/v1` | Backend API base URL |
| `NEXT_PUBLIC_ORG_ID` | No | `00000000-...0001` | Organization ID for API requests |

---

## Production Checklist

- [ ] PostgreSQL deployed with SSL enabled
- [ ] Database migrations run (`alembic upgrade head`)
- [ ] Demo organization seeded
- [ ] Backend deployed on Render with all env vars set
- [ ] Health check passing (`/api/v1/health`)
- [ ] Frontend deployed on Netlify with correct `NEXT_PUBLIC_API_URL`
- [ ] CORS updated to allow Netlify frontend domain
- [ ] Upload a test document end-to-end
- [ ] Verify extraction pipeline works
- [ ] Verify dashboard loads documents
- [ ] Verify analytics endpoints return data

---

## Troubleshooting

### Backend won't start
- Check `DATABASE_URL` format — must use `postgresql+asyncpg://`
- Ensure poppler-utils is installed (Dockerfile handles this via `apt-get`)
- Check Render build logs under **Logs** tab for dependency issues
- Free tier services sleep — wait ~30s for cold start or upgrade to Starter

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_URL` doesn't have a trailing slash
- Check `CORS_ORIGINS` includes the exact Netlify URL (with `https://`)
- Check Render logs for CORS errors
- Ensure the Render service is awake (ping the health endpoint first)
- Confirm `@netlify/plugin-nextjs` is installed and `netlify.toml` is committed

### Extraction fails
- Verify `ANTHROPIC_API_KEY` is valid and has credits
- Check that `poppler-utils` is installed (needed for PDF → image)
- Check Claude API rate limits

### Database connection errors
- Ensure SSL mode is set for cloud databases (`?sslmode=require`)
- Check connection pooling limits (Neon free tier: 5 connections)
- Confirm `postgresql+asyncpg://` prefix (not plain `postgresql://`)

---

## Scaling Considerations (100x)

If this application needed to handle 100x the current load:

1. **Database**: Add read replicas, partition by date range, add connection pooling (PgBouncer)
2. **File storage**: Move from local filesystem to S3/R2 (abstraction already in place)
3. **Extraction**: Add a task queue (Celery/Redis) for async extraction, not blocking the API response
4. **Frontend**: Already serverless on Netlify — scales automatically via CDN edge nodes
5. **Backend**: Scale up Render instance type or add horizontal replicas behind a load balancer
6. **Caching**: Add Redis for frequently accessed documents and analytics queries
