#!/bin/sh
set -eu

TEST_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
ROOT=$(CDPATH= cd "$TEST_DIR/.." && pwd)
BOOTSTRAP="$ROOT/bootstrap.sh"
VERIFY="$ROOT/verify.sh"
TMP=$(mktemp -d)
MOCK_BIN="$TMP/bin"
STATE="$TMP/state"
mkdir -p "$MOCK_BIN" "$STATE"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

export MCL_TEST_STATE="$STATE"
PATH="$MOCK_BIN:/usr/bin:/bin"
export PATH

fail() {
    printf 'FAIL %s\n' "$*" >&2
    exit 1
}

assert_contains() {
    haystack=$1
    needle=$2
    printf '%s\n' "$haystack" | grep -F "$needle" >/dev/null || fail "missing: $needle"
}

assert_not_contains() {
    haystack=$1
    needle=$2
    if printf '%s\n' "$haystack" | grep -F "$needle" >/dev/null; then
        fail "unexpected: $needle"
    fi
}
run_cmd() {
    set +e
    RUN_OUTPUT=$("$@" 2>&1)
    RUN_RC=$?
    set -e
}

assert_rc_zero() {
    [ "$RUN_RC" -eq 0 ] || fail "expected rc=0, got $RUN_RC: $RUN_OUTPUT"
}

assert_rc_nonzero() {
    [ "$RUN_RC" -ne 0 ] || fail "expected nonzero rc: $RUN_OUTPUT"
}

cat > "$MOCK_BIN/dpkg-query" <<'EOF'
#!/bin/sh
state=${MCL_TEST_STATE:?}
last=
for arg in "$@"; do last=$arg; done
if grep -Fx "$last" "$state/installed" >/dev/null 2>&1; then
    printf 'install ok installed\n'
    exit 0
fi
exit 1
EOF
chmod +x "$MOCK_BIN/dpkg-query"

cat > "$MOCK_BIN/pkg" <<'EOF'
#!/bin/sh
state=${MCL_TEST_STATE:?}
printf 'pkg %s\n' "$*" >> "$state/log"
[ "${1:-}" = install ] || exit 1
shift
[ "${1:-}" = -y ] && shift
for package in "$@"; do
    grep -Fx "$package" "$state/installed" >/dev/null 2>&1 || printf '%s\n' "$package" >> "$state/installed"
done
EOF
chmod +x "$MOCK_BIN/pkg"
cat > "$MOCK_BIN/apt-get" <<'EOF'
#!/bin/sh
state=${MCL_TEST_STATE:?}
printf 'apt-get %s\n' "$*" >> "$state/log"
case "${1:-}" in
    update) exit 0 ;;
    install)
        shift
        [ "${1:-}" = -y ] && shift
        for package in "$@"; do
            grep -Fx "$package" "$state/installed" >/dev/null 2>&1 || printf '%s\n' "$package" >> "$state/installed"
        done
        exit 0
        ;;
esac
exit 1
EOF
chmod +x "$MOCK_BIN/apt-get"

cat > "$MOCK_BIN/git" <<'EOF'
#!/bin/sh
state=${MCL_TEST_STATE:?}
[ "${1:-}" = config ] || exit 1
shift
[ "${1:-}" = --global ] || exit 1
shift
if [ "${1:-}" = --get ]; then
    key=${2:-}
    case "$key" in
        user.name) file="$state/git_name" ;;
        user.email) file="$state/git_email" ;;
        *) exit 1 ;;
    esac
    [ -s "$file" ] || exit 1
    cat "$file"
    exit 0
fi
key=${1:-}
value=${2:-}
case "$key" in
    user.name) file="$state/git_name" ;;
    user.email) file="$state/git_email" ;;
    *) exit 1 ;;
esac
printf '%s\n' "$value" > "$file"
printf 'git-set %s %s\n' "$key" "$value" >> "$state/log"
EOF
chmod +x "$MOCK_BIN/git"
cat > "$MOCK_BIN/gh" <<'EOF'
#!/bin/sh
state=${MCL_TEST_STATE:?}
[ "${1:-}" = auth ] && [ "${2:-}" = status ] && [ -f "$state/gh_auth" ]
EOF
chmod +x "$MOCK_BIN/gh"

cat > "$MOCK_BIN/pm" <<'EOF'
#!/bin/sh
state=${MCL_TEST_STATE:?}
[ "${1:-}" = path ] || exit 1
grep -Fx "${2:-}" "$state/android_apps" >/dev/null 2>&1
EOF
chmod +x "$MOCK_BIN/pm"

cat > "$MOCK_BIN/proot-distro" <<'EOF'
#!/bin/sh
state=${MCL_TEST_STATE:?}
if [ "${1:-}" = login ] && [ "${2:-}" = ubuntu ] && [ -f "$state/ubuntu_present" ]; then
    exit 0
fi
exit 1
EOF
chmod +x "$MOCK_BIN/proot-distro"

for command_name in node npm python tmux ssh rsync make clang curl sv python3 cc; do
    cat > "$MOCK_BIN/$command_name" <<'EOF'
#!/bin/sh
exit 0
EOF
    chmod +x "$MOCK_BIN/$command_name"
done
seed_manifest_packages() {
    manifest=$1
    awk -F'|' '!/^#/ && NF >= 2 {print $1}' "$manifest" | sort -u > "$STATE/installed"
}

seed_manual_state() {
    printf '%s\n' \
        com.termux.boot \
        com.termux.api \
        com.tailscale.ipn > "$STATE/android_apps"
    : > "$STATE/log"
    : > "$STATE/gh_auth"
    : > "$STATE/ubuntu_present"
    printf '%s\n' custom-name > "$STATE/git_name"
    printf '%s\n' custom@example.invalid > "$STATE/git_email"
}

remove_installed_package() {
    package=$1
    grep -Fxv "$package" "$STATE/installed" > "$STATE/installed.next" || true
    mv "$STATE/installed.next" "$STATE/installed"
}

log_text() {
    cat "$STATE/log" 2>/dev/null || true
}

assert_file_value() {
    file=$1
    expected=$2
    actual=$(cat "$file" 2>/dev/null || true)
    [ "$actual" = "$expected" ] || fail "$file expected '$expected', got '$actual'"
}

TERMUX_MANIFEST="$ROOT/manifests/common.termux.txt"
UBUNTU_MANIFEST="$ROOT/manifests/common.ubuntu.txt"
printf 'TEST default-check-is-read-only\n'
seed_manifest_packages "$TERMUX_MANIFEST"
seed_manual_state
remove_installed_package rsync
run_cmd "$BOOTSTRAP" --context termux --profile common
assert_rc_nonzero
assert_contains "$RUN_OUTPUT" 'MISSING package:rsync'
assert_not_contains "$(log_text)" 'pkg install'
assert_not_contains "$(log_text)" 'git-set'
assert_file_value "$STATE/git_name" custom-name
assert_file_value "$STATE/git_email" custom@example.invalid
printf 'PASS default-check-is-read-only\n'

printf 'TEST explicit-apply-installs-missing-only\n'
run_cmd "$BOOTSTRAP" --apply --context termux --profile common
assert_rc_zero
assert_contains "$RUN_OUTPUT" 'INSTALLED package:rsync'
assert_contains "$(log_text)" 'pkg install -y rsync'
grep -Fx rsync "$STATE/installed" >/dev/null || fail 'rsync not installed by mock apply'
printf 'PASS explicit-apply-installs-missing-only\n'

printf 'TEST missing-git-identity-is-filled\n'
seed_manifest_packages "$TERMUX_MANIFEST"
seed_manual_state
rm -f "$STATE/git_name" "$STATE/git_email"
run_cmd "$BOOTSTRAP" --apply --context termux --profile common
assert_rc_zero
assert_contains "$RUN_OUTPUT" 'INSTALLED git-identity:user.name'
assert_contains "$RUN_OUTPUT" 'INSTALLED git-identity:user.email'
assert_file_value "$STATE/git_name" hanmiyoo10-alt
assert_file_value "$STATE/git_email" '260735128+hanmiyoo10-alt@users.noreply.github.com'
printf 'PASS missing-git-identity-is-filled\n'
printf 'TEST existing-git-identity-is-preserved\n'
seed_manifest_packages "$TERMUX_MANIFEST"
seed_manual_state
run_cmd "$BOOTSTRAP" --apply --context termux --profile common
assert_rc_zero
assert_file_value "$STATE/git_name" custom-name
assert_file_value "$STATE/git_email" custom@example.invalid
assert_not_contains "$(log_text)" 'git-set'
printf 'PASS existing-git-identity-is-preserved\n'

printf 'TEST ubuntu-missing-is-blocked\n'
seed_manifest_packages "$TERMUX_MANIFEST"
seed_manual_state
rm -f "$STATE/ubuntu_present"
run_cmd "$BOOTSTRAP" --check --context termux --profile common
assert_rc_nonzero
assert_contains "$RUN_OUTPUT" 'BLOCKED ubuntu-proot:missing'
assert_not_contains "$(log_text)" 'pkg install'
printf 'PASS ubuntu-missing-is-blocked\n'

printf 'TEST ubuntu-apply-and-second-apply-noop\n'
seed_manifest_packages "$UBUNTU_MANIFEST"
seed_manual_state
remove_installed_package build-essential
run_cmd "$BOOTSTRAP" --apply --context ubuntu --profile common
assert_rc_zero
assert_contains "$RUN_OUTPUT" 'INSTALLED package:build-essential'
assert_contains "$(log_text)" 'apt-get update'
assert_contains "$(log_text)" 'apt-get install -y build-essential'
lines_before=$(wc -l < "$STATE/log" | tr -d ' ')
run_cmd "$BOOTSTRAP" --apply --context ubuntu --profile common
assert_rc_zero
lines_after=$(wc -l < "$STATE/log" | tr -d ' ')
[ "$lines_before" = "$lines_after" ] || fail 'second apply performed a managed mutation'
printf 'PASS ubuntu-apply-and-second-apply-noop\n'
printf 'TEST auth-and-android-prereqs-remain-manual\n'
seed_manifest_packages "$TERMUX_MANIFEST"
seed_manual_state
rm -f "$STATE/gh_auth"
grep -Fxv com.tailscale.ipn "$STATE/android_apps" > "$STATE/android_apps.next"
mv "$STATE/android_apps.next" "$STATE/android_apps"
run_cmd "$BOOTSTRAP" --check --context termux --profile common
assert_rc_zero
assert_contains "$RUN_OUTPUT" 'NEEDS_MANUAL auth:github'
assert_contains "$RUN_OUTPUT" 'NEEDS_MANUAL android-app:tailscale'
assert_not_contains "$(log_text)" 'git-set'
assert_not_contains "$(log_text)" 'pkg install'
printf 'PASS auth-and-android-prereqs-remain-manual\n'

printf 'TEST verify-is-read-only-wrapper\n'
seed_manifest_packages "$UBUNTU_MANIFEST"
seed_manual_state
run_cmd "$VERIFY" --context ubuntu --profile common
assert_rc_zero
assert_contains "$RUN_OUTPUT" 'PRESENT profile:common context:ubuntu'
assert_not_contains "$(log_text)" 'apt-get install'
assert_not_contains "$(log_text)" 'git-set'
printf 'PASS verify-is-read-only-wrapper\n'

printf 'ALL TESTS PASS\n'
