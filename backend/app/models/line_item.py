import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class LineItem(Base):
    __tablename__ = "line_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    extracted_data_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("extracted_data.id", ondelete="CASCADE"),
        nullable=False,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    item_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    hs_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    quantity: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 3), nullable=True)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    unit_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 4), nullable=True)
    total_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 2), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(3), default="USD")
    net_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 3), nullable=True)
    gross_weight: Mapped[Optional[Decimal]] = mapped_column(Numeric(15, 3), nullable=True)
    weight_unit: Mapped[Optional[str]] = mapped_column(String(10), default="kg")
    package_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    package_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    pallet_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    container_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    po_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=func.now())

    # Relationships
    extracted_data = relationship("ExtractedData", back_populates="line_items")
