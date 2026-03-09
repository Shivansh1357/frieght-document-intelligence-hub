import uuid
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import Settings
from app.core.claude_client import ClaudeClient, ExtractionError
from app.core.pdf_processor import PDFProcessor
from app.models.document import Document
from app.models.extracted_data import ExtractedData
from app.models.extraction_field import ExtractionField
from app.models.line_item import LineItem

logger = logging.getLogger(__name__)
settings = Settings()


class ExtractionService:
    """Service layer for document extraction operations."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.claude_client = ClaudeClient()
        self.pdf_processor = PDFProcessor()

    @staticmethod
    def _parse_date(value: Any) -> date | None:
        """Convert a date string (e.g. '2025-07-22') to a Python date object."""
        if value is None:
            return None
        if isinstance(value, date):
            return value
        try:
            return datetime.strptime(str(value).strip(), "%Y-%m-%d").date()
        except (ValueError, TypeError):
            # Try other common formats
            for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%B %d, %Y"):
                try:
                    return datetime.strptime(str(value).strip(), fmt).date()
                except ValueError:
                    continue
            logger.warning("Could not parse document_date: %s", value)
            return None

    async def extract_document(
        self,
        document_id: uuid.UUID,
        org_id: str,
        file_path: str,
        file_mime_type: str,
    ) -> ExtractedData:
        """Run the full extraction pipeline: file -> images -> Claude -> DB."""
        # Update document status to processing
        stmt = select(Document).where(Document.id == document_id)
        result = await self.db.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc:
            doc.status = "processing"
            await self.db.flush()

        try:
            # Convert file to images
            images = self.pdf_processor.process_file(file_path, file_mime_type)

            # Call Claude API
            extraction_result = self.claude_client.extract_document(images)

            meta = extraction_result.pop("_meta", {})
            model = meta.get("model", settings.claude_model)
            duration_ms = meta.get("duration_ms", 0)

            # Save extraction result to DB
            extracted_data = await self.save_extraction_result(
                document_id=document_id,
                org_id=org_id,
                result=extraction_result,
                model=model,
                duration_ms=duration_ms,
                raw_response=extraction_result,
            )

            # Update document status
            if doc:
                doc.status = "extracted"
                doc.processed_at = datetime.utcnow()
                # Update document_type if auto-detected
                detected_type = extraction_result.get("document_type", "unknown")
                if doc.document_type == "auto" and detected_type != "unknown":
                    doc.document_type = detected_type
                await self.db.flush()

            return extracted_data

        except ExtractionError as e:
            logger.error("Extraction failed for document %s: %s", document_id, str(e))
            if doc:
                doc.status = "uploaded"  # Reset to uploaded on failure
                await self.db.flush()
            raise
        except Exception as e:
            logger.error("Unexpected error during extraction for document %s: %s", document_id, str(e))
            if doc:
                doc.status = "uploaded"
                await self.db.flush()
            raise

    async def get_extraction(
        self, document_id: uuid.UUID, org_id: str
    ) -> Optional[ExtractedData]:
        """Get the extraction result for a document."""
        stmt = (
            select(ExtractedData)
            .options(
                selectinload(ExtractedData.line_items),
                selectinload(ExtractedData.extraction_fields),
            )
            .where(
                ExtractedData.document_id == document_id,
                ExtractedData.org_id == uuid.UUID(org_id),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def save_extraction_result(
        self,
        document_id: uuid.UUID,
        org_id: str,
        result: dict[str, Any],
        model: str,
        duration_ms: int,
        raw_response: dict,
    ) -> ExtractedData:
        """Parse and persist extraction result to relational tables."""
        org_uuid = uuid.UUID(org_id)
        fields = result.get("fields", {})

        def get_value(field_name: str):
            field = fields.get(field_name, {})
            if isinstance(field, dict):
                return field.get("value")
            return field

        def get_confidence(field_name: str) -> Optional[float]:
            field = fields.get(field_name, {})
            if isinstance(field, dict):
                return field.get("confidence")
            return None

        def to_decimal(val) -> Optional[Decimal]:
            if val is None:
                return None
            try:
                return Decimal(str(val))
            except Exception:
                return None

        # Create ExtractedData record
        extracted = ExtractedData(
            document_id=document_id,
            org_id=org_uuid,
            shipper_name=get_value("shipper_name"),
            shipper_address=get_value("shipper_address"),
            consignee_name=get_value("consignee_name"),
            consignee_address=get_value("consignee_address"),
            vessel_name=get_value("vessel_name"),
            voyage_number=get_value("voyage_number"),
            mbl_number=get_value("mbl_number"),
            hbl_number=get_value("hbl_number"),
            port_of_lading=get_value("port_of_lading"),
            port_of_discharge=get_value("port_of_discharge"),
            country_of_origin=get_value("country_of_origin"),
            country_of_destination=get_value("country_of_destination"),
            incoterms=get_value("incoterms"),
            payment_terms=get_value("payment_terms"),
            total_declared_value=to_decimal(get_value("total_declared_value")),
            currency=get_value("currency") or "USD",
            total_gross_weight=to_decimal(get_value("total_gross_weight")),
            total_net_weight=to_decimal(get_value("total_net_weight")),
            weight_unit=get_value("weight_unit") or "kg",
            total_packages=get_value("total_packages"),
            package_type=get_value("package_type"),
            document_date=self._parse_date(get_value("document_date")),
            invoice_number=get_value("invoice_number"),
            reference_numbers=get_value("reference_numbers") or [],
            container_numbers=get_value("container_numbers") or [],
            overall_confidence=to_decimal(result.get("overall_confidence")),
            extraction_model=model,
            extraction_duration_ms=duration_ms,
            raw_ai_response=raw_response,
        )
        self.db.add(extracted)
        await self.db.flush()
        await self.db.refresh(extracted)

        # Create ExtractionField records for confidence tracking
        for field_name, field_data in fields.items():
            if isinstance(field_data, dict):
                ef = ExtractionField(
                    extracted_data_id=extracted.id,
                    field_name=field_name,
                    field_value=str(field_data.get("value")) if field_data.get("value") is not None else None,
                    confidence_score=to_decimal(field_data.get("confidence")),
                )
                self.db.add(ef)

        # Create LineItem records
        line_items = result.get("line_items", [])
        for item in line_items:
            li = LineItem(
                extracted_data_id=extracted.id,
                org_id=org_uuid,
                line_number=item.get("line_number", 0),
                item_number=item.get("item_number"),
                description=item.get("description", "Unknown"),
                hs_code=item.get("hs_code"),
                quantity=to_decimal(item.get("quantity")),
                unit=item.get("unit"),
                unit_price=to_decimal(item.get("unit_price")),
                total_amount=to_decimal(item.get("total_amount")),
                currency=item.get("currency", "USD"),
                net_weight=to_decimal(item.get("net_weight")),
                gross_weight=to_decimal(item.get("gross_weight")),
                weight_unit=item.get("weight_unit", "kg"),
                package_count=item.get("package_count"),
                pallet_count=item.get("pallet_count"),
                container_number=item.get("container_number"),
                po_number=item.get("po_number"),
                confidence=to_decimal(item.get("confidence")),
            )
            self.db.add(li)

        await self.db.flush()
        await self.db.refresh(extracted)
        return extracted

    async def delete_extraction(self, document_id: uuid.UUID) -> bool:
        """Delete existing extraction data for a document (used before re-extraction)."""
        stmt = delete(ExtractedData).where(ExtractedData.document_id == document_id)
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount > 0
