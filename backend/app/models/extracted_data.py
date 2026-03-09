import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    ARRAY,
    Date,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class ExtractedData(TimestampMixin, Base):
    __tablename__ = "extracted_data"
    __table_args__ = (UniqueConstraint("document_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )

    # Shipper / Consignee
    shipper_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    shipper_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consignee_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    consignee_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Vessel
    vessel_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    voyage_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Bill of Lading
    mbl_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    hbl_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Ports
    port_of_lading: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    port_of_discharge: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Countries
    country_of_origin: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country_of_destination: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Terms
    incoterms: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    payment_terms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Values
    total_declared_value: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 2), nullable=True
    )
    currency: Mapped[Optional[str]] = mapped_column(String(3), default="USD")

    # Weights
    total_gross_weight: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 3), nullable=True
    )
    total_net_weight: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(15, 3), nullable=True
    )
    weight_unit: Mapped[Optional[str]] = mapped_column(String(10), default="kg")

    # Packages
    total_packages: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    package_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Document info
    document_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    invoice_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reference_numbers: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    container_numbers: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )

    # AI metadata
    overall_confidence: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    extraction_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    extraction_duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    raw_ai_response: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationships
    document = relationship("Document", back_populates="extracted_data")
    line_items = relationship(
        "LineItem", back_populates="extracted_data", lazy="selectin", cascade="all, delete-orphan"
    )
    extraction_fields = relationship(
        "ExtractionField",
        back_populates="extracted_data",
        lazy="selectin",
        cascade="all, delete-orphan",
    )
