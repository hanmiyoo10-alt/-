'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-ops.yml'), 'utf8');

for (const required of [
  'workflow_dispatch:',
  'coordination_work_issue:',
  "description: 'Optional active Work Record issue for Harness receipt-gated canary'",
  'required: false',
  'type: string',
  'issue_comment:',
  'types: [created]',
  "github.actor == github.repository_owner",
  "github.event.issue.pull_request == null",
  "github.event.comment.body == '/harness-canary'",
  "cron: '17 * * * *'",
  'workflow_run:',
  'push:',
  'group: canonical-main-operations',
  'cancel-in-progress: true',
  'ref: main',
  'persist-credentials: false',
  'name: Harness coordination receipt canary gate',
  "if: ${{ (github.event_name == 'workflow_dispatch' && inputs.coordination_work_issue != '') || github.event_name == 'issue_comment' }}",
  'GH_TOKEN: ${{ github.token }}',
  'GITHUB_REPOSITORY: ${{ github.repository }}',
  "COORDINATION_WORK_ISSUE: ${{ github.event_name == 'issue_comment' && github.event.issue.number || inputs.coordination_work_issue }}",
  'node .github/plugin-control-plane/canonical-main/work-harness/mutation-gate.cjs',
  '--work-issue "$COORDINATION_WORK_ISSUE"',
  'name: Refresh canonical-main modular operator snapshot',
  'run: node .github/plugin-control-plane/canonical-main/orchestrator/refresh.cjs refresh',
]) assert.ok(workflow.includes(required), `canonical-main canary workflow missing: ${required}`);

const jobGuard = "if: ${{ github.event_name != 'issue_comment' || (github.actor == github.repository_owner && github.event.issue.pull_request == null && github.event.comment.body == '/harness-canary') }}";
assert.ok(workflow.includes(jobGuard), 'issue-comment canary must be owner-only, exact-command, issue-only, and unrelated comments must skip the writer job');
assert.equal((workflow.match(/github\.event\.comment\.body == '\/harness-canary'/g) || []).length, 1, 'automated canary command must have one exact owner-gated entry condition');

const gateIndex = workflow.indexOf('name: Harness coordination receipt canary gate');
const refreshIndex = workflow.indexOf('name: Refresh canonical-main modular operator snapshot');
assert.ok(gateIndex >= 0 && refreshIndex > gateIndex, 'receipt canary gate must run before canonical-main writer refresh');

const gateSection = workflow.slice(gateIndex, refreshIndex);
assert.ok(gateSection.includes("COORDINATION_WORK_ISSUE: ${{ github.event_name == 'issue_comment' && github.event.issue.number || inputs.coordination_work_issue }}"), 'canary work issue must enter through env from trusted event metadata or workflow input');
assert.ok(gateSection.includes('--work-issue "$COORDINATION_WORK_ISSUE"'), 'gate command must consume env variable');
assert.equal(gateSection.includes('--work-issue "${{ inputs.coordination_work_issue }}"'), false, 'untrusted workflow input must not be directly interpolated into shell command');
assert.equal(gateSection.includes('continue-on-error: true'), false, 'receipt gate failure must stop before writer');
assert.equal(gateSection.includes('|| true'), false, 'receipt gate command must not suppress failure');

for (const automaticTriggerEvidence of [
  'schedule:',
  "cron: '17 * * * *'",
  'workflow_run:',
  'workflows:',
  'types: [completed]',
  'branches: [main]',
  'push:',
]) assert.ok(workflow.includes(automaticTriggerEvidence), `automatic canonical-main ops trigger changed/missing: ${automaticTriggerEvidence}`);

assert.equal((workflow.match(/mutation-gate\.cjs/g) || []).length, 1, 'B6 must keep exactly one receipt gate call shared by manual and automated canary triggers');
assert.equal((workflow.match(/orchestrator\/refresh\.cjs refresh/g) || []).length, 1, 'existing canonical-main writer must remain a single unchanged refresh invocation');
assert.equal(workflow.includes('scripts/repo-main-write.py'), false, 'B6 must not route canonical-main ops through repo-main-write');
assert.equal(workflow.includes('workflow_dispatch: true'), false, 'B6 must not add Harness-driven workflow dispatch semantics');

console.log('work-harness canonical-main-canary-contract: ok');
