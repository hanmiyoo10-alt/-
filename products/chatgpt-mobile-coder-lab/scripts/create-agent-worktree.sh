#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "usage: $0 <control-repo> <worktree-path> <branch> [base-ref]" >&2
}

die() {
  echo "error: $*" >&2
  exit 1
}

[[ $# -ge 3 && $# -le 4 ]] || { usage; exit 2; }

repo=$1
worktree=$2
branch=$3
base=${4:-origin/main}

[[ $repo = /* ]] || die "control repo path must be absolute"
[[ $worktree = /* ]] || die "worktree path must be absolute"
[[ $repo != "$worktree" ]] || die "worktree must differ from control repo"

git -C "$repo" rev-parse --git-dir >/dev/null 2>&1 || die "control repo is not a Git repository"
[[ -z $(git -C "$repo" status --porcelain=v1 --untracked-files=all) ]] || die "control repo is dirty"
[[ ! -e $worktree ]] || die "worktree path already exists: $worktree"
if git -C "$repo" show-ref --verify --quiet "refs/heads/$branch"; then
  die "local branch already exists: $branch"
fi

base_commit=$(git -C "$repo" rev-parse --verify "$base^{commit}" 2>/dev/null) || die "base ref is not a commit: $base"
mkdir -p "$(dirname "$worktree")"
git -C "$repo" worktree add -b "$branch" "$worktree" "$base_commit"

actual_branch=$(git -C "$worktree" branch --show-current)
[[ $actual_branch == "$branch" ]] || die "created worktree is on unexpected branch: $actual_branch"
[[ -z $(git -C "$worktree" status --porcelain=v1 --untracked-files=all) ]] || die "created worktree is not clean"

printf 'worktree=%s\nbranch=%s\nbase=%s\n' "$worktree" "$actual_branch" "$base_commit"
