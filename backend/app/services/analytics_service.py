import uuid
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy import select, func, case, distinct, literal
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.extracted_data import ExtractedData
from app.models.extraction_field import ExtractionField
from app.models.field_correction import FieldCorrection
from app.models.line_item import LineItem

logger = logging.getLogger(__name__)

# Line item fields to track in analytics
LINE_ITEM_FIELDS = [
    "description", "hs_code", "quantity", "unit", "unit_price",
    "total_amount", "net_weight", "gross_weight", "container_number", "po_number",
]


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

        # Total header fields extracted
        header_fields_stmt = select(func.count(ExtractionField.id)).join(
            ExtractedData
        ).where(
            ExtractedData.org_id == org_uuid,
            ExtractionField.created_at >= cutoff,
        )
        header_fields = (await self.db.execute(header_fields_stmt)).scalar() or 0

        # Total line item fields extracted (each line item has N trackable fields)
        line_item_count_stmt = select(func.count(LineItem.id)).where(
            LineItem.org_id == org_uuid,
            LineItem.created_at >= cutoff,
        )
        line_item_count = (await self.db.execute(line_item_count_stmt)).scalar() or 0
        line_item_fields = line_item_count * len(LINE_ITEM_FIELDS)

        total_fields = header_fields + line_item_fields

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

        # Corrections by field (prefix line item fields to distinguish from header fields)
        labeled_field = case(
            (FieldCorrection.line_item_id.isnot(None),
             literal("line_item.") + FieldCorrection.field_name),
            else_=FieldCorrection.field_name,
        )
        by_field_stmt = (
            select(labeled_field.label("labeled_field"), func.count(FieldCorrection.id))
            .where(FieldCorrection.org_id == org_uuid, FieldCorrection.corrected_at >= cutoff)
            .group_by(labeled_field)
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

        # --- Header field stats (from ExtractionField) ---
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

        # Header field correction counts (line_item_id IS NULL)
        header_corrections_stmt = (
            select(
                FieldCorrection.field_name,
                func.count(FieldCorrection.id).label("correction_count"),
            )
            .where(
                FieldCorrection.org_id == org_uuid,
                FieldCorrection.corrected_at >= cutoff,
                FieldCorrection.line_item_id.is_(None),
            )
            .group_by(FieldCorrection.field_name)
        )
        header_corrections_result = (await self.db.execute(header_corrections_stmt)).all()
        header_correction_map = {row[0]: row[1] for row in header_corrections_result}

        breakdown = []
        for row in fields_result:
            field_name = row[0]
            total = row[1]
            avg_conf = float(row[2]) if row[2] else None
            corrections = header_correction_map.get(field_name, 0)
            accuracy = ((total - corrections) / total * 100) if total > 0 else 100.0

            breakdown.append({
                "field_name": field_name,
                "total_extractions": total,
                "average_confidence": round(avg_conf, 2) if avg_conf else None,
                "correction_count": corrections,
                "accuracy_rate": round(accuracy, 2),
            })

        # --- Line item field stats ---
        # Total line items in period = number of "extractions" per line item field
        line_item_count_stmt = select(func.count(LineItem.id)).where(
            LineItem.org_id == org_uuid,
            LineItem.created_at >= cutoff,
        )
        total_line_items = (await self.db.execute(line_item_count_stmt)).scalar() or 0

        if total_line_items > 0:
            # Average confidence across all line items
            avg_li_confidence_stmt = select(func.avg(LineItem.confidence)).where(
                LineItem.org_id == org_uuid,
                LineItem.created_at >= cutoff,
            )
            avg_li_confidence = (await self.db.execute(avg_li_confidence_stmt)).scalar()
            avg_li_conf = float(avg_li_confidence) if avg_li_confidence else None

            # Line item correction counts by field (line_item_id IS NOT NULL)
            li_corrections_stmt = (
                select(
                    FieldCorrection.field_name,
                    func.count(FieldCorrection.id).label("correction_count"),
                )
                .where(
                    FieldCorrection.org_id == org_uuid,
                    FieldCorrection.corrected_at >= cutoff,
                    FieldCorrection.line_item_id.isnot(None),
                )
                .group_by(FieldCorrection.field_name)
            )
            li_corrections_result = (await self.db.execute(li_corrections_stmt)).all()
            li_correction_map = {row[0]: row[1] for row in li_corrections_result}

            for field_name in LINE_ITEM_FIELDS:
                corrections = li_correction_map.get(field_name, 0)
                accuracy = ((total_line_items - corrections) / total_line_items * 100) if total_line_items > 0 else 100.0

                breakdown.append({
                    "field_name": f"line_item.{field_name}",
                    "total_extractions": total_line_items,
                    "average_confidence": round(avg_li_conf, 2) if avg_li_conf else None,
                    "correction_count": corrections,
                    "accuracy_rate": round(accuracy, 2),
                })

        return sorted(breakdown, key=lambda x: x["accuracy_rate"])
