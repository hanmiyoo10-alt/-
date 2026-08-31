#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$ROOT/source-gzip-json-bytes/lightboard-status-window-4.0.0"
OUT="${1:-$ROOT/restored}"
NAME="lightboard-status-window-4.0.0.charx"
mkdir -p "$OUT"
python3 - "$SRC" "$OUT/$NAME" <<'PY'
import gzip, json, pathlib, sys
src = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
data = bytearray()
for part in sorted(src.glob("part-*.json")):
    values = json.loads(part.read_text(encoding="utf-8"))
    if not isinstance(values, list) or any(type(v) is not int or v < 0 or v > 255 for v in values):
        raise SystemExit(f"invalid byte array: {part}")
    data.extend(values)
out.write_bytes(gzip.decompress(bytes(data)))
PY
(cd "$OUT" && sha256sum -c "$ROOT/SHA256SUMS" --ignore-missing)
printf 'restored+verified: %s\n' "$OUT/$NAME"
