# Product Requirements Document (PRD)

# Freight Document Intelligence Hub

## Version 1.0 | March 2026

---

## 1. Problem Statement

International freight logistics generates millions of documents daily — commercial invoices, packing lists, bills of lading, customs forms. Today, operations teams manually extract data from these documents, a process that is:

- **Error-prone**: Manual data entry across 15+ fields per document leads to ~3-5% error rates
- **Time-consuming**: Each document takes 10-20 minutes to process manually
- **Unscalable**: A single customs broker handles 50-200 documents/day
- **Non-auditable**: No systematic tracking of what was extracted vs. what was corrected

Aulintri's platform needs an intelligent document processing pipeline that automates extraction while keeping humans in the loop for accuracy-critical logistics workflows.

## 2. Target Users


| Persona                | Role                      | Key Need                                                    |
| ---------------------- | ------------------------- | ----------------------------------------------------------- |
| **Operations Clerk**   | Processes daily documents | Fast, accurate extraction with easy correction              |
| **Customs Broker**     | Files entries with CBP    | Verified data, audit trail, compliance confidence           |
| **Operations Manager** | Oversees team             | Dashboard visibility, accuracy metrics, throughput tracking |
| **Account Admin**      | Manages org settings      | Multi-tenant access, user management                        |


## 3. Document Analysis (from Sample Data)

### Document Types Encountered

**Type A: Commercial Invoice + Packing List (Combined)**

- Example: Haixing Hemco 25HE5130032
- Contains: Shipper, consignee, vessel info, MBL/HBL, port of lading/discharge, incoterms, line items with quantities/prices, container details, net/gross weights per container
- Complexity: HIGH (multi-page, container-level breakdown, PO references)

**Type B: Packing List + Sample Invoice (Separate)**

- Example: Paramount Impex PI1693, PI1694
- Contains: Exporter, consignee, country of origin, HS codes, part numbers, dimensions, net/gross weights, unit prices
- Complexity: MEDIUM (multi-page, different format per page, "samples only" declarations)

### Key Field Variations Observed


| Field            | Haixing Hemco               | Paramount Impex        |
| ---------------- | --------------------------- | ---------------------- |
| Shipper label    | "Shipper"                   | "Exporter"             |
| Consignee label  | "Consignee"                 | "Consignee/Buyer"      |
| Reference        | "INVOICE#"                  | "P/Invoice No."        |
| Vessel info      | Present (MBL, HBL, Vessel)  | Absent                 |
| HS Codes         | Not present                 | Present                |
| Container info   | Present (container numbers) | Absent                 |
| Incoterms        | FOB XINGANG TIANJIN         | Not present            |
| Payment terms    | 100% by T/T at 10 days...   | "Samples free of cost" |
| Weight breakdown | Per container               | Per item               |


### Edge Cases Identified

1. **Missing fields**: Not all documents have incoterms, vessel info, or HS codes
2. **Multi-page documents**: Invoice on page 1, packing list on page 2 (or vice versa)
3. **Combined documents**: Same PDF contains both invoice and packing list
4. **Varying formats**: Same field appears in different positions/labels across shippers
5. **Special declarations**: "SAMPLES ONLY, NOT FOR SALE" affects value interpretation
6. **Multiple PO numbers**: Single invoice referencing 2+ POs (e.g., 54290/COTX-... and 54291/COTX-...)
7. **Container-level vs item-level data**: Some documents break down by container, others by line item
8. **Currency variations**: USD explicitly stated, but some documents use implicit currency
9. **Poor scan quality**: Real-world documents may have skewed text, stamps, handwriting
10. **Overlapping data**: Packing list and invoice for same shipment may have slightly different figures

## 4. Deliverable Breakdown

### Deliverable 1: Document Upload & AI Extraction (Core Feature)

**User Flow:**

1. User clicks "Upload Document" on dashboard
2. Drag-and-drop or file picker for PDF/image upload
3. Upload progress indicator with file validation
4. AI processing animation (skeleton loading of form fields)
5. Extracted data displayed in editable form with confidence indicators
6. User reviews, corrects fields as needed
7. User clicks "Approve & Save" to persist

**Required Extracted Fields:**

- Shipper name and address
- Consignee name and address
- Commodity description (line items)
- Quantities and units
- Gross and net weight
- Country of origin
- Declared/invoice value and currency
- Incoterms (if present)
- Document date and reference numbers

**Additional Fields (from document analysis):**

- Vessel name/voyage number
- MBL/HBL numbers
- Port of lading / Port of discharge
- Container numbers
- PO/Order numbers
- HS codes (if present)
- Payment terms
- Package count and type

**Claude API Strategy:**

- Use `claude-sonnet-4-5-20250929` with vision capability for PDF/image processing
- Structured JSON output via system prompt with explicit schema
- Multi-step extraction: first identify document type, then extract fields
- Confidence scoring per field based on extraction clarity
- Graceful handling of missing fields (null vs uncertain)

**Test Cases:**


| #    | Scenario                             | Expected Behavior                                     |
| ---- | ------------------------------------ | ----------------------------------------------------- |
| TC1  | Upload valid commercial invoice PDF  | All fields extracted, displayed in form               |
| TC2  | Upload valid packing list PDF        | Weight/quantity fields prioritized                    |
| TC3  | Upload combined invoice+packing list | Both document types recognized, all fields extracted  |
| TC4  | Upload low-quality scan              | Partial extraction with low confidence flags          |
| TC5  | Upload non-logistics document        | Graceful error: "Document type not recognized"        |
| TC6  | Upload image (JPG/PNG)               | Same extraction flow as PDF                           |
| TC7  | Upload file > 10MB                   | Size validation error before upload                   |
| TC8  | Upload empty/corrupt PDF             | Error handling with retry option                      |
| TC9  | Edit extracted field and save        | Correction recorded in audit trail                    |
| TC10 | Save without editing                 | Original extraction saved as-is, no correction record |
| TC11 | Missing incoterms in document        | Field shown as empty/N/A, not errored                 |
| TC12 | Multiple PO numbers                  | All POs captured in reference field                   |


### Deliverable 2: Data Model & Database Schema

**Core Entities:**

- `organizations` — Multi-tenant root
- `documents` — Upload metadata, file reference, document type
- `extracted_data` — Structured relational fields (NOT JSON blob)
- `line_items` — Individual commodity lines
- `extraction_fields` — Field-level extraction with confidence scores
- `field_corrections` — Audit trail: original vs corrected values
- `containers` — Container-level data (when applicable)

**Multi-tenancy Strategy:**

- `org_id` on ALL tenant-scoped tables
- Row-Level Security (RLS) policies at DB level
- API middleware enforces tenant context
- Prepared for future: composite indexes on (org_id, ...)

**Audit Trail Design:**

- Every field extraction stored with: `original_value`, `confidence_score`, `source_location`
- Corrections stored as: `field_name`, `original_value`, `corrected_value`, `corrected_by`, `corrected_at`
- Document-level status: `processing` → `extracted` → `reviewed` → `approved`
- Immutable audit log (insert-only, no updates/deletes)

**Scaling Considerations:**

- Indexes on frequently queried fields (shipper, consignee, date, reference)
- Partitioning strategy ready for date-range queries
- Separate `file_storage` reference (S3-compatible) from metadata
- Connection pooling for concurrent uploads

**Test Cases:**


| #   | Scenario                                     | Expected Behavior                              |
| --- | -------------------------------------------- | ---------------------------------------------- |
| TC1 | Insert document with all fields              | All relational tables populated correctly      |
| TC2 | Insert document with missing optional fields | NULLs handled, no constraint violations        |
| TC3 | Save correction to existing field            | Correction history created, original preserved |
| TC4 | Query documents by org_id                    | Only tenant's documents returned               |
| TC5 | Multiple corrections to same field           | Full correction chain preserved                |
| TC6 | Concurrent document uploads                  | No race conditions, proper isolation           |
| TC7 | Query with date range filter                 | Efficient index-based retrieval                |
| TC8 | Document with 20+ line items                 | All items stored relationally                  |


### Deliverable 3: Dashboard UI

**Views:**

1. **Document List View** (main dashboard)
  - Table with columns: reference #, shipper, consignee, doc type, date, status, country, value
  - Search bar: full-text across shipper, consignee, commodity, reference
  - Filters: document type, date range, country of origin, status
  - Sort by any column
  - Pagination with count
  - Quick-action buttons: view, re-extract, export
2. **Document Detail View**
  - Split view: original PDF preview (left) + extracted data (right)
  - Editable form fields with inline validation
  - Confidence indicators per field (color-coded)
  - Line items table (editable)
  - Correction history timeline
  - Status badge with workflow actions
3. **Upload View**
  - Drag-and-drop zone with file type validation
  - Multi-file upload support (bulk)
  - Upload progress with cancel option
  - Processing status with real-time updates

**UI Quality Standards:**

- Consistent 4px/8px spacing grid
- Professional typography (Inter or similar)
- Dark/light mode support
- Responsive: desktop-first, functional on tablet
- Micro-interactions: hover states, transitions, loading skeletons
- Empty states with helpful guidance
- Error states with actionable messages

**Test Cases:**


| #    | Scenario                       | Expected Behavior                       |
| ---- | ------------------------------ | --------------------------------------- |
| TC1  | Empty dashboard (no documents) | Helpful empty state with upload CTA     |
| TC2  | Search "Paramount"             | Filters to matching documents           |
| TC3  | Filter by "Commercial Invoice" | Only invoices shown                     |
| TC4  | Filter by date range           | Documents within range shown            |
| TC5  | Click document row             | Navigates to detail view                |
| TC6  | Resize to tablet width         | Layout adapts, remains usable           |
| TC7  | 100+ documents loaded          | Pagination works, no performance issues |
| TC8  | Edit field in detail view      | Inline edit with save/cancel            |
| TC9  | View correction history        | Timeline of changes displayed           |
| TC10 | Keyboard navigation            | Tab through fields, Enter to save       |


### Deliverable 4: Bonus Features (Product Instinct)

We will implement **4 standout features** that demonstrate deep domain understanding:

#### Feature 4A: Field-Level Confidence Scoring

**Problem**: Users don't know which AI-extracted fields to trust and which need manual review.
**Solution**: Each extracted field displays a confidence score (0-100%) with color coding:

- Green (>90%): High confidence, likely correct
- Yellow (70-90%): Medium confidence, should verify
- Red (<70%): Low confidence, needs manual review
Fields below threshold are auto-highlighted for review priority.

#### Feature 4B: Document Comparison View

**Problem**: In real logistics, the commercial invoice and packing list for the same shipment must match. Discrepancies cause customs delays.
**Solution**: Side-by-side comparison of two related documents with automatic discrepancy highlighting. Mismatched quantities, weights, or values are flagged in red. Users can reconcile differences inline.

#### Feature 4C: Extraction Accuracy Analytics

**Problem**: Operations managers need to know how reliable the AI extraction is over time and which fields need the most corrections.
**Solution**: Analytics dashboard showing:

- Overall extraction accuracy rate over time
- Per-field accuracy breakdown (which fields get corrected most?)
- Accuracy by document type and shipper
- Correction volume trends
This creates a feedback loop for continuous improvement.

#### Feature 4D: Smart Duplicate Detection

**Problem**: The same document may be uploaded multiple times by different team members, or a revised version uploaded alongside the original.
**Solution**: On upload, check for potential duplicates by matching:

- Reference/invoice numbers
- Shipper + consignee + date combinations
- File hash similarity
Alert the user with options: "Skip", "Upload as revision", or "Upload anyway".

## 5. Non-Functional Requirements


| Requirement              | Target                                            |
| ------------------------ | ------------------------------------------------- |
| Page load time           | < 2 seconds                                       |
| Document extraction time | < 30 seconds                                      |
| Concurrent users         | 10+ simultaneous                                  |
| File size limit          | 20MB per document                                 |
| Supported formats        | PDF, PNG, JPG, JPEG, TIFF                         |
| Browser support          | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| Accessibility            | WCAG 2.1 AA minimum                               |
| API response time        | < 500ms (non-extraction endpoints)                |


## 6. Out of Scope (v1)

- User authentication/authorization (simplified with single demo user)
- Real-time collaboration
- Email notifications
- OCR pre-processing (relying on Claude's native vision)
- Bill of Lading extraction (mentioned but no samples provided)
- HTS code suggestion (considered but dropped for time — better as v2)

