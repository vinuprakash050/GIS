from pydantic import BaseModel, ConfigDict, Field


class UnitOfMeasurement(BaseModel):
    name: str
    symbol: str
    definition: str


class ObservationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    iot_id: int = Field(alias="@iot.id")
    phenomenon_time: str = Field(alias="phenomenonTime")
    result: float
    datastream: dict[str, int] = Field(alias="Datastream")


class DatastreamResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    iot_id: int = Field(alias="@iot.id")
    name: str
    description: str
    unit_of_measurement: UnitOfMeasurement = Field(alias="unitOfMeasurement")
    observations: list[ObservationResponse] = Field(alias="Observations")


class ThingResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    iot_id: int = Field(alias="@iot.id")
    name: str
    description: str
    datastreams: list[DatastreamResponse] = Field(alias="Datastreams")
