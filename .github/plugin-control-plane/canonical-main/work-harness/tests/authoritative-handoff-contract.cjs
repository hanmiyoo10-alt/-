'use strict';

const assert = require('node:assert/strict');
const {
  CANONICAL_CAPABILITY,
  CANONICAL_WORKFLOW,
  HANDOFF_REQUEST,
  exitCodeFor,
  findAuditedWorkflowRoute,
  markerCount,
  planAuthoritativeHandoff,
} = require('../authoritative-handoff.cjs');

const USAGE_CAPABILITY = 'USAGE_DASHBOARD_CANDIDATE';
const USAGE_WORKFLOW = '.github/workflows/usage-dashboard-prepare-candidate.yml';

const adapterRegistry = {
  schemaVersion: 1,
  adapters: [
    {
      adapterId: 'canonical-main',
      supportedScopeIds: ['canonical-main'],
      capabilities: [CANONICAL_CAPABILITY],
      workflows: [CANONICAL_WORKFLOW],
      receiptRequiredFor: ['ISSUE_RECONCILIATION'],
      routes: [{
        capability: CANONICAL_CAPABILITY,
        targetKind: 'GITHUB_WORKFLOW',
        target: CANONICAL_WORKFLOW,
        fixedArgs: [],
        executionClass: 'MUTATING',
        mutationClass: 'ISSUE_RECONCILIATION',
        invokePolicy: 'HANDOFF_ONLY',
      }],
    },
    {
      adapterId: 'usage-dashboard',
      supportedScopeIds: ['usage-dashboard'],
      capabilities: [USAGE_CAPABILITY],
      workflows: [USAGE_WORKFLOW],
      receiptRequiredFor: ['CANDIDATE_STATE'],
      routes: [{
        capability: USAGE_CAPABILITY,
        targetKind: 'GITHUB_WORKFLOW',
        target: USAGE_WORKFLOW,
        fixedArgs: [],
        executionClass: 'MUTATING',
        mutationClass: 'CANDIDATE_STATE',
        invokePolicy: 'HANDOFF_ONLY',
      }],
    },
  ],
};

const workRecord = {
  workId: 'PROOF',
  scopeId: 'canonical-main',
  requiredCapability: CANONICAL_CAPABILITY,
};
const usageWorkRecord = {
  workId: 'USAGE-PROOF',
  scopeId: 'usage-dashboard',
  requiredCapability: USAGE_CAPABILITY,
};
const readyGate = {
  status: 'MUTATION_GATE_READY',
  receiptId: 'receipt-1',
  reasonCodes: ['MUTATION_GATE_COORDINATION_READY'],
};

assert.equal(markerCount(`x\n${HANDOFF_REQUEST}\ny`), 1);
assert.equal(markerCount(`${HANDOFF_REQUEST}\n${HANDOFF_REQUEST}`), 2);

const canonicalRoute = findAuditedWorkflowRoute(workRecord, adapterRegistry);
assert.equal(canonicalRoute.ok, true);
assert.equal(canonicalRoute.adapterId, 'canonical-main');
assert.equal(canonicalRoute.route.target, CANONICAL_WORKFLOW);
assert.equal(canonicalRoute.autoInvokeSupported, true);

const usageRoute = findAuditedWorkflowRoute(usageWorkRecord, adapterRegistry);
assert.equal(usageRoute.ok, true);
assert.equal(usageRoute.adapterId, 'usage-dashboard');
assert.equal(usageRoute.route.target, USAGE_WORKFLOW);
assert.equal(usageRoute.autoInvokeSupported, false);

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
assert.equal(ready.adapterId, 'canonical-main');
assert.equal(ready.autoInvokeSupported, true);
assert.equal(ready.coordinationReady, true);
assert.equal(ready.mutationAuthorized, false);
assert.equal(ready.executionAuthorized, false);
assert.equal(exitCodeFor(ready), 0);

const usageReady = planAuthoritativeHandoff({
  issue: { number: 2, body: HANDOFF_REQUEST },
  workRecord: usageWorkRecord,
  gateResult: { ...readyGate, receiptId: 'usage-receipt-1' },
  adapterRegistry,
});
assert.equal(usageReady.status, 'AUTHORITATIVE_HANDOFF_ROUTE_READY');
assert.equal(usageReady.targetWorkflow, USAGE_WORKFLOW);
assert.equal(usageReady.targetIssueNumber, 2);
assert.equal(usageReady.receiptId, 'usage-receipt-1');
assert.equal(usageReady.adapterId, 'usage-dashboard');
assert.equal(usageReady.autoInvokeSupported, false);
assert.equal(usageReady.coordinationReady, true);
assert.equal(usageReady.mutationAuthorized, false);
assert.equal(usageReady.executionAuthorized, false);
assert.ok(usageReady.reasonCodes.includes('AUTHORITATIVE_HANDOFF_ROUTE_AUDITED'));
assert.ok(usageReady.reasonCodes.includes('AUTHORITATIVE_HANDOFF_AUTO_INVOKE_NOT_ENABLED'));
assert.equal(usageReady.legalNextAction, 'ENABLE_BOUNDED_EXISTING_WORKFLOW_HANDOFF_IN_SEPARATE_PACKET');
assert.equal(exitCodeFor(usageReady), 0);

const missingReceiptPolicy = structuredClone(adapterRegistry);
missingReceiptPolicy.adapters[1].receiptRequiredFor = [];
const policyBlocked = planAuthoritativeHandoff({
  issue: { number: 2, body: HANDOFF_REQUEST },
  workRecord: usageWorkRecord,
  gateResult: readyGate,
  adapterRegistry: missingReceiptPolicy,
});
assert.equal(policyBlocked.status, 'AUTHORITATIVE_HANDOFF_BLOCKED');
assert.ok(policyBlocked.reasonCodes.includes('AUTHORITATIVE_HANDOFF_ROUTE_NOT_ALLOWED'));

const directInvokeRoute = structuredClone(adapterRegistry);
directInvokeRoute.adapters[1].routes[0].invokePolicy = 'READ_ONLY_LOCAL';
const directInvokeBlocked = planAuthoritativeHandoff({
  issue: { number: 2, body: HANDOFF_REQUEST },
  workRecord: usageWorkRecord,
  gateResult: readyGate,
  adapterRegistry: directInvokeRoute,
});
assert.equal(directInvokeBlocked.status, 'AUTHORITATIVE_HANDOFF_BLOCKED');
assert.ok(directInvokeBlocked.reasonCodes.includes('AUTHORITATIVE_HANDOFF_ROUTE_NOT_ALLOWED'));

console.log('work-harness authoritative-handoff-contract: ok');
