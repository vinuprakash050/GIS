"""sync buildings from raw_buildings (dynamic geometry column)

Revision ID: 20260629_0003
Revises: 20260629_0002
Create Date: 2026-06-29 16:50:00
"""

from alembic import op

revision = "20260629_0003"
down_revision = "20260629_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    # Upgrade geometry column only if still Polygon
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM geometry_columns
                WHERE f_table_schema = 'public'
                  AND f_table_name = 'buildings'
                  AND type = 'POLYGON'
            ) THEN
                ALTER TABLE buildings
                ALTER COLUMN geometry
                TYPE geometry(MULTIPOLYGON,4326)
                USING ST_Multi(geometry);
            END IF;
        END $$;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION _get_geometry_column(table_name text)
        RETURNS text
        LANGUAGE plpgsql
        AS $$
        DECLARE
            result text;
        BEGIN
            SELECT f_geometry_column
            INTO result
            FROM geometry_columns
            WHERE f_table_schema='public'
              AND f_table_name=table_name
            LIMIT 1;

            IF result IS NULL OR result='' THEN
                RETURN 'geom';
            END IF;

            RETURN result;
        END;
        $$;
        """
    )

    op.execute(
        """
        CREATE OR REPLACE FUNCTION sync_buildings_from_raw()
        RETURNS void
        LANGUAGE plpgsql
        AS $$
        DECLARE
            raw_exists regclass;
            geom_col text;
            sync_sql text;
        BEGIN

            SELECT to_regclass('public.raw_buildings')
            INTO raw_exists;

            IF raw_exists IS NULL THEN
                RETURN;
            END IF;

            geom_col := _get_geometry_column('raw_buildings');

            DELETE FROM buildings;

            sync_sql := format(
                'INSERT INTO buildings
                    (id,name,area,height,geometry)

                 SELECT
                    ROW_NUMBER() OVER() AS id,

                    COALESCE(NULLIF(name, ''''), ''Building'') AS name,

                    ST_Area(%1$I::geography) AS area,

                    COALESCE(
                        CAST(
                            substring("building:levels"
                            FROM ''^[0-9]+(\.[0-9]+)?'')
                        AS DOUBLE PRECISION) * 3.0,
                        9.0
                    ) AS height,

                    ST_Multi(
                        ST_CollectionExtract(
                            ST_Force2D(%1$I),
                            3
                        )
                    ) AS geometry

                 FROM raw_buildings

                 WHERE %1$I IS NOT NULL
                   AND NOT ST_IsEmpty(
                        ST_CollectionExtract(
                            ST_Force2D(%1$I),
                            3
                        )
                   )

                 ON CONFLICT(id)
                 DO UPDATE SET

                    name=EXCLUDED.name,
                    area=EXCLUDED.area,
                    height=EXCLUDED.height,
                    geometry=EXCLUDED.geometry',

                geom_col
            );

            EXECUTE sync_sql;

        END;
        $$;
        """
    )

    op.execute("SELECT sync_buildings_from_raw()")


def downgrade() -> None:
    
    op.execute("DROP FUNCTION IF EXISTS sync_buildings_from_raw()")
    op.execute("DROP FUNCTION IF EXISTS _get_geometry_column(text)")