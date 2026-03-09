import uuid
import logging
from typing import Optional
from datetime import datetime, date

from sqlalchemy import select, func, or_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.models.extracted_data import ExtractedData
from app.models.line_item import LineItem

logger = logging.getLogger(__name__)


class DocumentService:
    """Service layer for document CRUD operations."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_document(
        self,
        org_id: str,
        file_name: str,
        file_path: str,
        document_type: str,
        file_size_bytes: Optional[int] = None,
        file_mime_type: Optional[str] = None,
        file_hash: Optional[str] = None,
    ) -> Document:
        """Create a new document record after file upload."""
        doc = Document(
            org_id=uuid.UUID(org_id),
            file_name=file_name,
            file_path=file_path,
            document_type=document_type,
            file_size_bytes=file_size_bytes,
            file_mime_type=file_mime_type,
            file_hash=file_hash,
            status="uploaded",
        )
        self.db.add(doc)
        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    async def get_document(self, document_id: uuid.UUID, org_id: str) -> Optional[Document]:
        """Retrieve a single document by ID, scoped to organization."""
        stmt = (
            select(Document)
            .options(selectinload(Document.extracted_data), selectinload(Document.corrections))
            .where(
                Document.id == document_id,
                Document.org_id == uuid.UUID(org_id),
                Document.is_deleted == False,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_documents(
        self,
        org_id: str,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        document_type: Optional[str] = None,
        search: Optional[str] = None,
        country_of_origin: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> tuple[list[Document], int]:
        """List documents with filtering, search, and pagination.

        Returns a tuple of (documents, total_count).
        """
        # Base query filters
        base_filter = [
            Document.org_id == uuid.UUID(org_id),
            Document.is_deleted == False,
        ]

        if status:
            base_filter.append(Document.status == status)
        if document_type:
            base_filter.append(Document.document_type == document_type)

        # Count query
        count_stmt = select(func.count(Document.id)).where(*base_filter)

        # Main query with optional search join
        stmt = (
            select(Document)
            .options(selectinload(Document.extracted_data))
            .where(*base_filter)
        )

        needs_join = False

        if search or country_of_origin or date_from or date_to:
            if not needs_join:
                stmt = stmt.outerjoin(ExtractedData, Document.id == ExtractedData.document_id)
                count_stmt = count_stmt.outerjoin(ExtractedData, Document.id == ExtractedData.document_id)
                needs_join = True

        if search:
            search_term = f"%{search}%"
            # Also join line_items for commodity search
            stmt = stmt.outerjoin(LineItem, ExtractedData.id == LineItem.extracted_data_id)
            count_stmt = count_stmt.outerjoin(LineItem, ExtractedData.id == LineItem.extracted_data_id)

            search_filter = or_(
                Document.file_name.ilike(search_term),
                ExtractedData.shipper_name.ilike(search_term),
                ExtractedData.consignee_name.ilike(search_term),
                ExtractedData.invoice_number.ilike(search_term),
                # Commodity search via line item descriptions
                LineItem.description.ilike(search_term),
                # Reference number search (cast array to string for ilike)
                cast(ExtractedData.reference_numbers, String).ilike(search_term),
            )
            stmt = stmt.where(search_filter)
            count_stmt = count_stmt.where(search_filter)

        if country_of_origin:
            stmt = stmt.where(ExtractedData.country_of_origin.ilike(f"%{country_of_origin}%"))
            count_stmt = count_stmt.where(ExtractedData.country_of_origin.ilike(f"%{country_of_origin}%"))

        # Date range filter on upload date
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d")
                stmt = stmt.where(Document.uploaded_at >= from_date)
                count_stmt = count_stmt.where(Document.uploaded_at >= from_date)
            except ValueError:
                pass
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                stmt = stmt.where(Document.uploaded_at <= to_date)
                count_stmt = count_stmt.where(Document.uploaded_at <= to_date)
            except ValueError:
                pass

        # Get total count
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination and ordering
        offset = (page - 1) * page_size
        stmt = stmt.order_by(Document.uploaded_at.desc()).offset(offset).limit(page_size)

        result = await self.db.execute(stmt)
        documents = list(result.scalars().unique().all())

        return documents, total

    async def update_document(
        self,
        document_id: uuid.UUID,
        org_id: str,
        **kwargs,
    ) -> Optional[Document]:
        """Update document fields."""
        doc = await self.get_document(document_id, org_id)
        if not doc:
            return None

        for key, value in kwargs.items():
            if hasattr(doc, key) and value is not None:
                setattr(doc, key, value)

        doc.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    async def soft_delete(self, document_id: uuid.UUID, org_id: str) -> bool:
        """Soft-delete a document by setting is_deleted=True."""
        doc = await self.get_document(document_id, org_id)
        if not doc:
            return False
        doc.is_deleted = True
        doc.updated_at = datetime.utcnow()
        await self.db.flush()
        return True

    async def check_duplicate(
        self,
        org_id: str,
        file_hash: Optional[str] = None,
        file_name: Optional[str] = None,
        invoice_number: Optional[str] = None,
    ) -> list[Document]:
        """Check for duplicate documents by hash, name, or invoice number."""
        conditions = []
        if file_hash:
            conditions.append(Document.file_hash == file_hash)
        if file_name:
            conditions.append(Document.file_name == file_name)

        if not conditions and not invoice_number:
            return []

        stmt = select(Document).where(
            Document.org_id == uuid.UUID(org_id),
            Document.is_deleted == False,
        )

        if conditions:
            stmt = stmt.where(or_(*conditions))

        if invoice_number:
            stmt = stmt.outerjoin(ExtractedData).where(
                ExtractedData.invoice_number == invoice_number
            )

        result = await self.db.execute(stmt)
        return list(result.scalars().all())
