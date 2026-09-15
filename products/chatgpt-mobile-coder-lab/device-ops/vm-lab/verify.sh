#!/bin/sh
set -eu

MODE=${1:-}
[ "$#" -eq 1 ] || { echo 'usage: verify.sh --check|--admission' >&2; exit 2; }
case "$MODE" in --check|--admission) ;; *) echo 'usage: verify.sh --check|--admission' >&2; exit 2 ;; esac

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$HERE/../../../.." && pwd)
GUARD="$REPO_ROOT/tools/repo-env/resource-guard/guard.py"
DATA_ROOT="$HOME/.local/share/mcl-vm-lab"
STATE_ROOT="$HOME/.local/state/mcl-vm-lab"
MARKER="$DATA_ROOT/.mcl-vm-lab-v1"
STATE_MARKER="$STATE_ROOT/.mcl-vm-lab-v1"
IMAGE="$DATA_ROOT/alpine-virt-3.24.1-aarch64.iso"
DISK="$DATA_ROOT/mcl-vm-lab.qcow2"
VARS="$STATE_ROOT/uefi-vars.fd"
FIRMWARE="$PREFIX/share/qemu/edk2-aarch64-code.fd"
IMAGE_SHA256='c81699152db11d2a6dbb7d75348d632fcf5811eff414d7e71876a8bb6d48bc02'
IMAGE_BYTES=92743680
DISK_BYTES=8589934592
VARS_BYTES=67108864
DISK_FLOOR=12884901888
MEMORY_FLOOR=2147483648
INODE_FLOOR=10000

pkg_present() {
  [ "$(dpkg-query -W -f='${Status}' "$1" 2>/dev/null || true)" = 'install ok installed' ]
}
fail() { echo "BLOCKED $1" >&2; exit 1; }

[ -d "$DATA_ROOT" ] && [ ! -L "$DATA_ROOT" ] || fail 'vm-root-unavailable'
[ -d "$STATE_ROOT" ] && [ ! -L "$STATE_ROOT" ] || fail 'vm-state-unavailable'
[ -f "$MARKER" ] && grep -Fqx 'mcl-vm-lab:v1' "$MARKER" || fail 'ownership-conflict'
[ -f "$STATE_MARKER" ] && grep -Fqx 'mcl-vm-lab:v1' "$STATE_MARKER" || fail 'ownership-conflict'
pkg_present qemu-system-aarch64-headless || fail 'qemu-package-missing'
pkg_present qemu-utils || fail 'qemu-package-missing'
command -v qemu-system-aarch64 >/dev/null 2>&1 || fail 'qemu-toolchain-mismatch'
command -v qemu-img >/dev/null 2>&1 || fail 'qemu-toolchain-mismatch'
[ -f "$FIRMWARE" ] || fail 'qemu-firmware-unavailable'
[ -f "$IMAGE" ] && [ ! -L "$IMAGE" ] || fail 'guest-image-missing'
[ "$(sha256sum "$IMAGE" 2>/dev/null | awk '{print $1}')" = "$IMAGE_SHA256" ] || fail 'guest-image-checksum'
[ "$(wc -c < "$IMAGE" | tr -d ' ')" = "$IMAGE_BYTES" ] || fail 'guest-image-size'
[ -f "$DISK" ] && [ ! -L "$DISK" ] || fail 'disk-missing'
[ -f "$VARS" ] && [ ! -L "$VARS" ] || fail 'uefi-vars-missing'
[ "$(wc -c < "$VARS" | tr -d ' ')" = "$VARS_BYTES" ] || fail 'uefi-vars-contract'

INFO=$(qemu-img info --output=json "$DISK" 2>/dev/null) || fail 'disk-inspection'
printf '%s' "$INFO" | python3 -c '
import json, sys
try:
    d=json.load(sys.stdin)
    ok=d.get("format")=="qcow2" and d.get("virtual-size")==8589934592
except Exception:
    ok=False
raise SystemExit(0 if ok else 1)
' || fail 'disk-contract'

echo 'PASS vm-lab-prepared'
[ "$MODE" = --check ] && exit 0
[ -f "$GUARD" ] || { echo 'UNKNOWN resource-admission' >&2; exit 2; }
set +e
python3 "$GUARD" check \
  --target-root "$HOME" \
  --min-free-disk-bytes "$DISK_FLOOR" \
  --min-available-memory-bytes "$MEMORY_FLOOR" \
  --min-free-inodes "$INODE_FLOOR" >/dev/null 2>&1
rc=$?
set -e
case "$rc" in
  0) echo 'PASS boot-admission' ;;
  1) echo 'BLOCKED resource-floor' >&2; exit 1 ;;
  2) echo 'UNKNOWN resource-admission' >&2; exit 2 ;;
  *) echo 'BLOCKED resource-guard-failure' >&2; exit 1 ;;
esac