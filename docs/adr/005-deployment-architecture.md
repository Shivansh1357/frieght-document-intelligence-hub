# ADR-005: Deployment & System Architecture

## Status: Accepted
## Date: 2026-03-08

## Context
We need a deployment strategy that:
1. Works within free tiers for the demo
2. Demonstrates production-ready thinking
3. Separates frontend and backend cleanly
4. Handles file storage

## Decision

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                                                                 │
│  Next.js App (SSR + Client Components)                         │
│  ├── Dashboard (Server Component → API fetch)                  │
│  ├── Upload (Client Component → FormData POST)                 │
│  ├── Document Detail (Server Component + Client Islands)       │
│  └── Analytics (Client Component → Chart rendering)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                      NETLIFY (Frontend)                          │
│                                                                  │
│  Next.js 16 App Router + @netlify/plugin-nextjs                  │
│  ├── Server Components (SSR via Netlify Functions)               │
│  ├── Static assets (CSS, JS, fonts via CDN)                      │
│  └── netlify.toml configuration                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS (API calls)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    RENDER (Backend)                               │
│                                                                  │
│  FastAPI Application (Docker)                                    │
│  ├── /api/v1/documents    (CRUD + upload + reextract)           │
│  ├── /api/v1/extraction   (Claude API integration)              │
│  ├── /api/v1/corrections  (Immutable audit trail)               │
│  ├── /api/v1/analytics    (Accuracy + field breakdown)          │
│  ├── /api/v1/comparison   (Document comparison)                 │
│  ├── /api/v1/export       (CSV export)                          │
│  ├── /api/v1/copilot      (AI chat + DB queries)                │
│  └── /docs                (Swagger auto-docs)                   │
│                                                                  │
│  Dependencies:                                                   │
│  ├── anthropic SDK        (Claude API)                          │
│  ├── pdf2image + Pillow   (PDF → Image conversion)              │
│  ├── SQLAlchemy + asyncpg (Database ORM)                        │
│  ├── alembic              (Migrations)                          │
│  └── local filesystem     (File storage)                        │
└───────────────┬────────────────────┬─────────────────────────────┘
                │                    │
                ▼                    ▼
┌──────────────────────┐  ┌────────────────────────┐
│  NEON PostgreSQL     │  │  Anthropic API         │
│  (Serverless)        │  │  Claude Sonnet 4.5     │
│                      │  │  (Vision)              │
│  - Connection pooling│  │                        │
│  - Auto-suspend      │  │                        │
│  - SSL by default    │  │                        │
└──────────────────────┘  └────────────────────────┘
```

### Deployment Targets

| Component | Platform | Why |
|-----------|----------|-----|
| Frontend | Netlify | Next.js support via `@netlify/plugin-nextjs`, CDN edge, free tier, easy env vars |
| Backend | Render | Docker support, auto-deploy from GitHub, free tier, shell access for migrations |
| Database | Neon PostgreSQL | Serverless PG, free tier (0.5GB), connection pooling, SSL by default, branching |
| File Storage | Local filesystem (Render) | Simplicity for demo; can migrate to S3/R2 for production |

### Why Netlify over Vercel

- Netlify's free tier has generous build minutes (300/month) and bandwidth (100GB/month)
- `@netlify/plugin-nextjs` handles SSR, API routes, and image optimization automatically
- Simpler monorepo configuration — `netlify.toml` in the frontend directory with `base = "frontend"`
- No vendor lock-in to Vercel-specific features

### Why Render over Railway

- Render has native Docker support — auto-detects the `Dockerfile` in `backend/`
- Built-in shell access for running migrations and seeding data
- Pre-deploy commands for automatic migrations on every deploy
- Transparent pricing with a generous free tier (750 hours/month)
- Health check endpoint configuration

### Why Neon over Render PostgreSQL

- Serverless architecture — scales to zero when idle, no cost when unused
- Built-in connection pooling (critical for serverless/free-tier backends)
- SSL enabled by default (no extra configuration)
- Database branching for safe schema testing
- Compatible with standard PostgreSQL tooling (psql, pg_dump)

### API Design (RESTful)

```
# Documents
POST   /api/v1/documents/upload              Upload + trigger extraction
GET    /api/v1/documents                      List with search/filter/pagination
GET    /api/v1/documents/:id                  Get document detail
PATCH  /api/v1/documents/:id                  Update document (status, fields)
DELETE /api/v1/documents/:id                  Soft delete
POST   /api/v1/documents/:id/reextract       Re-trigger extraction
POST   /api/v1/documents/check-duplicate      Check for duplicate before upload
GET    /api/v1/documents/:id/corrections      Get correction history
POST   /api/v1/documents/:id/corrections      Create correction record

# Extraction
GET    /api/v1/extraction/:document_id        Get extraction result

# Corrections
POST   /api/v1/corrections/:document_id       Create correction (immutable insert)
GET    /api/v1/corrections/:document_id       List corrections for document

# Analytics
GET    /api/v1/analytics/accuracy             Extraction accuracy metrics
GET    /api/v1/analytics/corrections          Correction statistics
GET    /api/v1/analytics/field-breakdown      Per-field accuracy rates

# Comparison
GET    /api/v1/comparison/compare/:id1/:id2   Side-by-side field comparison

# Export
GET    /api/v1/export/documents/csv           Bulk CSV export (all docs + line items)
GET    /api/v1/export/documents/:id/csv       Single document CSV export

# AI Copilot
POST   /api/v1/copilot/chat                   Chat with optional DB query execution
POST   /api/v1/copilot/chat/stream            Streaming chat via SSE

# Health
GET    /api/v1/health                         Health check
```

### Frontend Configuration (Netlify)

`frontend/netlify.toml`:
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

The `@netlify/plugin-nextjs` adapter will be installed as a dev dependency to handle SSR routing, image optimization, and serverless function generation.

### Backend Configuration (Render)

Render will auto-detect the `Dockerfile` in `backend/` and build a Docker-based web service. The Dockerfile installs `poppler-utils` (required for PDF → image conversion) and runs uvicorn on port 8000.

Alembic migrations will run automatically on startup via a subprocess call in `app/main.py`, and the demo organization will be auto-seeded on first boot.

### Environment Variables

```
# Backend (Render dashboard)
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql+asyncpg://user:pass@host/neondb?ssl=require
CLAUDE_MODEL=claude-sonnet-4-5-20250929
UPLOAD_DIR=uploads
MAX_FILE_SIZE=20971520
CORS_ORIGINS=["https://your-site.netlify.app"]
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000001
APP_NAME=Freight Document Intelligence Hub

# Frontend (Netlify dashboard)
NEXT_PUBLIC_API_URL=https://freight-hub-backend.onrender.com/api/v1
NEXT_PUBLIC_ORG_ID=00000000-0000-0000-0000-000000000001
```

> **Important**: Neon connection strings use `sslmode=require`, but asyncpg requires `ssl=require`. Always convert before setting `DATABASE_URL`.

## Consequences
- Two separate deployments to manage (Netlify + Render), connected via CORS
- CORS configuration must match the exact Netlify frontend URL (including `https://`)
- Free tier limitations: Render spins down after 15 min of inactivity (~30s cold start), Neon auto-suspends after 5 min idle
- File uploads are stored on Render's local filesystem (ephemeral on free tier — acceptable for demo, will use S3/R2 for production)
- Netlify CDN edge caching will improve frontend load times globally
- Health check endpoint (`/api/v1/health`) will be configured in Render to monitor backend availability
