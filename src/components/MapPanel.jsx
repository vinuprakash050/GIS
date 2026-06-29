import MapTooltip from "./MapTooltip";

/**
 * Map container, status bar, 3D/top-view toggle button, and hover tooltip.
 */
export default function MapPanel({ mapContainerRef, status, is3D, onToggle3D, tooltip }) {
  return (
    <section className="map-panel">
      <div className="map-panel-header">
        <div className="map-status">{status}</div>
        <button
          className={`view-toggle-btn${is3D ? " active" : ""}`}
          onClick={onToggle3D}
          title={is3D ? "Switch to top-down view" : "Switch to 3D view"}
        >
          {is3D ? "⊞ Top View" : "⬡ 3D View"}
        </button>
      </div>

      <div ref={mapContainerRef} className="map-container" />

      <MapTooltip tooltip={tooltip} />
    </section>
  );
}
