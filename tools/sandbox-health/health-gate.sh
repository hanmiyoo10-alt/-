#!/bin/sh
set -eu

workdir=${SANDBOX_HEALTH_WORKDIR:-${TMPDIR:-/tmp}}
min_free_mib=${SANDBOX_HEALTH_MIN_FREE_MIB:-0}

usage() {
  echo "usage: $0 [--workdir DIR] [--min-free-mib N]" >&2
}

fail() {
  reason=$1
  echo "SANDBOX_HEALTH_GATE status=FAIL reason=$reason network=not_checked"
  exit 1
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --workdir)
      [ "$#" -ge 2 ] || { usage; fail MISSING_WORKDIR_VALUE; }
      workdir=$2
      shift 2
      ;;
    --min-free-mib)
      [ "$#" -ge 2 ] || { usage; fail MISSING_MIN_FREE_MIB_VALUE; }
      min_free_mib=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage
      fail UNKNOWN_ARGUMENT
      ;;
  esac
done

case "$min_free_mib" in
  ''|*[!0-9]*) fail INVALID_MIN_FREE_MIB ;;
esac

/bin/echo sandbox-health >/dev/null 2>&1 || fail EXECUTION_PROBE_FAILED
[ -d "$workdir" ] && [ -w "$workdir" ] || fail WORKDIR_UNAVAILABLE

probe=$(mktemp "$workdir/.sandbox-health.XXXXXX") || fail SCRATCH_CREATE_FAILED
cleanup() { rm -f "$probe"; }
trap cleanup EXIT HUP INT TERM

printf '%s\n' sandbox-health >"$probe" || fail SCRATCH_WRITE_FAILED
readback=$(cat "$probe" 2>/dev/null || true)
[ "$readback" = sandbox-health ] || fail SCRATCH_READBACK_FAILED

free_kib=$(df -Pk "$workdir" 2>/dev/null | awk 'NR==2 {print $4}')
case "$free_kib" in
  ''|*[!0-9]*) free_kib=unknown ;;
esac

free_inodes=$(df -Pi "$workdir" 2>/dev/null | awk 'NR==2 {print $4}')
case "$free_inodes" in
  ''|*[!0-9]*) free_inodes=unknown ;;
esac

if [ "$min_free_mib" -gt 0 ]; then
  [ "$free_kib" != unknown ] || fail DISK_METRIC_UNAVAILABLE
  required_kib=$((min_free_mib * 1024))
  [ "$free_kib" -ge "$required_kib" ] || fail DISK_BELOW_MINIMUM
fi

read_metric() {
  path=$1
  if [ -r "$path" ]; then
    value=$(cat "$path" 2>/dev/null || true)
    [ -n "$value" ] && printf '%s' "$value" || printf '%s' unknown
  else
    printf '%s' unknown
  fi
}

memory_max=$(read_metric /sys/fs/cgroup/memory.max)
memory_current=$(read_metric /sys/fs/cgroup/memory.current)
cpu_max=$(read_metric /sys/fs/cgroup/cpu.max | tr ' ' ',')

printf '%s\n' \
  "SANDBOX_HEALTH_GATE status=PASS exec=ok io=ok workdir=$workdir free_kib=$free_kib free_inodes=$free_inodes memory_max=$memory_max memory_current=$memory_current cpu_max=$cpu_max network=not_checked"
