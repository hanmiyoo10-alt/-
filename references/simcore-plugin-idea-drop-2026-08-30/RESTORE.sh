#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$ROOT/source-base64"
OUT="${1:-$ROOT/restored}"

mkdir -p "$OUT"

decode_base64() {
  if base64 --help 2>&1 | grep -q -- '--decode'; then
    base64 --decode
  else
    base64 -D
  fi
}

restore_one() {
  local dir="$1"
  local out="$2"
  cat "$SRC/$dir"/part* | decode_base64 > "$OUT/$out"
}

restore_one comments  lightboard-comments-4.0.0.charx
restore_one miniboard lightboard-miniboard-4.1.1.charx
restore_one hunternet lightboard-hunternet-4.0.0.charx
restore_one news       lightboard-news-4.0.0.charx
restore_one core       lightboard-core-4.1.1.charx
restore_one scripting  risuai-scripting-skill.zip

if command -v sha256sum >/dev/null 2>&1; then
  (cd "$OUT" && sha256sum -c "$ROOT/SHA256SUMS")
elif command -v shasum >/dev/null 2>&1; then
  while read -r expected file; do
    actual="$(shasum -a 256 "$OUT/$file" | awk '{print $1}')"
    [[ "$actual" == "$expected" ]] || {
      echo "SHA-256 mismatch: $file" >&2
      exit 1
    }
    echo "$file: OK"
  done < "$ROOT/SHA256SUMS"
else
  echo "No SHA-256 checker found (sha256sum or shasum required)." >&2
  exit 1
fi

echo "Restored reference artifacts into: $OUT"
