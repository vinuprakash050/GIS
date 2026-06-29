from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.building import BuildingFeatureCollection
from app.services.building_service import BuildingService

router = APIRouter(prefix="/buildings", tags=["buildings"])
building_service = BuildingService()


@router.get("", response_model=BuildingFeatureCollection)
def get_buildings(db: Session = Depends(get_db)) -> BuildingFeatureCollection:
    return building_service.get_all_buildings(db)


@router.get("/corridor", response_model=BuildingFeatureCollection)
def get_buildings_in_corridor(
    db: Session = Depends(get_db),
    distance_meters: float = Query(750, description="Corridor distance in meters (default: 750m for 1.5km total)")
) -> BuildingFeatureCollection:
    return building_service.get_buildings_in_corridor(db, distance_meters)
