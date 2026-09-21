#!/bin/sh
set -eu

TEST_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$TEST_DIR/.." && pwd)
SOURCE="$ROOT/mcl-termux-host-info"
TMP=$(mktemp -d)
BIN="$TMP/bin"
EMPTY_BIN="$TMP/empty-bin"
FIX="$TMP/fixtures"
PREFIX_ROOT="$TMP/prefix"
mkdir -p "$BIN" "$EMPTY_BIN" "$FIX" "$PREFIX_ROOT/tmp"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

fail() { printf 'FAIL %s\n' "$*" >&2; exit 1; }
assert_contains() { printf '%s\n' "$1" | grep -F "$2" >/dev/null || fail "missing: $2"; }
assert_not_contains() { ! printf '%s\n' "$1" | grep -F "$2" >/dev/null || fail "unexpected: $2"; }
assert_field() { printf '%s\n' "$OUT" | grep -Fx "$1" >/dev/null || fail "missing field: $1"; }
assert_rc() { [ "$RUN_RC" -eq "$1" ] || fail "expected rc=$1 got $RUN_RC: $OUT"; }

cat > "$BIN/termux-info" <<'MOCK'
#!/bin/sh
[ -n "${MCL_HOST_INFO_FIXTURE:-}" ] || exit 9
cat "$MCL_HOST_INFO_FIXTURE"
exit "${MCL_HOST_INFO_RC:-0}"
MOCK
chmod +x "$BIN/termux-info"

cat > "$FIX/current" <<'EOF'
Termux Variables:
TERMUX_APK_RELEASE=GITHUB
TERMUX_APP_PACKAGE_MANAGER=apt
HOME=/secret/home
Packages CPU architecture:
aarch64
Subscribed repositories:
# sources.list
deb https://secret-mirror.example/apt/termux-main stable main
Updatable packages:
openssl/stable 9.9.9 aarch64 [upgradable from: 1.0.0]
termux-tools version:
1.45.0
Android version:
16
Kernel build information:
SECRET_KERNEL_STRING
Device manufacturer:
SECRET_MANUFACTURER
Device model:
SECRET_MODEL
Supported ABIs:
arm64-v8a,armeabi-v7a
LD Variables:
LD_LIBRARY_PATH=/secret/ld
EOF

cat > "$FIX/up-to-date" <<'EOF'
Packages CPU architecture:
aarch64
Subscribed repositories:
deb https://another-secret.example/main stable main
Updatable packages:
All packages up to date.
termux-tools version:
1.45.0
Android version:
15
EOF

cat > "$FIX/duplicates" <<'EOF'
Packages CPU architecture:
aarch64
Packages CPU architecture:
arm
Subscribed repositories:
deb https://secret-one.invalid/main stable main
Subscribed repositories:
deb https://secret-two.invalid/main stable main
Updatable packages:
foo/stable 1.2.3 aarch64
Updatable packages:
bar/stable 2.3.4 aarch64
termux-tools version:
1.45.0
termux-tools version:
9.99.0
Android version:
sixteen
EOF

run_fixture() {
  fixture=$1
  rc=${2:-0}
  set +e
  OUT=$(PREFIX="$PREFIX_ROOT" TMPDIR="$PREFIX_ROOT/tmp" \
    MCL_HOST_INFO_FIXTURE="$fixture" MCL_HOST_INFO_RC="$rc" \
    PATH="$BIN:/usr/bin:/bin" sh "$SOURCE" status 2>&1)
  RUN_RC=$?
  set -e
}

printf 'TEST representative-receipt\n'
run_fixture "$FIX/current"
assert_rc 0
expected='schema=mcl-termux-host-info.v1
termux_info=pass
termux_tools_version=1.45.0
package_arch=aarch64
android_version=16
repo_entries=1
package_update_view=present
details=withheld'
[ "$OUT" = "$expected" ] || fail "unexpected receipt: $OUT"
printf 'PASS representative-receipt\n'

printf 'TEST all-up-to-date-view\n'
run_fixture "$FIX/up-to-date"
assert_rc 0
assert_field 'package_update_view=none'
assert_field 'android_version=15'
printf 'PASS all-up-to-date-view\n'

printf 'TEST duplicate-malformed-fields-unknown\n'
run_fixture "$FIX/duplicates"
assert_rc 0
assert_field 'termux_info=pass'
assert_field 'termux_tools_version=unknown'
assert_field 'package_arch=unknown'
assert_field 'android_version=unknown'
assert_field 'repo_entries=unknown'
assert_field 'package_update_view=unknown'
printf 'PASS duplicate-malformed-fields-unknown\n'

printf 'TEST failed-invocation-preserved\n'
run_fixture "$FIX/current" 7
assert_rc 0
assert_field 'termux_info=failed'
assert_field 'termux_tools_version=unknown'
assert_field 'package_update_view=unknown'
assert_not_contains "$OUT" 'SECRET_KERNEL_STRING'
printf 'PASS failed-invocation-preserved\n'

printf 'TEST missing-command-preserved\n'
set +e
OUT=$(PREFIX="$PREFIX_ROOT" TMPDIR="$PREFIX_ROOT/tmp" \
  PATH="$EMPTY_BIN:/usr/bin:/bin" sh "$SOURCE" status 2>&1)
RUN_RC=$?
set -e
assert_rc 0
assert_field 'termux_info=missing'
assert_field 'termux_tools_version=unknown'
assert_field 'repo_entries=unknown'
printf 'PASS missing-command-preserved\n'

printf 'TEST privacy-forbidden-content-withheld\n'
run_fixture "$FIX/current"
for secret in \
  'secret-mirror.example' 'SECRET_KERNEL_STRING' 'SECRET_MANUFACTURER' \
  'SECRET_MODEL' '/secret/home' '/secret/ld' 'openssl/stable'; do
  assert_not_contains "$OUT" "$secret"
done
printf 'PASS privacy-forbidden-content-withheld\n'

printf 'TEST scratch-cleanup\n'
run_fixture "$FIX/current"
if find "$PREFIX_ROOT/tmp" -maxdepth 1 -type f -name 'mcl-termux-host-info.*' | grep -q .; then
  fail 'raw scratch file remained'
fi
printf 'PASS scratch-cleanup\n'

printf 'TEST invalid-invocation-fails-closed\n'
set +e
NOARG=$(sh "$SOURCE" 2>&1); NOARG_RC=$?
EXTRA=$(sh "$SOURCE" status EXTRA_MARKER 2>&1); EXTRA_RC=$?
set -e
[ "$NOARG_RC" -eq 2 ] || fail 'no-arg invocation did not exit 2'
[ "$EXTRA_RC" -eq 2 ] || fail 'extra-arg invocation did not exit 2'
assert_not_contains "$EXTRA" 'EXTRA_MARKER'
printf 'PASS invalid-invocation-fails-closed\n'

printf 'TEST fixed-read-only-surface\n'
source_text=$(cat "$SOURCE")
printf '%s\n' "$source_text" | grep -F 'termux-info >"$RAW" 2>/dev/null' >/dev/null \
  || fail 'missing bounded termux-info invocation'
for forbidden in \
  'pkg install' 'pkg update' 'pkg upgrade' 'apt-get' 'termux-change-repo' \
  'termux-reload-settings' 'termux-wake-lock' 'termux-setup-storage' \
  'curl ' 'wget ' 'adb ' 'settings put' 'git ' 'eval '; do
  if printf '%s\n' "$source_text" | grep -F -- "$forbidden" >/dev/null; then
    fail "forbidden effect surface: $forbidden"
  fi
done
printf 'PASS fixed-read-only-surface\n'

sh -n "$SOURCE"
printf 'PASS shell-syntax\n'
