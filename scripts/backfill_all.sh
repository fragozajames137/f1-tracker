#!/usr/bin/env bash
# Backfill all telemetry JSON files with the updated fetch_telemetry.py script.
# Extracts year/round from existing filenames and re-runs the fetcher.
#
# Usage: bash scripts/backfill_all.sh 2>&1 | tee scripts/backfill.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TELEMETRY_DIR="$SCRIPT_DIR/../app/data/telemetry"
FETCH_SCRIPT="$SCRIPT_DIR/fetch_telemetry.py"

total=$(ls "$TELEMETRY_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
current=0
failed=0

echo "=== Backfilling $total telemetry files ==="
echo "Started: $(date)"
echo ""

for file in "$TELEMETRY_DIR"/*.json; do
  filename=$(basename "$file" .json)
  # Parse: 2025-R01-australian-grand-prix -> year=2025, round=1
  year=$(echo "$filename" | cut -d'-' -f1)
  round=$(echo "$filename" | cut -d'-' -f2 | sed 's/^R0*//')

  current=$((current + 1))
  echo "[$current/$total] $year Round $round ($filename)"

  if python3 "$FETCH_SCRIPT" --year "$year" --round "$round" 2>&1; then
    echo "  ✓ Done"
  else
    echo "  ✗ FAILED"
    failed=$((failed + 1))
  fi
  echo ""
done

echo "=== Backfill complete ==="
echo "Finished: $(date)"
echo "Total: $total | Succeeded: $((total - failed)) | Failed: $failed"
