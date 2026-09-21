#!/bin/sh
set -eu

TEST_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
ROOT=$(CDPATH= cd "$TEST_DIR/.." && pwd)
BOOTSTRAP="$ROOT/bootstrap.sh"
TMP=$(mktemp -d)
MOCK_BIN="$TMP/bin"
CORE_BIN="$TMP/core"
STATE="$TMP/state"
mkdir -p "$MOCK_BIN" "$CORE_BIN" "$STATE"

find_external() {
    name=$1
    for candidate in "/data/data/com.termux/files/usr/bin/$name" "/usr/bin/$name" "/bin/$name"; do
        [ -x "$candidate" ] && { printf '%s\n' "$candidate"; return 0; }
    done
    fail "external tool unavailable: $name"
}
ln -s "$(find_external printf)" "$CORE_BIN/printf"
ln -s "$(find_external grep)" "$CORE_BIN/grep"
ln -s "$(find_external chmod)" "$CORE_BIN/chmod"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

fail() {
    printf 'FAIL %s\n' "$*" >&2
    exit 1
}

assert_contains() {
    printf '%s\n' "$1" | grep -F "$2" >/dev/null || fail "missing: $2"
}

assert_not_contains() {
    if printf '%s\n' "$1" | grep -F "$2" >/dev/null; then
        fail "unexpected: $2"
    fi
}

run_cmd() {
    set +e
    RUN_OUTPUT=$(env PATH="$MOCK_BIN:$CORE_BIN" MCL_OPERATOR_TEST_STATE="$STATE" MCL_OPERATOR_TEST_BIN="$MOCK_BIN" "$BOOTSTRAP" "$@" 2>&1)
    RUN_RC=$?
    set -e
}
cat > "$MOCK_BIN/dpkg-query" <<'EOF'
#!/bin/sh
state=${MCL_OPERATOR_TEST_STATE:?}
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
state=${MCL_OPERATOR_TEST_STATE:?}
bin=${MCL_OPERATOR_TEST_BIN:?}
printf 'pkg %s\n' "$*" >> "$state/log"
[ "${1:-}" = install ] || exit 80
shift
[ "${1:-}" = -y ] || exit 81
shift
[ "${1:-}" = --no-upgrade ] || exit 82
shift
[ "${1:-}" = --no-remove ] || exit 83
shift
package=${1:-}
[ "$#" -eq 1 ] || exit 84
case "$package" in
    ripgrep) command_name=rg ;;
    jq) command_name=jq ;;
    file) command_name=file ;;
    *) exit 85 ;;
esac
if [ -f "$state/fail_$package" ]; then
    exit 86
fi
if ! grep -Fx "$package" "$state/installed" >/dev/null 2>&1; then
    printf '%s\n' "$package" >> "$state/installed"
fi
printf '%s\n' '#!/bin/sh' 'exit 0' > "$bin/$command_name"
chmod +x "$bin/$command_name"
EOF
chmod +x "$MOCK_BIN/pkg"

reset_state() {
    : > "$STATE/installed"
    : > "$STATE/log"
    rm -f "$STATE"/fail_* "$MOCK_BIN/rg" "$MOCK_BIN/jq" "$MOCK_BIN/file"
}

seed_tool() {
    package=$1
    command_name=$2
    printf '%s\n' "$package" >> "$STATE/installed"
    cat > "$MOCK_BIN/$command_name" <<'EOF'
#!/bin/sh
exit 0
EOF
    chmod +x "$MOCK_BIN/$command_name"
}
assert_rc() {
    expected=$1
    [ "$RUN_RC" -eq "$expected" ] || fail "expected rc=$expected got $RUN_RC: $RUN_OUTPUT"
}

log_text() {
    cat "$STATE/log" 2>/dev/null || true
}

seed_all() {
    seed_tool ripgrep rg
    seed_tool jq jq
    seed_tool file file
}

printf 'TEST default-check-read-only\n'
reset_state
run_cmd
assert_rc 1
assert_contains "$RUN_OUTPUT" 'MISSING tool:rg package:ripgrep'
assert_contains "$RUN_OUTPUT" 'MISSING tool:jq package:jq'
assert_contains "$RUN_OUTPUT" 'MISSING tool:file package:file'
[ ! -s "$STATE/log" ] || fail 'check mode invoked package manager'
printf 'PASS default-check-read-only\n'

printf 'TEST all-present-check\n'
reset_state
seed_all
run_cmd --check
assert_rc 0
assert_contains "$RUN_OUTPUT" 'PRESENT tool:rg package:ripgrep'
assert_contains "$RUN_OUTPUT" 'PRESENT tool:jq package:jq'
assert_contains "$RUN_OUTPUT" 'PRESENT tool:file package:file'
[ ! -s "$STATE/log" ] || fail 'present check invoked package manager'
printf 'PASS all-present-check\n'
printf 'TEST apply-installs-missing-only\n'
reset_state
seed_tool jq jq
run_cmd --apply
assert_rc 0
assert_contains "$RUN_OUTPUT" 'INSTALLED tool:rg package:ripgrep'
assert_contains "$RUN_OUTPUT" 'PRESENT tool:jq package:jq'
assert_contains "$RUN_OUTPUT" 'INSTALLED tool:file package:file'
expected='pkg install -y --no-upgrade --no-remove ripgrep
pkg install -y --no-upgrade --no-remove file'
[ "$(log_text)" = "$expected" ] || fail "unexpected package requests: $(log_text)"
printf 'PASS apply-installs-missing-only\n'

printf 'TEST repeated-apply-noop\n'
lines_before=$(wc -l < "$STATE/log" | tr -d ' ')
run_cmd --apply
assert_rc 0
lines_after=$(wc -l < "$STATE/log" | tr -d ' ')
[ "$lines_before" = "$lines_after" ] || fail 'second apply invoked package manager'
assert_contains "$RUN_OUTPUT" 'PRESENT tool:rg package:ripgrep'
assert_contains "$RUN_OUTPUT" 'PRESENT tool:jq package:jq'
assert_contains "$RUN_OUTPUT" 'PRESENT tool:file package:file'
printf 'PASS repeated-apply-noop\n'

printf 'TEST installed-package-command-mismatch-blocks\n'
reset_state
printf '%s\n' ripgrep >> "$STATE/installed"
seed_tool jq jq
seed_tool file file
run_cmd --apply
assert_rc 2
assert_contains "$RUN_OUTPUT" 'BLOCKED tool:rg contract-mismatch'
[ ! -s "$STATE/log" ] || fail 'contract mismatch triggered reinstall'
printf 'PASS installed-package-command-mismatch-blocks\n'
printf 'TEST install-failure-is-bounded\n'
reset_state
seed_tool jq jq
seed_tool file file
: > "$STATE/fail_ripgrep"
run_cmd --apply
assert_rc 1
assert_contains "$RUN_OUTPUT" 'FAILED tool:rg package:ripgrep'
assert_not_contains "$RUN_OUTPUT" "$TMP"
assert_contains "$(log_text)" 'pkg install -y --no-upgrade --no-remove ripgrep'
printf 'PASS install-failure-is-bounded\n'

printf 'TEST unknown-argument-rejected-without-passthrough\n'
reset_state
marker=PRIVATE_PACKAGE_MARKER_2270
run_cmd "$marker"
assert_rc 2
assert_not_contains "$RUN_OUTPUT" "$marker"
[ ! -s "$STATE/log" ] || fail 'unknown argument reached package manager'
printf 'PASS unknown-argument-rejected-without-passthrough\n'

printf 'TEST missing-package-manager-blocks-context\n'
reset_state
mv "$MOCK_BIN/pkg" "$MOCK_BIN/pkg.off"
run_cmd --check
assert_rc 2
assert_contains "$RUN_OUTPUT" 'BLOCKED package-manager:unavailable'
[ ! -s "$STATE/log" ] || fail 'missing package manager produced mutation log'
mv "$MOCK_BIN/pkg.off" "$MOCK_BIN/pkg"
printf 'PASS missing-package-manager-blocks-context\n'

printf 'TEST fixed-allowlist-and-forbidden-surfaces\n'
source=$(cat "$BOOTSTRAP")
for exact in \
    'check_tool ripgrep rg' \
    'check_tool jq jq' \
    'check_tool file file'; do
    printf '%s\n' "$source" | grep -Fqx "$exact" || fail "missing fixed allowlist row: $exact"
done
for forbidden in \
    'pkg upgrade' 'pkg remove' 'pkg uninstall' 'apt-get' \
    'proot-distro' 'git ' 'runit' 'rdc' 'tailscale' 'sshd' 'service ' 'sv ' \
    'socat' 'netcat' 'nc ' 'ip ' 'ss ' 'pm ' 'am ' 'settings put' \
    'curl ' 'wget ' 'http://' 'https://' 'eval ' 'sh -c' 'bash -c'; do
    assert_not_contains "$source" "$forbidden"
done
printf 'PASS fixed-allowlist-and-forbidden-surfaces\n'

printf 'PASS m-termux-operator contract\n'
