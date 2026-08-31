#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT_DIR="${1:-$ROOT/restored}"
mkdir -p "$OUT_DIR"

cat "$ROOT"/source-gzip-base64/lightboard-namuwiki-1.8.0.part*.txt \
  | base64 --decode \
  | gzip --decompress \
  > "$OUT_DIR/lightboard-namuwiki-1.8.0.risum"

printf '%s  %s\n' \
  'beba5a303b2f9ed249f31acae5b9f84e50f8927204ca7bc7dfe5a40c793d7389' \
  "$OUT_DIR/lightboard-namuwiki-1.8.0.risum" \
  | sha256sum --check --status

echo "restored: $OUT_DIR/lightboard-namuwiki-1.8.0.risum"
