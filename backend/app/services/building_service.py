from sqlalchemy.orm import Session

from app.models.building import Building
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

    def _to_feature(self, building: Building) -> BuildingFeature:
        return BuildingFeature(
            id=building.id,
            properties=BuildingProperties(
                id=building.id,
                name=building.name,
                area=building.area,
                height=building.height,
            ),
            geometry=BuildingGeometry(
                type="Polygon",
                coordinates=[
                    [
                        [78.48634, 17.38533],
                        [78.48670, 17.38533],
                        [78.48670, 17.38508],
                        [78.48634, 17.38508],
                        [78.48634, 17.38533],
                    ]
                ],
            ),
        )
