# GIS MVP Backend

This backend now uses PostgreSQL for building attributes and PostGIS for building geometry, with Alembic managing schema changes.

## Run With uv

Install `uv` once if you do not already have it, then run the backend:

```bash
cd backend
uv run run.py
```

`uv` will create an environment and install the dependencies declared in [`pyproject.toml`](/home/vinuprakash/GIS/backend/pyproject.toml) automatically. The backend now runs `alembic upgrade head` during startup before serving requests.
If a `raw_buildings` table exists, startup also synchronizes it into the clean application `buildings` table.

## Database Defaults

The backend expects PostgreSQL to be available with these defaults:

- host: `127.0.0.1`
- port: `5432`
- database: `postgres`
- username: `postgres`
- password: `password`

You can override them with environment variables:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`

The initial Alembic migration enables PostGIS, creates the `buildings` table if needed, adds the geometry column, and seeds/backfills the default polygon.

## Raw Import Flow

Imported GIS source data should land in `raw_buildings`. On backend startup, that raw table is transformed into the application `buildings` table:

- `id` comes from `raw_buildings.fid`
- `name` falls back to `Building <fid>` when missing
- `area` is computed from geometry
- `height` is derived from `building:levels * 3`, defaulting to `9.0`
- `geometry` is copied directly into the PostGIS-backed `buildings` table

## Alternative Run

If you prefer the explicit server command, you can still use:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

## Migrations

Create or apply migrations manually with:

```bash
cd backend
uv run alembic upgrade head
```

## Endpoints

- `GET /` returns a basic health message
- `GET /buildings` returns GeoJSON with both attributes and geometry loaded from PostgreSQL/PostGIS
