'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/repository-work-harness-shadow.yml'), 'utf8');
const ci = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-ci.yml'), 'utf8');

for (const required of [
  'types: [opened, edited, reopened, closed]',
  'workflow_dispatch:',
  'contents: read',
  'issues: read',
  'ref: ${{ github.event.repository.default_branch }}',
  'persist-credentials: false',
  'work-harness/scan.cjs',
  'work-harness/report.cjs',
  'GITHUB_STEP_SUMMARY',
  'actions/upload-artifact@v4',
]) assert.ok(workflow.includes(required), `workflow missing: ${required}`);

for (const forbidden of ['issues: write', 'contents: write', 'pull-requests: write']) {
  assert.ok(!workflow.includes(forbidden), `workflow must remain read-only: ${forbidden}`);
}

for (const required of [
  "'.github/workflows/repository-work-harness-*.yml'",
  'work-harness/tests/preflight-contract.cjs',
  'work-harness/tests/active-work-contract.cjs',
  'work-harness/tests/report-contract.cjs',
  'work-harness/tests/workflow-contract.cjs',
]) assert.ok(ci.includes(required), `CI missing: ${required}`);

console.log('work-harness workflow-contract: ok');
