#!/usr/bin/env python3
"""
Fetch telemetry data using FastF1 and output JSON for the Next.js app.

Usage:
    python scripts/fetch_telemetry.py --year 2025 --round 1
    python scripts/fetch_telemetry.py --year 2025 --round 1 --session R

Output:
    app/data/telemetry/{year}-R{round:02d}-{event-slug}.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import numpy as np
import fastf1
import pandas as pd

# Cache directory for FastF1
CACHE_DIR = Path(__file__).parent.parent / ".fastf1-cache"
OUTPUT_DIR = Path(__file__).parent.parent / "app" / "data" / "telemetry"


def slugify(text: str) -> str:
    """Convert event name to a URL-friendly slug."""
    return (
        text.lower()
        .replace(" ", "-")
        .replace("'", "")
        .replace(".", "")
        .replace(",", "")
    )


def format_lap_time(td) -> float | None:
    """Convert timedelta to seconds."""
    if pd.isna(td):
        return None
    return td.total_seconds()


def rotate_coords(
    xs: np.ndarray, ys: np.ndarray, angle_deg: float, cx: float | None = None, cy: float | None = None
) -> tuple[np.ndarray, np.ndarray]:
    """Rotate coordinates around centroid (or given center) by angle_deg degrees."""
    if cx is None:
        cx = xs.mean()
    if cy is None:
        cy = ys.mean()
    rad = np.radians(angle_deg)
    cos_a, sin_a = np.cos(rad), np.sin(rad)
    dx, dy = xs - cx, ys - cy
    return cx + dx * cos_a - dy * sin_a, cy + dx * sin_a + dy * cos_a


def compute_track_boundary(
    xs: np.ndarray, ys: np.ndarray, half_width: float = 6.0
) -> dict:
    """Compute inner/outer track boundaries from a center-line trace."""
    dx = np.gradient(xs)
    dy = np.gradient(ys)
    norm = np.sqrt(dx**2 + dy**2)
    norm[norm == 0] = 1  # avoid division by zero
    nx = -dy / norm
    ny = dx / norm

    outer_x = xs + nx * half_width
    outer_y = ys + ny * half_width
    inner_x = xs - nx * half_width
    inner_y = ys - ny * half_width

    # Shoelace to ensure outer winds counterclockwise
    def shoelace(px, py):
        return np.sum(px[:-1] * py[1:] - px[1:] * py[:-1])

    if shoelace(outer_x, outer_y) < 0:
        outer_x, inner_x = inner_x, outer_x
        outer_y, inner_y = inner_y, outer_y

    return {
        "inner": {"x": inner_x.tolist(), "y": inner_y.tolist()},
        "outer": {"x": outer_x.tolist(), "y": outer_y.tolist()},
    }


def extract_drs_zones(telemetry_entries: list[dict], distance_gap: float = 200.0) -> list[dict]:
    """Extract DRS activation zones from multiple drivers' telemetry.

    Scans up to 5 drivers for DRS-active points, clusters them by distance,
    and returns zone start/end distances with coordinates.
    """
    # Collect all DRS-active distances from a few drivers
    drs_distances = []
    for entry in telemetry_entries[:5]:
        drs = entry.get("drs", [])
        dist = entry.get("distance", [])
        for i, active in enumerate(drs):
            if active and i < len(dist):
                drs_distances.append(dist[i])

    if not drs_distances:
        return []

    drs_distances.sort()

    # Cluster into zones (gap > distance_gap starts a new zone)
    zones = []
    zone_start = drs_distances[0]
    zone_end = drs_distances[0]

    for d in drs_distances[1:]:
        if d - zone_end > distance_gap:
            zones.append((zone_start, zone_end))
            zone_start = d
        zone_end = d

    zones.append((zone_start, zone_end))

    # Map zone distances to X/Y coords using first driver that has them
    ref = telemetry_entries[0] if telemetry_entries else None
    if not ref:
        return [{"startDistance": s, "endDistance": e} for s, e in zones]

    ref_dist = np.array(ref["distance"])
    ref_x = np.array(ref["x"])
    ref_y = np.array(ref["y"])

    result = []
    for start_d, end_d in zones:
        si = int(np.argmin(np.abs(ref_dist - start_d)))
        ei = int(np.argmin(np.abs(ref_dist - end_d)))
        result.append({
            "startDistance": round(start_d, 1),
            "endDistance": round(end_d, 1),
            "startX": round(float(ref_x[si]), 1),
            "startY": round(float(ref_y[si]), 1),
            "endX": round(float(ref_x[ei]), 1),
            "endY": round(float(ref_y[ei]), 1),
        })

    return result


def fetch_telemetry(year: int, round_num: int, session_type: str = "R"):
    """Fetch telemetry for a specific session and output JSON."""
    CACHE_DIR.mkdir(exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(str(CACHE_DIR))

    print(f"Loading {year} Round {round_num} ({session_type})...")
    session = fastf1.get_session(year, round_num, session_type)
    session.load()

    event_name = session.event["EventName"]
    slug = slugify(event_name)

    # Extract circuit rotation angle
    rotation_angle = 0.0
    try:
        circuit_info = session.get_circuit_info()
        rotation_angle = float(circuit_info.rotation)
        print(f"  Circuit rotation: {rotation_angle}°")
    except Exception as e:
        print(f"  Could not get circuit rotation: {e}")

    output: dict = {
        "year": year,
        "round": round_num,
        "eventName": event_name,
        "sessionType": session_type,
        "circuitName": session.event.get("Location", ""),
        "country": session.event.get("Country", ""),
        "rotation": rotation_angle,
        "drivers": [],
        "lapData": [],
        "telemetryData": [],
        "stintData": [],
    }

    results = session.results
    if results is not None and not results.empty:
        for _, row in results.iterrows():
            output["drivers"].append(
                {
                    "number": int(row["DriverNumber"]),
                    "abbreviation": str(row["Abbreviation"]),
                    "fullName": f"{row['FirstName']} {row['LastName']}",
                    "teamName": str(row["TeamName"]),
                    "teamColor": f"#{row['TeamColor']}" if pd.notna(row.get("TeamColor")) else None,
                    "position": int(row["Position"]) if pd.notna(row.get("Position")) else None,
                    "gridPosition": int(row["GridPosition"]) if pd.notna(row.get("GridPosition")) else None,
                    "status": str(row.get("Status", "")),
                }
            )

    # Lap data for all drivers
    all_laps = session.laps
    if all_laps is not None and not all_laps.empty:
        for _, lap in all_laps.iterrows():
            lap_entry = {
                "driverNumber": int(lap["DriverNumber"]),
                "lapNumber": int(lap["LapNumber"]),
                "lapTime": format_lap_time(lap.get("LapTime")),
                "sector1": format_lap_time(lap.get("Sector1Time")),
                "sector2": format_lap_time(lap.get("Sector2Time")),
                "sector3": format_lap_time(lap.get("Sector3Time")),
                "compound": str(lap.get("Compound", "")) if pd.notna(lap.get("Compound")) else None,
                "tyreLife": int(lap["TyreLife"]) if pd.notna(lap.get("TyreLife")) else None,
                "isPitOutLap": bool(lap.get("PitOutTime") is not pd.NaT and pd.notna(lap.get("PitOutTime"))),
                "isPitInLap": bool(lap.get("PitInTime") is not pd.NaT and pd.notna(lap.get("PitInTime"))),
            }
            output["lapData"].append(lap_entry)

    # Speed trace telemetry for fastest lap per driver
    print("Fetching speed traces for fastest laps...")
    driver_numbers = all_laps["DriverNumber"].unique() if all_laps is not None and not all_laps.empty else []

    # Compute shared centroid from first driver for consistent rotation
    shared_cx, shared_cy = None, None

    for driver_num in driver_numbers:
        try:
            driver_laps = all_laps[all_laps["DriverNumber"] == driver_num]
            fastest = driver_laps.pick_fastest()
            if fastest is None:
                continue

            tel = fastest.get_telemetry()
            if tel is None or tel.empty:
                continue

            # Sample every 10th point to keep file size reasonable
            sampled = tel.iloc[::10]

            raw_x = np.array(sampled["X"].tolist()) if "X" in sampled.columns else np.array([])
            raw_y = np.array(sampled["Y"].tolist()) if "Y" in sampled.columns else np.array([])

            # Set shared centroid from first driver
            if shared_cx is None and len(raw_x) > 0:
                shared_cx = float(raw_x.mean())
                shared_cy = float(raw_y.mean())

            # Apply rotation
            if len(raw_x) > 0 and rotation_angle != 0 and shared_cx is not None:
                raw_x, raw_y = rotate_coords(raw_x, raw_y, rotation_angle, shared_cx, shared_cy)

            # DRS boolean array
            drs_values = sampled["DRS"].tolist() if "DRS" in sampled.columns else []
            drs_active = [bool(v >= 10) for v in drs_values]

            telemetry_entry = {
                "driverNumber": int(driver_num),
                "lapNumber": int(fastest["LapNumber"]),
                "distance": sampled["Distance"].tolist(),
                "speed": sampled["Speed"].tolist(),
                "throttle": sampled["Throttle"].tolist(),
                "brake": [bool(b) for b in sampled["Brake"].tolist()],
                "drs": drs_active,
                "x": [round(float(v), 1) for v in raw_x] if len(raw_x) > 0 else [],
                "y": [round(float(v), 1) for v in raw_y] if len(raw_y) > 0 else [],
            }
            output["telemetryData"].append(telemetry_entry)
        except Exception as e:
            print(f"  Skipping telemetry for driver {driver_num}: {e}")

    # Compute track boundary from first driver's rotated coords
    if output["telemetryData"]:
        ref = output["telemetryData"][0]
        if ref["x"] and ref["y"]:
            try:
                boundary = compute_track_boundary(np.array(ref["x"]), np.array(ref["y"]))
                output["trackBoundary"] = boundary
                print(f"  Track boundary computed ({len(ref['x'])} points)")
            except Exception as e:
                print(f"  Could not compute track boundary: {e}")

    # Extract DRS zones
    try:
        drs_zones = extract_drs_zones(output["telemetryData"])
        if drs_zones:
            output["drsZones"] = drs_zones
            print(f"  Found {len(drs_zones)} DRS zone(s)")
    except Exception as e:
        print(f"  Could not extract DRS zones: {e}")

    # Stint data
    if all_laps is not None and not all_laps.empty:
        for driver_num in driver_numbers:
            driver_laps = all_laps[all_laps["DriverNumber"] == driver_num].sort_values("LapNumber")
            stints = driver_laps.groupby("Stint")

            for stint_num, stint_laps in stints:
                compound = stint_laps["Compound"].iloc[0] if pd.notna(stint_laps["Compound"].iloc[0]) else "UNKNOWN"
                output["stintData"].append(
                    {
                        "driverNumber": int(driver_num),
                        "stintNumber": int(stint_num),
                        "compound": str(compound),
                        "lapStart": int(stint_laps["LapNumber"].min()),
                        "lapEnd": int(stint_laps["LapNumber"].max()),
                    }
                )

    # Write output
    filename = f"{year}-R{round_num:02d}-{slug}.json"
    output_path = OUTPUT_DIR / filename
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Written to {output_path}")
    print(f"  {len(output['drivers'])} drivers")
    print(f"  {len(output['lapData'])} laps")
    print(f"  {len(output['telemetryData'])} speed traces")
    print(f"  {len(output['stintData'])} stints")
    print(f"  {len(output.get('drsZones', []))} DRS zones")
    print(f"  Boundary: {'yes' if 'trackBoundary' in output else 'no'}")


def main():
    parser = argparse.ArgumentParser(description="Fetch F1 telemetry data")
    parser.add_argument("--year", type=int, required=True, help="Season year")
    parser.add_argument("--round", type=int, required=True, help="Round number")
    parser.add_argument(
        "--session",
        type=str,
        default="R",
        help="Session type: R (Race), Q (Qualifying), S (Sprint), etc.",
    )
    args = parser.parse_args()

    fetch_telemetry(args.year, args.round, args.session)


if __name__ == "__main__":
    main()
