from datetime import datetime, timedelta, timezone
from threading import Lock

from app.schemas.sensorthings import (
    DatastreamResponse,
    ObservationCreate,
    ObservationResponse,
    ThingResponse,
    UnitOfMeasurement,
)

# In-memory store for ingested observations keyed by datastream_id
_ingested_observations: dict[int, list[ObservationResponse]] = {}
_store_lock = Lock()


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
                        self._build_datastream(building_id, "vibration"),
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
                    self._build_datastream(building_id, "vibration"),
                ],
            }
        )

    def get_thing_datastreams(self, building_id: int) -> list[DatastreamResponse]:
        return [
            self._build_datastream(building_id, "temperature"),
            self._build_datastream(building_id, "humidity"),
            self._build_datastream(building_id, "vibration"),
        ]

    def get_datastream_observations(self, datastream_id: int) -> list[ObservationResponse]:
        building_id = datastream_id // 10
        remainder = datastream_id % 10
        if remainder == 1:
            sensor_kind = "temperature"
        elif remainder == 2:
            sensor_kind = "humidity"
        else:
            sensor_kind = "vibration"
        # Generate 24 hourly observations for time-series data
        generated = [
            self._build_observation(building_id, datastream_id, sensor_kind, hours_ago=i)
            for i in range(24)
        ]
        # Prepend any ingested observations so they appear first (most recent)
        with _store_lock:
            ingested = list(_ingested_observations.get(datastream_id, []))
        return ingested + generated

    def ingest_observation(self, payload: ObservationCreate) -> ObservationResponse:
        """
        Store an incoming OGC SensorThings Observation in memory and return it
        with an auto-generated @iot.id.
        """
        datastream_id = payload.Datastream.get("@iot.id", 0)
        with _store_lock:
            existing = _ingested_observations.setdefault(datastream_id, [])
            new_id = 900000 + len(existing) + 1  # namespace ingested IDs away from generated ones
            obs = ObservationResponse(**{
                "@iot.id": new_id,
                "phenomenonTime": payload.phenomenonTime,
                "result": payload.result,
                "Datastream": payload.Datastream,
            })
            existing.insert(0, obs)  # prepend so newest is first
        return obs

    def _build_datastream(self, building_id: int, sensor_kind: str) -> DatastreamResponse:
        if sensor_kind == "temperature":
            datastream_id = building_id * 10 + 1
            unit = UnitOfMeasurement(
                name="Degree Celsius",
                symbol="degC",
                definition="https://qudt.org/vocab/unit/DEG_C",
            )
        elif sensor_kind == "humidity":
            datastream_id = building_id * 10 + 2
            unit = UnitOfMeasurement(
                name="Percent Relative Humidity",
                symbol="%",
                definition="https://qudt.org/vocab/unit/PERCENT",
            )
        else:  # vibration
            datastream_id = building_id * 10 + 3
            unit = UnitOfMeasurement(
                name="Millimetre per Second",
                symbol="mm/s",
                definition="https://qudt.org/vocab/unit/MilliM-PER-SEC",
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
        elif sensor_kind == "humidity":
            return round(48 + (building_id % 5) * 4 + time_variation, 1)
        else:  # vibration — micro-seismic, realistic mm/s range 0.1–2.0
            vibration_base = 0.1 + (building_id % 5) * 0.15
            vibration_variation = (hours_ago % 6) * 0.05
            return round(vibration_base + vibration_variation, 3)
