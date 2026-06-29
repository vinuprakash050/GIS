import { useEffect } from "react";
import { API_BASE_URL } from "../config/map";

/**
 * Reloads the building GeoJSON source whenever the corridor distance changes.
 * Clears the current selection if one exists.
 */
export function useBuildings({
  mapRef,
  debouncedCorridorDistance,
  selectedBuildingIdRef,
  setSelectedBuildingId,
  setBuildingDetails,
  setStatus,
}) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const reload = async () => {
      try {
        setStatus(`Loading buildings within ${debouncedCorridorDistance}m corridor...`);

        const res = await fetch(
          `${API_BASE_URL}/buildings/corridor?distance_meters=${debouncedCorridorDistance}`,
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);

        const data = await res.json();

        const detailsById = Object.fromEntries(
          (data.features ?? []).map((f) => [
            Number(f.id),
            {
              id: Number(f.properties.id),
              name: f.properties.name,
              area: `${f.properties.area.toLocaleString()} m²`,
              height: `${f.properties.height} m`,
              volume: `${f.properties.volume.toLocaleString()} m³`,
              solar_potential: `${f.properties.solar_potential.toLocaleString()} kWh/day`,
              description: "Building footprint data and environmental sensors.",
            },
          ]),
        );

        setBuildingDetails(detailsById);

        // Clear selection when corridor changes
        if (selectedBuildingIdRef.current !== null) {
          map.setFeatureState(
            { source: "building", id: selectedBuildingIdRef.current },
            { selected: false },
          );
          selectedBuildingIdRef.current = null;
          setSelectedBuildingId(null);
        }

        if (map.getSource("building")) {
          map.getSource("building").setData(data);
        }

        setStatus(
          `Loaded ${data.features?.length ?? 0} buildings within ${debouncedCorridorDistance}m corridor.`,
        );
      } catch (err) {
        setStatus(`Could not reload corridor data: ${err.message}`);
      }
    };

    reload();
  }, [debouncedCorridorDistance]); // eslint-disable-line react-hooks/exhaustive-deps
}
