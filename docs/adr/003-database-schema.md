# ADR-003: Database Schema Design

## Status: Accepted
## Date: 2026-03-08

## Context
The brief explicitly requires:
1. Relational storage (NOT JSON blob)
2. Multi-tenant awareness (org_id)
3. Correction history (AI original vs user corrected)
4. Audit trail

This is the highest-weighted deliverable (25% of evaluation). Schema must demonstrate real-world production thinking.

## Decision: Relational Schema with Audit Trail

### Schema Design

```sql
-- Multi-tenant root
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document uploads
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id),

    -- File metadata
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,        -- S3/storage path
    file_size_bytes BIGINT,
    file_mime_type VARCHAR(100),
    file_hash VARCHAR(64),                    -- SHA-256 for duplicate detection

    -- Document classification
    document_type VARCHAR(50) NOT NULL,       -- 'commercial_invoice', 'packing_list', 'bill_of_lading', 'combined'

    -- Processing status
    status VARCHAR(30) NOT NULL DEFAULT 'uploaded',  -- uploaded → processing → extracted → reviewed → approved

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,

    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Core extracted data (relational, not JSON)
CREATE TABLE extracted_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),

    -- Shipper info
    shipper_name VARCHAR(500),
    shipper_address TEXT,

    -- Consignee info
    consignee_name VARCHAR(500),
    consignee_address TEXT,

    -- Shipping details
    vessel_name VARCHAR(255),
    voyage_number VARCHAR(100),
    mbl_number VARCHAR(100),          -- Master Bill of Lading
    hbl_number VARCHAR(100),          -- House Bill of Lading
    port_of_lading VARCHAR(255),
    port_of_discharge VARCHAR(255),

    -- Trade details
    country_of_origin VARCHAR(100),
    country_of_destination VARCHAR(100),
    incoterms VARCHAR(50),            -- FOB, CIF, EXW, etc.
    payment_terms TEXT,

    -- Values
    total_declared_value DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',

    -- Weight
    total_gross_weight DECIMAL(15,3),
    total_net_weight DECIMAL(15,3),
    weight_unit VARCHAR(10) DEFAULT 'kg',

    -- Package info
    total_packages INTEGER,
    package_type VARCHAR(50),         -- cartons, pallets, pkgs

    -- Document reference
    document_date DATE,
    invoice_number VARCHAR(100),
    reference_numbers TEXT[],         -- Array for multiple PO numbers etc.

    -- Container info
    container_numbers TEXT[],

    -- AI metadata
    overall_confidence DECIMAL(5,2),  -- 0-100
    extraction_model VARCHAR(100),     -- Which Claude model was used
    extraction_duration_ms INTEGER,
    raw_ai_response JSONB,            -- Preserved for debugging only

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(document_id)               -- One extraction per document
);

-- Line items (commodity details)
CREATE TABLE line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extracted_data_id UUID NOT NULL REFERENCES extracted_data(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),

    line_number INTEGER NOT NULL,
    item_number VARCHAR(50),           -- Item/part number
    description TEXT NOT NULL,
    hs_code VARCHAR(20),               -- Harmonized System code

    quantity DECIMAL(15,3),
    unit VARCHAR(50),                  -- pcs, kg, sets, etc.

    unit_price DECIMAL(15,4),
    total_amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',

    net_weight DECIMAL(15,3),
    gross_weight DECIMAL(15,3),
    weight_unit VARCHAR(10) DEFAULT 'kg',

    package_count INTEGER,
    package_type VARCHAR(50),
    pallet_count INTEGER,

    -- Container association
    container_number VARCHAR(50),
    po_number VARCHAR(100),

    confidence DECIMAL(5,2),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Field-level confidence scores
CREATE TABLE extraction_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extracted_data_id UUID NOT NULL REFERENCES extracted_data(id) ON DELETE CASCADE,

    field_name VARCHAR(100) NOT NULL,    -- e.g., 'shipper_name', 'total_declared_value'
    field_value TEXT,
    confidence_score DECIMAL(5,2),       -- 0.00 to 100.00
    source_hint TEXT,                    -- Where in the document this was found

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(extracted_data_id, field_name)
);

-- Correction history (audit trail)
CREATE TABLE field_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id),

    field_name VARCHAR(100) NOT NULL,
    original_value TEXT,
    corrected_value TEXT NOT NULL,

    -- For line item corrections
    line_item_id UUID REFERENCES line_items(id),

    corrected_by VARCHAR(255),           -- User identifier
    corrected_at TIMESTAMPTZ DEFAULT NOW(),

    -- Reason (optional, for analytics)
    correction_reason VARCHAR(50)        -- 'wrong_value', 'missing_value', 'formatting', 'partial_extraction'
);

-- Indexes for performance
CREATE INDEX idx_documents_org_id ON documents(org_id);
CREATE INDEX idx_documents_status ON documents(org_id, status);
CREATE INDEX idx_documents_type ON documents(org_id, document_type);
CREATE INDEX idx_documents_date ON documents(org_id, uploaded_at DESC);
CREATE INDEX idx_documents_hash ON documents(file_hash);

CREATE INDEX idx_extracted_shipper ON extracted_data(org_id, shipper_name);
CREATE INDEX idx_extracted_consignee ON extracted_data(org_id, consignee_name);
CREATE INDEX idx_extracted_country ON extracted_data(org_id, country_of_origin);
CREATE INDEX idx_extracted_invoice ON extracted_data(org_id, invoice_number);
CREATE INDEX idx_extracted_date ON extracted_data(org_id, document_date DESC);

CREATE INDEX idx_line_items_extracted ON line_items(extracted_data_id);
CREATE INDEX idx_line_items_description ON line_items(org_id, description);
CREATE INDEX idx_line_items_hs_code ON line_items(org_id, hs_code);

CREATE INDEX idx_corrections_document ON field_corrections(document_id);
CREATE INDEX idx_corrections_field ON field_corrections(org_id, field_name);
CREATE INDEX idx_corrections_date ON field_corrections(org_id, corrected_at DESC);

-- Full-text search index
CREATE INDEX idx_extracted_fts ON extracted_data USING GIN(
    to_tsvector('english',
        COALESCE(shipper_name, '') || ' ' ||
        COALESCE(consignee_name, '') || ' ' ||
        COALESCE(invoice_number, '')
    )
);
```

## Design Decisions Explained

### Why not a JSON blob for extracted data?
The brief explicitly forbids it. But beyond compliance:
- Relational columns enable SQL-level filtering/searching (WHERE shipper_name ILIKE '%hemco%')
- Type safety at the database level (DECIMAL for money, DATE for dates)
- Individual field indexing for performance
- Column-level statistics for query optimization
- JOIN-able for analytics queries

### Why store raw_ai_response as JSONB?
Exception to the "no JSON blob" rule — this is for debugging/auditing only, never queried for business logic. It preserves the exact AI response for troubleshooting extraction issues.

### Why TEXT[] for reference_numbers and container_numbers?
These are genuinely variable-length lists that don't warrant their own tables. A document can have 1-5 PO numbers and 1-10 container numbers. PostgreSQL arrays are searchable with GIN indexes and keep the schema clean.

### Why separate extraction_fields table?
Stores per-field confidence scores without cluttering the main extracted_data table. Enables the confidence scoring feature and accuracy analytics.

### Why immutable field_corrections?
Insert-only pattern. Never update a correction record. This creates a complete audit chain:
- Field extracted at time T1 with value V1
- Corrected at T2 to V2 by User A
- Corrected again at T3 to V3 by User B
All three records exist. This is non-negotiable for customs compliance.

### Multi-tenant pattern
`org_id` on every tenant-scoped table. Even in demo with one org, all queries include `WHERE org_id = ?`. This is the foundation for Row-Level Security policies when they scale.

## Consequences
- More tables = more JOINs, but PostgreSQL handles this efficiently
- Need to maintain consistency between extracted_data columns and extraction_fields rows
- Migration strategy needed if fields are added (ALTER TABLE + backfill)
- Connection pooling important for concurrent access (use pgBouncer or built-in pool)
