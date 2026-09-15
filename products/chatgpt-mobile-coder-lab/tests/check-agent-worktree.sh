#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
CHECKER="$SCRIPT_DIR/../scripts/check-agent-worktree.sh"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

assert_line() {
  local output=$1
  local expected=$2
  grep -Fqx -- "$expected" <<< "$output" || \
    fail "missing output line: $expected"
}

expect_failure() {
  local description=$1
  shift
  if "$@" >"$TMP/last.out" 2>"$TMP/last.err"; then
    fail "$description unexpectedly succeeded"
  fi
}

[[ -x "$CHECKER" ]] || fail "checker is not executable: $CHECKER"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CONTROL="$TMP/control"
WORKTREE="$TMP/worktree"
UNREGISTERED="$TMP/unregistered"

mkdir -p "$CONTROL"
git init -q -b main "$CONTROL"
printf 'initial\n' >"$CONTROL/README.md"
git -C "$CONTROL" add -- README.md
git -C "$CONTROL" \
  -c user.name="Agent Worktree Test" \
  -c user.email="agent-worktree-test@invalid.example" \
  commit -qm "initial"
BASE_SHA=$(git -C "$CONTROL" rev-parse HEAD)

git -C "$CONTROL" worktree add -q -b agent/test "$WORKTREE" HEAD

output=$("$CHECKER" "$CONTROL" "$WORKTREE" agent/test "$BASE_SHA")
assert_line "$output" "worktree=$WORKTREE"
assert_line "$output" "branch=agent/test"
assert_line "$output" "head=$BASE_SHA"
assert_line "$output" "status=clean"
assert_line "$output" "base=$BASE_SHA"
assert_line "$output" "ahead=0"
assert_line "$output" "behind=0"

printf 'ahead\n' >>"$WORKTREE/README.md"
git -C "$WORKTREE" add -- README.md
git -C "$WORKTREE" \
  -c user.name="Agent Worktree Test" \
  -c user.email="agent-worktree-test@invalid.example" \
  commit -qm "ahead"
AHEAD_SHA=$(git -C "$WORKTREE" rev-parse HEAD)

output=$("$CHECKER" "$CONTROL" "$WORKTREE" agent/test "$BASE_SHA")
assert_line "$output" "worktree=$WORKTREE"
assert_line "$output" "branch=agent/test"
assert_line "$output" "head=$AHEAD_SHA"
assert_line "$output" "status=clean"
assert_line "$output" "base=$BASE_SHA"
assert_line "$output" "ahead=1"
assert_line "$output" "behind=0"

expect_failure "wrong expected branch" \
  "$CHECKER" "$CONTROL" "$WORKTREE" agent/wrong "$BASE_SHA"

printf 'dirty\n' >"$WORKTREE/dirty.tmp"
expect_failure "dirty worktree" \
  "$CHECKER" "$CONTROL" "$WORKTREE" agent/test "$BASE_SHA"
rm -f -- "$WORKTREE/dirty.tmp"

printf 'dirty\n' >"$CONTROL/control-dirty.tmp"
expect_failure "dirty control repo" \
  "$CHECKER" "$CONTROL" "$WORKTREE" agent/test "$BASE_SHA"
rm -f -- "$CONTROL/control-dirty.tmp"

expect_failure "missing worktree" \
  "$CHECKER" "$CONTROL" "$TMP/missing-worktree" agent/test "$BASE_SHA"

mkdir -p "$UNREGISTERED"
expect_failure "unregistered worktree" \
  "$CHECKER" "$CONTROL" "$UNREGISTERED" agent/test "$BASE_SHA"

expect_failure "relative control repo" \
  "$CHECKER" relative-control "$WORKTREE" agent/test "$BASE_SHA"

expect_failure "relative worktree path" \
  "$CHECKER" "$CONTROL" relative-worktree agent/test "$BASE_SHA"

expect_failure "control repo used as worktree" \
  "$CHECKER" "$CONTROL" "$CONTROL" main "$BASE_SHA"

printf 'PASS: check-agent-worktree integration tests\n'
