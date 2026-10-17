#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
app_id="${SQUARE_APP_ID:-${1:-}}"
if [[ -z "$app_id" ]]; then
  echo "Set SQUARE_APP_ID or pass the existing Square application ID." >&2
  exit 1
fi
if [[ $# -gt 0 ]]; then shift; fi

"$root/scripts/pack.sh"

cd "$root"
npx -y @squarecloud/cli@3.0.1 app commit "$app_id" --file ".deploy/pokkan-the-bot-web.zip" --restart "$@"
