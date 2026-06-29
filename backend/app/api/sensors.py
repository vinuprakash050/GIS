from fastapi import APIRouter

from app.schemas.sensor import SensorResponse
from app.services.sensor_service import SensorService

router = APIRouter(prefix="/sensor", tags=["sensor"])
sensor_service = SensorService()


@router.get("/{building_id}", response_model=SensorResponse)
def get_sensor_data(building_id: int) -> SensorResponse:
    return sensor_service.get_sensor_data(building_id)
