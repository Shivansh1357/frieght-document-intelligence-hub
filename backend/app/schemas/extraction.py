import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class ExtractionFieldResponse(BaseModel):
    """Response for a single extraction field with confidence."""

    field_name: str
    field_value: Optional[str] = None
    confidence_score: Optional[float] = None
    source_hint: Optional[str] = None

    model_config = {"from_attributes": True}


class LineItemResponse(BaseModel):
    """Response for a single line item."""

    id: uuid.UUID
    line_number: int
    item_number: Optional[str] = None
    description: str
    hs_code: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    currency: Optional[str] = "USD"
    net_weight: Optional[Decimal] = None
    gross_weight: Optional[Decimal] = None
    weight_unit: Optional[str] = "kg"
    package_count: Optional[int] = None
    package_type: Optional[str] = None
    pallet_count: Optional[int] = None
    container_number: Optional[str] = None
    po_number: Optional[str] = None
    confidence: Optional[float] = None

    model_config = {"from_attributes": True}


class ExtractionDataResponse(BaseModel):
    """Response for extracted data from a document."""

    id: uuid.UUID
    document_id: uuid.UUID
    shipper_name: Optional[str] = None
    shipper_address: Optional[str] = None
    consignee_name: Optional[str] = None
    consignee_address: Optional[str] = None
    vessel_name: Optional[str] = None
    voyage_number: Optional[str] = None
    mbl_number: Optional[str] = None
    hbl_number: Optional[str] = None
    port_of_lading: Optional[str] = None
    port_of_discharge: Optional[str] = None
    country_of_origin: Optional[str] = None
    country_of_destination: Optional[str] = None
    incoterms: Optional[str] = None
    payment_terms: Optional[str] = None
    total_declared_value: Optional[Decimal] = None
    currency: Optional[str] = "USD"
    total_gross_weight: Optional[Decimal] = None
    total_net_weight: Optional[Decimal] = None
    weight_unit: Optional[str] = "kg"
    total_packages: Optional[int] = None
    package_type: Optional[str] = None
    document_date: Optional[date] = None
    invoice_number: Optional[str] = None
    reference_numbers: Optional[list[str]] = None
    container_numbers: Optional[list[str]] = None
    overall_confidence: Optional[float] = None
    extraction_model: Optional[str] = None
    extraction_duration_ms: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    line_items: list[LineItemResponse] = []
    extraction_fields: list[ExtractionFieldResponse] = []

    model_config = {"from_attributes": True}


class ExtractionResponse(BaseModel):
    """Response wrapping the full extraction result."""

    document_id: uuid.UUID
    status: str
    extraction: Optional[ExtractionDataResponse] = None
    message: str = ""
