#!/usr/bin/env bash
# Parallel upload of radio MP3s to R2 (much faster than one-at-a-time).
# Uses xargs -P for concurrent uploads.
set -euo pipefail

BUCKET="f1-radio"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RADIO_DIR="$PROJECT_ROOT/app/data/radio"
CONCURRENCY=20

if [ ! -d "$RADIO_DIR" ]; then
  echo "No radio directory at $RADIO_DIR"
  exit 1
fi

echo "=== Syncing team radio MP3s (${CONCURRENCY} parallel) ==="
echo "Finding files..."

# Build a list of all MP3s with their R2 keys
find "$RADIO_DIR" -name '*.mp3' -type f | while read -r mp3; do
  relpath="${mp3#$RADIO_DIR/}"
  echo "$mp3|radio/${relpath}"
done > /tmp/r2-radio-upload-list.txt

total=$(wc -l < /tmp/r2-radio-upload-list.txt)
echo "Found $total MP3 files to upload"

uploaded=0

# Upload function for xargs
export BUCKET
upload_one() {
  local line="$1"
  local filepath="${line%%|*}"
  local key="${line##*|}"

  if wrangler r2 object put --remote "${BUCKET}/${key}" \
    --file "$filepath" \
    --content-type "audio/mpeg" \
    --cache-control "public, max-age=31536000, immutable" \
    2>/dev/null; then
    echo -n "."
  else
    echo "FAILED: $key" >&2
  fi
}
export -f upload_one

# Run uploads in parallel
cat /tmp/r2-radio-upload-list.txt | xargs -P "$CONCURRENCY" -I {} bash -c 'upload_one "$@"' _ {}

echo ""
echo "Done! Uploaded $total radio files."
rm -f /tmp/r2-radio-upload-list.txt
