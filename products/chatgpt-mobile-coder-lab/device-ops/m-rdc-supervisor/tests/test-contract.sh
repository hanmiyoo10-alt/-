#!/bin/sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
GUARD="$ROOT/m-rdc-supervisor-guard"
INSTALL="$ROOT/install.sh"
LAUNCHER="$ROOT/31-mcl-m-rdc-supervisor-guard"
SERVICE_RUN="$ROOT/service/run"

if [ -n "${TMPDIR:-}" ]; then
    TMP="$(mktemp -d "$TMPDIR/mcl-m-rdc-supervisor-test.XXXXXX")"
else
    TMP="$(mktemp -d)"
fi
TEST_ROOT="$TMP/root"
PREFIX="$TEST_ROOT/prefix"
HOME_FIX="$TEST_ROOT/home"
TARGET="$PREFIX/var/service/desktop-commander-remote"
GUARD_SERVICE="$PREFIX/var/service/mcl-m-rdc-supervisor-guard"
TEST_STATE="$TMP/test-state"

force_stop_pid() {
    pid="$1"
    [ -n "$pid" ] || return 0
    kill "$pid" 2>/dev/null || return 0
    i=0
    while kill -0 "$pid" 2>/dev/null && [ "$i" -lt 3 ]; do
        sleep 1
        i=$((i + 1))
    done
    if kill -0 "$pid" 2>/dev/null; then
        kill -KILL "$pid" 2>/dev/null || true
    fi
    wait "$pid" 2>/dev/null || true
}
read_pid() {
    [ -r "$1" ] && cat "$1" || true
}
cleanup() {
    force_stop_pid "$(read_pid "$TEST_STATE/guard-runsv.pid")"
    force_stop_pid "$(read_pid "$TEST_STATE/target-runsv.pid")"
    force_stop_pid "${SECOND_PID:-}"
    force_stop_pid "${LOOP_PID:-}"
    rm -rf "$TMP"
}
trap cleanup EXIT INT TERM HUP
fail() {
    printf '%s\n' "FAIL: $*" >&2
    exit 1
}
wait_for_file() {
    file="$1"
    i=0
    while [ ! -s "$file" ] && [ "$i" -lt 20 ]; do
        sleep 1
        i=$((i + 1))
    done
    [ -s "$file" ] || fail "timed out waiting for $file"
}

mkdir -p "$PREFIX/bin" "$TARGET" "$HOME_FIX" "$TEST_STATE"
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
name="$(basename "$service")"
mkdir -p "$service/supervise"
lock="$service/supervise/lock.fixture"
mkdir "$lock" 2>/dev/null || exit 1
child=
cleanup_runsv() {
    if [ -n "$child" ]; then
        kill "$child" 2>/dev/null || true
        wait "$child" 2>/dev/null || true
    fi
    rm -f "$service/supervisor-up"
    rmdir "$lock" 2>/dev/null || true
}
trap 'cleanup_runsv; exit 0' TERM INT HUP
touch "$service/supervisor-up"
case "$name" in
    desktop-commander-remote)
        count_file="$MCL_M_RDC_TEST_STATE/target-runsv.count"
        count=0
        [ ! -r "$count_file" ] || count="$(cat "$count_file")"
        count=$((count + 1))
        printf '%s\n' "$count" > "$count_file"
        printf '%s\n' "$$" > "$MCL_M_RDC_TEST_STATE/target-runsv.pid"
        while :; do sleep 1; done
        ;;
    mcl-m-rdc-supervisor-guard)
        count_file="$MCL_M_RDC_TEST_STATE/guard-runsv.count"
        count=0
        [ ! -r "$count_file" ] || count="$(cat "$count_file")"
        count=$((count + 1))
        printf '%s\n' "$count" > "$count_file"
        printf '%s\n' "$$" > "$MCL_M_RDC_TEST_STATE/guard-runsv.pid"
        while :; do
            "$service/run" &
            child=$!
            printf '%s\n' "$child" > "$MCL_M_RDC_TEST_STATE/guard-child.pid"
            wait "$child" 2>/dev/null || true
            child=
            sleep 1
        done
        ;;
    *)
        cleanup_runsv
        exit 2
        ;;
esac
EOF
chmod +x "$PREFIX/bin/runsv"
run_guard() {
    MCL_M_RDC_SUPERVISOR_TEST_MODE=1 \
    MCL_M_RDC_SUPERVISOR_TEST_ROOT="$TEST_ROOT" \
    MCL_M_RDC_TEST_STATE="$TEST_STATE" \
    sh "$GUARD" "$@"
}
start_guard_loop() {
    MCL_M_RDC_SUPERVISOR_TEST_MODE=1 \
    MCL_M_RDC_SUPERVISOR_TEST_ROOT="$TEST_ROOT" \
    MCL_M_RDC_SUPERVISOR_TEST_INTERVAL=1 \
    MCL_M_RDC_TEST_STATE="$TEST_STATE" \
    sh "$GUARD" --loop >/dev/null 2>&1 &
    LOOP_PID=$!
}
run_install() {
    MCL_M_RDC_SUPERVISOR_TEST_MODE=1 \
    MCL_M_RDC_SUPERVISOR_TEST_ROOT="$TEST_ROOT" \
    sh "$INSTALL" "$@"
}
run_launcher() {
    MCL_M_RDC_SUPERVISOR_TEST_MODE=1 \
    MCL_M_RDC_SUPERVISOR_TEST_ROOT="$TEST_ROOT" \
    MCL_M_RDC_SUPERVISOR_TEST_INTERVAL=1 \
    MCL_M_RDC_TEST_STATE="$TEST_STATE" \
    sh "$LAUNCHER"
}
wait_for_loop_lock() {
    wait_for_file "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/guard.pid"
}
stop_loop_term() {
    kill -TERM "$LOOP_PID" 2>/dev/null || fail "TERM signal delivery"
    i=0
    while kill -0 "$LOOP_PID" 2>/dev/null && [ "$i" -lt 5 ]; do sleep 1; i=$((i + 1)); done
    kill -0 "$LOOP_PID" 2>/dev/null && fail "loop ignored TERM"
    wait "$LOOP_PID" || fail "loop TERM exit"
    LOOP_PID=
    [ ! -e "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/guard.pid" ] || fail "pidfile survived TERM"
    [ ! -d "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/guard.lock" ] || fail "lock survived TERM"
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
[ -e "$TARGET/supervisor-up" ] || fail "missing RDC supervisor not restored"
[ "$(cat "$TEST_STATE/target-runsv.count")" = 1 ] || fail "expected one RDC runsv start"
grep -Fxq 'result=supervisor-restored' "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/events.log" || fail "restore receipt"
run_guard --once
[ "$(cat "$TEST_STATE/target-runsv.count")" = 1 ] || fail "healthy RDC supervisor restarted"

force_stop_pid "$(read_pid "$TEST_STATE/target-runsv.pid")"
sleep 1
rm -f "$TARGET/supervisor-up"
touch "$TARGET/down"
run_guard --once
[ "$(cat "$TEST_STATE/target-runsv.count")" = 1 ] || fail "operator down overridden"
grep -Fxq 'skip=operator-down' "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/events.log" || fail "down receipt"
rm -f "$TARGET/down"
touch "$TARGET/ambiguous"
set +e
run_guard --once >/dev/null 2>&1
ambiguous_rc=$?
set -e
[ "$ambiguous_rc" -eq 2 ] || fail "ambiguous RDC state rc=$ambiguous_rc"
[ "$(cat "$TEST_STATE/target-runsv.count")" = 1 ] || fail "ambiguous RDC state started runsv"
rm -f "$TARGET/ambiguous"

touch "$TARGET/supervisor-up"
start_guard_loop
wait_for_loop_lock
MCL_M_RDC_SUPERVISOR_TEST_MODE=1 \
MCL_M_RDC_SUPERVISOR_TEST_ROOT="$TEST_ROOT" \
MCL_M_RDC_SUPERVISOR_TEST_INTERVAL=1 \
MCL_M_RDC_TEST_STATE="$TEST_STATE" \
sh "$GUARD" --loop >/dev/null 2>&1 &
SECOND_PID=$!
sleep 1
if kill -0 "$SECOND_PID" 2>/dev/null; then
    force_stop_pid "$SECOND_PID"
    SECOND_PID=
    fail "duplicate guard loop remained running"
fi
wait "$SECOND_PID"
SECOND_PID=
stop_loop_term

rm -rf "$HOME_FIX/.local/bin" "$HOME_FIX/.termux/boot" "$GUARD_SERVICE"
set +e
install_check="$(run_install --check 2>&1)"
install_rc=$?
set -e
[ "$install_rc" -eq 1 ] || fail "initial install check rc=$install_rc"
printf '%s\n' "$install_check" | grep -Fxq 'schema=mcl-m-rdc-supervisor-install.v2' || fail "install schema"
printf '%s\n' "$install_check" | grep -Fxq 'guard=missing' || fail "guard missing receipt"
printf '%s\n' "$install_check" | grep -Fxq 'guard_service=missing' || fail "guard service missing receipt"
printf '%s\n' "$install_check" | grep -Fxq 'launcher=missing' || fail "launcher missing receipt"
[ ! -e "$HOME_FIX/.local/bin" ] || fail "install check created bin dir"
[ ! -e "$HOME_FIX/.termux/boot" ] || fail "install check created boot dir"
[ ! -e "$GUARD_SERVICE" ] || fail "install check created service dir"

mkdir -p "$TMP/conflict"
ln -s "$TMP/conflict" "$GUARD_SERVICE"
set +e
run_install --check >/dev/null 2>&1
conflict_check_rc=$?
run_install --apply >/dev/null 2>&1
conflict_apply_rc=$?
set -e
[ "$conflict_check_rc" -eq 2 ] || fail "service symlink check did not block"
[ "$conflict_apply_rc" -eq 2 ] || fail "service symlink apply did not block"
rm "$GUARD_SERVICE"

apply_out="$(run_install --apply)"
printf '%s\n' "$apply_out" | grep -Fxq 'result=pass' || fail "apply did not converge"
cmp -s "$GUARD" "$HOME_FIX/.local/bin/mcl-m-rdc-supervisor-guard" || fail "installed guard drift"
cmp -s "$SERVICE_RUN" "$GUARD_SERVICE/run" || fail "installed service run drift"
cmp -s "$LAUNCHER" "$HOME_FIX/.termux/boot/31-mcl-m-rdc-supervisor-guard" || fail "installed launcher drift"
[ -x "$HOME_FIX/.local/bin/mcl-m-rdc-supervisor-guard" ] || fail "installed guard not executable"
[ -x "$GUARD_SERVICE/run" ] || fail "installed service run not executable"
[ -x "$HOME_FIX/.termux/boot/31-mcl-m-rdc-supervisor-guard" ] || fail "installed launcher not executable"
if find "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard" -maxdepth 1 -name 'install-service.*' -print 2>/dev/null | grep -q .; then
    fail "installer staging residue"
fi
[ "$(printf '%s\n' "$check_out" | wc -l | tr -d ' ')" = 4 ] || fail "check receipt line count"
[ "$(printf '%s\n' "$apply_out" | wc -l | tr -d ' ')" = 6 ] || fail "install receipt line count"
rm -f "$TARGET/ambiguous"
touch "$TARGET/supervisor-up"
run_launcher
wait_for_file "$TEST_STATE/guard-runsv.pid"
wait_for_file "$TEST_STATE/guard-child.pid"
[ "$(cat "$TEST_STATE/guard-runsv.count")" = 1 ] || fail "guard supervisor start count"
guard_supervisor_pid="$(cat "$TEST_STATE/guard-runsv.pid")"
guard_child_before="$(cat "$TEST_STATE/guard-child.pid")"
kill -0 "$guard_supervisor_pid" 2>/dev/null || fail "guard supervisor not alive"
kill -0 "$guard_child_before" 2>/dev/null || fail "guard child not alive"

run_launcher
sleep 1
[ "$(cat "$TEST_STATE/guard-runsv.count")" = 1 ] || fail "healthy guard supervisor duplicated"

kill -KILL "$guard_child_before" 2>/dev/null || fail "guard child kill"
i=0
guard_child_after="$guard_child_before"
while [ "$guard_child_after" = "$guard_child_before" ] && [ "$i" -lt 10 ]; do
    sleep 1
    guard_child_after="$(read_pid "$TEST_STATE/guard-child.pid")"
    i=$((i + 1))
done
[ -n "$guard_child_after" ] || fail "guard child restart pid missing"
[ "$guard_child_after" != "$guard_child_before" ] || fail "guard child not restarted"
kill -0 "$guard_child_after" 2>/dev/null || fail "restarted guard child not alive"
[ "$(cat "$TEST_STATE/guard-runsv.pid")" = "$guard_supervisor_pid" ] || fail "guard supervisor changed during child restart"
kill -0 "$guard_supervisor_pid" 2>/dev/null || fail "guard supervisor died during child restart"
force_stop_pid "$guard_supervisor_pid"
sleep 1
rm -f "$GUARD_SERVICE/supervisor-up"
count_before="$(cat "$TEST_STATE/guard-runsv.count")"
run_launcher & launch_one=$!
run_launcher & launch_two=$!
wait "$launch_one"
wait "$launch_two"
wait_for_file "$TEST_STATE/guard-runsv.pid"
sleep 1
count_after="$(cat "$TEST_STATE/guard-runsv.count")"
[ "$count_after" -eq $((count_before + 1)) ] || fail "concurrent launch created duplicate guard supervisors"
new_guard_supervisor="$(cat "$TEST_STATE/guard-runsv.pid")"
kill -0 "$new_guard_supervisor" 2>/dev/null || fail "concurrent launch supervisor not alive"

force_stop_pid "$new_guard_supervisor"
sleep 1
rm -f "$GUARD_SERVICE/supervisor-up"
touch "$GUARD_SERVICE/down"
count_before="$count_after"
run_launcher
sleep 1
[ "$(cat "$TEST_STATE/guard-runsv.count")" = "$count_before" ] || fail "guard service down overridden"
[ ! -e "$GUARD_SERVICE/supervisor-up" ] || fail "guard service started while down"
rm -f "$GUARD_SERVICE/down"
touch "$GUARD_SERVICE/ambiguous"
set +e
run_launcher >/dev/null 2>&1
launcher_ambiguous_rc=$?
set -e
[ "$launcher_ambiguous_rc" -eq 2 ] || fail "ambiguous guard service rc=$launcher_ambiguous_rc"
[ "$(cat "$TEST_STATE/guard-runsv.count")" = "$count_before" ] || fail "ambiguous guard service started supervisor"
rm -f "$GUARD_SERVICE/ambiguous" "$TARGET/supervisor-up"
for script in "$GUARD" "$INSTALL" "$LAUNCHER" "$SERVICE_RUN"; do
    sh -n "$script" || fail "syntax: $script"
    if grep -E 'service-daemon|runsvdir|termux-wake-lock|pocketrisu|tailscale|sshd|notification' "$script" >/dev/null; then
        fail "forbidden broad surface in $script"
    fi
done

grep -Fq 'var/service/desktop-commander-remote' "$GUARD" || fail "fixed RDC service path missing"
grep -Fq 'var/service/mcl-m-rdc-supervisor-guard' "$LAUNCHER" || fail "fixed guard service path missing"
grep -Fq 'var/service/mcl-m-rdc-supervisor-guard/run' "$INSTALL" || fail "fixed installed service run missing"
if grep -Eq 'MCL_M_RDC_.*SERVICE|SERVICE_OVERRIDE|COMMAND_OVERRIDE|PATH_OVERRIDE' "$GUARD" "$INSTALL" "$LAUNCHER" "$SERVICE_RUN"; then
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

for pidfile in target-runsv.pid guard-runsv.pid guard-child.pid; do
    pid="$(read_pid "$TEST_STATE/$pidfile")"
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        fail "fixture process survived: $pidfile"
    fi
done

echo 'm-rdc-supervisor contract: PASS'
