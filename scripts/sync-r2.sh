#!/usr/bin/env bash
# Sync local data (team radio MP3s + telemetry JSONs) to Cloudflare R2.
#
# Prerequisites:
#   1. Install wrangler: npm i -g wrangler
#   2. Authenticate: wrangler login
#   3. Create R2 bucket: wrangler r2 bucket create f1-radio
#   4. Enable public access in Cloudflare dashboard:
#      R2 → f1-radio → Settings → Public Access → Custom Domain or r2.dev subdomain
#   5. Set env vars in Vercel:
#      - NEXT_PUBLIC_AUDIO_BASE_URL  (e.g. https://f1-radio.<id>.r2.dev)
#      - TELEMETRY_BASE_URL          (e.g. https://f1-radio.<id>.r2.dev/telemetry)
#
# Usage:
#   bash scripts/sync-r2.sh                  # sync everything (radio + telemetry)
#   bash scripts/sync-r2.sh radio            # sync only radio
#   bash scripts/sync-r2.sh telemetry        # sync only telemetry
#   bash scripts/sync-r2.sh radio 2025-R01   # sync specific race radio

set -euo pipefail

BUCKET="f1-radio"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RADIO_DIR="$PROJECT_ROOT/app/data/radio"
TELEMETRY_DIR="$PROJECT_ROOT/app/data/telemetry"

MODE="${1:-all}"      # all | radio | telemetry
FILTER="${2:-}"       # optional race filter for radio (e.g. 2025-R01)

uploaded=0
failed=0

# ── Radio sync ──────────────────────────────────────────────────────────
sync_radio() {
  if [ ! -d "$RADIO_DIR" ]; then
    echo "No radio directory found at $RADIO_DIR — skipping"
    return
  fi

  echo "=== Syncing team radio MP3s ==="

  for dir in "$RADIO_DIR"/*/; do
    [ -d "$dir" ] || continue
    race=$(basename "$dir")

    # Skip if filter is set and doesn't match
    if [ -n "$FILTER" ] && [ "$race" != "$FILTER" ]; then
      continue
    fi

    echo "  $race..."

    for mp3 in "$dir"*.mp3; do
      [ -f "$mp3" ] || continue
      filename=$(basename "$mp3")
      key="radio/${race}/${filename}"

      if wrangler r2 object put --remote "${BUCKET}/${key}" \
        --file "$mp3" \
        --content-type "audio/mpeg" \
        --cache-control "public, max-age=31536000, immutable" \
        2>/dev/null; then
        uploaded=$((uploaded + 1))
      else
        echo "    Failed: $key"
        failed=$((failed + 1))
      fi
    done
  done
}

# ── Telemetry sync ──────────────────────────────────────────────────────
sync_telemetry() {
  if [ ! -d "$TELEMETRY_DIR" ]; then
    echo "No telemetry directory found at $TELEMETRY_DIR — skipping"
    return
  fi

  echo "=== Syncing telemetry JSONs ==="

  for json in "$TELEMETRY_DIR"/*.json; do
    [ -f "$json" ] || continue
    filename=$(basename "$json")
    key="telemetry/${filename}"

    echo "  $filename..."

    if wrangler r2 object put --remote "${BUCKET}/${key}" \
      --file "$json" \
      --content-type "application/json" \
      --cache-control "public, max-age=31536000, immutable" \
      2>/dev/null; then
      uploaded=$((uploaded + 1))
    else
      echo "    Failed: $key"
      failed=$((failed + 1))
    fi
  done
}

# ── Run ─────────────────────────────────────────────────────────────────
case "$MODE" in
  radio)     sync_radio ;;
  telemetry) sync_telemetry ;;
  all)       sync_radio; sync_telemetry ;;
  *)
    echo "Usage: $0 [all|radio|telemetry] [race-filter]"
    exit 1
    ;;
esac

echo ""
echo "Done. Uploaded: $uploaded | Failed: $failed"
echo ""
echo "Env vars needed in Vercel:"
echo "  NEXT_PUBLIC_AUDIO_BASE_URL=https://f1-radio.<id>.r2.dev"
echo "  TELEMETRY_BASE_URL=https://f1-radio.<id>.r2.dev/telemetry"
