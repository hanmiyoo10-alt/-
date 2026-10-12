#!/usr/bin/env sh
set -eu

ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SOURCE="$ROOT/files/22-pocketrisu-notify-relay-supervisor"
TMP="${TMPDIR:-/tmp}/pocketrisu-notify-supervisor-test-$$"
PREFIX="$TMP/prefix"
HOME_FIX="$TMP/home"
SERVICE="$PREFIX/var/service/pocketrisu-notify-relay"
RECEIVER="$HOME_FIX/.local/share/pocketrisu-notify-relay/receiver.cjs"
STATE="$HOME_FIX/.local/state/pocketrisu-notify-relay-supervisor"
TEST_STATE="$TMP/test-state"
SUBJECT="$TMP/subject"
RUNSV_PID=""

fail() {
    printf 'FAIL: %s\n' "$*" >&2
    exit 1
}

stop_runsv() {
    pid="$(cat "$TEST_STATE/runsv.pid" 2>/dev/null || true)"
    [ -n "$pid" ] || return 0
    kill -TERM "$pid" 2>/dev/null || true
    sleep 0.1
}

reset_runtime() {
    stop_runsv
    rm -f "$SERVICE/sv-run" "$SERVICE/sv-down" "$SERVICE/down"
    rm -f "$TEST_STATE/health-ready" "$TEST_STATE/fail-start" "$TEST_STATE/slow-start"
    rm -f "$TEST_STATE/ps-block" "$TEST_STATE/ps-entered" "$TEST_STATE/ps.calls"
    rm -f "$TEST_STATE/flock-block" "$TEST_STATE/flock-entered" "$TEST_STATE/lock-fd-leaked" "$TEST_STATE/curl.args"
    : > "$TEST_STATE/ps.out"
    rm -f "$STATE/ensure.lock"
}

cleanup() {
    stop_runsv
    rm -rf "$TMP"
}
trap cleanup EXIT INT TERM HUP

mkdir -p "$PREFIX/bin" "$SERVICE" "$(dirname "$RECEIVER")" "$STATE" "$TEST_STATE"
printf '%s\n' 'console.log("relay fixture")' > "$RECEIVER"
cat > "$SERVICE/run" <<'EOF_RUN'
#!/data/data/com.termux/files/usr/bin/sh
exec /data/data/com.termux/files/usr/bin/node /data/data/com.termux/files/home/.local/share/pocketrisu-notify-relay/receiver.cjs
EOF_RUN
chmod 600 "$RECEIVER"
chmod 700 "$SERVICE/run"

for name in nohup sha256sum stat mkdir sh; do
    ln -s "$(command -v "$name")" "$PREFIX/bin/$name"
done

cat > "$PREFIX/bin/sleep" <<'EOF_SLEEP'
#!/usr/bin/env sh
if [ "${1:-}" = 1 ]; then exec /bin/sleep 0.05; fi
exec /bin/sleep "$@"
EOF_SLEEP

cat > "$PREFIX/bin/curl" <<EOF_CURL
#!/usr/bin/env sh
printf '%s\n' "\$@" > "$TEST_STATE/curl.args"
[ "\${1:-}" = -q ] || exit 3
[ "\${2:-}" = -fsS ] || exit 3
[ "\${3:-}" = --noproxy ] || exit 3
[ "\${4:-}" = '*' ] || exit 3
[ "\${5:-}" = --max-time ] || exit 3
[ "\${6:-}" = 2 ] || exit 3
[ -e "$TEST_STATE/health-ready" ]
EOF_CURL

cat > "$PREFIX/bin/sv" <<EOF_SV
#!/usr/bin/env sh
[ "\$1" = status ] || exit 2
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
calls="\$(cat "$TEST_STATE/ps.calls" 2>/dev/null || echo 0)"
calls=\$((calls + 1))
printf '%s\n' "\$calls" > "$TEST_STATE/ps.calls"
if [ -e "$TEST_STATE/ps-block" ] && [ "\$calls" -ge 2 ]; then
    touch "$TEST_STATE/ps-entered"
    while [ -e "$TEST_STATE/ps-block" ]; do /bin/sleep 0.05; done
fi
cat "$TEST_STATE/ps.out"
EOF_PS

REAL_FLOCK="$(command -v flock)"
cat > "$PREFIX/bin/flock" <<EOF_FLOCK
#!/usr/bin/env sh
if [ -e "$TEST_STATE/flock-block" ]; then
    touch "$TEST_STATE/flock-entered"
    while [ -e "$TEST_STATE/flock-block" ]; do /bin/sleep 0.05; done
fi
exec "$REAL_FLOCK" "\$@"
EOF_FLOCK

cat > "$PREFIX/bin/runsv" <<EOF_RUNSV
#!/usr/bin/env sh
count="\$(cat "$TEST_STATE/runsv.count" 2>/dev/null || echo 0)"
count=\$((count + 1))
printf '%s\n' "\$count" > "$TEST_STATE/runsv.count"
printf '%s\n' "\$\$" > "$TEST_STATE/runsv.pid"
if [ -e "$TEST_STATE/slow-start" ]; then /bin/sleep 0.3; fi
if [ -e "$TEST_STATE/fail-start" ]; then
    trap 'exit 0' TERM INT HUP
    while :; do /bin/sleep 30; done
fi
/bin/sleep 30 &
receiver_pid=\$!
printf '%s %s %s\n' "\$\$" 1 "$PREFIX/bin/runsv $SERVICE" > "$TEST_STATE/ps.out"
printf '%s %s %s\n' "\$receiver_pid" "\$\$" "$PREFIX/bin/node $RECEIVER" >> "$TEST_STATE/ps.out"
touch "$SERVICE/sv-run" "$TEST_STATE/health-ready"
trap 'kill -TERM "\$receiver_pid" 2>/dev/null || true; rm -f "$SERVICE/sv-run" "$TEST_STATE/health-ready"; : > "$TEST_STATE/ps.out"; exit 0' TERM INT HUP
wait "\$receiver_pid"
EOF_RUNSV
chmod +x "$PREFIX/bin/sleep" "$PREFIX/bin/curl" "$PREFIX/bin/sv" "$PREFIX/bin/ps" "$PREFIX/bin/flock" "$PREFIX/bin/runsv"

receiver_sha="$(sha256sum "$RECEIVER" | awk '{print $1}')"
run_sha="$(sha256sum "$SERVICE/run" | awk '{print $1}')"
sed \
    -e "s|^PREFIX=/data/data/com.termux/files/usr$|PREFIX=$PREFIX|" \
    -e "s|^HOME_DIR=/data/data/com.termux/files/home$|HOME_DIR=$HOME_FIX|" \
    -e "s|^RECEIVER_SHA=.*$|RECEIVER_SHA=$receiver_sha|" \
    -e "s|^RUN_SHA=.*$|RUN_SHA=$run_sha|" \
    "$SOURCE" > "$SUBJECT"
chmod +x "$SUBJECT"

run_subject() {
    "$PREFIX/bin/sh" "$SUBJECT" "$@"
}

[ "$(sed -n '1p' "$SOURCE")" = '#!/data/data/com.termux/files/usr/bin/sh' ] || fail "shebang is not first line"
grep -q '^PREFIX=/data/data/com.termux/files/usr$' "$SOURCE" || fail "fixed prefix changed"
grep -q '^HOME_DIR=/data/data/com.termux/files/home$' "$SOURCE" || fail "fixed home changed"
grep -q '^RECEIVER_SHA=917905c0f893e62b6ece7998cebae8d4ce24aa714897618116ce963089d70d17$' "$SOURCE" || fail "receiver identity gate changed"
grep -q '^RUN_SHA=99028defcd9be8e20def4675c63777977c54ed62124860fd688b65477dcbe6d2$' "$SOURCE" || fail "run identity gate changed"
if grep -Eq 'service-daemon|runsvdir|pkill|killall' "$SOURCE"; then
    fail "broad service/process primitive present"
fi
if grep -Eq 'POCKETRISU_.*=' "$SOURCE"; then
    fail "caller environment override surface present"
fi
grep -q 'FLOCK="$PREFIX/bin/flock"' "$SOURCE" || fail "fixed flock owner missing"
if grep -Eq 'LOCKPID|LOCKSTART|proc_starttime|write_lock_identity|rm -rf.*ensure.lock' "$SOURCE"; then
    fail "legacy stale-lock metadata/reclamation remains"
fi

printf '0\n' > "$TEST_STATE/runsv.count"
: > "$TEST_STATE/ps.out"

out="$(run_subject --check)"
printf '%s\n' "$out" | grep -q '^recovery=eligible$' || fail "missing supervisor was not eligible"
printf '%s\n' "$out" | grep -q '^effect=none$' || fail "check performed an effect"
[ "$(cat "$TEST_STATE/runsv.count")" = 0 ] || fail "check started runsv"

run_subject >/dev/null
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "no-arg boot ensure did not start exactly one runsv"
out="$(run_subject --check)"
printf '%s\n' "$out" | grep -q '^supervision=run$' || fail "supervision not recognized"
printf '%s\n' "$out" | grep -q '^receiver=supervised$' || fail "receiver parent relation not recognized"
printf '%s\n' "$out" | grep -q '^health=ready$' || fail "health readback not ready"
[ "$(sed -n '1p' "$TEST_STATE/curl.args")" = -q ] || fail "curl config bypass missing"
[ "$(sed -n '3p' "$TEST_STATE/curl.args")" = --noproxy ] || fail "curl noproxy flag missing"
[ "$(sed -n '4p' "$TEST_STATE/curl.args")" = '*' ] || fail "curl localhost proxy bypass missing"
[ ! -e "$TEST_STATE/lock-fd-leaked" ] || fail "runsv inherited ensure lock fd"
run_subject --ensure >/dev/null
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "idempotent ensure duplicated runsv"

reset_runtime
touch "$SERVICE/down"
run_subject --ensure >/dev/null 2>&1 || true
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "operator down was overridden"
rm -f "$SERVICE/down"

printf '%s %s %s\n' 4242 1 "$PREFIX/bin/node $RECEIVER" > "$TEST_STATE/ps.out"
touch "$TEST_STATE/health-ready"
out="$(run_subject --ensure)"
printf '%s\n' "$out" | grep -q '^recovery=orphan_present$' || fail "healthy orphan not preserved"
printf '%s\n' "$out" | grep -q '^effect=none$' || fail "orphan path performed effect"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "orphan path started runsv"

printf '%s %s %s\n' 4244 1 "$PREFIX/bin/node receiver.cjs" > "$TEST_STATE/ps.out"
set +e
run_subject --ensure >/dev/null 2>&1
alt_rc=$?
set -e
[ "$alt_rc" -eq 2 ] || fail "alternate receiver argv did not fail closed"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "alternate receiver argv started runsv"

printf '%s %s %s\n' 4242 1 "$PREFIX/bin/node $RECEIVER" > "$TEST_STATE/ps.out"
printf '%s %s %s\n' 4243 1 "$PREFIX/bin/node $RECEIVER" >> "$TEST_STATE/ps.out"
set +e
run_subject --ensure >/dev/null 2>&1
dup_rc=$?
set -e
[ "$dup_rc" -eq 2 ] || fail "duplicate receiver did not fail closed"
[ "$(cat "$TEST_STATE/runsv.count")" = 1 ] || fail "duplicate receiver started runsv"

reset_runtime
cp "$RECEIVER" "$RECEIVER.bak"
printf '%s\n' drift >> "$RECEIVER"
set +e
run_subject --check >/dev/null 2>&1
drift_rc=$?
set -e
[ "$drift_rc" -ne 0 ] || fail "receiver identity drift passed"
mv "$RECEIVER.bak" "$RECEIVER"
chmod 600 "$RECEIVER"

reset_runtime
before_recheck="$(cat "$TEST_STATE/runsv.count")"
touch "$TEST_STATE/flock-block"
run_subject --ensure >/dev/null 2>&1 & recheck_pid=$!
i=0
while [ "$i" -lt 40 ] && [ ! -e "$TEST_STATE/flock-entered" ]; do
    /bin/sleep 0.05
    i=$((i + 1))
done
[ -e "$TEST_STATE/flock-entered" ] || fail "locked recheck fixture never entered flock"
touch "$SERVICE/down"
rm -f "$TEST_STATE/flock-block"
set +e
wait "$recheck_pid"
recheck_rc=$?
set -e
[ "$recheck_rc" -eq 2 ] || fail "locked recheck failure was converted to success"
[ "$(cat "$TEST_STATE/runsv.count")" = "$before_recheck" ] || fail "locked recheck failure started runsv"
rm -f "$SERVICE/down"

reset_runtime
before_concurrent="$(cat "$TEST_STATE/runsv.count")"
touch "$TEST_STATE/slow-start"
run_subject --ensure >/dev/null & one=$!
/bin/sleep 0.05
set +e
run_subject --ensure >/dev/null 2>&1 & two=$!
wait "$two"
two_rc=$?
set -e
wait "$one"
after_concurrent="$(cat "$TEST_STATE/runsv.count")"
[ "$two_rc" -eq 2 ] || fail "concurrent lock conflict reported success before accepted readback"
[ "$after_concurrent" -eq $((before_concurrent + 1)) ] || fail "concurrent ensure started more than one runsv"
[ ! -e "$TEST_STATE/lock-fd-leaked" ] || fail "concurrent start leaked lock fd"

reset_runtime
before_term="$(cat "$TEST_STATE/runsv.count")"
touch "$TEST_STATE/ps-block"
"$PREFIX/bin/sh" "$SUBJECT" --ensure >/dev/null 2>&1 & term_pid=$!
i=0
while [ "$i" -lt 40 ] && [ ! -e "$TEST_STATE/ps-entered" ]; do
    /bin/sleep 0.05
    i=$((i + 1))
done
[ -e "$TEST_STATE/ps-entered" ] || fail "termination fixture never entered locked classify"
kill -TERM "$term_pid" 2>/dev/null || fail "termination signal failed"
rm -f "$TEST_STATE/ps-block"
set +e
wait "$term_pid"
term_rc=$?
set -e
[ "$term_rc" -ne 0 ] || fail "terminated ensure reported success"
[ "$(cat "$TEST_STATE/runsv.count")" = "$before_term" ] || fail "terminated ensure continued to runsv effect"
run_subject --ensure >/dev/null
[ "$(cat "$TEST_STATE/runsv.count")" -eq $((before_term + 1)) ] || fail "kernel flock did not release after terminated ensure"

reset_runtime
before_failed="$(cat "$TEST_STATE/runsv.count")"
touch "$TEST_STATE/fail-start"
set +e
run_subject --ensure >/dev/null 2>&1
failed_rc=$?
set -e
[ "$failed_rc" -eq 1 ] || fail "failed postcondition did not report failure"
after_failed="$(cat "$TEST_STATE/runsv.count")"
[ "$after_failed" -eq $((before_failed + 1)) ] || fail "failed start effect count unexpected"

reset_runtime
touch "$SERVICE/sv-down"
printf '%s %s %s\n' 5151 1 "$PREFIX/bin/runsv $SERVICE" > "$TEST_STATE/ps.out"
out="$(run_subject --ensure)"
printf '%s\n' "$out" | grep -q '^supervision=down$' || fail "recognized down supervision missing"
printf '%s\n' "$out" | grep -q '^effect=none$' || fail "recognized down started another supervisor"

sh -n "$SOURCE"
sh -n "$SUBJECT"
echo "notify-relay-supervisor tests: PASS"
