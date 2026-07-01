import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.buildings import router as buildings_router
from app.api.sensorthings import router as sensorthings_router
from app.core.config import settings
from app.core.database import engine, log_database_connection_status
from app.core.migrations import run_migrations
from app.core.sync import import_gpkg_to_raw, sync_buildings_from_raw

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

log_database_connection_status()

print("App startup: starting database migrations", flush=True)
logger.info("Starting database migrations")
run_migrations()
print("App startup: database migrations completed", flush=True)
logger.info("Database migrations completed")

# Only import GPKG and sync buildings if the buildings table is empty.
# This avoids re-running expensive startup operations on every cold start,
# which is critical for running within Azure App Service F1 CPU limits.
from sqlalchemy import text as _text
with engine.connect() as _conn:
    _buildings_count = _conn.execute(_text("SELECT COUNT(*) FROM buildings")).scalar_one()

if _buildings_count == 0:
    print("App startup: buildings table empty — importing GPKG to raw_buildings", flush=True)
    logger.info("Buildings table empty — importing GPKG to raw_buildings")
    import_gpkg_to_raw()
    print("App startup: GPKG import completed", flush=True)
    logger.info("GPKG import completed")
    print("App startup: starting raw_buildings -> buildings sync", flush=True)
    logger.info("Starting raw_buildings -> buildings sync")
    sync_buildings_from_raw(engine)
    print("App startup: buildings sync completed", flush=True)
    logger.info("buildings sync completed")
else:
    print(f"App startup: buildings table already has {_buildings_count} rows — skipping GPKG import and sync", flush=True)
    logger.info("Buildings table already populated (%s rows) — skipping GPKG import and sync", _buildings_count)

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Milestone 4 backend for serving mock building data.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(buildings_router, prefix=settings.api_prefix)
app.include_router(sensorthings_router, prefix=settings.api_prefix)


@app.get("/", tags=["health"])
def read_root() -> dict[str, str]:
    return {"message": "GIS MVP backend is running."}
