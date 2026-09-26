#!/bin/sh
set -eu

TEST_DIR=$(CDPATH= cd "$(dirname "$0")" && pwd)
ROOT=$(CDPATH= cd "$TEST_DIR/.." && pwd)
LAUNCHER=$ROOT/mcl-stage-entry-current
INSTALLER=$ROOT/install-stage-entry-current.sh
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

fail() {
  printf 'FAIL %s\n' "$*" >&2
  exit 1
}
assert_contains() {
  printf '%s\n' "$1" | grep -F "$2" >/dev/null || fail "missing: $2"
}
run_cmd() {
  set +e
  RUN_OUTPUT=$("$@" 2>&1)
  RUN_RC=$?
  set -e
}
assert_zero() { [ "$RUN_RC" -eq 0 ] || fail "rc=$RUN_RC: $RUN_OUTPUT"; }
assert_nonzero() { [ "$RUN_RC" -ne 0 ] || fail "expected nonzero: $RUN_OUTPUT"; }

REAL_GIT=$(command -v git)
SOURCE=$TMP/source
REMOTE=$TMP/remote.git
mkdir -p "$SOURCE"
git init -q -b main "$SOURCE"
mkdir -p "$SOURCE/products/chatgpt-mobile-coder-lab/coordination/stage-entry"
cat > "$SOURCE/products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs" <<'EOF'
#!/usr/bin/env node
'use strict';
process.stdout.write(JSON.stringify({argv: process.argv.slice(2)}));
EOF
git -C "$SOURCE" add .
git -C "$SOURCE" -c user.name=Test -c user.email=test@example.invalid commit -qm seed
git init --bare -q "$REMOTE"
git -C "$SOURCE" remote add origin "$REMOTE"
git -C "$SOURCE" push -q -u origin main
MAIN=$(git -C "$SOURCE" rev-parse HEAD)

RUNTIME=$TMP/runtime
mkdir -p "$RUNTIME"
TEST_LAUNCHER=$TMP/mcl-stage-entry-current
sed \
  -e "s|^CANONICAL_ORIGIN=.*|CANONICAL_ORIGIN='$REMOTE'|" \
  -e "s|^TMP_ROOT=.*|TMP_ROOT='$RUNTIME'|" \
  "$LAUNCHER" > "$TEST_LAUNCHER"
PLAN=$TMP/plan.json
printf '%s\n' '{}' > "$PLAN"

printf 'TEST source-status-binds-exact-main\n'
run_cmd sh "$TEST_LAUNCHER" source-status
assert_zero
assert_contains "$RUN_OUTPUT" "source_main=$MAIN"
assert_contains "$RUN_OUTPUT" 'snapshot=verified'
left=$(find "$RUNTIME" -mindepth 1 -maxdepth 1 -print -quit)
[ -z "$left" ] || fail "temporary source residue: $left"
printf 'PASS source-status-binds-exact-main\n'

printf 'TEST inspect-and-apply-forward-only-fixed-owner\n'
run_cmd sh "$TEST_LAUNCHER" inspect --packet '#77' --plan "$PLAN"
assert_zero
assert_contains "$RUN_OUTPUT" '"inspect"'
assert_contains "$RUN_OUTPUT" '"--source-main"'
assert_contains "$RUN_OUTPUT" "$MAIN"
run_cmd sh "$TEST_LAUNCHER" apply --packet '#77' --plan "$PLAN" --apply
assert_zero
assert_contains "$RUN_OUTPUT" '"apply"'
assert_contains "$RUN_OUTPUT" '"--source-main"'
assert_contains "$RUN_OUTPUT" '"--apply"'
printf 'PASS inspect-and-apply-forward-only-fixed-owner\n'

printf 'TEST unsupported-shapes-fail-closed\n'
run_cmd sh "$TEST_LAUNCHER" inspect --packet '#77' --plan "$PLAN" --source-main "$MAIN"
[ "$RUN_RC" -eq 64 ] || fail "caller source-main was not rejected: $RUN_OUTPUT"
run_cmd sh "$TEST_LAUNCHER" shell --packet '#77' --plan "$PLAN"
[ "$RUN_RC" -eq 64 ] || fail "arbitrary command was not rejected: $RUN_OUTPUT"
printf 'PASS unsupported-shapes-fail-closed\n'
printf 'TEST remote-main-move-fails-capture\n'
MOCK_BIN=$TMP/mock-bin
MOCK_STATE=$TMP/mock-ls-remote-count
mkdir -p "$MOCK_BIN"
cat > "$MOCK_BIN/git" <<'EOF'
#!/bin/sh
count_file=${MOCK_STATE:?}
real_git=${REAL_GIT:?}
if [ "${1:-}" = ls-remote ]; then
  count=$(cat "$count_file" 2>/dev/null || printf 0)
  count=$((count + 1))
  printf '%s\n' "$count" > "$count_file"
  if [ "$count" -eq 2 ]; then
    printf '%s refs/heads/main\n' bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    exit 0
  fi
fi
exec "$real_git" "$@"
EOF
chmod +x "$MOCK_BIN/git"
run_cmd env PATH="$MOCK_BIN:$PATH" REAL_GIT="$REAL_GIT" MOCK_STATE="$MOCK_STATE" \
  sh "$TEST_LAUNCHER" source-status
assert_nonzero
assert_contains "$RUN_OUTPUT" 'remote main changed during capture'
printf 'PASS remote-main-move-fails-capture\n'
printf 'TEST installer-is-fixed-atomic-and-idempotent\n'
INSTALL_SRC=$TMP/install-src
TARGET_BIN=$TMP/target-bin
mkdir -p "$INSTALL_SRC" "$TARGET_BIN"
cp "$LAUNCHER" "$INSTALL_SRC/mcl-stage-entry-current"
TEST_INSTALLER=$INSTALL_SRC/install-stage-entry-current.sh
sed "s|^TARGET_DIR=.*|TARGET_DIR='$TARGET_BIN'|" "$INSTALLER" > "$TEST_INSTALLER"

run_cmd sh "$TEST_INSTALLER" check
assert_nonzero
assert_contains "$RUN_OUTPUT" 'state=missing'
run_cmd sh "$TEST_INSTALLER" apply
assert_zero
assert_contains "$RUN_OUTPUT" 'state=installed'
TARGET=$TARGET_BIN/mcl-stage-entry-current
[ -f "$TARGET" ] && [ ! -L "$TARGET" ] || fail 'target is not regular'
[ "$(stat -c '%a' "$TARGET")" = 755 ] || fail 'target mode is not 755'
cmp -s "$INSTALL_SRC/mcl-stage-entry-current" "$TARGET" || fail 'installed bytes differ'
identity_before=$(stat -c '%i:%Y' "$TARGET")
run_cmd sh "$TEST_INSTALLER" apply
assert_zero
assert_contains "$RUN_OUTPUT" 'state=already_exact'
identity_after=$(stat -c '%i:%Y' "$TARGET")
[ "$identity_before" = "$identity_after" ] || fail 'exact second apply rewrote target'
printf 'PASS installer-is-fixed-atomic-and-idempotent\n'
printf 'TEST installer-repairs-drift-and-blocks-symlink\n'
printf '%s\n' '# drift' >> "$TARGET"
run_cmd sh "$TEST_INSTALLER" check
assert_nonzero
assert_contains "$RUN_OUTPUT" 'state=drift'
run_cmd sh "$TEST_INSTALLER" apply
assert_zero
assert_contains "$RUN_OUTPUT" 'state=installed'
cmp -s "$INSTALL_SRC/mcl-stage-entry-current" "$TARGET" || fail 'drift repair bytes differ'
rm -f "$TARGET"
ln -s "$INSTALL_SRC/mcl-stage-entry-current" "$TARGET"
run_cmd sh "$TEST_INSTALLER" apply
assert_nonzero
assert_contains "$RUN_OUTPUT" 'state=blocked'
printf 'PASS installer-repairs-drift-and-blocks-symlink\n'

printf 'ALL TESTS PASS\n'
