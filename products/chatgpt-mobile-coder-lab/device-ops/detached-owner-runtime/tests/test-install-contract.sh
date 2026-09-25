#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
INSTALL="$HERE/install-s-termux.sh"
ROOT=$(mktemp -d)
WRONG=$(mktemp -d)
trap 'rm -rf "$ROOT" "$WRONG"' EXIT HUP INT TERM

export MCL_DETACHED_RUNTIME_TEST_MODE=1
export MCL_DETACHED_RUNTIME_TEST_ROOT="$ROOT"

cp "$INSTALL" "$WRONG/install-s-termux.sh"
chmod 700 "$WRONG/install-s-termux.sh"
set +e
wrong=$("$WRONG/install-s-termux.sh" --check 2>&1)
wrong_rc=$?
set -e
[ "$wrong_rc" -eq 1 ]
printf '%s\n' "$wrong" | grep -Fq 'BLOCKED source repository layout invalid'

set +e
first=$("$INSTALL" --check 2>&1)
first_rc=$?
set -e
[ "$first_rc" -eq 1 ]
printf '%s\n' "$first" | grep -Fq 'schema=mcl-detached-owner-runtime-install.v3'
printf '%s\n' "$first" | grep -Fq 'result=missing'
[ ! -e "$ROOT/prefix/var/service/mcl-detached-owner-runtime" ]

"$INSTALL" --apply > "$ROOT/apply.out"
grep -Fq 'schema=mcl-detached-owner-runtime-install.v3' "$ROOT/apply.out"
grep -Fq 'support_bundle=present' "$ROOT/apply.out"
grep -Fq 'host_front=present' "$ROOT/apply.out"
grep -Fq 'client=present' "$ROOT/apply.out"
grep -Fq 'control_dir=present' "$ROOT/apply.out"
grep -Fq 'service=present' "$ROOT/apply.out"
grep -Fq 'activation=disabled' "$ROOT/apply.out"
grep -Fq 'socket=absent' "$ROOT/apply.out"
grep -Fq 'result=pass' "$ROOT/apply.out"
grep -Fq 'runtime_started=false' "$ROOT/apply.out"

"$INSTALL" --check > "$ROOT/check.out"
grep -Fq 'result=pass' "$ROOT/check.out"
grep -Fq 'support_bundle=present' "$ROOT/check.out"
grep -Fq 'host_front=present' "$ROOT/check.out"
grep -Fq 'activation=disabled' "$ROOT/check.out"
grep -Fq 'socket=absent' "$ROOT/check.out"

SERVICE="$ROOT/prefix/var/service/mcl-detached-owner-runtime"
HOST_LIB="$ROOT/home/.local/lib/mcl-detached-owner-runtime"
HOST_BIN="$ROOT/home/.local/bin"
HOST_RUN="$ROOT/home/.local/run/mcl-detached-owner-runtime"
HOST_JS="$HOST_LIB/mcl-detached-owner-runtime-host.cjs"
CLIENT="$HOST_BIN/mcl-detached-owner-runtime"
LIB="$ROOT/ubuntu/root/.local/lib/mcl-detached-owner-runtime"
SUPPORT="$LIB/repository"
RUNTIME_JS="$SUPPORT/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime.cjs"
SERVICE_JS="$SUPPORT/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime-service.cjs"
POLICY="$SUPPORT/.github/plugin-control-plane/canonical-main/work-system/policy.json"

[ -f "$SERVICE/run" ] && [ ! -L "$SERVICE/run" ] && [ -x "$SERVICE/run" ]
[ -f "$SERVICE/down" ] && [ ! -L "$SERVICE/down" ]
[ "$(stat -c '%a' "$SERVICE/down")" = 600 ]
[ -f "$CLIENT" ] && [ ! -L "$CLIENT" ] && [ -x "$CLIENT" ]
[ -f "$HOST_JS" ] && [ ! -L "$HOST_JS" ]
[ "$(stat -c '%a' "$HOST_JS")" = 600 ]
[ -d "$HOST_LIB" ] && [ ! -L "$HOST_LIB" ] && [ "$(stat -c '%a' "$HOST_LIB")" = 700 ]
[ -d "$HOST_RUN" ] && [ ! -L "$HOST_RUN" ] && [ "$(stat -c '%a' "$HOST_RUN")" = 700 ]
[ -d "$SUPPORT" ] && [ ! -L "$SUPPORT" ]
[ -z "$(find "$SUPPORT" -type l -print -quit)" ]
[ "$(find "$SUPPORT" -type f | wc -l)" -eq 22 ]

for file in $(find "$SUPPORT" -type f -print); do
  [ "$(stat -c '%a' "$file")" = 600 ]
done

grep -Fq '# mcl-detached-owner-runtime:v1' "$SERVICE/run"
grep -Fq 'MCL_DETACHED_HOST_FRONT_V1=1' "$SERVICE/run"
grep -Fq '"$PREFIX/bin/setsid" "$PREFIX/bin/node"' "$SERVICE/run"
grep -Fq '/data/data/com.termux/files/home/.local/lib/mcl-detached-owner-runtime/mcl-detached-owner-runtime-host.cjs' "$SERVICE/run"
! grep -Fq 'proot-distro' "$SERVICE/run"
grep -Fq '/data/data/com.termux/files/home/.local/lib/mcl-detached-owner-runtime/mcl-detached-owner-runtime-host.cjs' "$CLIENT"

grep -Fq '// mcl-detached-owner-runtime-host:v1' "$HOST_JS"
grep -Fq 'allowHalfOpen: true' "$HOST_JS"
grep -Fq "MCL_DETACHED_PREPARE_ONLY_V1=1" "$HOST_JS"
grep -Fq "MCL_DETACHED_STDIO_WORKER_V1=1" "$HOST_JS"
grep -Fq "/data/data/com.termux/files/usr/bin/proot-distro" "$HOST_JS"
grep -Fq "/data/data/com.termux/files/home/.local/run/mcl-detached-owner-runtime/control.sock" "$HOST_JS"
! grep -Fq "require('node:http')" "$HOST_JS"
! grep -Fq "require('node:https')" "$HOST_JS"
! grep -Eq '[.]listen[(][[:space:]]*[0-9]' "$HOST_JS"

! grep -Fq '/root/nyang-repo' "$INSTALL"
! grep -Fq 'NODE_PATH' "$INSTALL"
! grep -Eq 'cp[[:space:]]+(-R|-r|--recursive)' "$INSTALL"

node -e "'use strict'; require(process.argv[1]); require(process.argv[2]); require(process.argv[3]);" "$RUNTIME_JS" "$SERVICE_JS" "$HOST_JS"
[ ! -e "$HOST_RUN/control.sock" ]
[ ! -e "$ROOT/ubuntu/root/.local/run/mcl-detached-owner-runtime/control.sock" ]

printf '%s\n' '{"tampered":true}' > "$POLICY"
chmod 600 "$POLICY"
set +e
tampered=$("$INSTALL" --check 2>&1)
tampered_rc=$?
set -e
[ "$tampered_rc" -eq 1 ]
printf '%s\n' "$tampered" | grep -Fq 'support_bundle=missing'

"$INSTALL" --apply > "$ROOT/reapply.out"
grep -Fq 'support_bundle=present' "$ROOT/reapply.out"
"$INSTALL" --check > "$ROOT/recheck.out"
grep -Fq 'result=pass' "$ROOT/recheck.out"

printf '%s\n' '// managed-byte-drift' >> "$HOST_JS"
chmod 600 "$HOST_JS"
set +e
host_tampered=$("$INSTALL" --check 2>&1)
host_tampered_rc=$?
set -e
[ "$host_tampered_rc" -eq 1 ]
printf '%s\n' "$host_tampered" | grep -Fq 'host_front=missing'
"$INSTALL" --apply > "$ROOT/reapply-host.out"
grep -Fq 'host_front=present' "$ROOT/reapply-host.out"

node -e "'use strict'; require(process.argv[1]); require(process.argv[2]); require(process.argv[3]);" "$RUNTIME_JS" "$SERVICE_JS" "$HOST_JS"
[ ! -e "$HOST_RUN/control.sock" ]

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

printf '%s\n' 'detached owner runtime split install contract: PASS'
