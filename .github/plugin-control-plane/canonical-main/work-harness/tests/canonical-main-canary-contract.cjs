'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../../..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/canonical-main-ops.yml'), 'utf8');

for (const required of [
  'workflow_call:',
  "description: 'Required active Work Record issue for trusted Harness handoff'",
  'workflow_dispatch:',
  'coordination_work_issue:',
  "description: 'Optional active Work Record issue for Harness receipt-gated canary'",
  'required: false',
  'type: string',
  'issues:',
  'types: [edited]',
  'github.actor == github.repository_owner',
  "contains(github.event.issue.body, '<!-- repository-harness-canary:v1 -->')",
  "contains(github.event.issue.body, '<!-- repository-work-record:v1 -->')",
  "cron: '17 * * * *'",
  'workflow_run:',
  'push:',
  'group: canonical-main-operations',
  'cancel-in-progress: false',
  'ref: main',
  'persist-credentials: false',
  'name: Resolve Harness canary Work Record',
  "CANARY_EVENT_NAME: ${{ github.event_name }}",
  "CANARY_DISPATCH_WORK_ISSUE: ${{ inputs.coordination_work_issue }}",
  'GITHUB_EVENT_PATH',
  "fs.appendFileSync(process.env.GITHUB_ENV, `COORDINATION_WORK_ISSUE=${workIssue}\\n`)",
  'name: Harness coordination receipt canary gate',
  'GH_TOKEN: ${{ github.token }}',
  'GITHUB_REPOSITORY: ${{ github.repository }}',
  'node .github/plugin-control-plane/canonical-main/work-harness/mutation-gate.cjs',
  '--work-issue "$COORDINATION_WORK_ISSUE"',
  'name: Refresh canonical-main modular operator snapshot',
  'run: node .github/plugin-control-plane/canonical-main/orchestrator/refresh.cjs refresh',
]) assert.ok(workflow.includes(required), `canonical-main canary workflow missing: ${required}`);

const jobGuard = "if: ${{ inputs.coordination_work_issue != '' || github.event_name != 'issues' || (github.actor == github.repository_owner && contains(github.event.issue.body, '<!-- repository-harness-canary:v1 -->') && contains(github.event.issue.body, '<!-- repository-work-record:v1 -->')) }}";
assert.ok(workflow.includes(jobGuard), 'bounded reusable input may enter while direct issue canary remains owner-only and explicitly marked');
assert.equal((workflow.match(/repository-harness-canary:v1/g) || []).length, 1, 'issue canary marker must have one exact owner-gated entry condition');
assert.equal((workflow.match(/^  pull_request(?:_target)?:/gm) || []).length, 0, 'temporary B6 pull_request proof transport must stay retired');
assert.equal(workflow.includes('repository-harness-canary-pr:v1'), false, 'temporary PR canary marker must not return');
assert.equal(workflow.includes('repository-harness-canary-work-issue:'), false, 'temporary PR work-issue marker must not return');
assert.equal(workflow.includes('issue_comment:'), false, 'B8 must not regress to issue-comment transport');
assert.equal(workflow.includes('cancel-in-progress: true'), false, 'global canonical-main writer serialization must queue overlap instead of cancelling authoritative work');

const resolveIndex = workflow.indexOf('name: Resolve Harness canary Work Record');
const gateIndex = workflow.indexOf('name: Harness coordination receipt canary gate');
const refreshIndex = workflow.indexOf('name: Refresh canonical-main modular operator snapshot');
assert.ok(resolveIndex >= 0 && gateIndex > resolveIndex && refreshIndex > gateIndex, 'work issue resolution and receipt gate must run before canonical-main writer refresh');

const resolveSection = workflow.slice(resolveIndex, gateIndex);
assert.ok(resolveSection.includes("if (process.env.CANARY_DISPATCH_WORK_ISSUE)"), 'bounded reusable/manual input must take precedence over inherited caller event context');
assert.ok(resolveSection.includes("workIssue = String(process.env.CANARY_DISPATCH_WORK_ISSUE)"), 'bounded input must be copied as data, not shell interpolation');
assert.ok(resolveSection.includes("process.env.CANARY_EVENT_NAME === 'issues'"), 'direct issue canary must retain trusted event issue fallback');
assert.ok(resolveSection.includes("workIssue = String(event.issue?.number ?? '')"), 'direct issue canary must resolve numeric Work Record issue from trusted event JSON');
assert.ok(resolveSection.includes("!/^[1-9]\\d*$/.test(workIssue)"), 'all work issue values must be positive integers');
assert.ok(resolveSection.includes('process.env.GITHUB_ENV'), 'resolved issue number must cross steps through GitHub environment state');
assert.equal(resolveSection.includes('pull_request'), false, 'retired PR transport must not remain in resolver');
assert.equal(resolveSection.includes('eval('), false, 'resolver must not evaluate event-controlled text');

const gateSection = workflow.slice(gateIndex, refreshIndex);
assert.ok(gateSection.includes('--work-issue "$COORDINATION_WORK_ISSUE"'), 'gate command must consume only the resolved environment variable');
assert.equal(gateSection.includes('--work-issue "${{ inputs.coordination_work_issue }}"'), false, 'workflow input must not be directly interpolated into shell command');
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

assert.equal((workflow.match(/mutation-gate\.cjs/g) || []).length, 1, 'all canary/reusable paths must share exactly one receipt gate call');
assert.equal((workflow.match(/orchestrator\/refresh\.cjs refresh/g) || []).length, 1, 'existing canonical-main writer must remain a single unchanged refresh invocation');
assert.equal(workflow.includes('scripts/repo-main-write.py'), false, 'B8 must not route canonical-main ops through repo-main-write');

console.log('work-harness canonical-main-canary-contract: ok');
