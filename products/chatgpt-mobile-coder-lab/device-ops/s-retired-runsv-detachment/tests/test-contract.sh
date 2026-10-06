#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OWNER=$(CDPATH= cd -- "$HERE/.." && pwd)
SOURCE="$OWNER/mcl-s-retired-runsv-detachment.sh"
TMP=$(mktemp -d /tmp/mcl-s-retired-runsv-detachment-test-XXXXXX)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

TARGETS='mcl-detached-owner-runtime desktop-commander-remote desktop-commander-watchdog llmgateway-bridge'
PRESERVED='desktop-commander-remote-termux local-usage-runtime-engine local-usage-runtime-manager pocketrisu sshd tailscaled'
ROOT="$TMP/prefix/var/service"
BIN="$TMP/prefix/bin"
mkdir -p "$ROOT" "$BIN" "$TMP/home/.local/state"

cat > "$BIN/sv" <<'EOS'
#!/bin/sh
[ "$1" = status ] || exit 2
p=$2
if [ -d "$p" ]; then
  if [ -f "$p/down" ]; then echo "down: $p: 1s"; else echo "run: $p: (pid 1) 1s"; fi
else
  echo "runsv not running"
  exit 1
fi
EOS
chmod 700 "$BIN/sv"

cat > "$BIN/ps" <<'EOS'
#!/bin/sh
root=${MCL_S_RETIRED_RUNSV_DETACH_TEST_ROOT:?}/prefix/var/service
home=${MCL_S_RETIRED_RUNSV_DETACH_TEST_ROOT:?}/home
for d in "$root"/*; do
  [ -d "$d" ] || continue
  n=$(basename "$d")
  echo "u 10 1 0 0 ? 00:00:00 runsv $n"
done
if [ -d "$root/desktop-commander-remote" ]; then
  echo "u 11 10 0 0 ? 00:00:00 svlogd -tt $home/.local/state/desktop-commander-remote"
fi
echo "u 12 10 0 0 ? 00:00:00 svlogd -tt $home/.local/state/desktop-commander-remote-termux"
if [ -f "${MCL_S_RETIRED_RUNSV_DETACH_TEST_ROOT}/force-primary-logger" ]; then
  echo "u 98 1 0 0 ? 00:00:00 svlogd -tt $home/.local/state/desktop-commander-remote"
fi
for n in mcl-detached-owner-runtime desktop-commander-remote desktop-commander-watchdog llmgateway-bridge; do
  if [ -f "${MCL_S_RETIRED_RUNSV_DETACH_TEST_ROOT}/app-$n" ]; then
    case "$n" in
      mcl-detached-owner-runtime) echo "u 20 1 0 0 ? 00:00:00 node mcl-detached-owner-runtime-host.cjs" ;;
      desktop-commander-remote) echo "u 21 1 0 0 ? 00:00:00 node /root/.local/share/desktop-commander-remote/dist/index.js" ;;
      desktop-commander-watchdog) echo "u 22 1 0 0 ? 00:00:00 sh rdc-health-watchdog" ;;
      llmgateway-bridge) echo "u 23 1 0 0 ? 00:00:00 node generic_local_json_bridge.cjs" ;;
    esac
  fi
done
if [ -f "${MCL_S_RETIRED_RUNSV_DETACH_TEST_ROOT}/force-supervisor" ]; then
  echo "u 99 1 0 0 ? 00:00:00 runsv mcl-detached-owner-runtime"
fi
EOS
chmod 700 "$BIN/ps"

setup() {
  rm -rf "$ROOT"
  mkdir -p "$ROOT"
  for s in $PRESERVED; do mkdir -p "$ROOT/$s"; printf '#!/bin/sh\nexit 0\n' > "$ROOT/$s/run"; chmod 700 "$ROOT/$s/run"; done
  for s in $TARGETS; do
    mkdir -p "$ROOT/$s"
    printf '#!/bin/sh\necho %s\n' "$s" > "$ROOT/$s/run"
    chmod 700 "$ROOT/$s/run"
    : > "$ROOT/$s/down"; chmod 600 "$ROOT/$s/down"
  done
  chmod 755 "$ROOT/mcl-detached-owner-runtime" "$ROOT/desktop-commander-remote" "$ROOT/desktop-commander-watchdog"
  chmod 700 "$ROOT/llmgateway-bridge"
  rm -f "$TMP"/app-* "$TMP/force-supervisor" "$TMP/force-primary-logger"
}
hashes() {
  export MCL_TEST_SHA_DETACHED=$(sha256sum "$ROOT/mcl-detached-owner-runtime/run" | awk '{print $1}')
  export MCL_TEST_SHA_PRIMARY=$(sha256sum "$ROOT/desktop-commander-remote/run" | awk '{print $1}')
  export MCL_TEST_SHA_WATCHDOG=$(sha256sum "$ROOT/desktop-commander-watchdog/run" | awk '{print $1}')
  export MCL_TEST_SHA_LEGACY=$(sha256sum "$ROOT/llmgateway-bridge/run" | awk '{print $1}')
}
run_owner() {
  MCL_S_RETIRED_RUNSV_DETACH_TEST_MODE=1 \
  MCL_S_RETIRED_RUNSV_DETACH_TEST_ROOT="$TMP" \
  MCL_S_RETIRED_RUNSV_DETACH_TEST_ATTEMPTS=2 \
  MCL_S_RETIRED_RUNSV_DETACH_TEST_SLEEP=0 \
  sh "$SOURCE" "$1"
}
pass=0

setup; hashes
out=$(run_owner --check)
printf '%s\n' "$out" | grep -q 'state=attached_retired'
printf '%s\n' "$out" | grep -q 'result=pass'
pass=$((pass+1))

before_primary=$(sha256sum "$ROOT/desktop-commander-remote/run" | awk '{print $1}')
out=$(run_owner --detach)
printf '%s\n' "$out" | grep -q 'state=detached_retired'
[ "$(stat -c %a "$ROOT/.mcl-retired-services")" = 700 ]
for s in $TARGETS; do
  [ ! -e "$ROOT/$s" ]
  [ -d "$ROOT/.mcl-retired-services/$s" ]
  [ "$(stat -c %a "$ROOT/.mcl-retired-services/$s/down")" = 600 ]
done
[ "$(sha256sum "$ROOT/.mcl-retired-services/desktop-commander-remote/run" | awk '{print $1}')" = "$before_primary" ]
for s in $PRESERVED; do [ -d "$ROOT/$s" ]; done
pass=$((pass+1))

out=$(run_owner --detach)
printf '%s\n' "$out" | grep -q 'reason=already-detached'
pass=$((pass+1))

out=$(run_owner --reattach)
printf '%s\n' "$out" | grep -q 'state=attached_retired'
[ ! -e "$ROOT/.mcl-retired-services" ]
for s in $TARGETS; do [ -d "$ROOT/$s" ] && [ -f "$ROOT/$s/down" ]; done
pass=$((pass+1))

setup; hashes
chmod 755 "$ROOT/llmgateway-bridge/run"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup; hashes
rm "$ROOT/desktop-commander-watchdog/down"
ln -s run "$ROOT/desktop-commander-watchdog/down"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup; hashes
printf 'drift\n' >> "$ROOT/mcl-detached-owner-runtime/run"
if run_owner --check >/dev/null 2>&1; then exit 1; fi
pass=$((pass+1))

setup; hashes
: > "$ROOT/desktop-commander-remote-termux/down"
if run_owner --detach >/dev/null 2>&1; then exit 1; fi
[ -d "$ROOT/mcl-detached-owner-runtime" ]
pass=$((pass+1))

setup; hashes
: > "$TMP/app-llmgateway-bridge"
if run_owner --detach >/dev/null 2>&1; then exit 1; fi
[ -d "$ROOT/llmgateway-bridge" ]
pass=$((pass+1))

setup; hashes
: > "$TMP/force-primary-logger"
out=$(run_owner --detach 2>/dev/null || true)
printf '%s\n' "$out" | grep -q 'reason=detach-rolled-back'
for s in $TARGETS; do [ -d "$ROOT/$s" ]; done
[ ! -e "$ROOT/.mcl-retired-services" ]
pass=$((pass+1))

setup; hashes
: > "$TMP/force-supervisor"
out=$(run_owner --detach 2>/dev/null || true)
printf '%s\n' "$out" | grep -q 'reason=detach-rolled-back'
for s in $TARGETS; do [ -d "$ROOT/$s" ]; done
[ ! -e "$ROOT/.mcl-retired-services" ]
pass=$((pass+1))

grep -q '.mcl-retired-services' "$SOURCE"
! grep -Eq 'sv[[:space:]]+up|runsvdir|service-daemon|settings[[:space:]]+put|device_config[[:space:]]+put|force-stop|reboot|killall|pkill' "$SOURCE"
! grep -Eq '(^|[^A-Za-z])cp[[:space:]]' "$SOURCE"
pass=$((pass+1))

printf 'PASS %s tests\n' "$pass"
