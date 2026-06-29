import json

from sqlalchemy.orm import Session

from app.repositories.building_repository import BuildingRepository
from app.schemas.building import (
    BuildingFeature,
    BuildingFeatureCollection,
    BuildingGeometry,
    BuildingProperties,
)


class BuildingService:
    def __init__(self) -> None:
        self.repository = BuildingRepository()

    def get_all_buildings(self, db: Session) -> BuildingFeatureCollection:
        buildings = self.repository.get_all(db)

        return BuildingFeatureCollection(
            features=[self._to_feature(building) for building in buildings]
        )

    def _to_feature(self, building) -> BuildingFeature:
        geometry = json.loads(building.geometry_geojson)

        return BuildingFeature(
            id=building.id,
            properties=BuildingProperties(
                id=building.id,
                name=building.name,
                area=building.area,
                height=building.height,
                volume=round(building.area * building.height, 2),
            ),
            geometry=BuildingGeometry(
                type=geometry["type"],
                coordinates=geometry["coordinates"],
            ),
        )
