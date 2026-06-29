import os

from pydantic import BaseModel


def _parse_cors_origins() -> list[str]:
    """Read CORS origins from env var or fall back to localhost dev defaults."""
    raw = os.getenv("CORS_ORIGINS", "")
    if raw:
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://localhost:4173",
    ]


class Settings(BaseModel):
    app_name: str = "GIS MVP API"
    api_prefix: str = ""
    cors_origins: list[str] = []
    database_host: str = os.getenv("DATABASE_HOST", "127.0.0.1")
    database_port: int = int(os.getenv("DATABASE_PORT", "5432"))
    database_name: str = os.getenv("DATABASE_NAME", "postgres")
    database_user: str = os.getenv("DATABASE_USER", "postgres")
    database_password: str = os.getenv("DATABASE_PASSWORD", "password")

    def model_post_init(self, __context) -> None:
        # Populate cors_origins after model init so env is read at runtime
        if not self.cors_origins:
            self.cors_origins = _parse_cors_origins()

    @property
    def database_url(self) -> str:
        # DATABASE_URL can be set directly (e.g. Neon full connection string)
        direct_url = os.getenv("DATABASE_URL", "")
        if direct_url:
            # Replace scheme with psycopg-compatible one
            direct_url = direct_url.replace("postgresql://", "postgresql+psycopg://", 1)
            direct_url = direct_url.replace("postgres://", "postgresql+psycopg://", 1)
            # Strip channel_binding param — not supported by SQLAlchemy URL parser
            # psycopg3 handles SSL natively via sslmode=require
            if "channel_binding=" in direct_url:
                import re
                direct_url = re.sub(r"[&?]channel_binding=[^&]*", "", direct_url)
                direct_url = re.sub(r"\?&", "?", direct_url)
                direct_url = direct_url.rstrip("?")
            return direct_url
        return (
            f"postgresql+psycopg://{self.database_user}:{self.database_password}"
            f"@{self.database_host}:{self.database_port}/{self.database_name}"
        )


settings = Settings()
