from pydantic import BaseModel


class SensorResponse(BaseModel):
    building_id: int
    temperature: float
    humidity: float
