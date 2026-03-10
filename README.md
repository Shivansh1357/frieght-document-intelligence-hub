# Freight Document Intelligence Hub

An AI-powered platform that extracts structured data from freight documents (commercial invoices, packing lists, bills of lading) using Claude's vision API, stores results in a relational database, and provides a dashboard for review, correction, and analytics.

Built as a take-home project for **Aulintri** — Founding Full-Stack Engineer role.

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791) ![Claude API](https://img.shields.io/badge/Claude-Sonnet%204.5-blueviolet) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4)

---

## 🔗 Live Deployment

| Service | URL |
|---------|-----|
| **Frontend (Netlify)** | [https://freight-intelligence-hub-shiv.netlify.app](https://freight-intelligence-hub-shiv.netlify.app) |
| **Backend API (Render)** | [https://frieght-document-intelligence-hub.onrender.com](https://frieght-document-intelligence-hub.onrender.com) |
| **API Docs (Swagger)** | [https://frieght-document-intelligence-hub.onrender.com/docs](https://frieght-document-intelligence-hub.onrender.com/docs) |
| **GitHub Repository** | [https://github.com/Shivansh1357/frieght-document-intelligence-hub](https://github.com/Shivansh1357/frieght-document-intelligence-hub) |

> **Note**: The app includes sample freight documents you can upload to test the full extraction pipeline. Live AI extraction requires a funded Anthropic API key.

---

## Quick Overview

| What | Details |
|------|---------|
| **Upload** | Drag-and-drop **multi-file** queue (sequential processing), per-file progress/status, duplicate detection with "Upload anyway" |
| **AI Extraction** | Claude vision API extracts 30+ fields with per-field confidence scores |
| **Review** | Editable form with inline validation, confidence badges, **editable line items** (click-to-edit), corrections audit trail |
| **Dashboard** | Search/filter (type/status/country/date range), selectable rows, bulk CSV export |
| **Analytics** | Field accuracy charts, correction trends, confidence breakdown by field |
| **Comparison** | Side-by-side field comparison with mismatch highlighting, match %, and tooltips |
| **Audit Trail** | Immutable correction history — who changed what, when, original vs corrected |
| **AI Copilot** | Floating chat widget (Sofia) that reads live page context from DOM |

---

## Architecture

```
┌─────────────────────┐     REST API     ┌──────────────────────┐
│   Next.js 16        │ ◄──────────────► │   FastAPI (Python)   │
│   TypeScript        │                  │                      │
│   Tailwind v4       │                  │   Layered:           │
│   shadcn/ui         │                  │   Routes → Services  │
│   TanStack Table    │                  │   → Models → DB      │
│   Recharts          │                  │                      │
└─────────────────────┘                  └──────┬───────┬───────┘
                                                │       │
                                         ┌──────▼──┐ ┌──▼──────────┐
                                         │ Postgres │ │ Claude API  │
                                         │ (6 tbls) │ │ (Vision)    │
                                         └─────────┘ └─────────────┘
```

**Backend**: Clean layered architecture — API routes → Pydantic schemas → Service layer → SQLAlchemy models → PostgreSQL. Fully async with `asyncpg`.

**Frontend**: Next.js 16 App Router with React Query for server state. shadcn/ui components (base-ui). Maritime-themed dark/light mode.

**Database**: 6 normalized tables with `org_id` on every tenant-scoped table. Extracted fields stored relationally (not JSON blobs). Immutable correction audit trail.

**AI Pipeline**: PDF → images (300 DPI) → EXIF auto-orient → resize (max 2048px) → enhance (contrast + sharpening) → Claude vision API with domain-specific prompt + page numbering → quality-aware retry → structured JSON → relational storage with per-field confidence scores.

> Full architecture details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)  
> Architecture Decision Records: [ADR-001 Backend](docs/adr/001-backend-framework.md) · [ADR-002 Frontend](docs/adr/002-frontend-stack.md) · [ADR-003 Database](docs/adr/003-database-schema.md) · [ADR-004 Claude API](docs/adr/004-claude-api-integration.md) · [ADR-005 Deployment](docs/adr/005-deployment-architecture.md) · [ADR-006 Bonus Features](docs/adr/006-bonus-features.md)

---

## Deliverable Compliance (Project Brief)

### ✅ Deliverable 1 — Document Upload & AI Extraction
- Accepts PDF, PNG, JPEG (up to 20MB)
- Extracts all required fields: Shipper name/address, Consignee name/address, Commodity description, Quantities/units, Gross/net weight, Country of origin, Declared value/currency, Incoterms, Document date, Reference numbers
- Displays results in an **editable form** for human review and correction before saving
- Human-in-the-loop approval workflow: `uploaded → processing → extracted → reviewed → approved`
- Re-extraction endpoint if results are unsatisfactory

### ✅ Deliverable 2 — Database & Data Model
- `documents` table: original file reference (hash + path), upload timestamp, document type, status
- `extracted_data` table: 30+ structured columns (NOT a JSON blob) — shipper, consignee, vessel, ports, values, weights, incoterms, etc.
- `line_items` table: individual commodity lines (description, HS code, quantity, unit price, weights)
- `extraction_fields` table: per-field confidence scores from Claude
- `field_corrections` table: **immutable audit trail** — original AI value, corrected value, corrected_by, corrected_at, reason
- `organizations` table: multi-tenant isolation via `org_id` on all tables

### ✅ Deliverable 3 — Dashboard UI
- Searchable document list (search across shipper, consignee, invoice number, reference numbers)
- Filter by document type, status, date range, country of origin
- Click into any document for full detail view with extracted data + line items
- Clean layout with consistent spacing, responsive, production-quality feel
- Status badges, confidence column, date column with tooltips
- Loading skeletons, empty states, toast notifications

### ✅ Deliverable 4 — Product Instinct (7 Bonus Features)
See [Bonus Features](#bonus-features) section below.

---

## Bonus Features — Product Instinct

The brief asked for **at least one** bonus feature. I built **seven**, chosen because they **compound** in value rather than being independent additions.

### 1. 🎯 Field-Level Confidence Scoring
**Why**: Reviewing 30+ fields on every document is the bottleneck in freight operations. Without knowing which fields the AI is uncertain about, you must check everything manually.  
**What**: Each field gets a 0–100% confidence score (🟢 ≥90% reliable, 🟡 70–89% verify, 🔴 <70% requires correction). Low-confidence fields get amber borders so reviewers focus only on what matters — cutting per-document review time by ~60–80%.

### 2. 📊 Extraction Accuracy Analytics
**Why**: Without measurement you can't improve. Operations managers need to know which fields the AI consistently gets wrong so they can tune the extraction prompt over time.  
**What**: Analytics dashboard showing per-field accuracy bar charts, top corrected fields, average confidence by field, and a breakdown table — a systematic feedback loop for prompt engineering.

### 3. 📋 Document Comparison
**Why**: In international trade, commercial invoices and packing lists must agree before goods clear customs. Discrepancies cause costly delays and penalties — and they're easy to miss manually.  
**What**: Side-by-side comparison of any two documents across 27 fields, with match percentage, mismatch row highlighting, and field-level tooltips.

### 4. 🔍 Smart Duplicate Detection
**Why**: In any team environment the same PDF gets uploaded multiple times — by different team members, forwarded emails, or user error. Duplicates pollute the dataset.  
**What**: SHA-256 hash comparison on every upload. Detected duplicates show a warning with a link to the existing document and an "Upload anyway" escape hatch for legitimate re-submissions.

### 5. 🤖 Context-Aware AI Copilot (Sofia)
**Why**: New users need guidance without reading docs. Power users want answers from their data without building reports.  
**What**: Floating chat widget that reads the live page DOM — knows what documents are on screen, their statuses, and confidence scores. Answers "Which documents need review?" with real numbers. Falls back to Claude+SQL for database queries not visible in the DOM.

### 6. 📥 Bulk CSV Export
**Why**: Extracted data must flow into ERP, customs filing, and accounting systems. A data platform that can't export is a silo.  
**What**: Export buttons on dashboard (all documents or checkboxed rows) and document detail. CSV includes both header fields (shipper, values) and line items in flat parent-child format, ready for direct import.

### 7. 🧭 Onboarding System
**Why**: The `corrected_by` audit field is only useful if it captures a real name. A frictionless first-use step ensures every correction is attributable.  
**What**: Welcome dialog with name capture (piped into all correction records), 8-step guided tour, and persistent user profile with avatar.

**Why these seven together?** Confidence scoring tells clerks which fields to review → corrections create ground truth → analytics measures AI accuracy over time → comparison catches cross-document discrepancies → duplicate detection keeps the dataset clean → export pushes data downstream → copilot reduces onboarding time. Each feature makes the others more valuable.

---


## Edge Case Handling

| Edge Case | How It's Handled |
|-----------|-----------------|
| **Password-protected PDF** | Detected and rejected with user-friendly error message |
| **Corrupt/empty PDF** | Caught at pdf2image level, document stays in "uploaded" status for retry |
| **0-byte file** | Rejected before processing with clear error |
| **EXIF-rotated photos** | Auto-oriented via `ImageOps.exif_transpose()` — critical for phone camera scans |
| **RGBA/CMYK images** | Force RGB conversion before encoding |
| **Low-quality scans** | Image preprocessing (contrast 1.2× + sharpening 1.5×) improves readability |
| **Low extraction quality** | Quality-aware retry: if <5 fields extracted, retries with enhanced prompt |
| **Multi-page documents** | All pages sent with "Page N of M:" numbering for context |
| **Combined invoice+packing list** | Treated as single "combined" extraction across all pages |
| **Label variations** | Prompt aliasing: Shipper=Exporter=Seller, Consignee=Importer=Buyer, etc. |
| **Partial/missing data** | Stored as NULL with low confidence, UI highlights for human review |
| **Duplicate uploads** | SHA-256 hash check with "View existing" or "Upload anyway" options |
| **Anthropic API credit/502 errors** | Classified error surfaced as actionable toast with billing link |

---

## Setup Instructions

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 16 (via Homebrew: `brew install postgresql@16`)
- **Poppler** (for PDF processing: `brew install poppler`)
- **Anthropic API Key**

### 1. Clone & Setup Database

```bash
git clone https://github.com/Shivansh1357/frieght-document-intelligence-hub.git
cd frieght-document-intelligence-hub

# Start PostgreSQL
brew services start postgresql@16

# Create database
createdb freight_hub
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set your ANTHROPIC_API_KEY and DATABASE_URL

# Run database migrations (runs automatically on startup too)
alembic upgrade head

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

> **Note**: Migrations run automatically on application startup via the lifespan event. The default organization (`Maventi Group`) is also seeded automatically on first start.

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Default values point to localhost:8000 — no changes needed for local dev

# Start development server
npm run dev
```

### 4. Verify

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v1/health
- API docs: http://localhost:8000/docs

---

## Database Schema

6 normalized tables with multi-tenant isolation:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `organizations` | Multi-tenant root | name, slug |
| `documents` | Upload metadata + status workflow | file_name, file_hash, document_type, status |
| `extracted_data` | 30+ structured fields (1:1 with document) | shipper, consignee, vessel, ports, values, weights |
| `line_items` | Commodity lines (1:M) | description, hs_code, quantity, unit_price, weights |
| `extraction_fields` | Per-field confidence scores | field_name, confidence_score |
| `field_corrections` | Immutable audit trail | original_value, corrected_value, corrected_by, corrected_at |

**Status workflow**: `uploaded → processing → extracted → reviewed → approved`

**Multi-tenancy**: Every query is scoped by `org_id`. The `X-Org-Id` header is required on all API requests.

> Schema decision rationale: [docs/adr/003-database-schema.md](docs/adr/003-database-schema.md)

---

## Key Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Backend Framework | FastAPI (Python) | Superior PDF/image processing ecosystem, mature Claude SDK, auto-generated OpenAPI docs |
| Frontend Stack | Next.js 16 + shadcn/ui | App Router for routing, shadcn for production-quality components, Tailwind v4 for styling |
| Database | PostgreSQL (relational) | Structured fields stored in columns (not JSON blobs), proper indexing, multi-tenant ready |
| AI Model | Claude Sonnet 4.5 (Vision) | Direct image analysis without OCR preprocessing, structured JSON output, confidence scoring |
| Deployment | Netlify + Render + Neon | Serverless frontend, containerized backend, managed Postgres |
| Corrections | Immutable audit trail | Insert-only `field_corrections` table preserves full change history for compliance |
| Startup Migrations | Subprocess (`alembic upgrade head`) | Avoids nested asyncio event loop conflicts; migrations always run before app accepts requests |

> Individual ADRs: [001 Backend](docs/adr/001-backend-framework.md) · [002 Frontend](docs/adr/002-frontend-stack.md) · [003 Database](docs/adr/003-database-schema.md) · [004 Claude API](docs/adr/004-claude-api-integration.md) · [005 Deployment](docs/adr/005-deployment-architecture.md) · [006 Bonus Features](docs/adr/006-bonus-features.md)

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/v1/documents/upload` | Upload document + trigger AI extraction |
| `GET` | `/api/v1/documents/` | List documents (search, filter, paginate) |
| `GET` | `/api/v1/documents/{id}` | Document detail with extracted data |
| `PATCH` | `/api/v1/documents/{id}` | Update document (status, corrections) |
| `GET` | `/api/v1/documents/{id}/file` | Serve original uploaded file |
| `POST` | `/api/v1/documents/check-duplicate` | Check for duplicate by SHA-256 hash |
| `POST` | `/api/v1/documents/{id}/corrections` | Create field/line-item correction |
| `GET` | `/api/v1/documents/{id}/corrections` | Get correction history |
| `POST` | `/api/v1/documents/{id}/reextract` | Re-run extraction pipeline |
| `GET` | `/api/v1/analytics/accuracy` | Extraction accuracy metrics |
| `GET` | `/api/v1/analytics/corrections` | Correction statistics |
| `GET` | `/api/v1/analytics/field-breakdown` | Per-field accuracy breakdown |
| `GET` | `/api/v1/comparison/compare/{id1}/{id2}` | Compare two documents field-by-field |
| `GET` | `/api/v1/export/documents/csv` | Export all documents as CSV |
| `GET` | `/api/v1/export/documents/{id}/csv` | Export single document line items |
| `POST` | `/api/v1/copilot/chat` | AI Copilot chat |
| `POST` | `/api/v1/copilot/chat/stream` | AI Copilot streaming chat (SSE) |
| `GET` | `/api/v1/health` | Health check |

Interactive API docs: [https://frieght-document-intelligence-hub.onrender.com/docs](https://frieght-document-intelligence-hub.onrender.com/docs)

---

## Project Structure

```
frieght-document-intelligence-hub/
├── docs/                   # PRD, ARCHITECTURE, DEPLOYMENT, RUN_BOOK, DEMO, 6 ADRs
├── backend/                # FastAPI · Python 3.11+ · SQLAlchemy · asyncpg
│   ├── app/api/v1/         # 8 route modules (documents, extraction, corrections, analytics, comparison, export, copilot, health)
│   ├── app/services/       # Business logic layer (5 services)
│   ├── app/models/         # SQLAlchemy ORM (6 tables)
│   ├── app/core/           # Claude client, PDF processor, prompts, file storage
│   ├── alembic/            # Database migrations
│   ├── Dockerfile          # Python 3.13-slim + poppler-utils
│   └── .env.example
├── frontend/               # Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui
│   ├── src/app/            # 5 pages (dashboard, upload, document detail, analytics, compare)
│   ├── src/components/     # 10 component groups (layout, documents, extraction, corrections, upload, analytics, comparison, ai-copilot, onboarding, ui)
│   ├── src/hooks/          # React Query hooks (documents, upload, user-profile)
│   ├── src/lib/            # API client, types, utils, copilot context, field validations
│   ├── netlify.toml        # Netlify build config
│   └── .env.local.example
└── test-documents/         # Sample freight docs for edge case testing
```

> Full file-level breakdown: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router) | 16 |
| UI Components | shadcn/ui (base-ui) | Latest |
| Styling | Tailwind CSS | v4 |
| Data Tables | TanStack Table | v8 |
| Charts | Recharts + shadcn Chart | v2.15 |
| Animations | Framer Motion | v12 |
| State Management | React Query | v5 |
| Backend | FastAPI | 0.115 |
| ORM | SQLAlchemy (async) | 2.0 |
| Database | PostgreSQL | 16 |
| Migrations | Alembic | 1.14 |
| AI | Claude API (Vision) | claude-sonnet-4-5 |
| PDF Processing | pdf2image + Pillow | — |
| Deployment | Netlify + Render + Neon | — |

---

## Documentation

| Document | Description |
|----------|-------------|
| [**PRD.md**](docs/PRD.md) | Product Requirements Document — user personas, deliverable specs, test cases, bonus features. Written before coding as the planning artifact. |
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) | System architecture — layered backend diagram, extraction pipeline flow, frontend component tree, database schema. |
| [**DEPLOYMENT.md**](docs/DEPLOYMENT.md) | Deployment runbook — step-by-step for Neon (DB) → Render (backend) → Netlify (frontend), env var reference, production checklist. |
| [**RUN_BOOK.md**](docs/RUN_BOOK.md) | Operational guide — startup sequence, common error diagnoses (migration failures, Anthropic 502s, FK constraint errors), health checks, re-seeding. |
| [**DEMO.md**](docs/DEMO.md) | Live walkthrough script — 10-min demo flow, architecture deep-dive talking points, curveball Q&A prep. |

<details>
<summary><strong>Architecture Decision Records (6 ADRs)</strong></summary>

Each decision documented with: the problem, options considered, the choice made, and rationale.

| ADR | Decision | TL;DR |
|-----|----------|-------|
| [ADR-001](docs/adr/001-backend-framework.md) | Backend: FastAPI (Python) | PDF/image ecosystem + Anthropic SDK maturity outweigh two-language cost |
| [ADR-002](docs/adr/002-frontend-stack.md) | Frontend: Next.js 16 + shadcn/ui | Copy-paste component ownership, base-ui primitives, Tailwind v4 |
| [ADR-003](docs/adr/003-database-schema.md) | DB: Relational columns, not JSON | Typed columns enable per-field indexing, confidence joins, compliance queries |
| [ADR-004](docs/adr/004-claude-api-integration.md) | AI: Single multi-page Claude call | Full document context in one call catches cross-page relationships |
| [ADR-005](docs/adr/005-deployment-architecture.md) | Deploy: Netlify + Render + Neon | Free-tier, prod-grade, minimal ops overhead |
| [ADR-006](docs/adr/006-bonus-features.md) | Bonus: 7 compounding features | Each feature multiplies value of the others (see Bonus Features section) |

</details>

---

## Tradeoffs

Conscious engineering decisions with real costs — not oversights:

| Decision | What I gave up | Why it was worth it |
|----------|----------------|---------------------|
| **Python backend over Node.js** | Single-language stack | `pdf2image`, `Pillow`, and Anthropic's Python SDK are all significantly more mature than Node equivalents for document processing. The PDF → image → Claude pipeline would have been fragile in Node. |
| **Relational columns over JSON blob** | Schema flexibility | 30+ extracted fields as individual typed columns means proper SQL indexing, field-level confidence joins, and typed querying. A JSON blob trades query power for agility — wrong for a data-intensive review workflow. |
| **Single Claude call for all pages** | Lower token cost | Splitting a multi-page document into separate calls loses cross-page context (totals that summarize across pages, vessel info on page 1 referenced on page 3). One call with page numbering gives Claude full document context. |
| **Local file storage over S3** | Production object storage | Keeps setup simple with zero AWS config. The `file_storage.py` abstraction is a deliberate seam — swapping to S3/R2 is a one-file change. |
| **Subprocess for Alembic migrations** | In-process migration control | FastAPI's async lifespan uses an asyncio event loop; Alembic's sync engine causes nested-loop conflicts. A subprocess call sidesteps this entirely — cleaner than wrapping sync code in `run_in_executor`. |
| **No auth layer** | Real user auth | Scope was document intelligence, not auth. Multi-tenancy is enforced structurally via `org_id` on every table and query — adding an auth provider (Clerk, Auth0) is additive, not a refactor. |

---

*Built by Shivansh — March 2026 | Aulintri Founding Full-Stack Engineer Submission*
