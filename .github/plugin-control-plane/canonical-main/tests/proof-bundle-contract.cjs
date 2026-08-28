'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {composeProofBundle, MODE} = require('../proof-bundle.cjs');
const {parseOps} = require('../orchestrator/proof-bundle.cjs');

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

const root = path.resolve(__dirname, '..', '..', '..', '..');
const collector = fs.readFileSync(path.join(__dirname, '..', 'orchestrator', 'proof-bundle.cjs'), 'utf8');
const workflow = fs.readFileSync(path.join(root, 'workflows', 'canonical-main-proof-bundle.yml'), 'utf8');
assert(!/--method['",\s]+(?:POST|PATCH|PUT|DELETE)/i.test(collector), 'collector must not issue write API methods');
assert(!/^\s*[a-z-]+:\s*write\s*$/mi.test(workflow), 'proof workflow permissions must be read-only');
assert(/push:\s*\n\s*branches:\s*\[main\]/m.test(workflow), 'proof bundle must run automatically on main push');
assert(/canonical-main-proof-bundle\.json/.test(workflow), 'workflow must upload the JSON bundle');
assert(/orchestrator\/proof-bundle\.cjs compose/.test(workflow), 'workflow must invoke the trusted composer');

console.log('canonical-main proof-bundle-contract: ok');
