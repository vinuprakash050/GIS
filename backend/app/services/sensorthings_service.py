from datetime import datetime, timedelta, timezone

from app.schemas.sensorthings import (
    DatastreamResponse,
    ObservationResponse,
    ThingResponse,
    UnitOfMeasurement,
)


class SensorThingsService:
    def get_all_things(self) -> list[ThingResponse]:
        return [
            ThingResponse(
                **{
                    "@iot.id": building_id,
                    "name": f"Building {building_id}",
                    "description": "Minimal SensorThings-style representation for a building entity.",
                    "Datastreams": [
                        self._build_datastream(building_id, "temperature"),
                        self._build_datastream(building_id, "humidity"),
                    ],
                }
            )
            for building_id in range(1, 848)
        ]

    def get_thing(self, building_id: int) -> ThingResponse:
        return ThingResponse(
            **{
                "@iot.id": building_id,
                "name": f"Building {building_id}",
                "description": "Minimal SensorThings-style representation for a building entity.",
                "Datastreams": [
                    self._build_datastream(building_id, "temperature"),
                    self._build_datastream(building_id, "humidity"),
                ],
            }
        )

    def get_thing_datastreams(self, building_id: int) -> list[DatastreamResponse]:
        return [
            self._build_datastream(building_id, "temperature"),
            self._build_datastream(building_id, "humidity"),
        ]

    def get_datastream_observations(self, datastream_id: int) -> list[ObservationResponse]:
        building_id = datastream_id // 10
        sensor_kind = "temperature" if datastream_id % 10 == 1 else "humidity"
        # Generate 24 hourly observations for time-series data
        return [
            self._build_observation(building_id, datastream_id, sensor_kind, hours_ago=i)
            for i in range(24)
        ]

    def _build_datastream(self, building_id: int, sensor_kind: str) -> DatastreamResponse:
        datastream_id = building_id * 10 + (1 if sensor_kind == "temperature" else 2)
        unit = (
            UnitOfMeasurement(
                name="Degree Celsius",
                symbol="degC",
                definition="https://qudt.org/vocab/unit/DEG_C",
            )
            if sensor_kind == "temperature"
            else UnitOfMeasurement(
                name="Percent Relative Humidity",
                symbol="%",
                definition="https://qudt.org/vocab/unit/PERCENT",
            )
        )

        return DatastreamResponse(
            **{
                "@iot.id": datastream_id,
                "name": f"{sensor_kind.title()} Datastream",
                "description": f"Mock {sensor_kind} readings for building {building_id}.",
                "unitOfMeasurement": unit,
                "Observations": [],
            }
        )

    def _build_observation(
        self, building_id: int, datastream_id: int, sensor_kind: str, hours_ago: int = 0
    ) -> ObservationResponse:
        base_time = datetime.now(timezone.utc) - timedelta(hours=hours_ago, minutes=building_id % 11)
        result = self._sensor_result(building_id, sensor_kind, hours_ago)

        return ObservationResponse(
            **{
                "@iot.id": datastream_id * 100 + hours_ago,
                "phenomenonTime": base_time.isoformat().replace("+00:00", "Z"),
                "result": result,
                "Datastream": {"@iot.id": datastream_id},
            }
        )

    def _sensor_result(self, building_id: int, sensor_kind: str, hours_ago: int = 0) -> float:
        # Add some variation based on time to simulate realistic sensor data
        time_variation = (hours_ago % 12) * 0.2 if sensor_kind == "temperature" else (hours_ago % 8) * 0.5
        if sensor_kind == "temperature":
            return round(28 + (building_id % 7) * 1.5 + time_variation, 1)
        return round(48 + (building_id % 5) * 4 + time_variation, 1)
