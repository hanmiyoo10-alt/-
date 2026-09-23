#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
INSTALL="$HERE/install-s-termux.sh"
ROOT=$(mktemp -d)
trap 'rm -rf "$ROOT"' EXIT HUP INT TERM

export MCL_DETACHED_RUNTIME_TEST_MODE=1
export MCL_DETACHED_RUNTIME_TEST_ROOT="$ROOT"

set +e
first=$("$INSTALL" --check 2>&1)
first_rc=$?
set -e
[ "$first_rc" -eq 1 ]
printf '%s\n' "$first" | grep -Fq 'result=missing'
[ ! -e "$ROOT/prefix/var/service/mcl-detached-owner-runtime" ]

"$INSTALL" --apply > "$ROOT/apply.out"
grep -Fq 'result=pass' "$ROOT/apply.out"
grep -Fq 'runtime_started=false' "$ROOT/apply.out"

"$INSTALL" --check > "$ROOT/check.out"
grep -Fq 'result=pass' "$ROOT/check.out"
grep -Fq 'activation=disabled' "$ROOT/check.out"

SERVICE="$ROOT/prefix/var/service/mcl-detached-owner-runtime"
CLIENT="$ROOT/ubuntu/root/.local/bin/mcl-detached-owner-runtime"
LIB="$ROOT/ubuntu/root/.local/lib/mcl-detached-owner-runtime"

[ -f "$SERVICE/run" ] && [ ! -L "$SERVICE/run" ] && [ -x "$SERVICE/run" ]
[ -f "$SERVICE/down" ] && [ ! -L "$SERVICE/down" ]
[ -f "$CLIENT" ] && [ ! -L "$CLIENT" ] && [ -x "$CLIENT" ]
[ -f "$LIB/mcl-detached-owner-runtime.cjs" ] && [ ! -L "$LIB/mcl-detached-owner-runtime.cjs" ]
[ -f "$LIB/mcl-detached-owner-runtime-service.cjs" ] && [ ! -L "$LIB/mcl-detached-owner-runtime-service.cjs" ]

grep -Fq '# mcl-detached-owner-runtime:v1' "$SERVICE/run"
grep -Fq 'proot-distro" login ubuntu' "$SERVICE/run"
grep -Fq '/root/.local/lib/mcl-detached-owner-runtime/mcl-detached-owner-runtime-service.cjs' "$SERVICE/run"
grep -Fq '/root/.local/lib/mcl-detached-owner-runtime/mcl-detached-owner-runtime.cjs' "$CLIENT"
! grep -Eq 'https?://|[[:space:]]--port[[:space:]]|[[:space:]]-p[[:space:]]' "$SERVICE/run"

before=$(sha256sum "$SERVICE/down" | awk '{print $1}')
set +e
activate=$("$INSTALL" --activate 2>&1)
activate_rc=$?
set -e
[ "$activate_rc" -eq 2 ]
printf '%s\n' "$activate" | grep -Fq 'BLOCKED test mode cannot activate service'
[ -f "$SERVICE/down" ]
after=$(sha256sum "$SERVICE/down" | awk '{print $1}')
[ "$before" = "$after" ]

printf '%s\n' 'detached owner runtime install contract: PASS'
