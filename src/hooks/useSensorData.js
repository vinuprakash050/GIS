import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config/map";

/**
 * Fetches SensorThings datastreams + observations for the selected building.
 * Returns { sensorData, timeSeriesData, sensorStatus, refresh, injectObservation }.
 *
 * refresh()               — re-fetches observations for the current building.
 * injectObservation(ds,v) — POSTs a new Observation then auto-refreshes.
 *
 * Cancels in-flight requests if the building changes before they resolve.
 */
export function useSensorData(selectedBuildingId) {
  const [sensorData, setSensorData]       = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [sensorStatus, setSensorStatus]   = useState("Select a building to view sensor readings.");
  const [injecting, setInjecting]         = useState(false);

  // Stable ref so `refresh` can be called from outside without stale closure
  const ignoreRef = useRef(false);

  const load = useCallback(async (buildingId) => {
    if (!buildingId) return;
    ignoreRef.current = false;
    setSensorStatus("Loading sensor data...");

    try {
      const res = await fetch(`${API_BASE_URL}/v1.0/Things/${buildingId}/Datastreams`);
      if (!res.ok) throw new Error(`Datastreams request failed: ${res.status}`);

      const datastreams = await res.json();
      if (ignoreRef.current) return;

      const find = (kind) => datastreams.find((s) => s.name?.toLowerCase().includes(kind));
      const temperatureStream = find("temperature");
      const humidityStream    = find("humidity");
      const vibrationStream   = find("vibration");

      const fetchObs = async (stream) => {
        if (!stream) return [];
        const r = await fetch(`${API_BASE_URL}/v1.0/Datastreams/${stream["@iot.id"]}/Observations`);
        return r.ok ? r.json() : [];
      };

      const [tempObs, humObs, vibObs] = await Promise.all([
        fetchObs(temperatureStream),
        fetchObs(humidityStream),
        fetchObs(vibrationStream),
      ]);

      if (ignoreRef.current) return;

      setSensorData({
        thingName:   `Building ${buildingId}`,
        observedAt:  tempObs[0]?.phenomenonTime ?? humObs[0]?.phenomenonTime ?? null,
        temperature: tempObs[0]?.result ?? null,
        humidity:    humObs[0]?.result ?? null,
        vibration:   vibObs[0]?.result ?? null,
        // Store datastream IDs for injection
        tempStreamId: temperatureStream?.["@iot.id"] ?? null,
        humStreamId:  humidityStream?.["@iot.id"] ?? null,
        vibStreamId:  vibrationStream?.["@iot.id"] ?? null,
      });

      setTimeSeriesData({ temperature: tempObs, humidity: humObs, vibration: vibObs });
      setSensorStatus("Sensor data loaded.");
    } catch (err) {
      if (ignoreRef.current) return;
      setSensorData(null);
      setTimeSeriesData(null);
      setSensorStatus(`Could not load sensor data: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) {
      setSensorData(null);
      setTimeSeriesData(null);
      setSensorStatus("Select a building to view sensor readings.");
      return;
    }
    load(selectedBuildingId);
    return () => { ignoreRef.current = true; };
  }, [selectedBuildingId, load]);

  /** Re-fetch observations for the current building. */
  const refresh = useCallback(() => {
    if (selectedBuildingId) load(selectedBuildingId);
  }, [selectedBuildingId, load]);

  /**
   * POST a new Observation to /v1.0/Observations then refresh.
   * @param {number} datastreamId  - The @iot.id of the target datastream.
   * @param {number} value         - The observation result value.
   */
  const injectObservation = useCallback(async (datastreamId, value) => {
    setInjecting(true);
    try {
      const payload = {
        phenomenonTime: new Date().toISOString(),
        result: value,
        Datastream: { "@iot.id": datastreamId },
      };
      const res = await fetch(`${API_BASE_URL}/v1.0/Observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`POST failed: ${res.status}`);
      // Small delay so the server has written before we read back
      await new Promise((r) => setTimeout(r, 300));
      refresh();
    } catch (err) {
      setSensorStatus(`Injection failed: ${err.message}`);
    } finally {
      setInjecting(false);
    }
  }, [refresh]);

  return { sensorData, timeSeriesData, sensorStatus, injecting, refresh, injectObservation };
}
