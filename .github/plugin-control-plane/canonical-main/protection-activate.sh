#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${GH_TOKEN:?GH_TOKEN is required}"

ISSUE_NUMBER="${PROTECTION_ISSUE_NUMBER:-321}"
API_VERSION="2026-03-10"
MARKER='<!-- canonical-main-protection-activation-attempt -->'

comment_once() {
  local body="$1"
  local found
  found="$(gh api "repos/${GITHUB_REPOSITORY}/issues/${ISSUE_NUMBER}/comments" --paginate --jq ".[] | select(.body | contains(\"${MARKER}\")) | .id" | head -n 1 || true)"
  if [[ -z "$found" ]]; then
    gh issue comment "$ISSUE_NUMBER" --repo "$GITHUB_REPOSITORY" --body "$body"
  fi
}

branch_json="$(gh api -H "X-GitHub-Api-Version: ${API_VERSION}" "repos/${GITHUB_REPOSITORY}/branches/main")"
protected="$(jq -r '.protected // false' <<<"$branch_json")"
existing="$(jq -r '[.protection.required_status_checks.contexts[]?, .protection.required_status_checks.checks[]?.context] | unique | .[]' <<<"$branch_json" || true)"
if [[ "$protected" == "true" ]] && grep -Fxq 'Required' <<<"$existing"; then
  echo 'PROTECTED_MAIN_ACTIVATION_ALREADY_ENFORCED'
  exit 0
fi

main_sha="$(jq -r '.commit.sha' <<<"$branch_json")"
required_app_id="$(gh api \
  -H 'Accept: application/vnd.github+json' \
  -H "X-GitHub-Api-Version: ${API_VERSION}" \
  "repos/${GITHUB_REPOSITORY}/commits/${main_sha}/check-runs" \
  --jq '[.check_runs[] | select(.name == "Required" and .conclusion == "success") | .app.id] | unique | if length == 1 then .[0] else empty end' || true)"

if [[ -z "$required_app_id" ]]; then
  echo 'PROTECTED_MAIN_REQUIRED_CHECK_IDENTITY_UNRESOLVED' >&2
  comment_once "${MARKER}
## Automatic protection activation attempt

Result: \`BLOCKED_BEFORE_MUTATION\`

The current exact-main successful \`Required\` check provider could not be resolved to exactly one GitHub App identity, so no branch-protection mutation was attempted. This is fail-closed and does not alter \`main\`, production, or release authority."
  exit 0
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp" "$tmp.out" "$tmp.err"' EXIT
jq -n --argjson app_id "$required_app_id" '{
  required_status_checks: {
    strict: true,
    contexts: [],
    checks: [{context: "Required", app_id: $app_id}]
  },
  enforce_admins: true,
  required_pull_request_reviews: null,
  restrictions: null,
  required_linear_history: false,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: false,
  lock_branch: false,
  allow_fork_syncing: false
}' > "$tmp"

set +e
gh api \
  --method PUT \
  -H 'Accept: application/vnd.github+json' \
  -H "X-GitHub-Api-Version: ${API_VERSION}" \
  "repos/${GITHUB_REPOSITORY}/branches/main/protection" \
  --input "$tmp" >"$tmp.out" 2>"$tmp.err"
rc=$?
set -e

if [[ "$rc" -ne 0 ]]; then
  class='ADMINISTRATION_WRITE_UNAVAILABLE'
  if grep -qiE '403|forbidden|resource not accessible' "$tmp.err"; then
    class='ADMINISTRATION_WRITE_UNAVAILABLE'
  elif grep -qiE '422|validation' "$tmp.err"; then
    class='PROTECTION_API_VALIDATION_REJECTED'
  fi
  echo "PROTECTED_MAIN_ACTIVATION_BLOCKED:${class}" >&2
  comment_once "${MARKER}
## Automatic protection activation attempt

Result: \`${class}\`

A real GitHub branch-protection API mutation was attempted automatically from the existing Actions token boundary and was rejected. No token material or raw provider error payload is stored here. The soft-enforcement guard remains the automatic fallback; native protection is not claimed active until direct read-back proves it."
  exit 0
fi

readback="$(gh api -H "X-GitHub-Api-Version: ${API_VERSION}" "repos/${GITHUB_REPOSITORY}/branches/main")"
protected_after="$(jq -r '.protected // false' <<<"$readback")"
required_after="$(jq -r '[.protection.required_status_checks.contexts[]?, .protection.required_status_checks.checks[]?.context] | unique | .[]' <<<"$readback" || true)"
if [[ "$protected_after" != 'true' ]] || ! grep -Fxq 'Required' <<<"$required_after"; then
  echo 'PROTECTED_MAIN_ACTIVATION_READBACK_MISMATCH' >&2
  exit 12
fi

echo 'PROTECTED_MAIN_ACTIVATION_ENFORCED'
comment_once "${MARKER}
## Automatic protection activation attempt

Result: \`ENFORCED\`

Direct GitHub API read-back proved \`main\` protection is enabled with the GitHub Actions \`Required\` check bound as required status evidence. The canonical operations surface should now render native protection as \`ENFORCED\`."
