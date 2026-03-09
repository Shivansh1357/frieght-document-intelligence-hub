from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Freight Document Intelligence Hub"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/freight_hub"

    # Claude API
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-5-20250929"

    # Storage
    upload_dir: str = "uploads"
    max_file_size: int = 20 * 1024 * 1024  # 20MB

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Multi-tenant
    default_org_id: str = "00000000-0000-0000-0000-000000000001"

    class Config:
        env_file = ".env"
