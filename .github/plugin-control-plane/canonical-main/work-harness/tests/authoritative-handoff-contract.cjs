'use strict';

const assert = require('node:assert/strict');
const {
  CANONICAL_CAPABILITY,
  CANONICAL_WORKFLOW,
  HANDOFF_REQUEST,
  exitCodeFor,
  markerCount,
  planAuthoritativeHandoff,
} = require('../authoritative-handoff.cjs');

const adapterRegistry = {
  schemaVersion: 1,
  adapters: [{
    adapterId: 'canonical-main',
    supportedScopeIds: ['canonical-main'],
    capabilities: [CANONICAL_CAPABILITY],
    routes: [{
      capability: CANONICAL_CAPABILITY,
      targetKind: 'GITHUB_WORKFLOW',
      target: CANONICAL_WORKFLOW,
      fixedArgs: [],
      executionClass: 'MUTATING',
      mutationClass: 'ISSUE_RECONCILIATION',
      invokePolicy: 'HANDOFF_ONLY',
    }],
  }],
};

const workRecord = {
  workId: 'PROOF',
  scopeId: 'canonical-main',
  requiredCapability: CANONICAL_CAPABILITY,
};
const readyGate = {
  status: 'MUTATION_GATE_READY',
  receiptId: 'receipt-1',
  reasonCodes: ['MUTATION_GATE_COORDINATION_READY'],
};

assert.equal(markerCount(`x\n${HANDOFF_REQUEST}\ny`), 1);
assert.equal(markerCount(`${HANDOFF_REQUEST}\n${HANDOFF_REQUEST}`), 2);

const absent = planAuthoritativeHandoff({ issue: { number: 1, body: 'no marker' }, workRecord, gateResult: null, adapterRegistry });
assert.equal(absent.status, 'AUTHORITATIVE_HANDOFF_NOT_REQUESTED');
assert.equal(exitCodeFor(absent), 0);

const duplicate = planAuthoritativeHandoff({ issue: { number: 1, body: `${HANDOFF_REQUEST}\n${HANDOFF_REQUEST}` }, workRecord, gateResult: readyGate, adapterRegistry });
assert.equal(duplicate.status, 'AUTHORITATIVE_HANDOFF_BLOCKED');
assert.ok(duplicate.reasonCodes.includes('AUTHORITATIVE_HANDOFF_REQUEST_DUPLICATE'));
assert.equal(exitCodeFor(duplicate), 3);

const wrongCapability = planAuthoritativeHandoff({
  issue: { number: 1, body: HANDOFF_REQUEST },
  workRecord: { ...workRecord, requiredCapability: 'CANONICAL_MAIN_WORK_HARNESS' },
  gateResult: readyGate,
  adapterRegistry,
});
assert.equal(wrongCapability.status, 'AUTHORITATIVE_HANDOFF_BLOCKED');
assert.ok(wrongCapability.reasonCodes.includes('AUTHORITATIVE_HANDOFF_CAPABILITY_NOT_ALLOWED'));

const gateBlocked = planAuthoritativeHandoff({
  issue: { number: 1, body: HANDOFF_REQUEST },
  workRecord,
  gateResult: { status: 'MUTATION_GATE_BLOCKED', reasonCodes: ['MUTATION_GATE_RECEIPT_REQUIRED'] },
  adapterRegistry,
});
assert.equal(gateBlocked.status, 'AUTHORITATIVE_HANDOFF_BLOCKED');
assert.ok(gateBlocked.reasonCodes.includes('AUTHORITATIVE_HANDOFF_GATE_BLOCKED'));
assert.ok(gateBlocked.reasonCodes.includes('MUTATION_GATE_RECEIPT_REQUIRED'));

const ready = planAuthoritativeHandoff({ issue: { number: 1, body: HANDOFF_REQUEST }, workRecord, gateResult: readyGate, adapterRegistry });
assert.equal(ready.status, 'AUTHORITATIVE_HANDOFF_READY');
assert.equal(ready.targetWorkflow, CANONICAL_WORKFLOW);
assert.equal(ready.targetIssueNumber, 1);
assert.equal(ready.receiptId, 'receipt-1');
assert.equal(ready.coordinationReady, true);
assert.equal(ready.mutationAuthorized, false);
assert.equal(ready.executionAuthorized, false);
assert.equal(exitCodeFor(ready), 0);

console.log('work-harness authoritative-handoff-contract: ok');
