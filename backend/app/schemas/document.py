import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    """Response after a document is uploaded."""

    id: uuid.UUID
    file_name: str
    document_type: str
    status: str
    uploaded_at: datetime
    message: str = "Document uploaded successfully. Extraction will begin shortly."
    extraction_warning: Optional[str] = None  # Populated when extraction fails with a specific reason

    model_config = {"from_attributes": True}


class DocumentSummary(BaseModel):
    """Summary representation of a document for list views."""

    id: uuid.UUID
    file_name: str
    document_type: str
    status: str
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    overall_confidence: Optional[float] = None
    shipper_name: Optional[str] = None
    consignee_name: Optional[str] = None
    invoice_number: Optional[str] = None
    country_of_origin: Optional[str] = None
    total_declared_value: Optional[float] = None
    currency: Optional[str] = None

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    items: list[DocumentSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class DocumentDetailResponse(BaseModel):
    """Full document detail including extracted data."""

    id: uuid.UUID
    org_id: uuid.UUID
    file_name: str
    file_path: str
    file_size_bytes: Optional[int] = None
    file_mime_type: Optional[str] = None
    file_hash: Optional[str] = None
    document_type: str
    status: str
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    extracted_data: Optional["ExtractionDataResponse"] = None
    corrections: list["CorrectionResponse"] = []

    model_config = {"from_attributes": True}


class DocumentUpdateRequest(BaseModel):
    """Request to update document fields."""

    status: Optional[str] = None
    document_type: Optional[str] = None
    corrections: Optional[dict[str, str]] = Field(
        default=None, description="Map of field_name -> corrected_value"
    )
    corrected_by: Optional[str] = Field(
        default=None, description="Name of the user making corrections"
    )


class DuplicateCheckRequest(BaseModel):
    """Request to check for duplicate documents."""

    file_hash: Optional[str] = None
    file_name: Optional[str] = None
    invoice_number: Optional[str] = None


class DuplicateCheckResponse(BaseModel):
    """Response for duplicate check."""

    is_duplicate: bool
    matching_documents: list[DocumentSummary] = []


# Forward reference imports
from app.schemas.extraction import ExtractionDataResponse  # noqa: E402
from app.schemas.correction import CorrectionResponse  # noqa: E402

DocumentDetailResponse.model_rebuild()
