'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {composeProofBundle, MODE} = require('../proof-bundle.cjs');
const {readGitHubCliJson} = require('../infra/github-cli-read.cjs');
const {attachReadFailures, parseOps, writeBundle} = require('../orchestrator/proof-bundle.cjs');

function sample() {
  return {
    targetSha: 'a'.repeat(40),
    pr: {number: 675, headSha: 'b'.repeat(40), mergeSha: 'a'.repeat(40)},
    prHead: {
      plugin: {runId: 11, conclusion: 'success'},
      simcore: {runId: 12, conclusion: 'success', verify: 'success', required: 'success'},
    },
    mergedMain: {runId: 13, conclusion: 'success', verify: 'success', required: 'success'},
    ops: {
      observedSha: 'a'.repeat(40),
      state: 'CLEAR',
      convergence: 'STABLE',
      requiredPass: true,
      productionMatch: true,
      requiredUnknownNone: true,
    },
    protection: {protected: false, enforcementLevel: 'off', requiredChecks: []},
    incidents: {activeP0P1Known: true, activeP0P1Count: 0, attentionKnown: true, attentionCount: 0},
  };
}

const complete = composeProofBundle(sample());
assert.equal(complete.mode, MODE);
assert.equal(complete.state, 'COMPLETE');
assert.equal(complete.acceptanceReady, true);
assert.deepEqual(complete.missing, []);
assert.deepEqual(complete.failures, []);
assert.equal(complete.evidence.protection.protected, false, 'direct protected=false is known evidence, not UNKNOWN');

const partialInput = sample();
delete partialInput.ops.observedSha;
const partial = composeProofBundle(partialInput);
assert.equal(partial.state, 'PARTIAL');
assert.equal(partial.acceptanceReady, false);
assert(partial.missing.includes('OPS_SHA_UNKNOWN'));

const failedInput = sample();
failedInput.mergedMain.required = 'failure';
const failed = composeProofBundle(failedInput);
assert.equal(failed.state, 'COMPLETE', 'known failure is complete evidence, not missing evidence');
assert.equal(failed.acceptanceReady, false);
assert(failed.failures.includes('MERGED_MAIN_REQUIRED_NOT_SUCCESS'));

const activeIncidentInput = sample();
activeIncidentInput.incidents.activeP0P1Count = 1;
const activeIncident = composeProofBundle(activeIncidentInput);
assert.equal(activeIncident.state, 'COMPLETE', 'known incident state remains representable evidence');
assert.equal(activeIncident.evidence.incidents.activeP0P1Count, 1);

const rendered = [
  '- STATE: `CLEAR`',
  `- MAIN: \`${'a'.repeat(40)}\` / Required PASS — run 123`,
  '- AUTHORITY: Production MATCH — release-simcore abc; native protection `BLOCKED_PERMISSION` / protected `false`; soft fallback `ACTIVE`',
  '- UNKNOWN: NONE',
  '- Convergence: `STABLE`',
  '## Active P0/P1 incidents',
  '',
  '- none observed within current adapter coverage',
  '## Attention queue (P2)',
  '',
  '- none observed within current adapter coverage',
  '## Projects / products',
].join('\n');
const parsed = parseOps(rendered);
assert.equal(parsed.observedSha, 'a'.repeat(40));
assert.equal(parsed.state, 'CLEAR');
assert.equal(parsed.convergence, 'STABLE');
assert.equal(parsed.requiredPass, true);
assert.equal(parsed.productionMatch, true);
assert.equal(parsed.requiredUnknownNone, true);
assert.equal(parsed.activeP0P1Known, true);
assert.equal(parsed.activeP0P1Count, 0);
assert.equal(parsed.attentionKnown, true);
assert.equal(parsed.attentionCount, 0);

function sequenceExec(steps) {
  let index = 0;
  return () => {
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step instanceof Error) throw step;
    return step;
  };
}

const recoveredCommand = readGitHubCliJson(
  ['repos/example/repo/issues/1'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec([new Error('secret-token'), '{"ok":true}'])},
);
assert.deepEqual(recoveredCommand, {value: {ok: true}, failure: null});

const recoveredJson = readGitHubCliJson(
  ['repos/example/repo/issues/2'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec(['{"broken":', '{"ok":2}'])},
);
assert.deepEqual(recoveredJson, {value: {ok: 2}, failure: null});

const failedCommand = readGitHubCliJson(
  ['repos/example/repo/issues/3'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec([new Error('secret-one'), new Error('secret-two')])},
);
assert.equal(failedCommand.value, null);
assert.deepEqual(failedCommand.failure, {
  read: 'repos/example/repo/issues/3',
  failureClass: 'GH_API_COMMAND_FAILED',
  attempts: 2,
});
assert(!JSON.stringify(failedCommand).includes('secret-'), 'raw command failure detail must not be retained');

const failedJson = readGitHubCliJson(
  ['repos/example/repo/issues/4'],
  {attempts: 2, delayMs: 0, execFileSync: sequenceExec(['{"token":"secret"', '{"token":"still-secret"'])},
);
assert.equal(failedJson.value, null);
assert.equal(failedJson.failure.failureClass, 'GH_API_JSON_INVALID');
assert(!JSON.stringify(failedJson).includes('secret'), 'raw malformed JSON must not be retained');

assert.throws(
  () => readGitHubCliJson(['--method', 'POST', 'repos/example/repo/issues']),
  /read-only/,
  'GitHub CLI helper must reject explicit write methods',
);
assert.throws(
  () => readGitHubCliJson(['repos/example/repo/issues', '-f', 'title=forbidden']),
  /read-only/,
  'GitHub CLI helper must reject field arguments that would imply POST',
);

const partialReadFailure = attachReadFailures(complete, [failedCommand.failure]);
assert.equal(partialReadFailure.state, 'PARTIAL');
assert.equal(partialReadFailure.acceptanceReady, false);
assert(partialReadFailure.missing.includes('EXTERNAL_READ_FAILURE'));
assert.deepEqual(partialReadFailure.evidence.readFailures, [failedCommand.failure]);
assert.strictEqual(attachReadFailures(complete, []), complete, 'clean later collection must not inherit old read failures');

const oldCwd = process.cwd();
const oldSummary = process.env.GITHUB_STEP_SUMMARY;
const oldOutput = process.env.GITHUB_OUTPUT;
const artifactRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'proof-bundle-contract-'));
try {
  delete process.env.GITHUB_STEP_SUMMARY;
  delete process.env.GITHUB_OUTPUT;
  process.chdir(artifactRoot);
  const artifact = writeBundle(partialReadFailure);
  assert(fs.existsSync(artifact), 'partial external-read failure must still materialize an artifact');
  const persisted = JSON.parse(fs.readFileSync(artifact, 'utf8'));
  assert.equal(persisted.acceptanceReady, false);
  assert(persisted.missing.includes('EXTERNAL_READ_FAILURE'));
} finally {
  process.chdir(oldCwd);
  if (oldSummary === undefined) delete process.env.GITHUB_STEP_SUMMARY;
  else process.env.GITHUB_STEP_SUMMARY = oldSummary;
  if (oldOutput === undefined) delete process.env.GITHUB_OUTPUT;
  else process.env.GITHUB_OUTPUT = oldOutput;
  fs.rmSync(artifactRoot, {recursive: true, force: true});
}

const githubDir = path.resolve(__dirname, '..', '..', '..');
const collector = fs.readFileSync(path.join(__dirname, '..', 'orchestrator', 'proof-bundle.cjs'), 'utf8');
const workflow = fs.readFileSync(path.join(githubDir, 'workflows', 'canonical-main-proof-bundle.yml'), 'utf8');
assert(!/--method['",\s]+(?:POST|PATCH|PUT|DELETE)/i.test(collector), 'collector must not issue write API methods');
assert(!/^\s*[a-z-]+:\s*write\s*$/mi.test(workflow), 'proof workflow permissions must be read-only');
assert(/push:\s*\n\s*branches:\s*\[main\]/m.test(workflow), 'proof bundle must run automatically on main push');
assert(/canonical-main-proof-bundle\.json/.test(workflow), 'workflow must upload the JSON bundle');
assert(/if-no-files-found:\s*error/.test(workflow), 'missing proof artifact must remain a workflow error');
assert(/orchestrator\/proof-bundle\.cjs compose/.test(workflow), 'workflow must invoke the trusted composer');

console.log('canonical-main proof-bundle-contract: ok');
