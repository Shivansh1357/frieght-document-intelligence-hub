import math
import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.config import Settings
from app.core.file_storage import FileStorage
from app.dependencies import DbDep, OrgIdDep
from app.schemas.correction import CorrectionCreate, CorrectionListResponse, CorrectionResponse
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentSummary,
    DocumentUpdateRequest,
    DocumentUploadResponse,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
)
from app.schemas.extraction import ExtractionResponse
from app.services.correction_service import CorrectionService
from app.services.document_service import DocumentService
from app.services.extraction_service import ExtractionService

logger = logging.getLogger(__name__)
settings = Settings()
file_storage = FileStorage()

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/tiff",
}

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse, status_code=201)
async def upload_document(
    db: DbDep,
    org_id: OrgIdDep,
    file: UploadFile = File(...),
    document_type: str = Form(default="auto"),
):
    """Upload a freight document (PDF or image) and trigger AI extraction.

    Accepts PDF, PNG, and JPEG files up to 20MB. The document will be saved
    and queued for extraction processing by Claude.
    """
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}. Allowed: PDF, PNG, JPEG, TIFF",
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > settings.max_file_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size // (1024 * 1024)}MB",
        )

    # Compute hash and save file
    file_hash = FileStorage.compute_hash(content)
    file_path = file_storage.save_file(file.filename or "document", content)

    # Create document record and commit so it persists even if extraction fails
    doc_service = DocumentService(db)
    doc = await doc_service.create_document(
        org_id=org_id,
        file_name=file.filename or "document",
        file_path=file_path,
        document_type=document_type,
        file_size_bytes=len(content),
        file_mime_type=content_type,
        file_hash=file_hash,
    )
    await db.commit()

    # Cache scalar values NOW — after a rollback the ORM object becomes
    # detached/expired and accessing any attribute on it triggers a sync
    # lazy-load inside an async context, causing MissingGreenlet.
    doc_id: uuid.UUID = doc.id
    doc_file_name: str = doc.file_name

    # Run extraction in the same session (now on a fresh transaction)
    extraction_warning: str | None = None
    try:
        extraction_service = ExtractionService(db)
        await extraction_service.extract_document(
            document_id=doc_id,
            org_id=org_id,
            file_path=file_path,
            file_mime_type=content_type,
        )
        await db.commit()
    except Exception as e:
        await db.rollback()
        err_str = str(e)

        if "CREDIT_EXHAUSTED" in err_str:
            extraction_warning = (
                "Extraction failed: Anthropic API credit balance is too low. "
                "Please add credits at console.anthropic.com and re-extract this document."
            )
        elif "RATE_LIMITED" in err_str:
            extraction_warning = (
                "Extraction failed: Anthropic API rate limit reached. "
                "Please wait a moment and re-extract this document."
            )
        elif "AUTH_ERROR" in err_str:
            extraction_warning = (
                "Extraction failed: Anthropic API key is invalid or expired. "
                "Please check your API key in the environment settings."
            )
        elif "CONNECTION_ERROR" in err_str or "502" in err_str or "connection error" in err_str.lower():
            extraction_warning = (
                "Extraction failed: Could not reach the Anthropic API (connection error / 502). "
                "The document was saved — please try re-extracting once the API is reachable."
            )
        elif "API_ERROR" in err_str or "anthropic" in err_str.lower():
            extraction_warning = f"Extraction failed: Anthropic API error. The document was saved and can be re-extracted. ({type(e).__name__})"
        else:
            extraction_warning = f"Extraction failed unexpectedly. The document was saved. ({type(e).__name__})"

        logger.error("Extraction failed for %s: %s", doc_id, err_str[:300])

    # Re-fetch to get latest status (uses plain uuid, not detached ORM object)
    doc_service2 = DocumentService(db)
    updated_doc = await doc_service2.get_document(doc_id, org_id)
    if not updated_doc:
        return DocumentUploadResponse(
            id=doc_id,
            file_name=doc_file_name,
            document_type="auto",
            status="uploaded",
            uploaded_at=datetime.utcnow(),
            message="Document uploaded but could not verify status.",
            extraction_warning=extraction_warning,
        )

    return DocumentUploadResponse(
        id=updated_doc.id,
        file_name=updated_doc.file_name,
        document_type=updated_doc.document_type,
        status=updated_doc.status,
        uploaded_at=updated_doc.uploaded_at,
        message=f"Document uploaded and {'extracted' if updated_doc.status == 'extracted' else 'queued for extraction'}.",
        extraction_warning=extraction_warning,
    )


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    db: DbDep,
    org_id: OrgIdDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: Optional[str] = Query(default=None),
    document_type: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None, description="Search by file name or invoice number"),
    country_of_origin: Optional[str] = Query(default=None),
    date_from: Optional[str] = Query(default=None),
    date_to: Optional[str] = Query(default=None),
):
    """List documents with search, filtering, and pagination.

    Supports filtering by status and document_type, and text search
    across file names and invoice numbers.
    """
    doc_service = DocumentService(db)
    documents, total = await doc_service.list_documents(
        org_id=org_id,
        page=page,
        page_size=page_size,
        status=status,
        document_type=document_type,
        search=search,
        country_of_origin=country_of_origin,
        date_from=date_from,
        date_to=date_to,
    )

    items = []
    for doc in documents:
        confidence = None
        if doc.extracted_data:
            confidence = (
                float(doc.extracted_data.overall_confidence)
                if doc.extracted_data.overall_confidence
                else None
            )
        items.append(
            DocumentSummary(
                id=doc.id,
                file_name=doc.file_name,
                document_type=doc.document_type,
                status=doc.status,
                uploaded_at=doc.uploaded_at,
                processed_at=doc.processed_at,
                overall_confidence=confidence,
                shipper_name=doc.extracted_data.shipper_name if doc.extracted_data else None,
                consignee_name=doc.extracted_data.consignee_name if doc.extracted_data else None,
                invoice_number=doc.extracted_data.invoice_number if doc.extracted_data else None,
                country_of_origin=doc.extracted_data.country_of_origin if doc.extracted_data else None,
                total_declared_value=(
                    float(doc.extracted_data.total_declared_value)
                    if doc.extracted_data and doc.extracted_data.total_declared_value
                    else None
                ),
                currency=doc.extracted_data.currency if doc.extracted_data else None,
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return DocumentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(
    document_id: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Get full document details including extracted data and corrections."""
    doc_service = DocumentService(db)
    doc = await doc_service.get_document(document_id, org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return doc


@router.patch("/{document_id}", response_model=DocumentDetailResponse)
async def update_document(
    document_id: uuid.UUID,
    update: DocumentUpdateRequest,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Update document metadata or apply field corrections.

    Can update status, document_type, and apply field-level corrections
    which are tracked in the corrections history.
    """
    doc_service = DocumentService(db)
    doc = await doc_service.get_document(document_id, org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Apply status/type updates
    update_kwargs = {}
    if update.status:
        update_kwargs["status"] = update.status
        if update.status == "reviewed":
            update_kwargs["reviewed_at"] = datetime.utcnow()
        elif update.status == "approved":
            update_kwargs["approved_at"] = datetime.utcnow()
    if update.document_type:
        update_kwargs["document_type"] = update.document_type

    if update_kwargs:
        doc = await doc_service.update_document(document_id, org_id, **update_kwargs)

    # Apply corrections
    if update.corrections and doc.extracted_data:
        correction_service = CorrectionService(db)
        for field_name, corrected_value in update.corrections.items():
            original_value = getattr(doc.extracted_data, field_name, None)
            if original_value is not None:
                original_value = str(original_value)

            try:
                await correction_service.create_correction(
                    document_id=document_id,
                    org_id=org_id,
                    field_name=field_name,
                    corrected_value=corrected_value,
                    original_value=original_value,
                    corrected_by=update.corrected_by,
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"{field_name}: {str(e)}")

    # Refresh
    doc = await doc_service.get_document(document_id, org_id)
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Soft-delete a document by setting is_deleted=True."""
    doc_service = DocumentService(db)
    deleted = await doc_service.soft_delete(document_id, org_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")


@router.get("/{document_id}/file")
async def get_document_file(
    document_id: uuid.UUID,
    db: DbDep,
    # NOTE: Browsers cannot set custom headers on <iframe>/<img> requests.
    # Allow org_id via query param for preview rendering, while still
    # supporting the X-Org-Id header for API clients.
    org_id: str | None = Query(default=None, alias="org_id"),
    x_org_id: str | None = Header(default=None, alias="X-Org-Id"),
    download: bool = Query(default=False),
):
    """Serve the original uploaded file for PDF preview in the frontend."""
    resolved_org_id = x_org_id or org_id or settings.default_org_id
    doc_service = DocumentService(db)
    doc = await doc_service.get_document(document_id, resolved_org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    media_type = doc.file_mime_type or "application/octet-stream"
    if download:
        # Force download (attachment)
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            filename=doc.file_name,
        )

    # Default: allow in-browser viewing (inline)
    safe_name = (doc.file_name or "document").replace('"', "'")
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{safe_name}"'},
    )


@router.get("/{document_id}/corrections", response_model=CorrectionListResponse)
async def get_document_corrections(
    document_id: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Get the full correction history for a document."""
    correction_service = CorrectionService(db)
    corrections = await correction_service.list_corrections(document_id, org_id)
    return CorrectionListResponse(
        document_id=document_id,
        corrections=corrections,
        total=len(corrections),
    )


@router.post("/{document_id}/corrections", response_model=CorrectionResponse, status_code=201)
async def create_correction(
    document_id: uuid.UUID,
    correction: CorrectionCreate,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Create a single field correction for a document or line item.

    Supports both header-level corrections (no line_item_id) and
    line-item-level corrections (with line_item_id).
    """
    doc_service = DocumentService(db)
    doc = await doc_service.get_document(document_id, org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    correction_service = CorrectionService(db)
    try:
        result = await correction_service.create_correction(
            document_id=document_id,
            org_id=org_id,
            field_name=correction.field_name,
            corrected_value=correction.corrected_value,
            original_value=correction.original_value,
            line_item_id=correction.line_item_id,
            corrected_by=correction.corrected_by,
            correction_reason=correction.correction_reason,
        )
        await db.commit()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{document_id}/reextract", response_model=ExtractionResponse)
async def reextract_document(
    document_id: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Re-trigger AI extraction for an existing document.

    Useful when the extraction model has been updated or if the
    initial extraction failed or produced poor results.
    """
    doc_service = DocumentService(db)
    doc = await doc_service.get_document(document_id, org_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete existing extraction
    extraction_service = ExtractionService(db)
    await extraction_service.delete_extraction(document_id)

    # Re-extract
    try:
        extracted = await extraction_service.extract_document(
            document_id=document_id,
            org_id=org_id,
            file_path=doc.file_path,
            file_mime_type=doc.file_mime_type or "application/pdf",
        )
        return ExtractionResponse(
            document_id=document_id,
            status="extracted",
            extraction=extracted,
            message="Re-extraction completed successfully.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Re-extraction failed: {str(e)}")


@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate(
    request: DuplicateCheckRequest,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Check if a document already exists based on file hash, name, or invoice number."""
    doc_service = DocumentService(db)
    matches = await doc_service.check_duplicate(
        org_id=org_id,
        file_hash=request.file_hash,
        file_name=request.file_name,
        invoice_number=request.invoice_number,
    )
    return DuplicateCheckResponse(
        is_duplicate=len(matches) > 0,
        matching_documents=[
            DocumentSummary(
                id=d.id,
                file_name=d.file_name,
                document_type=d.document_type,
                status=d.status,
                uploaded_at=d.uploaded_at,
            )
            for d in matches
        ],
    )
