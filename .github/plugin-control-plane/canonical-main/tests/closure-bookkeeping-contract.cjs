'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  AUTO_CLOSE_OPT_IN,
  EVIDENCE_START,
  QUEUE_END,
  QUEUE_START,
  WORK_PACKET_MARKER,
  classifyBundle,
  ensurePacketEligible,
  parsePrIdentity,
  parseQueue,
  queueDisposition,
  renderBlocked,
  renderPacketDone,
  renderQueueIdle,
} = require('../orchestrator/closure-bookkeeping.cjs');

const target = 'a'.repeat(40);
const head = 'b'.repeat(40);

function bundle() {
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_PROOF_BUNDLE',
    state: 'COMPLETE',
    acceptanceReady: true,
    targetSha: target,
    pr: {number: 679, headSha: head, mergeSha: target},
    evidence: {
      prHead: {
        plugin: {runId: 101, conclusion: 'success'},
        simcore: {runId: 102, conclusion: 'success', verify: 'success', required: 'success'},
      },
      mergedMain: {runId: 103, conclusion: 'success', verify: 'success', required: 'success'},
      ops: {
        observedSha: target,
        state: 'CLEAR',
        convergence: 'STABLE',
        requiredPass: true,
        productionMatch: true,
        requiredUnknownNone: true,
      },
      protection: {protected: false, enforcementLevel: 'off', requiredChecks: []},
      incidents: {activeP0P1Known: true, activeP0P1Count: 0, attentionKnown: true, attentionCount: 0},
    },
    missing: [],
    failures: [],
  };
}

const identity = parsePrIdentity([
  'Implements V12-A2.',
  'Canonical-Main-Packet: #677',
  'Canonical-Main-Design: #650',
].join('\n'));
assert.deepEqual(identity, {packet: 677, design: 650});
assert.equal(parsePrIdentity('packet #677 design #650'), null, 'fuzzy references must never become auto-close identity');
assert.equal(parsePrIdentity('Canonical-Main-Packet: #677\nCanonical-Main-Packet: #678\nCanonical-Main-Design: #650'), null, 'duplicate identity markers fail closed');

const ready = classifyBundle(bundle(), target);
assert.equal(ready.state, 'READY');
assert.equal(ready.next, 'NONE');

const partialBundle = bundle();
partialBundle.state = 'PARTIAL';
partialBundle.acceptanceReady = false;
partialBundle.missing = ['OPS_SHA_UNKNOWN'];
const partial = classifyBundle(partialBundle, target);
assert.equal(partial.state, 'BLOCKED');
assert.equal(partial.reasonCode, 'EVIDENCE_UNKNOWN');
assert.equal(partial.next, 'WAIT_FOR_CURRENT_EVIDENCE');

const failedBundle = bundle();
failedBundle.acceptanceReady = false;
failedBundle.failures = ['MERGED_MAIN_REQUIRED_NOT_SUCCESS'];
const failed = classifyBundle(failedBundle, target);
assert.equal(failed.reasonCode, 'REQUIRED_CHECK_FAILED');
assert.equal(failed.next, 'REVIEW_REQUIRED_CHECK_FAILURE');

const stale = classifyBundle(bundle(), 'c'.repeat(40));
assert.equal(stale.reasonCode, 'CONVERGENCE_STALE');
assert.equal(stale.next, 'WAIT_FOR_CURRENT_EVIDENCE');

const packetBody = [
  WORK_PACKET_MARKER,
  AUTO_CLOSE_OPT_IN,
  '# packet',
  '**State: ACTIVE**',
  '## Packet ID',
  'V12-A2',
].join('\n');
const eligible = ensurePacketEligible({body: packetBody});
assert.equal(eligible.state, 'READY');
assert.equal(eligible.packetId, 'V12-A2');
assert.equal(ensurePacketEligible({body: packetBody.replace(AUTO_CLOSE_OPT_IN, '')}).state, 'BLOCKED');

const queueBody = [
  '# queue',
  '**Queue state: ACTIVE / CANONICAL-MAIN-V1.2**',
  '## Current implementation coordination',
  QUEUE_START,
  '- Active writable packet: **V12-A2 #677 — deterministic issue-only closure bookkeeping**.',
  '- Latest completed packet: **V12-A1 #675 / PR #676 — DONE**.',
  '- Design authority: **#650**.',
  QUEUE_END,
  '## Coordination state',
  '- Completed v1.2 slices: V12-Q1, V12-A1.',
  '- Active: **V12-A2 #677**.',
  '## Surfaces',
  '- active packet: #677',
  '- latest completed packet: #675',
].join('\n');
const queue = parseQueue(queueBody);
assert.equal(queue.valid, true);
assert.equal(queue.activePacket, 677);
assert.equal(queue.design, 650);
assert.equal(queue.coordinationActive, 'V12-A2 #677');
assert.equal(queue.coordinationActiveNone, false);
assert.equal(queueDisposition(queue, identity).state, 'READY');
const overlap = queueDisposition(queue, {packet: 999, design: 650});
assert.equal(overlap.reasonCode, 'PACKET_SCOPE_OVERLAP');
assert.equal(overlap.next, 'RESOLVE_PACKET_SCOPE_OVERLAP');

const context = {packetNumber: 677, designNumber: 650, proofRunId: 104, packetIdValue: 'V12-A2'};
const donePacket = renderPacketDone(packetBody, bundle(), context);
assert(donePacket.includes('**State: DONE**'));
assert.equal((donePacket.match(new RegExp(EVIDENCE_START, 'g')) || []).length, 1);
assert.equal(renderPacketDone(donePacket, bundle(), context), donePacket, 'packet evidence generation must be idempotent');

const idleQueue = renderQueueIdle(queueBody, {...context, bundle: bundle()});
assert(idleQueue.includes('**Queue state: IDLE / CANONICAL-MAIN-V1.2**'));
assert(idleQueue.includes('- Active writable packet: **NONE**.'));
assert(idleQueue.includes('V12-A2 #677 — DONE / IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN'));
assert(idleQueue.includes('- Completed v1.2 slices: V12-Q1, V12-A1, V12-A2.'));
assert(idleQueue.includes('- Active: **NONE**.'));
assert(!idleQueue.includes('- Active: **V12-A2 #677**.'), 'stale lower active projection must not survive closure');
assert(idleQueue.includes('- active packet: none'));
assert(idleQueue.includes('- latest completed packet: #677'));
const parsedIdle = parseQueue(idleQueue);
assert.equal(parsedIdle.state, 'IDLE');
assert.equal(parsedIdle.activeNone, true);
assert.equal(parsedIdle.coordinationActiveNone, true);
assert.equal(queueDisposition(parsedIdle, identity).state, 'IDEMPOTENT');
assert.equal(renderQueueIdle(idleQueue, {...context, bundle: bundle()}), idleQueue, 'queue closure rendering must be idempotent');

const inconsistentIdle = idleQueue.replace('- Active: **NONE**.', '- Active: **V12-A2 #677**.');
const parsedInconsistent = parseQueue(inconsistentIdle);
assert.equal(parsedInconsistent.state, 'IDLE');
assert.equal(parsedInconsistent.coordinationActiveNone, false);
assert.equal(queueDisposition(parsedInconsistent, identity).state, 'BLOCKED', 'internally contradictory IDLE must not be treated as already closed');

const blockedText = renderBlocked(677, target, 104, partial);
assert.equal((blockedText.match(/- reasonCode:/g) || []).length, 1);
assert.equal((blockedText.match(/- NEXT:/g) || []).length, 1);
assert(blockedText.includes('`WAIT_FOR_CURRENT_EVIDENCE`'));

const githubRoot = path.resolve(__dirname, '..', '..', '..');
const workflow = fs.readFileSync(path.join(githubRoot, 'workflows', 'canonical-main-ops.yml'), 'utf8');
const pluginManifest = JSON.parse(fs.readFileSync(path.join(githubRoot, 'tooling', 'ci-summary', 'manifests', 'plugin-control-plane.json'), 'utf8'));
const writer = fs.readFileSync(path.join(__dirname, '..', 'orchestrator', 'closure-bookkeeping.cjs'), 'utf8');

assert(/- Canonical Main Proof Bundle/.test(workflow), 'existing ops writer must observe completed A1 proof workflow');
assert(/closure-bookkeeping:/.test(workflow), 'ops workflow must own the narrow closure job');
assert(/github\.event\.workflow_run\.name == 'Canonical Main Proof Bundle'/.test(workflow), 'closure job must be proof-workflow scoped');
assert(/PROOF_RUN_ID: \$\{\{ github\.event\.workflow_run\.id \}\}/.test(workflow));
assert(/PROOF_TARGET_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/.test(workflow));
assert(/node \.github\/plugin-control-plane\/canonical-main\/orchestrator\/closure-bookkeeping\.cjs/.test(workflow));
assert(/issues:\s*write/.test(workflow), 'existing issue-write permission remains the mutation authority');
assert(!/contents:\s*write/.test(workflow), 'A2 must not add contents write authority');
assert(!/pull-requests:\s*write/.test(workflow), 'A2 must not add PR write authority');
assert(
  pluginManifest.checks.some((check) => check.name === 'closure-bookkeeping-contract' && check.command.includes('.github/plugin-control-plane/canonical-main/tests/closure-bookkeeping-contract.cjs')),
  'focused contract must be permanent Plugin CI',
);

assert(!/git\s+push|force-push|branches\/main\/protection|repos\/\$\{repo\}\/releases/i.test(writer), 'closure writer must not contain main/release/protection mutation paths');
assert(!/--method['",\s]+(?:PUT|DELETE)/i.test(writer), 'closure writer may not add PUT/DELETE mutation methods');
assert(/repos\/\$\{repo\}\/issues\//.test(writer), 'mutation surface must be issue based');

console.log('canonical-main closure-bookkeeping-contract: ok');
