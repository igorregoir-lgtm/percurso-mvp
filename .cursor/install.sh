#!/usr/bin/env bash
# Cloud Agent install for Percurso.
#
# The project has zero npm dependencies, so there is nothing to download. The
# one hard requirement is the Node runtime: Percurso stores everything in
# node:sqlite, and the RAG corpus is a SQLite FTS5 index. FTS5 is compiled into
# the bundled SQLite starting with the Node build pinned in .nvmrc (Node 24);
# older builds fail at runtime with "no such module: fts5". This script pins
# that Node, then rebuilds the derived RAG index from the versioned corpus.
#
# Idempotent: safe to run repeatedly.
set -euo pipefail
cd "$(dirname "$0")/.."

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

NODE_VERSION="$(tr -d '[:space:]' < .nvmrc)"

# Install (no-op if already present) and make it the nvm default.
nvm install "$NODE_VERSION" >/dev/null
nvm alias default "$NODE_VERSION" >/dev/null

NODE_BIN="$(dirname "$(nvm which "$NODE_VERSION")")"
export PATH="$NODE_BIN:$PATH"

# The base image keeps an older Node ahead of nvm on PATH. A login-profile shim
# puts the FTS5-capable Node in front for every future interactive shell without
# touching that binary.
if command -v sudo >/dev/null 2>&1; then
  sudo tee /etc/profile.d/00-percurso-node.sh >/dev/null <<EOF
export NVM_DIR="\$HOME/.nvm"
export PATH="$NODE_BIN:\$PATH"
EOF
fi

echo "Using Node $(node --version) at $(command -v node)"

# Zero external deps: this only verifies the lockfile is honoured (no-op).
npm ci

# Rebuild the derived RAG FTS5 index from the versioned canonical corpus so the
# running server's /api/rag/search works. corpus.db is gitignored by design.
node src/rag/ingest.mjs

echo "Percurso install complete."
