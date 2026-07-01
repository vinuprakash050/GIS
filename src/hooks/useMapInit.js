import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import { API_BASE_URL, MAP_CENTER, MAP_ZOOM, OSM_RASTER_STYLE } from "../config/map";

/**
 * Initialises the MapLibre map, adds building sources/layers, terrain,
 * and all map event listeners (click, hover, deselect).
 *
 * Callbacks (setters) are passed in so this hook stays framework-aware
 * without duplicating state.
 */
export function useMapInit({
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
}) {
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return undefined;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OSM_RASTER_STYLE,
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      pitch: 0,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    map.on("load", async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/buildings/corridor?distance_meters=${corridorDistanceRef.current}`,
        );
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);

        const buildingData = await res.json();

        const detailsById = Object.fromEntries(
          (buildingData.features ?? []).map((f) => [
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
      // ── Sources ──────────────────────────────────────────────────────────
      map.addSource("satellite", {
        type: "raster",
        tiles: ["/satellite/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© ISRO Bhuvan | Cartosat-3",
      });

      map.addSource("building", {
        type: "geojson",
        data: buildingData,
      });

      map.addSource("terrain-dem", {
        type: "raster-dem",
        tiles: ["https://demotiles.maplibre.org/terrain-tiles/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 11,
      });

      // ── Layers ───────────────────────────────────────────────────────────

      // Satellite imagery (above OSM)
      map.addLayer({
        id: "satellite",
        type: "raster",
        source: "satellite",
      });

      // Buildings
      map.addLayer({
        id: "building-extrusion",
        type: "fill-extrusion",
        source: "building",
        paint: {
          "fill-extrusion-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false], "#ff6b35",
            ["boolean", ["feature-state", "hover"], false], "#ffaa8a",
            "#6c757d",
          ],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "building-fill",
        type: "fill",
        source: "building",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false], "#ff6b35",
            ["boolean", ["feature-state", "hover"], false], "#ffaa8a",
            "#adb5bd",
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0.5,
            ["boolean", ["feature-state", "hover"], false], 0.4,
            0.3,
          ],
        },
      });

      map.addLayer({
        id: "building-outline",
        type: "line",
        source: "building",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false], "#e63946",
            "#495057",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 5,
            2,
          ],
        },
      });

      const bounds = [
        [80.21825, 13.03560], // southwest
        [80.25120, 13.06010], // northeast
      ];
      map.fitBounds(bounds, {
        padding: 30,
        duration: 0,
      });

      map.setMaxBounds(bounds);
      // Debug
      console.log(map.getStyle().layers.map(layer => layer.id));

        // ── Terrain ──────────────────────────────────────────────────────────
        // Raster DEM for 3D ground mesh. Chennai is flat — exaggeration 1.5
        // makes any elevation visible while keeping the city readable.
        map.setTerrain({ source: "terrain-dem", exaggeration: 1.5 });

        // ── Map Events ───────────────────────────────────────────────────────
        map.on("click", "building-fill", (e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const nextId = feature.properties?.id;
          if (nextId === undefined) return;

          const prevId = selectedBuildingIdRef.current;
          const normalizedId = Number(nextId);

          map.setFeatureState({ source: "building", id: nextId }, { selected: true });
          if (prevId !== null && prevId !== normalizedId) {
            map.setFeatureState({ source: "building", id: prevId }, { selected: false });
          }

          selectedBuildingIdRef.current = normalizedId;
          setSelectedBuildingId(normalizedId);
          setIs3D(true);
          is3DRef.current = true;
          setStatus(`Viewing ${feature.properties?.name ?? "building"}.`);

          const center = feature.geometry?.coordinates?.[0]?.[0];
          if (center) {
            map.flyTo({ center, zoom: 18, pitch: 55, bearing: -18, duration: 1000 });
          }
        });

        map.on("mouseenter", "building-fill", (e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const buildingId = feature.properties?.id;
          if (hoveredBuildingIdRef.current !== null && hoveredBuildingIdRef.current !== buildingId) {
            map.setFeatureState({ source: "building", id: hoveredBuildingIdRef.current }, { hover: false });
          }
          map.setFeatureState({ source: "building", id: buildingId }, { hover: true });
          hoveredBuildingIdRef.current = buildingId;

          setTooltip(buildTooltipPayload(e.point, feature.properties));
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mousemove", "building-fill", (e) => {
          const feature = e.features?.[0];
          if (feature) setTooltip(buildTooltipPayload(e.point, feature.properties));
        });

        map.on("mouseleave", "building-fill", () => {
          if (hoveredBuildingIdRef.current !== null) {
            map.setFeatureState({ source: "building", id: hoveredBuildingIdRef.current }, { hover: false });
            hoveredBuildingIdRef.current = null;
          }
          map.getCanvas().style.cursor = "";
          setTooltip(null);
        });

        // Click on empty map → deselect
        map.on("click", (e) => {
          const hit = map.queryRenderedFeatures(e.point, { layers: ["building-fill"] });
          const currentId = selectedBuildingIdRef.current;
          if (hit.length > 0 || currentId === null) return;

          map.setFeatureState({ source: "building", id: currentId }, { selected: false });
          selectedBuildingIdRef.current = null;
          setSelectedBuildingId(null);
          setIs3D(false);
          is3DRef.current = false;
          setStatus("Click a building to view the building in 3D and its details.");
          map.flyTo({ pitch: 0, bearing: 0, zoom: MAP_ZOOM, duration: 800 });
        });

        setStatus(
          `Loaded ${buildingData.features?.length ?? 0} buildings. Click any building to see 3D view and its details.`,
        );
      } catch (err) {
        setStatus(`Could not load map data: ${err.message}`);
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value, digits = 0) {
  return value != null
    ? Number(value).toLocaleString(undefined, { maximumFractionDigits: digits })
    : null;
}

function buildTooltipPayload(point, props) {
  return {
    x: point.x,
    y: point.y,
    building: {
      name: props.name ?? `Building ${props.id}`,
      area:   fmt(props.area)   != null ? `${fmt(props.area)} m²`         : "—",
      height: props.height      != null ? `${props.height} m`             : "—",
      volume: fmt(props.volume) != null ? `${fmt(props.volume)} m³`       : "—",
      solar:  fmt(props.solar_potential, 1) != null
        ? `${fmt(props.solar_potential, 1)} kWh/day`
        : "—",
    },
  };
}
