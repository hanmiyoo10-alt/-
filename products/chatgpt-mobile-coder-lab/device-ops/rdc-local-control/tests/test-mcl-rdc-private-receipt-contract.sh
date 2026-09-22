#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
GATE="$HERE/mcl-rdc-private-receipt"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
PASS=0

ok() {
  PASS=$((PASS + 1))
  echo "ok $PASS - $1"
}

fail() {
  echo "not ok - $1" >&2
  exit 1
}

make_root() {
  ROOT="$TMP/$1"
  export ROOT
  RECEIPT="$ROOT/home/.local/share/mcl-private/receipts/s-termux-session-recovery.receipt"
  export RECEIPT
  mkdir -p "$(dirname "$RECEIPT")"
}

write_receipt() {
  result=$1
  printf '%s\n' \
    'schema=mcl-private-check.v1' \
    'check=s-termux-session-recovery' \
    "result=$result" \
    'details=withheld' >"$RECEIPT"
}

run_gate() {
  MCL_RDC_PRIVATE_RECEIPT_TEST_MODE=1 \
    MCL_RDC_PRIVATE_RECEIPT_TEST_ROOT="$ROOT" \
    sh "$GATE" "$@"
}

expected_receipt() {
  result=$1
  printf '%s\n' \
    'schema=mcl-private-check.v1' \
    'check=s-termux-session-recovery' \
    "result=$result" \
    'details=withheld'
}

assert_rejected_without_leak() {
  label=$1
  if run_gate >"$ROOT/out" 2>"$ROOT/err"; then
    fail "$label accepted"
  fi
  combined=$(cat "$ROOT/out" "$ROOT/err")
  if printf '%s\n' "$combined" | grep -Eq 'LEAK_ME|ACCESS_TOKEN|REFRESH_TOKEN|/private/secret'; then
    fail "$label leaked invalid receipt content"
  fi
}

make_root pass
write_receipt pass
out=$(run_gate 2>"$ROOT/err")
[ "$out" = "$(expected_receipt pass)" ] || fail "valid pass receipt output"
[ ! -s "$ROOT/err" ] || fail "valid pass receipt wrote stderr"
ok "valid receipt is normalized to the fixed four-line schema"

make_root enums
for result in pass fail blocked manual_auth_required unknown; do
  write_receipt "$result"
  out=$(run_gate 2>"$ROOT/err")
  [ "$out" = "$(expected_receipt "$result")" ] || fail "enum $result output"
  [ ! -s "$ROOT/err" ] || fail "enum $result wrote stderr"
done
ok "all five allowlisted result enums are accepted"

make_root wrongschema
printf '%s\n' \
  'schema=wrong.v1' \
  'check=s-termux-session-recovery' \
  'result=pass' \
  'details=withheld' >"$RECEIPT"
assert_rejected_without_leak "wrong schema"
[ "$(cat "$ROOT/err")" = 'BLOCKED private receipt invalid' ] || fail "wrong schema diagnostic"
ok "wrong schema fails closed"

make_root wrongcheck
printf '%s\n' \
  'schema=mcl-private-check.v1' \
  'check=other-check' \
  'result=pass' \
  'details=withheld' >"$RECEIPT"
assert_rejected_without_leak "wrong check"
ok "wrong check identity fails closed"

make_root malformed
printf '%s\n' \
  'check=s-termux-session-recovery' \
  'schema=mcl-private-check.v1' \
  'result=pass' \
  'details=withheld' >"$RECEIPT"
assert_rejected_without_leak "reordered receipt"

write_receipt pass
printf '%s\n' 'extra=LEAK_ME' >>"$RECEIPT"
assert_rejected_without_leak "extra field"

printf '%s\n' \
  'schema=mcl-private-check.v1' \
  'check=s-termux-session-recovery' \
  'result=LEAK_ME' \
  'details=withheld' >"$RECEIPT"
assert_rejected_without_leak "invalid result"

printf '%s\n' \
  'schema=mcl-private-check.v1' \
  'check=s-termux-session-recovery' \
  'result=pass' \
  'details=LEAK_ME' >"$RECEIPT"
assert_rejected_without_leak "free-form details"
ok "malformed order, extra fields, values, and free-form details fail closed"

make_root oversize
{
  printf '%s\n' \
    'schema=mcl-private-check.v1' \
    'check=s-termux-session-recovery' \
    'result=pass' \
    'details=withheld'
  printf '%0300d\n' 0
} >"$RECEIPT"
assert_rejected_without_leak "oversize receipt"
ok "oversize content fails closed"

make_root symlink
TARGET="$ROOT/private-source"
write_receipt pass
mv "$RECEIPT" "$TARGET"
ln -s "$TARGET" "$RECEIPT"
assert_rejected_without_leak "symlink receipt"
ok "symlink receipt is rejected"

make_root missing
assert_rejected_without_leak "missing receipt"
[ "$(cat "$ROOT/err")" = 'BLOCKED private receipt unavailable' ] || fail "missing diagnostic"
ok "missing receipt fails closed without exposing a path"

make_root injected
printf '%s\n' \
  'schema=mcl-private-check.v1' \
  'check=s-termux-session-recovery' \
  'result=pass' \
  'details=ACCESS_TOKEN=LEAK_ME' >"$RECEIPT"
assert_rejected_without_leak "token-like material"
ok "token-like injected material is rejected without echo"

make_root args
write_receipt pass
if run_gate "$ROOT/private/secret" >"$ROOT/out" 2>"$ROOT/err"; then
  fail "arbitrary path argument accepted"
fi
[ "$(cat "$ROOT/err")" = 'BLOCKED unsupported command' ] || fail "argument diagnostic"
if grep -Fq "$ROOT" "$ROOT/out" "$ROOT/err"; then fail "argument path leaked"; fi
ok "gateway accepts no command or path arguments"

make_root readonly
write_receipt pass
before=$(sha256sum "$RECEIPT")
run_gate >/dev/null
after=$(sha256sum "$RECEIPT")
[ "$before" = "$after" ] || fail "gateway mutated receipt"
ok "valid receipt consumption is content-read-only"

if grep -Eiq 'device[.]json|refresh[ _-]?token|access[ _-]?token|private[ _-]?log|process[ _-]?env|browser|tailnet|ssh[ _-]?key|provider[ _-]?payload' "$GATE"; then
  fail "gateway references forbidden sensitive surfaces"
fi
if grep -Eq 'sv[[:space:]]+(up|down|restart)|(^|[;&|[:space:]])(touch|mkdir|cp|mv|rm|chmod|chown|install|npm|pkg|apt|git|proot-distro)([;&|[:space:]]|$)' "$GATE"; then
  fail "gateway contains forbidden mutation surface"
fi
if grep -Eq '(^|[;&|[:space:]])(sh|bash|node|python|perl|ruby)[[:space:]]+-c' "$GATE"; then
  fail "gateway contains generic execution surface"
fi
ok "gateway source excludes sensitive inspection, mutation, and generic execution"

printf '1..%s\n' "$PASS"
