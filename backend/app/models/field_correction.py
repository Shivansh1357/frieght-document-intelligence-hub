import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class FieldCorrection(Base):
    __tablename__ = "field_corrections"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    original_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corrected_value: Mapped[str] = mapped_column(Text, nullable=False)
    line_item_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("line_items.id"), nullable=True
    )
    corrected_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    corrected_at: Mapped[datetime] = mapped_column(default=func.now())
    correction_reason: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationships
    document = relationship("Document", back_populates="corrections")
