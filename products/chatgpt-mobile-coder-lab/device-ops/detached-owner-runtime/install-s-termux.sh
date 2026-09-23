#!/data/data/com.termux/files/usr/bin/sh
set -eu

SELF_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PREFIX=/data/data/com.termux/files/usr
HOME_DIR=/data/data/com.termux/files/home
UBUNTU_ROOT=
if [ "${MCL_DETACHED_RUNTIME_TEST_MODE:-0}" = "1" ]; then
  TEST_ROOT="${MCL_DETACHED_RUNTIME_TEST_ROOT:?test root required}"
  PREFIX="$TEST_ROOT/prefix"
  HOME_DIR="$TEST_ROOT/home"
  UBUNTU_ROOT="$TEST_ROOT/ubuntu"
fi

SERVICE_NAME=mcl-detached-owner-runtime
SOURCE_CLIENT="$SELF_DIR/mcl-detached-owner-runtime.cjs"
SOURCE_SERVICE="$SELF_DIR/mcl-detached-owner-runtime-service.cjs"
if [ -n "$UBUNTU_ROOT" ]; then
  LIB_DIR="$UBUNTU_ROOT/root/.local/lib/mcl-detached-owner-runtime"
  BIN_DIR="$UBUNTU_ROOT/root/.local/bin"
else
  LIB_DIR=/root/.local/lib/mcl-detached-owner-runtime
  BIN_DIR=/root/.local/bin
fi
TARGET_CLIENT_JS="$LIB_DIR/mcl-detached-owner-runtime.cjs"
TARGET_SERVICE_JS="$LIB_DIR/mcl-detached-owner-runtime-service.cjs"
TARGET_CLIENT="$BIN_DIR/mcl-detached-owner-runtime"
SERVICE_DIR="$PREFIX/var/service/$SERVICE_NAME"
SERVICE_RUN="$SERVICE_DIR/run"
SOCKET_PATH=/root/.local/run/mcl-detached-owner-runtime/control.sock
SV="$PREFIX/bin/sv"

usage() {
  echo "usage: install-s-termux.sh --check|--apply|--activate" >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
MODE="${1#--}"
case "$MODE" in check|apply|activate) ;; *) usage ;; esac

expected_client() {
  cat <<'EOF'
#!/bin/sh
# mcl-detached-owner-runtime:v1
set -eu
exec /data/data/com.termux/files/usr/bin/node /root/.local/lib/mcl-detached-owner-runtime/mcl-detached-owner-runtime.cjs "$@"
EOF
}
expected_service() {
  cat <<'EOF'
#!/data/data/com.termux/files/usr/bin/sh
# mcl-detached-owner-runtime:v1
set -eu
PREFIX=/data/data/com.termux/files/usr
export PREFIX HOME=/data/data/com.termux/files/home PATH="$PREFIX/bin:$PATH"
exec 2>&1
exec "$PREFIX/bin/setsid" "$PREFIX/bin/proot-distro" login ubuntu -- /bin/bash -lc '
  set -eu
  export HOME=/root
  cd /root
  exec /data/data/com.termux/files/usr/bin/node /root/.local/lib/mcl-detached-owner-runtime/mcl-detached-owner-runtime-service.cjs
'
EOF
}
file_exact() {
  src=$1
  dst=$2
  [ -f "$dst" ] && [ ! -L "$dst" ] && cmp -s "$src" "$dst"
}
text_exact() {
  dst=$1
  expected=$2
  [ -f "$dst" ] && [ ! -L "$dst" ] && [ "$(cat "$dst")" = "$expected" ]
}
show_state() {
  result=pass
  if file_exact "$SOURCE_CLIENT" "$TARGET_CLIENT_JS"; then client_js=present; else client_js=missing; result=missing; fi
  if file_exact "$SOURCE_SERVICE" "$TARGET_SERVICE_JS"; then service_js=present; else service_js=missing; result=missing; fi
  if text_exact "$TARGET_CLIENT" "$(expected_client)" && [ -x "$TARGET_CLIENT" ]; then client=present; else client=missing; result=missing; fi
  if text_exact "$SERVICE_RUN" "$(expected_service)" && [ -x "$SERVICE_RUN" ]; then service=present; else service=missing; result=missing; fi
  if [ -e "$SERVICE_DIR/down" ]; then activation=disabled; else activation=unknown; fi
  printf '%s\n' \
    'schema=mcl-detached-owner-runtime-install.v1' \
    "client_js=$client_js" \
    "service_js=$service_js" \
    "client=$client" \
    "service=$service" \
    "activation=$activation" \
    "socket=$SOCKET_PATH" \
    "result=$result" \
    'runtime_started=false' \
    'details=withheld'
  [ "$result" = pass ]
}
[ "$MODE" != check ] || { show_state; exit $?; }

if [ -e "$SERVICE_RUN" ]; then
  grep -Fq '# mcl-detached-owner-runtime:v1' "$SERVICE_RUN" || { echo "BLOCKED unmanaged service target" >&2; exit 1; }
fi
if [ -e "$TARGET_CLIENT" ]; then
  grep -Fq '# mcl-detached-owner-runtime:v1' "$TARGET_CLIENT" || { echo "BLOCKED unmanaged client target" >&2; exit 1; }
fi

mkdir -p "$LIB_DIR" "$BIN_DIR" "$SERVICE_DIR"
cp "$SOURCE_CLIENT" "$TARGET_CLIENT_JS"
cp "$SOURCE_SERVICE" "$TARGET_SERVICE_JS"
chmod 600 "$TARGET_CLIENT_JS" "$TARGET_SERVICE_JS"
expected_client > "$TARGET_CLIENT.new"
chmod 700 "$TARGET_CLIENT.new"
mv "$TARGET_CLIENT.new" "$TARGET_CLIENT"
expected_service > "$SERVICE_RUN.new"
chmod 700 "$SERVICE_RUN.new"
mv "$SERVICE_RUN.new" "$SERVICE_RUN"

if [ "$MODE" = apply ]; then
  : > "$SERVICE_DIR/down"
  chmod 600 "$SERVICE_DIR/down"
  show_state || true
  exit 0
fi

if [ "${MCL_DETACHED_RUNTIME_TEST_MODE:-0}" = "1" ]; then
  echo "BLOCKED test mode cannot activate service" >&2
  exit 2
fi
rm -f "$SERVICE_DIR/down"
"$SV" up "$SERVICE_DIR"
printf '%s\n' 'schema=mcl-detached-owner-runtime-install.v1' 'operation=activate' 'result=pass' 'runtime_started=true' 'details=withheld'
