#!/usr/bin/env bash
set -euo pipefail

# Install or uninstall the penalty sync launchd agent.
#
# Usage:
#   bash scripts/install-launchd.sh              # install
#   bash scripts/install-launchd.sh --uninstall  # uninstall

PLIST_NAME="com.f1tracker.penalty-sync"
PLIST_DEST="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
TEMPLATE="${PROJECT_DIR}/${PLIST_NAME}.plist"

if [[ "${1:-}" == "--uninstall" ]]; then
  echo "Uninstalling ${PLIST_NAME}..."
  launchctl bootout "gui/$(id -u)/${PLIST_NAME}" 2>/dev/null || true
  rm -f "$PLIST_DEST"
  echo "✓ Uninstalled."
  exit 0
fi

# Detect node path
NODE_PATH="$(which node 2>/dev/null || true)"
if [[ -z "$NODE_PATH" ]]; then
  echo "Error: node not found in PATH."
  echo "Make sure Node.js is installed and in your PATH."
  exit 1
fi

echo "Installing ${PLIST_NAME}..."
echo "  Node:    $NODE_PATH"
echo "  Project: $PROJECT_DIR"

# Ensure directories exist
mkdir -p "$PROJECT_DIR/scripts/cache"
mkdir -p "$PROJECT_DIR/scripts/logs"
mkdir -p "$HOME/Library/LaunchAgents"

# Generate plist from template
sed \
  -e "s|__NODE_PATH__|${NODE_PATH}|g" \
  -e "s|__PROJECT_DIR__|${PROJECT_DIR}|g" \
  "$TEMPLATE" > "$PLIST_DEST"

# Unload if already loaded
launchctl bootout "gui/$(id -u)/${PLIST_NAME}" 2>/dev/null || true

# Load the agent
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"

echo "✓ Installed and loaded."
echo ""
echo "The sync will run every 30 minutes. During race weekends it will:"
echo "  • Sync penalty points from Liquipedia"
echo "  • Enrich with FIA document data (once daily)"
echo ""
echo "Check status: launchctl list | grep f1tracker"
echo "View logs:    tail -f ${PROJECT_DIR}/scripts/logs/sync-cron.log"
echo "Uninstall:    bash ${PROJECT_DIR}/scripts/install-launchd.sh --uninstall"
