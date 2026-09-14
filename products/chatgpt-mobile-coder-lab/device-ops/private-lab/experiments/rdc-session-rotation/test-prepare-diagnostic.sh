#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PREP="$HERE/prepare.sh"
PROBE="$HERE/probe.mjs"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
PASS=0
ok() { PASS=$((PASS + 1)); echo "ok $PASS - $1"; }
fail() { echo "not ok - $1" >&2; exit 1; }

ROOT="$TMP/mock"
LABROOT="$ROOT/lab"
LOG="$ROOT/pd.log"
mkdir -p "$ROOT"
cat > "$ROOT/proot-distro" <<'MOCK'
#!/bin/sh
set -eu
LOG=${MOCK_DIAG_LOG:?}
LABROOT=${MOCK_LAB_ROOT:?}
MODE=${MOCK_DIAG_MODE:-pass}
printf '%s\n' "$*" >> "$LOG"
[ "$1" = login ] && [ "$2" = --isolated ] && [ "$3" = mcl-private-lab ] && [ "$4" = -- ] || exit 60
script=${7:-}
case "$script" in
  *mcl-rdc-rotation-repro:lab-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != lab_fail ] ;;
  *mcl-rdc-rotation-repro:inspect-stage:v1*|*mcl-rdc-rotation-repro:cleanup-stage:v1*)
    mapped=$(printf '%s\n' "$script" | sed "s#/opt/mcl-private-lab#$LABROOT/opt/mcl-private-lab#g")
    sh -c "$mapped" ;;
  *mcl-rdc-rotation-repro:npm-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != npm_fail ] ;;
  *mcl-rdc-rotation-repro:network-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != network_fail ] ;;
  *mcl-rdc-rotation-repro:package-probe:v1*)
    echo PRIVATE_CHILD_STDOUT
    echo PRIVATE_CHILD_STDERR >&2
    [ "$MODE" != package_fail ] ;;
  *) exit 61 ;;
esac
MOCK
chmod 755 "$ROOT/proot-distro"
export MCL_ROTATION_PREPARE_TEST_MODE=1
export MCL_ROTATION_PREPARE_TEST_ROOT="$ROOT"
export MOCK_DIAG_LOG="$LOG"
export MOCK_LAB_ROOT="$LABROOT"
export MOCK_DIAG_MODE=pass

reset_lab() {
  rm -rf "$LABROOT"
  mkdir -p "$LABROOT/opt/mcl-private-lab/vendor"
  : > "$LOG"
  export MOCK_DIAG_MODE=pass
}
stage_path() { printf '%s' "$LABROOT/opt/mcl-private-lab/vendor/.rdc-session-rotation-stage"; }
target_path() { printf '%s' "$LABROOT/opt/mcl-private-lab/vendor/rdc-session-rotation"; }
legacy_stage() { s=$(stage_path); mkdir -p "$s"; cp "$PROBE" "$s/probe.mjs"; }
marked_stage() { legacy_stage; printf '%s\n' 'mcl-rdc-rotation-stage:v1' > "$(stage_path)/.mcl-rdc-rotation-stage-v1"; }
expected_diag() {
  printf '%s\n' \
    'schema=mcl-private-prepare-diagnostic.v1' \
    'check=rdc-rotation-prepare' \
    "result=$1" \
    "class=$2" \
    "staging=$3" \
    'details=withheld'
}

reset_lab
export MCL_ROTATION_PREPARE_TEST_VALIDATE=1
export MCL_ROTATION_PREPARE_TEST_CANDIDATE="$(expected_diag pass ready none)"
out=$("$PREP")
[ "$out" = "$(expected_diag pass ready none)" ] || fail "valid diagnostic rejected"
for bad in \
  "$(expected_diag pass ready none)\nextra=leak" \
  "schema=mcl-private-prepare-diagnostic.v1\ncheck=rdc-rotation-prepare\nresult=pass\nclass=ready\nclass=ready\nstaging=none\ndetails=withheld" \
  "schema=mcl-private-prepare-diagnostic.v1\ncheck=rdc-rotation-prepare\nresult=pass\nclass=freeform-error\nstaging=none\ndetails=withheld" \
  "schema=mcl-private-prepare-diagnostic.v1\ncheck=rdc-rotation-prepare\nresult=pass\nclass=ready\nstaging=none"; do
  export MCL_ROTATION_PREPARE_TEST_CANDIDATE=$(printf '%b' "$bad")
  if out=$("$PREP"); then fail "malformed diagnostic accepted"; fi
  [ -z "$out" ] || fail "malformed diagnostic leaked outward"
done
unset MCL_ROTATION_PREPARE_TEST_VALIDATE MCL_ROTATION_PREPARE_TEST_CANDIDATE
ok "strict diagnostic validator accepts only the six-field enum schema"

reset_lab
out=$("$PREP" --diagnose)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "empty-stage diagnose mismatch"
printf '%s\n' "$out" | grep -Fq PRIVATE_CHILD && fail "child output leaked"
! grep -Fq 'mcl-rdc-rotation-repro:install:v1' "$LOG" || fail "diagnose attempted install"
ok "diagnose reports ready without installing or forwarding child output"

reset_lab
legacy_stage
out=$("$PREP" --diagnose)
[ "$out" = "$(expected_diag pass ready cleanup_eligible)" ] || fail "legacy stage not eligible"
ok "exact legacy one-file stage is cleanup eligible by content identity"

reset_lab
marked_stage
out=$("$PREP" --diagnose)
[ "$out" = "$(expected_diag pass ready cleanup_eligible)" ] || fail "marked stage not eligible"
ok "future exact marked stage is cleanup eligible"

reset_lab
mkdir -p "$LABROOT/elsewhere"
ln -s "$LABROOT/elsewhere" "$(stage_path)"
if out=$("$PREP" --diagnose); then fail "symlink stage exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "symlink stage classification mismatch"
ok "symlink staging fails closed"

reset_lab
legacy_stage
printf x > "$(stage_path)/extra"
if out=$("$PREP" --diagnose); then fail "extra file exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "extra file classification mismatch"
ok "unexpected extra file makes staging conflict"

reset_lab
legacy_stage
mkdir "$(stage_path)/extra-dir"
if out=$("$PREP" --diagnose); then fail "extra dir exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "extra dir classification mismatch"
ok "unexpected subdirectory makes staging conflict"

reset_lab
legacy_stage
printf '%s\n' wrong > "$(stage_path)/probe.mjs"
if out=$("$PREP" --diagnose); then fail "wrong probe exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "wrong probe classification mismatch"
ok "wrong probe bytes fail exact ownership proof"

reset_lab
mkdir -p "$(target_path)"
if out=$("$PREP" --diagnose); then fail "target-present diagnose exited zero"; fi
[ "$out" = "$(expected_diag blocked target_conflict conflict)" ] || fail "target-present classification mismatch"
ok "existing target blocks diagnostic cleanup ownership"

reset_lab
export MOCK_DIAG_MODE=npm_fail
if out=$("$PREP" --diagnose); then fail "npm failure exited zero"; fi
[ "$out" = "$(expected_diag blocked npm_unavailable none)" ] || fail "npm class mismatch"
ok "npm availability is a fixed coarse class"

reset_lab
export MOCK_DIAG_MODE=network_fail
if out=$("$PREP" --diagnose); then fail "network failure exited zero"; fi
[ "$out" = "$(expected_diag blocked network_unavailable none)" ] || fail "network class mismatch"
ok "network availability is classified without raw output"

reset_lab
export MOCK_DIAG_MODE=package_fail
if out=$("$PREP" --diagnose); then fail "package failure exited zero"; fi
[ "$out" = "$(expected_diag blocked package_unavailable none)" ] || fail "package class mismatch"
ok "package availability is classified without package-manager logs"

reset_lab
export MOCK_DIAG_MODE=lab_fail
if out=$("$PREP" --diagnose); then fail "lab failure exited zero"; fi
[ "$out" = "$(expected_diag blocked lab_unavailable conflict)" ] || fail "lab class mismatch"
ok "unavailable isolated lab fails closed without staging claims"

reset_lab
legacy_stage
out=$("$PREP" --cleanup)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "legacy cleanup receipt mismatch"
[ ! -e "$(stage_path)" ] && [ ! -L "$(stage_path)" ] || fail "legacy stage not removed"
[ ! -e "$(target_path)" ] || fail "cleanup created target"
! grep -Fq 'mcl-rdc-rotation-repro:install:v1' "$LOG" || fail "cleanup attempted install"
ok "cleanup removes only exact legacy packet-owned stage"

reset_lab
marked_stage
out=$("$PREP" --cleanup)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "marked cleanup receipt mismatch"
[ ! -e "$(stage_path)" ] || fail "marked stage not removed"
ok "cleanup removes exact future marked stage"

reset_lab
legacy_stage
printf x > "$(stage_path)/extra"
if out=$("$PREP" --cleanup); then fail "conflicting cleanup exited zero"; fi
[ "$out" = "$(expected_diag blocked stage_conflict conflict)" ] || fail "conflicting cleanup receipt mismatch"
[ -e "$(stage_path)/extra" ] || fail "conflicting stage was mutated"
ok "cleanup preserves staging when exact ownership is not proven"

reset_lab
out=$("$PREP" --cleanup)
[ "$out" = "$(expected_diag pass ready none)" ] || fail "absent cleanup receipt mismatch"
ok "cleanup is idempotent when staging is absent"

if "$PREP" --diagnose extra >/dev/null 2>&1; then fail "diagnose accepted extra args"; fi
if "$PREP" --cleanup extra >/dev/null 2>&1; then fail "cleanup accepted extra args"; fi
if "$PREP" --arbitrary >/dev/null 2>&1; then fail "unsupported mode accepted"; fi
! grep -Eq -- '--shared-home|--bind|-b[[:space:]]' "$PREP" || fail "host sharing present"
! grep -Eq '(^|[^A-Za-z])(eval|exec)[[:space:]]' "$PREP" || fail "generic executor present"
grep -Fq "PACKAGE='@wonderwhy-er/desktop-commander'" "$PREP" || fail "fixed package constant missing"
grep -Fq "VERSION='0.2.50'" "$PREP" || fail "fixed version constant missing"
grep -Fq 'mcl-rdc-rotation-stage:v1' "$PREP" || fail "future stage ownership marker missing"
grep -Fq '/usr/bin/npm ping --silent >/dev/null 2>&1' "$PREP" || fail "network probe not output-suppressed"
grep -Fq '/usr/bin/npm view "@wonderwhy-er/desktop-commander@0.2.50" version --silent >/dev/null 2>&1' "$PREP" || fail "package probe not output-suppressed"
sh -n "$PREP"
sh -n "$0"
ok "surface remains fixed, isolated, output-bounded, and shell-valid"

echo "1..$PASS"
