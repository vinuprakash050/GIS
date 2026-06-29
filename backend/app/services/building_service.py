from app.schemas.building import BuildingResponse


class BuildingService:
    def get_all_buildings(self) -> list[BuildingResponse]:
        return [
            BuildingResponse(id=1, name="Engineering Block"),
            BuildingResponse(id=2, name="Library Annex"),
        ]
