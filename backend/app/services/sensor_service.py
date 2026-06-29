from app.schemas.sensor import SensorResponse


class SensorService:
    def get_sensor_data(self, building_id: int) -> SensorResponse:
        temperature = 28 + (building_id % 7) * 1.5
        humidity = 48 + (building_id % 5) * 4

        return SensorResponse(
            building_id=building_id,
            temperature=round(temperature, 1),
            humidity=round(humidity, 1),
        )
