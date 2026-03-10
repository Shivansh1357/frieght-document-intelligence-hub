# System Architecture
# Freight Document Intelligence Hub

---

## High-Level Architecture

```
                                 ┌──────────────────────────┐
                                 │       User Browser       │
                                 │                          │
                                 │   Next.js 16 App Router  │
                                 │   TypeScript + Tailwind  │
                                 │   shadcn/ui + TanStack   │
                                 └────────────┬─────────────┘
                                              │
                                    HTTPS / REST API
                                              │
                                              ▼
                                 ┌──────────────────────────┐
                                 │    FastAPI Backend        │
                                 │    Python 3.11+           │
                                 │                          │
                                 │  ┌────────────────────┐  │
                                 │  │   API Layer        │  │
                                 │  │   (Routes/Deps)    │  │
                                 │  └────────┬───────────┘  │
                                 │           │              │
                                 │  ┌────────▼───────────┐  │
                                 │  │  Service Layer     │  │
                                 │  │  (Business Logic)  │  │
                                 │  └──┬─────────────┬───┘  │
                                 │     │             │      │
                                 │  ┌──▼──┐    ┌────▼───┐  │
                                 │  │ DB  │    │ Claude │  │
                                 │  │Repo │    │  API   │  │
                                 │  └──┬──┘    └────┬───┘  │
                                 │     │            │      │
                                 └─────┼────────────┼──────┘
                                       │            │
                          ┌────────────▼──┐   ┌─────▼──────────┐
                          │  PostgreSQL   │   │  Anthropic API │
                          │  (Neon)       │   │  Claude Sonnet │
                          │               │   │  (Vision)      │
                          └───────────────┘   └────────────────┘
```

## Architecture Pattern: Clean Layered Architecture

We use a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│                                                         │
│  Next.js Pages & Components                             │
│  ├── /app/page.tsx              (Dashboard)             │
│  ├── /app/upload/page.tsx       (Upload Flow)           │
│  ├── /app/documents/[id]/       (Document Detail)       │
│  ├── /app/analytics/page.tsx    (Accuracy Analytics)    │
│  └── /app/compare/page.tsx      (Document Comparison)   │
│                                                         │
│  Component Hierarchy:                                    │
│  ├── Layout (sidebar + header)                          │
│  ├── DataTable (TanStack + shadcn)                      │
│  ├── ExtractionForm (editable fields)                   │
│  ├── DocumentViewer (inline preview + download on demand)│
│  ├── ConfidenceBadge (field-level indicators)           │
│  ├── CorrectionTimeline (audit trail)                   │
│  └── AnalyticsCharts (Recharts/Evil Charts)             │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP (fetch / react-query)
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       API LAYER                          │
│                                                         │
│  FastAPI Routers                                        │
│  ├── documents.py     (CRUD, upload, search, filter)    │
│  ├── extraction.py    (trigger extraction, re-extract)  │
│  ├── corrections.py   (save corrections, get history)   │
│  ├── analytics.py     (accuracy metrics, trends)        │
│  ├── comparison.py    (document comparison)             │
│  └── health.py        (health check, readiness)         │
│                                                         │
│  Middleware:                                             │
│  ├── TenantMiddleware  (extract org_id from header)     │
│  ├── CORSMiddleware    (allow frontend origin)          │
│  └── ErrorHandler      (consistent error responses)     │
│                                                         │
│  Dependencies (FastAPI DI):                              │
│  ├── get_db()          (async DB session)               │
│  ├── get_org_id()      (tenant context)                 │
│  └── get_storage()     (file storage interface)         │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                        │
│                                                         │
│  document_service.py                                    │
│  ├── upload_document()     → validate, store, trigger   │
│  ├── get_documents()       → search, filter, paginate   │
│  ├── get_document_detail() → full detail with relations │
│  └── check_duplicate()     → hash + fuzzy matching      │
│                                                         │
│  extraction_service.py                                  │
│  ├── extract_document()    → PDF→image→Claude→parse     │
│  ├── reextract_document()  → clear + re-extract         │
│  └── parse_extraction()    → JSON→Pydantic→DB models    │
│                                                         │
│  correction_service.py                                  │
│  ├── save_corrections()    → typed coercion + audit log │
│  ├── get_corrections()     → correction history         │
│  └── approve_document()    → status transition          │
│                                                         │
│  analytics_service.py                                   │
│  ├── get_accuracy_metrics()   → per-field accuracy      │
│  ├── get_correction_trends()  → over-time analysis      │
│  └── get_field_breakdown()    → most corrected fields   │
│                                                         │
│  comparison_service.py                                  │
│  ├── compare_documents()   → field-by-field matching    │
│  └── find_discrepancies()  → highlight mismatches       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                      │
│                                                         │
│  SQLAlchemy 2.0 Models (asyncio)                        │
│  ├── Organization                                       │
│  ├── Document                                           │
│  ├── ExtractedData                                      │
│  ├── LineItem                                           │
│  ├── ExtractionField                                    │
│  └── FieldCorrection                                    │
│                                                         │
│  Alembic Migrations                                     │
│  ├── 001_initial_schema.py                              │
│  ├── 002_add_indexes.py                                 │
│  └── 003_add_fts.py                                     │
│                                                         │
│  Repository Pattern:                                    │
│  ├── document_repo.py                                   │
│  ├── extraction_repo.py                                 │
│  └── correction_repo.py                                 │
└─────────────────────────────────────────────────────────┘
```

## Data Flow: Document Upload & Extraction

```
User drags PDF  ──►  Frontend validates  ──►  POST /api/v1/documents/upload
into dropzone        (type, size)              (multipart/form-data)
                                                      │
                                                      ▼
                                              Backend receives file
                                              ├── Compute SHA-256 hash
                                              ├── Check duplicate (hash + fuzzy)
                                              ├── Store file (local/S3)
                                              ├── Create Document record (status: 'uploaded')
                                              └── Trigger extraction async
                                                      │
                                                      ▼
                                              Extraction Pipeline
                                              ├── Validate file (empty, corrupt, password-protected)
                                              ├── PDF → Images (pdf2image, 300 DPI)
                                              ├── Auto-orient via EXIF metadata
                                              ├── Resize to max 2048px (Claude vision limit)
                                              ├── Enhance (contrast 1.2x + sharpening 1.5x)
                                              ├── Force RGB (handle RGBA/CMYK/palette)
                                              ├── Send to Claude Vision API
                                              │   ├── System prompt (domain-specific rules)
                                              │   ├── Page numbering ("Page 1 of 3:")
                                              │   ├── User prompt (exact JSON schema)
                                              │   └── Enhanced image(s) attached
                                              ├── Quality-aware retry (if <5 fields extracted)
                                              │   └── Enhanced prompt on retry
                                              ├── Parse JSON response
                                              ├── Validate with Pydantic
                                              ├── Store in relational tables:
                                              │   ├── extracted_data (header fields)
                                              │   ├── line_items (commodity lines)
                                              │   └── extraction_fields (confidence)
                                              └── Update status: 'extracted'
                                                      │
                                                      ▼
                                              Return extraction result
                                              to frontend via response
                                                      │
                                                      ▼
                                              Frontend renders:
                                              ├── Editable form (header fields)
                                              ├── Editable line items (click-to-edit)
                                              ├── Confidence indicators per field
                                              └── PDF/image preview alongside
                                                      │
                                              User reviews & corrects
                                                      │
                                                      ▼
                                              PATCH /api/v1/documents/:id
                                              ├── Diff original vs corrected
                                              ├── Create field_corrections
                                              ├── Update extracted_data
                                              └── Status: 'reviewed'/'approved'
```

## Frontend Component Architecture

```
frontend/
└── src/
    ├── app/
    │   ├── layout.tsx                    # Root layout
    │   ├── page.tsx                      # Dashboard
    │   ├── upload/page.tsx               # Upload flow
    │   ├── documents/[id]/page.tsx       # Document detail + preview
    │   ├── analytics/page.tsx            # Extraction analytics
    │   └── compare/page.tsx              # Document comparison
    │
    ├── components/
    │   ├── ai-copilot/
    │   │   └── copilot-widget.tsx        # Ask AI widget (DOM-aware)
    │   ├── onboarding/
    │   │   ├── welcome-dialog.tsx        # First-run name capture
    │   │   └── app-tour.tsx              # Guided tour (4 steps)
    │   ├── layout/
    │   │   ├── app-shell.tsx             # Sidebar + header wrapper
    │   │   ├── sidebar.tsx               # Collapsible sidebar
    │   │   └── header.tsx                # Top header
    │   ├── documents/
    │   │   ├── document-table.tsx        # Filters + TanStack table
    │   │   ├── document-columns.tsx      # Column definitions
    │   │   ├── document-filters.tsx      # (placeholder)
    │   │   └── status-badge.tsx          # Status pill
    │   ├── extraction/
    │   │   ├── extraction-form.tsx       # Editable extracted data (validated)
    │   │   ├── field-input.tsx           # Field input + error display
    │   │   ├── confidence-badge.tsx      # Confidence indicator
    │   │   └── line-items-table.tsx      # Line items table
    │   ├── corrections/
    │   │   └── correction-timeline.tsx   # Audit trail UI
    │   ├── upload/
    │   │   ├── dropzone.tsx              # Drag-and-drop upload area
    │   │   ├── upload-progress.tsx       # Progress UI
    │   │   └── duplicate-alert.tsx       # Duplicate warning UI
    │   ├── analytics/
    │   │   ├── accuracy-chart.tsx        # Chart component(s)
    │   │   └── stats-cards.tsx           # Analytics cards
    │   ├── comparison/
    │   │   └── comparison-view.tsx       # (shared compare UI)
    │   ├── providers/
    │   │   ├── query-provider.tsx        # React Query provider
    │   │   └── theme-provider.tsx        # Theme provider
    │   └── ui/                           # shadcn/ui primitives
    │
    ├── hooks/
    │   ├── use-documents.ts
    │   ├── use-upload.ts
    │   └── use-user-profile.ts
    │
    └── lib/
        ├── api.ts                        # API client + error parsing
        ├── types.ts                      # Shared TS types
        ├── utils.ts
        ├── user-store.ts
        ├── copilot-context.ts            # Safe context payload helper
        └── field-validations.ts          # Zod validators for corrections
```

## Backend Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI app factory
│   ├── config.py                 # Settings (Pydantic BaseSettings)
│   ├── dependencies.py           # FastAPI dependencies (DB, org, etc.)
│   │
│   ├── api/v1/
│   │   ├── router.py             # Aggregated v1 router
│   │   ├── documents.py          # Document CRUD + file viewer endpoint
│   │   ├── extraction.py         # Extraction endpoints
│   │   ├── corrections.py        # Correction endpoints
│   │   ├── analytics.py          # Analytics endpoints
│   │   ├── comparison.py         # Comparison endpoints
│   │   ├── export.py             # CSV exports
│   │   ├── copilot.py            # AI copilot endpoint
│   │   └── health.py             # Health check
│   │
│   ├── schemas/
│   │   ├── document.py           # Request/Response schemas
│   │   ├── extraction.py         # Extraction response schemas
│   │   ├── correction.py         # Correction schemas
│   │   └── analytics.py          # Analytics response schemas
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_service.py
│   │   ├── extraction_service.py
│   │   ├── correction_service.py # Applies typed corrections (date/num/int)
│   │   ├── analytics_service.py
│   │   └── comparison_service.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── base.py               # SQLAlchemy base
│   │   ├── organization.py
│   │   ├── document.py
│   │   ├── extracted_data.py
│   │   ├── line_item.py
│   │   ├── extraction_field.py
│   │   └── field_correction.py
│   │
│   ├── db/
│   │   └── session.py            # Async engine + session factory
│   │
│   └── core/
│       ├── __init__.py
│       ├── claude_client.py      # Anthropic API wrapper
│       ├── pdf_processor.py      # PDF to image conversion
│       ├── file_storage.py       # File storage abstraction
│       └── prompts.py            # Claude prompt templates
│
├── alembic/                      # Alembic migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── alembic.ini
├── requirements.txt
├── seed_demo_data.sql
├── Dockerfile
└── .env.example
```

## Security Considerations

1. **File Upload Safety**: Validate MIME types server-side, not just extension
2. **File Size Limits**: 20MB max, enforced at both frontend and backend
3. **File Integrity**: Reject 0-byte files, corrupt PDFs, password-protected PDFs with clear error messages
4. **SQL Injection**: SQLAlchemy parameterized queries (never raw SQL with user input)
5. **XSS**: React auto-escapes JSX; sanitize any dangerouslySetInnerHTML
6. **CORS**: Strict origin allowlist (only the Vercel frontend URL)
7. **API Keys**: Environment variables only, never in client code
8. **Tenant Isolation**: org_id checked on every query, middleware-enforced
9. **Rate Limiting**: Protect extraction endpoint from abuse (Claude API cost)

## Edge Case Handling

1. **Corrupt/Invalid PDFs**: Caught at pdf2image level with specific error messages (PDFPageCountError, PDFSyntaxError)
2. **Password-Protected PDFs**: Detected via error message parsing, returns user-friendly rejection
3. **Empty Files**: 0-byte check before processing
4. **Truncated/Corrupt Images**: PIL `img.load()` forces full decode, catches corrupt files early
5. **EXIF-Rotated Images**: Auto-orient via `ImageOps.exif_transpose()` — critical for phone photos/scans
6. **RGBA/CMYK/Palette Mode**: Forced RGB conversion before encoding for Claude compatibility
7. **Low-Quality Extractions**: Quality-aware retry — if <5 fields extracted, retries with enhanced prompt
8. **Multi-Page Synthesis**: Page numbering ("Page 1 of 3:") helps Claude understand document structure
9. **Label Aliasing**: Prompt handles Shipper/Exporter/Seller, Consignee/Importer/Buyer equivalence
10. **Partial Data**: Stored as NULL with low confidence score, UI highlights for human review

## Performance Strategy

1. **Lazy loading**: PDF viewer loaded on demand (dynamic import)
2. **Server components**: Dashboard data fetched on server (no client waterfall)
3. **Optimistic updates**: UI updates immediately on correction save
4. **Pagination**: Server-side, cursor-based for large datasets
5. **Caching**: React Query for client cache, HTTP cache headers for static data
6. **Image optimization**: Next.js Image component for any displayed images
7. **Code splitting**: Per-route bundles via App Router
