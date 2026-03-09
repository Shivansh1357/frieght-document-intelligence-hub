# ADR-005: Deployment & System Architecture

## Status: Accepted
## Date: 2026-03-08

## Context
Need a deployment strategy that:
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
│                      VERCEL (Frontend)                           │
│                                                                  │
│  Next.js 14 App Router                                          │
│  ├── API Routes (BFF pattern for proxying)                      │
│  ├── Server Components (SSR)                                    │
│  └── Static assets (CSS, JS, fonts)                             │
└──────────────────────────┬───────────────────────────────────────┘
                           │ HTTPS (API calls)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   RAILWAY (Backend)                               │
│                                                                  │
│  FastAPI Application                                             │
│  ├── /api/v1/documents    (CRUD + upload)                       │
│  ├── /api/v1/extraction   (Claude API integration)              │
│  ├── /api/v1/analytics    (Accuracy metrics)                    │
│  ├── /api/v1/comparison   (Document comparison)                 │
│  └── /docs                (Swagger auto-docs)                   │
│                                                                  │
│  Dependencies:                                                   │
│  ├── anthropic SDK        (Claude API)                          │
│  ├── pdf2image + Pillow   (PDF → Image conversion)              │
│  ├── SQLAlchemy + asyncpg (Database ORM)                        │
│  ├── alembic              (Migrations)                          │
│  └── boto3 / local storage (File storage)                       │
└───────────────┬────────────────────┬─────────────────────────────┘
                │                    │
                ▼                    ▼
┌──────────────────────┐  ┌────────────────────────┐
│  NEON PostgreSQL     │  │  Cloudflare R2 / Local │
│  (Free Tier)         │  │  File Storage          │
│                      │  │                        │
│  - Connection pooling│  │  - PDF originals       │
│  - Auto-suspend      │  │  - Converted images    │
│  - Branch support    │  │  - S3-compatible API   │
└──────────────────────┘  └────────────────────────┘
```

### Deployment Targets

| Component | Platform | Why |
|-----------|----------|-----|
| Frontend | Vercel | Native Next.js support, zero-config, free tier |
| Backend | Railway | Great Python support, free tier, easy PostgreSQL addon |
| Database | Neon PostgreSQL (or Railway PostgreSQL) | Serverless PG, free tier, connection pooling |
| File Storage | Local filesystem (Railway) + R2 if needed | Simplicity for demo; R2 for production path |

### API Design (RESTful)

```
POST   /api/v1/documents/upload          Upload + trigger extraction
GET    /api/v1/documents                  List with search/filter/pagination
GET    /api/v1/documents/:id              Get document detail
PATCH  /api/v1/documents/:id              Update extracted fields (corrections)
DELETE /api/v1/documents/:id              Soft delete
GET    /api/v1/documents/:id/corrections  Get correction history
POST   /api/v1/documents/:id/reextract   Re-trigger extraction
GET    /api/v1/documents/:id/compare/:id2 Compare two documents
GET    /api/v1/analytics/accuracy         Extraction accuracy metrics
GET    /api/v1/analytics/corrections      Correction trends
POST   /api/v1/documents/check-duplicate  Check for duplicate before upload
GET    /api/v1/health                     Health check
```

### Environment Variables

```
# Backend
ANTHROPIC_API_KEY=...
DATABASE_URL=postgresql+asyncpg://...
STORAGE_PATH=/uploads
CORS_ORIGINS=https://your-app.vercel.app
DEFAULT_ORG_ID=...           # Demo org

# Frontend
NEXT_PUBLIC_API_URL=https://your-api.railway.app
```

## Consequences
- Two separate deployments to manage
- CORS configuration between Vercel and Railway
- Free tier limitations (Railway: 500 hours/month, Neon: 0.5GB storage)
- Need health checks and error monitoring
- File upload goes through backend (not direct to storage)
