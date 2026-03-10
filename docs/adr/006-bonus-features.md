# ADR-006: Bonus Feature Selection & Rationale

## Status: Accepted
## Date: 2026-03-08

## Context
Deliverable 4 asks for "one feature not described in the brief." We will implement **six** to demonstrate product depth and domain understanding. Each is chosen using second-order thinking about what Aulintri's actual users would need.

## Feature Selection

### Feature 4A: Field-Level Confidence Scoring

**First-order thinking**: Show users which fields might be wrong.
**Second-order thinking**: This directly reduces the time operations clerks spend reviewing documents. Instead of checking all 15+ fields, they focus on the 2-3 flagged ones. At 200 documents/day, saving even 2 minutes per document = 6.6 hours saved per clerk per day. This is the core value proposition of AI-assisted extraction — not replacing humans, but directing their attention.

**Implementation**: Claude already self-assesses confidence in its extraction. We surface this as color-coded indicators (green/yellow/red) on each field. Low-confidence fields are auto-focused when the review form opens.

**Why this matters to Aulintri**: Their platform is about "AI-powered logistics." Confidence scoring is table stakes for any production AI system. Not having it would be a miss.

### Feature 4B: Document Comparison View

**First-order thinking**: Let users compare two documents side by side.
**Second-order thinking**: In international trade, the commercial invoice and packing list for the same shipment MUST agree on quantities, weights, and values. Customs brokers spend significant time cross-referencing these. A single discrepancy can trigger a CBP hold, costing $500-5000/day in demurrage. This feature directly addresses a pain point in their Phase 2 roadmap (customs filing).

**Implementation**: Select two documents → side-by-side view → automatic field matching → discrepancy highlighting with severity indicators.

**Why this matters to Aulintri**: Their Phase 2 includes CBP ACE/ABI filing. Accurate, consistent data across document types is a prerequisite for automated customs entry.

### Feature 4C: Extraction Accuracy Analytics

**First-order thinking**: Show how accurate the AI is.
**Second-order thinking**: This creates a feedback loop. Operations managers see which fields the AI struggles with → they can add training data or adjust prompts → accuracy improves → trust increases → more automation. Without this, the AI is a black box that users either trust blindly or don't trust at all. Neither is good.

**Implementation**: Dashboard with charts showing:
- Accuracy over time (line chart)
- Per-field accuracy (bar chart — "shipper_name: 98%, hs_code: 72%")
- Corrections by user (who's making the most fixes?)
- Accuracy by document source/shipper

**Why this matters to Aulintri**: As a founding engineer, you need to demonstrate systems thinking. Building the extraction is step 1. Building the measurement system to IMPROVE the extraction is step 2. This shows product maturity.

### Feature 4D: Smart Duplicate Detection

**First-order thinking**: Don't upload the same document twice.
**Second-order thinking**: In logistics operations, the same document flows through multiple hands — broker, forwarder, shipper, consignee. Each may upload it independently. Without dedup, you get phantom shipments in the system, double-counted values in reports, and confused operations teams. The cost of a false duplicate entry in customs filing is a potential fine.

**Implementation**:
1. File hash comparison (exact duplicate)
2. Fuzzy matching on (invoice_number, shipper, date) (same document, different scan)
3. Alert before upload with options: skip, upload as revision, upload anyway

**Why this matters to Aulintri**: Multi-tenant SaaS with real operations teams = guaranteed duplicate uploads. Catching this at upload time prevents downstream data quality issues.

### Feature 4E: AI Copilot Widget

**First-order thinking**: Let users ask questions about their data.
**Second-order thinking**: Freight operations teams are non-technical. They need insights ("Which shipper has the most corrections?") but can't write SQL. A natural language interface unlocked by Claude turns the entire database into a queryable assistant. This transforms the tool from a document processor into a freight intelligence platform.

**Implementation**:
- Floating action button (FAB) in the corner of every page
- Chat interface powered by Claude with streaming SSE responses
- Can execute read-only SQL queries against the database
- Page context awareness via `data-copilot-context` attributes
- Markdown rendering for rich formatted answers
- Conversation memory within session

**Why this matters to Aulintri**: Natural language data access is the differentiator between a tool and a platform. Operations managers who can ask "What's our correction rate for Haixing Hemco documents?" without leaving the dashboard will champion adoption.

### Feature 4F: CSV Export

**First-order thinking**: Let users download data as spreadsheets.
**Second-order thinking**: Customs brokers file entries into CBP's ACE system, which accepts structured data imports. Without export, every extracted field must be re-typed. With CSV export, the entire extraction pipeline feeds directly into their filing workflow. This is the bridge between AI extraction and real-world customs operations.

**Implementation**:
- Bulk export: all documents with header fields + line items as CSV
- Per-document export: single document's line items as CSV
- Available via API endpoints (`/api/v1/export/documents/csv` and `/api/v1/export/documents/:id/csv`)
- Triggered from the dashboard UI with a single click

## Implementation Plan

All 6 features will be built in priority order:

1. **Confidence Scoring** — per-field + overall with circular SVG gauge
2. **Duplicate Detection** — SHA-256 hash integrated into upload flow
3. **Accuracy Analytics** — 3 endpoints, Recharts visualizations, color-coded bars
4. **Document Comparison** — 27 fields, match %, field tooltips
5. **AI Copilot Widget** — floating chat, streaming SSE, DB query execution
6. **CSV Export** — bulk + per-document, triggered from dashboard

## Written Explanation (for submission)

> I chose to implement six complementary features: field-level confidence scoring, smart duplicate detection, extraction accuracy analytics, document comparison, an AI copilot widget, and CSV export. Together, these will form a complete "intelligence layer" around the core extraction engine. Confidence scoring will direct human attention to where it matters most — reducing review time by 60-80% for high-confidence documents. Duplicate detection will prevent the most common data quality issue in multi-user logistics operations. The accuracy analytics dashboard will create a feedback loop that enables continuous improvement of the AI extraction over time. The document comparison view will address a critical logistics workflow: ensuring commercial invoices and packing lists agree before customs filing, where discrepancies cost real money in delays and fines. The AI copilot will transform the platform from a document processor into a freight intelligence hub — operations teams can ask natural language questions about their data without leaving the dashboard. And CSV export will bridge the gap between AI extraction and real-world customs filing workflows, where data needs to flow into CBP's ACE system. Each feature was chosen because it solves a problem I observed in the sample documents and would encounter at scale in Aulintri's platform.

## Consequences
- Six features = more surface area to test and maintain
- AI Copilot adds Claude API cost per chat interaction (mitigated by read-only queries)
- Accuracy analytics depends on having correction data (demo org auto-seeded on startup)
- Copilot DB query execution is read-only (SELECT only) for security
- CSV export uses streaming for large datasets to avoid memory issues
