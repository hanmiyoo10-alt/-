'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/repository-work-harness-receipt-sync.yml', 'utf8');

assert.match(workflow, /^name: Repository Work Harness — Receipt Sync/m);
assert.match(workflow, /issues:\n\s+types: \[opened, edited, reopened\]/);
assert.doesNotMatch(workflow, /pull_request:/);
assert.doesNotMatch(workflow, /push:/);
assert.match(workflow, /contents: read/);
assert.match(workflow, /actions: read/);
assert.match(workflow, /issues: write/);
assert.match(workflow, /github\.actor != 'github-actions\[bot\]'/);
assert.match(workflow, /repository-coordination-receipt-request:v1/);
assert.match(workflow, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /TARGET_ISSUE: \$\{\{ github\.event\.issue\.number \}\}/);
assert.match(workflow, /receipt-sync\.cjs --work-issue "\$TARGET_ISSUE"/);
assert.match(workflow, /authoritative-handoff\.cjs --work-issue "\$TARGET_ISSUE"/);
assert.match(workflow, /AUTHORITATIVE_HANDOFF_READY/);
assert.match(workflow, /AUTHORITATIVE_HANDOFF_NOT_REQUESTED/);
assert.match(workflow, /handoff_ready=true/);
assert.match(workflow, /uses: \.\/\.github\/workflows\/canonical-main-ops\.yml/);
assert.match(workflow, /coordination_work_issue: \$\{\{ needs\.receipt-sync\.outputs\.handoff_issue \}\}/);
assert.match(workflow, /Upload exact receipt-sync and handoff results/);
assert.doesNotMatch(workflow, /repo-main-write/);
assert.doesNotMatch(workflow, /orchestrator\/refresh\.cjs refresh/);
assert.doesNotMatch(workflow, /workflow_dispatch:/);
assert.doesNotMatch(workflow, /actions: write/);

const syncIndex = workflow.indexOf('name: Reconstruct and sync requested receipt');
const handoffIndex = workflow.indexOf('name: Evaluate opt-in authoritative handoff');
const reusableIndex = workflow.indexOf('uses: ./.github/workflows/canonical-main-ops.yml');
assert.ok(syncIndex >= 0 && handoffIndex > syncIndex && reusableIndex > handoffIndex, 'receipt sync must precede handoff evaluation and existing-authority call');

console.log('work-harness receipt-sync-workflow-contract: ok');
