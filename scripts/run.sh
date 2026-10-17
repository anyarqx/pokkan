#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

if [[ ! -f "$root/env/dev.env" ]]; then
  echo "Missing env/dev.env. Copy env/dev.env.example and configure local values." >&2
  exit 1
fi

docker compose --env-file "$root/env/dev.env" up --build "$@"
