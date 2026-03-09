from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AccuracyMetrics(BaseModel):
    """Overall accuracy metrics."""

    total_documents: int
    total_extractions: int
    average_confidence: Optional[float] = None
    documents_with_corrections: int
    correction_rate: float
    fields_corrected: int
    total_fields_extracted: int


class CorrectionStats(BaseModel):
    """Statistics about corrections."""

    total_corrections: int
    corrections_by_field: dict[str, int]
    corrections_by_reason: dict[str, int]
    top_corrected_fields: list[dict[str, int | str]]
    average_corrections_per_document: float


class FieldBreakdown(BaseModel):
    """Breakdown of extraction accuracy by field."""

    field_name: str
    total_extractions: int
    average_confidence: Optional[float] = None
    correction_count: int
    accuracy_rate: float


class AnalyticsResponse(BaseModel):
    """Combined analytics response."""

    accuracy: AccuracyMetrics
    corrections: CorrectionStats
    field_breakdown: list[FieldBreakdown]
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class ComparisonField(BaseModel):
    """A single field comparison between two documents."""

    field_name: str
    document_1_value: Optional[str] = None
    document_2_value: Optional[str] = None
    match: bool
    document_1_confidence: Optional[float] = None
    document_2_confidence: Optional[float] = None


class ComparisonResponse(BaseModel):
    """Response for comparing two documents."""

    document_1_id: str
    document_2_id: str
    document_1_type: str
    document_2_type: str
    matching_fields: int
    mismatched_fields: int
    total_fields: int
    match_percentage: float
    fields: list[ComparisonField]
