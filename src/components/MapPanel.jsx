import MapTooltip from "./MapTooltip";
import React from "react";

export default function MapPanel({
  mapContainerRef,
  status,
  is3D,
  onToggle3D,
  tooltip,
  satelliteEnabled,
  onToggleSatellite,
  detailsPanel,
  corridorLoading,
}) {
  return (
    <>
      <div className="map-panel-header">
        <div className="map-status">{status}</div>

        <div className="map-actions">
          <button
            className={`layer-toggle-btn ${satelliteEnabled ? "active" : ""}`}
            onClick={onToggleSatellite}
          >
            {satelliteEnabled ? "🛰 Hide Satellite" : "🛰 Show Satellite"}
          </button>

          <button
            className={`view-toggle-btn ${is3D ? "active" : ""}`}
            onClick={onToggle3D}
            title={is3D ? "Switch to top-down view" : "Switch to 3D view"}
          >
            {is3D ? "⊞ Top View" : "⬡ 3D View"}
          </button>
        </div>
      </div>

      <div className="map-layout">
        {detailsPanel}

        <div className="map-container-wrapper">
          <div ref={mapContainerRef} className="map-container" />
          {corridorLoading && (
            <div className="map-loading-overlay">
              <div className="map-loading-fill" />
            </div>
          )}
          <MapTooltip tooltip={tooltip} />
        </div>
      </div>
    </>
  );
}
