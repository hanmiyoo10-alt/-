#!/bin/sh
set -eu
VERSION="${RDC_TERMUX_VERSION:-0.2.50}"
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
HOME="${HOME:-/data/data/com.termux/files/home}"
SERVICE_NAME="${RDC_TERMUX_SERVICE_NAME:-desktop-commander-remote-termux}"
DEVICE_NAME="${RDC_TERMUX_DEVICE_NAME:-S-Termux}"
INSTALL_DIR="${RDC_TERMUX_INSTALL_DIR:-$HOME/.local/share/$SERVICE_NAME}"
SERVICE_DIR="${RDC_TERMUX_SERVICE_DIR:-$PREFIX/var/service/$SERVICE_NAME}"
TERMUX_PROPERTIES="${RDC_TERMUX_TERMUX_PROPERTIES:-$HOME/.termux/termux.properties}"
SV="${RDC_TERMUX_SV:-$PREFIX/bin/sv}"
PACKAGE_JSON="$INSTALL_DIR/node_modules/@wonderwhy-er/desktop-commander/package.json"
ENTRY="$INSTALL_DIR/node_modules/@wonderwhy-er/desktop-commander/dist/index.js"
REQUIRE_RUNNING=0
[ "$#" -le 1 ] || exit 2
[ "$#" -eq 0 ] || { [ "$1" = "--require-running" ] || exit 2; REQUIRE_RUNNING=1; }
fail() { echo "FAILED $*" >&2; exit 1; }
[ "$SERVICE_DIR" != "$PREFIX/var/service/desktop-commander-remote" ] || fail "service overlaps existing endpoint"
[ -f "$PACKAGE_JSON" ] || fail "package missing"
[ -x "$ENTRY" ] || fail "entry missing"
grep -Fq '"version": "'"$VERSION"'"' "$PACKAGE_JSON" || fail "package version"
[ -f "$SERVICE_DIR/run" ] || fail "service run missing"
[ -f "$SERVICE_DIR/log/run" ] || fail "log run missing"
grep -Fq '# mcl-rdc-termux:v1' "$SERVICE_DIR/run" || fail "service ownership marker"
grep -Fq "DESKTOP_COMMANDER_DEVICE_NAME='$DEVICE_NAME'" "$SERVICE_DIR/run" || fail "device label"
grep -Fq 'bin/node' "$SERVICE_DIR/run" || fail "Termux node missing"
! grep -Fq 'proot-distro' "$SERVICE_DIR/run" || fail "service enters PRoot"
! grep -Fq '/root/' "$SERVICE_DIR/run" || fail "service uses Ubuntu home"
grep -Fq '# mcl-rdc-termux:v1' "$SERVICE_DIR/log/run" || fail "log ownership marker"
POLICY_KEY='allow-external-apps'
if [ -f "$TERMUX_PROPERTIES" ] && grep -Eq "^[[:space:]]*$POLICY_KEY[[:space:]]*=[[:space:]]*true([[:space:]]|$)" "$TERMUX_PROPERTIES"; then
  fail "external command policy enabled"
fi
if [ "$REQUIRE_RUNNING" -eq 1 ]; then
  status=$($SV status "$SERVICE_DIR" 2>&1) || fail "service not running"
  case "$status" in run:*) ;; *) fail "service not running" ;; esac
fi
echo "PASS rdc-termux:$SERVICE_NAME package:$VERSION"
