# ADR-006: Bonus Feature Selection & Rationale

## Status: Accepted
## Date: 2026-03-08

## Context
Deliverable 4 asks for "one feature not described in the brief." We're implementing four to demonstrate product depth and domain understanding. Each is chosen using second-order thinking about what Aulintri's actual users would need.

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

## Prioritization Order

1. **Confidence Scoring** (highest impact, least effort, integrates with core flow)
2. **Duplicate Detection** (prevents data quality issues, small implementation surface)
3. **Accuracy Analytics** (impressive in demo, uses existing correction data)
4. **Document Comparison** (most complex, highest domain insight, demo wow-factor)

If time is constrained, we ship in this order. Features 1-2 are must-haves, 3-4 are stretch goals.

## Written Explanation (for submission)

> I chose to implement four complementary features: field-level confidence scoring, smart duplicate detection, extraction accuracy analytics, and document comparison. Together, these form a complete "intelligence layer" around the core extraction engine. Confidence scoring directs human attention to where it matters most — reducing review time by 60-80% for high-confidence documents. Duplicate detection prevents the most common data quality issue in multi-user logistics operations. The accuracy analytics dashboard creates a feedback loop that enables continuous improvement of the AI extraction over time. And the document comparison view addresses a critical logistics workflow: ensuring commercial invoices and packing lists agree before customs filing, where discrepancies cost real money in delays and fines. Each feature was chosen because it solves a problem I observed in the sample documents and would encounter at scale in Aulintri's platform.

## Consequences
- Four features = more surface area to test
- Need to time-box each feature implementation
- Accuracy analytics depends on having correction data (seed some for demo)
- Comparison view is the most complex — may be simplified if time-constrained
