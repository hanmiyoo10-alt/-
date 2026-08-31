#!/usr/bin/env bash
set -euo pipefail
OUT="${1:-.}"
mkdir -p "$OUT"
TMP="$(mktemp)"
trap 'rm -f "$TMP" "$TMP.gz"' EXIT
cat \
  source-gzip-base64/lightboard-interview-2.0.part001.txt \
  source-gzip-base64/lightboard-interview-2.0.part002.txt \
  | tr -d '\n\r ' | base64 -d > "$TMP.gz"
printf '%s  %s\n' "d6bb66dbfcce95d4445966413d1e8ce1d1bc812c98048c4ce4842a260b04a854" "$TMP.gz" | sha256sum -c -
gzip -dc "$TMP.gz" > "$OUT/lightboard-interview-2.0.risum"
printf '%s  %s\n' "99bc6753b2cda7cfe8925aa8eca65d0699d96da644bdc7953abc79d6c8839506" "$OUT/lightboard-interview-2.0.risum" | sha256sum -c -
echo "restored: $OUT/lightboard-interview-2.0.risum"
