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
SHIM="$INSTALL_DIR/device-name-shim.cjs"
TOOL_SHIM_DIR="$INSTALL_DIR/tool-shims"
WHICH_SHIM="$TOOL_SHIM_DIR/which"
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
[ -f "$SHIM" ] || fail "device-name shim missing"
[ -x "$WHICH_SHIM" ] || fail "ripgrep discovery shim missing"
grep -Fq "# mcl-rdc-termux-which-rg:v1" "$WHICH_SHIM" || fail "ripgrep discovery shim ownership marker"
resolved=$(PATH="$TOOL_SHIM_DIR:$PREFIX/bin" "$WHICH_SHIM" rg 2>/dev/null) || fail "ripgrep discovery shim resolution"
[ "$resolved" = "$PREFIX/bin/rg" ] || fail "ripgrep discovery shim path"
grep -Fq '// mcl-rdc-termux-device-name:v1' "$SHIM" || fail "device-name shim ownership marker"
grep -Fq '# mcl-rdc-termux:v1' "$SERVICE_DIR/run" || fail "service ownership marker"
grep -Fq "DESKTOP_COMMANDER_DEVICE_NAME='$DEVICE_NAME'" "$SERVICE_DIR/run" || fail "device label"
grep -Fq "SHIM='$SHIM'" "$SERVICE_DIR/run" || fail "device-name shim path"
grep -Fq -- '--require "$SHIM"' "$SERVICE_DIR/run" || fail "device-name shim preload"
grep -Fq 'bin/node' "$SERVICE_DIR/run" || fail "Termux node missing"
! grep -Fq 'proot-distro' "$SERVICE_DIR/run" || fail "service enters PRoot"
! grep -Fq '/root/' "$SERVICE_DIR/run" || fail "service uses Ubuntu home"
grep -Fq '# mcl-rdc-termux:v1' "$SERVICE_DIR/log/run" || fail "log ownership marker"
grep -Fq "TOOL_SHIM_DIR='$TOOL_SHIM_DIR'" "$SERVICE_DIR/run" || fail "ripgrep discovery shim path wiring"
grep -Fq "export PREFIX HOME PATH=\"\$TOOL_SHIM_DIR:\$PREFIX/bin:\$PATH\"" "$SERVICE_DIR/run" || fail "ripgrep discovery PATH wiring"
! grep -Fq "/system/bin" "$SERVICE_DIR/run" || fail "service widens PATH to Android system bin"
POLICY_KEY='allow-external-apps'
if [ -f "$TERMUX_PROPERTIES" ] && grep -Eq "^[[:space:]]*$POLICY_KEY[[:space:]]*=[[:space:]]*true([[:space:]]|$)" "$TERMUX_PROPERTIES"; then
  fail "external command policy enabled"
fi
if [ "$REQUIRE_RUNNING" -eq 1 ]; then
  status=$($SV status "$SERVICE_DIR" 2>&1) || fail "service not running"
  case "$status" in run:*) ;; *) fail "service not running" ;; esac
fi
echo "PASS rdc-termux:$SERVICE_NAME package:$VERSION"
