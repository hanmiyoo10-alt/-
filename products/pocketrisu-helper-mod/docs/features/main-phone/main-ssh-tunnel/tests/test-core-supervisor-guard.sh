#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
GUARD="$ROOT/files/pocketrisu-core-supervisor-guard.sh"
TMP="${TMPDIR:-/tmp}/pocketrisu-core-guard-test-$$"
PREFIX="$TMP/prefix"
SERVICE="$TMP/service"
STATE="$TMP/state"

cleanup() {
    [ -r "$TMP/runsv.pid" ] && kill "$(cat "$TMP/runsv.pid")" 2>/dev/null || true
    rm -rf "$TMP"
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$PREFIX/bin" "$SERVICE" "$STATE"

cat > "$PREFIX/bin/sv" <<'EOF'
#!/usr/bin/env sh
if [ "$1" != status ]; then exit 2; fi
if [ -e "$2/supervisor-up" ]; then
    echo "run: $2: (pid 123) 1s"
else
    echo "fail: $2: runsv not running"
    exit 1
fi
EOF

cat > "$PREFIX/bin/runsv" <<'EOF'
#!/usr/bin/env sh
touch "$1/supervisor-up"
echo "$$" > "$POCKETRISU_TEST_ROOT/runsv.pid"
trap 'rm -f "$1/supervisor-up"; exit 0' TERM INT HUP
while :; do sleep 30; done
EOF

chmod +x "$PREFIX/bin/sv" "$PREFIX/bin/runsv"

POCKETRISU_TEST_ROOT="$TMP" \
POCKETRISU_PREFIX="$PREFIX" \
POCKETRISU_SERVICE="$SERVICE" \
POCKETRISU_GUARD_STATE="$STATE" \
POCKETRISU_NOHUP="$(command -v nohup)" \
POCKETRISU_SLEEP="$(command -v sleep)" \
POCKETRISU_DATE="$(command -v date)" \
sh "$GUARD" --once

[ -e "$SERVICE/supervisor-up" ]
grep -q 'result=supervisor-restored' "$STATE/events.log"

kill "$(cat "$TMP/runsv.pid")" 2>/dev/null || true
sleep 1
rm -f "$SERVICE/supervisor-up"
touch "$SERVICE/down"

POCKETRISU_TEST_ROOT="$TMP" \
POCKETRISU_PREFIX="$PREFIX" \
POCKETRISU_SERVICE="$SERVICE" \
POCKETRISU_GUARD_STATE="$STATE" \
POCKETRISU_NOHUP="$(command -v nohup)" \
POCKETRISU_SLEEP="$(command -v sleep)" \
POCKETRISU_DATE="$(command -v date)" \
sh "$GUARD" --once

[ ! -e "$SERVICE/supervisor-up" ]
grep -q 'skip=operator-down' "$STATE/events.log"
echo "core-supervisor-guard tests: PASS"
