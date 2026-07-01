"""
OGC SensorThings API — Sensor Observation Ingestion Script
==========================================================
Matches the Python component specified in Phase 2 of the technical assignment.

Usage
-----
    # Ingest a single temperature reading for building 1
    python scripts/ingest_sensor.py --building 1 --sensor temperature --value 34.2

    # Ingest all three sensors for building 1 with random simulated values
    python scripts/ingest_sensor.py --building 1 --simulate

    # Target the production API
    python scripts/ingest_sensor.py --building 1 --simulate \
        --api https://gis-jzq5.onrender.com

Datastream ID Convention
------------------------
    building_id * 10 + 1  →  Temperature (°C)
    building_id * 10 + 2  →  Humidity (% RH)
    building_id * 10 + 3  →  Vibration (mm/s)
"""

import argparse
import json
import random
import sys
from datetime import datetime, timezone

import requests

# ── Defaults ──────────────────────────────────────────────────────────────────
DEFAULT_API = "http://127.0.0.1:8000"
ST_OBSERVATIONS_PATH = "/v1.0/Observations"

SENSOR_OFFSETS = {
    "temperature": 1,
    "humidity":    2,
    "vibration":   3,
}

SIMULATED_RANGES = {
    "temperature": (28.0, 42.0),   # Chennai UHI range, °C
    "humidity":    (55.0, 90.0),   # Chennai RH range, %
    "vibration":   (0.01, 2.50),   # Structural vibration, mm/s
}


def datastream_id(building_id: int, sensor: str) -> int:
    """Return the datastream ID for a given building + sensor combination."""
    return building_id * 10 + SENSOR_OFFSETS[sensor]


def ingest_sensor_data(
    api_base: str,
    datastream_id_val: int,
    value: float,
    sensor_name: str,
) -> int:
    """
    POST a single Observation to the OGC SensorThings endpoint.
    Returns the HTTP status code (201 on success).
    """
    endpoint = api_base.rstrip("/") + ST_OBSERVATIONS_PATH

    payload = {
        "phenomenonTime": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "result": round(value, 4),
        "Datastream": {"@iot.id": datastream_id_val},
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(
            endpoint,
            data=json.dumps(payload),
            headers=headers,
            timeout=10,
        )
        status = response.status_code
        label = "✓" if status == 201 else "✗"
        print(
            f"  {label} [{status}] {sensor_name:12s} "
            f"datastream={datastream_id_val}  value={value}"
        )
        return status

    except requests.RequestException as exc:
        print(f"  ✗ [ERROR] {sensor_name}: {exc}", file=sys.stderr)
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest simulated sensor observations into the OGC SensorThings API."
    )
    parser.add_argument(
        "--api",
        default=DEFAULT_API,
        help=f"Base URL of the API (default: {DEFAULT_API})",
    )
    parser.add_argument(
        "--building",
        type=int,
        required=True,
        help="Building ID to target (e.g. 1)",
    )
    parser.add_argument(
        "--sensor",
        choices=list(SENSOR_OFFSETS.keys()),
        help="Sensor type to ingest (required unless --simulate is set)",
    )
    parser.add_argument(
        "--value",
        type=float,
        help="Observation value to ingest (required unless --simulate is set)",
    )
    parser.add_argument(
        "--simulate",
        action="store_true",
        help="Ingest randomised values for all three sensors",
    )

    args = parser.parse_args()

    if not args.simulate and (args.sensor is None or args.value is None):
        parser.error("Provide --sensor and --value, or use --simulate")

    print(f"\nOGC SensorThings Ingestion")
    print(f"  API      : {args.api}")
    print(f"  Building : {args.building}")
    print()

    if args.simulate:
        for sensor, (lo, hi) in SIMULATED_RANGES.items():
            value = round(random.uniform(lo, hi), 2)
            ds_id = datastream_id(args.building, sensor)
            ingest_sensor_data(args.api, ds_id, value, sensor)
    else:
        ds_id = datastream_id(args.building, args.sensor)
        ingest_sensor_data(args.api, ds_id, args.value, args.sensor)

    print()


if __name__ == "__main__":
    main()
