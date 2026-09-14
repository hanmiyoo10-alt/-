#!/bin/sh
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
gate="$here/health-gate.sh"
tmp=$(mktemp -d)
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT HUP INT TERM

pass_output=$(sh "$gate" --workdir "$tmp" --min-free-mib 0)
printf '%s\n' "$pass_output" | grep -q 'SANDBOX_HEALTH_GATE status=PASS'
printf '%s\n' "$pass_output" | grep -q 'network=not_checked'

if sh "$gate" --workdir "$tmp/does-not-exist" >"$tmp/missing.out" 2>&1; then
  echo 'expected missing workdir failure' >&2
  exit 1
fi
grep -q 'reason=WORKDIR_UNAVAILABLE' "$tmp/missing.out"

if sh "$gate" --workdir "$tmp" --min-free-mib invalid >"$tmp/invalid.out" 2>&1; then
  echo 'expected invalid minimum failure' >&2
  exit 1
fi
grep -q 'reason=INVALID_MIN_FREE_MIB' "$tmp/invalid.out"

if sh "$gate" --workdir "$tmp" --min-free-mib 999999999 >"$tmp/space.out" 2>&1; then
  echo 'expected excessive free-space request failure' >&2
  exit 1
fi
grep -q 'reason=DISK_BELOW_MINIMUM' "$tmp/space.out"

printf '%s\n' 'sandbox-health-gate-contract: PASS'
