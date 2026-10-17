#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$root/env/prod.env" ]]; then
  # Read only browser-safe values without evaluating private dotenv entries.
  read_public_env() { sed -n "s/^$1=//p" "$root/env/prod.env" | tail -n 1; }
  configured_api_origin="$(read_public_env VITE_API_ORIGIN)"
  configured_support_url="$(read_public_env VITE_SUPPORT_URL)"
  configured_youtube_url="$(read_public_env VITE_YOUTUBE_URL)"
  configured_github_url="$(read_public_env VITE_GITHUB_URL)"
  configured_creator_label="$(read_public_env VITE_CREATOR_LABEL)"
fi

npm --prefix "$root/web/front" ci --include=dev
npm --prefix "$root/web/front" run check
npm --prefix "$root/web/front" run test -- --run
VITE_API_ORIGIN="${configured_api_origin:-${VITE_API_ORIGIN:-}}" \
VITE_SUPPORT_URL="${configured_support_url:-${VITE_SUPPORT_URL:-}}" \
VITE_YOUTUBE_URL="${configured_youtube_url:-${VITE_YOUTUBE_URL:-}}" \
VITE_GITHUB_URL="${configured_github_url:-${VITE_GITHUB_URL:-}}" \
VITE_CREATOR_LABEL="${configured_creator_label:-${VITE_CREATOR_LABEL:-}}" \
npm --prefix "$root/web/front" run build
npm --prefix "$root/web/front" run check:bundle
npm --prefix "$root/web/front" exec -- wrangler deploy --config "$root/web/front/wrangler.jsonc" "$@"
