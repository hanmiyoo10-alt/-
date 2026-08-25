#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  auditAuthorityState,
  parseCurrentOperationalGate,
  parseOperatorAuthority,
} from './authority-drift-check.mjs';

const CURRENT = `# SimCore Current Development Memory

# 1. Current Operational State

## Production verdict

The runtime is frozen at v0.64.7 while the required real long-chat scenario \`06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT\` is pending. Do not begin another runtime release.

R2.1 delegated operation is implemented, permanent-CI qualified, and active as policy, but remains \`ACTIVE · AWAITING GENUINE RELEASE PROOF\`; that operational proof belongs to the next genuine runtime release.

# 2. Historical Validation Release Ledger
`;

const POLICY = `# Policy
Status: **ACTIVE POLICY · IMPLEMENTED · PERMANENT-CI QUALIFIED · AWAITING GENUINE RELEASE PROOF · NON-RUNTIME**

This is **not** standing authority for autonomous or background releases.
`;

const EVIDENCE = `# Evidence
Status: **CLOSED · DELEGATED OPERATOR POLICY ACTIVE · AWAITING GENUINE RELEASE PROOF · NON-RUNTIME**

\`\`\`text
standing/background release authority = NO
\`\`\`
`;

const CLEAN_SYNC = {
  schemaVersion: 1,
  tool: 'sync-state',
  result: 'CHECK_CLEAN',
  findings: [],
};

const MANIFEST = {
  current_priority: '06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT',
};

assert.deepEqual(parseCurrentOperationalGate(CURRENT), {
  status: 'OK',
  code: null,
  token: '06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT',
});

assert.deepEqual(parseOperatorAuthority(POLICY, EVIDENCE), {
  status: 'OK',
  active: true,
  proof: 'PENDING',
  backgroundReleaseAuthority: false,
});

const clean = auditAuthorityState({
  syncReport: CLEAN_SYNC,
  manifest: MANIFEST,
  currentDevelopment: CURRENT,
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(clean.result, 'AUTHORITY_CLEAN');
assert.deepEqual(clean.families, {
  productionIdentity: 'CLEAN',
  currentOperationalGate: 'CLEAN',
  currentProductionClaims: 'CLEAN',
  r2_1OperatorStatus: 'CLEAN',
});

const priorityDrift = auditAuthorityState({
  syncReport: CLEAN_SYNC,
  manifest: { current_priority: 'OTHER_GATE' },
  currentDevelopment: CURRENT,
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(priorityDrift.result, 'AUTHORITY_DRIFT');
assert.equal(priorityDrift.families.currentOperationalGate, 'DRIFT');
assert(priorityDrift.findings.some((x) => x.code === 'CURRENT_PRIORITY_DRIFT'));

const unresolved = auditAuthorityState({
  syncReport: CLEAN_SYNC,
  manifest: MANIFEST,
  currentDevelopment: CURRENT.replace('required real long-chat scenario', 'required validation scenario'),
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(unresolved.result, 'AUTHORITY_BLOCKED');
assert.equal(unresolved.families.currentOperationalGate, 'BLOCKED');
assert(unresolved.findings.some((x) => x.code === 'CURRENT_PRIORITY_UNRESOLVED'));

const r21Inactive = auditAuthorityState({
  syncReport: CLEAN_SYNC,
  manifest: MANIFEST,
  currentDevelopment: CURRENT.replace('active as policy', 'INACTIVE'),
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(r21Inactive.result, 'AUTHORITY_DRIFT');
assert(r21Inactive.findings.some((x) => x.code === 'R2_1_POLICY_STATUS_DRIFT'));

const r21ProvenTooEarly = auditAuthorityState({
  syncReport: CLEAN_SYNC,
  manifest: MANIFEST,
  currentDevelopment: CURRENT.replace('ACTIVE · AWAITING GENUINE RELEASE PROOF', 'ACTIVE · GENUINE RELEASE PROOF = PROVEN'),
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(r21ProvenTooEarly.result, 'AUTHORITY_DRIFT');
assert(r21ProvenTooEarly.findings.some((x) => x.code === 'R2_1_PROOF_STATUS_DRIFT'));

const r21Background = auditAuthorityState({
  syncReport: CLEAN_SYNC,
  manifest: MANIFEST,
  currentDevelopment: CURRENT.replace('that operational proof belongs', 'background release authority = YES; that operational proof belongs'),
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(r21Background.result, 'AUTHORITY_DRIFT');
assert(r21Background.findings.some((x) => x.code === 'R2_1_AUTHORITY_SCOPE_DRIFT'));

const humanClaim = auditAuthorityState({
  syncReport: {
    schemaVersion: 1,
    tool: 'sync-state',
    result: 'CHECK_CLEAN_WITH_OBSERVATIONS',
    findings: [{ code: 'HUMAN_CURRENT_PRODUCTION_CLAIM_STALE', severity: 'OBSERVATION', path: 'docs/CURRENT_DEVELOPMENT.md' }],
  },
  manifest: MANIFEST,
  currentDevelopment: CURRENT,
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(humanClaim.result, 'AUTHORITY_DRIFT');
assert.equal(humanClaim.families.currentProductionClaims, 'DRIFT');

const blockedSync = auditAuthorityState({
  syncReport: {
    schemaVersion: 1,
    tool: 'sync-state',
    result: 'CHECK_BLOCKED',
    findings: [{ code: 'LATEST_INSTALL_DIVERGED', severity: 'BLOCKER' }],
  },
  manifest: MANIFEST,
  currentDevelopment: CURRENT,
  operatorPolicy: POLICY,
  operatorEvidence: EVIDENCE,
});
assert.equal(blockedSync.result, 'AUTHORITY_BLOCKED');
assert.equal(blockedSync.families.productionIdentity, 'BLOCKED');

console.log('authority-drift-check tests: PASS');
