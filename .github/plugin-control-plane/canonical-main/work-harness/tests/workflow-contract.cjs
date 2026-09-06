'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/repository-work-harness-shadow.yml'), 'utf8');
const ci = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-ci.yml'), 'utf8');
const pluginManifest = JSON.parse(fs.readFileSync(path.join(root, '.github/tooling/ci-summary/manifests/plugin-control-plane.json'), 'utf8'));
const permanentCommands = pluginManifest.checks.map((check) => check.command.join(' ')).join('\n');

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

assert.ok(ci.includes("'.github/workflows/repository-work-harness-*.yml'"), "CI missing repository work-harness path trigger");
for (const required of [
  'work-harness/tests/preflight-contract.cjs',
  'work-harness/tests/active-work-contract.cjs',
  'work-harness/tests/report-contract.cjs',
  'work-harness/tests/workflow-contract.cjs',
]) assert.ok(permanentCommands.includes(required), `CI manifest missing: ${required}`);

console.log('work-harness workflow-contract: ok');
