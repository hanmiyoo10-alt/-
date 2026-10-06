#!/bin/sh
# mcl-s-primary-rdc-retirement:v1
set -eu

SCHEMA=mcl-s-primary-rdc-retirement.v1
FIXED_HOME=/data/data/com.termux/files/home
FIXED_PREFIX=/data/data/com.termux/files/usr
FIXED_ROOTFS="$FIXED_PREFIX/var/lib/proot-distro/containers/ubuntu/rootfs"
PRIMARY_NAME=desktop-commander-remote
WATCHDOG_NAME=desktop-commander-watchdog
SIBLING_NAME=desktop-commander-remote-termux
PRIMARY_RUN_SHA=c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252
WATCHDOG_RUN_SHA=62dcd07c687c813fcb7d9f3e043284b099fb5412ae464f404605c8659bc59feb
WATCHDOG_SCRIPT_SHA=aad84bdf3554b905ff47a334404383335e8c2124675d24301369e46c3a362658
PRIMARY_VERSION=0.2.52

usage() {
  echo 'usage: mcl-s-primary-rdc-retirement.sh --check|--deactivate|--activate' >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
MODE=$1
case "$MODE" in --check|--deactivate|--activate) ;; *) usage ;; esac

TEST_MODE=${MCL_S_PRIMARY_RDC_RETIRE_TEST_MODE:-0}
case "$TEST_MODE" in
  0)
    [ "${HOME:-}" = "$FIXED_HOME" ] || { echo 'BLOCKED wrong execution home' >&2; exit 2; }
    HOME_DIR=$FIXED_HOME
    PREFIX_DIR=$FIXED_PREFIX
    ROOTFS=$FIXED_ROOTFS
    OBSERVE_ATTEMPTS=60
    OBSERVE_SLEEP=1
    ;;
  1)
    TEST_ROOT=${MCL_S_PRIMARY_RDC_RETIRE_TEST_ROOT:-}
    case "$TEST_ROOT" in
      /tmp/mcl-s-primary-rdc-retirement-test-*) ;;
      *) echo 'BLOCKED invalid test root' >&2; exit 2 ;;
    esac
    HOME_DIR="$TEST_ROOT/home"
    PREFIX_DIR="$TEST_ROOT/prefix"
    ROOTFS="$TEST_ROOT/rootfs"
    OBSERVE_ATTEMPTS=${MCL_S_PRIMARY_RDC_RETIRE_TEST_ATTEMPTS:-4}
    OBSERVE_SLEEP=${MCL_S_PRIMARY_RDC_RETIRE_TEST_SLEEP:-0}
    case "$OBSERVE_ATTEMPTS" in ''|*[!0-9]*) echo 'BLOCKED invalid test attempts' >&2; exit 2 ;; esac
    case "$OBSERVE_SLEEP" in ''|*[!0-9.]*) echo 'BLOCKED invalid test sleep' >&2; exit 2 ;; esac
    [ "$OBSERVE_ATTEMPTS" -ge 1 ] || { echo 'BLOCKED invalid test attempts' >&2; exit 2; }
    ;;
  *)
    echo 'BLOCKED invalid test mode' >&2
    exit 2
    ;;
esac

PRIMARY_SERVICE="$PREFIX_DIR/var/service/$PRIMARY_NAME"
WATCHDOG_SERVICE="$PREFIX_DIR/var/service/$WATCHDOG_NAME"
SIBLING_SERVICE="$PREFIX_DIR/var/service/$SIBLING_NAME"
PRIMARY_RUN="$PRIMARY_SERVICE/run"
WATCHDOG_RUN="$WATCHDOG_SERVICE/run"
WATCHDOG_SCRIPT="$HOME_DIR/.local/bin/rdc-health-watchdog"
PRIMARY_BUNDLE="$ROOTFS/root/.local/share/desktop-commander-remote"
PRIMARY_PACKAGE="$PRIMARY_BUNDLE/node_modules/@wonderwhy-er/desktop-commander/package.json"
PRIMARY_ENTRY="$PRIMARY_BUNDLE/node_modules/@wonderwhy-er/desktop-commander/dist/index.js"
SV="$PREFIX_DIR/bin/sv"
SLEEP="$PREFIX_DIR/bin/sleep"
[ "$TEST_MODE" = 1 ] && SLEEP=$(command -v sleep)

sha_file() {
  [ -f "$1" ] && [ ! -L "$1" ] || return 1
  sha256sum "$1" 2>/dev/null | awk '{print $1}'
}
mode_exact() {
  [ "$(stat -c %a "$1" 2>/dev/null || true)" = "$2" ]
}
real_dir() {
  [ -d "$1" ] && [ ! -L "$1" ]
}
regular_sha_mode() {
  path=$1
  sha=$2
  wanted_mode=$3
  [ -f "$path" ] && [ ! -L "$path" ] || return 1
  mode_exact "$path" "$wanted_mode" || return 1
  [ "$(sha_file "$path" || true)" = "$sha" ]
}
primary_version_ok() {
  [ -f "$PRIMARY_PACKAGE" ] && [ ! -L "$PRIMARY_PACKAGE" ] || return 1
  [ -f "$PRIMARY_ENTRY" ] && [ ! -L "$PRIMARY_ENTRY" ] || return 1
  "$PREFIX_DIR/bin/node" - "$PRIMARY_PACKAGE" "$PRIMARY_VERSION" <<'NODE'
const fs=require('fs');
try {
  const pkg=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  process.exit(pkg?.name==='@wonderwhy-er/desktop-commander' && pkg?.version===process.argv[3] ? 0 : 1);
} catch { process.exit(1); }
NODE
}
service_state() {
  out=$("$SV" status "$1" 2>/dev/null || true)
  case "$out" in
    run:*) echo run ;;
    down:*) echo down ;;
    *) echo unknown ;;
  esac
}
marker_state() {
  marker="$1/down"
  if [ ! -e "$marker" ] && [ ! -L "$marker" ]; then
    echo absent
    return
  fi
  if [ -f "$marker" ] && [ ! -L "$marker" ] && mode_exact "$marker" 600; then
    echo present
    return
  fi
  echo unsafe
}
identity_ok() {
  real_dir "$PRIMARY_SERVICE" || return 1
  real_dir "$WATCHDOG_SERVICE" || return 1
  real_dir "$SIBLING_SERVICE" || return 1
  [ -x "$SV" ] || return 1
  regular_sha_mode "$PRIMARY_RUN" "$PRIMARY_RUN_SHA" 700 || return 1
  primary_version_ok || return 1
  regular_sha_mode "$WATCHDOG_RUN" "$WATCHDOG_RUN_SHA" 700 || return 1
  regular_sha_mode "$WATCHDOG_SCRIPT" "$WATCHDOG_SCRIPT_SHA" 700 || return 1
  case "$(marker_state "$PRIMARY_SERVICE")" in absent|present) ;; *) return 1 ;; esac
  case "$(marker_state "$WATCHDOG_SERVICE")" in absent|present) ;; *) return 1 ;; esac
  [ "$(service_state "$SIBLING_SERVICE")" = run ]
}
classify_state() {
  identity_ok || { echo blocked; return; }
  primary_state=$(service_state "$PRIMARY_SERVICE")
  watchdog_state=$(service_state "$WATCHDOG_SERVICE")
  sibling_state=$(service_state "$SIBLING_SERVICE")
  primary_marker=$(marker_state "$PRIMARY_SERVICE")
  watchdog_marker=$(marker_state "$WATCHDOG_SERVICE")
  if [ "$sibling_state" != run ]; then
    echo blocked
  elif [ "$primary_state" = run ] && [ "$watchdog_state" = run ]       && [ "$primary_marker" = absent ] && [ "$watchdog_marker" = absent ]; then
    echo active
  elif [ "$primary_state" = down ] && [ "$watchdog_state" = down ]       && [ "$primary_marker" = present ] && [ "$watchdog_marker" = present ]; then
    echo retired
  else
    echo partial
  fi
}
emit() {
  operation=$1
  state=$2
  result=$3
  reason=$4
  printf '%s\n'     "schema=$SCHEMA"     "operation=$operation"     "state=$state"     "result=$result"     "reason=$reason"     'details=withheld'
}
make_down_marker() {
  service=$1
  real_dir "$service" || return 1
  marker="$service/down"
  case "$(marker_state "$service")" in
    present) return 0 ;;
    absent) ;;
    *) return 1 ;;
  esac
  old_umask=$(umask)
  umask 077
  : > "$marker"
  chmod 600 "$marker"
  umask "$old_umask"
  [ "$(marker_state "$service")" = present ]
}
remove_down_marker() {
  service=$1
  real_dir "$service" || return 1
  marker="$service/down"
  case "$(marker_state "$service")" in
    absent) return 0 ;;
    present) rm "$marker" ;;
    *) return 1 ;;
  esac
  [ "$(marker_state "$service")" = absent ]
}
wait_service_state() {
  service=$1
  wanted=$2
  i=0
  while [ "$i" -lt "$OBSERVE_ATTEMPTS" ]; do
    [ "$(service_state "$service")" = "$wanted" ] && return 0
    "$SLEEP" "$OBSERVE_SLEEP"
    i=$((i + 1))
  done
  return 1
}
check_only() {
  state=$(classify_state)
  case "$state" in
    active|retired) emit check "$state" pass none; return 0 ;;
    partial) emit check partial blocked partial-state; return 2 ;;
    *) emit check blocked blocked identity-or-sibling; return 2 ;;
  esac
}
deactivate() {
  state=$(classify_state)
  case "$state" in
    retired) emit deactivate retired pass already-retired; return 0 ;;
    active) ;;
    partial) emit deactivate partial blocked partial-state; return 2 ;;
    *) emit deactivate blocked blocked identity-or-sibling; return 2 ;;
  esac

  make_down_marker "$WATCHDOG_SERVICE" || { emit deactivate partial blocked watchdog-marker; return 2; }
  "$SV" down "$WATCHDOG_SERVICE" >/dev/null 2>&1 || { emit deactivate partial unknown watchdog-down-effect; return 2; }
  if ! wait_service_state "$WATCHDOG_SERVICE" down; then
    emit deactivate partial unknown watchdog-down-timeout
    return 2
  fi

  make_down_marker "$PRIMARY_SERVICE" || { emit deactivate partial blocked primary-marker; return 2; }
  "$SV" down "$PRIMARY_SERVICE" >/dev/null 2>&1 || { emit deactivate partial unknown primary-down-effect; return 2; }
  if ! wait_service_state "$PRIMARY_SERVICE" down; then
    emit deactivate partial unknown primary-down-timeout
    return 2
  fi

  final=$(classify_state)
  [ "$final" = retired ] || { emit deactivate "$final" blocked final-state; return 2; }
  emit deactivate retired pass none
}
activate() {
  state=$(classify_state)
  case "$state" in
    active) emit activate active pass already-active; return 0 ;;
    retired) ;;
    partial) emit activate partial blocked partial-state; return 2 ;;
    *) emit activate blocked blocked identity-or-sibling; return 2 ;;
  esac

  remove_down_marker "$PRIMARY_SERVICE" || { emit activate partial blocked primary-marker; return 2; }
  "$SV" up "$PRIMARY_SERVICE" >/dev/null 2>&1 || { emit activate partial unknown primary-up-effect; return 2; }
  if ! wait_service_state "$PRIMARY_SERVICE" run; then
    emit activate partial unknown primary-up-timeout
    return 2
  fi

  remove_down_marker "$WATCHDOG_SERVICE" || { emit activate partial blocked watchdog-marker; return 2; }
  "$SV" up "$WATCHDOG_SERVICE" >/dev/null 2>&1 || { emit activate partial unknown watchdog-up-effect; return 2; }
  if ! wait_service_state "$WATCHDOG_SERVICE" run; then
    emit activate partial unknown watchdog-up-timeout
    return 2
  fi

  final=$(classify_state)
  [ "$final" = active ] || { emit activate "$final" blocked final-state; return 2; }
  emit activate active pass none
}

case "$MODE" in
  --check) check_only ;;
  --deactivate) deactivate ;;
  --activate) activate ;;
esac
