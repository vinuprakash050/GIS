from geoalchemy2.functions import ST_AsGeoJSON, ST_DWithin
from sqlalchemy import func, select
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

    def get_in_corridor(self, db: Session, corridor_distance_meters: float = 750):
        """
        Get buildings within a corridor around North Usman Road.
        Uses ST_DWithin for efficient spatial query with spatial index.
        """
        # North Usman Road center point (T. Nagar, Chennai) — derived from actual data centroid
        corridor_center = "POINT(80.2341 13.0526)"

        # Convert meters to degrees (approximate for this latitude)
        # At 13.0418° latitude, 1 degree ≈ 111 km
        distance_degrees = corridor_distance_meters / 111000.0
        
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
                    Building.geometry,
                    func.ST_GeomFromText(corridor_center, 4326),
                    distance_degrees
                )
            )
            .order_by(Building.id.asc())
        )
        
        return db.execute(statement).all()
