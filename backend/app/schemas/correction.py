import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CorrectionCreate(BaseModel):
    """Request to create a field correction."""

    field_name: str
    original_value: Optional[str] = None
    corrected_value: str
    line_item_id: Optional[uuid.UUID] = None
    corrected_by: Optional[str] = None
    correction_reason: Optional[str] = None


class CorrectionResponse(BaseModel):
    """Response for a single field correction."""

    id: uuid.UUID
    document_id: uuid.UUID
    field_name: str
    original_value: Optional[str] = None
    corrected_value: str
    line_item_id: Optional[uuid.UUID] = None
    corrected_by: Optional[str] = None
    corrected_at: datetime
    correction_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class CorrectionListResponse(BaseModel):
    """List of corrections for a document."""

    document_id: uuid.UUID
    corrections: list[CorrectionResponse]
    total: int
