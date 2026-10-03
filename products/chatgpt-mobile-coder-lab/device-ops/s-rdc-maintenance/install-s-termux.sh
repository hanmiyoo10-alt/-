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

source_ok() {
  [ -f "$SOURCE" ] && [ ! -L "$SOURCE" ] || return 1
  grep -Fqx '# mcl-s-rdc-maintenance:v1' "$SOURCE"
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

classify() {
  if ! source_ok; then STATE=unknown; RESULT=unknown; return; fi
  STATE=$(target_state)
  case "$STATE" in
    present) RESULT=pass ;;
    missing|drift) RESULT=needs_apply ;;
    conflict) RESULT=blocked ;;
    *) RESULT=unknown ;;
  esac
}

emit() {
  printf '%s\n' \
    "schema=$SCHEMA" \
    "launcher=$STATE" \
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
[ -d "$parent" ] && [ ! -L "$parent" ] || { STATE=conflict; RESULT=blocked; finish; }
tmp="$TARGET.tmp.$$"
trap 'rm -f "$tmp"' EXIT HUP INT TERM
cp "$SOURCE" "$tmp"
chmod 700 "$tmp"
mv "$tmp" "$TARGET"
trap - EXIT HUP INT TERM

classify
[ "$RESULT" = pass ] || { RESULT=unknown; finish; }
finish
