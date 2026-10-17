#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stage="$root/.deploy/web"
archive="$root/.deploy/pokkan-the-bot-web.zip"

rm -rf "$stage"
mkdir -p "$stage"
cp -a "$root/web/back/." "$stage/"
rm -f "$stage/config/master.key"
rm -rf "$stage/.bundle" "$stage/.git"
find "$stage" -type f \( -name '*.env' -o -name '.env' -o -name '.env.*' -o -name '*.key' \) ! -name '*.example' -delete
rm -rf "$stage/log" "$stage/tmp" "$stage/storage" "$stage/test"
rm -f "$stage/Dockerfile" "$stage/.dockerignore" "$stage/README.md"
mkdir -p "$stage/storage"
touch "$stage/storage/.keep"
# Static React assets belong exclusively to the Cloudflare Worker.
rm -rf "$stage/public/app"
rm -f "$archive"
(
  cd "$stage"
  zip -qr "$archive" .
)

echo "Packed Rails API: $archive"
