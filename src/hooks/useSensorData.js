import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/map";

/**
 * Fetches SensorThings datastreams + observations for the selected building.
 * Returns { sensorData, timeSeriesData, sensorStatus }.
 * Cancels in-flight requests if the building changes before they resolve.
 */
export function useSensorData(selectedBuildingId) {
  const [sensorData, setSensorData] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);
  const [sensorStatus, setSensorStatus] = useState(
    "Select a building to view sensor readings.",
  );

  useEffect(() => {
    if (!selectedBuildingId) {
      setSensorData(null);
      setTimeSeriesData(null);
      setSensorStatus("Select a building to view sensor readings.");
      return;
    }

    let ignore = false;

    const load = async () => {
      setSensorStatus("Loading sensor data...");

      try {
        const res = await fetch(
          `${API_BASE_URL}/v1.0/Things/${selectedBuildingId}/Datastreams`,
        );
        if (!res.ok)
          throw new Error(`Datastreams request failed: ${res.status}`);

        const datastreams = await res.json();
        if (ignore) return;

        const find = (kind) =>
          datastreams.find((s) => s.name?.toLowerCase().includes(kind));

        const temperatureStream = find("temperature");
        const humidityStream = find("humidity");
        const vibrationStream = find("vibration");

        const fetchObs = async (stream) => {
          if (!stream) return [];
          const r = await fetch(
            `${API_BASE_URL}/v1.0/Datastreams/${stream["@iot.id"]}/Observations`,
          );
          return r.ok ? r.json() : [];
        };

        const [tempObs, humObs, vibObs] = await Promise.all([
          fetchObs(temperatureStream),
          fetchObs(humidityStream),
          fetchObs(vibrationStream),
        ]);

        if (ignore) return;

        setSensorData({
          thingName: `Building ${selectedBuildingId}`,
          observedAt: tempObs[0]?.phenomenonTime ?? humObs[0]?.phenomenonTime ?? null,
          temperature: tempObs[0]?.result ?? null,
          humidity: humObs[0]?.result ?? null,
          vibration: vibObs[0]?.result ?? null,
        });

        setTimeSeriesData({
          temperature: tempObs,
          humidity: humObs,
          vibration: vibObs,
        });

        setSensorStatus("Sensor data loaded.");
      } catch (err) {
        if (ignore) return;
        setSensorData(null);
        setTimeSeriesData(null);
        setSensorStatus(`Could not load sensor data: ${err.message}`);
      }
    };

    load();
    return () => { ignore = true; };
  }, [selectedBuildingId]);

  return { sensorData, timeSeriesData, sensorStatus };
}
