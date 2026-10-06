#!/data/data/com.termux/files/usr/bin/sh
set -eu

SCHEMA=pocketrisu-termux-boot-legacy20-retirement.v1
FIXED_HOME=/data/data/com.termux/files/home
PROD_LEGACY_SHA=c6c6dd4c62d78687ac901948cb39a1fa4643e27f696f914c71a2f027a70f5cf4
PROD_REPLACEMENT_SHA=d441c7c5a13bd9b1cf303dcc599d42a494d1bdab780a8086e505006a69cc3992

usage() {
  echo 'usage: retire-legacy-20.sh --check|--apply|--restore' >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
OP=$1
case "$OP" in --check|--apply|--restore) ;; *) usage ;; esac

TEST_MODE=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_MODE:-0}
case "$TEST_MODE" in
  0)
    [ "${HOME:-}" = "$FIXED_HOME" ] || { echo 'BLOCKED wrong execution home' >&2; exit 2; }
    HOME_DIR=$FIXED_HOME
    LEGACY_SHA=$PROD_LEGACY_SHA
    REPLACEMENT_SHA=$PROD_REPLACEMENT_SHA
    ;;
  1)
    TEST_ROOT=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_ROOT:-}
    case "$TEST_ROOT" in /tmp/pocketrisu-termux-boot-retire-test-*) ;; *) echo 'BLOCKED invalid test root' >&2; exit 2 ;; esac
    HOME_DIR="$TEST_ROOT/home"
    LEGACY_SHA=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_LEGACY_SHA:-}
    REPLACEMENT_SHA=${POCKETRISU_TERMUX_BOOT_RETIRE_TEST_REPLACEMENT_SHA:-}
    ;;
  *) echo 'BLOCKED invalid test mode' >&2; exit 2 ;;
esac

case "$LEGACY_SHA" in ????????????????????????????????????????????????????????????????) ;; *) echo 'BLOCKED invalid legacy identity' >&2; exit 2 ;; esac
case "$REPLACEMENT_SHA" in ????????????????????????????????????????????????????????????????) ;; *) echo 'BLOCKED invalid replacement identity' >&2; exit 2 ;; esac

ACTIVE="$HOME_DIR/.termux/boot/20-pocketrisu-ssh-tunnel"
ARCHIVE_ROOT="$HOME_DIR/.termux/boot-disabled"
ARCHIVE="$ARCHIVE_ROOT/20-pocketrisu-ssh-tunnel.retired-by-termux-boot-v1"
REPLACEMENT="$HOME_DIR/.termux/boot/21-pocketrisu-core-supervisor-guard"

path_absent() { [ ! -e "$1" ] && [ ! -L "$1" ]; }
file_sha() { sha256sum "$1" 2>/dev/null | awk '{print $1}'; }
file_state() {
  path=$1
  wanted=$2
  if path_absent "$path"; then echo absent; return; fi
  [ ! -L "$path" ] || { echo symlink; return; }
  [ -f "$path" ] || { echo invalid; return; }
  [ "$(stat -c %a "$path" 2>/dev/null || true)" = 700 ] || { echo mode; return; }
  [ "$(file_sha "$path" || true)" = "$wanted" ] || { echo drift; return; }
  echo exact
}
archive_root_state() {
  if path_absent "$ARCHIVE_ROOT"; then echo absent; return; fi
  [ ! -L "$ARCHIVE_ROOT" ] || { echo symlink; return; }
  [ -d "$ARCHIVE_ROOT" ] || { echo invalid; return; }
  [ "$(stat -c %a "$ARCHIVE_ROOT" 2>/dev/null || true)" = 700 ] || { echo mode; return; }
  echo exact
}
classify() {
  ACTIVE_STATE=$(file_state "$ACTIVE" "$LEGACY_SHA")
  ARCHIVE_STATE=$(file_state "$ARCHIVE" "$LEGACY_SHA")
  REPLACEMENT_STATE=$(file_state "$REPLACEMENT" "$REPLACEMENT_SHA")
  ARCHIVE_ROOT_STATE=$(archive_root_state)
  STATE=blocked
  REASON=identity

  [ "$REPLACEMENT_STATE" = exact ] || { REASON=replacement; return; }
  case "$ARCHIVE_ROOT_STATE" in absent|exact) ;; *) REASON=archive-root; return ;; esac

  case "$ACTIVE_STATE:$ARCHIVE_STATE" in
    exact:absent) STATE=active_exact; REASON=eligible ;;
    absent:exact) STATE=retired_exact; REASON=already-retired ;;
    absent:absent) STATE=missing; REASON=legacy-missing ;;
    exact:exact) STATE=partial; REASON=duplicate ;;
    *) STATE=blocked; REASON=identity ;;
  esac
}
emit() {
  printf '%s\n' \
    "schema=$SCHEMA" \
    "operation=$1" \
    "state=$STATE" \
    "active=$ACTIVE_STATE" \
    "archive=$ARCHIVE_STATE" \
    "replacement=$REPLACEMENT_STATE" \
    "result=$2" \
    "reason=$REASON" \
    'details=withheld'
}
ensure_archive_root() {
  state=$(archive_root_state)
  case "$state" in
    exact) return 0 ;;
    absent)
      old_umask=$(umask)
      umask 077
      mkdir "$ARCHIVE_ROOT"
      chmod 700 "$ARCHIVE_ROOT"
      umask "$old_umask"
      [ "$(archive_root_state)" = exact ]
      ;;
    *) return 1 ;;
  esac
}
check_only() {
  classify
  case "$STATE" in
    active_exact|retired_exact) emit check pass ;;
    *) emit check blocked; return 2 ;;
  esac
}
apply_retirement() {
  classify
  case "$STATE" in
    retired_exact) emit apply pass; return ;;
    active_exact) ;;
    *) emit apply blocked; return 2 ;;
  esac
  ensure_archive_root || { classify; REASON=archive-root; emit apply blocked; return 2; }
  path_absent "$ARCHIVE" || { classify; REASON=archive-present; emit apply blocked; return 2; }
  if ! mv "$ACTIVE" "$ARCHIVE"; then
    classify
    REASON=move-failed
    emit apply unknown
    return 2
  fi
  classify
  if [ "$STATE" = retired_exact ]; then
    REASON=none
    emit apply pass
  else
    REASON=post-move
    emit apply unknown
    return 2
  fi
}
restore_retirement() {
  classify
  case "$STATE" in
    active_exact) REASON=already-active; emit restore pass; return ;;
    retired_exact) ;;
    *) emit restore blocked; return 2 ;;
  esac
  path_absent "$ACTIVE" || { REASON=active-present; emit restore blocked; return 2; }
  if ! mv "$ARCHIVE" "$ACTIVE"; then
    classify
    REASON=restore-move-failed
    emit restore unknown
    return 2
  fi
  classify
  if [ "$STATE" = active_exact ]; then
    REASON=none
    emit restore pass
  else
    REASON=post-restore
    emit restore unknown
    return 2
  fi
}

case "$OP" in
  --check) check_only ;;
  --apply) apply_retirement ;;
  --restore) restore_retirement ;;
esac
