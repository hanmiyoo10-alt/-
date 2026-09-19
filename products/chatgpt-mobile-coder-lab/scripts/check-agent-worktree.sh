#!/usr/bin/env bash
set -euo pipefail

export GIT_OPTIONAL_LOCKS=0

fail() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

usage() {
  printf 'usage: %s <control-repo> <worktree-path> <expected-branch> [base-ref]\n' "${0##*/}" >&2
}

if (( $# < 3 || $# > 4 )); then
  usage
  fail "expected 3 or 4 arguments, got $#"
fi

CONTROL_REPO=$1
WORKTREE_PATH=$2
EXPECTED_BRANCH=$3
BASE_REF=${4-}

case "$CONTROL_REPO" in
  /*) ;;
  *) fail "control repo path must be absolute: $CONTROL_REPO" ;;
esac

case "$WORKTREE_PATH" in
  /*) ;;
  *) fail "worktree path must be absolute: $WORKTREE_PATH" ;;
esac

if [[ ! -d "$CONTROL_REPO" ]]; then
  fail "control repo path does not exist or is not a directory: $CONTROL_REPO"
fi

inside_work_tree=$(git -C "$CONTROL_REPO" rev-parse --is-inside-work-tree 2>/dev/null) || \
  fail "control repo is not a Git repository: $CONTROL_REPO"
[[ "$inside_work_tree" == true ]] || fail "control repo is not a Git working tree: $CONTROL_REPO"

CONTROL_TOP=$(git -C "$CONTROL_REPO" rev-parse --show-toplevel 2>/dev/null) || \
  fail "cannot resolve control repo top level: $CONTROL_REPO"
CONTROL_TOP=$(cd "$CONTROL_TOP" && pwd -P)

control_status=$(git -C "$CONTROL_TOP" status --porcelain --untracked-files=normal) || \
  fail "cannot inspect control repo status: $CONTROL_TOP"
[[ -z "$control_status" ]] || fail "control repo working tree is not clean: $CONTROL_TOP"

if [[ ! -d "$WORKTREE_PATH" ]]; then
  fail "worktree path does not exist or is not a directory: $WORKTREE_PATH"
fi
WORKTREE_REAL=$(cd "$WORKTREE_PATH" && pwd -P)

[[ "$WORKTREE_REAL" != "$CONTROL_TOP" ]] || fail "worktree must not be the control repo itself: $WORKTREE_REAL"

registered=false
while IFS= read -r -d '' field; do
  case "$field" in
    worktree\ *)
      candidate=${field#worktree }
      if [[ -d "$candidate" ]]; then
        candidate=$(cd "$candidate" && pwd -P)
      fi
      if [[ "$candidate" == "$WORKTREE_REAL" ]]; then
        registered=true
        break
      fi
      ;;
  esac
done < <(git -C "$CONTROL_TOP" worktree list --porcelain -z)

[[ "$registered" == true ]] || fail "path is not a registered worktree of control repo: $WORKTREE_REAL"

CURRENT_BRANCH=$(git -C "$WORKTREE_REAL" branch --show-current 2>/dev/null) || \
  fail "cannot determine worktree branch: $WORKTREE_REAL"
[[ -n "$CURRENT_BRANCH" ]] || fail "worktree is detached; expected branch: $EXPECTED_BRANCH"
[[ "$CURRENT_BRANCH" == "$EXPECTED_BRANCH" ]] || \
  fail "worktree branch mismatch: expected '$EXPECTED_BRANCH', got '$CURRENT_BRANCH'"

worktree_status=$(git -C "$WORKTREE_REAL" status --porcelain --untracked-files=normal) || \
  fail "cannot inspect worktree status: $WORKTREE_REAL"
[[ -z "$worktree_status" ]] || fail "worktree working tree is not clean: $WORKTREE_REAL"

HEAD_SHA=$(git -C "$WORKTREE_REAL" rev-parse HEAD 2>/dev/null) || \
  fail "cannot resolve worktree HEAD: $WORKTREE_REAL"

printf 'worktree=%s\n' "$WORKTREE_REAL"
printf 'branch=%s\n' "$CURRENT_BRANCH"
printf 'head=%s\n' "$HEAD_SHA"
printf 'status=clean\n'

if [[ -n "$BASE_REF" ]]; then
  BASE_SHA=$(git -C "$WORKTREE_REAL" rev-parse --verify --quiet --end-of-options "${BASE_REF}^{commit}") || \
    fail "base ref does not resolve to a commit: $BASE_REF"

  counts=$(git -C "$WORKTREE_REAL" rev-list --left-right --count "$BASE_SHA...$HEAD_SHA") || \
    fail "cannot calculate divergence from base: $BASE_REF"
  read -r behind ahead <<< "$counts"

  printf 'base=%s\n' "$BASE_SHA"
  printf 'ahead=%s\n' "$ahead"
  printf 'behind=%s\n' "$behind"
fi
