#!/bin/sh
# mcl-s-rdc-maintenance-install:v1
set -eu

SCHEMA=mcl-s-rdc-maintenance-install.v1
FIXED_HOME=/data/data/com.termux/files/home
TEST_MODE=${MCL_S_RDC_MAINTENANCE_INSTALL_TEST_MODE:-0}

usage() {
  echo 'usage: install-s-termux.sh --check|--apply' >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
MODE=$1
case "$MODE" in --check|--apply) ;; *) usage ;; esac

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
SOURCE="$HERE/mcl-s-rdc-maintenance"
SHIM_SOURCE="$HERE/device-name-shim.cjs"

case "$TEST_MODE" in
  0)
    [ "${HOME:-}" = "$FIXED_HOME" ] || { echo 'BLOCKED wrong home' >&2; exit 2; }
    HOME_DIR=$FIXED_HOME
    ;;
  1)
    TEST_ROOT=${MCL_S_RDC_MAINTENANCE_INSTALL_TEST_ROOT:-}
    case "$TEST_ROOT" in
      /tmp/mcl-s-rdc-maintenance-install-test-*) ;;
      *) echo 'BLOCKED invalid test root' >&2; exit 2 ;;
    esac
    HOME_DIR="$TEST_ROOT/home"
    ;;  *)
    echo 'BLOCKED invalid test mode' >&2
    exit 2
    ;;
esac

TARGET="$HOME_DIR/.local/bin/mcl-s-rdc-maintenance"
SHIM_TARGET="$HOME_DIR/.local/share/mcl-s-rdc-maintenance/device-name-shim.cjs"

source_ok() {
  [ -f "$SOURCE" ] && [ ! -L "$SOURCE" ] || return 1
  [ -f "$SHIM_SOURCE" ] && [ ! -L "$SHIM_SOURCE" ] || return 1
  grep -Fqx '# mcl-s-rdc-maintenance:v1' "$SOURCE" || return 1
  grep -Fqx '// mcl-s-rdc-device-name:v1' "$SHIM_SOURCE"
}

target_state() {
  if [ ! -e "$TARGET" ] && [ ! -L "$TARGET" ]; then echo missing; return; fi
  [ -f "$TARGET" ] && [ ! -L "$TARGET" ] || { echo conflict; return; }
  if cmp -s "$SOURCE" "$TARGET" && [ "$(stat -c %a "$TARGET" 2>/dev/null || true)" = 700 ]; then
    echo present
    return
  fi
  if grep -Fqx '# mcl-s-rdc-maintenance:v1' "$TARGET" 2>/dev/null; then
    echo drift
    return
  fi
  echo conflict
}

shim_target_state() {
  if [ ! -e "$SHIM_TARGET" ] && [ ! -L "$SHIM_TARGET" ]; then echo missing; return; fi
  [ -f "$SHIM_TARGET" ] && [ ! -L "$SHIM_TARGET" ] || { echo conflict; return; }
  if cmp -s "$SHIM_SOURCE" "$SHIM_TARGET" && [ "$(stat -c %a "$SHIM_TARGET" 2>/dev/null || true)" = 600 ]; then
    echo present
    return
  fi
  if grep -Fqx '// mcl-s-rdc-device-name:v1' "$SHIM_TARGET" 2>/dev/null; then
    echo drift
    return
  fi
  echo conflict
}

classify() {
  if ! source_ok; then STATE=unknown; SHIM_STATE=unknown; RESULT=unknown; return; fi
  STATE=$(target_state)
  SHIM_STATE=$(shim_target_state)
  case "$STATE:$SHIM_STATE" in
    present:present) RESULT=pass ;;
    conflict:*|*:conflict) RESULT=blocked ;;
    missing:*|drift:*|*:missing|*:drift) RESULT=needs_apply ;;
    *) RESULT=unknown ;;
  esac
}

emit() {
  printf '%s\n' \
    "schema=$SCHEMA" \
    "launcher=$STATE" \
    "shim_source=$SHIM_STATE" \
    "result=$RESULT" \
    'details=withheld'
}

finish() {
  emit
  case "$RESULT" in
    pass) exit 0 ;;
    needs_apply) exit 1 ;;
    blocked|unknown) exit 2 ;;
    *) exit 2 ;;
  esac
}

classify
[ "$MODE" = --apply ] || finish
case "$RESULT" in
  pass) finish ;;
  needs_apply) ;;
  blocked|unknown) finish ;;
esac

parent=$(dirname "$TARGET")
[ -d "$parent" ] && [ ! -L "$parent" ] || { STATE=conflict; SHIM_STATE=unknown; RESULT=blocked; finish; }

local_dir="$HOME_DIR/.local"
[ -d "$local_dir" ] && [ ! -L "$local_dir" ] || { STATE=conflict; SHIM_STATE=conflict; RESULT=blocked; finish; }
share_dir="$local_dir/share"
if [ -e "$share_dir" ] || [ -L "$share_dir" ]; then
  [ -d "$share_dir" ] && [ ! -L "$share_dir" ] || { STATE=conflict; SHIM_STATE=conflict; RESULT=blocked; finish; }
else
  mkdir "$share_dir" || { STATE=unknown; SHIM_STATE=unknown; RESULT=unknown; finish; }
fi
shim_parent=$(dirname "$SHIM_TARGET")
if [ -e "$shim_parent" ] || [ -L "$shim_parent" ]; then
  [ -d "$shim_parent" ] && [ ! -L "$shim_parent" ] || { STATE=conflict; SHIM_STATE=conflict; RESULT=blocked; finish; }
else
  mkdir "$shim_parent" || { STATE=unknown; SHIM_STATE=unknown; RESULT=unknown; finish; }
fi

shim_tmp="$SHIM_TARGET.tmp.$$"
tmp="$TARGET.tmp.$$"
trap 'rm -f "$shim_tmp" "$tmp"' EXIT HUP INT TERM
cp "$SHIM_SOURCE" "$shim_tmp"
chmod 600 "$shim_tmp"
mv "$shim_tmp" "$SHIM_TARGET"
cp "$SOURCE" "$tmp"
chmod 700 "$tmp"
mv "$tmp" "$TARGET"
trap - EXIT HUP INT TERM

classify
[ "$RESULT" = pass ] || { RESULT=unknown; finish; }
finish
