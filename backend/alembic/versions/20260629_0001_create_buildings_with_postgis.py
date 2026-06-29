"""create buildings with postgis

Revision ID: 20260629_0001
Revises:
Create Date: 2026-06-29 16:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260629_0001"
down_revision = None
branch_labels = None
depends_on = None


DEFAULT_BUILDING_WKT = (
    "POLYGON((78.48634 17.38533,78.48670 17.38533,78.48670 17.38508,"
    "78.48634 17.38508,78.48634 17.38533))"
)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS buildings (
            id INTEGER PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            area DOUBLE PRECISION NOT NULL,
            height DOUBLE PRECISION NOT NULL
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_buildings_id ON buildings (id)")
    op.execute(
        """
        ALTER TABLE buildings
        ADD COLUMN IF NOT EXISTS geometry geometry(POLYGON, 4326)
        """
    )
    op.execute(
        sa.text(
            """
            INSERT INTO buildings (id, name, area, height, geometry)
            VALUES (
                :id,
                :name,
                :area,
                :height,
                ST_GeomFromText(:wkt, 4326)
            )
            ON CONFLICT (id) DO NOTHING
            """
        ).bindparams(
            id=1,
            name="Engineering Block",
            area=2450.0,
            height=12.0,
            wkt=DEFAULT_BUILDING_WKT,
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE buildings
            SET geometry = ST_GeomFromText(:wkt, 4326)
            WHERE geometry IS NULL
            """
        ).bindparams(wkt=DEFAULT_BUILDING_WKT)
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_buildings_id")
    op.execute("DROP TABLE IF EXISTS buildings")
