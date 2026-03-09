import uuid

from fastapi import APIRouter, HTTPException

from app.dependencies import DbDep, OrgIdDep
from app.schemas.analytics import ComparisonResponse
from app.services.comparison_service import ComparisonService

router = APIRouter()


@router.get("/compare/{doc_id_1}/{doc_id_2}", response_model=ComparisonResponse)
async def compare_documents(
    doc_id_1: uuid.UUID,
    doc_id_2: uuid.UUID,
    db: DbDep,
    org_id: OrgIdDep,
):
    service = ComparisonService(db)
    try:
        result = await service.compare_documents(doc_id_1, doc_id_2, org_id)
        return ComparisonResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
