from pydantic import BaseModel


class BuildingProperties(BaseModel):
    id: int
    name: str
    area: float
    height: float
    volume: float
    solar_potential: float


class BuildingGeometry(BaseModel):
    type: str
    # GeoJSON coordinate nesting varies by geometry type (Polygon vs MultiPolygon, etc.)
    # Keep this permissive to avoid 500s from validation errors.
    coordinates: list | dict



class BuildingFeature(BaseModel):
    type: str = "Feature"
    id: int
    properties: BuildingProperties
    geometry: BuildingGeometry


class BuildingFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[BuildingFeature]
