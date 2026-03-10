import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config import Settings

logger = logging.getLogger(__name__)
settings = Settings()


async def _run_migrations() -> None:
    """Run 'alembic upgrade head' as a subprocess.

    Running Alembic in-process from an async context is problematic because
    alembic/env.py uses asyncio.run() which cannot be nested inside
    FastAPI's already-running event loop. A subprocess sidesteps this entirely.
    """
    import asyncio

    env = {**os.environ, "DATABASE_URL": settings.database_url}
    alembic_bin = os.path.join(os.path.dirname(sys.executable), "alembic")

    proc = await asyncio.create_subprocess_exec(
        alembic_bin, "upgrade", "head",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        env=env,
    )
    stdout, _ = await proc.communicate()

    if stdout:
        for line in stdout.decode().splitlines():
            logger.info("[alembic] %s", line)

    if proc.returncode not in (0, None) and proc.returncode > 0:
        raise RuntimeError(f"alembic upgrade head failed (exit {proc.returncode})")

    logger.info("Database migrations applied successfully.")


async def _seed_org() -> None:
    """Ensure the demo organization row exists (idempotent).

    Documents have a FK to organizations, so this must exist before any
    upload. Uses INSERT ... ON CONFLICT DO NOTHING so it's safe to run
    on every restart.
    """
    import uuid
    from sqlalchemy import text
    from app.db.session import async_session_factory

    org_id = uuid.UUID(settings.default_org_id)
    async with async_session_factory() as session:
        await session.execute(
            text("""
                INSERT INTO organizations (id, name, slug, created_at, updated_at)
                VALUES (:id, :name, :slug, now(), now())
                ON CONFLICT (id) DO NOTHING
            """),
            {"id": str(org_id), "name": "Maventi Group", "slug": "maventi-group"},
        )
        await session.commit()
    logger.info("Demo organization seeded (org_id=%s).", org_id)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    await _run_migrations()
    await _seed_org()
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
