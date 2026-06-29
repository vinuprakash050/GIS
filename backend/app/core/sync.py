import logging

from sqlalchemy import text
from sqlalchemy.engine import Engine


logger = logging.getLogger(__name__)


def _get_geometry_column(connection, table_name: str) -> str:
    """
    Detect the geometry column name for a table by querying
    PostGIS's geometry_columns view. Falls back to 'geom' if not found.
    """
    result = connection.execute(
        text("""
            SELECT f_geometry_column
            FROM geometry_columns
            WHERE f_table_schema = 'public'
              AND f_table_name = :table
            LIMIT 1
        """),
        {"table": table_name},
    ).scalar()

    if result:
        logger.info("Detected geometry column for '%s': %s", table_name, result)
        return result

    logger.warning(
        "Could not detect geometry column for '%s' via geometry_columns — falling back to 'geom'",
        table_name,
    )
    return "geom"


def sync_buildings_from_raw(engine: Engine) -> None:
    with engine.begin() as connection:
        raw_table_exists = connection.execute(
            text("SELECT to_regclass('public.raw_buildings')")
        ).scalar_one()

        if raw_table_exists is None:
            logger.info("raw_buildings table not found; skipping sync into buildings")
            return

        geom_col = _get_geometry_column(connection, "raw_buildings")

        sync_sql = text(
            rf"""
            INSERT INTO buildings (id, name, area, height, geometry)
            SELECT
                fid AS id,
                COALESCE(NULLIF(name, ''), 'Building ' || fid) AS name,
                ST_Area({geom_col}::geography) AS area,
                COALESCE(
                    CAST(substring("building:levels" FROM '^[0-9]+(\.[0-9]+)?') AS DOUBLE PRECISION) * 3.0,
                    9.0
                ) AS height,
                {geom_col}
            FROM raw_buildings
            WHERE {geom_col} IS NOT NULL
            ON CONFLICT (id) DO UPDATE
            SET
                name = EXCLUDED.name,
                area = EXCLUDED.area,
                height = EXCLUDED.height,
                geometry = EXCLUDED.geometry
            """
        )

        connection.execute(text("DELETE FROM buildings"))
        sync_result = connection.execute(sync_sql)
        logger.info(
            "Synchronized raw_buildings into buildings (geom col: '%s'); rows: %s",
            geom_col,
            sync_result.rowcount,
        )
