#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT="${1:-$DIR/lightboard-sns-forme-0.3.1.risum}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

cat "$DIR"/source-gzip-base64/lightboard-sns-forme-0.3.1.part*.txt | base64 -d > "$TMP"
gzip -dc "$TMP" > "$OUT"

BYTES="$(wc -c < "$OUT" | tr -d ' ')"
SHA="$(sha256sum "$OUT" | awk '{print $1}')"

test "$BYTES" = "114438"
test "$SHA" = "b65acf7529c70de1145eef76e191cc6dffa061a33c71764084e38fe6dbfac0cb"

printf 'restored: %s\nbytes: %s\nsha256: %s\n' "$OUT" "$BYTES" "$SHA"
