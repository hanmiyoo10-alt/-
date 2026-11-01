#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OWNER=$(CDPATH= cd -- "$HERE/.." && pwd)
SOURCE="$OWNER/mcl-l-landing-branch-repair"
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
git -C "$SEED" remote add origin "$REMOTE"
git -C "$SEED" push -q -u origin main
git --git-dir="$REMOTE" symbolic-ref HEAD refs/heads/main

make_fixture() {
  name=$1
  FIX="$TMP/$name"
  TOOL="$TMP/tool-$name"
  git clone -q "$REMOTE" "$FIX"
  git -C "$FIX" config user.name fixture
  git -C "$FIX" config user.email fixture@example.invalid
  git -C "$FIX" checkout -q --detach "$c1"
  git -C "$FIX" branch -f main "$c2"
  git -C "$FIX" update-ref refs/remotes/origin/main "$c1"
  git -C "$FIX" remote set-url origin "file://$REMOTE"
  sed \
    -e "s|CANONICAL_ORIGIN='https://github.com/hanmiyoo10-alt/-.git'|CANONICAL_ORIGIN='file://$REMOTE'|" \
    -e "s|REPO='/home/alsl0/nyang-repo'|REPO='$FIX'|" \
    "$SOURCE" >"$TOOL"
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
assert_eq "$(field schema)" mcl-l-landing-branch-repair.v1
assert_eq "$(field actual_branch)" detached
assert_eq "$(field guards)" pass
assert_eq "$(field state)" ready
assert_eq "$(field effect)" not_run
after=$(git -C "$FIX" for-each-ref --format='%(refname)%09%(objectname)' | LC_ALL=C sort | sha256sum | awk '{print $1}')
assert_eq "$after" "$before"
assert_eq "$ERR" ''
pass

remote_main_before=$(git --git-dir="$REMOTE" rev-parse refs/heads/main)
origin_before=$(git -C "$FIX" rev-parse refs/remotes/origin/main)
other_before=$(git -C "$FIX" for-each-ref --format='%(refname)%09%(objectname)' | awk -F '\t' '$1!="refs/heads/main"' | LC_ALL=C sort | sha256sum | awk '{print $1}')
run_tool apply "$c3"
assert_eq "$RC" 0
assert_eq "$(field effect)" applied
assert_eq "$(field state)" converged
assert_eq "$(field remote_target_preserved)" yes
assert_eq "$(field other_refs_preserved)" yes
assert_eq "$(field origin_main_preserved)" yes
assert_eq "$(git -C "$FIX" branch --show-current)" main
assert_eq "$(git -C "$FIX" rev-parse HEAD)" "$c3"
assert_eq "$(git -C "$FIX" rev-parse refs/heads/main)" "$c3"
assert_eq "$(git --git-dir="$REMOTE" rev-parse refs/heads/main)" "$remote_main_before"
assert_eq "$(git -C "$FIX" rev-parse refs/remotes/origin/main)" "$origin_before"
other_after=$(git -C "$FIX" for-each-ref --format='%(refname)%09%(objectname)' | awk -F '\t' '$1!="refs/heads/main"' | LC_ALL=C sort | sha256sum | awk '{print $1}')
assert_eq "$other_after" "$other_before"
[ -z "$(git -C "$FIX" status --porcelain)" ] || fail 'apply left dirty worktree'
pass

run_tool apply "$c3"
assert_eq "$RC" 0
assert_eq "$(field effect)" already_converged
pass

make_fixture missing-target
git -C "$FIX" branch -D main >/dev/null
run_tool inspect "$c3"
assert_eq "$RC" 0
assert_eq "$(field target_local)" missing
assert_eq "$(field state)" ready
run_tool apply "$c3"
assert_eq "$RC" 0
assert_eq "$(git -C "$FIX" branch --show-current)" main
assert_eq "$(git -C "$FIX" rev-parse HEAD)" "$c3"
pass

make_fixture dirty
printf 'dirty\n' >"$FIX/dirty.txt"
run_tool inspect "$c3"
assert_eq "$RC" 3
assert_eq "$(field worktree)" dirty
pass

make_fixture named-branch
git -C "$FIX" switch -q -c laptop/other "$c1"
run_tool inspect "$c3"
assert_eq "$RC" 3
assert_eq "$(field guards)" blocked
pass

make_fixture remote-main
run_tool inspect "$c2"
assert_eq "$RC" 3
pass

make_fixture target-diverged
git -C "$FIX" switch -q -c fixture-target-diverge "$c1"
printf 'target-diverge\n' >"$FIX/target-diverge.txt"
git -C "$FIX" add target-diverge.txt
git -C "$FIX" commit -q -m target-diverge
target_diverged=$(git -C "$FIX" rev-parse HEAD)
git -C "$FIX" checkout -q --detach "$c1"
git -C "$FIX" branch -f main "$target_diverged"
run_tool inspect "$c3"
assert_eq "$RC" 3
pass

make_fixture checked-elsewhere
git -C "$FIX" worktree add -q "$TMP/other-worktree" main
run_tool inspect "$c3"
assert_eq "$RC" 3
git -C "$FIX" worktree remove -f "$TMP/other-worktree"
pass

make_fixture symbolic-target
git -C "$FIX" branch laptop/preserved "$c2"
git -C "$FIX" symbolic-ref refs/heads/main refs/heads/laptop/preserved
preserved_before=$(git -C "$FIX" rev-parse refs/heads/laptop/preserved)
run_tool inspect "$c3"
assert_eq "$RC" 3
run_tool apply "$c3"
assert_eq "$RC" 3
assert_eq "$(git -C "$FIX" rev-parse refs/heads/laptop/preserved)" "$preserved_before"
assert_eq "$(git -C "$FIX" symbolic-ref refs/heads/main)" refs/heads/laptop/preserved
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

for forbidden in 'reset --hard' 'checkout -f' 'switch -f' ' stash ' ' clean ' ' merge ' ' rebase ' ' pull ' ' fetch ' 'worktree remove' ' push '; do
  if grep -Fq "$forbidden" "$SOURCE"; then fail "forbidden mutation surface: $forbidden"; fi
done
grep -Fq 'update-ref --no-deref "refs/heads/$TARGET_BRANCH" "$expected" "$old_target"' "$SOURCE" || fail 'no-deref CAS target update missing'
grep -Fq 'switch --quiet "$TARGET_BRANCH"' "$SOURCE" || fail 'ordinary switch missing'
grep -Fq "TARGET_BRANCH='main'" "$SOURCE" || fail 'fixed target branch missing'
grep -Fq "REPO='/home/alsl0/nyang-repo'" "$SOURCE" || fail 'fixed worktree missing'
grep -Fq 'ACTUAL_BRANCH=detached' "$SOURCE" || fail 'detached admission missing'
pass

printf 'landing-branch-repair L contract: %s/%s PASS\n' "$TESTS" "$TESTS"
