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
    force_stop_pid "$(read_pid "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")"
    force_stop_pid "$(read_pid "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/guard.pid")"
    force_stop_pid "$(read_pid "$TEST_STATE/guard-runsv.pid")"
    force_stop_pid "$(read_pid "$TEST_STATE/target-runsv.pid")"
    force_stop_pid "${SECOND_PID:-}"
    force_stop_pid "${LOOP_PID:-}"
    force_stop_pid "${AMBIG_PID:-}"
    force_stop_pid "${ANCHOR_DUMMY_PID:-}"
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

mkdir -p "$PREFIX/bin" "$TARGET/supervise" "$HOME_FIX" "$TEST_STATE"
touch "$TARGET/supervise/ok"
ln -s "$(command -v nohup)" "$PREFIX/bin/nohup"
ln -s "$(command -v sleep)" "$PREFIX/bin/sleep"
ln -s "$(command -v sh)" "$PREFIX/bin/sh"
printf '#!%s\n' "$(command -v sh)" > "$PREFIX/bin/sv"
cat >> "$PREFIX/bin/sv" <<'EOF'
[ "${1:-}" = status ] || exit 2
service="${2:-}"
if [ -e "$service/ambiguous" ]; then
    echo "unexpected supervisor state"
    exit 1
fi
if [ -e "$service/wants-down" ]; then
    echo "down: service: 1s, normally up"
    exit 0
fi
if [ -e "$service/supervisor-up" ]; then
    echo "run: service: (pid 123) 1s"
    exit 0
fi
if [ ! -e "$service/supervise/ok" ]; then
    echo "warning: $service: unable to open supervise/ok: file does not exist"
    exit 1
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
: > "$service/supervise/ok"
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
        if [ -e "$MCL_M_RDC_TEST_STATE/guard-runsv-fail" ]; then
            while :; do sleep 1; done
        fi
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
    sh "$LAUNCHER" "$@"
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

if [ "${MCL_M_RDC_ADOPTION_ONLY:-0}" = "1" ]; then
    apply_out="$(run_install --apply)"
    printf '%s\n' "$apply_out" | grep -Fxq 'result=pass' || fail "adoption fixture install"
    printf '%s\n' 'target-generation-stable' > "$TEST_STATE/target-generation"
    run_guard --once
    wait_for_file "$TEST_STATE/target-runsv.pid"
    target_count_before="$(cat "$TEST_STATE/target-runsv.count")"

    # A supervisor that reports down: does not want the guard restarted.
    # Adoption must block before any orphan TERM effect even when no filesystem down marker exists.
    touch "$GUARD_SERVICE/wants-down"
    set +e
    wants_down_out="$(run_guard --adopt-orphan 2>&1)"
    wants_down_rc=$?
    set -e
    [ "$wants_down_rc" -eq 2 ] || fail "wants-down adoption rc=$wants_down_rc"
    printf '%s
' "$wants_down_out" | grep -Fxq 'result=blocked' || fail "wants-down adoption result"
    rm -f "$GUARD_SERVICE/wants-down"

    run_launcher
    wait_for_file "$TEST_STATE/guard-runsv.pid"
    wait_for_file "$TEST_STATE/guard-child.pid"
    wait_for_file "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid"
    guard_supervisor="$(read_pid "$TEST_STATE/guard-runsv.pid")"
    orphan_guard="$(read_pid "$TEST_STATE/guard-child.pid")"
    anchor_pid="$(read_pid "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")"
    kill -0 "$guard_supervisor" 2>/dev/null || fail "adoption starting supervisor"
    kill -0 "$orphan_guard" 2>/dev/null || fail "adoption starting guard"
    kill -0 "$anchor_pid" 2>/dev/null || fail "adoption starting anchor"

    # Create the natural #3508 shape: supervisor hard-loss while its guard child
    # survives as a PID1-owned orphan, then let the independent anchor restore a
    # replacement guard-service supervisor.
    count_before="$(cat "$TEST_STATE/guard-runsv.count")"
    kill -KILL "$guard_supervisor" 2>/dev/null || fail "adoption supervisor hard-loss"
    rm -f "$GUARD_SERVICE/supervisor-up"
    rmdir "$GUARD_SERVICE/supervise/lock.fixture" 2>/dev/null || true
    printf '%s\n' 1 > "$TEST_STATE/adopt-ppid-$orphan_guard"
    i=0
    while [ "$i" -lt 20 ]; do
        sleep 1
        count_now="$(cat "$TEST_STATE/guard-runsv.count")"
        service_child="$(read_pid "$TEST_STATE/guard-child.pid")"
        if [ "$count_now" -gt "$count_before" ] && { [ -z "$service_child" ] || [ "$service_child" != "$orphan_guard" ]; }; then
            break
        fi
        i=$((i + 1))
    done
    [ "$(cat "$TEST_STATE/guard-runsv.count")" -gt "$count_before" ] || fail "replacement guard supervisor missing"

    # Ambiguous anchor identity is a zero-effect blocker. Keep the real anchor
    # process alive; only point its evidence pidfile at an unrelated live process.
    saved_anchor_pid="$anchor_pid"
    sleep 30 &
    ANCHOR_DUMMY_PID=$!
    printf '%s\n' "$ANCHOR_DUMMY_PID" > "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid"
    set +e
    blocked_out="$(run_guard --adopt-orphan 2>&1)"
    blocked_rc=$?
    set -e
    [ "$blocked_rc" -eq 2 ] || fail "ambiguous anchor adoption rc=$blocked_rc"
    printf '%s\n' "$blocked_out" | grep -Fxq 'result=blocked' || fail "ambiguous anchor result"
    kill -0 "$orphan_guard" 2>/dev/null || fail "ambiguous anchor killed orphan"
    printf '%s\n' "$saved_anchor_pid" > "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid"
    force_stop_pid "$ANCHOR_DUMMY_PID"
    ANCHOR_DUMMY_PID=

    set +e
    adopt_out="$(run_guard --adopt-orphan 2>&1)"
    adopt_rc=$?
    set -e
    [ "$adopt_rc" -eq 0 ] || fail "orphan adoption rc=$adopt_rc output=$adopt_out"
    for expected in \
        'schema=mcl-m-rdc-guard-orphan-adopt.v1' \
        'prestate=orphan_exact' \
        'guard_service=supervised' \
        'ownership=runsv' \
        'target=preserved' \
        'anchor=preserved' \
        'rollback=not_needed' \
        'result=pass' \
        'details=withheld'; do
        printf '%s\n' "$adopt_out" | grep -Fxq "$expected" || fail "adopt receipt: $expected"
    done
    [ "$(printf '%s\n' "$adopt_out" | wc -l | tr -d ' ')" = 9 ] || fail "adopt receipt line count"
    ! printf '%s\n' "$adopt_out" | grep -Eq 'pid=|ppid=|cmdline|/proc/|auth|session' || fail "adopt receipt identity leak"
    ! kill -0 "$orphan_guard" 2>/dev/null || fail "orphan survived adoption"
    runit_guard="$(read_pid "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/guard.pid")"
    service_child="$(read_pid "$TEST_STATE/guard-child.pid")"
    [ -n "$runit_guard" ] && [ "$runit_guard" = "$service_child" ] || fail "runit child did not own guard lock"
    kill -0 "$runit_guard" 2>/dev/null || fail "runit-owned guard not alive"
    [ "$(cat "$TEST_STATE/target-runsv.count")" = "$target_count_before" ] || fail "adoption restarted RDC target"
    kill -0 "$saved_anchor_pid" 2>/dev/null || fail "adoption lost anchor"
    rm -f "$TEST_STATE/adopt-ppid-$orphan_guard"

    # Healthy runit-owned state cannot be adopted again.
    set +e
    healthy_out="$(run_guard --adopt-orphan 2>&1)"
    healthy_rc=$?
    set -e
    [ "$healthy_rc" -eq 2 ] || fail "healthy adoption rc=$healthy_rc"
    printf '%s\n' "$healthy_out" | grep -Fxq 'result=blocked' || fail "healthy adoption result"
    kill -0 "$runit_guard" 2>/dev/null || fail "healthy block disturbed guard"

    # Rollback: restore a second orphan shape, but force the replacement runsv to
    # stay alive without spawning a child. Adoption must retire the old orphan,
    # start at most one standalone fixed guard, and report FAIL/restored.
    rollback_supervisor="$(read_pid "$TEST_STATE/guard-runsv.pid")"
    rollback_orphan="$(read_pid "$TEST_STATE/guard-child.pid")"
    touch "$TEST_STATE/guard-runsv-fail"
    kill -KILL "$rollback_supervisor" 2>/dev/null || fail "rollback supervisor hard-loss"
    rm -f "$GUARD_SERVICE/supervisor-up" "$TEST_STATE/guard-child.pid"
    rmdir "$GUARD_SERVICE/supervise/lock.fixture" 2>/dev/null || true
    printf '%s\n' 1 > "$TEST_STATE/adopt-ppid-$rollback_orphan"
    rollback_count_before="$(cat "$TEST_STATE/guard-runsv.count")"
    i=0
    while [ "$i" -lt 20 ]; do
        sleep 1
        [ "$(cat "$TEST_STATE/guard-runsv.count")" -gt "$rollback_count_before" ] && break
        i=$((i + 1))
    done
    [ "$(cat "$TEST_STATE/guard-runsv.count")" -gt "$rollback_count_before" ] || fail "rollback replacement supervisor missing"
    set +e
    rollback_out="$(run_guard --adopt-orphan 2>&1)"
    rollback_rc=$?
    set -e
    [ "$rollback_rc" -eq 1 ] || fail "rollback adoption rc=$rollback_rc output=$rollback_out"
    printf '%s\n' "$rollback_out" | grep -Fxq 'rollback=restored' || fail "rollback not restored"
    printf '%s\n' "$rollback_out" | grep -Fxq 'result=fail' || fail "rollback was misreported PASS"
    restored_guard="$(read_pid "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/guard.pid")"
    [ -n "$restored_guard" ] && kill -0 "$restored_guard" 2>/dev/null || fail "rollback guard missing"
    [ "$(cat "$TEST_STATE/target-runsv.count")" = "$target_count_before" ] || fail "rollback restarted RDC target"
    kill -0 "$saved_anchor_pid" 2>/dev/null || fail "rollback lost anchor"

    rm -f "$TEST_STATE/adopt-ppid-$rollback_orphan"
    grep -Fq -- '--adopt-orphan' "$GUARD" || fail "explicit adoption mode missing"
    [ "$(grep -Fc -- '--adopt-orphan)' "$GUARD")" -eq 1 ] || fail "adoption dispatch count"
    grep -Fq 'mcl-m-rdc-guard-orphan-adopt.v1' "$GUARD" || fail "adoption schema missing"
    grep -Fq 'cleanup_wait=$((INTERVAL + ADOPT_CLEANUP_GRACE))' "$GUARD" || fail "adoption cleanup wait not interval-aware"
    grep -Fq 'ADOPT_CLEANUP_GRACE=8' "$GUARD" || fail "adoption cleanup grace drift"
    ! grep -Eq 'kill -KILL|pkill|killall|service-daemon|runsvdir' "$GUARD" || fail "forbidden broad adoption surface"

    echo 'm-rdc-supervisor orphan-adoption contract: PASS'
    exit 0
fi

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

rm -f "$TARGET/supervisor-up"
target_count_before_loop="$(cat "$TEST_STATE/target-runsv.count")"
start_guard_loop
wait_for_loop_lock
i=0
target_count_after_loop="$target_count_before_loop"
while [ "$target_count_after_loop" -eq "$target_count_before_loop" ] && [ "$i" -lt 20 ]; do
    sleep 1
    target_count_after_loop="$(cat "$TEST_STATE/target-runsv.count")"
    i=$((i + 1))
done
[ "$target_count_after_loop" -eq $((target_count_before_loop + 1)) ] || fail "target recovery stopped when anchor launcher unavailable"
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
force_stop_pid "$(read_pid "$TEST_STATE/target-runsv.pid")"
rm -f "$TARGET/supervisor-up"

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
[ ! -e "$GUARD_SERVICE/supervise/ok" ] || fail "guard service not virgin before first launch"
mv "$GUARD_SERVICE/run" "$GUARD_SERVICE/run.real"
ln -s "$GUARD_SERVICE/run.real" "$GUARD_SERVICE/run"
set +e
run_launcher >/dev/null 2>&1
identity_rc=$?
set -e
[ "$identity_rc" -eq 2 ] || fail "virgin guard service accepted symlink run rc=$identity_rc"
[ ! -e "$TEST_STATE/guard-runsv.pid" ] || fail "invalid guard run identity started supervisor"
rm "$GUARD_SERVICE/run"
mv "$GUARD_SERVICE/run.real" "$GUARD_SERVICE/run"
set +e
virgin_status="$("$PREFIX/bin/sv" status "$GUARD_SERVICE" 2>&1)"
virgin_rc=$?
set -e
[ "$virgin_rc" -eq 1 ] || fail "virgin guard service status rc=$virgin_rc"
printf "%s\n" "$virgin_status" | grep -Fq "unable to open supervise/ok: file does not exist" || fail "virgin guard service status text"
touch "$GUARD_SERVICE/ambiguous"
set +e
run_launcher >/dev/null 2>&1
pre_anchor_ambiguous_rc=$?
set -e
[ "$pre_anchor_ambiguous_rc" -eq 2 ] || fail "pre-anchor ambiguous guard service rc=$pre_anchor_ambiguous_rc"
[ ! -e "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid" ] || fail "ambiguous state started anchor"
rm -f "$GUARD_SERVICE/ambiguous"
run_launcher
wait_for_file "$TEST_STATE/guard-runsv.pid"
wait_for_file "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid"
[ -e "$GUARD_SERVICE/supervise/ok" ] || fail "guard supervisor did not materialize supervise/ok"
wait_for_file "$TEST_STATE/guard-child.pid"
[ "$(cat "$TEST_STATE/guard-runsv.count")" = 1 ] || fail "guard supervisor start count"
guard_supervisor_pid="$(cat "$TEST_STATE/guard-runsv.pid")"
guard_child_before="$(cat "$TEST_STATE/guard-child.pid")"
anchor_pid_before="$(cat "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")"
kill -0 "$guard_supervisor_pid" 2>/dev/null || fail "guard supervisor not alive"
kill -0 "$guard_child_before" 2>/dev/null || fail "guard child not alive"
kill -0 "$anchor_pid_before" 2>/dev/null || fail "guard anchor not alive"

run_launcher
sleep 1
[ "$(cat "$TEST_STATE/guard-runsv.count")" = 1 ] || fail "healthy guard supervisor duplicated"
[ "$(cat "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")" = "$anchor_pid_before" ] || fail "healthy launcher duplicated anchor"

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
count_before="$(cat "$TEST_STATE/guard-runsv.count")"
force_stop_pid "$guard_supervisor_pid"
i=0
count_after="$count_before"
while [ "$count_after" -eq "$count_before" ] && [ "$i" -lt 20 ]; do
    sleep 1
    count_after="$(cat "$TEST_STATE/guard-runsv.count")"
    i=$((i + 1))
done
[ "$count_after" -eq $((count_before + 1)) ] || fail "anchor did not restore missing guard supervisor"
new_guard_supervisor="$(cat "$TEST_STATE/guard-runsv.pid")"
kill -0 "$new_guard_supervisor" 2>/dev/null || fail "anchor-restored guard supervisor not alive"

run_launcher --ensure-anchor & launch_one=$!
run_launcher --ensure-anchor & launch_two=$!
wait "$launch_one"
wait "$launch_two"
sleep 1
[ "$(cat "$TEST_STATE/guard-runsv.count")" = "$count_after" ] || fail "concurrent ensure created duplicate guard supervisors"
[ "$(cat "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")" = "$anchor_pid_before" ] || fail "concurrent ensure changed anchor"
kill -0 "$anchor_pid_before" 2>/dev/null || fail "anchor died after concurrent ensure"

sleep 2
[ "$(cat "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")" = "$anchor_pid_before" ] || fail "healthy guard loop duplicated anchor"

kill -KILL "$anchor_pid_before" 2>/dev/null || fail "anchor hard-loss kill"
i=0
anchor_pid_stale_recovered=
while [ "$i" -lt 20 ]; do
    sleep 1
    candidate="$(read_pid "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")"
    if [ -n "$candidate" ] && [ "$candidate" != "$anchor_pid_before" ]; then
        anchor_pid_stale_recovered="$candidate"
        break
    fi
    i=$((i + 1))
done
[ -n "$anchor_pid_stale_recovered" ] || fail "stale anchor recovery pid missing"
kill -0 "$anchor_pid_stale_recovered" 2>/dev/null || fail "stale-recovered anchor not alive"
anchor_pid_before="$anchor_pid_stale_recovered"

kill -TERM "$anchor_pid_before" 2>/dev/null || fail "anchor graceful-loss TERM"
i=0
anchor_pid_absent_recovered=
while [ "$i" -lt 20 ]; do
    sleep 1
    candidate="$(read_pid "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")"
    if [ -n "$candidate" ] && [ "$candidate" != "$anchor_pid_before" ]; then
        anchor_pid_absent_recovered="$candidate"
        break
    fi
    i=$((i + 1))
done
[ -n "$anchor_pid_absent_recovered" ] || fail "absent anchor recovery pid missing"
kill -0 "$anchor_pid_absent_recovered" 2>/dev/null || fail "absent-recovered anchor not alive"
anchor_pid_before="$anchor_pid_absent_recovered"

touch "$GUARD_SERVICE/down"
force_stop_pid "$new_guard_supervisor"
sleep 2
[ "$(cat "$TEST_STATE/guard-runsv.count")" = "$count_after" ] || fail "anchor overrode guard service down"
[ ! -e "$GUARD_SERVICE/supervisor-up" ] || fail "guard service started while down"
run_launcher
sleep 1
[ "$(cat "$TEST_STATE/guard-runsv.count")" = "$count_after" ] || fail "launcher overrode guard service down"

touch "$GUARD_SERVICE/ambiguous"
rm -f "$GUARD_SERVICE/down"
run_launcher >/dev/null 2>&1 || true
sleep 2
[ "$(cat "$TEST_STATE/guard-runsv.count")" = "$count_after" ] || fail "ambiguous guard service started supervisor"
kill -0 "$anchor_pid_before" 2>/dev/null || fail "anchor died on ambiguous guard state"

force_stop_pid "$anchor_pid_before"
sleep 1
[ ! -e "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid" ] || fail "anchor pidfile survived TERM"
rm -f "$GUARD_SERVICE/ambiguous" "$TARGET/supervisor-up"

sleep 30 &
AMBIG_PID=$!
mkdir -p "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.lock"
printf '%s\n' "$AMBIG_PID" > "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid"
target_count_before_ambiguous="$(cat "$TEST_STATE/target-runsv.count")"
start_guard_loop
wait_for_loop_lock
i=0
target_count_after_ambiguous="$target_count_before_ambiguous"
while [ "$target_count_after_ambiguous" -eq "$target_count_before_ambiguous" ] && [ "$i" -lt 20 ]; do
    sleep 1
    target_count_after_ambiguous="$(cat "$TEST_STATE/target-runsv.count")"
    i=$((i + 1))
done
[ "$target_count_after_ambiguous" -eq $((target_count_before_ambiguous + 1)) ] || fail "anchor ensure failure blocked target recovery"
sleep 2
kill -0 "$LOOP_PID" 2>/dev/null || fail "guard loop died on ambiguous live anchor identity"
kill -0 "$AMBIG_PID" 2>/dev/null || fail "ambiguous live anchor identity was killed"
[ "$(cat "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid")" = "$AMBIG_PID" ] || fail "ambiguous live anchor identity was overwritten"
stop_loop_term
force_stop_pid "$(read_pid "$TEST_STATE/target-runsv.pid")"
force_stop_pid "$AMBIG_PID"
AMBIG_PID=
rm -f "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.pid"
rmdir "$HOME_FIX/.local/state/mcl-m-rdc-supervisor-guard/anchor.lock" 2>/dev/null || true
rm -f "$TARGET/supervisor-up"
for script in "$GUARD" "$INSTALL" "$LAUNCHER" "$SERVICE_RUN"; do
    sh -n "$script" || fail "syntax: $script"
    if grep -E 'service-daemon|runsvdir|termux-wake-lock|pocketrisu|tailscale|sshd|notification' "$script" >/dev/null; then
        fail "forbidden broad surface in $script"
    fi
done

grep -Fq 'var/service/desktop-commander-remote' "$GUARD" || fail "fixed RDC service path missing"
grep -Fq 'var/service/mcl-m-rdc-supervisor-guard' "$LAUNCHER" || fail "fixed guard service path missing"
grep -Fq -- '--anchor' "$LAUNCHER" || fail "anchor mode missing"
grep -Fq -- '--ensure-anchor' "$LAUNCHER" || fail "anchor ensure mode missing"
grep -Fq -- '--ensure-anchor' "$GUARD" || fail "guard loop anchor ensure missing"
! grep -Fq 'var/service/desktop-commander-remote' "$LAUNCHER" || fail "anchor may not own RDC target service"
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
