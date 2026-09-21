#!/bin/sh
set -eu

LAB_NAME=mcl-private-lab
PD=/data/data/com.termux/files/usr/bin/proot-distro
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROBE=$SCRIPT_DIR/probe.mjs

emit() {
  printf '%s\n' \
    'schema=mcl-private-check.v1' \
    'check=rdc-realtime-transport-observer' \
    "result=$1" \
    'details=withheld'
}

[ "$#" -eq 0 ] || { emit blocked; exit 1; }
[ -x "$PD" ] || { emit blocked; exit 1; }
[ -f "$PROBE" ] && [ ! -L "$PROBE" ] || { emit blocked; exit 1; }
if ! "$PD" login --isolated "$LAB_NAME" -- /usr/bin/grep -Fqx \
  '# mcl-private-lab:v1' /etc/mcl-private-lab >/dev/null 2>&1; then
  emit blocked
  exit 1
fi

set +e
candidate=$("$PD" login --isolated "$LAB_NAME" -- /usr/bin/node --input-type=module - < "$PROBE" 2>/dev/null)
run_rc=$?
set -e
lines=$(printf '%s\n' "$candidate" | wc -l | tr -d '[:space:]')
[ "$lines" = 4 ] || { emit unknown; exit 1; }
line1=$(printf '%s\n' "$candidate" | sed -n '1p')
line2=$(printf '%s\n' "$candidate" | sed -n '2p')
line3=$(printf '%s\n' "$candidate" | sed -n '3p')
line4=$(printf '%s\n' "$candidate" | sed -n '4p')
[ "$line1" = 'schema=mcl-private-check.v1' ] || { emit unknown; exit 1; }
[ "$line2" = 'check=rdc-realtime-transport-observer' ] || { emit unknown; exit 1; }
[ "$line4" = 'details=withheld' ] || { emit unknown; exit 1; }
result=${line3#result=}
[ "result=$result" = "$line3" ] || { emit unknown; exit 1; }
case "$result" in pass|fail|blocked|unknown) ;; *) emit unknown; exit 1 ;; esac
printf '%s\n' "$candidate"
[ "$result" = pass ] && [ "$run_rc" -eq 0 ] && exit 0
exit 1
