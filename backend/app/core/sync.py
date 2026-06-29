import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine


logger = logging.getLogger(__name__)


SYNC_BUILDINGS_SQL = text(
    r"""
    INSERT INTO buildings (id, name, area, height, geometry)
    SELECT
        fid AS id,
        COALESCE(NULLIF(name, ''), 'Building ' || fid) AS name,
        ST_Area(geom::geography) AS area,
        COALESCE(
            CAST(substring("building:levels" FROM '^[0-9]+(\.[0-9]+)?') AS DOUBLE PRECISION) * 3.0,
            9.0
        ) AS height,
        geom
    FROM raw_buildings
    WHERE geom IS NOT NULL
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        area = EXCLUDED.area,
        height = EXCLUDED.height,
        geometry = EXCLUDED.geometry
    """
)


def sync_buildings_from_raw(engine: Engine) -> None:
    with engine.begin() as connection:
        raw_table_exists = connection.execute(
            text("SELECT to_regclass('public.raw_buildings')")
        ).scalar_one()

        if raw_table_exists is None:
            logger.info("raw_buildings table not found; skipping sync into buildings")
            return

        connection.execute(text("DELETE FROM buildings"))
        sync_result = connection.execute(SYNC_BUILDINGS_SQL)
        logger.info(
            "Synchronized raw_buildings into buildings table; affected rows: %s",
            sync_result.rowcount,
        )
