#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="${1:-$ROOT/restored}"
mkdir -p "$OUT_DIR"

cat "$ROOT"/source-gzip-base64/lightboard-alter-store-1.03.1.part*.txt \
  | base64 --decode \
  | gzip --decompress \
  > "$OUT_DIR/lightboard-alter-store-1.03.1.risum"

printf '%s  %s\n' \
  'c4dae1d170b6c9cd506f15f1c646a51639e745cbeb8851d30342f97714ca1bd9' \
  "$OUT_DIR/lightboard-alter-store-1.03.1.risum" \
  | sha256sum --check --status

echo "restored: $OUT_DIR/lightboard-alter-store-1.03.1.risum"
