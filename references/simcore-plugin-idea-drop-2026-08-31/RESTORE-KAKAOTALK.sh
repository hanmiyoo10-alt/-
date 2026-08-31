#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/source-base64/lightboard-kakaotalk-v1.3-3.0.0-popover"
OUT="${1:-$ROOT/restored}"
NAME="lightboard-kakaotalk-v1.3-3.0.0-popover.risum"
mkdir -p "$OUT"
cat "$SRC"/part-*.b64 | base64 --decode > "$OUT/$NAME"
if [ -f "$ROOT/SHA256SUMS" ]; then
  (cd "$OUT" && sha256sum -c "$ROOT/SHA256SUMS" --ignore-missing)
fi
printf 'restored: %s\n' "$OUT/$NAME"
