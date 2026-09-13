#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CTL="$HERE/mcl-labctl"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
PASS=0
ok() { PASS=$((PASS + 1)); echo "ok $PASS - $1"; }
fail() { echo "not ok - $1" >&2; exit 1; }

make_fixture() {
  ROOT="$TMP/root"
  LOG="$ROOT/pd.log"
  RECEIPT="$ROOT/receipt"
  rm -rf "$ROOT"
  mkdir -p "$ROOT"
  : > "$LOG"
  cat > "$ROOT/proot-distro" <<'MOCK'
#!/bin/sh
set -eu
LOG=${MOCK_PD_LOG:?}
RECEIPT=${MOCK_RECEIPT:?}
MODE=${MOCK_MODE:-pass}
printf '%s\n' "$*" >> "$LOG"
[ "$1" = login ] || exit 40
[ "$2" = --isolated ] || exit 41
[ "$3" = mcl-private-lab ] || exit 42
[ "$4" = -- ] || exit 43
script=${7:-}
case "$script" in
  *mcl-labctl:run-substrate-smoke:v1*)
    echo 'PRIVATE_CHILD_STDOUT'
    echo 'PRIVATE_CHILD_STDERR' >&2
    case "$MODE" in
      pass|fail)
        cat > "$RECEIPT" <<EOF
schema=mcl-private-check.v1
check=substrate-smoke
result=$MODE
details=withheld
EOF
        [ "$MODE" = pass ] && exit 0 || exit 1
        ;;
      malformed)
        cat > "$RECEIPT" <<EOF
schema=mcl-private-check.v1
check=substrate-smoke
result=pass
details=withheld
extra=PRIVATE_LEAK
EOF
        exit 0
        ;;
      oversize)
        printf 'schema=mcl-private-check.v1\ncheck=substrate-smoke\nresult=pass\ndetails=withheld\n' > "$RECEIPT"
        dd if=/dev/zero bs=300 count=1 2>/dev/null | tr '\0' X >> "$RECEIPT"
        exit 0
        ;;
      blocked) rm -f "$RECEIPT"; exit 7 ;;
    esac
    ;;
  *mcl-labctl:read-receipt:v1*)
    [ -f "$RECEIPT" ] || exit 3
    bytes=$(wc -c < "$RECEIPT")
    [ "$bytes" -le 256 ] || exit 5
    cat "$RECEIPT"
    exit 0
    ;;
  *) exit 44 ;;
esac
MOCK
  chmod 755 "$ROOT/proot-distro"
  export MCL_LABCTL_TEST_MODE=1
  export MCL_LABCTL_TEST_ROOT="$ROOT"
  export MOCK_PD_LOG="$LOG"
  export MOCK_RECEIPT="$RECEIPT"
  export MOCK_MODE=pass
}

expected() {
  printf '%s\n' \
    'schema=mcl-private-check.v1' \
    'check=substrate-smoke' \
    "result=$1" \
    'details=withheld'
}

make_fixture
if "$CTL" exec substrate-smoke >/dev/null 2>&1; then fail "unsupported action accepted"; fi
if "$CTL" run other-check >/dev/null 2>&1; then fail "unsupported check accepted"; fi
if "$CTL" run substrate-smoke extra >/dev/null 2>&1; then fail "extra args accepted"; fi
[ ! -s "$LOG" ] || fail "rejected input invoked proot-distro"
ok "command surface rejects arbitrary action, check, and extra args"

out=$("$CTL" run substrate-smoke)
[ "$out" = "$(expected pass)" ] || fail "pass receipt mismatch"
printf '%s\n' "$out" | grep -Fq 'PRIVATE_CHILD' && fail "child output leaked"
ok "run emits only the fixed pass receipt"

grep -Fq 'login --isolated mcl-private-lab -- /bin/sh -lc' "$LOG" || fail "isolated entry missing"
! grep -Fq 'login mcl-private-lab' "$LOG" || fail "non-isolated entry used"
ok "runner uses only semantic isolated PRoot entry"

runs_before=$(grep -c 'mcl-labctl:run-substrate-smoke:v1' "$LOG")
out=$("$CTL" receipt substrate-smoke)
[ "$out" = "$(expected pass)" ] || fail "stored receipt mismatch"
runs_after=$(grep -c 'mcl-labctl:run-substrate-smoke:v1' "$LOG")
[ "$runs_before" -eq "$runs_after" ] || fail "receipt reran the check"
ok "receipt reads without rerunning the check"

make_fixture
export MOCK_MODE=fail
if out=$("$CTL" run substrate-smoke); then fail "fail result exited zero"; fi
[ "$out" = "$(expected fail)" ] || fail "fail receipt mismatch"
! printf '%s\n' "$out" | grep -Fq 'PRIVATE_CHILD' || fail "fail child output leaked"
ok "failed substrate check remains sanitized and nonzero"

make_fixture
export MOCK_MODE=malformed
if out=$("$CTL" run substrate-smoke); then fail "malformed receipt exited zero"; fi
[ "$out" = "$(expected unknown)" ] || fail "malformed receipt was forwarded"
! printf '%s\n' "$out" | grep -Fq 'PRIVATE_LEAK' || fail "extra field leaked"
ok "extra or malformed receipt fails closed to fixed unknown"

make_fixture
export MOCK_MODE=oversize
if out=$("$CTL" run substrate-smoke); then fail "oversize receipt exited zero"; fi
[ "$out" = "$(expected unknown)" ] || fail "oversize receipt was forwarded"
[ "$(printf '%s' "$out" | wc -c | tr -d ' ')" -lt 256 ] || fail "oversize data leaked"
ok "oversize receipt is rejected before outward forwarding"

make_fixture
cat > "$RECEIPT" <<'EOF'
schema=mcl-private-check.v1
check=substrate-smoke
result=manual_auth_required
details=withheld
EOF
if out=$("$CTL" receipt substrate-smoke); then fail "reserved non-pass result exited zero"; fi
[ "$out" = "$(expected manual_auth_required)" ] || fail "reserved result rejected structurally"
ok "validator accepts reserved manual-auth enum without owning auth"

make_fixture
rm -f "$ROOT/proot-distro"
if out=$("$CTL" run substrate-smoke); then fail "missing controller dependency exited zero"; fi
[ "$out" = "$(expected blocked)" ] || fail "missing dependency not classified blocked"
ok "missing PRoot controller fails closed to blocked"

make_fixture
export MOCK_MODE=blocked
if out=$("$CTL" run substrate-smoke); then fail "blocked transport exited zero"; fi
[ "$out" = "$(expected blocked)" ] || fail "transport failure not classified blocked"
ok "isolated-entry failure is bounded to blocked"

! grep -Eq -- '--shared-home|--bind|-b[[:space:]]' "$CTL" || fail "host-sharing option present"
! grep -Eq '(^|[^A-Za-z])(eval|exec)[[:space:]]' "$CTL" || fail "generic executor primitive present"
! grep -Eq 'refresh[_-]?token|access[_-]?token|private[_-]?key|session[_-]?file' "$CTL" || fail "sensitive material owner present"
grep -Fq 'login --isolated "$LAB_NAME" -- /bin/sh -lc' "$CTL" || fail "isolated contract missing"
grep -Fq 'check=substrate-smoke' "$CTL" || fail "fixed check contract missing"
ok "source excludes generic execution, host sharing, and sensitive ownership"

sh -n "$CTL"
sh -n "$0"
ok "shell syntax passes"

echo "1..$PASS"
