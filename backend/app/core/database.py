from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.base import Base
from app.models.building import Building

engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_database() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        building_count = db.query(Building).count()

        if building_count == 0:
            db.add(
                Building(
                    id=1,
                    name="Engineering Block",
                    area=2450.0,
                    height=12.0,
                )
            )
            db.commit()
