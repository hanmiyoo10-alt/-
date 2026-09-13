#!/bin/sh
set -eu

MODE=check
VERSION="${RDC_TERMUX_VERSION:-0.2.50}"
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
HOME="${HOME:-/data/data/com.termux/files/home}"
SERVICE_NAME="${RDC_TERMUX_SERVICE_NAME:-desktop-commander-remote-termux}"
DEVICE_NAME="${RDC_TERMUX_DEVICE_NAME:-S-Termux}"
INSTALL_DIR="${RDC_TERMUX_INSTALL_DIR:-$HOME/.local/share/$SERVICE_NAME}"
SERVICE_DIR="${RDC_TERMUX_SERVICE_DIR:-$PREFIX/var/service/$SERVICE_NAME}"
LOG_DIR="${RDC_TERMUX_LOG_DIR:-$HOME/.local/state/$SERVICE_NAME}"
NPM="${RDC_TERMUX_NPM:-$PREFIX/bin/npm}"
SV="${RDC_TERMUX_SV:-$PREFIX/bin/sv}"
ORIGINAL_SERVICE_DIR="$PREFIX/var/service/desktop-commander-remote"
PACKAGE_JSON="$INSTALL_DIR/node_modules/@wonderwhy-er/desktop-commander/package.json"
ENTRY="$INSTALL_DIR/node_modules/@wonderwhy-er/desktop-commander/dist/index.js"

usage() {
  echo "usage: $0 [--check|--apply|--activate]" >&2
  exit 2
}

[ "$#" -le 1 ] || usage
[ "$#" -eq 0 ] || MODE="${1#--}"
case "$MODE" in check|apply|activate) ;; *) usage ;; esac
[ "$SERVICE_DIR" != "$ORIGINAL_SERVICE_DIR" ] || {
  echo "BLOCKED service target overlaps existing S endpoint" >&2
  exit 1
}

package_ok() {
  [ -f "$PACKAGE_JSON" ] && [ -x "$ENTRY" ] || return 1
  grep -Fq '"version": "'"$VERSION"'"' "$PACKAGE_JSON"
}
managed_file_ok() {
  file=$1
  [ -f "$file" ] && grep -Fq '# mcl-rdc-termux:v1' "$file"
}

show_state() {
  if package_ok; then echo "PRESENT package:$VERSION"; else echo "MISSING package:$VERSION"; fi
  if managed_file_ok "$SERVICE_DIR/run"; then echo "PRESENT service:$SERVICE_NAME"; elif [ -e "$SERVICE_DIR/run" ]; then echo "BLOCKED unmanaged-service:$SERVICE_NAME"; else echo "MISSING service:$SERVICE_NAME"; fi
  if managed_file_ok "$SERVICE_DIR/log/run"; then echo "PRESENT log:$SERVICE_NAME"; elif [ -e "$SERVICE_DIR/log/run" ]; then echo "BLOCKED unmanaged-log:$SERVICE_NAME"; else echo "MISSING log:$SERVICE_NAME"; fi
}

[ "$MODE" != check ] || { show_state; exit 0; }
if [ -d "$SERVICE_DIR" ] && [ ! -e "$SERVICE_DIR/run" ]; then
  echo "BLOCKED existing target service directory is unmanaged" >&2
  exit 1
fi
if [ -e "$SERVICE_DIR/run" ] && ! managed_file_ok "$SERVICE_DIR/run"; then
  echo "BLOCKED existing target service is not repo-managed" >&2
  exit 1
fi
if [ -e "$SERVICE_DIR/log/run" ] && ! managed_file_ok "$SERVICE_DIR/log/run"; then
  echo "BLOCKED existing target log is not repo-managed" >&2
  exit 1
fi

if package_ok; then
  echo "PRESENT package:$VERSION"
else
  mkdir -p "$INSTALL_DIR"
  "$NPM" install --prefix "$INSTALL_DIR" --omit=dev --ignore-scripts --no-save "@wonderwhy-er/desktop-commander@$VERSION"
  package_ok || { echo "FAILED package install" >&2; exit 1; }
  echo "INSTALLED package:$VERSION"
fi
write_service_run() {
  out=$1
  cat > "$out" <<RUNEOF
#!/bin/sh
# mcl-rdc-termux:v1
set -eu
PREFIX='$PREFIX'
HOME='$HOME'
INSTALL='$INSTALL_DIR'
ENTRY='$ENTRY'
export PREFIX HOME PATH="\$PREFIX/bin:\$PATH"
export DESKTOP_COMMANDER_DEVICE_NAME='$DEVICE_NAME'
"\$PREFIX/bin/termux-wake-lock" >/dev/null 2>&1 || true
child_pid=""
stop_child() {
  [ -n "\$child_pid" ] || return 0
  "\$PREFIX/bin/kill" -TERM -- "-\$child_pid" 2>/dev/null || true
  i=0
  while "\$PREFIX/bin/kill" -0 "\$child_pid" 2>/dev/null && [ "\$i" -lt 20 ]; do
    "\$PREFIX/bin/sleep" 0.25
    i=\$((i + 1))
  done
  "\$PREFIX/bin/kill" -KILL -- "-\$child_pid" 2>/dev/null || true
}
trap 'stop_child; exit 0' TERM INT HUP
cd "\$HOME"
"\$PREFIX/bin/setsid" "\$PREFIX/bin/node" "\$ENTRY" remote 2>&1 &
child_pid=\$!
wait "\$child_pid"
rc=\$?
trap - TERM INT HUP
exit "\$rc"
RUNEOF
}

write_log_run() {
  out=$1
  cat > "$out" <<LOGEOF
#!/bin/sh
# mcl-rdc-termux:v1
set -eu
PREFIX='$PREFIX'
HOME='$HOME'
LOGDIR='$LOG_DIR'
mkdir -p "\$LOGDIR"
exec "\$PREFIX/bin/svlogd" -tt "\$LOGDIR"
LOGEOF
}
STAGE_BASE="${TMPDIR:-$HOME/.cache}"
STAGE="$STAGE_BASE/mcl-rdc-termux.$$"
mkdir -p "$STAGE/log"
write_service_run "$STAGE/run"
write_log_run "$STAGE/log/run"
chmod 755 "$STAGE/run" "$STAGE/log/run"
: > "$STAGE/down"

service_changed=0
if [ ! -d "$SERVICE_DIR" ]; then
  mkdir -p "$(dirname "$SERVICE_DIR")"
  mv "$STAGE" "$SERVICE_DIR"
  service_changed=1
else
  if ! cmp -s "$STAGE/run" "$SERVICE_DIR/run" 2>/dev/null; then cp "$STAGE/run" "$SERVICE_DIR/run"; chmod 755 "$SERVICE_DIR/run"; service_changed=1; fi
  mkdir -p "$SERVICE_DIR/log"
  if ! cmp -s "$STAGE/log/run" "$SERVICE_DIR/log/run" 2>/dev/null; then cp "$STAGE/log/run" "$SERVICE_DIR/log/run"; chmod 755 "$SERVICE_DIR/log/run"; service_changed=1; fi
  rm -rf "$STAGE"
fi
[ "$service_changed" -eq 0 ] && echo "PRESENT service:$SERVICE_NAME" || echo "INSTALLED service:$SERVICE_NAME"
if [ "$MODE" = activate ]; then
  rm -f "$SERVICE_DIR/down"
  "$SV" up "$SERVICE_DIR"
  echo "ACTIVATED service:$SERVICE_NAME"
else
  [ -e "$SERVICE_DIR/down" ] && echo "PRESENT service-disabled:$SERVICE_NAME" || true
fi
