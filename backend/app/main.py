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

    if proc.returncode != 0:
        raise RuntimeError(f"alembic upgrade head failed (exit {proc.returncode})")

    logger.info("Database migrations applied successfully.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup — run migrations before accepting requests
    await _run_migrations()
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
