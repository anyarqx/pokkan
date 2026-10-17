#!/usr/bin/env bash
set -euo pipefail

app_id="${SQUARE_APP_ID:-}"
if [[ -z "$app_id" && $# -gt 0 ]]; then
  app_id="$1"
  shift
fi
if [[ -z "$app_id" ]]; then
  echo "Set SQUARE_APP_ID or pass the Square application ID." >&2
  exit 1
fi

npx -y @squarecloud/cli@3.0.1 app snapshot create "$app_id" "$@"
