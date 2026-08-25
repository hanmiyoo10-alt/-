#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_SHA:?TARGET_SHA is required}"
: "${CI_CONCLUSION:?CI_CONCLUSION is required}"
: "${CI_RUN_ID:?CI_RUN_ID is required}"
: "${CI_RUN_ATTEMPT:?CI_RUN_ATTEMPT is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"

ISSUE_NUMBER="${PROTECTION_ISSUE_NUMBER:-321}"

[[ "$TARGET_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'SOFT_GUARD_TARGET_SHA_INVALID' >&2; exit 2; }

git fetch --no-tags origin main
current="$(git rev-parse origin/main)"
if [[ "$current" != "$TARGET_SHA" ]]; then
  echo "SOFT_GUARD_STALE_RESULT: target=${TARGET_SHA} current=${current}"
  exit 0
fi

case "$CI_CONCLUSION" in
  success)
    echo "SOFT_GUARD_REQUIRED_PASS:${TARGET_SHA}"
    exit 0
    ;;
  cancelled)
    if [[ "$CI_RUN_ATTEMPT" =~ ^[0-9]+$ ]] && (( CI_RUN_ATTEMPT < 2 )); then
      gh run rerun "$CI_RUN_ID" --repo "$GITHUB_REPOSITORY"
      echo "SOFT_GUARD_CANCELLED_RERUN_REQUESTED:${CI_RUN_ID}"
      exit 0
    fi
    echo 'SOFT_GUARD_REQUIRED_CANCELLED_UNRESOLVED' >&2
    exit 10
    ;;
  failure|timed_out|startup_failure|action_required)
    ;;
  *)
    echo "SOFT_GUARD_REQUIRED_CONCLUSION_UNKNOWN:${CI_CONCLUSION}" >&2
    exit 11
    ;;
esac

# Re-confirm exact current tip immediately before constructing recovery.
git fetch --no-tags origin main
current="$(git rev-parse origin/main)"
if [[ "$current" != "$TARGET_SHA" ]]; then
  echo "SOFT_GUARD_STALE_BEFORE_RECOVERY: target=${TARGET_SHA} current=${current}"
  exit 0
fi

git checkout --detach "$TARGET_SHA"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

mapfile -t parents < <(git rev-list --parents -n 1 "$TARGET_SHA")
parent_count=$(( ${#parents[@]} - 1 ))
if (( parent_count == 1 )); then
  git revert --no-edit "$TARGET_SHA"
elif (( parent_count > 1 )); then
  git revert -m 1 --no-edit "$TARGET_SHA"
else
  echo 'SOFT_GUARD_ROOT_COMMIT_RECOVERY_FORBIDDEN' >&2
  exit 12
fi

payload="$(git rev-parse HEAD)"
mapfile -t changed < <(git diff-tree --no-commit-id --name-only -r "${payload}^!")
if (( ${#changed[@]} == 0 )); then
  echo 'SOFT_GUARD_RECOVERY_PAYLOAD_EMPTY' >&2
  exit 13
fi

args=(
  scripts/repo-main-write.py
  --commit "$payload"
  --attempts 1
  --required-workflow simcore-ci.yml
  --required-profile MAIN_HEALTH
  --required-job Required
  --staging-prefix canonical-main-soft-guard
  --verify-gate-only
)
for path in "${changed[@]}"; do
  args+=(--allow "$path")
done

python3 "${args[@]}"
verified="$(git rev-parse HEAD)"
verified_parent="$(git rev-parse "${verified}^")"
if [[ "$verified_parent" != "$TARGET_SHA" ]]; then
  echo "SOFT_GUARD_VERIFIED_PARENT_MISMATCH:${verified_parent}" >&2
  exit 14
fi

# Final identity barrier: only recover the exact failed tip. A newer main gets its own CI/guard cycle.
git fetch --no-tags origin main
current="$(git rev-parse origin/main)"
if [[ "$current" != "$TARGET_SHA" ]]; then
  echo "SOFT_GUARD_BASE_MOVED_AFTER_GATE: target=${TARGET_SHA} current=${current}"
  exit 0
fi

git push origin "${verified}:refs/heads/main"
echo "SOFT_GUARD_RECOVERY_LANDED: failed=${TARGET_SHA} recovery=${verified}"

marker="<!-- canonical-main-soft-guard-recovery:${TARGET_SHA} -->"
found="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${ISSUE_NUMBER}/comments" --paginate --jq ".[] | select(.body | contains(\"${marker}\")) | .id" | head -n 1 || true)"
if [[ -z "$found" ]]; then
  gh issue comment "$ISSUE_NUMBER" --repo "$GITHUB_REPOSITORY" --body "${marker}
## Soft-enforcement automatic recovery

The exact current \`main\` tip \`${TARGET_SHA}\` had a non-success \`SimCore CI / Required\` result. The guard created a revert payload, verified the recovery candidate through the exact-candidate Required gateway, re-confirmed \`main\` still pointed to the failed SHA, and fast-forwarded only the verified recovery commit \`${verified}\`.

No force push, branch reset, production mutation, or release mutation was used."
fi
