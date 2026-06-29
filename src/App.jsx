import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
  const [status, setStatus] = useState("Loading map data...");
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [buildingDetails, setBuildingDetails] = useState({});
  const [sensorData, setSensorData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [sensorStatus, setSensorStatus] = useState(
    "Select a building to view sensor readings.",
  );
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedBuildingIdRef = useRef(null);
  const hoveredBuildingIdRef = useRef(null);

  const selectedBuilding = selectedBuildingId ? buildingDetails[selectedBuildingId] : null;

  useEffect(() => {
    selectedBuildingIdRef.current = selectedBuildingId;
  }, [selectedBuildingId]);

  useEffect(() => {
    if (!selectedBuildingId) {
      setSensorData(null);
      setTimeSeriesData(null);
      setSensorStatus("Select a building to view sensor readings.");
      return;
    }

    let ignore = false;

    const loadSensorData = async () => {
      setSensorStatus("Loading sensor data...");

      try {
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
        let temperatureTimeSeries = [];
        let humidityTimeSeries = [];

        if (temperatureStream) {
          const obsResponse = await fetch(
            `${apiBaseUrl}/v1.0/Datastreams/${temperatureStream["@iot.id"]}/Observations`,
          );
          if (obsResponse.ok) {
            const observations = await obsResponse.json();
            temperatureObs = observations[0];
            temperatureTimeSeries = observations;
          }
        }

        if (humidityStream) {
          const obsResponse = await fetch(
            `${apiBaseUrl}/v1.0/Datastreams/${humidityStream["@iot.id"]}/Observations`,
          );
          if (obsResponse.ok) {
            const observations = await obsResponse.json();
            humidityObs = observations[0];
            humidityTimeSeries = observations;
          }
        }

        if (ignore) {
          return;
        }

        setSensorData({
          thingName: `Building ${selectedBuildingId}`,
          observedAt:
            temperatureObs?.phenomenonTime ?? humidityObs?.phenomenonTime ?? null,
          temperature: temperatureObs?.result ?? null,
          humidity: humidityObs?.result ?? null,
        });

        setTimeSeriesData({
          temperature: temperatureTimeSeries,
          humidity: humidityTimeSeries,
        });
        setSensorStatus("Sensor data loaded.");
      } catch (error) {
        if (ignore) {
          return;
        }

        setSensorData(null);
        setTimeSeriesData(null);
        setSensorStatus(`Could not load sensor data: ${error.message}`);
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
              solar_potential: `${feature.properties.solar_potential.toLocaleString()} kWh/day`,
              description:
                "Building footprint data and environmental sensors.",
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
              ["boolean", ["feature-state", "hover"], false],
              "#ffaa8a",
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
              ["boolean", ["feature-state", "hover"], false],
              "#ffaa8a",
              "#adb5bd",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.5,
              ["boolean", ["feature-state", "hover"], false],
              0.4,
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

          if (nextId !== undefined) {
            // Set new selection first to avoid visual gap
            map.setFeatureState({ source: "building", id: nextId }, { selected: true });
            const normalizedId = Number(nextId);

            // Clear previous selection if different from new selection
            if (previousSelectedId !== null && previousSelectedId !== normalizedId) {
              map.setFeatureState(
                { source: "building", id: previousSelectedId },
                { selected: false },
              );
            }

            selectedBuildingIdRef.current = normalizedId;
            setSelectedBuildingId(normalizedId);
            setStatus(`Viewing ${feature.properties?.name ?? "building"}.`);

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

        map.on("mouseenter", "building-fill", (event) => {
          const feature = event.features?.[0];
          if (feature) {
            const buildingId = feature.properties?.id;
            // Clear previous hover state
            if (hoveredBuildingIdRef.current !== null && hoveredBuildingIdRef.current !== buildingId) {
              map.setFeatureState({ source: "building", id: hoveredBuildingIdRef.current }, { hover: false });
            }
            // Set new hover state
            map.setFeatureState({ source: "building", id: buildingId }, { hover: true });
            hoveredBuildingIdRef.current = buildingId;
          }
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "building-fill", (event) => {
          if (hoveredBuildingIdRef.current !== null) {
            map.setFeatureState({ source: "building", id: hoveredBuildingIdRef.current }, { hover: false });
            hoveredBuildingIdRef.current = null;
          }
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
          setStatus("Click a building to view its details.");

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
          `Loaded ${buildingData.features?.length ?? 0} buildings. Click any building to view details.`,
        );
      } catch (error) {
        setStatus(`Could not load map data: ${error.message}`);
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
          <p className="eyebrow">North Usman Road</p>
          <h1>Building Explorer</h1>
        </div>
        <p className="subtitle">
          Explore building footprints, view 3D models, and monitor environmental sensor data.
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
                  <dt>Solar Potential</dt>
                  <dd>{selectedBuilding.solar_potential}</dd>
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
              {timeSeriesData && (
                <div className="sensor-chart">
                  <h3>24-Hour Temperature Trend</h3>
                  <Line
                    data={{
                      labels: timeSeriesData.temperature
                        .slice()
                        .reverse()
                        .map((obs) => {
                          const date = new Date(obs.phenomenonTime);
                          return `${date.getHours()}:00`;
                        }),
                      datasets: [
                        {
                          label: "Temperature (°C)",
                          data: timeSeriesData.temperature
                            .slice()
                            .reverse()
                            .map((obs) => obs.result),
                          borderColor: "rgba(255, 99, 132, 1)",
                          backgroundColor: "rgba(255, 99, 132, 0.2)",
                          tension: 0.1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: false,
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                          },
                          ticks: {
                            color: "rgba(255, 255, 255, 0.7)",
                          },
                        },
                        x: {
                          grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                          },
                          ticks: {
                            color: "rgba(255, 255, 255, 0.7)",
                          },
                        },
                      },
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <h2>No Building Selected</h2>
              <p className="panel-description">
                Click any building on the map to view its details and sensor readings.
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
