'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-doc-promotion.yml'), 'utf8');
const readme = fs.readFileSync(path.join(root, '.github/plugin-control-plane/canonical-main/documentation-stream/README.md'), 'utf8');

assert.ok(workflow.includes('**State: PENDING**'), 'PENDING PR-creation handoff must remain');
assert.ok(workflow.includes('CANONICAL_MAIN_DOC_PROMOTION:HANDOFF'), 'PENDING handoff marker must remain');
assert.ok(workflow.includes('plugin_run_id=$PLUGIN_RUN_ID'));
assert.ok(workflow.includes('simcore_run_id=$SIMCORE_RUN_ID'));
assert.ok(workflow.includes("event=\"$(jq -er '.event'"));
assert.ok(workflow.includes('[[ "$head_sha" == "$HEAD_SHA" ]]'));
assert.ok(workflow.includes('gh run watch "$PLUGIN_RUN_ID" --exit-status'));
assert.ok(workflow.includes('gh run watch "$SIMCORE_RUN_ID" --exit-status'));
assert.ok(workflow.includes('- name: Activate exact native PR checks'));
assert.ok(workflow.includes("steps.native_pr.outputs.ready == 'true'"));
assert.ok(workflow.includes('"repos/$GITHUB_REPOSITORY/actions/workflows/$workflow/runs"'));
assert.ok(workflow.includes('-f event=pull_request'));
assert.ok(workflow.includes('-f head_sha="$HEAD_SHA"'));
assert.ok(workflow.includes('"repos/$GITHUB_REPOSITORY/commits/$HEAD_SHA/pulls"'));
assert.ok(workflow.includes('"repos/$GITHUB_REPOSITORY/actions/runs/$run_id/approve"'));
assert.ok(workflow.includes('NATIVE_PR_APPROVAL_BLOCKED'));
assert.ok(workflow.includes('NATIVE_PR_CHECK_UNKNOWN'));
assert.ok(workflow.includes('PLUGIN_CONTRACT_NOT_PROVEN'));
assert.ok(workflow.includes('SIMCORE_VERIFY_NOT_PROVEN'));
assert.ok(workflow.includes('SIMCORE_REQUIRED_NOT_PROVEN'));
assert.ok(!workflow.includes('gh pr close'), 'native activation must not automate close/reopen recovery');
assert.ok(!workflow.includes('gh pr reopen'), 'native activation must not automate close/reopen recovery');
assert.ok(!workflow.includes('pull_request_target'), 'native activation must not widen to pull_request_target');

const handoffStart = workflow.indexOf('- name: Exact-base / exact-head merge');
assert.notEqual(handoffStart, -1, 'merge-handoff stage missing');
const handoff = workflow.slice(handoffStart);
assert.ok(handoff.includes('**State: MERGE_READY**'));
assert.ok(handoff.includes('PLUGIN_NATIVE_RUN_ID='));
assert.ok(handoff.includes('SIMCORE_NATIVE_RUN_ID='));
assert.ok(handoff.includes('PLUGIN_RUN_ID='));
assert.ok(handoff.includes('SIMCORE_RUN_ID='));
assert.ok(handoff.includes('Plugin Control Plane native PR run: $PLUGIN_NATIVE_RUN_ID'));
assert.ok(handoff.includes('SimCore native PR run: $SIMCORE_NATIVE_RUN_ID'));
assert.ok(handoff.includes('Plugin Control Plane candidate run: $PLUGIN_RUN_ID'));
assert.ok(handoff.includes('SimCore candidate run: $SIMCORE_RUN_ID'));
assert.ok(handoff.includes('Source run: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID'));
assert.ok(handoff.includes('Bridge authority: connected ChatGPT GitHub connector'));
assert.ok(handoff.includes('MATCH_HEAD_TOKEN="$(printf \'%b--match-head-commit %s%b\' \'\\x60\' "$HEAD_SHA" \'\\x60\')"'));
assert.ok(handoff.includes('Bridge merge effect: squash + expected-head guard equivalent to $MATCH_HEAD_TOKEN'));
assert.ok(handoff.includes('Candidate-head workflow_dispatch proof is not merged-main push proof'));
assert.ok(handoff.includes('PR_BASE_SHA'));
assert.ok(handoff.includes('PR_HEAD'));
assert.ok(handoff.includes('PR_DRAFT="$(jq -er \'if (.draft | type) == "boolean" then (.draft | tostring) else error("draft must be boolean") end\' <<<"$PR_JSON")"'));
assert.ok(!handoff.includes("jq -er '.draft'"), 'bare jq -e boolean parser would reject valid false');

const draftFalse = spawnSync('jq', ['-er', 'if (.draft | type) == "boolean" then (.draft | tostring) else error("draft must be boolean") end'], {
  input: '{"draft":false}\n',
  encoding: 'utf8',
});
assert.equal(draftFalse.status, 0, draftFalse.stderr);
assert.equal(draftFalse.stdout.trim(), 'false');

const draftMissing = spawnSync('jq', ['-er', 'if (.draft | type) == "boolean" then (.draft | tostring) else error("draft must be boolean") end'], {
  input: '{}\n',
  encoding: 'utf8',
});
assert.notEqual(draftMissing.status, 0, 'missing/non-boolean draft must still fail closed');

const renderHead = '0123456789abcdef0123456789abcdef01234567';
const renderScript = [
  'set -euo pipefail',
  `HEAD_SHA='${renderHead}'`,
  'MATCH_HEAD_TOKEN="$(printf \'%b--match-head-commit %s%b\' \'\\x60\' "$HEAD_SHA" \'\\x60\')"',
  'cat <<EOF',
  '- Bridge merge effect: squash + expected-head guard equivalent to $MATCH_HEAD_TOKEN',
  'EOF',
].join('\n');
const renderedToken = spawnSync('bash', ['-c', renderScript], { encoding: 'utf8' });
assert.equal(renderedToken.status, 0, renderedToken.stderr);
assert.equal(
  renderedToken.stdout.trim(),
  `- Bridge merge effect: squash + expected-head guard equivalent to \`--match-head-commit ${renderHead}\``,
  'runtime shell render must preserve literal backticks and the exact head SHA',
);

const nativeRunFixture = JSON.stringify({
  workflow_runs: [
    { id: 11, event: 'pull_request', head_sha: 'wrong', head_branch: 'automation/canonical-main-docs', path: '.github/workflows/simcore-ci.yml' },
    { id: 22, event: 'pull_request', head_sha: renderHead, head_branch: 'automation/canonical-main-docs', path: '.github/workflows/simcore-ci.yml' },
    { id: 33, event: 'workflow_dispatch', head_sha: renderHead, head_branch: 'automation/canonical-main-docs', path: '.github/workflows/simcore-ci.yml' },
  ],
});
const nativeSelect = spawnSync('jq', [
  '-c',
  '--arg', 'head', renderHead,
  '--arg', 'branch', 'automation/canonical-main-docs',
  '--arg', 'path', '.github/workflows/simcore-ci.yml',
  '[.workflow_runs[] | select(.event == "pull_request" and .head_sha == $head and .head_branch == $branch and .path == $path) | .id]',
], { input: nativeRunFixture, encoding: 'utf8' });
assert.equal(nativeSelect.status, 0, nativeSelect.stderr);
assert.deepEqual(JSON.parse(nativeSelect.stdout), [22], 'native run selection must stay exact-head/event/branch/workflow bound');
assert.ok(handoff.includes('**State: STALE_MAIN**'));
assert.ok(handoff.includes('**State: STALE_PR**'));
assert.ok(handoff.includes('CANONICAL_MAIN_DOC_PROMOTION:MERGE_READY'));
assert.ok(!workflow.includes('gh pr merge'), 'Actions workflow must not merge generated PRs');
assert.ok(!workflow.includes('git push origin main'), 'Actions workflow must not push generated docs to main');
assert.ok(!handoff.includes('**State: MERGED**'), 'Actions workflow must not project MERGED after candidate validation');

assert.ok(readme.includes('MERGE_READY'));
assert.ok(readme.includes('expected-head'));
assert.ok(readme.includes('current `main` still equals the mailbox base SHA'));
assert.ok(readme.includes('bound native Plugin Control Plane'));
assert.ok(readme.includes('bound native SimCore'));
assert.ok(readme.includes('bound candidate Plugin Control Plane'));
assert.ok(readme.includes('bound candidate SimCore'));
assert.ok(readme.includes('NATIVE_PR_APPROVAL_BLOCKED'));
assert.ok(readme.includes('NATIVE_PR_CHECK_UNKNOWN'));
assert.ok(readme.includes('does not close/reopen the PR'));
assert.ok(readme.includes('Candidate-head `workflow_dispatch` proof is not merged-main `push` proof'));
assert.ok(readme.includes('must never be relabeled as such'));
assert.ok(readme.includes('PENDING'));
assert.ok(readme.includes('does not merge the PR'));

console.log('documentation-promotion-bridge-contract: ok');
