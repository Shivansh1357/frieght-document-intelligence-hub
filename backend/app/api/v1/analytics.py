from typing import Optional

from fastapi import APIRouter, Query

from app.dependencies import DbDep, OrgIdDep
from app.schemas.analytics import AccuracyMetrics, CorrectionStats, FieldBreakdown
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/accuracy", response_model=AccuracyMetrics)
async def get_accuracy_metrics(
    db: DbDep,
    org_id: OrgIdDep,
    days: Optional[int] = Query(default=30),
):
    service = AnalyticsService(db)
    metrics = await service.get_accuracy_metrics(org_id, days or 30)
    return AccuracyMetrics(**metrics)


@router.get("/corrections", response_model=CorrectionStats)
async def get_correction_stats(
    db: DbDep,
    org_id: OrgIdDep,
    days: Optional[int] = Query(default=30),
):
    service = AnalyticsService(db)
    stats = await service.get_correction_stats(org_id, days or 30)
    return CorrectionStats(**stats)


@router.get("/field-breakdown", response_model=list[FieldBreakdown])
async def get_field_breakdown(
    db: DbDep,
    org_id: OrgIdDep,
    days: Optional[int] = Query(default=30),
):
    service = AnalyticsService(db)
    breakdown = await service.get_field_breakdown(org_id, days or 30)
    return [FieldBreakdown(**item) for item in breakdown]
