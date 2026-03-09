from fastapi import APIRouter

from app.api.v1.documents import router as documents_router
from app.api.v1.extraction import router as extraction_router
from app.api.v1.corrections import router as corrections_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.comparison import router as comparison_router
from app.api.v1.export import router as export_router
from app.api.v1.health import router as health_router
from app.api.v1.copilot import router as copilot_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["health"])
api_router.include_router(documents_router, prefix="/documents", tags=["documents"])
api_router.include_router(extraction_router, prefix="/extraction", tags=["extraction"])
api_router.include_router(corrections_router, prefix="/corrections", tags=["corrections"])
api_router.include_router(analytics_router, prefix="/analytics", tags=["analytics"])
api_router.include_router(comparison_router, prefix="/comparison", tags=["comparison"])
api_router.include_router(export_router, prefix="/export", tags=["export"])
api_router.include_router(copilot_router, prefix="/copilot", tags=["copilot"])
