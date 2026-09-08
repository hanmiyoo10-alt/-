#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
helper="$root/scripts/create-agent-worktree.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
repo="$tmp/repo"

mkdir -p "$repo"
git -C "$repo" init -q
printf 'seed\n' > "$repo/README.md"
git -C "$repo" add README.md
git -C "$repo" -c user.name=Test -c user.email=test@example.invalid commit -qm seed
base=$(git -C "$repo" rev-parse HEAD)

wt="$tmp/worktrees/agent-a"
output=$("$helper" "$repo" "$wt" agent/test HEAD)
[[ $output == *"branch=agent/test"* ]]
[[ $(git -C "$wt" rev-parse HEAD) == "$base" ]]
[[ $(git -C "$wt" branch --show-current) == agent/test ]]
[[ -z $(git -C "$wt" status --porcelain) ]]
[[ -z $(git -C "$repo" status --porcelain) ]]

if "$helper" "$repo" "$tmp/duplicate" agent/test HEAD >/dev/null 2>&1; then
  echo "expected existing branch rejection" >&2
  exit 1
fi

printf 'dirty\n' > "$repo/dirty.txt"
if "$helper" "$repo" "$tmp/dirty-attempt" agent/dirty HEAD >/dev/null 2>&1; then
  echo "expected dirty control repo rejection" >&2
  exit 1
fi
rm "$repo/dirty.txt"

mkdir -p "$tmp/existing-path"
if "$helper" "$repo" "$tmp/existing-path" agent/path HEAD >/dev/null 2>&1; then
  echo "expected existing worktree path rejection" >&2
  exit 1
fi

printf 'PASS create-agent-worktree\n'
