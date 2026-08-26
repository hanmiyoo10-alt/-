'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const workflow = fs.readFileSync('.github/workflows/repository-work-harness-receipt-sync.yml', 'utf8');

assert.match(workflow, /^name: Repository Work Harness — Receipt Sync/m);
assert.match(workflow, /issues:\n\s+types: \[opened, edited, reopened\]/);
assert.doesNotMatch(workflow, /pull_request:/);
assert.doesNotMatch(workflow, /push:/);
assert.match(workflow, /contents: read/);
assert.match(workflow, /issues: write/);
assert.match(workflow, /github\.actor != 'github-actions\[bot\]'/);
assert.match(workflow, /repository-coordination-receipt-request:v1/);
assert.match(workflow, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
assert.match(workflow, /persist-credentials: false/);
assert.match(workflow, /TARGET_ISSUE: \$\{\{ github\.event\.issue\.number \}\}/);
assert.match(workflow, /receipt-sync\.cjs --work-issue "\$TARGET_ISSUE"/);
assert.match(workflow, /Upload exact receipt-sync result/);
assert.doesNotMatch(workflow, /repo-main-write/);
assert.doesNotMatch(workflow, /workflow_dispatch/);

console.log('work-harness receipt-sync-workflow-contract: ok');
