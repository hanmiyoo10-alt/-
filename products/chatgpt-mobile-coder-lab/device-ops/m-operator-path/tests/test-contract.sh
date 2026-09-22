#!/bin/sh
set -eu

TEST_DIR=$(CDPATH='' cd -- "$(dirname "$0")" && pwd)
OWNER=$(CDPATH='' cd -- "$TEST_DIR/.." && pwd)
SCRIPT="$OWNER/mcl-m-operator-path"
TMP=$(mktemp -d)
ROOT="$TMP/home"
BASE_LOGIN="$TMP/login.base"
BASE_RC="$TMP/rc.base"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

fail() {
    printf 'FAIL %s\n' "$*" >&2
    exit 1
}

assert_rc() {
    expected=$1
    [ "$RC" -eq "$expected" ] || fail "expected rc=$expected got=$RC output=$OUT"
}

assert_line() {
    printf '%s\n' "$OUT" | grep -Fqx "$1" || fail "missing line: $1"
}

sha() {
    sha256sum "$1" | awk '{print $1}'
}
run_owner() {
    set +e
    OUT=$(env \
        MCL_M_OPERATOR_PATH_TEST_MODE=1 \
        MCL_M_OPERATOR_PATH_TEST_ROOT="$ROOT" \
        "$SCRIPT" "$@" 2>&1)
    RC=$?
    set -e
}

cat > "$BASE_LOGIN" <<'EOF'
# mcl-termux-login-env:v2
MCL_TERMUX_PREFIX='/data/data/com.termux/files/usr'
export PREFIX="$MCL_TERMUX_PREFIX"
export TMPDIR="$MCL_TERMUX_PREFIX/tmp"
unset MCL_TERMUX_PREFIX
EOF

cat > "$BASE_RC" <<'EOF'
# BEGIN AUTO SIMRESUME
printf '%s\n' should-not-run > "$HOME/auto-simresume-ran"
# END AUTO SIMRESUME
export PATH="$HOME/bin:$PATH"
EOF

reset_root() {
    rm -rf "$ROOT"
    mkdir -p "$ROOT/.local/bin"
    cp "$BASE_LOGIN" "$ROOT/.bash_profile"
    cp "$BASE_RC" "$ROOT/.bashrc"
}
prefix_preserved() {
    before=$1
    after=$2
    bytes=$(wc -c < "$before" | tr -d ' ')
    head -c "$bytes" "$after" | cmp -s "$before" - || fail "prefix changed: $after"
}

printf 'TEST check-missing-is-read-only\n'
reset_root
login_before=$(sha "$ROOT/.bash_profile")
rc_before=$(sha "$ROOT/.bashrc")
run_owner --check
assert_rc 1
expected='schema=mcl-m-operator-path.v1
local_bin=present
login_profile=missing
interactive_profile=missing
result=needs_apply
details=withheld'
[ "$OUT" = "$expected" ] || fail "unexpected check receipt: $OUT"
[ "$(sha "$ROOT/.bash_profile")" = "$login_before" ] || fail 'check mutated login profile'
[ "$(sha "$ROOT/.bashrc")" = "$rc_before" ] || fail 'check mutated interactive profile'
printf 'PASS check-missing-is-read-only\n'

printf 'TEST apply-appends-exact-blocks\n'
cp "$ROOT/.bash_profile" "$TMP/login.pre"
cp "$ROOT/.bashrc" "$TMP/rc.pre"
run_owner --apply
assert_rc 0
assert_line 'result=pass'
prefix_preserved "$TMP/login.pre" "$ROOT/.bash_profile"
prefix_preserved "$TMP/rc.pre" "$ROOT/.bashrc"
[ ! -e "$ROOT/auto-simresume-ran" ] || fail 'AUTO SIMRESUME was executed'
[ "$(grep -Fxc '# BEGIN mcl-m-operator-path:v1' "$ROOT/.bash_profile")" -eq 1 ] || fail 'login block count'
[ "$(grep -Fxc '# BEGIN mcl-m-operator-path:v1' "$ROOT/.bashrc")" -eq 1 ] || fail 'interactive block count'
printf 'PASS apply-appends-exact-blocks\n'

printf 'TEST repeated-apply-noop\n'
login_before=$(sha "$ROOT/.bash_profile")
rc_before=$(sha "$ROOT/.bashrc")
run_owner --apply
assert_rc 0
[ "$(sha "$ROOT/.bash_profile")" = "$login_before" ] || fail 'repeat changed login profile'
[ "$(sha "$ROOT/.bashrc")" = "$rc_before" ] || fail 'repeat changed interactive profile'
printf 'PASS repeated-apply-noop\n'

printf 'TEST one-missing-mutates-only-missing\n'
cp "$BASE_RC" "$ROOT/.bashrc"
login_before=$(sha "$ROOT/.bash_profile")
run_owner --apply
assert_rc 0
[ "$(sha "$ROOT/.bash_profile")" = "$login_before" ] || fail 'present login profile changed'
[ "$(grep -Fxc '# BEGIN mcl-m-operator-path:v1' "$ROOT/.bashrc")" -eq 1 ] || fail 'missing interactive not repaired'
[ ! -e "$ROOT/auto-simresume-ran" ] || fail 'AUTO SIMRESUME ran during one-missing apply'
printf 'PASS one-missing-mutates-only-missing\n'
printf 'TEST duplicate-and-partial-markers-block\n'
sed -n '/^# BEGIN mcl-m-operator-path:v1$/,/^# END mcl-m-operator-path:v1$/p' "$ROOT/.bash_profile" > "$TMP/duplicate.block"
cat "$TMP/duplicate.block" >> "$ROOT/.bash_profile"
run_owner --check
assert_rc 2
assert_line 'login_profile=conflict'
assert_line 'result=blocked'
reset_root
printf '%s\n' '# BEGIN mcl-m-operator-path:v1' >> "$ROOT/.bash_profile"
run_owner --check
assert_rc 2
assert_line 'login_profile=conflict'
printf 'PASS duplicate-and-partial-markers-block\n'

printf 'TEST missing-and-symlink-profiles-block\n'
reset_root
rm "$ROOT/.bashrc"
run_owner --check
assert_rc 2
assert_line 'interactive_profile=conflict'
reset_root
rm "$ROOT/.bashrc"
ln -s .bash_profile "$ROOT/.bashrc"
run_owner --check
assert_rc 2
assert_line 'interactive_profile=conflict'
printf 'PASS missing-and-symlink-profiles-block\n'

printf 'TEST local-bin-missing-and-conflict-block\n'
reset_root
rm -rf "$ROOT/.local/bin"
run_owner --check
assert_rc 2
assert_line 'local_bin=missing'
assert_line 'result=blocked'
reset_root
rm -rf "$ROOT/.local/bin"
: > "$ROOT/.local/bin"
run_owner --check
assert_rc 2
assert_line 'local_bin=conflict'
printf 'PASS local-bin-missing-and-conflict-block\n'

printf 'TEST invalid-arg-has-no-mutation\n'
reset_root
login_before=$(sha "$ROOT/.bash_profile")
rc_before=$(sha "$ROOT/.bashrc")
run_owner --bogus
assert_rc 2
[ "$(sha "$ROOT/.bash_profile")" = "$login_before" ] || fail 'invalid arg changed login'
[ "$(sha "$ROOT/.bashrc")" = "$rc_before" ] || fail 'invalid arg changed rc'
printf 'PASS invalid-arg-has-no-mutation\n'

printf 'TEST canonical-block-path-semantics\n'
reset_root
run_owner --apply
assert_rc 0
sed -n '/^# BEGIN mcl-m-operator-path:v1$/,/^# END mcl-m-operator-path:v1$/p' "$ROOT/.bash_profile" > "$TMP/block.sh"
path_once=$(HOME="$ROOT" PATH='/a:/b' /bin/sh -c '. "$1"; printf "%s" "$PATH"' sh "$TMP/block.sh")
[ "$path_once" = "$ROOT/.local/bin:/a:/b" ] || fail "unexpected prepend: $path_once"
path_twice=$(HOME="$ROOT" PATH='/a:/b' /bin/sh -c '. "$1"; . "$1"; printf "%s" "$PATH"' sh "$TMP/block.sh")
[ "$path_twice" = "$ROOT/.local/bin:/a:/b" ] || fail "duplicate local-bin: $path_twice"
existing="/a:$ROOT/.local/bin:/b"
path_existing=$(HOME="$ROOT" PATH="$existing" /bin/sh -c '. "$1"; printf "%s" "$PATH"' sh "$TMP/block.sh")
[ "$path_existing" = "$existing" ] || fail 'existing local-bin path reordered'
printf 'PASS canonical-block-path-semantics\n'

printf 'TEST production-home-fails-closed-off-M\n'
set +e
OUT=$(HOME=/root "$SCRIPT" --check 2>&1)
RC=$?
set -e
assert_rc 2
assert_line 'result=blocked'
printf 'PASS production-home-fails-closed-off-M\n'

printf 'TEST fixed-surface-source-scan\n'
source_text=$(cat "$SCRIPT")
for required in \
    "FIXED_HOME='/data/data/com.termux/files/home'" \
    '# BEGIN mcl-m-operator-path:v1' \
    "LOGIN_PROFILE=\"\$HOME_DIR/.bash_profile\"" \
    "INTERACTIVE_PROFILE=\"\$HOME_DIR/.bashrc\""; do
    printf '%s\n' "$source_text" | grep -F "$required" >/dev/null || fail "missing fixed source contract: $required"
done
for forbidden in 'pkg ' 'apt ' 'git ' 'runit' 'proot' 'adb ' 'settings ' 'curl ' 'wget ' 'http://' 'https://' 'eval ' 'bash -c'; do
    if printf '%s\n' "$source_text" | grep -F "$forbidden" >/dev/null; then
        fail "forbidden source surface: $forbidden"
    fi
done
printf 'PASS fixed-surface-source-scan\n'

printf 'PASS m-operator-path contract\n'
