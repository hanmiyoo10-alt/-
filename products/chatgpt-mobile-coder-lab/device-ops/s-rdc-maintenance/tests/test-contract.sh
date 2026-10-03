#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CTL="$HERE/mcl-s-rdc-maintenance"
INSTALL="$HERE/install-s-termux.sh"
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

make_root() {
  name=$1
  root="/tmp/mcl-s-rdc-maintenance-test-$name-$$"
  rm -rf "$root"
  mkdir -p "$root/prefix/bin" "$root/home/.local/bin" \
    "$root/home/.local/state/desktop-commander-remote" \
    "$root/rootfs/root/.local/share" "$root/service"
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
      printf '%s\n' "2026-10-03T00:00:0"$count"Z ✅ Device ready: restart-$count" >> \
        "$root/home/.local/state/desktop-commander-remote/current"
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
[ -f "$target" ] && [ "$(stat -c %a "$target")" = 700 ] || fail installer-target
snap1=$(sha256sum "$target" | awk '{print $1}')
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
snap2=$(sha256sum "$target" | awk '{print $1}')
[ "$snap1" = "$snap2" ] || fail installer-idempotence
pass installer-idempotence

printf '%s\n' '#!/bin/sh' '# mcl-s-rdc-maintenance:v1' 'drift' > "$target"
chmod 700 "$target"
MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE=1 \
  MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT="$install_root" sh "$INSTALL" --apply >/dev/null
cmp -s "$CTL" "$target" || fail installer-drift-repair
pass installer-managed-drift

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

echo "1..$PASS"
echo 'PASS s-rdc-maintenance contract'
