'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  loadRegistry,
  classifyPaths,
  classifyIssueBody,
  validateRegistry,
  resolveStatusIssueIdentity,
} = require('../lib.cjs');
const {projectRows} = require('../canonical-main/observers/project-status.cjs');

const root = path.resolve(__dirname, '../../..');
const registry = loadRegistry();

assert.deepEqual(validateRegistry(registry), [], 'registry must be valid and locator-only');
assert.deepEqual(Object.keys(registry.plugins).sort(), [
  'devpass',
  'simcore',
  'termux-large-doc-editor',
  'usage-dashboard',
  'voyage-token-check',
]);
assert.deepEqual(Object.keys(registry.products).sort(), [
  'app-api-mod-lab',
  'pocketrisu-helper-mod',
]);

const statusLabel = {name: 'control-plane:status'};
const duplicateStatusIssues = [
  {number: 1977, title: '[plugin-status:voyage-token-check]', state: 'open', labels: [statusLabel], body: 'Last refreshed: 2026-09-12T07:30:00Z'},
  {number: 283, title: '[plugin-status:voyage-token-check]', state: 'open', labels: [statusLabel], body: 'Last refreshed: 2026-09-09T12:37:49.877Z'},
];
const duplicateIdentity = resolveStatusIssueIdentity(duplicateStatusIssues, 'plugin', 'voyage-token-check');
assert.equal(duplicateIdentity.canonical.number, 283, 'lowest generated status issue number is canonical');
assert.deepEqual(duplicateIdentity.duplicates.map((row) => row.number), [1977]);
const voyageRegistry = {plugins: {'voyage-token-check': {}}, products: {}};
const duplicateRow = projectRows(voyageRegistry, duplicateStatusIssues, 150, Date.parse('2026-09-12T07:31:00Z'))[0];
assert.equal(duplicateRow.issue.number, 283);
assert.deepEqual(duplicateRow.duplicates.map((row) => row.number), [1977]);
assert.equal(duplicateRow.fresh, false, 'open duplicate generated views must fail project freshness closed');
const singleRow = projectRows(voyageRegistry, [{
  number: 283,
  title: '[plugin-status:voyage-token-check]',
  state: 'open',
  labels: [statusLabel],
  body: 'Last refreshed: 2026-09-12T07:30:00Z',
}], 150, Date.parse('2026-09-12T07:31:00Z'))[0];
assert.equal(singleRow.issue.number, 283);
assert.deepEqual(singleRow.duplicates, []);
assert.equal(singleRow.fresh, true, 'single canonical generated status view keeps normal freshness behavior');

assert.deepEqual(classifyPaths(['plugins/usage-dashboard/src/parts.cjs'], registry).labels, ['plugin:usage-dashboard']);
assert.deepEqual(classifyPaths(['.github/workflows/reusable-usage-dashboard-validate.yml'], registry).labels, ['plugin:usage-dashboard']);
assert.deepEqual(classifyPaths(['plugins/simcore/latest.js', 'product-manifest.json'], registry).labels, ['plugin:simcore']);
assert.deepEqual(classifyPaths(['products/simcore/tooling/check.mjs'], registry).labels, ['plugin:simcore']);
assert.deepEqual(classifyPaths(['plugins/devpass/README.md'], registry).labels, ['plugin:devpass']);
assert.deepEqual(classifyPaths(['plugins/termux/large-doc-editor/server.py'], registry).labels, ['plugin:termux-large-doc-editor']);
assert.deepEqual(classifyPaths(['voyage-token-check/DESIGN_STATUS.md'], registry).labels, ['plugin:voyage-token-check']);
assert.deepEqual(classifyPaths(['products/pocketrisu-helper-mod/CURRENT.md'], registry).labels, ['product:pocketrisu-helper-mod']);
assert.deepEqual(classifyPaths(['.github/workflows/pocketrisu-helper-docs.yml'], registry).labels, ['product:pocketrisu-helper-mod']);
assert.deepEqual(classifyPaths(['plugins/test-a/latest.js'], registry).labels, ['scope:test-fixture']);
assert.deepEqual(classifyPaths(['plugins/test-b/install.js'], registry).labels, ['scope:test-fixture']);
assert.deepEqual(classifyPaths(['plugins/_template/latest.js'], registry).labels, ['scope:template']);
assert.deepEqual(classifyPaths(['README.md'], registry).labels, ['scope:shared']);
assert.deepEqual(classifyPaths(['products/README.md'], registry).labels, ['scope:shared']);
assert.deepEqual(classifyPaths(['.vscode/tasks.json'], registry).labels, ['scope:shared']);
assert.deepEqual(classifyPaths(['.github/plugin-control-plane/registry.json'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['.github/tooling/ci-summary/manifests/plugin-control-plane.json'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['tools/agent-skill-security/corpus.json'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['.github/workflows/agent-skill-security-benchmark.yml'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['tools/other-security-tool/README.md'], registry).labels, ['scope:unclassified']);
assert.deepEqual(classifyPaths(['.github/workflows/agent-skill-security-benchmark-extra.yml'], registry).labels, ['scope:unclassified']);
assert.deepEqual(classifyPaths(['.agents/skills/agent-execution-compactness/SKILL.md'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['.agents/skills/plugin-authority-scan/SKILL.md'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['.agents/skills/plugin-impact-scope/SKILL.md'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['docs/REPOSITORY_AGENT_EXECUTION_COMPACTNESS_V1_DESIGN_2026-09-07.md'], registry).labels, ['scope:repo']);
assert.deepEqual(classifyPaths(['.agents/README.md'], registry).labels, ['scope:unclassified']);
assert.deepEqual(classifyPaths(['docs/REPOSITORY_AGENT_EXECUTION_COMPACTNESS_V1_DESIGN_2026-09-08.md'], registry).labels, ['scope:unclassified']);
assert.deepEqual(classifyPaths(['docs/REPOSITORY_PLUGIN_CONTROL_PLANE_IMPLEMENTATION.md'], registry).labels, ['scope:repo']);
assert.deepEqual(
  classifyPaths(['plugins/usage-dashboard/latest.js', 'plugins/simcore/latest.js'], registry).labels,
  ['plugin:simcore', 'plugin:usage-dashboard', 'scope:multi-plugin'],
);
assert.deepEqual(
  classifyPaths(['plugins/usage-dashboard/latest.js', 'products/pocketrisu-helper-mod/CURRENT.md'], registry).labels,
  ['plugin:usage-dashboard', 'product:pocketrisu-helper-mod', 'scope:multi-owner'],
);
const unknown = classifyPaths(['misc/unknown.txt'], registry);
assert.deepEqual(unknown.labels, ['scope:unclassified']);
assert.deepEqual(unknown.unclassifiedPaths, ['misc/unknown.txt']);

assert.deepEqual(
  classifyIssueBody('### Scope\n\nusage-dashboard\n\n### Summary\nwork', registry),
  {explicit: true, labels: ['plugin:usage-dashboard']},
);
assert.deepEqual(classifyIssueBody('Plugin: simcore', registry), {explicit: true, labels: ['plugin:simcore']});
assert.deepEqual(classifyIssueBody('Scope: voyage-token-check', registry), {explicit: true, labels: ['plugin:voyage-token-check']});
assert.deepEqual(classifyIssueBody('Scope: pocketrisu-helper-mod', registry), {explicit: true, labels: ['product:pocketrisu-helper-mod']});
assert.deepEqual(classifyIssueBody('### Scope\n\nshared', registry), {explicit: true, labels: ['scope:shared']});
assert.deepEqual(classifyIssueBody('### Scope\n\nnot-registered', registry), {explicit: true, labels: ['scope:unclassified']});
assert.deepEqual(classifyIssueBody('just prose', registry), {explicit: false, labels: []});

const issueTemplate = fs.readFileSync(path.join(root, '.github/ISSUE_TEMPLATE/plugin-work.yml'), 'utf8');
assert.match(issueTemplate, /label:\s*Scope/);
assert.match(issueTemplate, /voyage-token-check/);
assert.match(issueTemplate, /pocketrisu-helper-mod/);

function triggerBlock(source, trigger) {
  const match = source.match(new RegExp(`^  ${trigger}:\\n([\\s\\S]*?)(?=^  [a-z_]+:|^permissions:)`, 'm'));
  assert.ok(match, `${trigger} trigger must exist`);
  return match[1];
}

function triggerList(block, key) {
  const match = block.match(new RegExp(`^    ${key}:\\n((?:      - .+\\n?)+)`, 'm'));
  assert.ok(match, `${key} list must exist`);
  return [...match[1].matchAll(/^      - ['"]?(.+?)['"]?$/gm)].map((entry) => entry[1]);
}

const controlPlaneCiWorkflow = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-ci.yml'), 'utf8');
const pullRequestTrigger = triggerBlock(controlPlaneCiWorkflow, 'pull_request');
const pushTrigger = triggerBlock(controlPlaneCiWorkflow, 'push');
assert.deepEqual(triggerList(pushTrigger, 'branches'), ['main']);
assert.deepEqual(triggerList(pushTrigger, 'paths'), triggerList(pullRequestTrigger, 'paths'));
assert.match(controlPlaneCiWorkflow, /^  workflow_dispatch:\s*$/m);
const controlPlaneCiPermissions = controlPlaneCiWorkflow.match(/^permissions:\n([\s\S]*?)^jobs:/m);
assert.ok(controlPlaneCiPermissions, 'workflow permissions block must exist');
assert.equal(controlPlaneCiPermissions[1].trim(), 'contents: read');

const observerWorkflow = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-pr-observe.yml'), 'utf8');
assert.match(observerWorkflow, /pull_request:/);
assert.match(observerWorkflow, /contents:\s*read/);
assert.doesNotMatch(observerWorkflow, /issues:\s*write/);
assert.doesNotMatch(observerWorkflow, /pull-requests:\s*write/);
assert.doesNotMatch(observerWorkflow, /actions\/checkout/);
assert.match(observerWorkflow, /PLUGIN_CONTROL_PLANE_PR_OBSERVED/);

const prWorkflow = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-pr.yml'), 'utf8');
assert.match(prWorkflow, /schedule:/);
assert.match(prWorkflow, /cron:\s*'\*\/5 \* \* \* \*'/);
assert.match(prWorkflow, /workflow_dispatch:/);
assert.match(prWorkflow, /branches:\s*\[main\]/);
assert.match(prWorkflow, /ref:\s*main/);
assert.match(prWorkflow, /persist-credentials:\s*false/);
assert.match(prWorkflow, /pr-classifier\.cjs/);
assert.match(prWorkflow, /issues:\s*write/);
assert.match(prWorkflow, /pull-requests:\s*write/);
assert.doesNotMatch(prWorkflow, /workflow_run:/);
assert.doesNotMatch(prWorkflow, /pull_request_target:/);
assert.doesNotMatch(prWorkflow, /(?:^|\n)\s*pull_request:\s*(?:\n|$)/);

const prClassifier = fs.readFileSync(path.join(root, '.github/plugin-control-plane/pr-classifier.cjs'), 'utf8');
assert.match(prClassifier, /\/pulls\?state=open&per_page=100&page=\$\{page\}/);
assert.match(prClassifier, /open PR pagination exceeded 500-item safety bound/);
assert.match(prClassifier, /\/pulls\/\$\{number\}\/files/);
assert.match(prClassifier, /classifyPaths\(paths, registry\)/);
assert.match(prClassifier, /PLUGIN_CONTROL_PLANE_PR_RECONCILED/);
assert.match(prClassifier, /PLUGIN_CONTROL_PLANE_PR_RECONCILE_SUMMARY/);
assert.match(prClassifier, /preserved = current\.filter/);
assert.doesNotMatch(prClassifier, /workflow_run|pull_request_target/);
assert.doesNotMatch(prClassifier, /child_process|execSync|spawnSync|require\(['"]vm['"]\)/);

const issueWorkflow = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-issue.yml'), 'utf8');
assert.match(issueWorkflow, /issues:/);
assert.match(issueWorkflow, /classify-issue/);
assert.doesNotMatch(issueWorkflow, /pull_request_target/);

const statusWorkflow = fs.readFileSync(path.join(root, '.github/workflows/plugin-control-plane-status.yml'), 'utf8');
assert.match(statusWorkflow, /schedule:/);
assert.match(statusWorkflow, /Reconcile open PR ownership from trusted main/);
assert.match(statusWorkflow, /pr-classifier\.cjs/);
assert.match(statusWorkflow, /refresh-status/);
assert.match(statusWorkflow, /voyage-token-check\/\*\*/);
assert.match(statusWorkflow, /products\/pocketrisu-helper-mod\/\*\*/);
assert.match(statusWorkflow, /issues:\s*write/);
assert.match(statusWorkflow, /pull-requests:\s*write/);
assert.doesNotMatch(statusWorkflow, /(?:^|\n)\s*pull_request:\s*(?:\n|$)/);
assert.doesNotMatch(statusWorkflow, /contents:\s*write/);
assert.doesNotMatch(statusWorkflow, /git\s+push/);

const controlPlaneReadme = fs.readFileSync(path.join(root, '.github/plugin-control-plane/README.md'), 'utf8');
assert.match(controlPlaneReadme, /intentionally redundant metadata-only fallback/);
assert.match(controlPlaneReadme, /pull-requests: write/);
assert.match(controlPlaneReadme, /never execute PR-head code/);
assert.match(controlPlaneReadme, /`pull_request` observer remains read-only evidence/);

const controller = fs.readFileSync(path.join(root, '.github/plugin-control-plane/controller.cjs'), 'utf8');
assert.match(controller, /DECLARED_MISSING/);
assert.match(controller, /NONE — source explicitly marks this as non-production prototype/);
assert.match(controller, /PENDING —/);
assert.match(controller, /pocketRisuHelperStatus/);
assert.match(controller, /registry\.products/);
assert.match(controller, /product:/);
assert.match(controller, /const statusLabel = encodeURIComponent\('control-plane:status'\)/);
assert.match(controller, /resolveStatusIssueIdentity/);
assert.match(controller, /CLOSED_STATUS_DUPLICATE/);
assert.doesNotMatch(controller, /productionVersion\s*:/);

console.log('PLUGIN_CONTROL_PLANE_CONTRACTS:OK');
