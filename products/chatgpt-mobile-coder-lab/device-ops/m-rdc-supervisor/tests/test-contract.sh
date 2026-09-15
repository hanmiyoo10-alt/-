#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
GUARD="$ROOT/m-rdc-supervisor-guard"
INSTALL="$ROOT/install.sh"
LAUNCHER="$ROOT/31-mcl-m-rdc-supervisor-guard"

if [ -n "${TMPDIR:-}" ]; then
    TMP="$(mktemp -d "$TMPDIR/mcl-m-rdc-supervisor-test.XXXXXX")"
else
    TMP="$(mktemp -d)"
fi
TEST_ROOT="$TMP/root"
PREFIX="$TEST_ROOT/prefix"
HOME_FIX="$TEST_ROOT/home"
SERVICE="$PREFIX/var/service/desktop-commander-remote"
TEST_STATE="$TMP/test-state"

cleanup() {
    if [ -r "$TEST_STATE/runsv.pid" ]; then
        kill "$(cat "$TEST_STATE/runsv.pid")" 2>/dev/null || true
    fi
    if [ -n "${LOOP_PID:-}" ]; then
        kill "$LOOP_PID" 2>/dev/null || true
    fi
    rm -rf "$TMP"
}
trap cleanup EXIT INT TERM HUP
fail() {
    printf '%s\n' "FAIL: $*" >&2
    exit 1
}

mkdir -p "$PREFIX/bin" "$SERVICE" "$HOME_FIX" "$TEST_STATE"
ln -s "$(command -v nohup)" "$PREFIX/bin/nohup"
ln -s "$(command -v sleep)" "$PREFIX/bin/sleep"

printf '#!%s\n' "$(command -v sh)" > "$PREFIX/bin/sv"
cat >> "$PREFIX/bin/sv" <<'EOF'
[ "${1:-}" = status ] || exit 2
service="${2:-}"
if [ -e "$service/ambiguous" ]; then
    echo "unexpected supervisor state"
    exit 1
fi
if [ -e "$service/supervisor-up" ]; then
    echo "run: service: (pid 123) 1s"
    exit 0
fi
echo "fail: service: runsv not running"
exit 1
EOF
chmod +x "$PREFIX/bin/sv"
printf '#!%s\n' "$(command -v sh)" > "$PREFIX/bin/runsv"
cat >> "$PREFIX/bin/runsv" <<'EOF'
set -eu
service="$1"
count_file="$MCL_M_RDC_TEST_STATE/runsv.count"
count=0
[ ! -r "$count_file" ] || count="$(cat "$count_file")"
count=$((count + 1))
printf '%s\n' "$count" > "$count_file"
touch "$service/supervisor-up"
printf '%s\n' "$$" > "$MCL_M_RDC_TEST_STATE/runsv.pid"
cleanup_runsv() {
    rm -f "$service/supervisor-up"
}
trap 'cleanup_runsv; exit 0' TERM INT HUP
while :; do sleep 30; done
EOF
chmod +x "$PREFIX/bin/runsv"

run_guard() {
    MCL_M_RDC_SUPERVISOR_TEST_MODE=1 \
    MCL_M_RDC_SUPERVISOR_TEST_ROOT="$TEST_ROOT" \
    MCL_M_RDC_TEST_STATE="$TEST_STATE" \
    sh "$GUARD" "$@"
}
set +e
check_out="$(run_guard --check 2>&1)"
check_rc=$?
set -e
[ "$check_rc" -eq 1 ] || fail "missing supervisor check rc=$check_rc"
printf '%s\n' "$check_out" | grep -Fxq 'schema=mcl-m-rdc-supervisor.v1' || fail "check schema"
printf '%s\n' "$check_out" | grep -Fxq 'service=desktop-commander-remote' || fail "fixed service receipt"
printf '%s\n' "$check_out" | grep -Fxq 'supervision=missing' || fail "missing receipt"
printf '%s\n' "$check_out" | grep -Fxq 'details=withheld' || fail "withheld receipt"
[ ! -e "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard" ] || fail "check mutated state"

run_guard --once
[ -e "$SERVICE/supervisor-up" ] || fail "missing supervisor not restored"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "expected one runsv start"
grep -Fxq 'result=supervisor-restored' "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/events.log" || fail "restore receipt"

run_guard --once
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "healthy supervisor restarted"

kill "$(cat "$TEST_STATE/runsv.pid")" 2>/dev/null || true
sleep 1
rm -f "$SERVICE/supervisor-up"
touch "$SERVICE/down"
run_guard --once
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "operator down overridden"
grep -Fxq 'skip=operator-down' "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/events.log" || fail "down receipt"
rm -f "$SERVICE/down"
touch "$SERVICE/ambiguous"
set +e
run_guard --once >/dev/null 2>&1
ambiguous_rc=$?
set -e
[ "$ambiguous_rc" -eq 2 ] || fail "ambiguous state rc=$ambiguous_rc"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "ambiguous state started runsv"
grep -Fxq 'skip=ambiguous-status' "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/events.log" || fail "ambiguous receipt"

rm -f "$SERVICE/ambiguous"
touch "$SERVICE/supervisor-up"
run_guard --loop >/dev/null 2>&1 &
LOOP_PID=$!
lock_pid="$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/guard.pid"
i=0
while [ ! -s "$lock_pid" ] && [ "$i" -lt 20 ]; do
    sleep 1
    i=$((i + 1))
done
[ -s "$lock_pid" ] || fail "loop lock not acquired"
run_guard --loop >/dev/null 2>&1 &
SECOND_PID=$!
sleep 1
if kill -0 "$SECOND_PID" 2>/dev/null; then
    kill "$SECOND_PID" 2>/dev/null || true
    fail "duplicate guard remained running"
fi
wait "$SECOND_PID"
kill "$LOOP_PID" 2>/dev/null || true
wait "$LOOP_PID" 2>/dev/null || true
LOOP_PID=
run_install() {
    MCL_M_RDC_SUPERVISOR_TEST_MODE=1 \
    MCL_M_RDC_SUPERVISOR_TEST_ROOT="$TEST_ROOT" \
    sh "$INSTALL" "$@"
}

rm -rf "$HOME_FIX/.local/bin" "$HOME_FIX/.termux/boot"
set +e
install_check="$(run_install --check 2>&1)"
install_rc=$?
set -e
[ "$install_rc" -eq 1 ] || fail "initial install check rc=$install_rc"
printf '%s\n' "$install_check" | grep -Fxq 'guard=missing' || fail "guard missing receipt"
printf '%s\n' "$install_check" | grep -Fxq 'launcher=missing' || fail "launcher missing receipt"
[ ! -e "$HOME_FIX/.local/bin" ] || fail "install check created bin dir"
[ ! -e "$HOME_FIX/.termux/boot" ] || fail "install check created boot dir"

apply_out="$(run_install --apply)"
printf '%s\n' "$apply_out" | grep -Fxq 'result=pass' || fail "apply did not converge"
cmp -s "$GUARD" "$HOME_FIX/.local/bin/mcl-m-rdc-supervisor-guard" || fail "installed guard drift"
cmp -s "$LAUNCHER" "$HOME_FIX/.termux/boot/31-mcl-m-rdc-supervisor-guard" || fail "installed launcher drift"
[ -x "$HOME_FIX/.local/bin/mcl-m-rdc-supervisor-guard" ] || fail "installed guard not executable"
[ -x "$HOME_FIX/.termux/boot/31-mcl-m-rdc-supervisor-guard" ] || fail "installed launcher not executable"
[ "$(printf '%s\n' "$check_out" | wc -l | tr -d ' ')" = 4 ] || fail "check receipt line count"
[ "$(printf '%s\n' "$apply_out" | wc -l | tr -d ' ')" = 5 ] || fail "install receipt line count"

for script in "$GUARD" "$INSTALL" "$LAUNCHER"; do
    sh -n "$script" || fail "syntax: $script"
    if grep -E 'service-daemon|runsvdir|termux-wake-lock|pocketrisu|tailscale|sshd|notification' "$script" >/dev/null; then
        fail "forbidden broad surface in $script"
    fi
done

grep -Fq 'var/service/desktop-commander-remote' "$GUARD" || fail "fixed service path missing"
if grep -Eq 'MCL_M_RDC_.*SERVICE|SERVICE_OVERRIDE|COMMAND_OVERRIDE|PATH_OVERRIDE' "$GUARD" "$INSTALL"; then
    fail "arbitrary production override exposed"
fi

set +e
sh "$GUARD" --bogus >/dev/null 2>&1
guard_bad=$?
sh "$INSTALL" --bogus >/dev/null 2>&1
install_bad=$?
set -e
[ "$guard_bad" -eq 2 ] || fail "guard invalid invocation rc=$guard_bad"
[ "$install_bad" -eq 2 ] || fail "install invalid invocation rc=$install_bad"

echo 'm-rdc-supervisor contract: PASS'
