from sqlalchemy.orm import Session

from app.models.building import Building


class BuildingRepository:
    def get_all(self, db: Session) -> list[Building]:
        return db.query(Building).order_by(Building.id.asc()).all()
