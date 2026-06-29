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

export default function App() {
  const [status, setStatus] = useState("Loading building.geojson...");
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

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
            "fill-color": "#1f7ae0",
            "fill-opacity": 0.45,
          },
        });

        map.addLayer({
          id: "building-outline",
          type: "line",
          source: "building",
          paint: {
            "line-color": "#0d3b73",
            "line-width": 3,
          },
        });

        const coordinates = buildingData.features?.[0]?.geometry?.coordinates?.[0];

        if (coordinates?.length) {
          const bounds = coordinates.reduce(
            (currentBounds, coordinate) => currentBounds.extend(coordinate),
            new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
          );

          map.fitBounds(bounds, { padding: 80, duration: 0 });
        }

        setStatus("Loaded 1 building polygon from local GeoJSON.");
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
        <div>
          <p className="eyebrow">Milestone 2</p>
          <h1>GIS MVP</h1>
        </div>
        <p className="subtitle">MapLibre rendering one building polygon from a local GeoJSON file with a fill and outline.</p>
      </header>
      <section className="map-panel">
        <div className="map-status">{status}</div>
        <div ref={mapContainerRef} className="map-container" />
      </section>
    </main>
  );
}
