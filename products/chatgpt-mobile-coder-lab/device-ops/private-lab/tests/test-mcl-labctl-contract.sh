#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
CTL="$HERE/mcl-labctl"
PREP="$HERE/experiments/rdc-session-rotation/prepare.sh"
PROBE="$HERE/experiments/rdc-session-rotation/probe.mjs"
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
write_receipt() {
  check=$1
  result=$2
  case "$MODE" in
    malformed)
      printf '%s\n' 'schema=mcl-private-check.v1' "check=$check" 'result=pass' 'details=withheld' 'extra=PRIVATE_LEAK' > "$RECEIPT" ;;
    oversize)
      printf '%s\n' 'schema=mcl-private-check.v1' "check=$check" 'result=pass' 'details=withheld' > "$RECEIPT"
      dd if=/dev/zero bs=300 count=1 2>/dev/null | tr '\0' X >> "$RECEIPT" ;;
    *)
      printf '%s\n' 'schema=mcl-private-check.v1' "check=$check" "result=$result" 'details=withheld' > "$RECEIPT" ;;
  esac
}
if [ "${5:-}" = /usr/bin/node ] && [ "${6:-}" = /opt/mcl-private-lab/vendor/rdc-session-rotation/probe.mjs ]; then
  echo 'PRIVATE_CHILD_STDOUT'
  echo 'PRIVATE_CHILD_STDERR' >&2
  case "$MODE" in
    pass) write_receipt rdc-rotation-repro pass; exit 0 ;;
    fail) write_receipt rdc-rotation-repro fail; exit 1 ;;
    malformed|oversize) write_receipt rdc-rotation-repro pass; exit 0 ;;
    blocked) rm -f "$RECEIPT"; exit 7 ;;
  esac
fi
script=${7:-}
case "$script" in
  *mcl-labctl:run-substrate-smoke:v1*)
    echo 'PRIVATE_CHILD_STDOUT'
    echo 'PRIVATE_CHILD_STDERR' >&2
    case "$MODE" in
      pass) write_receipt substrate-smoke pass; exit 0 ;;
      fail) write_receipt substrate-smoke fail; exit 1 ;;
      malformed|oversize) write_receipt substrate-smoke pass; exit 0 ;;
      blocked) rm -f "$RECEIPT"; exit 7 ;;
    esac ;;
  *mcl-labctl:read-receipt:v1*)
    [ -f "$RECEIPT" ] || exit 3
    bytes=$(wc -c < "$RECEIPT")
    [ "$bytes" -le 256 ] || exit 5
    cat "$RECEIPT"
    exit 0 ;;
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
  check=$1
  result=$2
  printf '%s\n' 'schema=mcl-private-check.v1' "check=$check" "result=$result" 'details=withheld'
}

make_fixture
if "$CTL" exec substrate-smoke >/dev/null 2>&1; then fail "unsupported action accepted"; fi
if "$CTL" run other-check >/dev/null 2>&1; then fail "unsupported check accepted"; fi
if "$CTL" run rdc-rotation-repro extra >/dev/null 2>&1; then fail "extra args accepted"; fi
[ ! -s "$LOG" ] || fail "rejected input invoked proot-distro"
ok "command surface rejects arbitrary action, check, and extra args"

out=$("$CTL" run substrate-smoke)
[ "$out" = "$(expected substrate-smoke pass)" ] || fail "substrate pass receipt mismatch"
printf '%s\n' "$out" | grep -Fq 'PRIVATE_CHILD' && fail "child output leaked"
ok "substrate run still emits only the fixed pass receipt"

grep -Fq 'login --isolated mcl-private-lab -- /bin/sh -lc' "$LOG" || fail "isolated entry missing"
! grep -Fq 'login mcl-private-lab' "$LOG" || fail "non-isolated entry used"
ok "runner uses only semantic isolated PRoot entry"

runs_before=$(grep -c 'mcl-labctl:run-substrate-smoke:v1' "$LOG")
out=$("$CTL" receipt substrate-smoke)
[ "$out" = "$(expected substrate-smoke pass)" ] || fail "stored receipt mismatch"
runs_after=$(grep -c 'mcl-labctl:run-substrate-smoke:v1' "$LOG")
[ "$runs_before" -eq "$runs_after" ] || fail "receipt reran substrate check"
ok "substrate receipt reads without rerunning the check"

make_fixture
export MOCK_MODE=fail
if out=$("$CTL" run substrate-smoke); then fail "fail result exited zero"; fi
[ "$out" = "$(expected substrate-smoke fail)" ] || fail "fail receipt mismatch"
ok "failed substrate check remains sanitized and nonzero"

make_fixture
export MOCK_MODE=malformed
if out=$("$CTL" run substrate-smoke); then fail "malformed receipt exited zero"; fi
[ "$out" = "$(expected substrate-smoke unknown)" ] || fail "malformed receipt was forwarded"
! printf '%s\n' "$out" | grep -Fq 'PRIVATE_LEAK' || fail "extra field leaked"
ok "extra or malformed receipt fails closed to fixed unknown"

make_fixture
export MOCK_MODE=oversize
if out=$("$CTL" run substrate-smoke); then fail "oversize receipt exited zero"; fi
[ "$out" = "$(expected substrate-smoke unknown)" ] || fail "oversize receipt was forwarded"
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
[ "$out" = "$(expected substrate-smoke manual_auth_required)" ] || fail "reserved result rejected structurally"
ok "validator keeps reserved manual-auth vocabulary without owning auth"

make_fixture
rm -f "$ROOT/proot-distro"
if out=$("$CTL" run substrate-smoke); then fail "missing controller dependency exited zero"; fi
[ "$out" = "$(expected substrate-smoke blocked)" ] || fail "missing dependency not classified blocked"
ok "missing PRoot controller fails closed to blocked"

make_fixture
export MOCK_MODE=blocked
if out=$("$CTL" run substrate-smoke); then fail "blocked transport exited zero"; fi
[ "$out" = "$(expected substrate-smoke blocked)" ] || fail "transport failure not classified blocked"
ok "isolated-entry failure is bounded to blocked"

make_fixture
out=$("$CTL" run rdc-rotation-repro)
[ "$out" = "$(expected rdc-rotation-repro pass)" ] || fail "rotation repro pass receipt mismatch"
printf '%s\n' "$out" | grep -Fq 'PRIVATE_CHILD' && fail "rotation child output leaked"
grep -Fq 'login --isolated mcl-private-lab -- /usr/bin/node /opt/mcl-private-lab/vendor/rdc-session-rotation/probe.mjs' "$LOG" || fail "fixed rotation probe path missing"
ok "rotation repro runs only the fixed probe and emits the sanitized pass receipt"

runs_before=$(grep -c '/usr/bin/node /opt/mcl-private-lab/vendor/rdc-session-rotation/probe.mjs' "$LOG")
out=$("$CTL" receipt rdc-rotation-repro)
[ "$out" = "$(expected rdc-rotation-repro pass)" ] || fail "rotation stored receipt mismatch"
runs_after=$(grep -c '/usr/bin/node /opt/mcl-private-lab/vendor/rdc-session-rotation/probe.mjs' "$LOG")
[ "$runs_before" -eq "$runs_after" ] || fail "rotation receipt reran probe"
ok "rotation receipt reads without rerunning the probe"

make_fixture
export MOCK_MODE=malformed
if out=$("$CTL" run rdc-rotation-repro); then fail "rotation malformed receipt exited zero"; fi
[ "$out" = "$(expected rdc-rotation-repro unknown)" ] || fail "rotation malformed receipt was forwarded"
ok "rotation receipt uses the same strict fail-closed validator"

! grep -Eq -- '--shared-home|--bind|-b[[:space:]]' "$CTL" || fail "host-sharing option present"
! grep -Eq '(^|[^A-Za-z])(eval|exec)[[:space:]]' "$CTL" || fail "generic executor primitive present"
! grep -Eq 'refresh[_-]?token|access[_-]?token|private[_-]?key|session[_-]?file' "$CTL" || fail "sensitive material owner present"
grep -Fq 'substrate-smoke|rdc-rotation-repro' "$CTL" || fail "fixed enum set missing"
grep -Fq 'login --isolated "$LAB_NAME" -- /usr/bin/node' "$CTL" || fail "fixed rotation isolated contract missing"
ok "controller source excludes generic execution, host sharing, and sensitive ownership"

# prepare.sh mock: no network, no real PRoot, fixed package/version only.
PROOT="$TMP/prepare"
mkdir -p "$PROOT"
PLOG="$PROOT/pd.log"
PSTATE="$PROOT/state"
PCAP="$PROOT/probe.capture"
printf '%s' missing > "$PSTATE"
: > "$PLOG"
cat > "$PROOT/proot-distro" <<'PMOCK'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "${MOCK_PREPARE_LOG:?}"
[ "$1" = login ] && [ "$2" = --isolated ] && [ "$3" = mcl-private-lab ] && [ "$4" = -- ] || exit 60
script=${7:-}
[ -z "$script" ] || printf '%s\n' "$script" | sh -n
case "$script" in
  *mcl-rdc-rotation-repro:check:v1*)
    if [ "$(cat "${MOCK_PREPARE_STATE:?}")" = present ]; then echo 'PRESENT vendor:0.2.50'; else echo 'MISSING vendor:0.2.50'; fi ;;
  *mcl-rdc-rotation-repro:stage-probe:v1*) cat > "${MOCK_PROBE_CAPTURE:?}" ;;
  *mcl-rdc-rotation-repro:install:v1*) printf '%s' present > "${MOCK_PREPARE_STATE:?}" ;;
  *) exit 61 ;;
esac
PMOCK
chmod 755 "$PROOT/proot-distro"
export MCL_ROTATION_PREPARE_TEST_MODE=1
export MCL_ROTATION_PREPARE_TEST_ROOT="$PROOT"
export MOCK_PREPARE_LOG="$PLOG"
export MOCK_PREPARE_STATE="$PSTATE"
export MOCK_PROBE_CAPTURE="$PCAP"
out=$("$PREP" --check)
[ "$out" = 'MISSING vendor:0.2.50' ] || fail "prepare check mismatch"
[ "$(grep -c 'mcl-rdc-rotation-repro:check:v1' "$PLOG")" -eq 1 ] || fail "prepare check was not read-only single call"
ok "prepare check is bounded and read-only under the mock"

out=$("$PREP" --apply)
[ "$out" = 'INSTALLED vendor:0.2.50' ] || fail "prepare apply mismatch"
cmp -s "$PROBE" "$PCAP" || fail "fixed probe content was not transferred exactly"
grep -Fq '@wonderwhy-er/desktop-commander@0.2.50' "$PLOG" || fail "pinned vendor package missing"
grep -Fq -- '--omit=dev --ignore-scripts --no-save' "$PLOG" || fail "narrow npm flags missing"
! grep -Eq -- '--shared-home|--bind|-b[[:space:]]' "$PLOG" || fail "prepare used host sharing"
ok "prepare apply mock proves fixed isolated probe transfer and pinned install contract"

if "$PREP" --apply extra >/dev/null 2>&1; then fail "prepare accepted extra args"; fi
if "$PREP" --other >/dev/null 2>&1; then fail "prepare accepted unsupported mode"; fi
ok "prepare surface rejects arbitrary modes and arguments"

sh -n "$CTL"
sh -n "$PREP"
sh -n "$0"
ok "shell syntax passes"

echo "1..$PASS"
