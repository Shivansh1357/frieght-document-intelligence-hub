from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.db.session import get_db_session

settings = Settings()


async def get_db() -> AsyncSession:
    """Dependency that provides an async database session."""
    async for session in get_db_session():
        yield session


async def get_org_id(x_org_id: str = Header(default=None)) -> str:
    """Dependency that extracts the organization ID from the X-Org-Id header."""
    return x_org_id or settings.default_org_id


DbDep = Annotated[AsyncSession, Depends(get_db)]
OrgIdDep = Annotated[str, Depends(get_org_id)]
