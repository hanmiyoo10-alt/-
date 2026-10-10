#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CTL="$HERE/mcl-s-rdc-maintenance"
INSTALL="$HERE/install-s-termux.sh"
SHIM="$HERE/device-name-shim.cjs"
NODE_BIN=$(command -v node)
TMP=$(mktemp -d /tmp/mcl-s-rdc-maintenance-contract.XXXXXX)
trap 'rm -rf "$TMP" /tmp/mcl-s-rdc-maintenance-test-*-$$ /tmp/mcl-s-rdc-maintenance-install-test-*-$$' EXIT HUP INT TERM
PASS=0

fail() { echo "FAIL $1" >&2; exit 1; }
pass() { PASS=$((PASS + 1)); echo "PASS $1"; }

make_bundle() {
  dir=$1
  version=$2
  pkg="$dir/node_modules/@wonderwhy-er/desktop-commander"
  mkdir -p "$pkg/dist"
  printf '{"name":"@wonderwhy-er/desktop-commander","version":"%s"}\n' "$version" > "$pkg/package.json"
  printf '%s\n' '#!/bin/sh' 'exit 0' > "$pkg/dist/index.js"
}

write_config() {
  root=$1
  exp=$2
  payload=$($NODE_BIN -e 'process.stdout.write(Buffer.from(JSON.stringify({exp:Number(process.argv[1])})).toString("base64url"))' "$exp")
  mkdir -p "$root/rootfs/root/.desktop-commander-device"
  printf '{"session":{"access_token":"x.%s.y"}}\n' "$payload" > "$root/rootfs/root/.desktop-commander-device/device.json"
}

write_base_run() {
  root=$1
  service="$root/prefix/var/service/desktop-commander-remote"
  mkdir -p "$service"
  cat > "$service/run" <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
PREFIX=/data/data/com.termux/files/usr
HOME=/data/data/com.termux/files/home
export PREFIX HOME PATH="$PREFIX/bin:$PATH"
"$PREFIX/bin/termux-wake-lock" >/dev/null 2>&1 || true
GROUP_SYNC="$HOME/.local/bin/sync-proot-android-groups"
if [ -x "$GROUP_SYNC" ]; then
  "$GROUP_SYNC" --repair || echo "desktop-commander-remote: group preflight failed; continuing" >&2
fi
child_pid=""
stop_child() {
  [ -n "$child_pid" ] || return 0
  "$PREFIX/bin/kill" -TERM -- "-$child_pid" 2>/dev/null || true
  i=0
  while "$PREFIX/bin/kill" -0 "$child_pid" 2>/dev/null && [ "$i" -lt 20 ]; do
    sleep 0.25
    i=$((i + 1))
  done
  "$PREFIX/bin/kill" -KILL -- "-$child_pid" 2>/dev/null || true
}
trap 'stop_child; exit 0' TERM INT HUP
"$PREFIX/bin/setsid" "$PREFIX/bin/proot-distro" login ubuntu -- /bin/bash -lc '
  set -eu
  export HOME=/root
  export DESKTOP_COMMANDER_DEVICE_NAME="S"
  cd /root/nyang-repo
  exec /data/data/com.termux/files/usr/bin/node /root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js remote
' 2>&1 &
child_pid=$!
wait "$child_pid"
rc=$?
trap - TERM INT HUP
exit "$rc"
EOF
  chmod 700 "$service/run"
  [ "$(sha256sum "$service/run" | awk '{print $1}')" = c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252 ] || fail base-run-fixture
}

make_post_upgrade_root() {
  name=$1
  root=$(make_root "$name")
  active="$root/rootfs/root/.local/share/desktop-commander-remote"
  backup="$root/rootfs/root/.local/share/desktop-commander-remote.mcl-backup-0.2.48"
  mv "$active" "$backup"
  make_bundle "$active" 0.2.52
  printf '%s\n' "$root"
}

make_root() {
  name=$1
  root="/tmp/mcl-s-rdc-maintenance-test-$name-$$"
  rm -rf "$root"
  mkdir -p "$root/prefix/bin" "$root/home/.local/bin" \
    "$root/home/.local/state/desktop-commander-remote" \
    "$root/rootfs/root/.local/share" "$root/service" \
    "$root/prefix/var/service/desktop-commander-remote"
  ln -s "$NODE_BIN" "$root/prefix/bin/node"
  make_bundle "$root/rootfs/root/.local/share/desktop-commander-remote" 0.2.48
  write_config "$root" 2000
  cat > "$root/home/.local/state/desktop-commander-remote/current" <<'EOF'
2026-10-03T00:00:00Z ❌ Channel error: old
2026-10-03T00:00:01Z ✅ Device ready: baseline
EOF
  cat > "$root/home/.local/bin/rdc-health-watchdog" <<'EOF'
#!/bin/sh
set -u
root=$MCL_S_RDC_MAINTENANCE_TEST_ROOT
if [ -f "$root/watchdog-block" ]; then
  echo 'rdc-watchdog: native-self-heal-window bad_age=1'
  exit 0
fi
echo 'rdc-watchdog: healthy'
EOF
  chmod 755 "$root/home/.local/bin/rdc-health-watchdog"
  write_base_run "$root"
  printf '%s\n' "$root"
}

write_mocks() {
  root=$1
  cat > "$root/prefix/bin/npm" <<'EOF'
#!/bin/sh
set -eu
root=$MCL_S_RDC_MAINTENANCE_TEST_ROOT
echo npm >> "$root/npm-calls"
out=
while [ "$#" -gt 0 ]; do
  if [ "$1" = --prefix ]; then out=$2; shift 2; else shift; fi
done
[ -n "$out" ] || exit 2
pkg="$out/node_modules/@wonderwhy-er/desktop-commander"
mkdir -p "$pkg/dist"
printf '{"name":"@wonderwhy-er/desktop-commander","version":"0.2.52"}\n' > "$pkg/package.json"
printf '%s\n' '#!/bin/sh' 'exit 0' > "$pkg/dist/index.js"
EOF
  chmod 755 "$root/prefix/bin/npm"
  cat > "$root/prefix/bin/sv" <<'EOF'
#!/bin/sh
set -eu
root=$MCL_S_RDC_MAINTENANCE_TEST_ROOT
case "$1" in
  status)
    if [ -f "$root/service-down" ]; then echo 'down: test'; else echo 'run: test: 1s'; fi
    ;;
  restart)
    count=0
    [ ! -f "$root/restarts" ] || count=$(wc -l < "$root/restarts")
    count=$((count + 1))
    echo "$count" >> "$root/restarts"
    [ ! -f "$root/fail-restart-$count" ] || exit 1
    if [ ! -f "$root/no-ready-$count" ]; then
      run="$root/prefix/var/service/desktop-commander-remote/run"
      if [ -f "$root/ready-name-$count" ]; then
        ready=$(cat "$root/ready-name-$count")
      elif grep -Fq -- '--require /root/.local/share/mcl-s-rdc-maintenance/device-name-shim.cjs' "$run" 2>/dev/null; then
        ready='S'
      else
        ready="restart-$count"
      fi
      if [ -f "$root/auth-flow-$count" ]; then
        printf '%s\n' "2026-10-03T00:00:0"$count"Z 🔐 Starting device authorization flow" >> \
          "$root/home/.local/state/desktop-commander-remote/current"
      fi
      if [ -f "$root/name-before-ready-$count" ]; then
        printf '%s\n' "2026-10-03T00:00:0"$count"Z Device Name: $ready" >> \
          "$root/home/.local/state/desktop-commander-remote/current"
      fi
      printf '%s\n' "2026-10-03T00:00:0"$count"Z ✅ Device ready:" >> \
        "$root/home/.local/state/desktop-commander-remote/current"
      if [ ! -f "$root/no-name-$count" ]; then
        printf '%s\n' "2026-10-03T00:00:0"$count"Z Device Name: $ready" >> \
          "$root/home/.local/state/desktop-commander-remote/current"
      fi
      if [ -f "$root/conflict-name-$count" ]; then
        conflict=$(cat "$root/conflict-name-$count")
        printf '%s\n' "2026-10-03T00:00:0"$count"Z Device Name: $conflict" >> \
          "$root/home/.local/state/desktop-commander-remote/current"
      fi
    fi
    ;;
  *) exit 2 ;;
esac
EOF
  chmod 755 "$root/prefix/bin/sv"
}

capture() {
  root=$1
  mode=$2
  set +e
  OUT=$(MCL_S_RDC_MAINTENANCE_TEST_MODE=1 \
    MCL_S_RDC_MAINTENANCE_TEST_ROOT="$root" \
    MCL_S_RDC_MAINTENANCE_TEST_NOW=1000 \
    MCL_S_RDC_MAINTENANCE_TEST_READY_ATTEMPTS=2 \
    MCL_S_RDC_MAINTENANCE_TEST_READY_SLEEP=0 \
    sh "$CTL" "$mode" 2>&1)
  RC=$?
  set -e
}

assert_line() {
  printf '%s\n' "$OUT" | grep -Fqx "$1" || fail "missing-$1"
}
sh -n "$CTL" || fail controller-syntax
sh -n "$INSTALL" || fail installer-syntax
node --check "$SHIM" || fail shim-syntax
grep -Fqx '// mcl-s-rdc-device-name:v1' "$SHIM" || fail shim-marker
DESKTOP_COMMANDER_DEVICE_NAME=S "$NODE_BIN" --require "$SHIM" --input-type=module -e "import os from 'node:os'; if (os.hostname() !== 'S') process.exit(1)" || fail shim-label
if DESKTOP_COMMANDER_DEVICE_NAME=X "$NODE_BIN" --require "$SHIM" -e "process.exit(0)" >/dev/null 2>&1; then fail shim-arbitrary-label; fi
grep -Fq "BASE_RUN_SHA='c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252'" "$CTL" || fail base-run-sha
grep -Fq "TARGET_RUN_SHA='e498f0350f651ebb03a859aac9409806c14bab98b7806e9b7c57a970b1b62069'" "$CTL" || fail target-run-sha
grep -Fq 'SHIM_SOURCE="$FIXED_HOME/.local/share/mcl-s-rdc-maintenance/device-name-shim.cjs"' "$CTL" || fail production-shim-source
pass production-shim-source-fixed
grep -Fq 'BASE_VERSION=0.2.48' "$CTL" || fail base-version
grep -Fq 'TARGET_VERSION=0.2.52' "$CTL" || fail target-version
grep -Fq 'desktop-commander-remote.mcl-stage-0.2.52' "$CTL" || fail fixed-stage
grep -Fq 'desktop-commander-remote.mcl-backup-0.2.48' "$CTL" || fail fixed-backup
for forbidden in desktop-commander-remote-termux pocketrisu tailscale sshd; do
  ! grep -Fiq "$forbidden" "$CTL" "$INSTALL" || fail "forbidden-$forbidden"
done
pass static-contract

root=$(make_root check)
write_mocks "$root"
capture "$root" --check
[ "$RC" -eq 0 ] || fail check-rc
assert_line 'result=needs_stage'
[ ! -e "$root/npm-calls" ] || fail check-called-npm
[ ! -e "$root/restarts" ] || fail check-restarted
[ ! -e "$root/rootfs/root/.local/share/desktop-commander-remote.mcl-stage-0.2.52" ] || fail check-staged
pass check-read-only

root=$(make_root stage)
write_mocks "$root"
capture "$root" --stage
[ "$RC" -eq 0 ] || fail stage-rc
assert_line 'result=ready_to_activate'
[ "$(cat "$root/npm-calls")" = npm ] || fail stage-npm-count
[ ! -e "$root/restarts" ] || fail stage-restarted
capture "$root" --stage
[ "$RC" -eq 0 ] || fail stage-idempotent-rc
[ "$(wc -l < "$root/npm-calls")" -eq 1 ] || fail stage-idempotent-npm
pass stage-idempotent
root=$(make_root activate)
write_mocks "$root"
capture "$root" --stage
capture "$root" --activate
[ "$RC" -eq 0 ] || fail activate-rc
assert_line 'result=target_active'
grep -Fq '"version":"0.2.52"' "$root/rootfs/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/package.json" || fail activate-version
grep -Fq '"version":"0.2.48"' "$root/rootfs/root/.local/share/desktop-commander-remote.mcl-backup-0.2.48/node_modules/@wonderwhy-er/desktop-commander/package.json" || fail backup-version
[ "$(wc -l < "$root/restarts")" -eq 1 ] || fail activate-restart-count
pass activate-success

root=$(make_root serviceblock)
write_mocks "$root"
capture "$root" --stage
: > "$root/service-down"
capture "$root" --activate
[ "$RC" -eq 2 ] || fail service-block-rc
assert_line 'result=blocked'
[ ! -e "$root/restarts" ] || fail service-block-restart
pass service-block

root=$(make_root watchdogblock)
write_mocks "$root"
capture "$root" --stage
: > "$root/watchdog-block"
capture "$root" --activate
[ "$RC" -eq 2 ] || fail watchdog-block-rc
[ ! -e "$root/restarts" ] || fail watchdog-block-restart
pass watchdog-block
root=$(make_root stale)
write_mocks "$root"
capture "$root" --stage
write_config "$root" 1100
capture "$root" --activate
[ "$RC" -eq 2 ] || fail stale-block-rc
[ ! -e "$root/restarts" ] || fail stale-block-restart
pass stale-session-block

root=$(make_root rollback)
write_mocks "$root"
capture "$root" --stage
: > "$root/no-ready-1"
capture "$root" --activate
[ "$RC" -eq 1 ] || fail rollback-rc
assert_line 'result=rolled_back'
grep -Fq '"version":"0.2.48"' "$root/rootfs/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/package.json" || fail rollback-version
[ "$(wc -l < "$root/restarts")" -eq 2 ] || fail rollback-restart-count
pass timeout-rollback

root=$(make_root rollbackfail)
write_mocks "$root"
capture "$root" --stage
: > "$root/no-ready-1"
: > "$root/fail-restart-2"
capture "$root" --activate
[ "$RC" -eq 2 ] || fail rollback-fail-rc
assert_line 'result=unknown'
grep -Fq '"version":"0.2.48"' "$root/rootfs/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/package.json" || fail rollback-fail-version
pass rollback-restart-failure
root=$(make_root foreign)
write_mocks "$root"
mkdir -p "$root/rootfs/root/.local/share/desktop-commander-remote.mcl-stage-0.2.52"
printf 'foreign\n' > "$root/rootfs/root/.local/share/desktop-commander-remote.mcl-stage-0.2.52/file"
capture "$root" --stage
[ "$RC" -eq 2 ] || fail foreign-stage-rc
[ ! -e "$root/npm-calls" ] || fail foreign-stage-npm
pass foreign-stage-block

root=$(make_root symlink)
write_mocks "$root"
mkdir -p "$root/foreign-stage"
ln -s "$root/foreign-stage" "$root/rootfs/root/.local/share/desktop-commander-remote.mcl-stage-0.2.52"
capture "$root" --stage
[ "$RC" -eq 2 ] || fail symlink-stage-rc
[ ! -e "$root/npm-calls" ] || fail symlink-stage-npm
pass symlink-stage-block

root=$(make_post_upgrade_root labelcheck)
write_mocks "$root"
run="$root/prefix/var/service/desktop-commander-remote/run"
base_snap=$(sha256sum "$run" | awk '{print $1}')
capture "$root" --label-check
[ "$RC" -eq 0 ] || fail label-check-rc
assert_line 'result=needs_label_stage'
[ "$(sha256sum "$run" | awk '{print $1}')" = "$base_snap" ] || fail label-check-run-mutated
[ ! -e "$root/restarts" ] || fail label-check-restart
pass label-check-read-only

root=$(make_post_upgrade_root labelstage)
write_mocks "$root"
run="$root/prefix/var/service/desktop-commander-remote/run"
stage_run="$root/prefix/var/service/desktop-commander-remote/run.mcl-label-stage"
shim_target="$root/rootfs/root/.local/share/mcl-s-rdc-maintenance/device-name-shim.cjs"
base_snap=$(sha256sum "$run" | awk '{print $1}')
capture "$root" --label-stage
[ "$RC" -eq 0 ] || fail label-stage-rc
assert_line 'result=ready_to_label_activate'
[ "$(sha256sum "$run" | awk '{print $1}')" = "$base_snap" ] || fail label-stage-live-mutated
[ "$(sha256sum "$stage_run" | awk '{print $1}')" = e498f0350f651ebb03a859aac9409806c14bab98b7806e9b7c57a970b1b62069 ] || fail label-stage-run-sha
cmp -s "$SHIM" "$shim_target" || fail label-stage-shim
[ ! -e "$root/restarts" ] || fail label-stage-restart
capture "$root" --label-stage
[ "$RC" -eq 0 ] || fail label-stage-repeat-rc
[ ! -e "$root/restarts" ] || fail label-stage-repeat-restart
pass label-stage-idempotent

root=$(make_post_upgrade_root labelactivate)
write_mocks "$root"
capture "$root" --label-stage
capture "$root" --label-activate
[ "$RC" -eq 0 ] || fail label-activate-rc
assert_line 'result=label_active'
run="$root/prefix/var/service/desktop-commander-remote/run"
backup_run="$root/prefix/var/service/desktop-commander-remote/run.mcl-label-backup"
[ "$(sha256sum "$run" | awk '{print $1}')" = e498f0350f651ebb03a859aac9409806c14bab98b7806e9b7c57a970b1b62069 ] || fail label-activate-run
[ "$(sha256sum "$backup_run" | awk '{print $1}')" = c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252 ] || fail label-activate-backup
[ "$(wc -l < "$root/restarts")" -eq 1 ] || fail label-activate-restart-count
capture "$root" --label-activate
[ "$RC" -eq 0 ] || fail label-activate-idempotent-rc
[ "$(wc -l < "$root/restarts")" -eq 1 ] || fail label-activate-idempotent-restart
pass label-activate-success

root=$(make_post_upgrade_root labellocalhost)
write_mocks "$root"
capture "$root" --label-stage
printf '%s\n' localhost > "$root/ready-name-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-localhost-rc
assert_line 'result=rolled_back'
[ "$(wc -l < "$root/restarts")" -eq 2 ] || fail label-localhost-restarts
pass label-localhost-rejected

root=$(make_post_upgrade_root labelmissingname)
write_mocks "$root"
capture "$root" --label-stage
: > "$root/no-name-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-missing-name-rc
assert_line 'result=rolled_back'
pass label-missing-name-rejected

root=$(make_post_upgrade_root labelemptyname)
write_mocks "$root"
capture "$root" --label-stage
: > "$root/ready-name-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-empty-name-rc
assert_line 'result=rolled_back'
pass label-empty-name-rejected

root=$(make_post_upgrade_root labelarbitraryname)
write_mocks "$root"
capture "$root" --label-stage
printf '%s\n' M > "$root/ready-name-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-arbitrary-name-rc
assert_line 'result=rolled_back'
pass label-arbitrary-name-rejected

root=$(make_post_upgrade_root labelauthflow)
write_mocks "$root"
capture "$root" --label-stage
: > "$root/auth-flow-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-auth-flow-rc
assert_line 'result=rolled_back'
pass label-auth-flow-rejected

root=$(make_post_upgrade_root labelreordered)
write_mocks "$root"
capture "$root" --label-stage
: > "$root/name-before-ready-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-reordered-rc
assert_line 'result=rolled_back'
pass label-reordered-rejected

root=$(make_post_upgrade_root labelconflicting)
write_mocks "$root"
capture "$root" --label-stage
printf '%s\n' localhost > "$root/conflict-name-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-conflicting-name-rc
assert_line 'result=rolled_back'
pass label-conflicting-name-rejected

root=$(make_post_upgrade_root labelhistorical)
write_mocks "$root"
capture "$root" --label-stage
printf '%s\n' '2026-10-03T00:00:00Z ✅ Device ready:' '2026-10-03T00:00:00Z Device Name: S' >> \
  "$root/home/.local/state/desktop-commander-remote/current"
: > "$root/no-ready-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-historical-rc
assert_line 'result=rolled_back'
pass label-historical-evidence-rejected

root=$(make_post_upgrade_root labeldrift)
write_mocks "$root"
printf '\n# drift\n' >> "$root/prefix/var/service/desktop-commander-remote/run"
capture "$root" --label-stage
[ "$RC" -eq 2 ] || fail label-drift-rc
[ ! -e "$root/restarts" ] || fail label-drift-restart
pass label-drift-block

root=$(make_post_upgrade_root labelforeign)
write_mocks "$root"
printf 'foreign\n' > "$root/prefix/var/service/desktop-commander-remote/run.mcl-label-stage"
capture "$root" --label-stage
[ "$RC" -eq 2 ] || fail label-foreign-stage-rc
pass label-foreign-stage-block

root=$(make_post_upgrade_root labelwatchdog)
write_mocks "$root"
capture "$root" --label-stage
: > "$root/watchdog-block"
capture "$root" --label-activate
[ "$RC" -eq 2 ] || fail label-watchdog-rc
[ ! -e "$root/restarts" ] || fail label-watchdog-restart
pass label-watchdog-block

root=$(make_post_upgrade_root labelstale)
write_mocks "$root"
capture "$root" --label-stage
write_config "$root" 1100
capture "$root" --label-activate
[ "$RC" -eq 2 ] || fail label-stale-rc
[ ! -e "$root/restarts" ] || fail label-stale-restart
pass label-stale-session-block

root=$(make_post_upgrade_root labelrollback)
write_mocks "$root"
capture "$root" --label-stage
: > "$root/no-ready-1"
capture "$root" --label-activate
[ "$RC" -eq 1 ] || fail label-rollback-rc
assert_line 'result=rolled_back'
run="$root/prefix/var/service/desktop-commander-remote/run"
[ "$(sha256sum "$run" | awk '{print $1}')" = c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252 ] || fail label-rollback-run
[ "$(wc -l < "$root/restarts")" -eq 2 ] || fail label-rollback-restarts
pass label-timeout-rollback

root=$(make_post_upgrade_root labelrollbackfail)
write_mocks "$root"
capture "$root" --label-stage
: > "$root/no-ready-1"
: > "$root/fail-restart-2"
capture "$root" --label-activate
[ "$RC" -eq 2 ] || fail label-rollback-fail-rc
assert_line 'result=unknown'
run="$root/prefix/var/service/desktop-commander-remote/run"
[ "$(sha256sum "$run" | awk '{print $1}')" = c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252 ] || fail label-rollback-fail-run
pass label-rollback-restart-failure

root=$(make_post_upgrade_root labelsymlink)
write_mocks "$root"
ln -s "$root/foreign" "$root/prefix/var/service/desktop-commander-remote/run.mcl-label-stage"
capture "$root" --label-stage
[ "$RC" -eq 2 ] || fail label-symlink-stage-rc
pass label-symlink-stage-block

install_root="/tmp/mcl-s-rdc-maintenance-install-test-basic-$$"
mkdir -p "$install_root/home/.local/bin"
set +e
OUT=$(MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --check 2>&1)
RC=$?
set -e
[ "$RC" -eq 1 ] || fail installer-missing-rc
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
target="$install_root/home/.local/bin/mcl-s-rdc-maintenance"
shim_target="$install_root/home/.local/share/mcl-s-rdc-maintenance/device-name-shim.cjs"
[ -f "$target" ] && [ "$(stat -c %a "$target")" = 700 ] || fail installer-target
[ -f "$shim_target" ] && [ "$(stat -c %a "$shim_target")" = 600 ] || fail installer-shim-target
cmp -s "$SHIM" "$shim_target" || fail installer-shim-bytes
snap1=$(sha256sum "$target" "$shim_target")
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
snap2=$(sha256sum "$target" "$shim_target")
[ "$snap1" = "$snap2" ] || fail installer-idempotence
pass installer-idempotence

printf '%s\n' '#!/bin/sh' '# mcl-s-rdc-maintenance:v1' 'drift' > "$target"
chmod 700 "$target"
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
cmp -s "$CTL" "$target" || fail installer-drift-repair
pass installer-managed-drift
printf '%s\n' "'use strict';" '// mcl-s-rdc-device-name:v1' 'drift' > "$shim_target"
chmod 600 "$shim_target"
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
cmp -s "$SHIM" "$shim_target" || fail installer-shim-drift-repair
pass installer-shim-managed-drift

conflict_root="/tmp/mcl-s-rdc-maintenance-install-test-conflict-$$"
mkdir -p "$conflict_root/home/.local/bin"
printf 'foreign\n' > "$conflict_root/home/.local/bin/mcl-s-rdc-maintenance"
set +e
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$conflict_root" sh "$INSTALL" --apply >/dev/null 2>&1
RC=$?
set -e
[ "$RC" -eq 2 ] || fail installer-conflict-rc
pass installer-foreign-conflict
shim_conflict_root="/tmp/mcl-s-rdc-maintenance-install-test-shim-conflict-$$"
mkdir -p "$shim_conflict_root/home/.local/bin" "$shim_conflict_root/home/.local/share/mcl-s-rdc-maintenance"
cp "$CTL" "$shim_conflict_root/home/.local/bin/mcl-s-rdc-maintenance"
chmod 700 "$shim_conflict_root/home/.local/bin/mcl-s-rdc-maintenance"
printf 'foreign\n' > "$shim_conflict_root/home/.local/share/mcl-s-rdc-maintenance/device-name-shim.cjs"
set +e
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$shim_conflict_root" sh "$INSTALL" --apply >/dev/null 2>&1
RC=$?
set -e
[ "$RC" -eq 2 ] || fail installer-shim-conflict-rc
pass installer-shim-foreign-conflict
symlink_root="/tmp/mcl-s-rdc-maintenance-install-test-symlink-$$"
mkdir -p "$symlink_root/home/.local/bin"
ln -s "$TMP/foreign" "$symlink_root/home/.local/bin/mcl-s-rdc-maintenance"
set +e
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$symlink_root" sh "$INSTALL" --check >/dev/null 2>&1
RC=$?
set -e
[ "$RC" -eq 2 ] || fail installer-symlink-rc
pass installer-symlink-conflict
shim_symlink_root="/tmp/mcl-s-rdc-maintenance-install-test-shim-symlink-$$"
mkdir -p "$shim_symlink_root/home/.local/bin" "$shim_symlink_root/home/.local/share/mcl-s-rdc-maintenance"
cp "$CTL" "$shim_symlink_root/home/.local/bin/mcl-s-rdc-maintenance"
chmod 700 "$shim_symlink_root/home/.local/bin/mcl-s-rdc-maintenance"
ln -s "$TMP/foreign" "$shim_symlink_root/home/.local/share/mcl-s-rdc-maintenance/device-name-shim.cjs"
set +e
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$shim_symlink_root" sh "$INSTALL" --check >/dev/null 2>&1
RC=$?
set -e
[ "$RC" -eq 2 ] || fail installer-shim-symlink-rc
pass installer-shim-symlink-conflict

echo "1..$PASS"
echo 'PASS s-rdc-maintenance contract'
