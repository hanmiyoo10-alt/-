#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OWNER=$(CDPATH= cd -- "$HERE/.." && pwd)
SOURCE="$OWNER/mcl-s-landing-branch-repair"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
REMOTE="$TMP/remote.git"
SEED="$TMP/seed"
OUT=''
RC=0
TESTS=0

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
pass() { TESTS=$((TESTS + 1)); }
assert_eq() { [ "$1" = "$2" ] || fail "expected [$2], got [$1]"; }
field() { key=$1; printf '%s\n' "$OUT" | awk -F= -v key="$key" '$1==key {print substr($0,length(key)+2)}'; }

git init -q --bare "$REMOTE"
git init -q "$SEED"
git -C "$SEED" config user.name fixture
git -C "$SEED" config user.email fixture@example.invalid
printf 'one\n' >"$SEED/file.txt"
git -C "$SEED" add file.txt
git -C "$SEED" commit -q -m one
c1=$(git -C "$SEED" rev-parse HEAD)
printf 'two\n' >>"$SEED/file.txt"
git -C "$SEED" commit -qam two
c2=$(git -C "$SEED" rev-parse HEAD)
printf 'three\n' >>"$SEED/file.txt"
git -C "$SEED" commit -qam three
c3=$(git -C "$SEED" rev-parse HEAD)
git -C "$SEED" branch -M main
git -C "$SEED" branch server/work "$c2"
git -C "$SEED" remote add origin "$REMOTE"
git -C "$SEED" push -q -u origin main
git -C "$SEED" push -q origin server/work
git --git-dir="$REMOTE" symbolic-ref HEAD refs/heads/main

make_fixture() {
  name=$1
  FIX="$TMP/$name"
  TOOL="$TMP/tool-$name"
  git clone -q "$REMOTE" "$FIX"
  git -C "$FIX" config user.name fixture
  git -C "$FIX" config user.email fixture@example.invalid
  git -C "$FIX" switch -q -c server/source-fixture "$c1"
  git -C "$FIX" branch server/work "$c2"
  git -C "$FIX" remote set-url origin "file://$REMOTE"
  sed     -e "s|CANONICAL_ORIGIN='https://github.com/hanmiyoo10-alt/-.git'|CANONICAL_ORIGIN='file://$REMOTE'|"     -e "s|REPO='/root/nyang-repo'|REPO='$FIX'|"     "$SOURCE" >"$TOOL"
  chmod +x "$TOOL"
}
run_tool() {
  set +e
  OUT=$("$TOOL" "$@" 2>"$TMP/stderr")
  RC=$?
  set -e
  ERR=$(cat "$TMP/stderr")
}

make_fixture ready
before=$(git -C "$FIX" for-each-ref --format='%(refname)%09%(objectname)' | LC_ALL=C sort | sha256sum | awk '{print $1}')
run_tool inspect "$c3"
assert_eq "$RC" 0
assert_eq "$(field schema)" mcl-s-landing-branch-repair.v1
assert_eq "$(field guards)" pass
assert_eq "$(field state)" ready
assert_eq "$(field effect)" not_run
after=$(git -C "$FIX" for-each-ref --format='%(refname)%09%(objectname)' | LC_ALL=C sort | sha256sum | awk '{print $1}')
assert_eq "$after" "$before"
assert_eq "$ERR" ''
pass

remote_target_before=$(git --git-dir="$REMOTE" rev-parse refs/heads/server/work)
origin_before=$(git -C "$FIX" rev-parse refs/remotes/origin/main)
source_before=$(git -C "$FIX" rev-parse refs/heads/server/source-fixture)
run_tool apply "$c3"
assert_eq "$RC" 0
assert_eq "$(field effect)" applied
assert_eq "$(field state)" converged
assert_eq "$(field remote_target_preserved)" yes
assert_eq "$(field other_refs_preserved)" yes
assert_eq "$(field origin_main_preserved)" yes
assert_eq "$(git -C "$FIX" branch --show-current)" server/work
assert_eq "$(git -C "$FIX" rev-parse HEAD)" "$c3"
assert_eq "$(git -C "$FIX" rev-parse refs/heads/server/work)" "$c3"
assert_eq "$(git -C "$FIX" rev-parse refs/heads/server/source-fixture)" "$source_before"
assert_eq "$(git --git-dir="$REMOTE" rev-parse refs/heads/server/work)" "$remote_target_before"
assert_eq "$(git -C "$FIX" rev-parse refs/remotes/origin/main)" "$origin_before"
[ -z "$(git -C "$FIX" status --porcelain)" ] || fail 'apply left dirty worktree'
pass

run_tool apply "$c3"
assert_eq "$RC" 0
assert_eq "$(field effect)" already_converged
pass

make_fixture dirty
printf 'dirty\n' >"$FIX/dirty.txt"
branch_before=$(git -C "$FIX" branch --show-current)
target_before=$(git -C "$FIX" rev-parse refs/heads/server/work)
run_tool inspect "$c3"
assert_eq "$RC" 3
assert_eq "$(field worktree)" dirty
assert_eq "$(git -C "$FIX" branch --show-current)" "$branch_before"
assert_eq "$(git -C "$FIX" rev-parse refs/heads/server/work)" "$target_before"
pass

make_fixture branch
git -C "$FIX" switch -q -c mainphone/other "$c1"
run_tool inspect "$c3"
assert_eq "$RC" 3
assert_eq "$(field guards)" blocked
pass

make_fixture remote-main
run_tool inspect "$c2"
assert_eq "$RC" 3
pass

make_fixture source-diverged
git -C "$FIX" switch -q server/source-fixture
git -C "$FIX" switch -q -c fixture-diverge "$c1"
printf 'diverge\n' >"$FIX/diverge.txt"
git -C "$FIX" add diverge.txt
git -C "$FIX" commit -q -m diverge
diverged=$(git -C "$FIX" rev-parse HEAD)
git -C "$FIX" branch -f server/source-fixture "$diverged"
git -C "$FIX" switch -q server/source-fixture
run_tool inspect "$c3"
assert_eq "$RC" 3
pass

make_fixture target-diverged
git -C "$FIX" switch -q -c fixture-target-diverge "$c1"
printf 'target-diverge\n' >"$FIX/target-diverge.txt"
git -C "$FIX" add target-diverge.txt
git -C "$FIX" commit -q -m target-diverge
target_diverged=$(git -C "$FIX" rev-parse HEAD)
git -C "$FIX" switch -q server/source-fixture
git -C "$FIX" branch -f server/work "$target_diverged"
run_tool inspect "$c3"
assert_eq "$RC" 3
pass

make_fixture checked-elsewhere
git -C "$FIX" worktree add -q "$TMP/other-worktree" server/work
run_tool inspect "$c3"
assert_eq "$RC" 3
git -C "$FIX" worktree remove -f "$TMP/other-worktree"
pass

make_fixture remote-target-diverged
git -C "$SEED" switch -q -c fixture-remote-diverge "$c1"
printf 'remote-diverge\n' >"$SEED/remote-diverge.txt"
git -C "$SEED" add remote-diverge.txt
git -C "$SEED" commit -q -m remote-diverge
remote_diverged=$(git -C "$SEED" rev-parse HEAD)
git -C "$SEED" push -q -f origin "$remote_diverged":refs/heads/server/work
git -C "$FIX" fetch -q origin refs/heads/server/work:refs/remotes/origin/fixture-target
run_tool inspect "$c3"
assert_eq "$RC" 3
git --git-dir="$REMOTE" update-ref refs/heads/server/work "$c2"
git -C "$SEED" switch -q main
pass

make_fixture missing-object
printf 'four\n' >>"$SEED/file.txt"
git -C "$SEED" commit -qam four
c4=$(git -C "$SEED" rev-parse HEAD)
git -C "$SEED" push -q origin main
run_tool inspect "$c4"
assert_eq "$RC" 3
git --git-dir="$REMOTE" update-ref refs/heads/main "$c3"
pass

run_tool inspect
assert_eq "$RC" 64
pass
run_tool nope "$c3"
assert_eq "$RC" 64
pass

for forbidden in   'reset --hard' 'checkout -f' 'switch -f' ' stash ' ' clean ' ' merge ' ' rebase ' ' pull ' 'worktree remove' ' push '; do
  if grep -Fq "$forbidden" "$SOURCE"; then fail "forbidden mutation surface: $forbidden"; fi
done
grep -Fq 'update-ref "refs/heads/$TARGET_BRANCH" "$expected" "$target_before"' "$SOURCE" || fail 'CAS target update missing'
grep -Fq 'switch --quiet "$TARGET_BRANCH"' "$SOURCE" || fail 'ordinary switch missing'
grep -Fq "TARGET_BRANCH='server/work'" "$SOURCE" || fail 'fixed target branch missing'
grep -Fq 'server/*)' "$SOURCE" || fail 'server source-branch admission missing'
grep -Fq "REPO='/root/nyang-repo'" "$SOURCE" || fail 'fixed worktree missing'
pass

printf 'landing-branch-repair contract: %s/%s PASS\n' "$TESTS" "$TESTS"
