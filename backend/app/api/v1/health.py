from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health_check():
    """Check the health status of the API and its dependencies."""
    return {
        "status": "healthy",
        "service": "freight-document-intelligence-hub",
        "version": "1.0.0",
    }
