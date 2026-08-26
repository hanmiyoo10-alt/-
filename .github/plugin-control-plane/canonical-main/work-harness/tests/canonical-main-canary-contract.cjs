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
  'issues:',
  'types: [edited]',
  'pull_request:',
  'types: [opened, edited, reopened]',
  'github.actor == github.repository_owner',
  "contains(github.event.issue.body, '<!-- repository-harness-canary:v1 -->')",
  "contains(github.event.issue.body, '<!-- repository-work-record:v1 -->')",
  "contains(github.event.pull_request.body, '<!-- repository-harness-canary-pr:v1 -->')",
  "contains(github.event.pull_request.body, '<!-- repository-harness-canary-work-issue:')",
  "cron: '17 * * * *'",
  'workflow_run:',
  'push:',
  'group: canonical-main-operations',
  'cancel-in-progress: true',
  'ref: main',
  'persist-credentials: false',
  'name: Resolve Harness canary Work Record',
  "CANARY_EVENT_NAME: ${{ github.event_name }}",
  'GITHUB_EVENT_PATH',
  "body.matchAll(/<!-- repository-harness-canary-work-issue:(\\d+) -->/g)",
  "fs.appendFileSync(process.env.GITHUB_ENV, `COORDINATION_WORK_ISSUE=${workIssue}\\n`)",
  'name: Harness coordination receipt canary gate',
  "if: ${{ (github.event_name == 'workflow_dispatch' && inputs.coordination_work_issue != '') || github.event_name == 'issues' || github.event_name == 'pull_request' }}",
  'GH_TOKEN: ${{ github.token }}',
  'GITHUB_REPOSITORY: ${{ github.repository }}',
  'node .github/plugin-control-plane/canonical-main/work-harness/mutation-gate.cjs',
  '--work-issue "$COORDINATION_WORK_ISSUE"',
  'name: Refresh canonical-main modular operator snapshot',
  'run: node .github/plugin-control-plane/canonical-main/orchestrator/refresh.cjs refresh',
]) assert.ok(workflow.includes(required), `canonical-main canary workflow missing: ${required}`);

const jobGuard = "if: ${{ (github.event_name != 'issues' && github.event_name != 'pull_request') || (github.event_name == 'issues' && github.actor == github.repository_owner && contains(github.event.issue.body, '<!-- repository-harness-canary:v1 -->') && contains(github.event.issue.body, '<!-- repository-work-record:v1 -->')) || (github.event_name == 'pull_request' && github.actor == github.repository_owner && contains(github.event.pull_request.body, '<!-- repository-harness-canary-pr:v1 -->') && contains(github.event.pull_request.body, '<!-- repository-harness-canary-work-issue:')) }}";
assert.ok(workflow.includes(jobGuard), 'canary events must be owner-only and explicitly marked; unrelated issue/PR events must skip the writer job');
assert.equal((workflow.match(/repository-harness-canary:v1/g) || []).length, 1, 'issue canary marker must have one exact owner-gated entry condition');
assert.equal((workflow.match(/repository-harness-canary-pr:v1/g) || []).length, 1, 'PR canary marker must have one exact owner-gated entry condition');
assert.equal((workflow.match(/types: \[opened, edited, reopened\]/g) || []).length, 1, 'B6 PR live proof must expose one bounded pull_request trigger declaration');
assert.equal(workflow.includes('issue_comment:'), false, 'B6 must not regress to the unobserved issue-comment transport');

const resolveIndex = workflow.indexOf('name: Resolve Harness canary Work Record');
const gateIndex = workflow.indexOf('name: Harness coordination receipt canary gate');
const refreshIndex = workflow.indexOf('name: Refresh canonical-main modular operator snapshot');
assert.ok(resolveIndex >= 0 && gateIndex > resolveIndex && refreshIndex > gateIndex, 'canary issue resolution and receipt gate must run before canonical-main writer refresh');

const resolveSection = workflow.slice(resolveIndex, gateIndex);
assert.ok(resolveSection.includes("JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))"), 'PR canary must resolve trusted event metadata from GITHUB_EVENT_PATH');
assert.ok(resolveSection.includes("body.matchAll(/<!-- repository-harness-canary-work-issue:(\\d+) -->/g)"), 'PR canary must parse exactly numeric Work Record issue markers');
assert.ok(resolveSection.includes('matches.length !== 1'), 'PR canary must fail closed on missing or ambiguous Work Record markers');
assert.ok(resolveSection.includes("!/^[1-9]\\d*$/.test(workIssue)"), 'all canary work issue values must be positive integers');
assert.ok(resolveSection.includes('process.env.GITHUB_ENV'), 'resolved issue number must cross steps through GitHub environment state');
assert.equal(resolveSection.includes('eval('), false, 'canary resolver must not evaluate event-controlled text');

const gateSection = workflow.slice(gateIndex, refreshIndex);
assert.ok(gateSection.includes('--work-issue "$COORDINATION_WORK_ISSUE"'), 'gate command must consume only the resolved environment variable');
assert.equal(gateSection.includes('github.event.pull_request.body'), false, 'untrusted PR body must not be interpolated into the gate shell command');
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

assert.equal((workflow.match(/mutation-gate\.cjs/g) || []).length, 1, 'B6 must keep exactly one receipt gate call shared by all canary transports');
assert.equal((workflow.match(/orchestrator\/refresh\.cjs refresh/g) || []).length, 1, 'existing canonical-main writer must remain a single unchanged refresh invocation');
assert.equal(workflow.includes('scripts/repo-main-write.py'), false, 'B6 must not route canonical-main ops through repo-main-write');
assert.equal(workflow.includes('workflow_dispatch: true'), false, 'B6 must not add Harness-driven workflow dispatch semantics');

console.log('work-harness canonical-main-canary-contract: ok');
