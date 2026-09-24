#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SOURCE_GUARD="$ROOT/files/pocketrisu-core-supervisor-guard.sh"
SOURCE_LAUNCHER="$ROOT/files/21-pocketrisu-core-supervisor-guard"
TMP="${TMPDIR:-/tmp}/pocketrisu-core-guard-test-$$"
PREFIX="$TMP/prefix"
HOME_FIX="$TMP/home"
SERVICE="$PREFIX/var/service/pocketrisu-ssh-tunnel"
STATE="$HOME_FIX/.local/state/pocketrisu-core-supervisor-guard"
TEST_STATE="$TMP/test-state"
GUARD="$HOME_FIX/.local/bin/pocketrisu-core-supervisor-guard"
LAUNCHER="$HOME_FIX/.termux/boot/21-pocketrisu-core-supervisor-guard"
AMBIG_PID=""

fail() {
    printf 'FAIL: %s\n' "$*" >&2
    exit 1
}

read_pid() {
    cat "$1" 2>/dev/null || true
}

stop_pidfile() {
    pid="$(read_pid "$1")"
    [ -n "$pid" ] || return 0
    kill -TERM "$pid" 2>/dev/null || true
    sleep 1
}
cleanup() {
    [ -n "$AMBIG_PID" ] && kill -TERM "$AMBIG_PID" 2>/dev/null || true
    if command -v pkill >/dev/null 2>&1; then
        pkill -TERM -f "$TMP/" 2>/dev/null || true
        sleep 1
        pkill -KILL -f "$TMP/" 2>/dev/null || true
    else
        stop_pidfile "$STATE/guard.pid"
        stop_pidfile "$STATE/anchor.pid"
        stop_pidfile "$TEST_STATE/runsv.pid"
    fi
    rm -rf "$TMP"
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$PREFIX/bin" "$SERVICE" "$HOME_FIX/.local/bin"     "$HOME_FIX/.termux/boot" "$STATE" "$TEST_STATE"

for command_name in nohup sleep sh date tr; do
    command_path="$(command -v "$command_name")"
    ln -s "$command_path" "$PREFIX/bin/$command_name"
done

cat > "$PREFIX/bin/sv" <<'EOF'
#!/usr/bin/env sh
[ "$1" = status ] || exit 2
if [ -e "$2/ambiguous" ]; then
    echo "unrecognized supervisor state"
    exit 1
fi
if [ -e "$2/supervisor-up" ]; then
    echo "run: $2: (pid 123) 1s"
else
    echo "fail: $2: runsv not running"
    exit 1
fi
EOF
cat > "$PREFIX/bin/runsv" <<'EOF'
#!/usr/bin/env sh
count_file="$POCKETRISU_TEST_STATE/runsv.count"
count="$(cat "$count_file" 2>/dev/null || echo 0)"
count=$((count + 1))
printf '%s\n' "$count" > "$count_file"
printf '%s\n' "$$" > "$POCKETRISU_TEST_STATE/runsv.pid"
touch "$1/supervisor-up"
trap 'rm -f "$1/supervisor-up"; exit 0' TERM INT HUP
while :; do sleep 30; done
EOF
chmod +x "$PREFIX/bin/sv" "$PREFIX/bin/runsv"

cp "$SOURCE_GUARD" "$GUARD"
cp "$SOURCE_LAUNCHER" "$LAUNCHER"
chmod +x "$GUARD" "$LAUNCHER"
printf '0\n' > "$TEST_STATE/runsv.count"

export HOME="$HOME_FIX"
export POCKETRISU_CORE_GUARD_TEST_MODE=1
export POCKETRISU_CORE_GUARD_TEST_ROOT="$TMP"
export POCKETRISU_CORE_GUARD_TEST_INTERVAL=1
export POCKETRISU_PREFIX="$PREFIX"
export POCKETRISU_SERVICE="$SERVICE"
export POCKETRISU_GUARD_STATE="$STATE"
export POCKETRISU_SV="$PREFIX/bin/sv"
export POCKETRISU_RUNSV="$PREFIX/bin/runsv"
export POCKETRISU_NOHUP="$PREFIX/bin/nohup"
export POCKETRISU_SLEEP="$PREFIX/bin/sleep"
export POCKETRISU_DATE="$PREFIX/bin/date"
export POCKETRISU_TR="$PREFIX/bin/tr"
export POCKETRISU_GUARD_INTERVAL=1
export POCKETRISU_TEST_STATE="$TEST_STATE"

run_guard() {
    "$PREFIX/bin/sh" "$GUARD" "$@"
}

run_launcher() {
    "$PREFIX/bin/sh" "$LAUNCHER" "$@"
}

wait_for_new_pid() {
    file="$1"
    old="$2"
    i=0
    while [ "$i" -lt 15 ]; do
        candidate="$(read_pid "$file")"
        if [ -n "$candidate" ] && [ "$candidate" != "$old" ] && kill -0 "$candidate" 2>/dev/null; then
            printf '%s\n' "$candidate"
            return 0
        fi
        sleep 1
        i=$((i + 1))
    done
    return 1
}
run_guard --once
[ -e "$SERVICE/supervisor-up" ] || fail "core supervisor not restored"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "unexpected initial runsv count"
grep -q 'result=supervisor-restored' "$STATE/events.log" || fail "restore evidence missing"

stop_pidfile "$TEST_STATE/runsv.pid"
rm -f "$SERVICE/supervisor-up"
touch "$SERVICE/down"
run_guard --once
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "operator down was overridden"
grep -q 'skip=operator-down' "$STATE/events.log" || fail "operator-down evidence missing"
rm -f "$SERVICE/down"

touch "$SERVICE/ambiguous"
set +e
run_guard --once >/dev/null 2>&1
ambiguous_rc=$?
set -e
[ "$ambiguous_rc" -eq 2 ] || fail "ambiguous status did not fail closed"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "ambiguous status started runsv"
rm -f "$SERVICE/ambiguous"

run_guard --once
[ "$(cat "$TEST_STATE/runsv.count")" = 2 ] || fail "core supervisor second restore missing"
run_launcher
guard_before="$(read_pid "$STATE/guard.pid")"
anchor_before="$(read_pid "$STATE/anchor.pid")"
[ -n "$guard_before" ] && kill -0 "$guard_before" 2>/dev/null || fail "guard loop not alive"
[ -n "$anchor_before" ] && kill -0 "$anchor_before" 2>/dev/null || fail "anchor not alive"
run_launcher & launch_one=$!
run_launcher & launch_two=$!
wait "$launch_one"
wait "$launch_two"
sleep 1
[ "$(read_pid "$STATE/guard.pid")" = "$guard_before" ] || fail "concurrent launch duplicated guard"
[ "$(read_pid "$STATE/anchor.pid")" = "$anchor_before" ] || fail "concurrent launch duplicated anchor"

kill -KILL "$guard_before" 2>/dev/null || fail "guard hard-loss kill failed"
guard_after="$(wait_for_new_pid "$STATE/guard.pid" "$guard_before")" || fail "anchor did not restore guard"
[ "$guard_after" != "$guard_before" ] || fail "guard pid did not change"

kill -KILL "$anchor_before" 2>/dev/null || fail "anchor hard-loss kill failed"
anchor_after="$(wait_for_new_pid "$STATE/anchor.pid" "$anchor_before")" || fail "guard did not restore anchor"
[ "$anchor_after" != "$anchor_before" ] || fail "anchor pid did not change"

target_before="$(cat "$TEST_STATE/runsv.count")"
touch "$SERVICE/down"
stop_pidfile "$TEST_STATE/runsv.pid"
rm -f "$SERVICE/supervisor-up"
sleep 3
[ "$(cat "$TEST_STATE/runsv.count")" = "$target_before" ] || fail "ring overrode target down"
rm -f "$SERVICE/down"

stop_pidfile "$STATE/guard.pid"
stop_pidfile "$STATE/anchor.pid"
sleep 1
rm -rf "$STATE/guard.lock" "$STATE/anchor.lock"
rm -f "$STATE/guard.pid" "$STATE/anchor.pid"
sleep 30 &
AMBIG_PID=$!
mkdir -p "$STATE/guard.lock"
printf '%s\n' "$AMBIG_PID" > "$STATE/guard.pid"
set +e
run_launcher >/dev/null 2>&1
guard_identity_rc=$?
set -e
[ "$guard_identity_rc" -eq 2 ] || fail "live non-guard pid did not fail closed"
kill -0 "$AMBIG_PID" 2>/dev/null || fail "ambiguous guard pid was killed"
[ ! -e "$STATE/anchor.pid" ] || fail "ambiguous guard state started anchor"
kill -TERM "$AMBIG_PID" 2>/dev/null || true
AMBIG_PID=""
rm -rf "$STATE/guard.lock"
rm -f "$STATE/guard.pid"

sleep 30 &
AMBIG_PID=$!
mkdir -p "$STATE/anchor.lock"
printf '%s\n' "$AMBIG_PID" > "$STATE/anchor.pid"
set +e
run_launcher --ensure-anchor >/dev/null 2>&1
anchor_identity_rc=$?
set -e
[ "$anchor_identity_rc" -eq 2 ] || fail "live non-anchor pid did not fail closed"
kill -0 "$AMBIG_PID" 2>/dev/null || fail "ambiguous anchor pid was killed"
kill -TERM "$AMBIG_PID" 2>/dev/null || true
AMBIG_PID=""

for file in "$GUARD" "$LAUNCHER"; do
    if grep -Eiq 'api/health|tailscale|wifi|cellular|network toggle|service-daemon|runsvdir' "$file"; then
        fail "forbidden broad/health trigger found in $(basename "$file")"
    fi
done

"$PREFIX/bin/sh" -n "$GUARD"
"$PREFIX/bin/sh" -n "$LAUNCHER"
echo "core-supervisor-guard anchor tests: PASS"
