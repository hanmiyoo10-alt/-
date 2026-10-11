#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
OWNER=$(CDPATH= cd -- "$HERE/.." && pwd)
WATCHDOG="$OWNER/rdc-health-watchdog"
RUN_FILE="$OWNER/desktop-commander-watchdog-run"
INSTALL="$OWNER/install-s-termux.sh"
NODE_BIN=$(command -v node)
TMP=$(mktemp -d /tmp/mcl-s-rdc-watchdog-contract.XXXXXX)
trap 'rm -rf "$TMP" /tmp/mcl-s-rdc-watchdog-test-*-$$ /tmp/mcl-s-rdc-watchdog-install-test-*-$$' EXIT HUP INT TERM

fail() { echo "FAIL $1" >&2; exit 1; }
pass() { echo "PASS $1"; }

make_root() {
  name=$1
  root="/tmp/mcl-s-rdc-watchdog-test-$name-$$"
  rm -rf "$root"
  mkdir -p "$root/prefix/bin" "$root/state" "$root/home"
  ln -s "$NODE_BIN" "$root/prefix/bin/node"
  cat > "$root/prefix/bin/sv" <<'EOSV'
#!/bin/sh
root=${MCL_S_RDC_WATCHDOG_TEST_ROOT:?}
case "$1" in
  status)
    if [ -f "$root/service-down" ]; then echo 'down: test-service'; else echo 'run: test-service: (pid 123) 999s'; fi
    ;;
  restart)
    echo restart >> "$root/restarts"
    [ ! -f "$root/fail-restart" ] || exit 1
    exit 0
    ;;
  *) exit 2 ;;
esac
EOSV
  chmod 755 "$root/prefix/bin/sv"
  printf '%s\n' "$root"
}

write_config() {
  root=$1
  exp=$2
  payload=$($NODE_BIN -e 'process.stdout.write(Buffer.from(JSON.stringify({exp:Number(process.argv[1])})).toString("base64url"))' "$exp")
  printf '{"session":{"access_token":"x.%s.y"}}\n' "$payload" > "$root/config.json"
}

write_bad_log() {
  root=$1
  cat > "$root/log" <<'EOFLOG'
2026-09-24T00:00:00Z ✅ Device ready: test
2026-09-24T00:00:01Z ❌ Channel error: transport failure
EOFLOG
}

write_timeout_log() {
  root=$1
  cat > "$root/log" <<'EOFLOG'
2026-09-24T00:00:00Z ✅ Device ready: test
2026-09-24T00:00:01Z ⏱️ Channel subscription timed out, Reconnecting...
EOFLOG
}

write_healthy_log() {
  root=$1
  cat > "$root/log" <<'EOFLOG'
2026-09-24T00:00:00Z ❌ Channel error: transport failure
2026-09-24T00:00:01Z 🔌 Device marked as online
EOFLOG
}

write_auth_log() {
  root=$1
  cat > "$root/log" <<'EOFLOG'
2026-09-24T00:00:00Z ✅ Device ready: test
2026-09-24T00:00:01Z ❌ Channel error: transport failure
2026-09-24T00:00:02Z 🔐 Starting device authorization flow
EOFLOG
}

capture_watchdog() {
  root=$1
  now=$2
  shift 2
  set +e
  OUT=$(MCL_S_RDC_WATCHDOG_TEST_MODE=1 MCL_S_RDC_WATCHDOG_TEST_ROOT="$root" MCL_S_RDC_WATCHDOG_TEST_NOW="$now" bash "$WATCHDOG" "$@" 2>&1)
  RC=$?
  set -e
}

assert_contains() {
  printf '%s\n' "$OUT" | grep -Fq "$1" || fail "missing output: $1"
}

assert_no_restart() {
  root=$1
  [ ! -f "$root/restarts" ] || fail 'unexpected restart'
}

bash -n "$WATCHDOG" || fail watchdog-syntax
sh -n "$RUN_FILE" || fail run-file-syntax
sh -n "$INSTALL" || fail installer-syntax
grep -Fq 'SELF_HEAL_BUDGET_SECONDS=120' "$WATCHDOG" || fail self-heal-budget
grep -Fq 'COOLDOWN_SECONDS=900' "$WATCHDOG" || fail cooldown
grep -Fq '"$PREFIX/bin/sleep" 30' "$RUN_FILE" || fail poll-interval
[ "$(grep -Fc '"$SV" restart "$SERVICE"' "$WATCHDOG")" -eq 1 ] || fail restart-surface-count
for forbidden in 'desktop-commander-remote-termux' tailscale sshd pocketrisu; do
  ! grep -Fiq "$forbidden" "$WATCHDOG" "$RUN_FILE" "$INSTALL" || fail "forbidden-$forbidden"
done
pass static-contract

root=$(make_root fresh)
write_config "$root" 2000
write_bad_log "$root"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail fresh-bad-rc
assert_contains 'native-self-heal-window bad_age=0'
[ "$(cat "$root/state/bad-since-epoch")" = 1000 ] || fail fresh-bad-since
assert_no_restart "$root"
pass fresh-bad

root=$(make_root age119)
write_config "$root" 2000
write_bad_log "$root"
printf '881\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail age119-rc
assert_contains 'native-self-heal-window bad_age=119'
assert_no_restart "$root"
pass age119

root=$(make_root age120)
write_config "$root" 2000
write_bad_log "$root"
printf '880\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 10 ] || fail age120-check-rc
assert_contains 'would-restart bad_age=120'
assert_no_restart "$root"
pass age120-check

root=$(make_root restart)
write_config "$root" 2000
write_bad_log "$root"
printf '880\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000
[ "$RC" -eq 0 ] || fail restart-rc
assert_contains 'restart-requested'
[ "$(wc -l < "$root/restarts")" -eq 1 ] || fail restart-count
[ "$(cat "$root/state/last-restart-epoch")" = 1000 ] || fail restart-epoch
[ ! -e "$root/state/bad-since-epoch" ] || fail restart-did-not-clear-bad-since
pass restart-success

root=$(make_root selfheal)
write_config "$root" 2000
write_healthy_log "$root"
printf '900\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail selfheal-rc
assert_contains 'rdc-watchdog: healthy'
[ ! -e "$root/state/bad-since-epoch" ] || fail selfheal-clear
assert_no_restart "$root"
pass selfheal-reset

root=$(make_root auth)
write_config "$root" 2000
write_auth_log "$root"
printf '800\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail auth-rc
assert_contains 'auth-required; no automatic restart'
[ ! -e "$root/state/bad-since-epoch" ] || fail auth-clear
assert_no_restart "$root"
pass auth-block

root=$(make_root stale)
write_config "$root" 1100
write_bad_log "$root"
printf '880\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail stale-rc
assert_contains 'persisted-session-not-fresh; no restart'
assert_no_restart "$root"
pass stale-session

root=$(make_root cooldown)
write_config "$root" 2000
write_bad_log "$root"
printf '880\n' > "$root/state/bad-since-epoch"
printf '950\n' > "$root/state/last-restart-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail cooldown-rc
assert_contains 'cooldown-active; no restart'
assert_no_restart "$root"
pass cooldown

root=$(make_root down)
write_config "$root" 2000
write_bad_log "$root"
printf '800\n' > "$root/state/bad-since-epoch"
: > "$root/service-down"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail service-down-rc
assert_contains 'service-not-running; runit owns process recovery'
[ ! -e "$root/state/bad-since-epoch" ] || fail service-down-clear
pass service-down

root=$(make_root missinglog)
write_config "$root" 2000
printf '800\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 0 ] || fail missing-log-rc
assert_contains 'rdc-watchdog: no-log'
[ ! -e "$root/state/bad-since-epoch" ] || fail missing-log-clear
pass missing-log

root=$(make_root restartfail)
write_config "$root" 2000
write_bad_log "$root"
printf '880\n' > "$root/state/bad-since-epoch"
: > "$root/fail-restart"
capture_watchdog "$root" 1000
[ "$RC" -eq 1 ] || fail restart-fail-rc
assert_contains 'restart-failed'
[ "$(wc -l < "$root/restarts")" -eq 1 ] || fail restart-fail-count
[ "$(cat "$root/state/last-restart-epoch")" = 1000 ] || fail restart-fail-cooldown
[ -e "$root/state/bad-since-epoch" ] || fail restart-fail-bad-since-lost
pass restart-failure

root=$(make_root timeout)
write_config "$root" 2000
write_timeout_log "$root"
printf '880\n' > "$root/state/bad-since-epoch"
capture_watchdog "$root" 1000 --check
[ "$RC" -eq 10 ] || fail timeout-marker-rc
assert_contains 'would-restart bad_age=120'
pass subscription-timeout-marker

install_root="/tmp/mcl-s-rdc-watchdog-install-test-basic-$$"
mkdir -p "$install_root/home/.local/bin" "$install_root/prefix/var/service/desktop-commander-watchdog"
set +e
OUT=$(MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --check 2>&1)
RC=$?
set -e
[ "$RC" -eq 1 ] || fail install-missing-rc
printf '%s\n' "$OUT" | grep -Fqx 'result=needs_apply' || fail install-missing-result
MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
[ "$(stat -c %a "$install_root/home/.local/bin/rdc-health-watchdog")" = 700 ] || fail install-watchdog-mode
[ "$(stat -c %a "$install_root/prefix/var/service/desktop-commander-watchdog/run")" = 700 ] || fail install-run-mode
grep -Fqx '# mcl-s-rdc-channel-watchdog:v2' "$install_root/home/.local/bin/rdc-health-watchdog" || fail install-watchdog-marker
grep -Fqx '# mcl-s-rdc-channel-watchdog-run:v1' "$install_root/prefix/var/service/desktop-commander-watchdog/run" || fail install-run-marker
snap1=$({ sha256sum "$install_root/home/.local/bin/rdc-health-watchdog" "$install_root/prefix/var/service/desktop-commander-watchdog/run"; stat -c '%Y %n' "$install_root/home/.local/bin/rdc-health-watchdog" "$install_root/prefix/var/service/desktop-commander-watchdog/run"; } | sha256sum | awk '{print $1}')
sleep 1
MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
snap2=$({ sha256sum "$install_root/home/.local/bin/rdc-health-watchdog" "$install_root/prefix/var/service/desktop-commander-watchdog/run"; stat -c '%Y %n' "$install_root/home/.local/bin/rdc-health-watchdog" "$install_root/prefix/var/service/desktop-commander-watchdog/run"; } | sha256sum | awk '{print $1}')
[ "$snap1" = "$snap2" ] || fail install-idempotence
pass installer-basic-idempotence

printf '# mcl-s-rdc-channel-watchdog:v2\ndrift\n' > "$install_root/home/.local/bin/rdc-health-watchdog"
chmod 700 "$install_root/home/.local/bin/rdc-health-watchdog"
set +e
OUT=$(MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --check 2>&1)
RC=$?
set -e
[ "$RC" -eq 1 ] || fail install-managed-drift-rc
MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
cmp -s "$WATCHDOG" "$install_root/home/.local/bin/rdc-health-watchdog" || fail install-managed-drift-repair
pass installer-managed-drift

conflict_root="/tmp/mcl-s-rdc-watchdog-install-test-conflict-$$"
mkdir -p "$conflict_root/home/.local/bin" "$conflict_root/prefix/var/service/desktop-commander-watchdog"
printf 'foreign\n' > "$conflict_root/home/.local/bin/rdc-health-watchdog"
set +e
OUT=$(MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$conflict_root" sh "$INSTALL" --check 2>&1)
RC=$?
set -e
[ "$RC" -eq 2 ] || fail install-foreign-check-rc
printf '%s\n' "$OUT" | grep -Fqx 'result=blocked' || fail install-foreign-result
set +e
MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$conflict_root" sh "$INSTALL" --apply >/dev/null 2>&1
RC=$?
set -e
[ "$RC" -eq 2 ] || fail install-foreign-apply-rc
[ "$(cat "$conflict_root/home/.local/bin/rdc-health-watchdog")" = foreign ] || fail install-foreign-mutated
pass installer-foreign-conflict

symlink_root="/tmp/mcl-s-rdc-watchdog-install-test-symlink-$$"
mkdir -p "$symlink_root/home/.local/bin" "$symlink_root/prefix/var/service/desktop-commander-watchdog"
ln -s "$TMP/foreign-target" "$symlink_root/prefix/var/service/desktop-commander-watchdog/run"
set +e
OUT=$(MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE=1 MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT="$symlink_root" sh "$INSTALL" --check 2>&1)
RC=$?
set -e
[ "$RC" -eq 2 ] || fail install-symlink-rc
printf '%s\n' "$OUT" | grep -Fqx 'result=blocked' || fail install-symlink-result
pass installer-symlink-conflict

grep -Fq 'LEGACY_WATCHDOG_SHA256=b5e9814533d903108e801cad1e07a90918b0a925fe2af7142bb568704164b68f' "$INSTALL" || fail legacy-watchdog-allowlist
grep -Fq 'LEGACY_RUN_SHA256=34fcc65cd2952939329168b900260caccb45542c1cf1b6b8f4b65ae0d199b481' "$INSTALL" || fail legacy-run-allowlist
pass legacy-allowlist

echo 'PASS s-rdc-channel-watchdog contract'
