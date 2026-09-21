#!/bin/sh
set -eu

TEST_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$TEST_DIR/.." && pwd)
SOURCE="$ROOT/mcl-env-status"
TMP=$(mktemp -d)
OPS="$TMP/device-ops"
BIN="$TMP/bin"
STATE="$TMP/state"
mkdir -p "$OPS/m-family-status" "$OPS/m-termux-operator" "$OPS/private-lab" "$OPS/vm-lab" "$BIN" "$STATE"
cp "$SOURCE" "$OPS/m-family-status/mcl-env-status"
chmod +x "$OPS/m-family-status/mcl-env-status"
STATUS="$OPS/m-family-status/mcl-env-status"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }
assert_contains() { printf '%s\n' "$1" | grep -F "$2" >/dev/null || fail "missing: $2"; }
assert_not_contains() { ! printf '%s\n' "$1" | grep -F "$2" >/dev/null || fail "unexpected: $2"; }
set_state() { printf '%s\n' "$2" > "$STATE/$1"; }
mode() { cat "$STATE/$1"; }
cat > "$OPS/m-termux-operator/bootstrap.sh" <<'SH'
#!/bin/sh
case "$(cat "$MCL_STATUS_TEST_STATE/host")" in
  pass)
    echo 'PRESENT tool:rg package:ripgrep'
    echo 'PRESENT tool:jq package:jq'
    echo 'PRESENT tool:file package:file'
    exit 0 ;;
  missing)
    echo 'MISSING tool:rg package:ripgrep'
    echo 'PRESENT tool:jq package:jq'
    echo 'PRESENT tool:file package:file'
    exit 1 ;;
  blocked) echo 'BLOCKED package-manager:unavailable'; exit 2 ;;
  malformed) echo 'SECRET_CHILD_MARKER' >&2; exit 2 ;;
esac
SH
chmod +x "$OPS/m-termux-operator/bootstrap.sh"

cat > "$OPS/private-lab/verify.sh" <<'SH'
#!/bin/sh
case "$(cat "$MCL_STATUS_TEST_STATE/private")" in
  pass) echo 'PASS private-lab:mcl-private-lab'; exit 0 ;;
  fail) exit 1 ;;
  malformed) echo 'PRIVATE_RAW_MARKER'; exit 1 ;;
esac
SH
chmod +x "$OPS/private-lab/verify.sh"
cat > "$OPS/private-lab/analysis-profile.sh" <<'SH'
#!/bin/sh
case "$(cat "$MCL_STATUS_TEST_STATE/analysis")" in
  pass)
    echo 'PRESENT tool:rg package:ripgrep'
    echo 'PRESENT tool:jq package:jq'
    echo 'PRESENT tool:file package:file'
    exit 0 ;;
  missing)
    echo 'PRESENT tool:rg package:ripgrep'
    echo 'MISSING tool:jq package:jq'
    echo 'PRESENT tool:file package:file'
    exit 0 ;;
  blocked) echo 'BLOCKED package-command-mismatch'; exit 1 ;;
  malformed) echo 'ANALYSIS_RAW_MARKER'; exit 0 ;;
esac
SH
chmod +x "$OPS/private-lab/analysis-profile.sh"

cat > "$OPS/vm-lab/bootstrap.sh" <<'SH'
#!/bin/sh
case "$(cat "$MCL_STATUS_TEST_STATE/vm")" in
  prepared)
    echo 'PRESENT vm-root:mcl-vm-lab'
    echo 'PRESENT package:qemu-system-aarch64-headless'
    echo 'PRESENT package:qemu-utils'
    echo 'PRESENT guest-image:alpine-virt-3.24.1-aarch64'
    echo 'PRESENT disk:mcl-vm-lab.qcow2'
    echo 'PRESENT uefi-vars:mcl-vm-lab'
    exit 0 ;;
  not_prepared)
    echo 'MISSING vm-root:mcl-vm-lab'
    echo 'MISSING package:qemu-system-aarch64-headless'
    echo 'MISSING package:qemu-utils'
    echo 'MISSING guest-image:alpine-virt-3.24.1-aarch64'
    echo 'MISSING disk:mcl-vm-lab.qcow2'
    echo 'MISSING uefi-vars:mcl-vm-lab'
    exit 0 ;;
  blocked) echo 'BLOCKED ownership-conflict'; exit 1 ;;
  malformed) echo 'VM_RAW_MARKER'; exit 0 ;;
esac
SH
chmod +x "$OPS/vm-lab/bootstrap.sh"

cat > "$OPS/vm-lab/verify.sh" <<'SH'
#!/bin/sh
printf '%s\n' called >> "$MCL_STATUS_TEST_STATE/admission_log"
case "$(cat "$MCL_STATUS_TEST_STATE/admission")" in
  pass) echo 'PASS vm-lab-prepared'; echo 'PASS boot-admission'; exit 0 ;;
  blocked) echo 'PASS vm-lab-prepared'; echo 'BLOCKED resource-floor' >&2; exit 1 ;;
  unknown) echo 'PASS vm-lab-prepared'; echo 'UNKNOWN resource-admission' >&2; exit 2 ;;
  malformed) echo 'ADMISSION_RAW_MARKER'; exit 2 ;;
esac
SH
chmod +x "$OPS/vm-lab/verify.sh"
cat > "$BIN/proot-distro" <<'SH'
#!/bin/sh
case "$(cat "$MCL_STATUS_TEST_STATE/ubuntu")" in
  pass) exit 0 ;;
  unavailable) exit 1 ;;
  noisy) echo 'UBUNTU_RAW_MARKER' >&2; exit 0 ;;
esac
SH
chmod +x "$BIN/proot-distro"

reset_state() {
  set_state host pass
  set_state ubuntu pass
  set_state private pass
  set_state analysis pass
  set_state vm not_prepared
  set_state admission pass
  : > "$STATE/admission_log"
}
run_status() {
  set +e
  OUT=$(MCL_STATUS_TEST_STATE="$STATE" PATH="$BIN:$PATH" "$STATUS" status 2>&1)
  RUN_RC=$?
  set -e
}
assert_rc() { [ "$RUN_RC" -eq "$1" ] || fail "expected rc=$1 got $RUN_RC: $OUT"; }
assert_field() { printf '%s\n' "$OUT" | grep -Fx "$1" >/dev/null || fail "missing field: $1"; }
printf 'TEST non-vm-ready-receipt\n'
reset_state
run_status
assert_rc 0
expected='schema=mcl-m-family-status.v1
host_operator_profile=pass
ordinary_ubuntu_login=pass
private_lab_substrate=pass
private_lab_analysis=pass
vm_lab=not_prepared
vm_admission=not_ready
details=withheld'
[ "$OUT" = "$expected" ] || fail "unexpected receipt: $OUT"
[ ! -s "$STATE/admission_log" ] || fail 'admission ran for unprepared VM'
printf 'PASS non-vm-ready-receipt\n'

printf 'TEST prepared-admission-pass\n'
reset_state
set_state vm prepared
run_status
assert_rc 0
assert_field 'vm_lab=prepared'
assert_field 'vm_admission=pass'
[ "$(wc -l < "$STATE/admission_log" | tr -d ' ')" = 1 ] || fail 'admission call count mismatch'
printf 'PASS prepared-admission-pass\n'

printf 'TEST admission-blocked\n'
reset_state
set_state vm prepared
set_state admission blocked
run_status
assert_field 'vm_admission=blocked'
printf 'PASS admission-blocked\n'
printf 'TEST admission-unknown\n'
reset_state
set_state vm prepared
set_state admission unknown
run_status
assert_field 'vm_admission=unknown'
printf 'PASS admission-unknown\n'

printf 'TEST host-missing\n'
reset_state
set_state host missing
run_status
assert_field 'host_operator_profile=missing'
printf 'PASS host-missing\n'

printf 'TEST host-blocked\n'
reset_state
set_state host blocked
run_status
assert_field 'host_operator_profile=blocked'
printf 'PASS host-blocked\n'

printf 'TEST analysis-missing\n'
reset_state
set_state analysis missing
run_status
assert_field 'private_lab_analysis=missing'
printf 'PASS analysis-missing\n'

printf 'TEST analysis-blocked\n'
reset_state
set_state analysis blocked
run_status
assert_field 'private_lab_analysis=blocked'
printf 'PASS analysis-blocked\n'
printf 'TEST malformed-analysis-preserved-unknown\n'
reset_state
set_state analysis malformed
run_status
assert_field 'private_lab_analysis=unknown'
assert_not_contains "$OUT" 'ANALYSIS_RAW_MARKER'
printf 'PASS malformed-analysis-preserved-unknown\n'

printf 'TEST child-output-not-forwarded\n'
reset_state
set_state host malformed
run_status
assert_field 'host_operator_profile=unknown'
assert_not_contains "$OUT" 'SECRET_CHILD_MARKER'
printf 'PASS child-output-not-forwarded\n'

printf 'TEST private-substrate-fail-and-malformed\n'
reset_state
set_state private fail
run_status
assert_field 'private_lab_substrate=fail'
reset_state
set_state private malformed
run_status
assert_field 'private_lab_substrate=unknown'
assert_not_contains "$OUT" 'PRIVATE_RAW_MARKER'
printf 'PASS private-substrate-fail-and-malformed\n'

printf 'TEST vm-malformed-preserved-unknown\n'
reset_state
set_state vm malformed
run_status
assert_field 'vm_lab=unknown'
assert_field 'vm_admission=not_ready'
assert_not_contains "$OUT" 'VM_RAW_MARKER'
[ ! -s "$STATE/admission_log" ] || fail 'admission ran after malformed VM state'
printf 'PASS vm-malformed-preserved-unknown\n'
printf 'TEST invalid-invocation-fails-closed\n'
set +e
NOARG=$($STATUS 2>&1); NOARG_RC=$?
EXTRA=$($STATUS status EXTRA_MARKER 2>&1); EXTRA_RC=$?
set -e
[ "$NOARG_RC" -eq 2 ] || fail 'no-arg invocation did not exit 2'
[ "$EXTRA_RC" -eq 2 ] || fail 'extra-arg invocation did not exit 2'
assert_not_contains "$EXTRA" 'EXTRA_MARKER'
printf 'PASS invalid-invocation-fails-closed\n'

printf 'TEST fixed-read-only-surface\n'
source=$(cat "$SOURCE")
for required in \
  '"$HOST" --check' \
  'proot-distro login ubuntu -- true' \
  '"$PRIVATE_ANALYSIS" --check' \
  '"$VM_BOOTSTRAP" --check' \
  '"$VM_VERIFY" --admission'; do
  printf '%s\n' "$source" | grep -F "$required" >/dev/null || fail "missing fixed call: $required"
done
for forbidden in '--apply' 'pkg install' 'apt-get' 'curl ' 'wget ' 'qemu-system-aarch64 ' 'qemu-img ' 'settings put' 'adb ' 'su ' 'eval ' 'git '; do
  if printf '%s\n' "$source" | grep -F -- "$forbidden" >/dev/null; then
    fail "forbidden mutation/passthrough surface: $forbidden"
  fi
done
printf 'PASS fixed-read-only-surface\n'

sh -n "$SOURCE"
printf 'PASS shell-syntax\n'
