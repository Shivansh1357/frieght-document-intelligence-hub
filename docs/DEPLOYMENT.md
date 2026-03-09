# Deployment Guide

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Vercel      │────►│   Railway     │────►│  Neon / RDS   │
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
3. Copy the connection string (format: `postgresql://user:pass@host/freight_hub?sslmode=require`)
4. Convert for asyncpg: replace `postgresql://` with `postgresql+asyncpg://`

**Note**: Railway also offers a PostgreSQL add-on if you prefer keeping everything in one place.

---

## Step 2: Deploy Backend (Railway)

### Option A: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Set environment variables
railway variables set DATABASE_URL="postgresql+asyncpg://user:pass@host/freight_hub?sslmode=require"
railway variables set ANTHROPIC_API_KEY="sk-ant-..."
railway variables set CLAUDE_MODEL="claude-sonnet-4-5-20250929"
railway variables set CORS_ORIGINS='["https://your-app.vercel.app"]'
railway variables set DEFAULT_ORG_ID="00000000-0000-0000-0000-000000000001"
railway variables set UPLOAD_DIR="uploads"
railway variables set MAX_FILE_SIZE="20971520"
railway variables set APP_NAME="Freight Document Intelligence Hub"

# Deploy
railway up
```

### Option B: Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub Repo
3. Set root directory to `backend`
4. Railway auto-detects the Dockerfile
5. Add environment variables in the Variables tab
6. Deploy triggers automatically

### Run Migrations on Railway

```bash
# Connect to Railway shell
railway run alembic upgrade head

# Seed demo organization
railway run python -c "
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

### Verify Backend

```bash
curl https://your-backend.railway.app/api/v1/health
# Should return: {"status": "healthy", ...}
```

---

## Step 3: Deploy Frontend (Vercel)

### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL    # Value: https://your-backend.railway.app/api/v1
vercel env add NEXT_PUBLIC_ORG_ID    # Value: 00000000-0000-0000-0000-000000000001

# Redeploy with env vars
vercel --prod
```

### Option B: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import Git Repository
3. Set root directory to `frontend`
4. Framework Preset: Next.js
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.railway.app/api/v1`
   - `NEXT_PUBLIC_ORG_ID` = `00000000-0000-0000-0000-000000000001`
6. Deploy

### Verify Frontend

Visit `https://your-app.vercel.app` — you should see the dashboard.

---

## Step 4: Update CORS

After deploying the frontend, update the backend's CORS setting:

```bash
railway variables set CORS_ORIGINS='["https://your-app.vercel.app"]'
```

Railway will auto-redeploy with the updated CORS configuration.

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
- [ ] Backend deployed with all env vars set
- [ ] Health check passing (`/api/v1/health`)
- [ ] Frontend deployed with correct `NEXT_PUBLIC_API_URL`
- [ ] CORS updated to allow frontend domain
- [ ] Upload a test document end-to-end
- [ ] Verify extraction pipeline works
- [ ] Verify dashboard loads documents
- [ ] Verify analytics endpoints return data

---

## Troubleshooting

### Backend won't start
- Check `DATABASE_URL` format — must use `postgresql+asyncpg://`
- Ensure poppler-utils is installed (Dockerfile handles this)
- Check Railway build logs for dependency issues

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_URL` doesn't have a trailing slash
- Check CORS_ORIGINS includes the exact frontend URL (with https)
- Check Railway logs for CORS errors

### Extraction fails
- Verify `ANTHROPIC_API_KEY` is valid and has credits
- Check that `poppler-utils` is installed (needed for PDF → image)
- Check Claude API rate limits

### Database connection errors
- Ensure SSL mode is set for cloud databases (`?sslmode=require`)
- Check connection pooling limits (Neon free tier: 5 connections)

---

## Scaling Considerations (100x)

If this application needed to handle 100x the current load:

1. **Database**: Add read replicas, partition by date range, add connection pooling (PgBouncer)
2. **File storage**: Move from local filesystem to S3/R2 (abstraction already in place)
3. **Extraction**: Add a task queue (Celery/Redis) for async extraction, not blocking the API response
4. **Frontend**: Already serverless on Vercel — scales automatically
5. **Backend**: Horizontal scaling on Railway with multiple replicas behind a load balancer
6. **Caching**: Add Redis for frequently accessed documents and analytics queries
