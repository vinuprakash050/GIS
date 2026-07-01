import React, { useRef } from "react";

const TOOLTIP_W = 220;
const TOOLTIP_H = 140;

/**
 * Hover tooltip rendered inside .map-container-wrapper (position: relative).
 * x/y are pixel offsets from the top-left of the map canvas.
 */
export default function MapTooltip({ tooltip }) {
  const wrapperRef = useRef(null);
  if (!tooltip) return null;

  const { x, y, building } = tooltip;

  // Get the wrapper dimensions for clamping; fall back to reasonable defaults
  const rect = wrapperRef.current?.parentElement?.getBoundingClientRect();
  const maxLeft = rect ? rect.width  - TOOLTIP_W - 16 : 9999;
  const maxTop  = rect ? rect.height - TOOLTIP_H - 16 : 9999;

  const left = Math.max(8, Math.min(x + 16, maxLeft));
  const top  = Math.max(8, Math.min(y - 10,  maxTop));

  return (
    <div ref={wrapperRef} className="map-tooltip" style={{ left, top }}>
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
