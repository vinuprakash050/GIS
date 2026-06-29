# 3D Urban Twin & Spatial Analytics Pipeline

A full-stack geospatial application that visualizes a 3D urban digital twin of North Usman Road, T. Nagar, Chennai. The application combines spatial data processing, 3D visualization, volumetric analytics, and real-time sensor data using the OGC SensorThings API.

---

## Features

- Interactive 3D map visualization
- Building polygon selection
- Volumetric analysis (Area × Height)
- Solar rooftop estimation
- Real-time sensor data integration
- FastAPI REST backend
- Spatial database support
- Azure deployment ready

---

## Tech Stack

### Frontend

- React
- Vite
- MapLibre GL JS / CesiumJS
- Axios
- Tailwind CSS

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL + PostGIS
- OGC SensorThings API
- Pydantic

### GIS

- QGIS
- GeoPackage (.gpkg)
- GeoJSON
- OpenStreetMap
- Cartosat-3 imagery (reference dataset)

---

## Architecture

```
React
      │
      ▼
 MapLibre GL JS
      │
      ▼
 Axios REST API
      │
      ▼
 FastAPI
      │
      ├──────────────► SensorThings API
      │
      ▼
 PostgreSQL + PostGIS
      │
      ▼
 Spatial Data (.gpkg)
```

---

## Project Structure

```
frontend/
    src/
    components/
    pages/
    hooks/

backend/
    app/
        api/
        models/
        services/
        schemas/
        repositories/
        database/

gis/
    data/
    geopackage/
    geojson/

docs/
README.md
```

---

## GIS Pipeline

1. Import spatial data into QGIS.
2. Clean and reproject the dataset.
3. Extract building footprints.
4. Generate volumetric attributes.
5. Export as GeoPackage (.gpkg).
6. Load geometry into PostGIS.
7. Render buildings in MapLibre GL.
8. Fetch live sensor data from SensorThings API.
9. Display analytics in the frontend.

---

## Building Analytics

Each building stores:

- Building Footprint
- Height
- Volume
- Roof Area
- Solar Potential

Volume is calculated as:

```
Volume = Footprint Area × Height
```

---

## SensorThings Data Model

```
Thing
    │
    ▼
Datastream
    │
    ▼
Observation
```

Example:

```
Building A
        │
Temperature Sensor
        │
35°C
```

---

## API Endpoints

### Buildings

```
GET /api/buildings
```

Returns all building polygons.

---

### Building Details

```
GET /api/buildings/{id}
```

Returns:

- Geometry
- Height
- Volume
- Solar Area

---

### Observations

```
GET /api/observations/{buildingId}
```

Returns latest sensor readings.

---

## Running the Project

### Backend

```bash
cd backend

python -m venv venv

pip install -r requirements.txt

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

---



## Author

Vinuprakash
Senior Full Stack Developer Assignment
