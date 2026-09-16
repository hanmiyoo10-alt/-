#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OWNER=$(CDPATH= cd -- "$HERE/.." && pwd)
SOURCE="$OWNER/mcl-landing-freshness"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT HUP INT TERM

REAL_GIT=$(command -v git)
REMOTE="$TMP/remote.git"
SEED="$TMP/seed"
S_FIX="$TMP/s-landing"
M_FIX="$TMP/m-landing"
TOOL="$TMP/mcl-landing-freshness"
OUT=''
ERR=''
RC=0
TESTS=0

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

pass() {
  TESTS=$((TESTS + 1))
}

assert_eq() {
  [ "$1" = "$2" ] || fail "expected [$2], got [$1]"
}
field() {
  key=$1
  printf '%s\n' "$OUT" | awk -F= -v key="$key" '$1 == key {print substr($0, length(key) + 2)}'
}

run_tool() {
  set +e
  OUT=$("$TOOL" "$@" 2>"$TMP/stderr")
  RC=$?
  set -e
  ERR=$(cat "$TMP/stderr")
}

configure_fixture_origin() {
  repo=$1
  git -C "$repo" remote set-url origin "file://$REMOTE"
}

origin_main() {
  git -C "$1" rev-parse --verify refs/remotes/origin/main
}

status_fingerprint() {
  repo=$1
  printf '%s|%s|%s\n' \
    "$(git -C "$repo" rev-parse HEAD)" \
    "$(git -C "$repo" branch --show-current)" \
    "$(git -C "$repo" status --porcelain | sha256sum | awk '{print $1}')"
}
worktree_bytes() {
  sha256sum "$1/file.txt" | awk '{print $1}'
}
git init -q --bare "$REMOTE"
git init -q "$SEED"
git -C "$SEED" config user.name fixture
git -C "$SEED" config user.email fixture@example.invalid
printf 'one\n' >"$SEED/file.txt"
git -C "$SEED" add file.txt
git -C "$SEED" commit -q -m one
git -C "$SEED" branch -M main
git -C "$SEED" remote add origin "$REMOTE"
git -C "$SEED" push -q -u origin main
git --git-dir="$REMOTE" symbolic-ref HEAD refs/heads/main

git clone -q "$REMOTE" "$S_FIX"
git -C "$S_FIX" switch -q -c server/work
configure_fixture_origin "$S_FIX"

git clone -q "$REMOTE" "$M_FIX"
git -C "$M_FIX" switch -q -c mainphone/rdc-prep-milestone-2213
configure_fixture_origin "$M_FIX"

sed \
  -e "s|CANONICAL_ORIGIN='https://github.com/hanmiyoo10-alt/-.git'|CANONICAL_ORIGIN='file://$REMOTE'|" \
  -e "s|S_REPO='/root/nyang-repo'|S_REPO='$S_FIX'|" \
  -e "s|M_REPO='/data/data/com.termux/files/home/nyang-worktrees/mainphone-work'|M_REPO='$M_FIX'|" \
  "$SOURCE" >"$TOOL"
chmod +x "$TOOL"

run_tool status S
assert_eq "$RC" 0
assert_eq "$(field schema)" mcl-landing-freshness.v1
assert_eq "$(field landing_relation)" equal
assert_eq "$(field origin_remote_relation)" same
assert_eq "$(field refresh)" not_requested
pass
m_before=$(status_fingerprint "$M_FIX")
m_origin_before=$(origin_main "$M_FIX")
run_tool refresh M
assert_eq "$RC" 3
assert_eq "$(field landing_relation)" branch_mismatch
assert_eq "$(field refresh)" blocked
assert_eq "$(status_fingerprint "$M_FIX")" "$m_before"
assert_eq "$(origin_main "$M_FIX")" "$m_origin_before"
pass

printf 'two\n' >>"$SEED/file.txt"
git -C "$SEED" add file.txt
git -C "$SEED" commit -q -m two
git -C "$SEED" push -q origin main
remote_two=$(git -C "$SEED" rev-parse HEAD)

run_tool status S
assert_eq "$RC" 0
assert_eq "$(field origin_remote_relation)" stale
assert_eq "$(field remote_main)" "$remote_two"
assert_eq "$(field landing_relation)" unknown
pass

git -C "$S_FIX" fetch -q origin refs/heads/main:refs/remotes/probe/main
run_tool status S
assert_eq "$RC" 0
assert_eq "$(field landing_relation)" behind_ff
pass
s_before=$(status_fingerprint "$S_FIX")
s_bytes_before=$(worktree_bytes "$S_FIX")
run_tool refresh S
assert_eq "$RC" 0
assert_eq "$(field refresh)" refreshed
assert_eq "$(field origin_main)" "$remote_two"
assert_eq "$(field remote_main)" "$remote_two"
assert_eq "$(field origin_remote_relation)" same
assert_eq "$(field landing_relation)" behind_ff
assert_eq "$(status_fingerprint "$S_FIX")" "$s_before"
assert_eq "$(worktree_bytes "$S_FIX")" "$s_bytes_before"
pass

git -C "$S_FIX" config user.name fixture
git -C "$S_FIX" config user.email fixture@example.invalid
git -C "$S_FIX" reset -q --hard "$remote_two"
printf 'local\n' >"$S_FIX/local.txt"
git -C "$S_FIX" add local.txt
git -C "$S_FIX" commit -q -m local
run_tool status S
assert_eq "$RC" 0
assert_eq "$(field landing_relation)" ahead
pass

printf 'three\n' >>"$SEED/file.txt"
git -C "$SEED" add file.txt
git -C "$SEED" commit -q -m three
git -C "$SEED" push -q origin main
remote_three=$(git -C "$SEED" rev-parse HEAD)
git -C "$S_FIX" fetch -q origin refs/heads/main:refs/remotes/probe/main
run_tool status S
assert_eq "$RC" 0
assert_eq "$(field remote_main)" "$remote_three"
assert_eq "$(field landing_relation)" diverged
pass

diverged_origin_before=$(origin_main "$S_FIX")
diverged_state_before=$(status_fingerprint "$S_FIX")
run_tool refresh S
assert_eq "$RC" 3
assert_eq "$(field landing_relation)" diverged
assert_eq "$(field refresh)" blocked
assert_eq "$(origin_main "$S_FIX")" "$diverged_origin_before"
assert_eq "$(status_fingerprint "$S_FIX")" "$diverged_state_before"
pass

s_origin_before=$(origin_main "$S_FIX")
printf 'dirty\n' >"$S_FIX/untracked.txt"
s_dirty_before=$(status_fingerprint "$S_FIX")
run_tool refresh S
assert_eq "$RC" 3
assert_eq "$(field worktree)" dirty
assert_eq "$(field refresh)" blocked
assert_eq "$(origin_main "$S_FIX")" "$s_origin_before"
assert_eq "$(status_fingerprint "$S_FIX")" "$s_dirty_before"
rm "$S_FIX/untracked.txt"
pass

git -C "$S_FIX" reset -q --hard "$remote_two"
run_tool status S
assert_eq "$RC" 0
assert_eq "$(field landing_relation)" behind_ff

mkdir -p "$TMP/bin"
cat >"$TMP/bin/git" <<EOF
#!/bin/sh
case " \$* " in *' fetch '*) exit 42 ;; esac
exec '$REAL_GIT' "\$@"
EOF
chmod +x "$TMP/bin/git"
failure_origin_before=$(origin_main "$S_FIX")
failure_state_before=$(status_fingerprint "$S_FIX")
set +e
OUT=$(PATH="$TMP/bin:$PATH" "$TOOL" refresh S 2>"$TMP/stderr")
RC=$?
set -e
ERR=$(cat "$TMP/stderr")
assert_eq "$RC" 4
assert_eq "$(field refresh)" failed
assert_eq "$(origin_main "$S_FIX")" "$failure_origin_before"
assert_eq "$(status_fingerprint "$S_FIX")" "$failure_state_before"
assert_eq "$ERR" ''
pass

git -C "$S_FIX" remote set-url origin 'https://example.invalid/not-authorized.git'
run_tool status S
assert_eq "$RC" 2
assert_eq "$(field remote_main)" unknown
assert_eq "$(field origin_remote_relation)" unknown
pass

configure_fixture_origin "$S_FIX"
git -C "$S_FIX" config "url.file://$TMP/rewritten.git.insteadOf" "file://$REMOTE"
run_tool status S
assert_eq "$RC" 2
assert_eq "$(field remote_main)" unknown
git -C "$S_FIX" config --unset-all "url.file://$TMP/rewritten.git.insteadOf"
pass

git -C "$S_FIX" config remote.origin.uploadpack /bin/false
run_tool status S
assert_eq "$RC" 2
assert_eq "$(field remote_main)" unknown
git -C "$S_FIX" config --unset-all remote.origin.uploadpack
pass

mkdir -p "$S_FIX/subdir"
BAD_TOOL="$TMP/bad-top-level-tool"
sed \
  -e "s|CANONICAL_ORIGIN='https://github.com/hanmiyoo10-alt/-.git'|CANONICAL_ORIGIN='file://$REMOTE'|" \
  -e "s|S_REPO='/root/nyang-repo'|S_REPO='$S_FIX/subdir'|" \
  -e "s|M_REPO='/data/data/com.termux/files/home/nyang-worktrees/mainphone-work'|M_REPO='$M_FIX'|" \
  "$SOURCE" >"$BAD_TOOL"
chmod +x "$BAD_TOOL"
set +e
OUT=$("$BAD_TOOL" status S 2>"$TMP/stderr")
RC=$?
set -e
assert_eq "$RC" 2
assert_eq "$(field worktree)" unknown
assert_eq "$(field remote_main)" unknown
pass

NON_GIT="$TMP/not-git"
mkdir -p "$NON_GIT"
NON_GIT_TOOL="$TMP/non-git-tool"
sed \
  -e "s|CANONICAL_ORIGIN='https://github.com/hanmiyoo10-alt/-.git'|CANONICAL_ORIGIN='file://$REMOTE'|" \
  -e "s|S_REPO='/root/nyang-repo'|S_REPO='$NON_GIT'|" \
  -e "s|M_REPO='/data/data/com.termux/files/home/nyang-worktrees/mainphone-work'|M_REPO='$M_FIX'|" \
  "$SOURCE" >"$NON_GIT_TOOL"
chmod +x "$NON_GIT_TOOL"
set +e
OUT=$("$NON_GIT_TOOL" status S 2>"$TMP/stderr")
RC=$?
set -e
assert_eq "$RC" 2
assert_eq "$(field worktree)" unknown
assert_eq "$(field remote_main)" unknown
pass

run_tool status M
assert_eq "$RC" 0
assert_eq "$(field landing_relation)" branch_mismatch
lines=$(printf '%s\n' "$OUT" | wc -l | tr -d ' ')
assert_eq "$lines" 13
pass

run_tool status S extra
assert_eq "$RC" 64
[ -z "$OUT" ] || fail 'invalid invocation emitted a receipt'
pass

run_tool status S_TERMUX
assert_eq "$RC" 64
[ -z "$OUT" ] || fail 'unsupported route emitted a receipt'
pass

if grep -Eq 'git -C "\$REPO" (merge |pull |switch |checkout |reset |stash |clean |worktree )' "$SOURCE"; then
  fail 'forbidden landing mutation command found in executable'
fi
grep -Fq 'fetch --quiet --no-tags origin refs/heads/main:refs/remotes/origin/main' "$SOURCE" || fail 'fixed fetch contract missing'
grep -Fq "S_REPO='/root/nyang-repo'" "$SOURCE" || fail 'fixed S path missing'
grep -Fq "M_REPO='/data/data/com.termux/files/home/nyang-worktrees/mainphone-work'" "$SOURCE" || fail 'fixed M path missing'
pass

printf 'PASS: %s contract groups\n' "$TESTS"
