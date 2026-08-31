#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="${1:-$ROOT/restored}"
mkdir -p "$OUT_DIR"

cat "$ROOT"/source-gzip-base64/lightboard-livechat.part*.txt \
  | base64 --decode \
  | gzip --decompress \
  > "$OUT_DIR/lightboard-livechat.risum"

printf '%s  %s\n' \
  'bb299ded52a369c5cd5367ae5a90e56eaa2ee60af5cf3824b704668ceb7a5909' \
  "$OUT_DIR/lightboard-livechat.risum" \
  | sha256sum --check --status

echo "restored: $OUT_DIR/lightboard-livechat.risum"
