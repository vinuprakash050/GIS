from fastapi import APIRouter, status

from app.schemas.sensorthings import DatastreamResponse, ObservationCreate, ObservationResponse, ThingResponse
from app.services.sensorthings_service import SensorThingsService

router = APIRouter(prefix="/v1.0", tags=["sensorthings"])
sensorthings_service = SensorThingsService()


@router.get("/Things", response_model=list[ThingResponse])
def get_things() -> list[ThingResponse]:
    return sensorthings_service.get_all_things()


@router.get("/Things/{building_id}", response_model=ThingResponse)
def get_thing(building_id: int) -> ThingResponse:
    return sensorthings_service.get_thing(building_id)


@router.get("/Things/{building_id}/Datastreams", response_model=list[DatastreamResponse])
def get_thing_datastreams(building_id: int) -> list[DatastreamResponse]:
    return sensorthings_service.get_thing_datastreams(building_id)


@router.get("/Datastreams/{datastream_id}/Observations", response_model=list[ObservationResponse])
def get_datastream_observations(datastream_id: int) -> list[ObservationResponse]:
    return sensorthings_service.get_datastream_observations(datastream_id)


@router.post("/Observations", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
def ingest_observation(payload: ObservationCreate) -> ObservationResponse:
    """
    OGC SensorThings API — ingest a new Observation.
    Accepts a payload with phenomenonTime, result, and Datastream reference.
    """
    return sensorthings_service.ingest_observation(payload)
