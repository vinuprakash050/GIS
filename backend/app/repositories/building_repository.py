from geoalchemy2 import Geography
from geoalchemy2.functions import ST_AsGeoJSON, ST_DWithin
from sqlalchemy import cast, func, select
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

    def get_in_corridor(self, db: Session, corridor_distance_meters: float = 300):
        """
        Get buildings within a corridor around North Usman Road.
        Uses ST_DWithin with geography cast for accurate meter-based distance.
        """
        # North Usman Road center point (T. Nagar, Chennai) — derived from actual data centroid
        corridor_center = "SRID=4326;POINT(80.2341 13.0526)"

        statement = (
            select(
                Building.id,
                Building.name,
                Building.area,
                Building.height,
                ST_AsGeoJSON(Building.geometry).label("geometry_geojson"),
            )
            .where(
                ST_DWithin(
                    cast(Building.geometry, Geography),
                    func.ST_GeographyFromText(corridor_center),
                    corridor_distance_meters,
                )
            )
            .order_by(Building.id.asc())
        )

        return db.execute(statement).all()
        
        return db.execute(statement).all()
