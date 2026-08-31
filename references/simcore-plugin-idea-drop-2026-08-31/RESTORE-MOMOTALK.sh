#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/source-gzip-base64/miniboard-renderer-momotalk-1.0.0"
OUT="${1:-$ROOT/restored}"
NAME="miniboard-renderer-momotalk-1.0.0.charx"
mkdir -p "$OUT"
cat "$SRC"/part-*.b64 | base64 --decode | gzip -dc > "$OUT/$NAME"
(cd "$OUT" && sha256sum -c "$ROOT/SHA256SUMS" --ignore-missing)
printf 'restored+verified: %s\n' "$OUT/$NAME"
