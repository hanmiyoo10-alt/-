#!/bin/sh
# mcl-s-retired-runsv-detachment:v1
set -eu

SCHEMA=mcl-s-retired-runsv-detachment.v1
FIXED_HOME=/data/data/com.termux/files/home
FIXED_PREFIX=/data/data/com.termux/files/usr
TARGETS='mcl-detached-owner-runtime desktop-commander-remote desktop-commander-watchdog llmgateway-bridge'
PRESERVED='desktop-commander-remote-termux local-usage-runtime-engine local-usage-runtime-manager pocketrisu sshd tailscaled'
PRIMARY=desktop-commander-remote

usage() {
  echo 'usage: mcl-s-retired-runsv-detachment.sh --check|--detach|--reattach' >&2
  exit 2
}
[ "$#" -eq 1 ] || usage
MODE=$1
case "$MODE" in --check|--detach|--reattach) ;; *) usage ;; esac

TEST_MODE=${MCL_S_RETIRED_RUNSV_DETACH_TEST_MODE:-0}
case "$TEST_MODE" in
  0)
    [ "${HOME:-}" = "$FIXED_HOME" ] || { echo 'BLOCKED wrong execution home' >&2; exit 2; }
    HOME_DIR=$FIXED_HOME
    PREFIX_DIR=$FIXED_PREFIX
    OBSERVE_ATTEMPTS=60
    OBSERVE_SLEEP=1
    ;;
  1)
    TEST_ROOT=${MCL_S_RETIRED_RUNSV_DETACH_TEST_ROOT:-}
    case "$TEST_ROOT" in /tmp/mcl-s-retired-runsv-detachment-test-*) ;; *) echo 'BLOCKED invalid test root' >&2; exit 2 ;; esac
    HOME_DIR="$TEST_ROOT/home"
    PREFIX_DIR="$TEST_ROOT/prefix"
    OBSERVE_ATTEMPTS=${MCL_S_RETIRED_RUNSV_DETACH_TEST_ATTEMPTS:-5}
    OBSERVE_SLEEP=${MCL_S_RETIRED_RUNSV_DETACH_TEST_SLEEP:-0}
    case "$OBSERVE_ATTEMPTS" in ''|*[!0-9]*) echo 'BLOCKED invalid test attempts' >&2; exit 2 ;; esac
    [ "$OBSERVE_ATTEMPTS" -ge 1 ] || { echo 'BLOCKED invalid test attempts' >&2; exit 2; }
    ;;
  *) echo 'BLOCKED invalid test mode' >&2; exit 2 ;;
esac

SERVICE_ROOT="$PREFIX_DIR/var/service"
ARCHIVE_ROOT="$SERVICE_ROOT/.mcl-retired-services"
SV="$PREFIX_DIR/bin/sv"
PS="$PREFIX_DIR/bin/ps"
PRIMARY_LOG_DIR="$HOME_DIR/.local/state/desktop-commander-remote"

expected_sha() {
  case "$1" in
    mcl-detached-owner-runtime) prod=5715a6acea5c450f95d7392280dbd41fd5dea951fda5189f36819c7f7e0becd7; testv=${MCL_TEST_SHA_DETACHED:-} ;;
    desktop-commander-remote) prod=c629b9a3580c2255319bb39a75ecd1dc025c11cf8d059d8da3622c9c9e854252; testv=${MCL_TEST_SHA_PRIMARY:-} ;;
    desktop-commander-watchdog) prod=62dcd07c687c813fcb7d9f3e043284b099fb5412ae464f404605c8659bc59feb; testv=${MCL_TEST_SHA_WATCHDOG:-} ;;
    llmgateway-bridge) prod=2cfebd9bce0d5d1ae0cf17bafb17070815ae9328bd89ad1bd32613c87b79acaf; testv=${MCL_TEST_SHA_LEGACY:-} ;;
    *) return 1 ;;
  esac
  if [ "$TEST_MODE" = 1 ]; then
    case "$testv" in ????????????????????????????????????????????????????????????????) printf '%s\n' "$testv" ;; *) return 1 ;; esac
  else
    printf '%s\n' "$prod"
  fi
}
expected_dir_mode() {
  case "$1" in
    llmgateway-bridge) echo 700 ;;
    mcl-detached-owner-runtime|desktop-commander-remote|desktop-commander-watchdog) echo 755 ;;
    *) return 1 ;;
  esac
}
mode_exact() { [ "$(stat -c %a "$1" 2>/dev/null || true)" = "$2" ]; }
real_dir() { [ -d "$1" ] && [ ! -L "$1" ]; }
regular_file() { [ -f "$1" ] && [ ! -L "$1" ]; }
path_absent() { [ ! -e "$1" ] && [ ! -L "$1" ]; }
file_sha() { sha256sum "$1" 2>/dev/null | awk '{print $1}'; }

identity_ok() {
  svc=$1
  dir=$2
  sha=$(expected_sha "$svc") || return 1
  dmode=$(expected_dir_mode "$svc") || return 1
  real_dir "$dir" && mode_exact "$dir" "$dmode" || return 1
  regular_file "$dir/run" && mode_exact "$dir/run" 700 || return 1
  [ "$(file_sha "$dir/run" || true)" = "$sha" ] || return 1
  regular_file "$dir/down" && mode_exact "$dir/down" 600
}
archive_root_exact() {
  real_dir "$ARCHIVE_ROOT" && mode_exact "$ARCHIVE_ROOT" 700
}
service_state() {
  out=$("$SV" status "$1" 2>/dev/null || true)
  case "$out" in run:*) echo run ;; down:*) echo down ;; *) echo unknown ;; esac
}
process_dump() { "$PS" -ef 2>/dev/null || true; }
runsv_present() {
  svc=$1
  dump=$(process_dump)
  printf '%s\n' "$dump" | awk -v svc="$svc" '
    {
      for (i=1; i<NF; i++) {
        cmd=$i; sub(/^.*\//, "", cmd)
        if (cmd=="runsv" && $(i+1)==svc) found=1
      }
    }
    END { exit(found ? 0 : 1) }'
}
primary_logger_present() {
  dump=$(process_dump)
  printf '%s\n' "$dump" | awk -v logdir="$PRIMARY_LOG_DIR" '
    index($0,"svlogd") && index($0,logdir) {found=1}
    END {exit(found ? 0 : 1)}'
}
pattern_present() {
  pat=$1
  dump=$(process_dump)
  printf '%s\n' "$dump" | awk -v pat="$pat" 'index($0,pat){found=1} END{exit(found ? 0 : 1)}'
}
target_app_absent() {
  case "$1" in
    mcl-detached-owner-runtime) pat='mcl-detached-owner-runtime-host.cjs' ;;
    desktop-commander-remote) pat='/root/.local/share/desktop-commander-remote/' ;;
    desktop-commander-watchdog) pat='rdc-health-watchdog' ;;
    llmgateway-bridge) pat='generic_local_json_bridge.cjs' ;;
    *) return 1 ;;
  esac
  ! pattern_present "$pat"
}
preserved_ok() {
  for svc in $PRESERVED; do
    real_dir "$SERVICE_ROOT/$svc" || return 1
    [ "$(service_state "$SERVICE_ROOT/$svc")" = run ] || return 1
  done
}
attached_one() {
  svc=$1
  path_absent "$ARCHIVE_ROOT/$svc" || return 1
  identity_ok "$svc" "$SERVICE_ROOT/$svc" || return 1
  [ "$(service_state "$SERVICE_ROOT/$svc")" = down ] || return 1
  runsv_present "$svc" || return 1
  target_app_absent "$svc" || return 1
}
detached_one() {
  svc=$1
  path_absent "$SERVICE_ROOT/$svc" || return 1
  archive_root_exact || return 1
  identity_ok "$svc" "$ARCHIVE_ROOT/$svc" || return 1
  ! runsv_present "$svc" || return 1
  target_app_absent "$svc" || return 1
}
classify_state() {
  preserved_ok || { echo blocked; return; }
  a=0
  d=0
  for svc in $TARGETS; do
    if attached_one "$svc"; then a=$((a+1))
    elif detached_one "$svc"; then d=$((d+1))
    else echo partial; return
    fi
  done
  if [ "$a" -eq 4 ]; then
    path_absent "$ARCHIVE_ROOT" || { echo partial; return; }
    primary_logger_present || { echo partial; return; }
    echo attached_retired
  elif [ "$d" -eq 4 ]; then
    ! primary_logger_present || { echo partial; return; }
    echo detached_retired
  else
    echo partial
  fi
}
emit() {
  printf '%s\n' \
    "schema=$SCHEMA" \
    "operation=$1" \
    "state=$2" \
    "result=$3" \
    "reason=$4" \
    'details=withheld'
}
wait_runsv() {
  svc=$1
  wanted=$2
  i=0
  while [ "$i" -lt "$OBSERVE_ATTEMPTS" ]; do
    if [ "$wanted" = absent ]; then
      ! runsv_present "$svc" && return 0
    else
      runsv_present "$svc" && return 0
    fi
    sleep "$OBSERVE_SLEEP"
    i=$((i+1))
  done
  return 1
}
wait_primary_logger_absent() {
  i=0
  while [ "$i" -lt "$OBSERVE_ATTEMPTS" ]; do
    ! primary_logger_present && return 0
    sleep "$OBSERVE_SLEEP"
    i=$((i+1))
  done
  return 1
}
same_filesystem() {
  [ "$(stat -c %d "$SERVICE_ROOT")" = "$(stat -c %d "$ARCHIVE_ROOT")" ] &&
    [ "$(stat -c %d "$1")" = "$(stat -c %d "$ARCHIVE_ROOT")" ]
}
ensure_archive() {
  if path_absent "$ARCHIVE_ROOT"; then
    old=$(umask); umask 077
    mkdir "$ARCHIVE_ROOT"
    chmod 700 "$ARCHIVE_ROOT"
    umask "$old"
  fi
  archive_root_exact
}
reattach_moved() {
  moved=$1
  ok=1
  for svc in llmgateway-bridge desktop-commander-watchdog desktop-commander-remote mcl-detached-owner-runtime; do
    case " $moved " in
      *" $svc "*)
        if path_absent "$SERVICE_ROOT/$svc" && identity_ok "$svc" "$ARCHIVE_ROOT/$svc"; then
          mv "$ARCHIVE_ROOT/$svc" "$SERVICE_ROOT/$svc" || ok=0
          wait_runsv "$svc" present || ok=0
        else
          ok=0
        fi
        ;;
    esac
  done
  rmdir "$ARCHIVE_ROOT" 2>/dev/null || ok=0
  [ "$ok" -eq 1 ]
}
detach_one() {
  svc=$1
  src="$SERVICE_ROOT/$svc"
  dst="$ARCHIVE_ROOT/$svc"
  attached_one "$svc" || return 1
  path_absent "$dst" || return 1
  same_filesystem "$src" || return 1
  mv "$src" "$dst"
  wait_runsv "$svc" absent || return 1
  if [ "$svc" = "$PRIMARY" ]; then wait_primary_logger_absent || return 1; fi
  detached_one "$svc"
}
reattach_one() {
  svc=$1
  src="$ARCHIVE_ROOT/$svc"
  dst="$SERVICE_ROOT/$svc"
  detached_one "$svc" || return 1
  path_absent "$dst" || return 1
  same_filesystem "$src" || return 1
  mv "$src" "$dst"
  wait_runsv "$svc" present || return 1
  attached_one "$svc"
}
check_only() {
  state=$(classify_state)
  case "$state" in
    attached_retired|detached_retired) emit check "$state" pass none ;;
    blocked) emit check blocked blocked preserved-service ;;
    *) emit check partial blocked identity-or-state; return 2 ;;
  esac
}
detach_all() {
  state=$(classify_state)
  case "$state" in
    detached_retired) emit detach detached_retired pass already-detached; return ;;
    attached_retired) ;;
    blocked) emit detach blocked blocked preserved-service; return 2 ;;
    *) emit detach partial blocked identity-or-state; return 2 ;;
  esac
  ensure_archive || { emit detach partial blocked archive; return 2; }
  moved=''
  for svc in $TARGETS; do
    if detach_one "$svc"; then
      moved="$moved $svc"
    else
      if path_absent "$SERVICE_ROOT/$svc" && identity_ok "$svc" "$ARCHIVE_ROOT/$svc"; then
        moved="$moved $svc"
      fi
      if reattach_moved "$moved"; then
        emit detach attached_retired unknown detach-rolled-back
      else
        emit detach partial unknown detach-rollback-failed
      fi
      return 2
    fi
  done
  final=$(classify_state)
  [ "$final" = detached_retired ] || { emit detach "$final" unknown final-state; return 2; }
  emit detach detached_retired pass none
}
reattach_all() {
  state=$(classify_state)
  case "$state" in
    attached_retired) emit reattach attached_retired pass already-attached; return ;;
    detached_retired) ;;
    blocked) emit reattach blocked blocked preserved-service; return 2 ;;
    *) emit reattach partial blocked identity-or-state; return 2 ;;
  esac
  for svc in $TARGETS; do
    reattach_one "$svc" || { emit reattach partial unknown reattach-failed; return 2; }
  done
  rmdir "$ARCHIVE_ROOT" || { emit reattach partial unknown archive-not-empty; return 2; }
  final=$(classify_state)
  [ "$final" = attached_retired ] || { emit reattach "$final" unknown final-state; return 2; }
  emit reattach attached_retired pass none
}

case "$MODE" in
  --check) check_only ;;
  --detach) detach_all ;;
  --reattach) reattach_all ;;
esac
