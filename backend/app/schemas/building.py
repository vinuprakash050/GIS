from pydantic import BaseModel


class BuildingProperties(BaseModel):
    id: int
    name: str
    area: float
    height: float


class BuildingGeometry(BaseModel):
    type: str
    coordinates: list[list[list[float]]]


class BuildingFeature(BaseModel):
    type: str = "Feature"
    id: int
    properties: BuildingProperties
    geometry: BuildingGeometry


class BuildingFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[BuildingFeature]
