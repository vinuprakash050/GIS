export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const MAP_CENTER = [80.2341, 13.0526];
export const MAP_ZOOM = 17;

export const OSM_RASTER_STYLE = {
  version: 8,
  sources: {
    "osm-raster-tiles": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-raster-layer",
      type: "raster",
      source: "osm-raster-tiles",
    },
  ],
};

export const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: false,
      grid: { color: "rgba(255, 255, 255, 0.1)" },
      ticks: { color: "rgba(255, 255, 255, 0.7)" },
    },
    x: {
      grid: { color: "rgba(255, 255, 255, 0.1)" },
      ticks: { color: "rgba(255, 255, 255, 0.7)", maxTicksLimit: 8 },
    },
  },
};
