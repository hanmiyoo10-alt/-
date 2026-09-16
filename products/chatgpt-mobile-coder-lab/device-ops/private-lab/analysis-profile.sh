#!/bin/sh
set -eu

MODE=check
LAB_NAME="${MCL_PRIVATE_LAB_NAME:-mcl-private-lab}"
PD="${MCL_PRIVATE_LAB_PROOT_DISTRO:-proot-distro}"
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
STATE_BASE="${MCL_PRIVATE_LAB_STATE_BASE:-$PREFIX/var/lib/proot-distro}"
ROOTFS="$STATE_BASE/containers/$LAB_NAME/rootfs"
MARKER="$ROOTFS/etc/mcl-private-lab"

usage() { echo 'usage: analysis-profile.sh [--check|--apply]' >&2; exit 2; }
[ "$#" -eq 1 ] || usage
MODE="${1#--}"
case "$MODE" in check|apply) ;; *) usage ;; esac

printf '%s\n' "$LAB_NAME" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*$' || {
  echo 'BLOCKED invalid-lab' >&2; exit 1;
}
[ "$LAB_NAME" != ubuntu ] || { echo 'BLOCKED preserved-ubuntu' >&2; exit 1; }
command -v "$PD" >/dev/null 2>&1 || [ -x "$PD" ] || {
  echo 'BLOCKED lab-unavailable' >&2; exit 1;
}
[ -f "$MARKER" ] && grep -Fqx '# mcl-private-lab:v1' "$MARKER" || {
  echo 'BLOCKED lab-unavailable' >&2; exit 1;
}

inspect() {
  package=$1
  native=$2
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -c '
    PATH=/usr/sbin:/usr/bin:/sbin:/bin
    export PATH
    package=$1
    native=$2
    command -v dpkg-query >/dev/null 2>&1 || exit 70
    pkg=0
    bin=0
    status=$(dpkg-query -W -f=\${Status} "$package" 2>/dev/null || true)
    [ "$status" = "install ok installed" ] && pkg=1
    [ -x "$native" ] && bin=1
    printf "%s:%s\n" "$pkg" "$bin"
  ' sh "$package" "$native" 2>/dev/null
}

RIPGREP=$(inspect ripgrep /usr/bin/rg) || { echo 'BLOCKED inspection-failed' >&2; exit 1; }
JQ=$(inspect jq /usr/bin/jq) || { echo 'BLOCKED inspection-failed' >&2; exit 1; }
FILE=$(inspect file /usr/bin/file) || { echo 'BLOCKED inspection-failed' >&2; exit 1; }

for state in "$RIPGREP" "$JQ" "$FILE"; do
  case "$state" in 0:0|1:1) ;; *) echo 'BLOCKED package-command-mismatch' >&2; exit 1 ;; esac
done

emit_check() {
  state=$1 tool=$2 package=$3
  if [ "$state" = 1:1 ]; then
    echo "PRESENT tool:$tool package:$package"
  else
    echo "MISSING tool:$tool package:$package"
  fi
}

if [ "$MODE" = check ]; then
  emit_check "$RIPGREP" rg ripgrep
  emit_check "$JQ" jq jq
  emit_check "$FILE" file file
  exit 0
fi

set --
[ "$RIPGREP" = 1:1 ] || set -- "$@" ripgrep
[ "$JQ" = 1:1 ] || set -- "$@" jq
[ "$FILE" = 1:1 ] || set -- "$@" file

if [ "$#" -gt 0 ]; then
  "$PD" login --isolated "$LAB_NAME" -- /bin/sh -c '
    PATH=/usr/sbin:/usr/bin:/sbin:/bin
    export PATH DEBIAN_FRONTEND=noninteractive
    apt-get install -y --no-remove --no-upgrade --no-install-recommends "$@" >/dev/null 2>&1
  ' sh "$@" >/dev/null 2>&1 || { echo 'FAILED profile:analysis-essentials' >&2; exit 1; }
fi

verify_one() {
  before=$1 tool=$2 package=$3 native=$4
  after=$(inspect "$package" "$native") || { echo 'BLOCKED inspection-failed' >&2; exit 1; }
  [ "$after" = 1:1 ] || { echo "FAILED tool:$tool package:$package" >&2; exit 1; }
  if [ "$before" = 1:1 ]; then
    echo "PRESENT tool:$tool package:$package"
  else
    echo "INSTALLED tool:$tool package:$package"
  fi
}

verify_one "$RIPGREP" rg ripgrep /usr/bin/rg
verify_one "$JQ" jq jq /usr/bin/jq
verify_one "$FILE" file file /usr/bin/file
