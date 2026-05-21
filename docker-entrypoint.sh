#!/bin/sh
set -eu

OUTPUT_DIR="${CLOAKBROWSER_MCP_OUTPUT_DIR:-/data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$OUTPUT_DIR"
  chmod ugo+rwx "$OUTPUT_DIR" 2>/dev/null || true
  mkdir -p /home/app/.cache
  chown -R app:app /home/app 2>/dev/null || true
  export HOME=/home/app
  exec gosu app node dist/cli.js "$@"
fi

exec node dist/cli.js "$@"
