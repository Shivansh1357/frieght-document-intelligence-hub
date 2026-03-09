import uuid
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.extracted_data import ExtractedData
from app.models.document import Document
from app.models.extraction_field import ExtractionField

logger = logging.getLogger(__name__)

COMPARABLE_FIELDS = [
    "shipper_name", "shipper_address",
    "consignee_name", "consignee_address",
    "country_of_origin", "country_of_destination",
    "incoterms", "payment_terms",
    "total_declared_value", "currency",
    "total_gross_weight", "total_net_weight", "weight_unit",
    "total_packages", "package_type",
    "document_date", "invoice_number",
    "vessel_name", "voyage_number",
    "mbl_number", "hbl_number",
    "port_of_lading", "port_of_discharge",
]


class ComparisonService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def compare_documents(
        self, doc_id_1: uuid.UUID, doc_id_2: uuid.UUID, org_id: str
    ) -> dict[str, Any]:
        org_uuid = uuid.UUID(org_id)

        # Fetch both documents with extracted data
        stmt1 = (
            select(Document)
            .options(selectinload(Document.extracted_data))
            .where(Document.id == doc_id_1, Document.org_id == org_uuid, Document.is_deleted == False)
        )
        stmt2 = (
            select(Document)
            .options(selectinload(Document.extracted_data))
            .where(Document.id == doc_id_2, Document.org_id == org_uuid, Document.is_deleted == False)
        )

        doc1 = (await self.db.execute(stmt1)).scalar_one_or_none()
        doc2 = (await self.db.execute(stmt2)).scalar_one_or_none()

        if not doc1 or not doc2:
            raise ValueError("One or both documents not found")
        if not doc1.extracted_data or not doc2.extracted_data:
            raise ValueError("Both documents must have extracted data for comparison")

        # Get confidence scores for both
        conf1 = await self._get_confidence_map(doc1.extracted_data.id)
        conf2 = await self._get_confidence_map(doc2.extracted_data.id)

        # Compare fields
        fields = []
        matching = 0
        mismatched = 0
        total = 0

        for field_name in COMPARABLE_FIELDS:
            val1 = getattr(doc1.extracted_data, field_name, None)
            val2 = getattr(doc2.extracted_data, field_name, None)

            # Skip if both are None
            if val1 is None and val2 is None:
                continue

            total += 1
            val1_str = str(val1) if val1 is not None else None
            val2_str = str(val2) if val2 is not None else None

            # Normalize for comparison (case-insensitive, strip whitespace)
            match = False
            if val1_str and val2_str:
                match = val1_str.strip().lower() == val2_str.strip().lower()
            elif val1_str is None and val2_str is None:
                match = True

            if match:
                matching += 1
            else:
                mismatched += 1

            fields.append({
                "field_name": field_name,
                "document_1_value": val1_str,
                "document_2_value": val2_str,
                "match": match,
                "document_1_confidence": conf1.get(field_name),
                "document_2_confidence": conf2.get(field_name),
            })

        match_pct = (matching / total * 100) if total > 0 else 0.0

        return {
            "document_1_id": str(doc_id_1),
            "document_2_id": str(doc_id_2),
            "document_1_type": doc1.document_type,
            "document_2_type": doc2.document_type,
            "matching_fields": matching,
            "mismatched_fields": mismatched,
            "total_fields": total,
            "match_percentage": round(match_pct, 2),
            "fields": fields,
        }

    async def _get_confidence_map(self, extracted_data_id: uuid.UUID) -> dict[str, float]:
        stmt = select(ExtractionField).where(
            ExtractionField.extracted_data_id == extracted_data_id
        )
        result = await self.db.execute(stmt)
        fields = result.scalars().all()
        return {
            f.field_name: float(f.confidence_score) if f.confidence_score else None
            for f in fields
        }
