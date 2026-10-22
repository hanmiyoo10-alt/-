#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SOURCE_GUARD="$ROOT/files/pocketrisu-notification-transport-guard"
SOURCE_LAUNCHER="$ROOT/files/23-pocketrisu-notification-transport-guard"
TMP="${TMPDIR:-/tmp}/pocketrisu-notification-transport-test-$$"
PREFIX="$TMP/prefix"
HOME_FIX="$TMP/home"
SERVICE="$PREFIX/var/service/pocketrisu-notify-tunnel"
STATE="$HOME_FIX/.local/state/pocketrisu-notification-transport-guard"
TEST_STATE="$TMP/test-state"
GUARD="$HOME_FIX/.local/bin/pocketrisu-notification-transport-guard"
LAUNCHER="$HOME_FIX/.termux/boot/23-pocketrisu-notification-transport-guard"
RELAY="$HOME_FIX/.termux/boot/22-pocketrisu-notify-relay-supervisor"
SUBJECT_GUARD="$TMP/subject-guard"
SUBJECT_LAUNCHER="$TMP/subject-launcher"
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
    /bin/sleep 0.1
}

stop_runsv() {
    stop_pidfile "$TEST_STATE/runsv.pid"
    rm -f "$SERVICE/sv-run" "$SERVICE/sv-down"
    : > "$TEST_STATE/ps.out"
}

stop_ring_hard() {
    guard_pid="$(read_pid "$STATE/guard.pid")"
    anchor_pid="$(read_pid "$STATE/anchor.pid")"
    [ -n "$guard_pid" ] && kill -KILL "$guard_pid" 2>/dev/null || true
    [ -n "$anchor_pid" ] && kill -KILL "$anchor_pid" 2>/dev/null || true
    /bin/sleep 0.1
    rm -rf "$STATE/guard.lock" "$STATE/anchor.lock"
    rm -f "$STATE/guard.pid" "$STATE/anchor.pid"
}

cleanup() {
    [ -n "$AMBIG_PID" ] && kill -TERM "$AMBIG_PID" 2>/dev/null || true
    if command -v pkill >/dev/null 2>&1; then
        pkill -TERM -f "$TMP/" 2>/dev/null || true
        /bin/sleep 0.2
        pkill -KILL -f "$TMP/" 2>/dev/null || true
    else
        stop_pidfile "$STATE/guard.pid"
        stop_pidfile "$STATE/anchor.pid"
        stop_runsv
    fi
    rm -rf "$TMP"
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$PREFIX/bin" "$SERVICE" "$HOME_FIX/.local/bin" "$HOME_FIX/.termux/boot" "$STATE" "$TEST_STATE"

for name in nohup sha256sum stat mkdir sh tr flock; do
    ln -s "$(command -v "$name")" "$PREFIX/bin/$name"
done

cat > "$PREFIX/bin/sleep" <<'EOF_SLEEP'
#!/usr/bin/env sh
if [ "${1:-}" = 1 ]; then exec /bin/sleep 0.05; fi
exec /bin/sleep "$@"
EOF_SLEEP

cat > "$PREFIX/bin/sv" <<EOF_SV
#!/usr/bin/env sh
[ "\$1" = status ] || exit 2
if [ -e "$SERVICE/sv-ambiguous" ]; then
    echo "unrecognized supervisor state"
    exit 1
fi
if [ -e "$SERVICE/sv-run" ]; then
    echo "run: \$2: (pid 123) 1s"
elif [ -e "$SERVICE/sv-down" ]; then
    echo "down: \$2: 1s, normally up"
else
    echo "fail: \$2: runsv not running"
    exit 1
fi
EOF_SV

cat > "$PREFIX/bin/ps" <<EOF_PS
#!/usr/bin/env sh
[ -e "$TEST_STATE/ps-fail" ] && exit 7
cat "$TEST_STATE/ps.out"
EOF_PS

cat > "$PREFIX/bin/runsv" <<EOF_RUNSV
#!/usr/bin/env sh
count="\$(cat "$TEST_STATE/runsv.count" 2>/dev/null || echo 0)"
count=\$((count + 1))
printf '%s\n' "\$count" > "$TEST_STATE/runsv.count"
printf '%s\n' "\$\$" > "$TEST_STATE/runsv.pid"
/bin/sleep 30 &
ssh_pid=\$!
printf '%s %s %s\n' "\$\$" 1 "$PREFIX/bin/runsv $SERVICE" > "$TEST_STATE/ps.out"
printf '%s %s %s\n' "\$ssh_pid" "\$\$" "$PREFIX/bin/ssh -N -o BatchMode=yes -R 127.0.0.1:39120:127.0.0.1:39120 private-target" >> "$TEST_STATE/ps.out"
touch "$SERVICE/sv-run"
trap 'kill -TERM "\$ssh_pid" 2>/dev/null || true; rm -f "$SERVICE/sv-run"; : > "$TEST_STATE/ps.out"; exit 0' TERM INT HUP
wait "\$ssh_pid"
EOF_RUNSV

cat > "$RELAY" <<EOF_RELAY
#!/usr/bin/env sh
[ "\${1:-}" = --ensure ] || exit 2
count="\$(cat "$TEST_STATE/relay.calls" 2>/dev/null || echo 0)"
count=\$((count + 1))
printf '%s\n' "\$count" > "$TEST_STATE/relay.calls"
[ ! -e "$TEST_STATE/relay-block" ] || exit 2
[ ! -e "$TEST_STATE/relay-fail" ] || exit 1
if [ -e "$TEST_STATE/relay-missing" ]; then
    restores="\$(cat "$TEST_STATE/relay.restores" 2>/dev/null || echo 0)"
    restores=\$((restores + 1))
    printf '%s\n' "\$restores" > "$TEST_STATE/relay.restores"
    rm -f "$TEST_STATE/relay-missing"
fi
exit 0
EOF_RELAY

cat > "$SERVICE/run" <<'EOF_RUN'
#!/data/data/com.termux/files/usr/bin/sh
sleep 8
exec ssh -N -R 127.0.0.1:39120:127.0.0.1:39120 private-target
EOF_RUN

chmod +x "$PREFIX/bin/sleep" "$PREFIX/bin/sv" "$PREFIX/bin/ps" "$PREFIX/bin/runsv"
chmod 700 "$RELAY" "$SERVICE/run"

relay_sha="$(sha256sum "$RELAY" | awk '{print $1}')"
run_sha="$(sha256sum "$SERVICE/run" | awk '{print $1}')"

sed \
    -e "s|^PREFIX=/data/data/com.termux/files/usr$|PREFIX=$PREFIX|" \
    -e "s|^HOME_DIR=/data/data/com.termux/files/home$|HOME_DIR=$HOME_FIX|" \
    -e 's|^CHECK_INTERVAL=15$|CHECK_INTERVAL=1|' \
    -e "s|^RELAY_LAUNCHER_SHA=.*$|RELAY_LAUNCHER_SHA=$relay_sha|" \
    -e "s|^NOTIFY_RUN_SHA=.*$|NOTIFY_RUN_SHA=$run_sha|" \
    "$SOURCE_GUARD" > "$SUBJECT_GUARD"

sed \
    -e "s|^PREFIX=/data/data/com.termux/files/usr$|PREFIX=$PREFIX|" \
    -e "s|^HOME_DIR=/data/data/com.termux/files/home$|HOME_DIR=$HOME_FIX|" \
    -e 's|^INTERVAL=15$|INTERVAL=1|' \
    "$SOURCE_LAUNCHER" > "$SUBJECT_LAUNCHER"
sed -i '1s|.*|#!/usr/bin/env sh|' "$SUBJECT_LAUNCHER"

cp "$SUBJECT_GUARD" "$GUARD"
cp "$SUBJECT_LAUNCHER" "$LAUNCHER"
chmod 700 "$GUARD" "$LAUNCHER"

printf '0\n' > "$TEST_STATE/runsv.count"
printf '0\n' > "$TEST_STATE/relay.calls"
printf '0\n' > "$TEST_STATE/relay.restores"
: > "$TEST_STATE/ps.out"

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
    while [ "$i" -lt 80 ]; do
        candidate="$(read_pid "$file")"
        if [ -n "$candidate" ] && [ "$candidate" != "$old" ] && kill -0 "$candidate" 2>/dev/null; then
            printf '%s\n' "$candidate"
            return 0
        fi
        /bin/sleep 0.05
        i=$((i + 1))
    done
    return 1
}

wait_for_count_gt() {
    file="$1"
    old="$2"
    i=0
    while [ "$i" -lt 120 ]; do
        value="$(cat "$file" 2>/dev/null || echo 0)"
        if [ "$value" -gt "$old" ]; then
            printf '%s\n' "$value"
            return 0
        fi
        /bin/sleep 0.05
        i=$((i + 1))
    done
    return 1
}

reset_notify() {
    stop_runsv
    rm -f "$SERVICE/down" "$SERVICE/sv-ambiguous" "$TEST_STATE/ps-fail"
    : > "$TEST_STATE/ps.out"
    rm -f "$STATE/notify.ensure.lock"
}

spawn_zombie() {
    zombie_pidfile="$1"
    zombie_parentfile="$2"
    python - "$zombie_pidfile" "$zombie_parentfile" >/dev/null 2>&1 <<'PY_ZOMBIE' &
import os
import sys
import time

child = os.fork()
if child == 0:
    os._exit(0)

with open(sys.argv[1], 'w', encoding='utf-8') as f:
    f.write(str(child))
with open(sys.argv[2], 'w', encoding='utf-8') as f:
    f.write(str(os.getpid()))

time.sleep(20)
PY_ZOMBIE
    launcher_pid=$!

    i=0
    while [ "$i" -lt 80 ]; do
        zombie_pid="$(cat "$zombie_pidfile" 2>/dev/null || true)"
        if [ -n "$zombie_pid" ] && [ -r "/proc/$zombie_pid/stat" ]; then
            state="$(python -c 'import pathlib,sys; s=pathlib.Path(sys.argv[1]).read_text(); print(s[s.rfind(")")+2:].split()[0])' "/proc/$zombie_pid/stat" 2>/dev/null || true)"
            if [ "$state" = Z ]; then
                printf '%s
' "$launcher_pid"
                return 0
            fi
        fi
        /bin/sleep 0.05
        i=$((i + 1))
    done

    kill -TERM "$launcher_pid" 2>/dev/null || true
    return 1
}

[ "$(sed -n '1p' "$SOURCE_GUARD")" = '#!/data/data/com.termux/files/usr/bin/sh' ] || fail "guard shebang"
[ "$(sed -n '1p' "$SOURCE_LAUNCHER")" = '#!/data/data/com.termux/files/usr/bin/sh' ] || fail "launcher shebang"
grep -q '^PREFIX=/data/data/com.termux/files/usr$' "$SOURCE_GUARD" || fail "guard fixed prefix missing"
grep -q '^HOME_DIR=/data/data/com.termux/files/home$' "$SOURCE_GUARD" || fail "guard fixed home missing"
grep -q '^RELAY_LAUNCHER_SHA=f1015e8dea71226bad9f3de2dda0a2102fa2a6027012ffd15ed45fdb3e227e35$' "$SOURCE_GUARD" || fail "relay launcher identity changed"
grep -q '^NOTIFY_RUN_SHA=91351ceddc958c609673ac28ff99a23dfd5a7b9bfc2b21ca7b35f07170ad46f3$' "$SOURCE_GUARD" || fail "notify run identity changed"
grep -Fq "NOTIFY_REVERSE='-R 127.0.0.1:39120:127.0.0.1:39120'" "$SOURCE_GUARD" || fail "fixed reverse-forward semantic missing"
grep -Fq '"$RELAY_LAUNCHER" --ensure' "$SOURCE_GUARD" || fail "relay delegation missing"
if grep -Eiq 'service-daemon|runsvdir|pkill|killall|settings_enable_monitor_phantom_procs' "$SOURCE_GUARD" "$SOURCE_LAUNCHER"; then fail "broad process/service primitive present"; fi
if grep -Eq 'POCKETRISU_.*=' "$SOURCE_GUARD" "$SOURCE_LAUNCHER"; then fail "caller environment override surface present"; fi
if grep -Eq '@[A-Za-z0-9]|100\.[0-9]+\.[0-9]+\.[0-9]+' "$SOURCE_GUARD" "$SOURCE_LAUNCHER"; then fail "private notify target material present"; fi

zombie_pidfile="$TEST_STATE/zombie.pid"
zombie_parentfile="$TEST_STATE/zombie-parent.pid"
zombie_parent="$(spawn_zombie "$zombie_pidfile" "$zombie_parentfile")" || fail "zombie fixture did not materialize"
zombie_pid="$(cat "$zombie_pidfile")"
mkdir -p "$STATE/guard.lock"
printf '%s
' "$zombie_pid" > "$STATE/guard.pid"
run_launcher
guard_from_zombie="$(read_pid "$STATE/guard.pid")"
anchor_from_zombie="$(read_pid "$STATE/anchor.pid")"
[ -n "$guard_from_zombie" ] && [ "$guard_from_zombie" != "$zombie_pid" ] && kill -0 "$guard_from_zombie" 2>/dev/null || fail "zombie guard pid was not reclaimed"
[ -n "$anchor_from_zombie" ] && kill -0 "$anchor_from_zombie" 2>/dev/null || fail "anchor missing after zombie guard recovery"
stop_ring_hard
kill -TERM "$zombie_parent" 2>/dev/null || true
rm -f "$zombie_pidfile" "$zombie_parentfile"

zombie_parent="$(spawn_zombie "$zombie_pidfile" "$zombie_parentfile")" || fail "anchor zombie fixture did not materialize"
zombie_pid="$(cat "$zombie_pidfile")"
mkdir -p "$STATE/anchor.lock"
printf '%s
' "$zombie_pid" > "$STATE/anchor.pid"
run_launcher --ensure-anchor
anchor_from_zombie="$(read_pid "$STATE/anchor.pid")"
[ -n "$anchor_from_zombie" ] && [ "$anchor_from_zombie" != "$zombie_pid" ] && kill -0 "$anchor_from_zombie" 2>/dev/null || fail "zombie anchor pid was not reclaimed"
stop_ring_hard
kill -TERM "$zombie_parent" 2>/dev/null || true
rm -f "$zombie_pidfile" "$zombie_parentfile"

reset_notify
printf '0
' > "$TEST_STATE/runsv.count"
printf '0
' > "$TEST_STATE/relay.calls"

run_guard --once
[ "$(cat "$TEST_STATE/relay.calls")" = 1 ] || fail "relay launcher not delegated"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "notify missing state did not start one runsv"
run_guard --once
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "steady state duplicated notify runsv"

reset_notify
touch "$SERVICE/down"
before_down="$(cat "$TEST_STATE/runsv.count")"
run_guard --once
[ "$(cat "$TEST_STATE/runsv.count")" = "$before_down" ] || fail "operator down was overridden"
rm -f "$SERVICE/down"

printf '%s %s %s\n' 4242 1 "$PREFIX/bin/ssh -N -R 127.0.0.1:39120:127.0.0.1:39120 private-target" > "$TEST_STATE/ps.out"
before_orphan="$(cat "$TEST_STATE/runsv.count")"
run_guard --once
[ "$(cat "$TEST_STATE/runsv.count")" = "$before_orphan" ] || fail "orphan reverse SSH started runsv"

printf '%s %s %s\n' 4242 1 "$PREFIX/bin/ssh -N -R 127.0.0.1:39120:127.0.0.1:39120 private-target" > "$TEST_STATE/ps.out"
printf '%s %s %s\n' 4243 1 "ssh -N -R 127.0.0.1:39120:127.0.0.1:39120 second-target" >> "$TEST_STATE/ps.out"
set +e; run_guard --once >/dev/null 2>&1; dup_rc=$?; set -e
[ "$dup_rc" -eq 2 ] || fail "duplicate reverse SSH did not fail closed"

reset_notify
cp "$SERVICE/run" "$SERVICE/run.good"
printf '%s\n' drift >> "$SERVICE/run"
set +e; run_guard --once >/dev/null 2>&1; drift_rc=$?; set -e
[ "$drift_rc" -eq 2 ] || fail "notify run identity drift passed"
mv "$SERVICE/run.good" "$SERVICE/run"; chmod 700 "$SERVICE/run"

cp "$RELAY" "$RELAY.good"; printf '%s\n' drift >> "$RELAY"
set +e; run_guard --once >/dev/null 2>&1; relay_drift_rc=$?; set -e
[ "$relay_drift_rc" -eq 2 ] || fail "relay launcher identity drift passed"
mv "$RELAY.good" "$RELAY"; chmod 700 "$RELAY"

reset_notify
run_launcher
guard_before="$(read_pid "$STATE/guard.pid")"; anchor_before="$(read_pid "$STATE/anchor.pid")"
[ -n "$guard_before" ] && kill -0 "$guard_before" 2>/dev/null || fail "guard loop not alive"
[ -n "$anchor_before" ] && kill -0 "$anchor_before" 2>/dev/null || fail "anchor not alive"

run_launcher & one=$!; run_launcher & two=$!; wait "$one"; wait "$two"
[ "$(read_pid "$STATE/guard.pid")" = "$guard_before" ] || fail "concurrent launcher duplicated guard"
[ "$(read_pid "$STATE/anchor.pid")" = "$anchor_before" ] || fail "concurrent launcher duplicated anchor"

kill -KILL "$guard_before" 2>/dev/null || fail "guard hard-loss kill failed"
guard_after="$(wait_for_new_pid "$STATE/guard.pid" "$guard_before")" || fail "anchor did not restore guard"
kill -KILL "$anchor_before" 2>/dev/null || fail "anchor hard-loss kill failed"
anchor_after="$(wait_for_new_pid "$STATE/anchor.pid" "$anchor_before")" || fail "guard did not restore anchor"
[ "$guard_after" != "$guard_before" ] || fail "guard pid did not change"
[ "$anchor_after" != "$anchor_before" ] || fail "anchor pid did not change"

runsv_before="$(cat "$TEST_STATE/runsv.count")"; stop_runsv; rm -f "$SERVICE/sv-run"; : > "$TEST_STATE/ps.out"
runsv_after="$(wait_for_count_gt "$TEST_STATE/runsv.count" "$runsv_before")" || fail "guard did not restore notify runsv"
[ "$runsv_after" -eq $((runsv_before + 1)) ] || fail "guard started multiple notify runsv instances"

relay_before="$(cat "$TEST_STATE/relay.restores")"; touch "$TEST_STATE/relay-missing"
relay_after="$(wait_for_count_gt "$TEST_STATE/relay.restores" "$relay_before")" || fail "guard did not delegate relay restore"
[ "$relay_after" -eq $((relay_before + 1)) ] || fail "relay delegate restored more than once"

target_before="$(cat "$TEST_STATE/runsv.count")"; stop_runsv; rm -f "$SERVICE/sv-run"; : > "$TEST_STATE/ps.out"; touch "$SERVICE/down"
/bin/sleep 0.3
[ "$(cat "$TEST_STATE/runsv.count")" = "$target_before" ] || fail "ring overrode notify operator down"
rm -f "$SERVICE/down"

sh -n "$SOURCE_GUARD"; sh -n "$SOURCE_LAUNCHER"; sh -n "$SUBJECT_GUARD"; sh -n "$SUBJECT_LAUNCHER"
echo "notification-transport-durability tests: PASS"
