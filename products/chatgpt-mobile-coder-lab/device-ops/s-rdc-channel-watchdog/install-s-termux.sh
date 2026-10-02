#!/bin/sh
# mcl-s-rdc-channel-watchdog-install:v1
set -eu

SCHEMA=mcl-s-rdc-channel-watchdog-install.v1
FIXED_HOME=/data/data/com.termux/files/home
FIXED_PREFIX=/data/data/com.termux/files/usr
LEGACY_WATCHDOG_SHA256=b5e9814533d903108e801cad1e07a90918b0a925fe2af7142bb568704164b68f
LEGACY_RUN_SHA256=34fcc65cd2952939329168b900260caccb45542c1cf1b6b8f4b65ae0d199b481

usage() {
  echo 'usage: install-s-termux.sh --check|--apply' >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
MODE=$1
case "$MODE" in --check|--apply) ;; *) usage ;; esac

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
SOURCE_WATCHDOG="$HERE/rdc-health-watchdog"
SOURCE_RUN="$HERE/desktop-commander-watchdog-run"
TEST_MODE=${MCL_S_RDC_WATCHDOG_INSTALL_TEST_MODE:-0}

case "$TEST_MODE" in
  0)
    [ "${HOME:-}" = "$FIXED_HOME" ] || { echo 'BLOCKED wrong home' >&2; exit 2; }
    HOME_DIR=$FIXED_HOME
    PREFIX_DIR=$FIXED_PREFIX
    ;;
  1)
    TEST_ROOT=${MCL_S_RDC_WATCHDOG_INSTALL_TEST_ROOT:-}
    case "$TEST_ROOT" in
      /tmp/mcl-s-rdc-watchdog-install-test-*) ;;
      *) echo 'BLOCKED invalid test root' >&2; exit 2 ;;
    esac
    HOME_DIR="$TEST_ROOT/home"
    PREFIX_DIR="$TEST_ROOT/prefix"
    ;;
  *)
    echo 'BLOCKED invalid test mode' >&2
    exit 2
    ;;
esac

TARGET_WATCHDOG="$HOME_DIR/.local/bin/rdc-health-watchdog"
TARGET_RUN="$PREFIX_DIR/var/service/desktop-commander-watchdog/run"

source_ok() {
  [ -f "$SOURCE_WATCHDOG" ] && [ ! -L "$SOURCE_WATCHDOG" ] || return 1
  [ -f "$SOURCE_RUN" ] && [ ! -L "$SOURCE_RUN" ] || return 1
  grep -Fqx '# mcl-s-rdc-channel-watchdog:v2' "$SOURCE_WATCHDOG" || return 1
  grep -Fqx '# mcl-s-rdc-channel-watchdog-run:v1' "$SOURCE_RUN" || return 1
}

target_state() {
  target=$1
  source=$2
  marker=$3
  legacy_sha=$4

  if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    echo missing
    return
  fi
  [ -f "$target" ] && [ ! -L "$target" ] || { echo conflict; return; }

  if cmp -s "$source" "$target" && [ "$(stat -c %a "$target" 2>/dev/null || true)" = 700 ]; then
    echo present
    return
  fi

  actual=$(sha256sum "$target" 2>/dev/null | awk '{print $1}')
  if [ "$actual" = "$legacy_sha" ]; then
    echo drift
    return
  fi

  if grep -Fqx "$marker" "$target" 2>/dev/null; then
    echo drift
    return
  fi

  echo conflict
}

classify() {
  if ! source_ok; then
    WATCHDOG_STATE=unknown
    RUN_STATE=unknown
    RESULT=unknown
    return
  fi

  WATCHDOG_STATE=$(target_state "$TARGET_WATCHDOG" "$SOURCE_WATCHDOG" '# mcl-s-rdc-channel-watchdog:v2' "$LEGACY_WATCHDOG_SHA256")
  RUN_STATE=$(target_state "$TARGET_RUN" "$SOURCE_RUN" '# mcl-s-rdc-channel-watchdog-run:v1' "$LEGACY_RUN_SHA256")

  if [ "$WATCHDOG_STATE" = conflict ] || [ "$RUN_STATE" = conflict ]; then
    RESULT=blocked
  elif [ "$WATCHDOG_STATE" = present ] && [ "$RUN_STATE" = present ]; then
    RESULT=pass
  elif [ "$WATCHDOG_STATE" = unknown ] || [ "$RUN_STATE" = unknown ]; then
    RESULT=unknown
  else
    RESULT=needs_apply
  fi
}

emit() {
  printf '%s\n' \
    "schema=$SCHEMA" \
    "watchdog=$WATCHDOG_STATE" \
    "run_file=$RUN_STATE" \
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

safe_parent() {
  parent=$(dirname "$1")
  [ -d "$parent" ] && [ ! -L "$parent" ]
}

install_one() {
  source=$1
  target=$2
  safe_parent "$target" || return 1
  tmp="$target.tmp.$$"
  trap 'rm -f "$tmp"' EXIT HUP INT TERM
  cp "$source" "$tmp"
  chmod 700 "$tmp"
  mv "$tmp" "$target"
  trap - EXIT HUP INT TERM
}

classify
[ "$MODE" = --apply ] || finish
case "$RESULT" in
  pass) finish ;;
  needs_apply) ;;
  blocked|unknown) finish ;;
  *) RESULT=unknown; finish ;;
esac

safe_parent "$TARGET_WATCHDOG" || {
  WATCHDOG_STATE=conflict
  RESULT=blocked
  finish
}
safe_parent "$TARGET_RUN" || {
  RUN_STATE=conflict
  RESULT=blocked
  finish
}

install_one "$SOURCE_WATCHDOG" "$TARGET_WATCHDOG" || {
  RESULT=unknown
  finish
}
install_one "$SOURCE_RUN" "$TARGET_RUN" || {
  RESULT=unknown
  finish
}

classify
[ "$RESULT" = pass ] || {
  RESULT=unknown
  finish
}
finish
