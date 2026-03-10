# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Freight Document Intelligence Hub — an AI-powered platform that extracts structured data from freight documents (commercial invoices, packing lists, bills of lading) using Claude's vision API, stores results in a relational database, and provides a dashboard for review, correction, and analytics.

**Monorepo** with two independent projects: `backend/` (FastAPI/Python) and `frontend/` (Next.js/TypeScript).

## Commands

### Backend (run from `backend/`)
```bash
# Start dev server
source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Database migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1

# Tests
pytest                          # all tests
pytest tests/test_file.py       # single file
pytest tests/test_file.py::test_func -v  # single test

# Install dependencies
pip install -r requirements.txt
```

### Frontend (run from `frontend/`)
```bash
npm run dev       # dev server on localhost:3000
npm run build     # production build (also validates TypeScript)
npm run lint      # ESLint
```

### Database
```bash
# PostgreSQL must be running (brew services start postgresql@16)
# Database: freight_hub
# Connection: postgresql+asyncpg://shivansh@localhost:5432/freight_hub
psql -d freight_hub  # direct access
```

## Architecture

### Backend Layered Architecture
```
API Routes (app/api/v1/*.py)
    → Pydantic Schemas (app/schemas/*.py)
    → Services (app/services/*.py)         # business logic
    → Models (app/models/*.py)             # SQLAlchemy ORM
    → Database (app/db/session.py)         # async sessions
```

**Dependency injection**: `DbDep` (AsyncSession) and `OrgIdDep` (org ID from X-Org-Id header) are typed annotations used directly in route signatures. All queries are scoped by `org_id` for multi-tenancy.

**API routers** registered in `app/api/v1/router.py` under prefix `/api/v1`:
- `/documents` — CRUD, upload, reextract, check-duplicate
- `/analytics` — accuracy, corrections, field-breakdown
- `/comparison` — side-by-side document comparison
- `/extraction`, `/corrections`, `/health`

**Extraction pipeline** (`app/services/extraction_service.py`):
1. Validate file (empty, corrupt, password-protected PDF detection) in `app/core/pdf_processor.py`
2. PDF → images via `pdf2image` (300 DPI, max 2048px) with EXIF auto-orient, contrast enhancement (1.2x), sharpening (1.5x), RGB normalization
3. Images → Claude vision API with domain-specific prompt (document-type guidance, label aliasing, table extraction rules) + page numbering ("Page 1 of N:")
4. Claude client (`app/core/claude_client.py`) with quality-aware retry (retries with enhanced prompt if <5 fields extracted), exponential backoff, max_tokens=16384
5. Results stored across three tables: `ExtractedData` (header fields), `LineItem` (line items), `ExtractionField` (per-field confidence scores)

**Document status workflow**: `uploaded → processing → extracted → reviewed → approved`

### Frontend Architecture
```
app/                    # Next.js App Router pages
  page.tsx              # Dashboard (document list + stats)
  upload/page.tsx       # Upload with drag-and-drop + supported doc types
  documents/[id]/page.tsx  # Document detail (extraction form, line items, corrections)
  analytics/page.tsx    # Recharts-based analytics
  compare/page.tsx      # Side-by-side document comparison
components/
  layout/               # AppShell, Sidebar, Header, BackgroundPattern, PageTransition
  documents/            # DocumentTable, StatusBadge, columns
  extraction/           # ExtractionForm, FieldInput, ConfidenceBadge, LineItemsTable (editable)
  corrections/          # CorrectionTimeline
  upload/               # Dropzone
  ui/                   # shadcn/ui primitives (24+ components incl. ConfirmDialog)
  ai-copilot/           # CopilotWidget (floating AI chat)
  onboarding/           # WelcomeDialog, AppTour
hooks/                  # use-documents, use-upload, use-user-profile (React Query wrappers)
lib/
  api.ts                # fetchApi helper with X-Org-Id header, all endpoint definitions
  types.ts              # TypeScript interfaces matching backend response shapes
  user-store.ts         # localStorage user profile with DiceBear avatar styles
  copilot-context.ts    # data-copilot-context helper for AI widget
```

**Data fetching**: React Query (`@tanstack/react-query`) for all server state. API client in `lib/api.ts` sends `X-Org-Id` header on every request. Frontend path alias: `@/*` maps to `src/*`.

### Database Schema (6 tables)
- `organizations` — multi-tenant root
- `documents` — file metadata, status workflow, soft delete
- `extracted_data` — 30+ extracted fields (1:1 with document), ARRAY columns for reference/container numbers, JSONB for raw AI response
- `line_items` — commodity line items with weights, prices, HS codes
- `extraction_fields` — per-field confidence scores (unique constraint on extracted_data_id + field_name)
- `field_corrections` — immutable audit trail of human corrections

All tables have `org_id` foreign key. `TimestampMixin` in `app/models/base.py` adds `created_at`/`updated_at` with `server_default=func.now()`.

## Key Conventions

- Backend uses async throughout (asyncpg, async SQLAlchemy sessions, async route handlers)
- Corrections are immutable inserts into `field_corrections`, not updates to existing records
- The extraction prompt in `app/core/prompts.py` defines the exact JSON schema Claude must return — changes to extracted fields must update both the prompt and the `ExtractedData` model
- Frontend types in `lib/types.ts` must match backend Pydantic schemas in `app/schemas/` — keep these in sync
- Backend `.env` contains `ANTHROPIC_API_KEY` and `DATABASE_URL` (never commit)
- Poppler (`poppler-utils`) must be installed for PDF processing (`brew install poppler` on macOS)

## UI/UX Patterns

### Layout
- **Header**: Slim top bar with page title only (no description duplication). Theme toggle on right. Gradient accent line at bottom.
- **Sidebar**: Dark navy sidebar with nav items, Resources section (Settings/Docs — "coming soon"), user profile footer with DiceBear avatar + Admin badge. Collapsible with animation.
- **Page descriptions**: Each page renders its own description below the header via `PageDescription` component (animated fade-up). No duplication with header.
- **Background**: Subtle dot grid + animated floating gradient orbs (via `BackgroundPattern` component in AppShell).

### Animations (framer-motion)
- `PageTransition` — wraps every page with fade-up entrance
- `StaggerContainer` / `StaggerItem` — used for stat cards and grid layouts
- `PageDescription` — animated subtitle with delay
- Sidebar collapse/expand animated via `motion.aside`
- CSS animations: `animate-float-slow`, `animate-float-slow-reverse` for background orbs

### Component Patterns
- shadcn/ui uses `@base-ui/react` (NOT radix-ui) — use `render` prop instead of `asChild`
- `ConfirmDialog` component for destructive actions (approve, re-extract)
- DiceBear avatars (`notionists`, `adventurer`, `avataaars` styles) via `lib/user-store.ts`
- User profile stored in localStorage with avatar style selection
- Status badges include semantic icons (Upload, Loader2, FileSearch, ClipboardCheck, ShieldCheck)
- Document table rows are clickable (navigate to detail)
- Image document previews display full-width with `object-contain` and `maxHeight: 80vh`

### Git
- Single monorepo git at project root (not separate repos per project)
