from app.schemas.building import (
    BuildingFeature,
    BuildingFeatureCollection,
    BuildingGeometry,
    BuildingProperties,
)


class BuildingService:
    def get_all_buildings(self) -> BuildingFeatureCollection:
        return BuildingFeatureCollection(
            features=[
                BuildingFeature(
                    id=1,
                    properties=BuildingProperties(id=1, name="Engineering Block"),
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
            ]
        )
