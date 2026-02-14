#!/usr/bin/env bash
# Generate telemetry-manifest.json from the telemetry directory.
# This small file is committed to git so production can list available telemetry
# without scanning the filesystem.
#
# Usage: bash scripts/generate-telemetry-manifest.sh > app/data/telemetry-manifest.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TELEMETRY_DIR="$SCRIPT_DIR/../app/data/telemetry"

python3 -c "
import os, json, re, sys

telemetry_dir = sys.argv[1]
entries = []
for f in sorted(os.listdir(telemetry_dir)):
    if not f.endswith('.json'):
        continue
    m = re.match(r'^(\d{4})-R(\d{2})-(.+)\.json$', f)
    if not m:
        continue
    entries.append({
        'filename': f,
        'year': int(m.group(1)),
        'round': int(m.group(2)),
        'slug': m.group(3),
    })

json.dump(entries, sys.stdout, indent=2)
print()
" "$TELEMETRY_DIR"
