from geoalchemy2.functions import ST_AsGeoJSON
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.building import Building


class BuildingRepository:
    def get_all(self, db: Session):
        statement = (
            select(
                Building.id,
                Building.name,
                Building.area,
                Building.height,
                ST_AsGeoJSON(Building.geometry).label("geometry_geojson"),
            )
            .order_by(Building.id.asc())
        )

        return db.execute(statement).all()
