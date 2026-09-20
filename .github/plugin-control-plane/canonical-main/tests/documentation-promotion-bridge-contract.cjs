'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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

const handoffStart = workflow.indexOf('- name: Exact-base / exact-head merge');
assert.notEqual(handoffStart, -1, 'merge-handoff stage missing');
const handoff = workflow.slice(handoffStart);
assert.ok(handoff.includes('**State: MERGE_READY**'));
assert.ok(handoff.includes('PLUGIN_RUN_ID='));
assert.ok(handoff.includes('SIMCORE_RUN_ID='));
assert.ok(handoff.includes('Plugin Control Plane run: $PLUGIN_RUN_ID'));
assert.ok(handoff.includes('SimCore run: $SIMCORE_RUN_ID'));
assert.ok(handoff.includes('Source run: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID'));
assert.ok(handoff.includes('Bridge authority: connected ChatGPT GitHub connector'));
assert.ok(handoff.includes('--match-head-commit $HEAD_SHA'));
assert.ok(handoff.includes('Candidate-head workflow_dispatch proof is not merged-main push proof'));
assert.ok(handoff.includes('PR_BASE_SHA'));
assert.ok(handoff.includes('PR_HEAD'));
assert.ok(handoff.includes('**State: STALE_MAIN**'));
assert.ok(handoff.includes('**State: STALE_PR**'));
assert.ok(handoff.includes('CANONICAL_MAIN_DOC_PROMOTION:MERGE_READY'));
assert.ok(!workflow.includes('gh pr merge'), 'Actions workflow must not merge generated PRs');
assert.ok(!workflow.includes('git push origin main'), 'Actions workflow must not push generated docs to main');
assert.ok(!handoff.includes('**State: MERGED**'), 'Actions workflow must not project MERGED after candidate validation');

assert.ok(readme.includes('MERGE_READY'));
assert.ok(readme.includes('expected-head'));
assert.ok(readme.includes('current `main` still equals the mailbox base SHA'));
assert.ok(readme.includes('bound Plugin Control Plane run'));
assert.ok(readme.includes('bound SimCore run'));
assert.ok(readme.includes('Candidate-head `workflow_dispatch` proof is not merged-main `push` proof'));
assert.ok(readme.includes('must never be relabeled as such'));
assert.ok(readme.includes('PENDING'));
assert.ok(readme.includes('does not merge the PR'));

console.log('documentation-promotion-bridge-contract: ok');
