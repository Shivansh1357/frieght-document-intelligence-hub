// Document status and type unions
export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "extracted"
  | "reviewed"
  | "approved";

export type DocumentType =
  | "commercial_invoice"
  | "packing_list"
  | "bill_of_lading"
  | "combined"
  | "auto";

// Summary item returned in the list endpoint
export interface DocumentSummary {
  id: string;
  file_name: string;
  document_type: DocumentType;
  status: DocumentStatus;
  uploaded_at: string;
  processed_at: string | null;
  overall_confidence: number | null;
  shipper_name: string | null;
  consignee_name: string | null;
  invoice_number: string | null;
  country_of_origin: string | null;
  total_declared_value: number | null;
  currency: string | null;
}

// GET /documents/ response
export interface DocumentListResponse {
  items: DocumentSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Line item within extracted data
export interface LineItem {
  id: string;
  line_number: number;
  item_number: string | null;
  description: string;
  hs_code: string | null;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_amount: number | null;
  currency: string;
  net_weight: number | null;
  gross_weight: number | null;
  weight_unit: string;
  package_count: number | null;
  pallet_count: number | null;
  container_number: string | null;
  po_number: string | null;
  confidence: number;
}

// Extraction field
export interface ExtractionField {
  field_name: string;
  field_value: string | null;
  confidence_score: number;
}

// Extracted data nested in document detail
export interface ExtractedData {
  id: string;
  document_id: string;
  shipper_name: string | null;
  shipper_address: string | null;
  consignee_name: string | null;
  consignee_address: string | null;
  vessel_name: string | null;
  voyage_number: string | null;
  mbl_number: string | null;
  hbl_number: string | null;
  port_of_lading: string | null;
  port_of_discharge: string | null;
  country_of_origin: string | null;
  country_of_destination: string | null;
  incoterms: string | null;
  payment_terms: string | null;
  total_declared_value: number | null;
  currency: string;
  total_gross_weight: number | null;
  total_net_weight: number | null;
  weight_unit: string;
  total_packages: number | null;
  package_type: string | null;
  document_date: string | null;
  invoice_number: string | null;
  reference_numbers: string[];
  container_numbers: string[];
  overall_confidence: number;
  line_items: LineItem[];
  extraction_fields: ExtractionField[];
}

// Field correction
export interface FieldCorrection {
  id: string;
  field_name: string;
  original_value: string | null;
  corrected_value: string;
  corrected_by: string | null;
  corrected_at: string;
  correction_reason: string | null;
  line_item_id: string | null;
}

// GET /documents/{id} returns the Document model directly
export interface DocumentDetail {
  id: string;
  org_id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  file_mime_type: string;
  file_hash: string;
  document_type: DocumentType;
  status: DocumentStatus;
  uploaded_at: string;
  processed_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  extracted_data: ExtractedData | null;
  corrections: FieldCorrection[];
}

export interface CorrectionResponse extends FieldCorrection {}

// GET /analytics/accuracy
export interface AccuracyAnalytics {
  total_documents: number;
  total_extractions: number;
  average_confidence: number | null;
  documents_with_corrections: number;
  correction_rate: number;
  fields_corrected: number;
  total_fields_extracted: number;
}

// GET /analytics/corrections
export interface CorrectionStats {
  total_corrections: number;
  corrections_by_field: Record<string, number>;
  corrections_by_reason: Record<string, number>;
  top_corrected_fields: Array<{ field_name: string; count: number }>;
  average_corrections_per_document: number;
}

// GET /analytics/field-breakdown
export interface FieldBreakdownItem {
  field_name: string;
  total_extractions: number;
  average_confidence: number | null;
  correction_count: number;
  accuracy_rate: number;
}

// GET /comparison/compare/{id1}/{id2}
export interface ComparisonFieldResult {
  field_name: string;
  document_1_value: string | null;
  document_2_value: string | null;
  match: boolean;
}

export interface ComparisonResult {
  document_1_id: string;
  document_2_id: string;
  document_1_type: string;
  document_2_type: string;
  matching_fields: number;
  mismatched_fields: number;
  total_fields: number;
  match_percentage: number;
  fields: ComparisonFieldResult[];
}
