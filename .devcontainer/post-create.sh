#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# .devcontainer/post-create.sh — Quilt Codespace setup
#
# Adapted from agent-workspace-template's post-create.sh pattern.
# Installs the Quilt toolchain and starts a long-running Quilt runtime
# exposed via ttyd (port 7681, browser TUI), HTTP API (port 4096), and
# dashboard (port 8080). Token-authenticated for external callers (IoT,
# agents, sibling Codespaces).
#
# After this script runs, the Codespace is a live Quilt runtime — any
# device with the QUILT_TOKEN can read/write/subscribe to its cells.
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

echo "═══════════════════════════════════════════════════════════════"
echo "  Quilt Codespace — post-create setup"
echo "═══════════════════════════════════════════════════════════════"

# ── Build Quilt from source ─────────────────────────────────────
echo "→ Building Quilt packages..."
cd /workspaces/*/quilt 2>/dev/null || cd "$(find / -name 'quilt' -type d -path '*/workspaces/*' 2>/dev/null | head -1)" || cd ~

# Install dependencies for the monorepo
npm install 2>&1 | tail -3

# Build all packages
npm run build 2>&1 | tail -3

# ── Generate a runtime token (if not provided) ──────────────────
if [ -z "${QUILT_TOKEN:-}" ]; then
  QUILT_TOKEN=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)
  echo "QUILT_TOKEN=$QUILT_TOKEN" >> ~/.quilt-env
  echo "  ✓ Generated runtime token (save this to push/pull cells from outside)"
fi
export QUILT_TOKEN

# ── Persistent state directory ──────────────────────────────────
mkdir -p ~/.quilt/state
mkdir -p ~/.quilt/traces

# ── Install ttyd (browser terminal for the Quilt TUI) ───────────
if ! command -v ttyd &>/dev/null; then
  echo "→ Installing ttyd (browser terminal)..."
  TTYD_VERSION="1.7.7"
  curl -L "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd.x86_64-unknown-linux-gnu" \
    -o /usr/local/bin/ttyd 2>/dev/null || \
  curl -L "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VERSION}/ttyd" \
    -o /usr/local/bin/ttyd
  chmod +x /usr/local/bin/ttyd
fi

# ── Start the Quilt runtime services ────────────────────────────
echo "→ Starting Quilt runtime services..."

# 1. Browser TUI on port 7681 (ttyd wrapping `quilt serve`)
nohup ttyd -p 7681 -W -t 'theme=quilt-dark' quilt serve ~/.quilt-state/default.yaml \
  > ~/.quilt/logs/ttyd.log 2>&1 &
echo $! > ~/.quilt/pids/ttyd.pid 2>/dev/null || mkdir -p ~/.quilt/pids && echo $! > ~/.quilt/pids/ttyd.pid

# 2. HTTP API on port 4096 (MCP-compatible cell access)
nohup npx @quilt/mcp-http --port 4096 --token "$QUILT_TOKEN" \
  > ~/.quilt/logs/mcp-http.log 2>&1 &
echo $! > ~/.quilt/pids/mcp-http.pid

# 3. Dashboard on port 8080 (the federation.html page)
nohup npx http-server -p 8080 -c-1 landing/ \
  > ~/.quilt/logs/dashboard.log 2>&1 &
echo $! > ~/.quilt/pids/dashboard.pid

# ── Print connection info ───────────────────────────────────────
sleep 2
CODESPACE_NAME="${CODESPACE_NAME:-this-codespace}"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✓ Quilt Codespace is live"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Browser TUI:   https://${CODESPACE_NAME}-7681.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-githubpreview.dev}"
echo "  HTTP API:      https://${CODESPACE_NAME}-4096.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-githubpreview.dev}"
echo "  Dashboard:     https://${CODESPACE_NAME}-8080.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-githubpreview.dev}"
echo ""
echo "  Token:         $QUILT_TOKEN"
echo ""
echo "  From anywhere (curl example):"
echo "    curl -H 'Authorization: Bearer $QUILT_TOKEN' \\"
echo "         https://${CODESPACE_NAME}-4096.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-githubpreview.dev}/cells/local/default/cells.value"
echo ""
echo "  Subscribe to a cell (SSE):"
echo "    curl -N -H 'Authorization: Bearer $QUILT_TOKEN' \\"
echo "         https://${CODESPACE_NAME}-4096.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-githubpreview.dev}/cells/local/default/cells.value/events"
echo ""
echo "═══════════════════════════════════════════════════════════════"
