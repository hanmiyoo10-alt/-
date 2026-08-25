#!/usr/bin/env bash
set -euo pipefail

CALLER_KIND="${1:-}"
case "$CALLER_KIND" in
  stage|validation) ;;
  *) echo "E13_REDUCER_WAKE_CALLER_DENIED:${CALLER_KIND:-missing}" >&2; exit 2 ;;
esac

: "${GITHUB_TOKEN:?GITHUB_TOKEN is required}"
: "${GITHUB_API_URL:?GITHUB_API_URL is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"

PAYLOAD="$(mktemp)"
trap 'rm -f "$PAYLOAD"' EXIT
printf '%s\n' '{"ref":"main"}' > "$PAYLOAD"

curl --fail-with-body --silent --show-error -X POST \
  -H 'Accept: application/vnd.github+json' \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "$GITHUB_API_URL/repos/$GITHUB_REPOSITORY/actions/workflows/usage-dashboard-e9-release-reconcile.yml/dispatches" \
  --data-binary @"$PAYLOAD"

echo "E13_REDUCER_WAKE_DISPATCHED:$CALLER_KIND"
