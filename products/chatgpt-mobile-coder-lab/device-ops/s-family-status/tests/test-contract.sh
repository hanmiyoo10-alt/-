#!/bin/sh
set -eu

TEST_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$TEST_DIR/.." && pwd)
SOURCE="$ROOT/s-env-status"
TMP=$(mktemp -d)
PRODUCT="$TMP/product"
BIN="$TMP/bin"
STATE="$TMP/state"
mkdir -p "$PRODUCT/device-ops/s-family-status" "$PRODUCT/device-bootstrap" "$BIN" "$STATE"
cp "$SOURCE" "$PRODUCT/device-ops/s-family-status/s-env-status"
chmod +x "$PRODUCT/device-ops/s-family-status/s-env-status"
STATUS="$PRODUCT/device-ops/s-family-status/s-env-status"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }
set_state() { printf '%s\n' "$2" > "$STATE/$1"; }
assert_field() { printf '%s\n' "$OUT" | grep -Fx "$1" >/dev/null || fail "missing field: $1"; }
assert_not_contains() { ! printf '%s\n' "$1" | grep -F "$2" >/dev/null || fail "unexpected: $2"; }

cat > "$PRODUCT/device-bootstrap/verify.sh" <<'SH'
#!/bin/sh
[ "$*" = '--profile common --context ubuntu' ] || exit 9
case "$(cat "$MCL_S_STATUS_TEST_STATE/bootstrap")" in
  pass) printf '%s\n' 'PRESENT package:git' 'PRESENT command:git' 'PRESENT auth:github' 'PRESENT profile:common context:ubuntu'; exit 0 ;;
  missing) printf '%s\n' 'MISSING package:git' 'NEEDS_MANUAL auth:github' ; exit 1 ;;
  blocked) printf '%s\n' 'BLOCKED package-query:dpkg-query' 'NEEDS_MANUAL auth:github'; exit 1 ;;
  manual) printf '%s\n' 'PRESENT package:git' 'NEEDS_MANUAL auth:github' 'PRESENT profile:common context:ubuntu'; exit 0 ;;
  cli_missing) printf '%s\n' 'PRESENT package:git' 'NEEDS_MANUAL auth:github-cli-unavailable' 'PRESENT profile:common context:ubuntu'; exit 0 ;;
  malformed) printf '%s\n' 'SECRET_CHILD_MARKER'; exit 0 ;;
esac
SH
chmod +x "$PRODUCT/device-bootstrap/verify.sh"
cat > "$BIN/git" <<'SH'
#!/bin/sh
[ "$1" = -C ] && [ "$2" = /root/nyang-repo ] && [ "$3" = rev-parse ] && [ "$4" = --show-toplevel ] || exit 2
case "$(cat "$MCL_S_STATUS_TEST_STATE/repo")" in
  pass) echo /root/nyang-repo; exit 0 ;;
  missing) exit 128 ;;
  wrong) echo /root; exit 0 ;;
esac
SH
chmod +x "$BIN/git"

reset_state() {
  set_state bootstrap pass
  set_state repo pass
}
run_status() {
  set +e
  OUT=$(MCL_S_STATUS_TEST_STATE="$STATE" PATH="$BIN:/usr/bin:/bin" "$STATUS" status 2>&1)
  RUN_RC=$?
  set -e
}
assert_rc() { [ "$RUN_RC" -eq "$1" ] || fail "expected rc=$1 got $RUN_RC: $OUT"; }

printf 'TEST exact-pass-receipt\n'
reset_state
run_status
assert_rc 0
expected='schema=mcl-s-env-status.v1
common_ubuntu_profile=pass
github_cli_auth=pass
repository_access=pass
details=withheld'
[ "$OUT" = "$expected" ] || fail "unexpected receipt: $OUT"
printf 'PASS exact-pass-receipt\n'
printf 'TEST missing-and-manual\n'
reset_state
set_state bootstrap missing
run_status
assert_field 'common_ubuntu_profile=missing'
assert_field 'github_cli_auth=needs_manual'
printf 'PASS missing-and-manual\n'

printf 'TEST blocked-preserved\n'
reset_state
set_state bootstrap blocked
run_status
assert_field 'common_ubuntu_profile=blocked'
assert_field 'github_cli_auth=needs_manual'
printf 'PASS blocked-preserved\n'

printf 'TEST auth-manual-variants\n'
for value in manual cli_missing; do
  reset_state
  set_state bootstrap "$value"
  run_status
  assert_field 'common_ubuntu_profile=pass'
  assert_field 'github_cli_auth=needs_manual'
done
printf 'PASS auth-manual-variants\n'

printf 'TEST malformed-owner-fails-closed\n'
reset_state
set_state bootstrap malformed
run_status
assert_field 'common_ubuntu_profile=unknown'
assert_field 'github_cli_auth=unknown'
assert_not_contains "$OUT" SECRET_CHILD_MARKER
printf 'PASS malformed-owner-fails-closed\n'
printf 'TEST repository-access-enums\n'
reset_state
set_state repo missing
run_status
assert_field 'repository_access=missing'
reset_state
set_state repo wrong
run_status
assert_field 'repository_access=unknown'
printf 'PASS repository-access-enums\n'

printf 'TEST invalid-invocation\n'
set +e
NOARG=$($STATUS 2>&1); NOARG_RC=$?
EXTRA=$($STATUS status extra 2>&1); EXTRA_RC=$?
set -e
[ "$NOARG_RC" -eq 2 ] || fail 'no-arg invocation did not exit 2'
[ "$EXTRA_RC" -eq 2 ] || fail 'extra-arg invocation did not exit 2'
assert_not_contains "$EXTRA" extra
printf 'PASS invalid-invocation\n'

printf 'TEST fixed-read-only-surface\n'
source=$(cat "$SOURCE")
for required in \
  '"$COMMON" --profile common --context ubuntu' \
  'REPO=/root/nyang-repo' \
  'git -C "$REPO" rev-parse --show-toplevel'; do
  printf '%s\n' "$source" | grep -F "$required" >/dev/null || fail "missing fixed call: $required"
done
for forbidden in \
  'git fetch' 'git pull' 'git checkout' 'git reset' 'git clean' 'git stash' \
  'pkg install' 'apt-get' 'curl ' 'wget ' 'systemctl ' 'service ' 'runit ' \
  'mcl-rdcctl' 'PocketRisu' 'MCL_LEASE_' 'gh api' 'gh auth token' 'eval '; do
  if printf '%s\n' "$source" | grep -F -- "$forbidden" >/dev/null; then
    fail "forbidden surface: $forbidden"
  fi
done
printf 'PASS fixed-read-only-surface\n'

printf 'TEST exact-receipt-shape\n'
reset_state
run_status
[ "$(printf '%s\n' "$OUT" | wc -l | tr -d ' ')" = 5 ] || fail 'receipt line count mismatch'
for forbidden_key in result ready healthy safe_to_mutate; do
  ! printf '%s\n' "$OUT" | grep -Eq "^${forbidden_key}=" || fail "aggregate key present: $forbidden_key"
done
printf 'PASS exact-receipt-shape\n'

sh -n "$SOURCE"
printf 'PASS shell-syntax\n'
