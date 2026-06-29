from fastapi import APIRouter

from app.schemas.building import BuildingFeatureCollection
from app.services.building_service import BuildingService

router = APIRouter(prefix="/buildings", tags=["buildings"])
building_service = BuildingService()


@router.get("", response_model=BuildingFeatureCollection)
def get_buildings() -> BuildingFeatureCollection:
    return building_service.get_all_buildings()
