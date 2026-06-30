import os
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from pydantic import BaseModel
from sqlalchemy.engine import make_url


def _load_env_files() -> None:
    """Load backend/.env first, then repo .env without overwriting real env vars."""
    env_paths = [
        Path(__file__).resolve().parents[2] / ".env",
        Path(__file__).resolve().parents[3] / ".env",
    ]

    for env_path in env_paths:
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip("'").strip('"')
            os.environ.setdefault(key, value)


_load_env_files()


def _parse_cors_origins() -> list[str]:
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

    @property
    def gpkg_path(self) -> str:
        raw_path = os.getenv("GPKG_PATH", "")
        if not raw_path:
            return str(Path(__file__).resolve().parents[3] / "northusman1.gpkg")

        path = Path(raw_path)
        if path.is_absolute():
            return str(path)

        return str(Path(__file__).resolve().parents[3] / path)

    def model_post_init(self, __context) -> None:
        if not self.cors_origins:
            self.cors_origins = _parse_cors_origins()

    @property
    def _parsed_database_url(self):
        database_url = os.getenv("DATABASE_URL", "")
        if not database_url:
            raise ValueError("GIS_DATABASE_URL environment variable is not set")
        return urlparse(database_url)

    @property
    def database_host(self) -> str:
        return self._parsed_database_url.hostname or ""

    @property
    def database_port(self) -> int:
        return self._parsed_database_url.port or 5432

    @property
    def database_name(self) -> str:
        return self._parsed_database_url.path.lstrip("/")

    @property
    def database_user(self) -> str:
        return self._parsed_database_url.username or ""

    @property
    def database_password(self) -> str:
        return self._parsed_database_url.password or ""

    @property
    def database_sslmode(self) -> str:
        query = parse_qs(self._parsed_database_url.query)
        return query.get("sslmode", ["require"])[0]

    @property
    def database_url(self) -> str:
        database_url = os.getenv("DATABASE_URL", "")

        if not database_url:
            raise ValueError("GIS_DATABASE_URL environment variable is not set")

        database_url = database_url.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1,
        )
        database_url = database_url.replace(
            "postgres://",
            "postgresql+psycopg://",
            1,
        )

        database_url = re.sub(
            r"[&?]channel_binding=[^&]*",
            "",
            database_url,
        )
        database_url = re.sub(r"\?&", "?", database_url)
        database_url = database_url.rstrip("?")

        return database_url

    @property
    def database_url_safe(self) -> str:
        return make_url(self.database_url).render_as_string(
            hide_password=True
        )

    @property
    def database_source(self) -> str:
        return "GIS_DATABASE_URL"


settings = Settings()