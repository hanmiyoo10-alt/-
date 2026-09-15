#!/bin/sh
set -eu

MODE=${1:-}
[ "$#" -eq 1 ] || { echo 'usage: bootstrap.sh --check|--apply' >&2; exit 2; }
case "$MODE" in --check|--apply) ;; *) echo 'usage: bootstrap.sh --check|--apply' >&2; exit 2 ;; esac

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
IMAGE_URL='https://dl-cdn.alpinelinux.org/alpine/v3.24/releases/aarch64/alpine-virt-3.24.1-aarch64.iso'
IMAGE_SHA256='c81699152db11d2a6dbb7d75348d632fcf5811eff414d7e71876a8bb6d48bc02'
IMAGE_BYTES=92743680
DISK_BYTES=8589934592
VARS_BYTES=67108864
DISK_FLOOR=12884901888
INODE_FLOOR=10000

pkg_present() {
  [ "$(dpkg-query -W -f='${Status}' "$1" 2>/dev/null || true)" = 'install ok installed' ]
}
ownership_check() {
  if [ -e "$DATA_ROOT" ]; then
    [ ! -L "$DATA_ROOT" ] || { echo 'BLOCKED ownership-conflict' >&2; exit 1; }
    [ -d "$DATA_ROOT" ] || { echo 'BLOCKED ownership-conflict' >&2; exit 1; }
    [ -f "$MARKER" ] && grep -Fqx 'mcl-vm-lab:v1' "$MARKER" || {
      echo 'BLOCKED ownership-conflict' >&2; exit 1;
    }
  fi
  if [ -e "$STATE_ROOT" ]; then
    [ ! -L "$STATE_ROOT" ] && [ -d "$STATE_ROOT" ] || { echo 'BLOCKED ownership-conflict' >&2; exit 1; }
    [ -f "$STATE_MARKER" ] && grep -Fqx 'mcl-vm-lab:v1' "$STATE_MARKER" || { echo 'BLOCKED ownership-conflict' >&2; exit 1; }
  fi
}

image_state() {
  [ -e "$IMAGE" ] || { echo missing; return; }
  [ -f "$IMAGE" ] && [ ! -L "$IMAGE" ] || { echo conflict; return; }
  actual=$(sha256sum "$IMAGE" 2>/dev/null | awk '{print $1}') || { echo conflict; return; }
  [ "$actual" = "$IMAGE_SHA256" ] && echo present || echo conflict
}

disk_state() {
  [ -e "$DISK" ] || { echo missing; return; }
  [ -f "$DISK" ] && [ ! -L "$DISK" ] || { echo conflict; return; }
  echo present
}

vars_state() {
  [ -e "$VARS" ] || { echo missing; return; }
  [ -f "$VARS" ] && [ ! -L "$VARS" ] || { echo conflict; return; }
  [ "$(wc -c < "$VARS" | tr -d ' ')" = "$VARS_BYTES" ] && echo present || echo conflict
}
report() {
  pkg_present qemu-system-aarch64-headless && echo 'PRESENT package:qemu-system-aarch64-headless' || echo 'MISSING package:qemu-system-aarch64-headless'
  pkg_present qemu-utils && echo 'PRESENT package:qemu-utils' || echo 'MISSING package:qemu-utils'
  case "$(image_state)" in
    present) echo 'PRESENT guest-image:alpine-virt-3.24.1-aarch64' ;;
    missing) echo 'MISSING guest-image:alpine-virt-3.24.1-aarch64' ;;
    *) echo 'BLOCKED guest-image-conflict' >&2; exit 1 ;;
  esac
  case "$(disk_state)" in
    present) echo 'PRESENT disk:mcl-vm-lab.qcow2' ;;
    missing) echo 'MISSING disk:mcl-vm-lab.qcow2' ;;
    *) echo 'BLOCKED disk-conflict' >&2; exit 1 ;;
  esac
  case "$(vars_state)" in
    present) echo 'PRESENT uefi-vars:mcl-vm-lab' ;;
    missing) echo 'MISSING uefi-vars:mcl-vm-lab' ;;
    *) echo 'BLOCKED uefi-vars-conflict' >&2; exit 1 ;;
  esac
}

ownership_check
if [ "$MODE" = --check ]; then
  if [ ! -e "$DATA_ROOT" ]; then
    echo 'MISSING vm-root:mcl-vm-lab'
    pkg_present qemu-system-aarch64-headless && echo 'PRESENT package:qemu-system-aarch64-headless' || echo 'MISSING package:qemu-system-aarch64-headless'
    pkg_present qemu-utils && echo 'PRESENT package:qemu-utils' || echo 'MISSING package:qemu-utils'
    echo 'MISSING guest-image:alpine-virt-3.24.1-aarch64'
    echo 'MISSING disk:mcl-vm-lab.qcow2'
    echo 'MISSING uefi-vars:mcl-vm-lab'
    exit 0
  fi
  echo 'PRESENT vm-root:mcl-vm-lab'
  report
  exit 0
fi
[ -f "$GUARD" ] || { echo 'BLOCKED resource-guard-unavailable' >&2; exit 1; }
python3 "$GUARD" check \
  --target-root "$HOME" \
  --min-free-disk-bytes "$DISK_FLOOR" \
  --min-free-inodes "$INODE_FLOOR" >/dev/null 2>&1 || {
    echo 'BLOCKED resource-preflight' >&2; exit 1;
  }

set --
pkg_present qemu-system-aarch64-headless || set -- "$@" qemu-system-aarch64-headless
pkg_present qemu-utils || set -- "$@" qemu-utils
if [ "$#" -gt 0 ]; then
  pkg install -y --no-upgrade --no-remove "$@" >/dev/null 2>&1 || {
    echo 'FAILED qemu-package-install' >&2; exit 1;
  }
fi
command -v qemu-system-aarch64 >/dev/null 2>&1 || { echo 'BLOCKED qemu-toolchain-mismatch' >&2; exit 1; }
command -v qemu-img >/dev/null 2>&1 || { echo 'BLOCKED qemu-toolchain-mismatch' >&2; exit 1; }
[ -f "$FIRMWARE" ] || { echo 'BLOCKED qemu-firmware-unavailable' >&2; exit 1; }

umask 077
mkdir -p "$DATA_ROOT" "$STATE_ROOT"
printf '%s\n' 'mcl-vm-lab:v1' > "$MARKER"
printf '%s\n' 'mcl-vm-lab:v1' > "$STATE_MARKER"

case "$(vars_state)" in
  present) ;;
  conflict) echo 'BLOCKED uefi-vars-conflict' >&2; exit 1 ;;
  missing) truncate -s "$VARS_BYTES" "$VARS" ;;
esac

case "$(image_state)" in
  present) ;;
  conflict) echo 'BLOCKED guest-image-conflict' >&2; exit 1 ;;
  missing)
    PART="$IMAGE.partial"
    [ ! -e "$PART" ] || { echo 'BLOCKED guest-image-staging-conflict' >&2; exit 1; }
    trap 'rm -f "$PART"' EXIT HUP INT TERM
    curl -fsSL --proto '=https' --tlsv1.2 --max-time 600 -o "$PART" "$IMAGE_URL" >/dev/null 2>&1 || { echo 'FAILED guest-image-download' >&2; exit 1; }
    actual=$(sha256sum "$PART" 2>/dev/null | awk '{print $1}')
    [ "$actual" = "$IMAGE_SHA256" ] || { echo 'FAILED guest-image-checksum' >&2; exit 1; }
    [ "$(wc -c < "$PART" | tr -d ' ')" = "$IMAGE_BYTES" ] || { echo 'FAILED guest-image-size' >&2; exit 1; }
    mv "$PART" "$IMAGE"
    trap - EXIT HUP INT TERM
    ;;
esac
case "$(disk_state)" in
  present) ;;
  conflict) echo 'BLOCKED disk-conflict' >&2; exit 1 ;;
  missing)
    qemu-img create -q -f qcow2 "$DISK" "$DISK_BYTES" >/dev/null 2>&1 || {
      echo 'FAILED disk-create' >&2; exit 1;
    }
    ;;
esac

pkg_present qemu-system-aarch64-headless || { echo 'FAILED qemu-package-verify' >&2; exit 1; }
pkg_present qemu-utils || { echo 'FAILED qemu-package-verify' >&2; exit 1; }
echo 'PRESENT vm-root:mcl-vm-lab'
report