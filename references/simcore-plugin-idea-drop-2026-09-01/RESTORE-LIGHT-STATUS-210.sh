#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$HERE/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.module.charx}"
TMP="$(mktemp)"
trap 'rm -f "$TMP" "$TMP.gz"' EXIT
cat \
  "$HERE/source-gzip-base64/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.part001.txt" \
  "$HERE/source-gzip-base64/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.part002.txt" \
  "$HERE/source-gzip-base64/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.part003.txt" \
  "$HERE/source-gzip-base64/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.part004.txt" \
  "$HERE/source-gzip-base64/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.part005.txt" \
  "$HERE/source-gzip-base64/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.part006.txt" \
  "$HERE/source-gzip-base64/lightboard-light-status-window-2.1.0-inner-thoughts-toggle.part007.txt" > "$TMP"
base64 --decode "$TMP" > "$TMP.gz"
gzip --decompress --stdout "$TMP.gz" > "$OUT"
printf 'sha256  '
sha256sum "$OUT"
printf 'bytes   '
wc -c < "$OUT"
