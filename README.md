# GIS MVP — North Usman Road Building Explorer

A full-stack GIS application for exploring building footprints along North Usman Road (T. Nagar, Chennai). It visualises 2D/3D building data from PostGIS, provides a dynamic corridor-distance filter, and surfaces mock SensorThings-style environmental readings for each building.

**Live deployment:**
- Frontend → [gis-buildings.vercel.app](https://gis-buildings.vercel.app)
- Backend API → [gis-jzq5.onrender.com/docs](https://gis-jzq5.onrender.com/docs)
- Database → [Neon](https://neon.tech) (serverless PostgreSQL + PostGIS)

---

## Repository Layout

```
.
├── src/                     # React frontend
│   ├── App.jsx              # Root component — map + sidebar + charts
│   ├── main.jsx             # React entry point
│   └── styles.css           # All styling (CSS variables, layout, responsive)
├── index.html               # Vite HTML shell
├── package.json             # Frontend dependencies & scripts
├── vercel.json              # Vercel deployment config + SPA rewrite rules
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py          # App factory, CORS middleware, router registration
│   │   ├── api/
│   │   │   ├── buildings.py       # /buildings REST endpoints
│   │   │   └── sensorthings.py    # /v1.0/* SensorThings-style endpoints
│   │   ├── core/
│   │   │   ├── config.py          # Settings via env vars (Pydantic model)
│   │   │   ├── database.py        # SQLAlchemy engine + session factory
│   │   │   ├── migrations.py      # Runs Alembic migrations on startup
│   │   │   └── sync.py            # Syncs raw_buildings → buildings on startup
│   │   ├── models/
│   │   │   ├── base.py            # SQLAlchemy declarative base
│   │   │   └── building.py        # Building ORM model (PostGIS geometry)
│   │   ├── repositories/
│   │   │   └── building_repository.py  # DB queries (all / corridor filter)
│   │   ├── schemas/
│   │   │   ├── building.py        # Pydantic GeoJSON output schemas
│   │   │   ├── sensor.py          # Sensor schemas
│   │   │   └── sensorthings.py    # SensorThings response schemas
│   │   └── services/
│   │       ├── building_service.py      # Business logic, derived metrics
│   │       └── sensorthings_service.py  # Mock sensor data generation
│   ├── alembic/
│   │   ├── env.py                 # Alembic runtime config
│   │   └── versions/
│   │       ├── 20260629_0001_create_buildings_with_postgis.py  # Initial schema + seed
│   │       └── 20260629_0002_seed_second_building.py           # Library Annex seed
│   ├── alembic.ini            # Alembic config file
│   ├── pyproject.toml         # Project metadata + pinned dependencies
│   ├── requirements.txt       # Pip-installable dependency list
│   └── run.py                 # Local dev entry point
├── .env.example               # Environment variable reference (safe to commit)
├── .env                       # Local secrets (gitignored)
├── render.yaml                # Render service definition
└── north_usman_buildings.geojson  # Source building data (QGIS export)
```

---

## Frontend

### Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 7 | Build tool & dev server |
| MapLibre GL JS | 5 | WebGL map rendering |
| Chart.js + react-chartjs-2 | 4 / 5 | Time-series sensor charts |

### Features

**Interactive 3D Map**
- OSM raster tile basemap via MapLibre GL
- Buildings rendered as `fill-extrusion` layers — height driven by the `height` property from the API
- Three layer stack per building: extrusion (3D), fill (2D footprint), outline
- Hover state: building highlights orange and a tooltip appears showing name, area, height, volume, and solar potential
- Click state: building turns orange-red, camera flies to it with `pitch: 55` for a 3D perspective view
- Click on empty map: deselects building and resets camera to top-down view

**Corridor Distance Filter**
- Slider (50 m – 750 m, step 50 m) in the sidebar
- API call fires only on `mouseup`/`touchend` to avoid hammering the server while dragging
- A "searching…" animation indicates the pending state while the slider is mid-drag
- On corridor change the map source data is replaced via `source.setData()` (no full map reinitialisation)

**Building Details Sidebar**
- Displays: ID, area (m²), height (m), volume (m³), solar potential (kWh/day)
- Solar potential is computed server-side: `area × 5.5 kWh/m²/day × 0.20 efficiency`
- Live sensor readings: temperature (°C), humidity (%), vibration (mm/s)

**Sensor Time-Series Charts**
- Three line charts: 24-hour temperature trend, humidity trend, structural vibration
- Data fetched from the SensorThings-style API (`/v1.0/Things/{id}/Datastreams`)
- Stale request cancellation via `ignore` flag in the `useEffect` cleanup

**Responsive Layout**
- Above 720 px: side-by-side sidebar + map
- Below 720 px: stacked layout, map takes 72 vh, sidebar scrolls below

### Environment Variables (Frontend)

Set in Vercel project settings under **Environment Variables**:

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `https://gis-jzq5.onrender.com` |

If the variable is absent the app falls back to `http://127.0.0.1:8000` for local development.

### Local Setup

```bash
# Install dependencies
npm install

# Start dev server (hot reload on http://localhost:5173)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

### Deployment (Vercel)

1. Push to your GitHub repo.
2. Import the project in [Vercel](https://vercel.com/new).
3. Set `VITE_API_BASE_URL` in project **Settings → Environment Variables**.
4. Vercel auto-detects Vite and runs `npm run build` / outputs `dist/`.
5. `vercel.json` adds a SPA rewrite rule (`/* → /index.html`) and aggressive asset caching headers.

---

## Backend

### Tech Stack

| Library | Version | Purpose |
|---|---|---|
| FastAPI | 0.116 | Web framework |
| SQLAlchemy | 2.0 | ORM + query builder |
| GeoAlchemy2 | 0.17 | PostGIS geometry type support |
| Alembic | 1.16 | Database migrations |
| Pydantic | 2.11 | Request/response validation |
| psycopg (v3) | 3.2 | PostgreSQL driver |
| uvicorn | 0.35 | ASGI server |

### Features

**Startup sequence** (`main.py`)
1. Alembic migrations run automatically (`run_migrations()`)
2. `sync_buildings_from_raw()` checks for a `raw_buildings` table — if present, it upserts all rows into the `buildings` table. This is how QGIS-exported data lands in the app.

**Buildings API**

| Method | Path | Description |
|---|---|---|
| `GET` | `/buildings` | All buildings as a GeoJSON FeatureCollection |
| `GET` | `/buildings/corridor?distance_meters=300` | Buildings within N metres of North Usman Road centre point (80.2341, 13.0526) |

The corridor query uses `ST_DWithin` with a `geography` cast for accurate metre-based distance (as opposed to degree-based geometry distance).

Each feature includes computed properties:
- `volume` = `area × height`
- `solar_potential` = `area × 5.5 × 0.20` (Chennai irradiance × panel efficiency)

**SensorThings API** (mock data, OGC SensorThings 1.0-compatible paths)

| Method | Path | Description |
|---|---|---|
| `GET` | `/v1.0/Things` | All buildings as SensorThings Things |
| `GET` | `/v1.0/Things/{id}` | Single Thing with its Datastreams |
| `GET` | `/v1.0/Things/{id}/Datastreams` | Three datastreams: temperature, humidity, vibration |
| `GET` | `/v1.0/Datastreams/{id}/Observations` | 24 hourly observations for a datastream |

Sensor values are deterministically generated from `building_id` and `hours_ago` — the same building always returns the same baseline reading, with realistic time-of-day variation layered on top.

**Database Model**

```
buildings
├── id         INTEGER  PRIMARY KEY
├── name       VARCHAR(255)
├── area       DOUBLE PRECISION  (m²)
├── height     DOUBLE PRECISION  (m)
└── geometry   geometry(POLYGON, 4326)  — PostGIS, SRID 4326, spatial index
```

### Environment Variables (Backend)

Copy `.env.example` to `.env` for local dev. On Render, set these in the **Environment** tab.

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Full Neon/Postgres connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `https://your-app.vercel.app,http://localhost:5173` |

Individual `DATABASE_HOST/PORT/NAME/USER/PASSWORD` vars are also supported but `DATABASE_URL` takes precedence.

### Local Setup

**Prerequisites:** Python 3.10+, a running PostgreSQL instance with PostGIS extension available, and [uv](https://docs.astral.sh/uv/) (recommended) or pip.

```bash
cd backend

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
uv pip install -r requirements.txt

# Copy env file and fill in your local DB credentials
cp ../.env.example ../.env
# Edit .env — set DATABASE_URL or the individual DATABASE_* vars

# Start the server (migrations run automatically on startup)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Deployment (Render)

`render.yaml` in the repo root defines the service. Manual steps:

1. Connect your GitHub repo to [Render](https://render.com).
2. Render detects `render.yaml` and creates the `gis-mvp-api` web service.
3. In the service's **Environment** tab add:
   - `DATABASE_URL` — your Neon connection string
   - `CORS_ORIGINS` — your Vercel frontend URL (+ localhost for local dev)
4. Render runs `pip install -r requirements.txt` then `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

---

## Adding New Buildings from QGIS

This is the recommended workflow for loading real building footprint data into the database.

### 1. Prepare your layer in QGIS

Open your GeoPackage (`.gpkg`) or shapefile in QGIS. Make sure the layer:
- Uses **EPSG:4326** (WGS 84) as its CRS. If not, reproject: **Layer → Save As → CRS → EPSG:4326**
- Has a polygon geometry type
- Has a unique integer `fid` field (QGIS creates this automatically for GeoPackages)

Optional but helpful attributes that the sync picks up automatically:
- `name` — building name; falls back to `"Building {fid}"` if blank
- `building:levels` — number of floors; used to calculate height as `levels × 3.0 m`; defaults to `9.0 m` if absent

### 2. Export to PostGIS (raw_buildings table)

In QGIS go to **Database → DB Manager → PostGIS**, connect to your Neon database, then:

**Option A — DB Manager import**
1. Open **Table → Import Layer/File**
2. Select your QGIS layer as the source
3. Set **Schema** to `public`, **Table** to `raw_buildings`
4. Check **Create spatial index**
5. Set **Source CRS** to EPSG:4326
6. Click **OK**

**Option B — ogr2ogr (command line)**

```bash
ogr2ogr \
  -f "PostgreSQL" \
  PG:"host=YOUR_HOST port=5432 dbname=YOUR_DB user=YOUR_USER password=YOUR_PASSWORD sslmode=require" \
  your_file.gpkg \
  -nln raw_buildings \
  -t_srs EPSG:4326 \
  -overwrite
```

Replace connection details with your Neon values. For a `.geojson` file just swap `your_file.gpkg` for `your_file.geojson`.

### 3. Trigger the sync

The backend syncs `raw_buildings → buildings` **automatically on every startup**. So after loading data:

```bash
# Local: restart the uvicorn server
uvicorn app.main:app --reload

# Render: trigger a manual deploy or restart the service from the dashboard
```

The sync SQL (`backend/app/core/sync.py`) does the following:
1. Detects the geometry column name from PostGIS's `geometry_columns` view
2. Clears the `buildings` table
3. Upserts every row from `raw_buildings`, computing:
   - `area` via `ST_Area(geom::geography)` — accurate m² regardless of CRS
   - `height` from `building:levels` × 3 m (falls back to 9 m)
   - `name` from the `name` column (falls back to `"Building {fid}"`)

### 4. Verify

```sql
-- Connect to your Neon database and run:
SELECT id, name, area, height, ST_AsText(geometry) FROM buildings LIMIT 5;
```

Or hit the API directly:
```
GET https://your-api.onrender.com/buildings
```

### Troubleshooting

| Problem | Fix |
|---|---|
| `raw_buildings table not found` in logs | The `raw_buildings` table wasn't created — re-run the QGIS export |
| All buildings show height `9.0 m` | Your layer has no `building:levels` attribute — add it in QGIS or edit the default in `sync.py` |
| Buildings don't appear on the map | Check that their geometry falls within `distance_meters` of `(80.2341, 13.0526)` — increase the corridor slider |
| `geometry_columns` returns no result | Run `SELECT UpdateGeometrySRID('raw_buildings', 'geom', 4326);` manually in your DB |

---

## API Reference

Base URL (production): `https://gis-jzq5.onrender.com`  
Base URL (local): `http://localhost:8000`

```
GET /                                              → health check
GET /buildings                                     → all buildings (GeoJSON)
GET /buildings/corridor?distance_meters=300        → corridor-filtered buildings (GeoJSON)
GET /v1.0/Things                                   → all Things
GET /v1.0/Things/{id}                              → single Thing
GET /v1.0/Things/{id}/Datastreams                  → datastreams for a building
GET /v1.0/Datastreams/{id}/Observations            → 24h observations for a datastream
```

Interactive docs (Swagger UI): [gis-jzq5.onrender.com/docs](https://gis-jzq5.onrender.com/docs)  
ReDoc: [gis-jzq5.onrender.com/redoc](https://gis-jzq5.onrender.com/redoc)
