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

const buildingDetails = {
  1: {
    id: 1,
    name: "Engineering Block",
    area: "2,450 m²",
    height: "12 m",
    description: "Academic building used as the first interactive demo target.",
  },
};

export default function App() {
  const [status, setStatus] = useState("Loading building.geojson...");
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedBuildingIdRef = useRef(null);

  const selectedBuilding = selectedBuildingId ? buildingDetails[selectedBuildingId] : null;

  useEffect(() => {
    selectedBuildingIdRef.current = selectedBuildingId;
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
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.on("load", async () => {
      try {
        const response = await fetch("/building.geojson");

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const buildingData = await response.json();

        map.addSource("building", {
          type: "geojson",
          data: buildingData,
        });

        map.addLayer({
          id: "building-fill",
          type: "fill",
          source: "building",
          paint: {
            "fill-color": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              "#0b5fff",
              "#1f7ae0",
            ],
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.7,
              0.45,
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
              "#08306b",
              "#0d3b73",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              4,
              3,
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
        });

        const coordinates = buildingData.features?.[0]?.geometry?.coordinates?.[0];

        if (coordinates?.length) {
          const bounds = coordinates.reduce(
            (currentBounds, coordinate) => currentBounds.extend(coordinate),
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
          );

          map.fitBounds(bounds, { padding: 110, duration: 0 });
        }

        setStatus("Loaded 1 building footprint. Click it to inspect details.");
      } catch (error) {
        setStatus(`Unable to load building.geojson: ${error.message}`);
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
          <p className="eyebrow">Milestone 3</p>
          <h1>GIS MVP</h1>
        </div>
        <p className="subtitle">
          Click the building footprint to inspect hardcoded details and confirm the interaction flow.
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
              </dl>
            </>
          ) : (
            <>
              <h2>No Building Selected</h2>
              <p className="panel-description">
                Click the highlighted footprint on the map to show Building A details here.
              </p>
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
