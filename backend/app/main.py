import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.buildings import router as buildings_router
from app.api.sensorthings import router as sensorthings_router
from app.core.config import settings
from app.core.database import engine
from app.core.migrations import run_migrations
from app.core.sync import sync_buildings_from_raw

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

run_migrations()
sync_buildings_from_raw(engine)

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
