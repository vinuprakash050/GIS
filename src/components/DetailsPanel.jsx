import SensorCharts from "./SensorCharts";
import React from "react";
/**
 * Left sidebar — corridor radius slider, building properties,
 * live sensor readings, and 24-hour trend charts.
 */
export default function DetailsPanel({
  corridorDistance,
  isSliding,
  onCorridorChange,
  onCorridorCommit,
  selectedBuilding,
  sensorData,
  sensorStatus,
  timeSeriesData,
}) {
  return (
    <article className="details-panel">
      <p className="panel-label">Building Details</p>

      {/* Corridor radius slider */}
      <div className="corridor-control">
        <label htmlFor="corridor-slider">
          <span>
            Corridor Radius: <strong>{corridorDistance}m</strong>
          </span>
          <span
            className="corridor-pending"
            style={{ visibility: isSliding ? "visible" : "hidden" }}
          >
            searching…
          </span>
        </label>
        <input
          id="corridor-slider"
          type="range"
          min={50}
          max={750}
          step={50}
          value={corridorDistance}
          onChange={(e) => onCorridorChange(Number(e.target.value))}
          onMouseUp={(e) => onCorridorCommit(Number(e.target.value))}
          onTouchEnd={(e) => onCorridorCommit(Number(e.target.value))}
        />
        <div className="corridor-labels">
          <span>50m</span>
          <span>750m</span>
        </div>
      </div>

      {selectedBuilding ? (
        <BuildingInfo
          building={selectedBuilding}
          sensorData={sensorData}
          sensorStatus={sensorStatus}
          timeSeriesData={timeSeriesData}
        />
      ) : (
        <EmptyState sensorStatus={sensorStatus} />
      )}
    </article>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BuildingInfo({ building, sensorData, sensorStatus, timeSeriesData }) {
  return (
    <>
      <h2>{building.name}</h2>
      <p className="panel-description">{building.description}</p>

      <dl className="details-grid">
        <MetricCell label="ID"             value={building.id} />
        <MetricCell label="Area"           value={building.area} />
        <MetricCell label="Height"         value={building.height} />
        <MetricCell label="Volume"         value={building.volume} />
        <MetricCell label="Solar Potential" value={building.solar_potential} />
        <MetricCell label="Temperature"    value={sensorData ? `${sensorData.temperature} °C` : "--"} />
        <MetricCell label="Humidity"       value={sensorData ? `${sensorData.humidity} %` : "--"} />
        <MetricCell label="Vibration"      value={sensorData ? `${sensorData.vibration} mm/s` : "--"} />
      </dl>

      <p className="sensor-observed-at">
        {sensorData?.observedAt
          ? `Observed at ${new Date(sensorData.observedAt).toLocaleString()}`
          : "No observation timestamp available yet."}
      </p>

      <p className="sensor-status">{sensorStatus}</p>

      <SensorCharts timeSeriesData={timeSeriesData} />
    </>
  );
}

function MetricCell({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EmptyState({ sensorStatus }) {
  return (
    <>
      <h2>No Building Selected</h2>
      <p className="panel-description">
        Click any building on the map to view its details and sensor readings.
      </p>
      <p className="sensor-status">{sensorStatus}</p>
    </>
  );
}
