#!/usr/bin/env bash
# Cloud startup script for Kairo SaaS containers.
# Writes a minimal config enabling Slack + Jira plugins, then starts the gateway.

set -euo pipefail

STATE_DIR="${OPENCLAW_STATE_DIR:-/home/node/.openclaw}"
PORT="${OPENCLAW_GATEWAY_PORT:-3000}"

mkdir -p "$STATE_DIR"

# Write config only if one doesn't already exist.
# Explicitly enable the Slack channel plugin and Jira tool plugin.
# Skills (like bug-triage) are bundled and discovered automatically.
if [ ! -f "$STATE_DIR/openclaw.json" ]; then
  cat > "$STATE_DIR/openclaw.json" <<'EOF'
{
  "plugins": {
    "entries": {
      "slack": { "enabled": true },
      "jira": { "enabled": true }
    }
  }
}
EOF
fi

exec node dist/index.js gateway --allow-unconfigured --bind lan --port "$PORT"
