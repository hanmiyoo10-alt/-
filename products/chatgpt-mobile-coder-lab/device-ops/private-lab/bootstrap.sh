#!/bin/sh
set -eu

MODE=check
LAB_NAME="${MCL_PRIVATE_LAB_NAME:-mcl-private-lab}"
IMAGE="${MCL_PRIVATE_LAB_IMAGE:-ubuntu:24.04}"
PD="${MCL_PRIVATE_LAB_PROOT_DISTRO:-proot-distro}"
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
STATE_BASE="${MCL_PRIVATE_LAB_STATE_BASE:-$PREFIX/var/lib/proot-distro}"
CONTAINER_DIR="$STATE_BASE/containers/$LAB_NAME"
ROOTFS="$CONTAINER_DIR/rootfs"
MARKER="$ROOTFS/etc/mcl-private-lab"
LAB_ROOT="$ROOTFS/opt/mcl-private-lab"

usage() { echo "usage: $0 [--check|--apply]" >&2; exit 2; }
[ "$#" -le 1 ] || usage
[ "$#" -eq 0 ] || MODE="${1#--}"
case "$MODE" in check|apply) ;; *) usage ;; esac

printf '%s\n' "$LAB_NAME" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*$' || {
  echo "BLOCKED invalid lab name" >&2; exit 1;
}
[ "$LAB_NAME" != ubuntu ] || { echo "BLOCKED preserved ubuntu target" >&2; exit 1; }
command -v "$PD" >/dev/null 2>&1 || [ -x "$PD" ] || {
  echo "BLOCKED proot-distro missing" >&2; exit 1;
}

install_help=$($PD install --help 2>&1 || true)
printf '%s\n' "$install_help" | grep -Eq -- '(^|[[:space:]])-n, --name|--name \[NAME\]' || {
  echo "BLOCKED named-container capability unavailable" >&2; exit 1;
}
echo "PRESENT capability:named-container"

managed_marker_ok() {
  [ -f "$MARKER" ] && grep -Fqx '# mcl-private-lab:v1' "$MARKER"
}
layout_ok() {
  [ -d "$LAB_ROOT/vendor" ] && [ -d "$LAB_ROOT/fixtures" ] && \
  [ -d "$LAB_ROOT/results" ] && [ -d "$LAB_ROOT/receipts" ]
}
toolchain_ok() {
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc \
    'for c in node npm git python3; do command -v "$c" >/dev/null 2>&1 || exit 1; done' \
    >/dev/null 2>&1
}

if [ -d "$ROOTFS" ]; then
  managed_marker_ok || { echo "BLOCKED unmanaged lab container" >&2; exit 1; }
else
  if [ "$MODE" = check ]; then
    echo "MISSING container:$LAB_NAME"
    exit 0
  fi
  "$PD" install --name "$LAB_NAME" "$IMAGE"
  [ -d "$ROOTFS" ] || { echo "FAILED container install" >&2; exit 1; }
  mkdir -p "$ROOTFS/etc" "$LAB_ROOT/vendor" "$LAB_ROOT/fixtures" "$LAB_ROOT/results" "$LAB_ROOT/receipts"
  printf '%s\n' '# mcl-private-lab:v1' > "$MARKER"
fi

echo "PRESENT container:$LAB_NAME"
if ! layout_ok; then
  if [ "$MODE" = check ]; then
    echo "MISSING layout:$LAB_NAME"
    exit 0
  fi
  mkdir -p "$LAB_ROOT/vendor" "$LAB_ROOT/fixtures" "$LAB_ROOT/results" "$LAB_ROOT/receipts"
fi
echo "PRESENT layout:$LAB_NAME"

if ! toolchain_ok; then
  if [ "$MODE" = check ]; then
    echo "MISSING toolchain:$LAB_NAME"
    exit 0
  fi
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -lc \
    'export DEBIAN_FRONTEND=noninteractive; apt-get update >/dev/null; apt-get install -y ca-certificates git nodejs npm python3 >/dev/null'
  toolchain_ok || { echo "FAILED toolchain install" >&2; exit 1; }
fi
echo "PRESENT isolated-login:$LAB_NAME"
echo "PRESENT toolchain:$LAB_NAME"
