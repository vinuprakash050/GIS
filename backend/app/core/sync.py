import logging
import os
import shutil
import subprocess

from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.core.config import settings

logger = logging.getLogger(__name__)


def import_gpkg_to_raw() -> None:
    """
    Import the GPKG file directly into the database's raw_buildings table
    using the ogr2ogr system command line tool.
    """
    # 1. Check if ogr2ogr is installed
    if not shutil.which("ogr2ogr"):
        logger.warning("ogr2ogr CLI not found in system PATH. Skipping GPKG import.")
        return

    # 2. Check if GPKG file exists
    gpkg_path = settings.gpkg_path
    if not gpkg_path or not os.path.exists(gpkg_path):
        logger.warning(
            "GPKG file not found at '%s'. Skipping GPKG import.", gpkg_path
        )
        return

    # 3. Resolve database connection string for ogr2ogr
    db_url = os.getenv("GIS_DATABASE_URL", "")
    if not db_url:
        db_url = (
            f"postgresql://{settings.database_user}:{settings.database_password}"
            f"@{settings.database_host}:{settings.database_port}/{settings.database_name}"
        )
    else:
        # Standardize scheme for ogr2ogr (ogr2ogr expects postgresql:// or postgres://)
        if db_url.startswith("postgresql+psycopg://"):
            db_url = db_url.replace("postgresql+psycopg://", "postgresql://", 1)
        elif db_url.startswith("postgres+psycopg://"):
            db_url = db_url.replace("postgres+psycopg://", "postgresql://", 1)

    logger.info("Running ogr2ogr import from '%s' to raw_buildings...", gpkg_path)

    cmd = [
        "ogr2ogr",
        "-f",
        "PostgreSQL",
        f"PG:{db_url}",
        gpkg_path,
        "-nln",
        "raw_buildings",
        "-t_srs",
        "EPSG:4326",
        "-nlt",
        "PROMOTE_TO_MULTI",
        "-overwrite",
    ]

    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        logger.info("ogr2ogr import completed successfully.")
        if res.stdout:
            logger.info("ogr2ogr stdout: %s", res.stdout)
    except subprocess.CalledProcessError as e:
        logger.error("ogr2ogr failed with exit code %s", e.returncode)
        logger.error("ogr2ogr stderr: %s", e.stderr)



def _quote_identifier(identifier: str) -> str:
    """Safely quote a SQL identifier for interpolated raw SQL."""
    return '"' + identifier.replace('"', '""') + '"'


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


def _get_columns(connection, table_name: str) -> dict[str, str]:
    rows = connection.execute(
        text(
            """
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = :table
            """
        ),
        {"table": table_name},
    ).fetchall()
    return {row[0]: row[1] for row in rows}


def sync_buildings_from_raw(engine: Engine) -> None:
    with engine.begin() as connection:
        raw_table_exists = connection.execute(
            text("SELECT to_regclass('public.raw_buildings')")
        ).scalar_one()

        if raw_table_exists is None:
            logger.info("raw_buildings table not found; skipping sync into buildings")
            return

        raw_count = connection.execute(
            text("SELECT COUNT(*) FROM raw_buildings")
        ).scalar_one()
        print(f"Sync: raw_buildings count before sync: {raw_count}", flush=True)
        logger.info("raw_buildings count before sync: %s", raw_count)

        geom_col = _get_geometry_column(connection, "raw_buildings")
        raw_columns = _get_columns(connection, "raw_buildings")
        quoted_geom_col = _quote_identifier(geom_col)

        if "name" in raw_columns:
            name_expr = "NULLIF(name, '')"
            name_sort_expr = "COALESCE(name, '')"
        else:
            name_expr = "NULL"
            name_sort_expr = "''"

        # Prefer a source ID when present, but gracefully fall back to generated IDs.
        integer_like_types = {"smallint", "integer", "bigint"}
        source_id_col = next(
            (
                column
                for column in ("fid", "id", "osm_id", "objectid", "ogc_fid")
                if raw_columns.get(column) in integer_like_types
            ),
            None,
        )
        if source_id_col:
            quoted_source_id_col = _quote_identifier(source_id_col)
            id_expr = quoted_source_id_col
            label_id_expr = f"{quoted_source_id_col}::text"
        else:
            id_expr = (
                "ROW_NUMBER() OVER ("
                f"ORDER BY {name_sort_expr}, ST_AsEWKB({quoted_geom_col})"
                ")"
            )
            label_id_expr = f"({id_expr})::text"
            logger.warning(
                "No source ID column found in raw_buildings; using generated row numbers during sync"
            )

        if "building:levels" in raw_columns:
            height_expr = (
                'COALESCE('
                'CAST(substring("building:levels" FROM \'^[0-9]+(\\.[0-9]+)?\') AS DOUBLE PRECISION) * 3.0,'
                "9.0"
                ")"
            )
        else:
            height_expr = "9.0"

        sync_sql = text(
            rf"""
            INSERT INTO buildings (id, name, area, height, geometry)
            SELECT
                {id_expr} AS id,
                COALESCE({name_expr}, 'Building ' || {label_id_expr}) AS name,
                ST_Area({quoted_geom_col}::geography) AS area,
                {height_expr} AS height,
                ST_Multi(
                    ST_CollectionExtract(
                        ST_Force2D({quoted_geom_col}),
                        3
                    )
                ) AS geometry
            FROM raw_buildings
            WHERE {quoted_geom_col} IS NOT NULL
              AND NOT ST_IsEmpty(
                    ST_CollectionExtract(
                        ST_Force2D({quoted_geom_col}),
                        3
                    )
              )
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
        buildings_count = connection.execute(
            text("SELECT COUNT(*) FROM buildings")
        ).scalar_one()
        print(
            "Sync: "
            f"geom col={geom_col}, "
            f"id source={source_id_col or 'generated-row-number'}, "
            f"inserted rows={sync_result.rowcount}, "
            f"buildings count after sync={buildings_count}",
            flush=True,
        )
        logger.info(
            "Synchronized raw_buildings into buildings (geom col: '%s', id source: '%s'); inserted rows: %s; buildings count after sync: %s",
            geom_col,
            source_id_col or "generated-row-number",
            sync_result.rowcount,
            buildings_count,
        )
