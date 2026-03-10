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

**System Prompt includes:**
- 10 strict extraction rules (extract only visible data, null for missing, ISO standards)
- **Document-type-specific guidance**: what to look for in commercial invoices vs bills of lading vs packing lists
- **Label aliasing table**: Shipper/Exporter/Seller, Consignee/Importer/Buyer, G.W./Gross Weight etc.
- **Table extraction rules**: combine rows across pages, match values to column headers
- **Poor quality handling**: stamps, watermarks, handwriting → extract what's readable with low confidence

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

### Image Processing Pipeline
1. **PDF → Images**: 300 DPI via pdf2image (Poppler)
2. **EXIF auto-orient**: Corrects rotation from phone cameras/scanners
3. **Resize**: Max 2048px longest side (Claude vision API limit)
4. **Enhance**: Contrast boost (1.2x) + sharpening (1.5x) via Pillow
5. **Color normalization**: Force RGB (handles RGBA/CMYK/palette)
6. **Encoding**: PNG (lossless) for PDFs, JPEG Q95 for image uploads
7. **Page numbering**: "Page 1 of 3:" text block before each image

### Multi-Page Handling
For multi-page PDFs (e.g., invoice on page 1, packing list on page 2):
1. Convert all pages to images at 300 DPI
2. Add page numbering context ("Page 1 of N:") before each image
3. Send ALL pages in a single API call (Claude can process multiple images)
4. The prompt instructs Claude to synthesize data across all pages
5. If pages are different document types, classify as "combined"

### Error Recovery Strategy

| Scenario | Handling |
|----------|----------|
| API timeout | Retry with exponential backoff (max 3 attempts, 2^n seconds) |
| Invalid JSON response | Re-prompt with stricter format instructions |
| Low-quality extraction | Quality-aware retry with enhanced prompt (<5 non-null fields triggers retry) |
| Partial extraction | Accept partial, flag low-confidence fields, return best result |
| Rate limit hit | Exponential backoff between retries |
| Image too large | Resize to 2048px max before sending |
| Corrupt/empty PDF | Clear error message, document stays in "uploaded" status |
| Password-protected PDF | Reject with user-friendly error message |
| Truncated image | PIL load() catches corruption before Claude call |

### Confidence Scoring Logic
Claude provides self-assessed confidence per field. We enhance this with:
- If field value matches expected pattern (e.g., date regex) → boost +5
- If field appears in expected document location → boost +5
- If field is null but expected for document type → flag for review
- Aggregate: field-level → document-level confidence

### Cost Optimization
- Use `claude-sonnet-4-5-20250929` (not Opus) as specified — good balance of quality/cost
- Resize images to max 2048px on longest side (Claude vision API limit)
- Cache extraction results — never re-extract the same document unless requested
- Batch-process multi-page docs in single API call (1 call instead of N)
- max_tokens set to 16384 to handle large documents with many line items

## Consequences
- Dependent on Claude API availability (need graceful degradation)
- Image conversion adds processing time (~1-2s per page)
- Image preprocessing (contrast/sharpening) adds ~0.5s per page but significantly improves extraction quality
- Quality-aware retry may add up to 2 additional API calls for difficult documents
- Must handle Claude's occasional JSON formatting issues (markdown fences stripped automatically)
