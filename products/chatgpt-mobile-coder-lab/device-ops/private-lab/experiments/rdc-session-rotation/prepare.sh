#!/bin/sh
set -eu
LAB_NAME=mcl-private-lab
PREFIX=/data/data/com.termux/files/usr
PD="$PREFIX/bin/proot-distro"
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PROBE_SOURCE="$SCRIPT_DIR/probe.mjs"
PACKAGE='@wonderwhy-er/desktop-commander'
VERSION='0.2.50'

if [ "${MCL_ROTATION_PREPARE_TEST_MODE:-0}" = 1 ]; then
  TEST_ROOT=${MCL_ROTATION_PREPARE_TEST_ROOT:-}
  [ -n "$TEST_ROOT" ] || { echo 'BLOCKED test fixture missing' >&2; exit 2; }
  PD="$TEST_ROOT/proot-distro"
fi
usage() { echo 'BLOCKED unsupported command' >&2; exit 2; }
[ "$#" -eq 1 ] || usage
MODE=${1#--}
case "$MODE" in check|apply) ;; *) usage ;; esac
[ -x "$PD" ] || { echo 'BLOCKED proot-distro unavailable' >&2; exit 1; }
[ -f "$PROBE_SOURCE" ] || { echo 'BLOCKED fixed probe missing' >&2; exit 1; }

check_state() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:check:v1
set -eu
target=/opt/mcl-private-lab/vendor/rdc-session-rotation
marker=$target/.mcl-rdc-rotation-repro-v1
pkg=$target/node_modules/@wonderwhy-er/desktop-commander/package.json
probe=$target/probe.mjs
if [ ! -e "$target" ]; then echo "MISSING vendor:0.2.50"; exit 0; fi
[ -d "$target" ] || { echo "BLOCKED vendor:unmanaged"; exit 1; }
[ -f "$marker" ] && grep -Fxq "mcl-rdc-rotation-repro:v1" "$marker" || { echo "BLOCKED vendor:unmanaged"; exit 1; }
[ -f "$pkg" ] && grep -Fq '"version": "0.2.50"' "$pkg" || { echo "BLOCKED vendor:version"; exit 1; }
[ -f "$probe" ] || { echo "BLOCKED vendor:probe"; exit 1; }
echo "PRESENT vendor:0.2.50"
' 2>/dev/null
}

if [ "$MODE" = check ]; then check_state; exit $?; fi
if state=$(check_state); then :; else echo 'BLOCKED vendor target' >&2; exit 1; fi
[ "$state" = 'MISSING vendor:0.2.50' ] || { printf '%s\n' "$state"; exit 0; }

"$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:stage-probe:v1
set -eu
stage=/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage
mkdir -p "$stage"
umask 077
cat > "$stage/probe.mjs.tmp"
mv -f "$stage/probe.mjs.tmp" "$stage/probe.mjs"
' < "$PROBE_SOURCE" >/dev/null 2>&1

"$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc '
# mcl-rdc-rotation-repro:install:v1
set -eu
base=/opt/mcl-private-lab/vendor
target=$base/rdc-session-rotation
stage=$base/.rdc-session-rotation-stage
[ ! -e "$target" ] || exit 20
[ -f "$stage/probe.mjs" ] || exit 21
tmp=$(mktemp -d "$base/.rdc-session-rotation.XXXXXX")
trap "rm -rf \"$tmp\"" EXIT HUP INT TERM
env -i HOME=/root PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
  /usr/bin/npm install --prefix "$tmp" --omit=dev --ignore-scripts --no-save \
  "@wonderwhy-er/desktop-commander@0.2.50" >/dev/null 2>&1
pkg=$tmp/node_modules/@wonderwhy-er/desktop-commander/package.json
[ -f "$pkg" ] && grep -Fq '"version": "0.2.50"' "$pkg" || exit 22
cp "$stage/probe.mjs" "$tmp/probe.mjs"
chmod 0644 "$tmp/probe.mjs"
printf "%s\n" "mcl-rdc-rotation-repro:v1" > "$tmp/.mcl-rdc-rotation-repro-v1"
[ ! -e "$target" ] || exit 23
mv -T "$tmp" "$target"
trap - EXIT HUP INT TERM
rm -rf "$stage"
' >/dev/null 2>&1
state=$(check_state) || { echo 'BLOCKED post-install verification' >&2; exit 1; }
[ "$state" = 'PRESENT vendor:0.2.50' ] || { echo 'BLOCKED post-install verification' >&2; exit 1; }
echo 'INSTALLED vendor:0.2.50'
