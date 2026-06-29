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

    def get_buildings_in_corridor(self, db: Session, corridor_distance_meters: float = 750) -> BuildingFeatureCollection:
        buildings = self.repository.get_in_corridor(db, corridor_distance_meters)

        return BuildingFeatureCollection(
            features=[self._to_feature(building) for building in buildings]
        )

    def _to_feature(self, building) -> BuildingFeature:
        geometry = json.loads(building.geometry_geojson)
        # Solar potential: rooftop area (m²) × irradiance constant (kWh/m²/day)
        # Using average solar irradiance for Hyderabad region: ~5.5 kWh/m²/day
        solar_irradiance_constant = 5.5
        solar_potential = round(building.area * solar_irradiance_constant, 2)

        return BuildingFeature(
            id=building.id,
            properties=BuildingProperties(
                id=building.id,
                name=building.name,
                area=building.area,
                height=building.height,
                volume=round(building.area * building.height, 2),
                solar_potential=solar_potential,
            ),
            geometry=BuildingGeometry(
                type=geometry["type"],
                coordinates=geometry["coordinates"],
            ),
        )
