#!/data/data/com.termux/files/usr/bin/sh
set -eu
umask 077

SELF_DIR=$(CDPATH= cd -P -- "$(dirname -- "$0")" && pwd -P)
SOURCE_REPO_ROOT=$(CDPATH= cd -P -- "$SELF_DIR/../../../.." && pwd -P)
EXPECTED_SOURCE_DIR="$SOURCE_REPO_ROOT/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime"
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
RUNTIME_REL=products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime.cjs
SERVICE_REL=products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime-service.cjs
SUPPORT_FILES='
.github/plugin-control-plane/canonical-main/infra/github-client.cjs
.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs
.github/plugin-control-plane/canonical-main/work-harness/contract.cjs
.github/plugin-control-plane/canonical-main/work-harness/dispatch.cjs
.github/plugin-control-plane/canonical-main/work-harness/execution-continuity/execution-continuity.cjs
.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs
.github/plugin-control-plane/canonical-main/work-harness/handoff.cjs
.github/plugin-control-plane/canonical-main/work-harness/preflight.cjs
.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs
.github/plugin-control-plane/canonical-main/work-system/policy.json
.github/plugin-control-plane/canonical-main/work-system/pr-activity.cjs
.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs
products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs
products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs
products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation.cjs
products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs
products/chatgpt-mobile-coder-lab/coordination/stage-entry/workspace-prepare.cjs
products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs
products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs
products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs
'
BUNDLE_FILES="$SUPPORT_FILES
$RUNTIME_REL
$SERVICE_REL"

if [ -n "$UBUNTU_ROOT" ]; then
  LIB_DIR="$UBUNTU_ROOT/root/.local/lib/mcl-detached-owner-runtime"
  BIN_DIR="$UBUNTU_ROOT/root/.local/bin"
else
  LIB_DIR=/root/.local/lib/mcl-detached-owner-runtime
  BIN_DIR=/root/.local/bin
fi
SUPPORT_ROOT="$LIB_DIR/repository"
TARGET_CLIENT_JS="$SUPPORT_ROOT/$RUNTIME_REL"
TARGET_SERVICE_JS="$SUPPORT_ROOT/$SERVICE_REL"
TARGET_CLIENT="$BIN_DIR/mcl-detached-owner-runtime"
SERVICE_DIR="$PREFIX/var/service/$SERVICE_NAME"
SERVICE_RUN="$SERVICE_DIR/run"
SOCKET_PATH=/root/.local/run/mcl-detached-owner-runtime/control.sock
SV="$PREFIX/bin/sv"

usage() {
  echo "usage: install-s-termux.sh --check|--apply|--activate" >&2
  exit 2
}
block() {
  echo "BLOCKED $1" >&2
  exit 1
}
[ "$#" -eq 1 ] || usage
MODE="${1#--}"
case "$MODE" in check|apply|activate) ;; *) usage ;; esac

validate_source_layout() {
  [ "$SELF_DIR" = "$EXPECTED_SOURCE_DIR" ] || block "source repository layout invalid"
  for rel in $BUNDLE_FILES; do
    src="$SOURCE_REPO_ROOT/$rel"
    [ -f "$src" ] && [ ! -L "$src" ] || block "source bundle entry invalid"
  done
}

expected_client() {
  cat <<'EOF'
#!/bin/sh
# mcl-detached-owner-runtime:v1
set -eu
exec /data/data/com.termux/files/usr/bin/node /root/.local/lib/mcl-detached-owner-runtime/repository/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime.cjs "$@"
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
  exec /data/data/com.termux/files/usr/bin/node /root/.local/lib/mcl-detached-owner-runtime/repository/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime-service.cjs
'
EOF
}

file_exact() {
  src=$1
  dst=$2
  [ -f "$dst" ] && [ ! -L "$dst" ] && cmp -s "$src" "$dst"
}
file_restrictive() {
  dst=$1
  [ "$(stat -c '%a' "$dst" 2>/dev/null || echo invalid)" = 600 ]
}
text_exact() {
  dst=$1
  expected=$2
  [ -f "$dst" ] && [ ! -L "$dst" ] && [ "$(cat "$dst")" = "$expected" ]
}
bundle_exact() {
  [ -d "$SUPPORT_ROOT" ] && [ ! -L "$SUPPORT_ROOT" ] || return 1
  [ -z "$(find "$SUPPORT_ROOT" -type l -print -quit 2>/dev/null)" ] || return 1
  for rel in $BUNDLE_FILES; do
    src="$SOURCE_REPO_ROOT/$rel"
    dst="$SUPPORT_ROOT/$rel"
    file_exact "$src" "$dst" && file_restrictive "$dst" || return 1
  done
}
show_state() {
  result=pass
  if bundle_exact; then bundle=present; else bundle=missing; result=missing; fi
  if text_exact "$TARGET_CLIENT" "$(expected_client)" && [ -x "$TARGET_CLIENT" ]; then client=present; else client=missing; result=missing; fi
  if text_exact "$SERVICE_RUN" "$(expected_service)" && [ -x "$SERVICE_RUN" ]; then service=present; else service=missing; result=missing; fi
  if [ -e "$SERVICE_DIR/down" ]; then activation=disabled; else activation=unknown; fi
  printf '%s
'     'schema=mcl-detached-owner-runtime-install.v2'     "support_bundle=$bundle"     "client=$client"     "service=$service"     "activation=$activation"     "socket=$SOCKET_PATH"     "result=$result"     'runtime_started=false'     'details=withheld'
  [ "$result" = pass ]
}

validate_source_layout
[ "$MODE" != check ] || { show_state; exit $?; }

if [ -e "$SERVICE_RUN" ]; then
  grep -Fq '# mcl-detached-owner-runtime:v1' "$SERVICE_RUN" || block "unmanaged service target"
fi
if [ -e "$TARGET_CLIENT" ]; then
  grep -Fq '# mcl-detached-owner-runtime:v1' "$TARGET_CLIENT" || block "unmanaged client target"
fi
if [ -e "$SUPPORT_ROOT" ]; then
  [ -d "$SUPPORT_ROOT" ] && [ ! -L "$SUPPORT_ROOT" ] || block "support root invalid"
  [ -z "$(find "$SUPPORT_ROOT" -type l -print -quit)" ] || block "support root contains symlink"
fi

mkdir -p "$SUPPORT_ROOT" "$BIN_DIR" "$SERVICE_DIR"
chmod 700 "$SUPPORT_ROOT"
for rel in $BUNDLE_FILES; do
  src="$SOURCE_REPO_ROOT/$rel"
  dst="$SUPPORT_ROOT/$rel"
  parent=$(dirname -- "$dst")
  mkdir -p "$parent"
  [ ! -L "$parent" ] || block "support parent symlink"
  if [ -e "$dst" ] || [ -L "$dst" ]; then
    [ -f "$dst" ] && [ ! -L "$dst" ] || block "support target invalid"
  fi
  [ ! -e "$dst.new" ] && [ ! -L "$dst.new" ] || block "support temp target exists"
  cp "$src" "$dst.new"
  chmod 600 "$dst.new"
  mv "$dst.new" "$dst"
done
[ -z "$(find "$SUPPORT_ROOT" -type l -print -quit)" ] || block "support root contains symlink"

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
show_state >/dev/null || block "installed bundle identity mismatch"
rm -f "$SERVICE_DIR/down"
"$SV" up "$SERVICE_DIR"
printf '%s
' 'schema=mcl-detached-owner-runtime-install.v2' 'operation=activate' 'result=pass' 'runtime_started=true' 'details=withheld'
