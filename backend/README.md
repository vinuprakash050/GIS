# Backend Milestone 4

This backend now uses PostgreSQL for building attributes while still serving mocked geometry as GeoJSON.

## Run With uv

Install `uv` once if you do not already have it, then run the backend directly:

```bash
cd backend
uv run run.py
```

`uv` will create an environment and install the dependencies declared in [`pyproject.toml`](/home/vinuprakash/GIS/backend/pyproject.toml) automatically.

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

The app creates the `buildings` table automatically on startup and seeds one default record if the table is empty.

## Alternative Run

If you prefer the explicit server command, you can still use:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

## Endpoints

- `GET /` returns a basic health message
- `GET /buildings` returns GeoJSON with attributes loaded from PostgreSQL
