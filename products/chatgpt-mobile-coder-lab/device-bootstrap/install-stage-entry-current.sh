#!/bin/sh
set -u

SCHEMA='mcl-stage-entry-current-install.v1'
TARGET_DIR='/usr/local/bin'
TARGET_NAME='mcl-stage-entry-current'
SCRIPT_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
SOURCE=$SCRIPT_DIR/mcl-stage-entry-current
TARGET=$TARGET_DIR/$TARGET_NAME

usage() {
  printf '%s\n' 'usage: install-stage-entry-current.sh check|apply'
}
fail_usage() { usage >&2; exit 64; }

operation=${1-}
[ "$#" -eq 1 ] || fail_usage
case "$operation" in check|apply) ;; *) fail_usage ;; esac

emit() {
  printf '%s\n' \
    "schema=$SCHEMA" \
    "operation=$operation" \
    "target=$TARGET" \
    "state=$1" \
    'details=withheld'
}
[ -f "$SOURCE" ] && [ ! -L "$SOURCE" ] || { emit blocked; exit 2; }
[ -d "$TARGET_DIR" ] && [ ! -L "$TARGET_DIR" ] || { emit blocked; exit 2; }

target_state() {
  if [ -L "$TARGET" ]; then
    printf '%s' blocked
    return
  fi
  if [ ! -e "$TARGET" ]; then
    printf '%s' missing
    return
  fi
  if [ ! -f "$TARGET" ]; then
    printf '%s' blocked
    return
  fi
  mode=$(stat -c '%a' "$TARGET" 2>/dev/null || printf unknown)
  if cmp -s "$SOURCE" "$TARGET" && [ "$mode" = 755 ]; then
    printf '%s' exact
  else
    printf '%s' drift
  fi
}

state=$(target_state)
if [ "$operation" = check ]; then
  emit "$state"
  [ "$state" = exact ] && exit 0
  [ "$state" = blocked ] && exit 2
  exit 1
fi
[ "$state" != blocked ] || { emit blocked; exit 2; }
if [ "$state" = exact ]; then
  emit already_exact
  exit 0
fi
tmp=$(mktemp "$TARGET_DIR/.mcl-stage-entry-current.XXXXXX") || { emit failed; exit 3; }
cleanup() { rm -f "$tmp"; }
trap cleanup EXIT HUP INT TERM

if ! install -m 0755 "$SOURCE" "$tmp"; then
  emit failed
  exit 3
fi
if ! cmp -s "$SOURCE" "$tmp"; then
  emit failed
  exit 3
fi
if ! mv -f "$tmp" "$TARGET"; then
  emit failed
  exit 3
fi
trap - EXIT HUP INT TERM

state=$(target_state)
if [ "$state" != exact ]; then
  emit failed
  exit 3
fi

if [ "$operation" = apply ]; then
  emit installed
  exit 0
fi
emit exact
exit 0
