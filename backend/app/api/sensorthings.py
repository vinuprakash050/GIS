from fastapi import APIRouter

from app.schemas.sensorthings import DatastreamResponse, ObservationResponse, ThingResponse
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
