# Run Book

Complete guide to setting up, running, and operating the Freight Document Intelligence Hub.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.13+ | `brew install python@3.13` |
| Node.js | 20+ | `brew install node` |
| PostgreSQL | 16+ | `brew install postgresql@16` |
| Poppler | latest | `brew install poppler` (required for PDF→image conversion) |

## Initial Setup (First Time)

### 1. PostgreSQL

```bash
# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb freight_hub

# Verify connection
psql -d freight_hub -c "SELECT 1"
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python3.13 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set your ANTHROPIC_API_KEY and DATABASE_URL
```

**Required `.env` variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL async connection string | `postgresql+asyncpg://user@localhost:5432/freight_hub` |
| `ANTHROPIC_API_KEY` | Claude API key with credits | `sk-ant-api03-...` |
| `UPLOAD_DIR` | Directory for uploaded files | `uploads` |
| `CORS_ORIGINS` | Allowed frontend origins (JSON array) | `["http://localhost:3000"]` |
| `DEFAULT_ORG_ID` | Default tenant UUID for demo | `00000000-0000-0000-0000-000000000001` |
| `DEBUG` | Enable SQLAlchemy echo logging | `true` / `false` |

### 3. Database Migrations

```bash
cd backend
source venv/bin/activate

# Run all migrations
alembic upgrade head

# Seed demo organization
psql -d freight_hub -c "
INSERT INTO organizations (id, name, slug, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Organization',
  'demo',
  NOW(), NOW()
) ON CONFLICT DO NOTHING;
"
```

### 4. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional — defaults work for local dev)
cp .env.local.example .env.local
```

**Optional `.env.local` variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Backend API base URL |
| `NEXT_PUBLIC_ORG_ID` | `00000000-0000-0000-0000-000000000001` | Org ID sent in headers |

---

## Running Locally

### Start Backend (Terminal 1)

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API is now available at:
- Root: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs
- Health check: http://localhost:8000/api/v1/health/

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

The app is now available at http://localhost:3000.

---

## Seed Demo Data

To populate the database with realistic extracted data from the 3 sample PDFs (useful when the API key has no credits or for offline demo):

```bash
cd backend
psql -d freight_hub -f seed_demo_data.sql
```

This inserts:
- 3 documents with status `extracted` / `reviewed`
- Extracted header data for all 3 documents (from actual PDF content)
- 20 line items across all documents
- 54 per-field confidence scores
- 3 sample corrections with audit trail

---

## Common Operations

### Upload a Document (CLI)

```bash
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -H "X-Org-Id: 00000000-0000-0000-0000-000000000001" \
  -F "file=@/path/to/document.pdf"
```

### Re-extract a Document

```bash
curl -X POST http://localhost:8000/api/v1/documents/{doc_id}/reextract \
  -H "X-Org-Id: 00000000-0000-0000-0000-000000000001"
```

### List Documents

```bash
curl "http://localhost:8000/api/v1/documents/?page=1&page_size=20" \
  -H "X-Org-Id: 00000000-0000-0000-0000-000000000001"
```

### Check Analytics

```bash
curl http://localhost:8000/api/v1/analytics/accuracy \
  -H "X-Org-Id: 00000000-0000-0000-0000-000000000001"
```

### Compare Two Documents

```bash
curl http://localhost:8000/api/v1/comparison/compare/{doc1_id}/{doc2_id} \
  -H "X-Org-Id: 00000000-0000-0000-0000-000000000001"
```

### Create a New Migration

```bash
cd backend && source venv/bin/activate
alembic revision --autogenerate -m "add new column"
alembic upgrade head
```

### Rollback Last Migration

```bash
cd backend && source venv/bin/activate
alembic downgrade -1
```

---

## Production Build

### Frontend

```bash
cd frontend
npm run build    # generates optimized build, validates TypeScript
npm start        # serve production build on port 3000
```

### Backend (Docker)

```bash
cd backend
docker build -t freight-hub-api .
docker run -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://..." \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e CORS_ORIGINS='["https://your-frontend.vercel.app"]' \
  freight-hub-api
```

---

## Deployment

### Backend on Railway

1. Connect the GitHub repo, set root directory to `backend/`
2. Railway auto-detects the Dockerfile
3. Set environment variables: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CORS_ORIGINS`, `DEFAULT_ORG_ID`
4. Railway provides a public URL — use this as `NEXT_PUBLIC_API_URL` in the frontend

### Frontend on Vercel

1. Connect the GitHub repo, set root directory to `frontend/`
2. Framework preset: Next.js (auto-detected)
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api/v1`
4. Deploy

### Database on Neon

1. Create a Neon project and database
2. Use the connection string (swap `postgresql://` for `postgresql+asyncpg://`) as `DATABASE_URL`
3. Run migrations: `alembic upgrade head` (from backend with the production DATABASE_URL)

---

## Troubleshooting

### PostgreSQL not running
```bash
brew services start postgresql@16
pg_isready  # should print "accepting connections"
```

### Port 8000 already in use
```bash
lsof -ti:8000 | xargs kill -9
```

### Port 3000 already in use
```bash
lsof -ti:3000 | xargs kill -9
```

### Alembic "target database is not up to date"
```bash
cd backend && source venv/bin/activate
alembic upgrade head
```

### Claude API returns 401 (authentication_error)
The API key is invalid. Check `backend/.env` and ensure `ANTHROPIC_API_KEY` starts with `sk-ant-`.

### Claude API returns 400 (insufficient credits)
The API key is valid but the account needs credits. Add credits at https://console.anthropic.com/settings/billing or use seed data for demo.

### PDF extraction fails with "poppler not found"
```bash
brew install poppler
which pdftoppm  # should return a path
```

### Frontend TypeScript errors
```bash
cd frontend && npm run build  # shows all TS errors
```

### "null value in column created_at" on raw SQL inserts
The `created_at`/`updated_at` columns have `server_default=func.now()` but raw SQL INSERT must still provide values or rely on the default. Use `NOW()` explicitly in raw SQL.

### Migrations out of sync after model changes
```bash
cd backend && source venv/bin/activate
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health/` | Health check |
| `POST` | `/api/v1/documents/upload` | Upload document + trigger extraction |
| `GET` | `/api/v1/documents/` | List documents (paginated, filterable, searchable) |
| `GET` | `/api/v1/documents/{id}` | Document detail with extracted data + corrections |
| `PATCH` | `/api/v1/documents/{id}` | Update status or apply field corrections |
| `DELETE` | `/api/v1/documents/{id}` | Soft-delete document |
| `GET` | `/api/v1/documents/{id}/file` | Serve original uploaded file |
| `GET` | `/api/v1/documents/{id}/corrections` | Correction history for document |
| `POST` | `/api/v1/documents/{id}/reextract` | Re-run AI extraction |
| `POST` | `/api/v1/documents/check-duplicate` | Check for duplicate by hash/name/invoice |
| `GET` | `/api/v1/analytics/accuracy` | Accuracy metrics (confidence, correction rate) |
| `GET` | `/api/v1/analytics/corrections` | Correction statistics by field |
| `GET` | `/api/v1/analytics/field-breakdown` | Per-field accuracy and confidence |
| `GET` | `/api/v1/comparison/compare/{id1}/{id2}` | Field-by-field document comparison |

All endpoints require `X-Org-Id` header (defaults to demo org if omitted).

Query parameters for `GET /documents/`: `page`, `page_size`, `status`, `document_type`, `search`, `country_of_origin`, `date_from`, `date_to`.
