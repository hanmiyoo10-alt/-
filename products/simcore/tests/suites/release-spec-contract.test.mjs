import fs from 'node:fs';
import { assert, equal } from '../../tooling/assertions.mjs';
import { validateRequest } from '../../tooling/candidate-materialize.mjs';
import { deriveReceipt, deriveSpecShadow } from '../../tooling/candidate-receipt.mjs';
import {
  RELEASE_SPEC_ACTIVE_MODES,
  RELEASE_SPEC_ACTIVE_CHANGE_CLASSES,
  contractSnapshot,
} from '../../tooling/release-spec-contract.mjs';
import { resolveApproval } from '../../tooling/release-approval-resolve.mjs';

function expectCode(fn, code) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}`);
}
function requestFor(changeClass = 'RUNTIME_CORRECTION', mode = 'NEW_VERSION', suffix = '98') {
  const modeSuffix = mode === 'ROLLBACK' ? 'rollback' : mode === 'SAME_VERSION_CORRECTION' ? 'correction' : 'new';
  const request = {
    schemaVersion: 1,
    intentId: `simcore-v0.64.8-intent-${suffix}`,
    releaseId: `simcore-v0.64.8-${modeSuffix}-${suffix}`,
    product: 'SimCore',
    targetVersion: '0.64.8',
    releaseName: 'Contract Fixture',
    releaseMode: mode,
    expectedProductionCommit: 'a'.repeat(40),
    builderPath: 'products/simcore/tooling/build-fixture.py',
    verificationSuite: 'batch-a',
    allowedRuntimePaths: ['plugins/simcore/latest.js', 'plugins/simcore/install.js'],
    changeClass,
    primaryGoalId: 'R2_1_CONTRACT_FIXTURE',
    liveGate: { required: true, scenarioId: 'R2_1_CONTRACT_FIXTURE_REAL_LONG_CHAT', closeAuthority: 'HUMAN_EVIDENCE' },
    evidenceRefs: ['docs/fixture.md'],
  };
  if (mode === 'ROLLBACK') {
    request.rollback = { approvedSafeCommit: '2'.repeat(40), approvedSafeBlob: '3'.repeat(40), reasonCode: 'FIXTURE_ROLLBACK' };
  }
  return request;
}
function reportFor(request) {
  return {
    schemaVersion: 1,
    product: 'SimCore',
    intentId: request.intentId,
    targetVersion: request.targetVersion,
    releaseName: request.releaseName,
    releaseMode: request.releaseMode,
    expectedProductionCommit: request.expectedProductionCommit,
    sourceCommit: 'b'.repeat(40),
    candidateCommit: 'c'.repeat(40),
    candidateReleaseBlob: 'd'.repeat(40),
    candidateFetchRef: `candidate/simcore/${request.intentId}`,
    candidateDisposition: 'CREATED',
    builderPath: request.builderPath,
    builderSha256: 'e'.repeat(64),
    verificationSuite: request.verificationSuite,
    changedPaths: request.allowedRuntimePaths,
    productionMutation: 'NONE',
    releaseAuthority: 'CANDIDATE_TRANSPORT_ONLY',
    result: 'PASS',
  };
}
function receiptFor(request) {
  return deriveReceipt(request, reportFor(request), 'f'.repeat(40), '1'.repeat(64));
}
function resolveFrom(request, receipt, shadow) {
  const approvalPath = `products/simcore/releases/approvals/${request.releaseId}.json`;
  const receiptPath = `products/simcore/releases/candidate-receipts/${request.intentId}.json`;
  const shadowPath = `products/simcore/releases/spec-shadows/${request.releaseId}.json`;
  const approval = { schemaVersion: 1, releaseId: request.releaseId, candidateReceiptPath: receiptPath, authorityConfirmation: 'RS2_4_RELEASE' };
  return resolveApproval({
    approval,
    approvalPath,
    candidateReceipt: receipt,
    candidateReceiptPath: receiptPath,
    specShadow: shadow,
    specShadowPath: shadowPath,
    observedCandidateCommit: receipt.candidateCommit,
    observedProductionCommit: receipt.expectedProductionCommit,
  });
}

export async function runSuite() {
  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  const schema = JSON.parse(fs.readFileSync('products/simcore/releases/release-schema-v1.json', 'utf8'));
  const snapshot = contractSnapshot();
  equal(snapshot.schemaId, schema.$id, 'contract schema id');
  equal(JSON.stringify([...RELEASE_SPEC_ACTIVE_MODES].sort()), JSON.stringify(schema.properties.releaseMode.enum.filter((v) => v !== 'NOOP_IDENTICAL').sort()), 'active modes derive from schema');
  equal(JSON.stringify([...RELEASE_SPEC_ACTIVE_CHANGE_CLASSES].sort()), JSON.stringify(schema.properties.changeClass.enum.filter((v) => v !== 'NOOP').sort()), 'active change classes derive from schema');
  equal(snapshot.evidencePattern, schema.properties.evidenceRefs.items.pattern, 'evidence pattern derives from schema');
  pass('R2.1-contract-schema-derived-vocabulary');

  validateRequest(requestFor('RUNTIME_CORRECTION'));
  pass('R2.1-candidate-valid-runtime-correction');
  expectCode(() => validateRequest(requestFor('RUNTIME_CORRECTNESS_REPAIR')), 'CANDIDATE_REQUEST_CHANGE_CLASS_INVALID');
  pass('R2.1-candidate-invalid-change-class-fail-fast');
  const invalidEvidence = requestFor('RUNTIME_CORRECTION');
  invalidEvidence.evidenceRefs = ['issue:#623'];
  expectCode(() => validateRequest(invalidEvidence), 'CANDIDATE_REQUEST_EVIDENCE_INVALID');
  pass('R2.1-candidate-invalid-evidence-fail-fast');

  const valid = requestFor('RUNTIME_CORRECTION');
  const receipt = receiptFor(valid);
  const shadow = deriveSpecShadow(valid, receipt);
  equal(shadow.derivedSpec.changeClass, 'RUNTIME_CORRECTION', 'valid correction preserved');
  pass('R2.1-shadow-valid-runtime-correction');

  const badClass = requestFor('RUNTIME_CORRECTNESS_REPAIR');
  expectCode(() => deriveSpecShadow(badClass, receiptFor(badClass)), 'SPEC_SHADOW_CHANGE_CLASS_INVALID');
  pass('R2.1-shadow-invalid-change-class-defense');
  const badEvidence = requestFor('RUNTIME_CORRECTION');
  badEvidence.evidenceRefs = ['issue:#623'];
  expectCode(() => deriveSpecShadow(badEvidence, receiptFor(badEvidence)), 'SPEC_SHADOW_EVIDENCE_INVALID');
  pass('R2.1-shadow-invalid-evidence-defense');

  let index = 90;
  for (const changeClass of RELEASE_SPEC_ACTIVE_CHANGE_CLASSES) {
    const mode = changeClass === 'ROLLBACK' ? 'ROLLBACK' : 'NEW_VERSION';
    const req = requestFor(changeClass, mode, String(index++));
    validateRequest(req);
    const rec = receiptFor(req);
    const specShadow = deriveSpecShadow(req, rec);
    const resolved = resolveFrom(req, rec, specShadow);
    equal(resolved.result, 'PASS', `resolver alignment ${changeClass}`);
  }
  pass('R2.1-active-contract-resolver-alignment');

  const materializeEntry = fs.readFileSync('products/simcore/tooling/candidate-materialize.mjs', 'utf8');
  const receiptEntry = fs.readFileSync('products/simcore/tooling/candidate-receipt.mjs', 'utf8');
  assert(materializeEntry.includes('candidate-materialize-core.mjs'), 'materialize core delegation missing');
  assert(receiptEntry.includes('candidate-receipt-core.mjs'), 'receipt core delegation missing');
  for (const text of [materializeEntry, receiptEntry]) {
    for (const token of ['release-publish.mjs', 'repo-main-write.py', 'git push --force', 'force-with-lease']) {
      assert(!text.includes(token), `contract guard gained publication primitive: ${token}`);
    }
  }
  pass('R2.1-contract-guard-no-publication-authority');

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
