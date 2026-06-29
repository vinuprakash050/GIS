from fastapi import APIRouter

from app.schemas.building import BuildingResponse
from app.services.building_service import BuildingService

router = APIRouter(prefix="/buildings", tags=["buildings"])
building_service = BuildingService()


@router.get("", response_model=list[BuildingResponse])
def get_buildings() -> list[BuildingResponse]:
    return building_service.get_all_buildings()
