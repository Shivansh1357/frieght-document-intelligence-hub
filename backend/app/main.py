import logging
from contextlib import asynccontextmanager

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import Settings

logger = logging.getLogger(__name__)
settings = Settings()


def _run_migrations() -> None:
    """Run Alembic migrations programmatically using the live DATABASE_URL."""
    try:
        alembic_cfg = Config("alembic.ini")
        # Override the URL from settings so the env var always wins over alembic.ini
        alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations applied successfully.")
    except Exception as e:
        logger.error("Migration failed: %s", e)
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup — run migrations before accepting requests
    _run_migrations()
    yield
    # Shutdown


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI-powered freight document extraction and intelligence platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    """Root endpoint returning API information."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
