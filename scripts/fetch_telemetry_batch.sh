#!/bin/bash
# Batch fetch telemetry for historical seasons using FastF1.
# Usage: bash scripts/fetch_telemetry_batch.sh

cd "$(dirname "$0")/.."

YEARS="2018:21 2019:21 2020:17 2021:22 2022:22 2023:23 2024:24"

for entry in $YEARS; do
  year="${entry%%:*}"
  max_round="${entry##*:}"
  echo ""
  echo "=== $year Season ($max_round rounds) ==="
  round=1
  while [ "$round" -le "$max_round" ]; do
    padded=$(printf "%02d" "$round")
    filename=$(ls app/data/telemetry/${year}-R${padded}-*.json 2>/dev/null || true)
    if [ -n "$filename" ]; then
      echo "  Skipping R$round (already exists: $(basename "$filename"))"
      round=$((round + 1))
      continue
    fi
    echo "  Fetching $year R$round..."
    python3 scripts/fetch_telemetry.py --year "$year" --round "$round" --session R 2>&1 || {
      echo "  WARNING: Failed $year R$round, continuing..."
    }
    round=$((round + 1))
  done
done

echo ""
echo "=== Telemetry backfill complete ==="
ls app/data/telemetry/*.json | wc -l | xargs echo "Total files:"
