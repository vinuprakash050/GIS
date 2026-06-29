# Backend Milestone 4

This backend is intentionally minimal. It introduces FastAPI and one JSON endpoint without adding a database yet.

## Run With uv

Install `uv` once if you do not already have it, then run the backend directly:

```bash
cd backend
uv run run.py
```

`uv` will create an environment and install the dependencies declared in [`pyproject.toml`](/home/vinuprakash/GIS/backend/pyproject.toml) automatically.

## Alternative Run

If you prefer the explicit server command, you can still use:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

## Endpoints

- `GET /` returns a basic health message
- `GET /buildings` returns mock building data as JSON
