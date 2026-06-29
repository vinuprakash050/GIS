from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.buildings import router as buildings_router
from app.core.config import settings
from app.core.database import init_database

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

init_database()


@app.get("/", tags=["health"])
def read_root() -> dict[str, str]:
    return {"message": "GIS MVP backend is running."}
