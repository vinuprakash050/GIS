import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const osmRasterStyle = {
  version: 8,
  sources: {
    "osm-raster-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-raster-layer",
      type: "raster",
      source: "osm-raster-tiles",
    },
  ],
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export default function App() {
  const [status, setStatus] = useState("Loading building data from the backend...");
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [buildingDetails, setBuildingDetails] = useState({});
  const [sensorData, setSensorData] = useState(null);
  const [sensorStatus, setSensorStatus] = useState(
    "Select a building to load SensorThings observations.",
  );
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedBuildingIdRef = useRef(null);

  const selectedBuilding = selectedBuildingId ? buildingDetails[selectedBuildingId] : null;

  useEffect(() => {
    selectedBuildingIdRef.current = selectedBuildingId;
  }, [selectedBuildingId]);

  useEffect(() => {
    if (!selectedBuildingId) {
      setSensorData(null);
      setSensorStatus("Select a building to load SensorThings observations.");
      return;
    }

    let ignore = false;

    const loadSensorData = async () => {
      setSensorStatus("Loading SensorThings observations...");

      try {
        const thingResponse = await fetch(`${apiBaseUrl}/v1.0/Things/${selectedBuildingId}`);

        if (!thingResponse.ok) {
          throw new Error(`Thing request failed with status ${thingResponse.status}`);
        }

        const thing = await thingResponse.json();

        if (ignore) {
          return;
        }

        const datastreamsResponse = await fetch(
          `${apiBaseUrl}/v1.0/Things/${selectedBuildingId}/Datastreams`,
        );

        if (!datastreamsResponse.ok) {
          throw new Error(`Datastreams request failed with status ${datastreamsResponse.status}`);
        }

        const datastreams = await datastreamsResponse.json();

        if (ignore) {
          return;
        }

        const temperatureStream = datastreams.find((stream) =>
          stream.name?.toLowerCase().includes("temperature"),
        );
        const humidityStream = datastreams.find((stream) =>
          stream.name?.toLowerCase().includes("humidity"),
        );

        let temperatureObs = null;
        let humidityObs = null;

        if (temperatureStream) {
          const obsResponse = await fetch(
            `${apiBaseUrl}/v1.0/Datastreams/${temperatureStream["@iot.id"]}/Observations`,
          );
          if (obsResponse.ok) {
            const observations = await obsResponse.json();
            temperatureObs = observations[0];
          }
        }

        if (humidityStream) {
          const obsResponse = await fetch(
            `${apiBaseUrl}/v1.0/Datastreams/${humidityStream["@iot.id"]}/Observations`,
          );
          if (obsResponse.ok) {
            const observations = await obsResponse.json();
            humidityObs = observations[0];
          }
        }

        if (ignore) {
          return;
        }

        setSensorData({
          thingName: thing.name,
          observedAt:
            temperatureObs?.phenomenonTime ?? humidityObs?.phenomenonTime ?? null,
          temperature: temperatureObs?.result ?? null,
          humidity: humidityObs?.result ?? null,
        });
        setSensorStatus("SensorThings snapshot loaded.");
      } catch (error) {
        if (ignore) {
          return;
        }

        setSensorData(null);
        setSensorStatus(`Unable to load SensorThings data: ${error.message}`);
      }
    };

    loadSensorData();

    return () => {
      ignore = true;
    };
  }, [selectedBuildingId]);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) {
      return undefined;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: osmRasterStyle,
      center: [78.4867, 17.3852],
      zoom: 17,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.on("load", async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/buildings`);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const buildingData = await response.json();
        const detailsById = Object.fromEntries(
          (buildingData.features ?? []).map((feature) => [
            Number(feature.id),
            {
              id: Number(feature.properties.id),
              name: feature.properties.name,
              area: `${feature.properties.area.toLocaleString()} m²`,
              height: `${feature.properties.height} m`,
              volume: `${feature.properties.volume.toLocaleString()} m³`,
              description:
                "Building attributes, volume, and geometry are now coming from PostgreSQL/PostGIS.",
            },
          ]),
        );
        const featureCoordinates = (buildingData.features ?? [])
          .flatMap((feature) => feature.geometry?.coordinates ?? [])
          .flatMap((ring) => ring ?? []);

        setBuildingDetails(detailsById);

        map.addSource("building", {
          type: "geojson",
          data: buildingData,
        });

        map.addLayer({
          id: "building-extrusion",
          type: "fill-extrusion",
          source: "building",
          paint: {
            "fill-extrusion-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#ff6b35",
              "#6c757d",
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.9,
          },
        });

        map.addLayer({
          id: "building-fill",
          type: "fill",
          source: "building",
          paint: {
            "fill-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#ff6b35",
              "#adb5bd",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.5,
              0.3,
            ],
          },
        });

        map.addLayer({
          id: "building-outline",
          type: "line",
          source: "building",
          paint: {
            "line-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#e63946",
              "#495057",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              5,
              2,
            ],
          },
        });

        map.on("click", "building-fill", (event) => {
          const feature = event.features?.[0];

          if (!feature) {
            return;
          }

          const nextId = feature.properties?.id;
          const previousSelectedId = selectedBuildingIdRef.current;

          if (previousSelectedId !== null) {
            map.setFeatureState(
              { source: "building", id: previousSelectedId },
              { selected: false },
            );
          }

          if (nextId !== undefined) {
            map.setFeatureState({ source: "building", id: nextId }, { selected: true });
            const normalizedId = Number(nextId);

            selectedBuildingIdRef.current = normalizedId;
            setSelectedBuildingId(normalizedId);
            setStatus(`Selected ${feature.properties?.name ?? "building"} from the map.`);

            const center = feature.geometry?.coordinates?.[0]?.[0];
            if (center) {
              map.flyTo({
                center: center,
                zoom: 18,
                pitch: 55,
                bearing: -18,
                duration: 1000,
              });
            }
          }
        });

        map.on("mouseenter", "building-fill", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "building-fill", () => {
          map.getCanvas().style.cursor = "";
        });

        map.on("click", (event) => {
          const clickedFeatures = map.queryRenderedFeatures(event.point, {
            layers: ["building-fill"],
          });
          const currentSelectedId = selectedBuildingIdRef.current;

          if (clickedFeatures.length > 0 || currentSelectedId === null) {
            return;
          }

          map.setFeatureState({ source: "building", id: currentSelectedId }, { selected: false });
          selectedBuildingIdRef.current = null;
          setSelectedBuildingId(null);
          setStatus("Selection cleared. Click the building to see its details.");

          map.flyTo({
            pitch: 0,
            bearing: 0,
            zoom: 17,
            duration: 800,
          });
        });

        if (featureCoordinates.length > 0) {
          const bounds = featureCoordinates.reduce(
            (currentBounds, coordinate) => currentBounds.extend(coordinate),
            new maplibregl.LngLatBounds(featureCoordinates[0], featureCoordinates[0]),
          );

          map.fitBounds(bounds, { padding: 110, duration: 0 });
        }


        setStatus(
          `Loaded ${buildingData.features?.length ?? 0} building footprints from FastAPI. Click one to inspect details in 3D.`,
        );
      } catch (error) {
        setStatus(`Unable to load backend building data: ${error.message}`);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="title-group">
          <p className="eyebrow">Milestone 8</p>
          <h1>GIS MVP</h1>
        </div>
        <p className="subtitle">
          Building volume, 3D extrusion, and SensorThings-style observations are now part of the
          workflow.
        </p>
      </header>

      <section className="map-layout">
        <article className="details-panel">
          <p className="panel-label">Building Details</p>
          {selectedBuilding ? (
            <>
              <h2>{selectedBuilding.name}</h2>
              <p className="panel-description">{selectedBuilding.description}</p>
              <dl className="details-grid">
                <div>
                  <dt>ID</dt>
                  <dd>{selectedBuilding.id}</dd>
                </div>
                <div>
                  <dt>Area</dt>
                  <dd>{selectedBuilding.area}</dd>
                </div>
                <div>
                  <dt>Height</dt>
                  <dd>{selectedBuilding.height}</dd>
                </div>
                <div>
                  <dt>Volume</dt>
                  <dd>{selectedBuilding.volume}</dd>
                </div>
                <div>
                  <dt>Temperature</dt>
                  <dd>{sensorData ? `${sensorData.temperature} °C` : "--"}</dd>
                </div>
                <div>
                  <dt>Humidity</dt>
                  <dd>{sensorData ? `${sensorData.humidity} %` : "--"}</dd>
                </div>
              </dl>
              <p className="sensor-observed-at">
                {sensorData?.observedAt
                  ? `Observed at ${new Date(sensorData.observedAt).toLocaleString()}`
                  : "No observation timestamp available yet."}
              </p>
              <p className="sensor-status">{sensorStatus}</p>
            </>
          ) : (
            <>
              <h2>No Building Selected</h2>
              <p className="panel-description">
                Click one of the highlighted 3D footprints on the map to show building and sensor
                details here.
              </p>
              <p className="sensor-status">{sensorStatus}</p>
            </>
          )}
        </article>

        <section className="map-panel">
          <div className="map-status">{status}</div>
          <div ref={mapContainerRef} className="map-container" />
        </section>
      </section>
    </main>
  );
}
