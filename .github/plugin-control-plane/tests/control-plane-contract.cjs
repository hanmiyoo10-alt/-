'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  loadRegistry,
  classifyPaths,
  classifyIssueBody,
  validateRegistry,
} = require('../lib.cjs');

const root = path.resolve(__dirname, '../../..');
const registry = loadRegistry();

assert.deepEqual(validateRegistry(registry), [], 'registry must be valid and locator-only');
assert.deepEqual(Object.keys(registry.plugins).sort(), [
  'devpass',
  'simcore',
  'termux-large-doc-editor',
  'usage-dashboard',
]);

assert.deepEqual(classifyPaths(['plugins/usage-dashboard/src/parts.cjs'], registry).labels, ['plugin:usage-dashboard']);
assert.deepEqual(classifyPaths(['.github/workflows/reusable-usage-dashboard-validate.yml'], registry).labels, ['plugin:usage-dashboard']);
assert.deepEqual(classifyPaths(['plugins/simcore/latest.js', 'product-manifest.json'], registry).labels, ['plugin:simcore']);
assert.deepEqual(classifyPaths(['plugins/devpass/README.md'], registry).labels, ['plugin:devpass']);
assert.deepEqual(classifyPaths(['plugins/termux/large-doc-editor/server.py'], registry).labels, ['plugin:termux-large-doc-editor']);
assert.deepEqual(classifyPaths(['plugins/test-a/latest.js'], registry).labels, ['scope:test-fixture']);
assert.deepEqual(classifyPaths(['plugins/test-b/install.js'], registry).labels, ['scope:test-fixture']);
assert.deepEqual(classifyPaths(['plugins/_template/latest.js'], registry).labels, ['scope:template']);
assert.deepEqual(classifyPaths(['README.md'], registry).labels, ['scope:shared']);
assert.deepEqual(classifyPaths(['.github/plugin-control-plane/registry.json'], registry).labels, ['scope:repo']);
assert.deepEqual(
  classifyPaths(['plugins/usage-dashboard/latest.js', 'plugins/simcore/latest.js'], registry).labels,
  ['plugin:simcore', 'plugin:usage-dashboard', 'scope:multi-plugin'],
);
const unknown = classifyPaths(['voyage-token-check/unknown.txt'], registry);
assert.deepEqual(unknown.labels, ['scope:unclassified']);
assert.deepEqual(unknown.unclassifiedPaths, ['voyage-token-check/unknown.txt']);

assert.deepEqual(
  classifyIssueBody('### Plugin\n\nusage-dashboard\n\n### Summary\nwork', registry),
  {explicit: true, labels: ['plugin:usage-dashboard']},
);
assert.deepEqual(classifyIssueBody('Plugin: simcore', registry), {explicit: true, labels: ['plugin:simcore']});
assert.deepEqual(classifyIssueBody('### Plugin\n\nshared', registry), {explicit: true, labels: ['scope:shared']});
assert.deepEqual(classifyIssueBody('### Plugin\n\nnot-registered', registry), {explicit: true, labels: ['scope:unclassified']});
assert.deepEqual(classifyIssueBody('just prose', registry), {explicit: false, labels: []});

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
assert.match(prWorkflow, /pull-requests:\s*read/);
assert.doesNotMatch(prWorkflow, /workflow_run:/);
assert.doesNotMatch(prWorkflow, /pull_request_target:/);
assert.doesNotMatch(prWorkflow, /pull-requests:\s*write/);

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
assert.match(statusWorkflow, /refresh-status/);
assert.doesNotMatch(statusWorkflow, /contents:\s*write/);
assert.doesNotMatch(statusWorkflow, /git\s+push/);

const controller = fs.readFileSync(path.join(root, '.github/plugin-control-plane/controller.cjs'), 'utf8');
assert.match(controller, /DECLARED_MISSING/);
assert.match(controller, /NONE — source explicitly marks this as non-production prototype/);
assert.match(controller, /PENDING —/);
assert.doesNotMatch(controller, /productionVersion\s*:/);

console.log('PLUGIN_CONTROL_PLANE_CONTRACTS:OK');
