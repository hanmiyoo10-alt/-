#!/bin/sh
# mcl-s-legacy-local-json-bridge-retirement:v1
set -eu

SCHEMA=mcl-s-legacy-local-json-bridge-retirement.v1
FIXED_HOME=/data/data/com.termux/files/home
FIXED_PREFIX=/data/data/com.termux/files/usr
SERVICE_NAME=llmgateway-bridge
RUN_SHA=2cfebd9bce0d5d1ae0cf17bafb17070815ae9328bd89ad1bd32613c87b79acaf
SOURCE_SHA=611dcf344df0a2b88c3138850b085e42ff6c7a109e69783a69607152744cdcdb

usage() {
  echo 'usage: mcl-s-legacy-local-json-bridge-retirement.sh --check|--deactivate|--activate' >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
MODE=$1
case "$MODE" in --check|--deactivate|--activate) ;; *) usage ;; esac

TEST_MODE=${MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_MODE:-0}
case "$TEST_MODE" in
  0)
    [ "${HOME:-}" = "$FIXED_HOME" ] || { echo 'BLOCKED wrong execution home' >&2; exit 2; }
    HOME_DIR=$FIXED_HOME
    PREFIX_DIR=$FIXED_PREFIX
    EXPECT_RUN_SHA=$RUN_SHA
    EXPECT_SOURCE_SHA=$SOURCE_SHA
    OBSERVE_ATTEMPTS=60
    OBSERVE_SLEEP=1
    ;;
  1)
    TEST_ROOT=${MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_ROOT:-}
    case "$TEST_ROOT" in
      /tmp/mcl-s-legacy-local-json-bridge-retirement-test-*) ;;
      *) echo 'BLOCKED invalid test root' >&2; exit 2 ;;
    esac
    HOME_DIR="$TEST_ROOT/home"
    PREFIX_DIR="$TEST_ROOT/prefix"
    EXPECT_RUN_SHA=${MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_RUN_SHA:-}
    EXPECT_SOURCE_SHA=${MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_SOURCE_SHA:-}
    OBSERVE_ATTEMPTS=${MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_ATTEMPTS:-4}
    OBSERVE_SLEEP=${MCL_S_LEGACY_JSON_BRIDGE_RETIRE_TEST_SLEEP:-0}
    case "$EXPECT_RUN_SHA" in ????????????????????????????????????????????????????????????????) ;; *) echo 'BLOCKED invalid test run sha' >&2; exit 2 ;; esac
    case "$EXPECT_SOURCE_SHA" in ????????????????????????????????????????????????????????????????) ;; *) echo 'BLOCKED invalid test source sha' >&2; exit 2 ;; esac
    case "$OBSERVE_ATTEMPTS" in ''|*[!0-9]*) echo 'BLOCKED invalid test attempts' >&2; exit 2 ;; esac
    [ "$OBSERVE_ATTEMPTS" -ge 1 ] || { echo 'BLOCKED invalid test attempts' >&2; exit 2; }
    ;;
  *)
    echo 'BLOCKED invalid test mode' >&2
    exit 2
    ;;
esac

SERVICE="$PREFIX_DIR/var/service/$SERVICE_NAME"
RUN_FILE="$SERVICE/run"
SOURCE="$HOME_DIR/PocketRisu/generic_local_json_bridge.cjs"
SV="$PREFIX_DIR/bin/sv"
SLEEP=$(command -v sleep)
[ "$TEST_MODE" = 0 ] && SLEEP="$PREFIX_DIR/bin/sleep"

mode_exact() {
  [ "$(stat -c %a "$1" 2>/dev/null || true)" = "$2" ]
}
sha_file() {
  [ -f "$1" ] && [ ! -L "$1" ] || return 1
  sha256sum "$1" 2>/dev/null | awk '{print $1}'
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
service_state() {
  out=$("$SV" status "$SERVICE" 2>/dev/null || true)
  case "$out" in
    run:*) echo run ;;
    down:*) echo down ;;
    *) echo unknown ;;
  esac
}
marker_state() {
  marker="$SERVICE/down"
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
  real_dir "$SERVICE" || return 1
  [ -x "$SV" ] || return 1
  regular_sha_mode "$RUN_FILE" "$EXPECT_RUN_SHA" 700 || return 1
  regular_sha_mode "$SOURCE" "$EXPECT_SOURCE_SHA" 644 || return 1
  case "$(marker_state)" in absent|present) ;; *) return 1 ;; esac
}
classify_state() {
  identity_ok || { echo blocked; return; }
  state=$(service_state)
  marker=$(marker_state)
  if [ "$state" = run ] && [ "$marker" = absent ]; then
    echo active
  elif [ "$state" = down ] && [ "$marker" = present ]; then
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
  real_dir "$SERVICE" || return 1
  case "$(marker_state)" in
    present) return 0 ;;
    absent) ;;
    *) return 1 ;;
  esac
  old_umask=$(umask)
  umask 077
  : > "$SERVICE/down"
  chmod 600 "$SERVICE/down"
  umask "$old_umask"
  [ "$(marker_state)" = present ]
}
remove_down_marker() {
  case "$(marker_state)" in
    absent) return 0 ;;
    present) rm "$SERVICE/down" ;;
    *) return 1 ;;
  esac
  [ "$(marker_state)" = absent ]
}
wait_state() {
  wanted=$1
  i=0
  while [ "$i" -lt "$OBSERVE_ATTEMPTS" ]; do
    [ "$(service_state)" = "$wanted" ] && return 0
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
    *) emit check blocked blocked identity; return 2 ;;
  esac
}
deactivate() {
  state=$(classify_state)
  case "$state" in
    retired) emit deactivate retired pass already-retired; return 0 ;;
    active) ;;
    partial) emit deactivate partial blocked partial-state; return 2 ;;
    *) emit deactivate blocked blocked identity; return 2 ;;
  esac

  make_down_marker || { emit deactivate partial blocked marker; return 2; }
  "$SV" down "$SERVICE" >/dev/null 2>&1 || { emit deactivate partial unknown down-effect; return 2; }
  if ! wait_state down; then
    emit deactivate partial unknown down-timeout
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
    *) emit activate blocked blocked identity; return 2 ;;
  esac

  remove_down_marker || { emit activate partial blocked marker; return 2; }
  "$SV" up "$SERVICE" >/dev/null 2>&1 || { emit activate partial unknown up-effect; return 2; }
  if ! wait_state run; then
    emit activate partial unknown up-timeout
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
