from collections.abc import Generator
import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


logger = logging.getLogger(__name__)

engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def log_database_connection_status() -> None:
    logger.info(
        "Database target resolved from %s: %s",
        settings.database_source,
        settings.database_url_safe,
    )
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    logger.info("Database connection check succeeded")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
