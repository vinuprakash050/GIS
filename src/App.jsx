import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_ZOOM } from "./config/map";
import { useMapInit } from "./hooks/useMapInit";
import { useBuildings } from "./hooks/useBuildings";
import { useSensorData } from "./hooks/useSensorData";
import DetailsPanel from "./components/DetailsPanel";
import MapPanel from "./components/MapPanel";

export default function App() {
  // ── UI state ────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState("Loading map data...");
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [buildingDetails, setBuildingDetails] = useState({});
  const [corridorDistance, setCorridorDistance] = useState(300);
  const [debouncedCorridorDistance, setDebouncedCorridorDistance] = useState(300);
  const [tooltip, setTooltip] = useState(null);
  const [is3D, setIs3D] = useState(false);

  // ── Refs shared with map callbacks ──────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedBuildingIdRef = useRef(null);
  const hoveredBuildingIdRef = useRef(null);
  const corridorDistanceRef = useRef(300);
  const is3DRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { selectedBuildingIdRef.current = selectedBuildingId; }, [selectedBuildingId]);
  useEffect(() => { corridorDistanceRef.current = corridorDistance; },     [corridorDistance]);
  useEffect(() => { is3DRef.current = is3D; },                             [is3D]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const selectedBuilding = selectedBuildingId ? buildingDetails[selectedBuildingId] : null;
  const isSliding = corridorDistance !== debouncedCorridorDistance;

  // ── Hooks ───────────────────────────────────────────────────────────────────
  useMapInit({
    mapContainerRef,
    mapRef,
    corridorDistanceRef,
    selectedBuildingIdRef,
    hoveredBuildingIdRef,
    is3DRef,
    setBuildingDetails,
    setSelectedBuildingId,
    setIs3D,
    setStatus,
    setTooltip,
  });

  useBuildings({
    mapRef,
    debouncedCorridorDistance,
    selectedBuildingIdRef,
    setSelectedBuildingId,
    setBuildingDetails,
    setStatus,
  });

  const { sensorData, timeSeriesData, sensorStatus } = useSensorData(selectedBuildingId);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggle3D = () => {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3DRef.current;
    setIs3D(next);
    is3DRef.current = next;
    map.easeTo(
      next
        ? { pitch: 55, bearing: -18, zoom: MAP_ZOOM, duration: 700 }
        : { pitch: 0,  bearing: 0,   zoom: MAP_ZOOM, duration: 700 },
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
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
        <DetailsPanel
          corridorDistance={corridorDistance}
          isSliding={isSliding}
          onCorridorChange={setCorridorDistance}
          onCorridorCommit={setDebouncedCorridorDistance}
          selectedBuilding={selectedBuilding}
          sensorData={sensorData}
          sensorStatus={sensorStatus}
          timeSeriesData={timeSeriesData}
        />

        <MapPanel
          mapContainerRef={mapContainerRef}
          status={status}
          is3D={is3D}
          onToggle3D={handleToggle3D}
          tooltip={tooltip}
        />
      </section>
    </main>
  );
}
