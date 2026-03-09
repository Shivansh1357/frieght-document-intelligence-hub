import uuid

from fastapi import APIRouter, HTTPException

from app.dependencies import DbDep, OrgIdDep
from app.schemas.correction import CorrectionCreate, CorrectionListResponse, CorrectionResponse
from app.services.correction_service import CorrectionService

router = APIRouter()


@router.post("/{document_id}", response_model=CorrectionResponse, status_code=201)
async def create_correction(
    document_id: uuid.UUID,
    correction: CorrectionCreate,
    db: DbDep,
    org_id: OrgIdDep,
):
    service = CorrectionService(db)
    result = await service.create_correction(
        document_id=document_id,
        org_id=org_id,
        field_name=correction.field_name,
        corrected_value=correction.corrected_value,
        original_value=correction.original_value,
        line_item_id=correction.line_item_id,
        corrected_by=correction.corrected_by,
        correction_reason=correction.correction_reason,
    )
    return result


@router.get("/{document_id}", response_model=CorrectionListResponse)
async def list_corrections(
    document_id: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    service = CorrectionService(db)
    corrections = await service.list_corrections(document_id, org_id)
    return CorrectionListResponse(
        document_id=document_id,
        corrections=corrections,
        total=len(corrections),
    )
