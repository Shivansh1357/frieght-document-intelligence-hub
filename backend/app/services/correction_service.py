import uuid
import logging
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Optional

from sqlalchemy import Date, Integer, Numeric, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.sqltypes import ARRAY

from app.models.document import Document
from app.models.extracted_data import ExtractedData
from app.models.field_correction import FieldCorrection
from app.models.line_item import LineItem

logger = logging.getLogger(__name__)


def _parse_date(value: str) -> date:
    v = value.strip()
    # Prefer dd/mm/yyyy since many freight docs use that format.
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%d.%m.%Y"):
        try:
            return datetime.strptime(v, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Invalid date format: {value!r}. Use YYYY-MM-DD or DD/MM/YYYY.")


def _parse_decimal(value: str) -> Decimal:
    v = value.strip().replace(",", "")
    if not v:
        raise ValueError("Empty number")
    try:
        return Decimal(v)
    except InvalidOperation as e:
        raise ValueError(f"Invalid number: {value!r}") from e


def _parse_int(value: str) -> int:
    v = value.strip().replace(",", "")
    if not v:
        raise ValueError("Empty integer")
    try:
        return int(v)
    except ValueError as e:
        raise ValueError(f"Invalid integer: {value!r}") from e


def _parse_array(value: str) -> list[str]:
    parts = [p.strip() for p in value.replace("\r", "").split("\n")]
    if len(parts) == 1:
        parts = [p.strip() for p in value.split(",")]
    return [p for p in parts if p]


def _coerce_model_value(model, field_name: str, corrected_value: str):
    """
    Coerce a string corrected_value into the correct Python type for the SQLAlchemy column.
    """
    if corrected_value is None:
        return None

    raw = corrected_value.strip()
    if raw == "":
        return None

    col = model.__table__.columns.get(field_name)
    if col is None:
        return raw

    col_type = col.type
    if isinstance(col_type, Date):
        return _parse_date(raw)
    if isinstance(col_type, Integer):
        return _parse_int(raw)
    if isinstance(col_type, Numeric):
        return _parse_decimal(raw)
    if isinstance(col_type, ARRAY):
        return _parse_array(raw)

    return raw


class CorrectionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_correction(
        self,
        document_id: uuid.UUID,
        org_id: str,
        field_name: str,
        corrected_value: str,
        original_value: Optional[str] = None,
        line_item_id: Optional[uuid.UUID] = None,
        corrected_by: Optional[str] = None,
        correction_reason: Optional[str] = None,
    ) -> FieldCorrection:
        """Create a correction record and apply the change to extracted_data."""
        org_uuid = uuid.UUID(org_id)

        correction = FieldCorrection(
            document_id=document_id,
            org_id=org_uuid,
            field_name=field_name,
            original_value=original_value,
            corrected_value=corrected_value,
            line_item_id=line_item_id,
            corrected_by=corrected_by or "user",
            correction_reason=correction_reason,
        )
        self.db.add(correction)

        # Apply correction to extracted_data if it's a header field
        if not line_item_id:
            stmt = select(ExtractedData).where(ExtractedData.document_id == document_id)
            result = await self.db.execute(stmt)
            extracted = result.scalar_one_or_none()
            if extracted and hasattr(extracted, field_name):
                coerced = _coerce_model_value(ExtractedData, field_name, corrected_value)
                setattr(extracted, field_name, coerced)
        else:
            # Apply correction to line item
            stmt = select(LineItem).where(LineItem.id == line_item_id)
            result = await self.db.execute(stmt)
            line_item = result.scalar_one_or_none()
            if line_item and hasattr(line_item, field_name):
                coerced = _coerce_model_value(LineItem, field_name, corrected_value)
                setattr(line_item, field_name, coerced)

        await self.db.flush()
        await self.db.refresh(correction)
        return correction

    async def list_corrections(
        self, document_id: uuid.UUID, org_id: str
    ) -> list[FieldCorrection]:
        stmt = (
            select(FieldCorrection)
            .where(
                FieldCorrection.document_id == document_id,
                FieldCorrection.org_id == uuid.UUID(org_id),
            )
            .order_by(FieldCorrection.corrected_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_correction_count(self, org_id: str) -> int:
        from sqlalchemy import func
        stmt = select(func.count(FieldCorrection.id)).where(
            FieldCorrection.org_id == uuid.UUID(org_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0
