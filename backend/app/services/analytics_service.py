import uuid
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select, func, case, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.extracted_data import ExtractedData
from app.models.extraction_field import ExtractionField
from app.models.field_correction import FieldCorrection

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_accuracy_metrics(self, org_id: str, days: int = 30) -> dict[str, Any]:
        org_uuid = uuid.UUID(org_id)
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Total documents
        total_docs_stmt = select(func.count(Document.id)).where(
            Document.org_id == org_uuid,
            Document.is_deleted == False,
            Document.created_at >= cutoff,
        )
        total_docs = (await self.db.execute(total_docs_stmt)).scalar() or 0

        # Total extractions (documents with extracted data)
        total_extractions_stmt = select(func.count(ExtractedData.id)).where(
            ExtractedData.org_id == org_uuid,
            ExtractedData.created_at >= cutoff,
        )
        total_extractions = (await self.db.execute(total_extractions_stmt)).scalar() or 0

        # Average confidence
        avg_confidence_stmt = select(func.avg(ExtractedData.overall_confidence)).where(
            ExtractedData.org_id == org_uuid,
            ExtractedData.created_at >= cutoff,
        )
        avg_confidence = (await self.db.execute(avg_confidence_stmt)).scalar()
        avg_confidence = float(avg_confidence) if avg_confidence else None

        # Documents with corrections
        docs_with_corrections_stmt = select(
            func.count(distinct(FieldCorrection.document_id))
        ).where(
            FieldCorrection.org_id == org_uuid,
            FieldCorrection.corrected_at >= cutoff,
        )
        docs_with_corrections = (await self.db.execute(docs_with_corrections_stmt)).scalar() or 0

        # Total fields corrected
        fields_corrected_stmt = select(func.count(FieldCorrection.id)).where(
            FieldCorrection.org_id == org_uuid,
            FieldCorrection.corrected_at >= cutoff,
        )
        fields_corrected = (await self.db.execute(fields_corrected_stmt)).scalar() or 0

        # Total fields extracted
        total_fields_stmt = select(func.count(ExtractionField.id)).join(
            ExtractedData
        ).where(
            ExtractedData.org_id == org_uuid,
            ExtractionField.created_at >= cutoff,
        )
        total_fields = (await self.db.execute(total_fields_stmt)).scalar() or 0

        correction_rate = (docs_with_corrections / total_extractions * 100) if total_extractions > 0 else 0.0

        return {
            "total_documents": total_docs,
            "total_extractions": total_extractions,
            "average_confidence": avg_confidence,
            "documents_with_corrections": docs_with_corrections,
            "correction_rate": round(correction_rate, 2),
            "fields_corrected": fields_corrected,
            "total_fields_extracted": total_fields,
        }

    async def get_correction_stats(self, org_id: str, days: int = 30) -> dict[str, Any]:
        org_uuid = uuid.UUID(org_id)
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Total corrections
        total_stmt = select(func.count(FieldCorrection.id)).where(
            FieldCorrection.org_id == org_uuid,
            FieldCorrection.corrected_at >= cutoff,
        )
        total = (await self.db.execute(total_stmt)).scalar() or 0

        # Corrections by field
        by_field_stmt = (
            select(FieldCorrection.field_name, func.count(FieldCorrection.id))
            .where(FieldCorrection.org_id == org_uuid, FieldCorrection.corrected_at >= cutoff)
            .group_by(FieldCorrection.field_name)
            .order_by(func.count(FieldCorrection.id).desc())
        )
        by_field = (await self.db.execute(by_field_stmt)).all()
        corrections_by_field = {row[0]: row[1] for row in by_field}

        # Corrections by reason
        by_reason_stmt = (
            select(FieldCorrection.correction_reason, func.count(FieldCorrection.id))
            .where(
                FieldCorrection.org_id == org_uuid,
                FieldCorrection.corrected_at >= cutoff,
                FieldCorrection.correction_reason.isnot(None),
            )
            .group_by(FieldCorrection.correction_reason)
        )
        by_reason = (await self.db.execute(by_reason_stmt)).all()
        corrections_by_reason = {row[0]: row[1] for row in by_reason}

        # Top corrected fields
        top_fields = [{"field_name": k, "count": v} for k, v in list(corrections_by_field.items())[:10]]

        # Average corrections per document
        docs_count_stmt = select(func.count(distinct(FieldCorrection.document_id))).where(
            FieldCorrection.org_id == org_uuid,
            FieldCorrection.corrected_at >= cutoff,
        )
        docs_count = (await self.db.execute(docs_count_stmt)).scalar() or 1
        avg_per_doc = total / docs_count if docs_count > 0 else 0

        return {
            "total_corrections": total,
            "corrections_by_field": corrections_by_field,
            "corrections_by_reason": corrections_by_reason,
            "top_corrected_fields": top_fields,
            "average_corrections_per_document": round(avg_per_doc, 2),
        }

    async def get_field_breakdown(self, org_id: str, days: int = 30) -> list[dict[str, Any]]:
        org_uuid = uuid.UUID(org_id)
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Get per-field extraction stats with correction counts
        fields_stmt = (
            select(
                ExtractionField.field_name,
                func.count(ExtractionField.id).label("total_extractions"),
                func.avg(ExtractionField.confidence_score).label("avg_confidence"),
            )
            .join(ExtractedData)
            .where(
                ExtractedData.org_id == org_uuid,
                ExtractionField.created_at >= cutoff,
            )
            .group_by(ExtractionField.field_name)
        )
        fields_result = (await self.db.execute(fields_stmt)).all()

        # Get correction counts per field
        corrections_stmt = (
            select(
                FieldCorrection.field_name,
                func.count(FieldCorrection.id).label("correction_count"),
            )
            .where(
                FieldCorrection.org_id == org_uuid,
                FieldCorrection.corrected_at >= cutoff,
            )
            .group_by(FieldCorrection.field_name)
        )
        corrections_result = (await self.db.execute(corrections_stmt)).all()
        correction_map = {row[0]: row[1] for row in corrections_result}

        breakdown = []
        for row in fields_result:
            field_name = row[0]
            total = row[1]
            avg_conf = float(row[2]) if row[2] else None
            corrections = correction_map.get(field_name, 0)
            accuracy = ((total - corrections) / total * 100) if total > 0 else 100.0

            breakdown.append({
                "field_name": field_name,
                "total_extractions": total,
                "average_confidence": round(avg_conf, 2) if avg_conf else None,
                "correction_count": corrections,
                "accuracy_rate": round(accuracy, 2),
            })

        return sorted(breakdown, key=lambda x: x["accuracy_rate"])
