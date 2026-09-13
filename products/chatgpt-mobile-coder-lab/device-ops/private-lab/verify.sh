#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
LAB_NAME="${MCL_PRIVATE_LAB_NAME:-mcl-private-lab}"
out=$("$HERE/bootstrap.sh" --check)
printf '%s\n' "$out" | grep -Fqx 'PRESENT capability:named-container'
printf '%s\n' "$out" | grep -Fqx "PRESENT container:$LAB_NAME"
printf '%s\n' "$out" | grep -Fqx "PRESENT layout:$LAB_NAME"
printf '%s\n' "$out" | grep -Fqx "PRESENT isolated-login:$LAB_NAME"
printf '%s\n' "$out" | grep -Fqx "PRESENT toolchain:$LAB_NAME"
echo "PASS private-lab:$LAB_NAME"
