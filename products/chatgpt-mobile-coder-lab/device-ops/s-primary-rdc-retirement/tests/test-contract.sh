#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CTL="$HERE/mcl-s-primary-rdc-retirement.sh"
WATCH_OWNER=$(CDPATH= cd -- "$HERE/../s-rdc-channel-watchdog" && pwd)
NODE_BIN=$(command -v node)
PASS=0
trap 'rm -rf /tmp/mcl-s-primary-rdc-retirement-test-*-$$' EXIT HUP INT TERM

fail() { echo "FAIL $1" >&2; exit 1; }
pass() { PASS=$((PASS + 1)); echo "PASS $1"; }

write_primary_run() {
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
  [ "$(sha256sum "$service/run" | awk '{print $1}')" = c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252 ] || fail primary-run-fixture
}

make_bundle() {
  root=$1
  pkg="$root/rootfs/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander"
  mkdir -p "$pkg/dist"
  printf '%s\n' '{"name":"@wonderwhy-er/desktop-commander","version":"0.2.52"}' > "$pkg/package.json"
  printf '%s\n' 'console.log("fixture")' > "$pkg/dist/index.js"
}

write_fake_sv() {
  root=$1
  cat > "$root/prefix/bin/sv" <<'EOF'
#!/bin/sh
set -eu
root=${MCL_S_PRIMARY_RDC_RETIRE_TEST_ROOT:?}
op=$1
service=$2
name=$(basename "$service")
state="$root/state-$name"
pending="$root/pending-$name"
calls="$root/sv-calls"
[ -f "$state" ] || echo run > "$state"

progress_pending() {
  [ -f "$pending" ] || return 0
  read desired remaining < "$pending"
  if [ "$remaining" -le 0 ]; then
    echo "$desired" > "$state"
    rm -f "$pending"
  else
    remaining=$((remaining - 1))
    printf '%s %s\n' "$desired" "$remaining" > "$pending"
  fi
}

case "$op" in
  status)
    progress_pending
    current=$(cat "$state")
    if [ "$current" = run ]; then echo "run: $service: (pid 1) 1s"; else echo "down: $service: 1s"; fi
    ;;
  down|up)
    printf '%s:%s\n' "$op" "$name" >> "$calls"
    desired=down
    [ "$op" = up ] && desired=run
    delay=0
    [ ! -f "$root/delay-$op-$name" ] || delay=$(cat "$root/delay-$op-$name")
    if [ "$delay" -eq 0 ]; then
      echo "$desired" > "$state"
      rm -f "$pending"
    else
      printf '%s %s\n' "$desired" "$delay" > "$pending"
    fi
    ;;
  *) exit 2 ;;
esac
EOF
  chmod 755 "$root/prefix/bin/sv"
}

make_root() {
  name=$1
  root="/tmp/mcl-s-primary-rdc-retirement-test-$name-$$"
  rm -rf "$root"
  mkdir -p "$root/prefix/bin" "$root/home/.local/bin"     "$root/prefix/var/service/desktop-commander-remote"     "$root/prefix/var/service/desktop-commander-watchdog"     "$root/prefix/var/service/desktop-commander-remote-termux"
  ln -s "$NODE_BIN" "$root/prefix/bin/node"
  write_primary_run "$root"
  make_bundle "$root"
  cp "$WATCH_OWNER/desktop-commander-watchdog-run"     "$root/prefix/var/service/desktop-commander-watchdog/run"
  chmod 700 "$root/prefix/var/service/desktop-commander-watchdog/run"
  cp "$WATCH_OWNER/rdc-health-watchdog" "$root/home/.local/bin/rdc-health-watchdog"
  chmod 700 "$root/home/.local/bin/rdc-health-watchdog"
  [ "$(sha256sum "$root/prefix/var/service/desktop-commander-watchdog/run" | awk '{print $1}')" = 62dcd07c687c813fcb7d9f3e043284b099fb5412ae464f404605c8659bc59feb ] || fail watchdog-run-fixture
  [ "$(sha256sum "$root/home/.local/bin/rdc-health-watchdog" | awk '{print $1}')" = aad84bdf3554b905ff47a334404383335e8c2124675d24301369e46c3a362658 ] || fail watchdog-script-fixture
  echo run > "$root/state-desktop-commander-remote"
  echo run > "$root/state-desktop-commander-watchdog"
  echo run > "$root/state-desktop-commander-remote-termux"
  write_fake_sv "$root"
  printf '%s\n' "$root"
}

capture() {
  root=$1
  mode=$2
  attempts=${3:-5}
  set +e
  OUT=$(MCL_S_PRIMARY_RDC_RETIRE_TEST_MODE=1     MCL_S_PRIMARY_RDC_RETIRE_TEST_ROOT="$root"     MCL_S_PRIMARY_RDC_RETIRE_TEST_ATTEMPTS="$attempts"     MCL_S_PRIMARY_RDC_RETIRE_TEST_SLEEP=0     sh "$CTL" "$mode" 2>&1)
  RC=$?
  set -e
}
assert_line() {
  printf '%s\n' "$OUT" | grep -Fqx "$1" || fail "missing-$1"
}
call_count() {
  root=$1
  needle=$2
  [ -f "$root/sv-calls" ] || { echo 0; return; }
  grep -Fxc "$needle" "$root/sv-calls" || true
}
assert_calls() {
  root=$1
  expected=$2
  actual=
  [ ! -f "$root/sv-calls" ] || actual=$(cat "$root/sv-calls")
  [ "$actual" = "$expected" ] || fail "calls-$expected-got-$actual"
}

sh -n "$CTL" || fail syntax
grep -Fqx '# mcl-s-primary-rdc-retirement:v1' "$CTL" || fail marker
grep -Fq 'OBSERVE_ATTEMPTS=60' "$CTL" || fail production-observation-budget
for forbidden in pocketrisu tailscaled sshd; do
  ! grep -Fiq "$forbidden" "$CTL" || fail "forbidden-$forbidden"
done
pass static-contract

root=$(make_root active)
capture "$root" --check
[ "$RC" -eq 0 ] || fail active-check-rc
assert_line 'state=active'
assert_line 'result=pass'
[ ! -e "$root/sv-calls" ] || fail active-check-effect
pass active-check-read-only

root=$(make_root delayed)
printf '2\n' > "$root/delay-down-desktop-commander-watchdog"
printf '3\n' > "$root/delay-down-desktop-commander-remote"
capture "$root" --deactivate 8
[ "$RC" -eq 0 ] || fail delayed-deactivate-rc
assert_line 'state=retired'
assert_line 'result=pass'
assert_calls "$root" "down:desktop-commander-watchdog
down:desktop-commander-remote"
[ "$(stat -c %a "$root/prefix/var/service/desktop-commander-watchdog/down")" = 600 ] || fail watchdog-marker-mode
[ "$(stat -c %a "$root/prefix/var/service/desktop-commander-remote/down")" = 600 ] || fail primary-marker-mode
[ "$(cat "$root/state-desktop-commander-remote-termux")" = run ] || fail sibling-state
pass delayed-deactivate-single-effect

capture "$root" --deactivate 8
[ "$RC" -eq 0 ] || fail retired-idempotent-rc
[ "$(call_count "$root" down:desktop-commander-watchdog)" -eq 1 ] || fail retired-idempotent-watchdog
[ "$(call_count "$root" down:desktop-commander-remote)" -eq 1 ] || fail retired-idempotent-primary
pass retired-idempotent

printf '2\n' > "$root/delay-up-desktop-commander-remote"
printf '2\n' > "$root/delay-up-desktop-commander-watchdog"
capture "$root" --activate 8
[ "$RC" -eq 0 ] || fail delayed-activate-rc
assert_line 'state=active'
assert_line 'result=pass'
assert_calls "$root" "down:desktop-commander-watchdog
down:desktop-commander-remote
up:desktop-commander-remote
up:desktop-commander-watchdog"
[ ! -e "$root/prefix/var/service/desktop-commander-remote/down" ] || fail primary-marker-left
[ ! -e "$root/prefix/var/service/desktop-commander-watchdog/down" ] || fail watchdog-marker-left
pass delayed-activate-single-effect

capture "$root" --activate 8
[ "$RC" -eq 0 ] || fail active-idempotent-rc
[ "$(call_count "$root" up:desktop-commander-remote)" -eq 1 ] || fail active-idempotent-primary
[ "$(call_count "$root" up:desktop-commander-watchdog)" -eq 1 ] || fail active-idempotent-watchdog
pass active-idempotent

root=$(make_root timeout)
printf '99\n' > "$root/delay-down-desktop-commander-watchdog"
capture "$root" --deactivate 3
[ "$RC" -eq 2 ] || fail timeout-rc
assert_line 'result=unknown'
assert_line 'reason=watchdog-down-timeout'
[ "$(call_count "$root" down:desktop-commander-watchdog)" -eq 1 ] || fail timeout-down-repeated
[ "$(call_count "$root" down:desktop-commander-remote)" -eq 0 ] || fail timeout-primary-touched
pass timeout-does-not-repeat-effect

root=$(make_root partial)
echo down > "$root/state-desktop-commander-watchdog"
: > "$root/prefix/var/service/desktop-commander-watchdog/down"
chmod 600 "$root/prefix/var/service/desktop-commander-watchdog/down"
capture "$root" --deactivate
[ "$RC" -eq 2 ] || fail partial-rc
assert_line 'state=partial'
[ ! -e "$root/sv-calls" ] || fail partial-effect
pass partial-state-block

root=$(make_root drift)
printf '\n# drift\n' >> "$root/prefix/var/service/desktop-commander-remote/run"
capture "$root" --check
[ "$RC" -eq 2 ] || fail drift-rc
assert_line 'state=blocked'
pass primary-drift-block

root=$(make_root mode)
chmod 755 "$root/home/.local/bin/rdc-health-watchdog"
capture "$root" --check
[ "$RC" -eq 2 ] || fail mode-rc
assert_line 'state=blocked'
pass watchdog-mode-block

root=$(make_root symlink)
rm "$root/prefix/var/service/desktop-commander-watchdog/run"
ln -s "$root/foreign" "$root/prefix/var/service/desktop-commander-watchdog/run"
capture "$root" --check
[ "$RC" -eq 2 ] || fail symlink-rc
assert_line 'state=blocked'
pass symlink-block

root=$(make_root marker)
ln -s "$root/foreign" "$root/prefix/var/service/desktop-commander-remote/down"
capture "$root" --check
[ "$RC" -eq 2 ] || fail marker-rc
assert_line 'state=blocked'
pass marker-symlink-block

root=$(make_root sibling)
echo down > "$root/state-desktop-commander-remote-termux"
capture "$root" --check
[ "$RC" -eq 2 ] || fail sibling-rc
assert_line 'state=blocked'
[ ! -e "$root/sv-calls" ] || fail sibling-effect
pass sibling-required-running

echo "1..$PASS"
