/**
 * Hover tooltip that follows the cursor over buildings on the map.
 * Rendered absolutely inside the map panel.
 */
export default function MapTooltip({ tooltip }) {
  if (!tooltip) return null;

  const { x, y, building } = tooltip;

  return (
    <div
      className="map-tooltip"
      style={{ left: x + 16, top: y - 10 }}
    >
      <p className="map-tooltip-name">{building.name}</p>
      <div className="map-tooltip-grid">
        <span className="map-tooltip-label">Area</span>
        <span className="map-tooltip-value">{building.area}</span>
        <span className="map-tooltip-label">Height</span>
        <span className="map-tooltip-value">{building.height}</span>
        <span className="map-tooltip-label">Volume</span>
        <span className="map-tooltip-value">{building.volume}</span>
        <span className="map-tooltip-label">Solar</span>
        <span className="map-tooltip-value">{building.solar}</span>
      </div>
    </div>
  );
}
