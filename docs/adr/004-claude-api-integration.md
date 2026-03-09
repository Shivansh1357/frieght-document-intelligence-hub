# ADR-004: Claude API Integration Strategy

## Status: Accepted
## Date: 2026-03-08

## Context
The brief requires using Claude API (claude-sonnet-4-5-20250929) for document extraction. This is 15% of the evaluation and directly impacts the quality of the core feature.

## Decision: Vision-First Extraction with Structured Output

### Approach: PDF → Image → Claude Vision API

**Why not PDF text extraction first?**
- Many logistics documents are scanned images embedded in PDFs
- Table layouts are lost in text extraction
- Stamps, signatures, handwritten notes are only visible in images
- Claude's vision capability handles the full document as humans see it

### Pipeline

```
PDF Upload → Convert to Images (per page) → Send to Claude Vision API
→ Structured JSON Response → Validate with Pydantic → Store in DB
```

### Prompt Engineering Strategy

**System Prompt (Template):**
```
You are an expert freight document analyst specializing in international
trade documentation. You extract structured data from commercial invoices,
packing lists, and bills of lading with extreme precision.

RULES:
1. Extract ONLY what is explicitly visible in the document
2. Never guess or infer values that aren't present
3. For missing fields, return null — not empty strings
4. For ambiguous values, include a lower confidence score
5. Preserve original formatting for addresses (line breaks matter)
6. Currency should be ISO 4217 code (USD, CNY, INR, EUR)
7. Dates should be ISO 8601 (YYYY-MM-DD)
8. Weights should include the unit (kg, lbs)
9. Identify the document type first, then extract fields
```

**User Prompt (per document):**
```
Analyze this logistics document image and extract all structured data.

Return a JSON object with this exact schema:
{
  "document_type": "commercial_invoice" | "packing_list" | "bill_of_lading" | "combined",
  "confidence": <overall confidence 0-100>,
  "fields": {
    "shipper_name": {"value": "...", "confidence": 0-100},
    "shipper_address": {"value": "...", "confidence": 0-100},
    "consignee_name": {"value": "...", "confidence": 0-100},
    "consignee_address": {"value": "...", "confidence": 0-100},
    "vessel_name": {"value": "..." | null, "confidence": 0-100},
    ...
  },
  "line_items": [
    {
      "line_number": 1,
      "item_number": "...",
      "description": "...",
      "quantity": 3600,
      "unit": "pcs",
      "unit_price": 3.45,
      "total_amount": 12420.00,
      "hs_code": "..." | null,
      "net_weight": 10059.62,
      "gross_weight": 10368.00,
      "weight_unit": "kg",
      "confidence": 85
    }
  ]
}
```

### Multi-Page Handling
For multi-page PDFs (e.g., invoice on page 1, packing list on page 2):
1. Convert all pages to images
2. Send ALL pages in a single API call (Claude can process multiple images)
3. The prompt instructs Claude to synthesize data across all pages
4. If pages are different document types, classify as "combined"

### Error Recovery Strategy

| Scenario | Handling |
|----------|----------|
| API timeout | Retry with exponential backoff (max 3 attempts) |
| Invalid JSON response | Re-prompt with stricter format instructions |
| Partial extraction | Accept partial, flag low-confidence fields |
| Rate limit hit | Queue with delay, notify user of processing time |
| Image too large | Resize/compress before sending |
| Unsupported format | Return error with supported format list |

### Confidence Scoring Logic
Claude provides self-assessed confidence per field. We enhance this with:
- If field value matches expected pattern (e.g., date regex) → boost +5
- If field appears in expected document location → boost +5
- If field is null but expected for document type → flag for review
- Aggregate: field-level → document-level confidence

### Cost Optimization
- Use `claude-sonnet-4-5-20250929` (not Opus) as specified — good balance of quality/cost
- Resize images to max 1568px on longest side (Claude's recommended max)
- Cache extraction results — never re-extract the same document unless requested
- Batch-process multi-page docs in single API call (1 call instead of N)

## Consequences
- Dependent on Claude API availability (need graceful degradation)
- Image conversion adds processing time (~1-2s per page)
- Prompt iteration will be needed as we encounter more document formats
- Must handle Claude's occasional JSON formatting issues (trailing commas, etc.)
