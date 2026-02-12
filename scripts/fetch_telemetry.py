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

    output: dict = {
        "year": year,
        "round": round_num,
        "eventName": event_name,
        "sessionType": session_type,
        "circuitName": session.event.get("Location", ""),
        "country": session.event.get("Country", ""),
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

            telemetry_entry = {
                "driverNumber": int(driver_num),
                "lapNumber": int(fastest["LapNumber"]),
                "distance": sampled["Distance"].tolist(),
                "speed": sampled["Speed"].tolist(),
                "throttle": sampled["Throttle"].tolist(),
                "brake": [bool(b) for b in sampled["Brake"].tolist()],
            }
            output["telemetryData"].append(telemetry_entry)
        except Exception as e:
            print(f"  Skipping telemetry for driver {driver_num}: {e}")

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
