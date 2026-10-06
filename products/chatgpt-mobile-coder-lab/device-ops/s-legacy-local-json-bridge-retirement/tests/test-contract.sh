#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CTL="$HERE/mcl-s-legacy-local-json-bridge-retirement.sh"
PASS=0
trap 'rm -rf /tmp/mcl-s-legacy-local-json-bridge-retirement-test-*-$$' EXIT HUP INT TERM

fail() { echo "FAIL $1" >&2; exit 1; }
pass() { PASS=$((PASS + 1)); echo "PASS $1"; }

write_fake_sv() {
  root=$1
  cat > "$root/prefix/bin/sv" <<'EOF'
#!/bin/sh
set -eu
root=${MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_ROOT:?}
op=$1
service=$2
state="$root/state"
pending="$root/pending"
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
    printf '%s\n' "$op" >> "$calls"
    desired=down
    [ "$op" = up ] && desired=run
    delay=0
    [ ! -f "$root/delay-$op" ] || delay=$(cat "$root/delay-$op")
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
  root="/tmp/mcl-s-legacy-local-json-bridge-retirement-test-$name-$$"
  rm -rf "$root"
  mkdir -p "$root/prefix/bin" "$root/prefix/var/service/llmgateway-bridge" "$root/home/PocketRisu"
  cat > "$root/prefix/var/service/llmgateway-bridge/run" <<'EOF'
#!/fixture/sh
exec fixture-node fixture-source
EOF
  chmod 700 "$root/prefix/var/service/llmgateway-bridge/run"
  printf '%s\n' "'use strict'; fixture bridge source" > "$root/home/PocketRisu/generic_local_json_bridge.cjs"
  chmod 644 "$root/home/PocketRisu/generic_local_json_bridge.cjs"
  sha256sum "$root/prefix/var/service/llmgateway-bridge/run" | awk '{print $1}' > "$root/expected-run-sha"
  sha256sum "$root/home/PocketRisu/generic_local_json_bridge.cjs" | awk '{print $1}' > "$root/expected-source-sha"
  echo run > "$root/state"
  write_fake_sv "$root"
  printf '%s\n' "$root"
}

capture() {
  root=$1
  mode=$2
  attempts=${3:-6}
  set +e
  OUT=$(MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_MODE=1     MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_ROOT="$root"     MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_RUN_SHA="$(cat "$root/expected-run-sha")"     MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_SOURCE_SHA="$(cat "$root/expected-source-sha")"     MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_ATTEMPTS="$attempts"     MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_SLEEP=0     sh "$CTL" "$mode" 2>&1)
  RC=$?
  set -e
}
assert_line() {
  printf '%s\n' "$OUT" | grep -Fqx "$1" || fail "missing-$1"
}
count_call() {
  root=$1
  op=$2
  [ -f "$root/sv-calls" ] || { echo 0; return; }
  grep -Fxc "$op" "$root/sv-calls" || true
}

sh -n "$CTL" || fail syntax
grep -Fqx '# mcl-s-legacy-local-json-bridge-retirement:v1' "$CTL" || fail marker
grep -Fq 'RUN_SHA=2cfebd9bce0d5d1ae0cf17bafb17070815ae9328bd89ad1bd32613c87b79acaf' "$CTL" || fail production-run-sha
grep -Fq 'SOURCE_SHA=611dcf344df0a2b88c3138850b085e42ff6c7a109e69783a69607152744cdcdb' "$CTL" || fail production-source-sha
grep -Fq 'OBSERVE_ATTEMPTS=60' "$CTL" || fail production-budget
for forbidden in local-usage-runtime-manager local-usage-runtime-engine desktop-commander-remote-termux tailscaled sshd pocketrisu-ssh-tunnel; do
  ! grep -Fq "$forbidden" "$CTL" || fail "forbidden-target-$forbidden"
done
! grep -Eq 'local_usage_snapshot|bridge_token|TOKEN_FILE|/log' "$CTL" || fail private-content-reference
pass static-contract

root=$(make_root active)
capture "$root" --check
[ "$RC" -eq 0 ] || fail active-check-rc
assert_line 'state=active'
assert_line 'result=pass'
[ ! -e "$root/sv-calls" ] || fail active-check-effect
pass active-check-read-only

root=$(make_root delayed)
echo 3 > "$root/delay-down"
capture "$root" --deactivate 8
[ "$RC" -eq 0 ] || fail delayed-down-rc
assert_line 'state=retired'
assert_line 'result=pass'
[ "$(count_call "$root" down)" -eq 1 ] || fail down-repeat
[ "$(stat -c %a "$root/prefix/var/service/llmgateway-bridge/down")" = 600 ] || fail down-marker-mode
pass delayed-deactivate-single-effect

capture "$root" --deactivate 8
[ "$RC" -eq 0 ] || fail retired-idempotent-rc
[ "$(count_call "$root" down)" -eq 1 ] || fail retired-idempotent-effect
pass retired-idempotent

echo 2 > "$root/delay-up"
capture "$root" --activate 8
[ "$RC" -eq 0 ] || fail delayed-up-rc
assert_line 'state=active'
[ "$(count_call "$root" up)" -eq 1 ] || fail up-repeat
[ ! -e "$root/prefix/var/service/llmgateway-bridge/down" ] || fail marker-left
pass delayed-activate-single-effect

capture "$root" --activate 8
[ "$RC" -eq 0 ] || fail active-idempotent-rc
[ "$(count_call "$root" up)" -eq 1 ] || fail active-idempotent-effect
pass active-idempotent

root=$(make_root timeout)
echo 99 > "$root/delay-down"
capture "$root" --deactivate 3
[ "$RC" -eq 2 ] || fail timeout-rc
assert_line 'result=unknown'
assert_line 'reason=down-timeout'
[ "$(count_call "$root" down)" -eq 1 ] || fail timeout-repeat
pass timeout-does-not-repeat-effect

root=$(make_root partial)
echo down > "$root/state"
capture "$root" --deactivate
[ "$RC" -eq 2 ] || fail partial-rc
assert_line 'state=partial'
[ ! -e "$root/sv-calls" ] || fail partial-effect
pass partial-state-block

root=$(make_root run-drift)
printf '%s\n' '# drift' >> "$root/prefix/var/service/llmgateway-bridge/run"
capture "$root" --check
[ "$RC" -eq 2 ] || fail run-drift-rc
assert_line 'state=blocked'
pass run-drift-block

root=$(make_root source-drift)
printf '%s\n' '// drift' >> "$root/home/PocketRisu/generic_local_json_bridge.cjs"
capture "$root" --check
[ "$RC" -eq 2 ] || fail source-drift-rc
assert_line 'state=blocked'
pass source-drift-block

root=$(make_root source-symlink)
rm "$root/home/PocketRisu/generic_local_json_bridge.cjs"
ln -s "$root/foreign" "$root/home/PocketRisu/generic_local_json_bridge.cjs"
capture "$root" --check
[ "$RC" -eq 2 ] || fail source-symlink-rc
assert_line 'state=blocked'
pass source-symlink-block

root=$(make_root marker-symlink)
ln -s "$root/foreign" "$root/prefix/var/service/llmgateway-bridge/down"
capture "$root" --check
[ "$RC" -eq 2 ] || fail marker-symlink-rc
assert_line 'state=blocked'
pass marker-symlink-block

root=$(make_root service-symlink)
mv "$root/prefix/var/service/llmgateway-bridge" "$root/service-real"
ln -s "$root/service-real" "$root/prefix/var/service/llmgateway-bridge"
capture "$root" --check
[ "$RC" -eq 2 ] || fail service-symlink-rc
assert_line 'state=blocked'
pass service-dir-symlink-block

echo "1..$PASS"
