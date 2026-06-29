"""seed second building

Revision ID: 20260629_0002
Revises: 20260629_0001
Create Date: 2026-06-29 16:35:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260629_0002"
down_revision = "20260629_0001"
branch_labels = None
depends_on = None


SECOND_BUILDING_WKT = (
    "POLYGON((78.48680 17.38529,78.48705 17.38529,78.48705 17.38509,"
    "78.48680 17.38509,78.48680 17.38529))"
)


def upgrade() -> None:
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
            id=2,
            name="Library Annex",
            area=1680.0,
            height=9.5,
            wkt=SECOND_BUILDING_WKT,
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM buildings WHERE id = :id").bindparams(id=2))
