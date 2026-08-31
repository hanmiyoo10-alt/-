#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="${1:-$ROOT/restored}"
mkdir -p "$OUT_DIR"

cat "$ROOT"/source-gzip-base64/lightboard-light-status-window-2.0.0-inner-thoughts-always.part*.txt \
  | base64 --decode \
  | gzip --decompress \
  > "$OUT_DIR/lightboard-light-status-window-2.0.0-inner-thoughts-always.module.charx"

printf '%s  %s\n' \
  'ec099244aaee5bb3a0ac5cccc6658482cf082bac77d701b05cd041d4a20682c4' \
  "$OUT_DIR/lightboard-light-status-window-2.0.0-inner-thoughts-always.module.charx" \
  | sha256sum --check --status

echo "restored: $OUT_DIR/lightboard-light-status-window-2.0.0-inner-thoughts-always.module.charx"
