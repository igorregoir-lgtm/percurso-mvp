#!/usr/bin/env bash
# Cloud Agent dev server for Percurso.
#
# Runs under the Node pinned in .nvmrc (FTS5-capable). Setting PORT makes
# server.js bind 0.0.0.0 (see the HOST logic in server.js), so the dev server is
# reachable through Cloud Agent port forwarding. The database auto-seeds with
# synthetic data on first boot.
set -euo pipefail
cd "$(dirname "$0")/.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

NODE_VERSION="$(tr -d '[:space:]' < .nvmrc)"
nvm use "$NODE_VERSION" >/dev/null 2>&1 || true

export PORT="${PORT:-3000}"
exec npm start
