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
printf '%s
' "$wrong" | grep -Fq 'BLOCKED source repository layout invalid'

set +e
first=$("$INSTALL" --check 2>&1)
first_rc=$?
set -e
[ "$first_rc" -eq 1 ]
printf '%s
' "$first" | grep -Fq 'result=missing'
[ ! -e "$ROOT/prefix/var/service/mcl-detached-owner-runtime" ]

"$INSTALL" --apply > "$ROOT/apply.out"
grep -Fq 'schema=mcl-detached-owner-runtime-install.v2' "$ROOT/apply.out"
grep -Fq 'support_bundle=present' "$ROOT/apply.out"
grep -Fq 'result=pass' "$ROOT/apply.out"
grep -Fq 'runtime_started=false' "$ROOT/apply.out"

"$INSTALL" --check > "$ROOT/check.out"
grep -Fq 'result=pass' "$ROOT/check.out"
grep -Fq 'support_bundle=present' "$ROOT/check.out"
grep -Fq 'activation=disabled' "$ROOT/check.out"

SERVICE="$ROOT/prefix/var/service/mcl-detached-owner-runtime"
CLIENT="$ROOT/ubuntu/root/.local/bin/mcl-detached-owner-runtime"
LIB="$ROOT/ubuntu/root/.local/lib/mcl-detached-owner-runtime"
SUPPORT="$LIB/repository"
RUNTIME_JS="$SUPPORT/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime.cjs"
SERVICE_JS="$SUPPORT/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime-service.cjs"
POLICY="$SUPPORT/.github/plugin-control-plane/canonical-main/work-system/policy.json"

[ -f "$SERVICE/run" ] && [ ! -L "$SERVICE/run" ] && [ -x "$SERVICE/run" ]
[ -f "$SERVICE/down" ] && [ ! -L "$SERVICE/down" ]
[ -f "$CLIENT" ] && [ ! -L "$CLIENT" ] && [ -x "$CLIENT" ]
[ -d "$SUPPORT" ] && [ ! -L "$SUPPORT" ]
[ -z "$(find "$SUPPORT" -type l -print -quit)" ]
[ "$(find "$SUPPORT" -type f | wc -l)" -eq 22 ]

for file in $(find "$SUPPORT" -type f -print); do
  [ "$(stat -c '%a' "$file")" = 600 ]
done

grep -Fq '# mcl-detached-owner-runtime:v1' "$SERVICE/run"
grep -Fq 'proot-distro" login ubuntu' "$SERVICE/run"
grep -Fq '/root/.local/lib/mcl-detached-owner-runtime/repository/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime-service.cjs' "$SERVICE/run"
grep -Fq '/root/.local/lib/mcl-detached-owner-runtime/repository/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime.cjs' "$CLIENT"
! grep -Fq '/root/nyang-repo' "$INSTALL"
! grep -Fq 'NODE_PATH' "$INSTALL"
! grep -Eq 'cp[[:space:]]+(-R|-r|--recursive)' "$INSTALL"
! grep -Eq 'https?://|[[:space:]]--port[[:space:]]|[[:space:]]-p[[:space:]]' "$SERVICE/run"

node -e "'use strict'; require(process.argv[1]); require(process.argv[2]);" "$RUNTIME_JS" "$SERVICE_JS"
[ ! -e "$ROOT/ubuntu/root/.local/run/mcl-detached-owner-runtime/control.sock" ]

printf '%s
' '{"tampered":true}' > "$POLICY"
chmod 600 "$POLICY"
set +e
tampered=$("$INSTALL" --check 2>&1)
tampered_rc=$?
set -e
[ "$tampered_rc" -eq 1 ]
printf '%s
' "$tampered" | grep -Fq 'support_bundle=missing'

"$INSTALL" --apply > "$ROOT/reapply.out"
grep -Fq 'support_bundle=present' "$ROOT/reapply.out"
"$INSTALL" --check > "$ROOT/recheck.out"
grep -Fq 'result=pass' "$ROOT/recheck.out"
node -e "'use strict'; require(process.argv[1]); require(process.argv[2]);" "$RUNTIME_JS" "$SERVICE_JS"

before=$(sha256sum "$SERVICE/down" | awk '{print $1}')
set +e
activate=$("$INSTALL" --activate 2>&1)
activate_rc=$?
set -e
[ "$activate_rc" -eq 2 ]
printf '%s
' "$activate" | grep -Fq 'BLOCKED test mode cannot activate service'
[ -f "$SERVICE/down" ]
after=$(sha256sum "$SERVICE/down" | awk '{print $1}')
[ "$before" = "$after" ]

printf '%s
' 'detached owner runtime install contract: PASS'
