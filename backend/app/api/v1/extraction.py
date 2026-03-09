import uuid

from fastapi import APIRouter, HTTPException

from app.dependencies import DbDep, OrgIdDep
from app.schemas.extraction import ExtractionResponse
from app.services.extraction_service import ExtractionService

router = APIRouter()


@router.post("/{document_id}/extract", response_model=ExtractionResponse)
async def extract_document(
    document_id: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    """Trigger extraction for a specific document.

    This endpoint is typically called internally after upload, but can
    also be used to manually trigger extraction for a document.
    """
    raise NotImplementedError("Extract endpoint not yet implemented")


@router.get("/{document_id}", response_model=ExtractionResponse)
async def get_extraction(
    document_id: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    service = ExtractionService(db)
    extraction = await service.get_extraction(document_id, org_id)
    if not extraction:
        raise HTTPException(status_code=404, detail="No extraction found for this document")
    return ExtractionResponse(
        document_id=document_id,
        status="extracted",
        extraction=extraction,
        message="Extraction data retrieved successfully.",
    )
