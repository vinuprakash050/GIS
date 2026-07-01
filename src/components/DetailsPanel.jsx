import SensorCharts from "./SensorCharts";
import React, { useState } from "react";

export default function DetailsPanel({
  corridorDistance,
  isSliding,
  corridorLoading,
  onCorridorChange,
  onCorridorCommit,
  selectedBuilding,
  sensorData,
  sensorStatus,
  timeSeriesData,
  injecting,
  onInject,
}) {
  return (
    <article className="details-panel">
      <p className="panel-label">Building Details</p>

      {/* Corridor radius slider */}
      <div className="corridor-control">
        <div className="corridor-header">
          <span className="corridor-label-text">Corridor Radius</span>
          <div className="corridor-value-row">
            <strong className="corridor-value">{corridorDistance}m</strong>
            <span className="corridor-pending">
              {corridorLoading ? "fetching…" : isSliding ? "searching…" : ""}
            </span>
          </div>
        </div>
        <input
          id="corridor-slider"
          type="range"
          min={50}
          max={1500}
          step={50}
          value={corridorDistance}
          onChange={(e) => onCorridorChange(Number(e.target.value))}
          onMouseUp={(e) => onCorridorCommit(Number(e.target.value))}
          onTouchEnd={(e) => onCorridorCommit(Number(e.target.value))}
        />
        <div className="corridor-labels">
          <span>50m</span>
          <span>1500m</span>
        </div>
      </div>

      {selectedBuilding ? (
        <BuildingInfo
          building={selectedBuilding}
          sensorData={sensorData}
          sensorStatus={sensorStatus}
          timeSeriesData={timeSeriesData}
          injecting={injecting}
          onInject={onInject}
        />
      ) : (
        <EmptyState sensorStatus={sensorStatus} corridorLoading={corridorLoading} />
      )}
    </article>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BuildingInfo({ building, sensorData, sensorStatus, timeSeriesData, injecting, onInject }) {
  const sensorLoading = sensorStatus === "Loading sensor data...";

  return (
    <>
      <div className="building-title-row">
        <span className="selected-dot" aria-hidden="true" />
        <h2>{building.name}</h2>
      </div>
      <p className="panel-description">{building.description}</p>

      <dl className="details-grid">
        <MetricCell label="Area"   value={building.area} />
        <MetricCell label="Height" value={building.height} />
        <MetricCell label="Volume" value={building.volume} />
        <MetricCell
          label="Solar Potential"
          value={building.solar_potential}
          fullWidth
        />
        <MetricCell
          label="Temperature"
          value={sensorLoading ? null : sensorData ? `${sensorData.temperature} °C` : "--"}
          loading={sensorLoading}
        />
        <MetricCell
          label="Humidity"
          value={sensorLoading ? null : sensorData ? `${sensorData.humidity} %` : "--"}
          loading={sensorLoading}
        />
        <MetricCell
          label="Vibration"
          value={sensorLoading ? null : sensorData ? `${sensorData.vibration} mm/s` : "--"}
          loading={sensorLoading}
        />
      </dl>

      {sensorData?.observedAt && (
        <p className="sensor-observed-at">
          Observed at {new Date(sensorData.observedAt).toLocaleString()}
        </p>
      )}

      <p className="sensor-status">{sensorStatus}</p>

      {/* OGC SensorThings injection panel */}
      {sensorData && (
        <InjectPanel
          sensorData={sensorData}
          injecting={injecting}
          onInject={onInject}
        />
      )}

      <SensorCharts timeSeriesData={timeSeriesData} />
    </>
  );
}

// ── Inject Panel ──────────────────────────────────────────────────────────────

const SENSOR_CONFIG = [
  { key: "tempStreamId",  label: "Temperature", unit: "°C",   min: 20,   max: 50,   step: 0.1,  defaultVal: 34.2 },
  { key: "humStreamId",   label: "Humidity",    unit: "% RH", min: 30,   max: 100,  step: 1,    defaultVal: 72   },
  { key: "vibStreamId",   label: "Vibration",   unit: "mm/s", min: 0.01, max: 5.0,  step: 0.01, defaultVal: 0.45 },
];

function InjectPanel({ sensorData, injecting, onInject }) {
  const [selected, setSelected] = useState("tempStreamId");
  const cfg = SENSOR_CONFIG.find((s) => s.key === selected);
  const [value, setValue] = useState(String(cfg.defaultVal));
  const [lastStatus, setLastStatus] = useState(null);

  const handleSensorChange = (key) => {
    setSelected(key);
    const newCfg = SENSOR_CONFIG.find((s) => s.key === key);
    setValue(String(newCfg.defaultVal));
  };

  const handleInject = async () => {
    const dsId = sensorData[selected];
    if (!dsId) { setLastStatus("Datastream not found."); return; }
    const num = parseFloat(value);
    if (Number.isNaN(num)) { setLastStatus("Enter a valid number."); return; }
    setLastStatus(null);
    await onInject(dsId, num);
    setLastStatus(`✓ Injected ${num} ${cfg.unit} → chart updated`);
  };

  return (
    <div className="inject-panel">
      <p className="inject-panel-label">
        <span>⚡ Inject Observation</span>
        <span className="inject-panel-sub">POST /v1.0/Observations</span>
      </p>

      {/* Sensor selector tabs */}
      <div className="inject-sensor-tabs">
        {SENSOR_CONFIG.map((s) => (
          <button
            key={s.key}
            className={`inject-tab ${selected === s.key ? "active" : ""}`}
            onClick={() => handleSensorChange(s.key)}
            disabled={injecting}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Value input + submit */}
      <div className="inject-input-row">
        <input
          type="number"
          className="inject-value-input"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={injecting}
          aria-label={`${cfg.label} value in ${cfg.unit}`}
        />
        <span className="inject-unit">{cfg.unit}</span>
        <button
          className="inject-submit-btn"
          onClick={handleInject}
          disabled={injecting}
        >
          {injecting ? "…" : "Send"}
        </button>
      </div>

      {lastStatus && (
        <p className="inject-status">{lastStatus}</p>
      )}
    </div>
  );
}

// ── Shared cells ──────────────────────────────────────────────────────────────

function MetricCell({ label, value, loading, fullWidth }) {
  return (
    <div style={fullWidth ? { gridColumn: "1 / -1" } : {}}>
      <dt>{label}</dt>
      <dd>
        {loading ? <span className="skeleton-line" /> : value}
      </dd>
    </div>
  );
}

function EmptyState({ sensorStatus, corridorLoading }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">🏢</div>
      <h2>No Building Selected</h2>
      <p className="panel-description">
        Click any building on the map to view its 3D model, volumetric data, and live sensor readings.
      </p>
      {corridorLoading ? (
        <p className="sensor-status corridor-loading-hint">Loading buildings…</p>
      ) : (
        <p className="sensor-status">{sensorStatus}</p>
      )}
    </div>
  );
}
