'use strict';

const evidenceContract = require('./release_evidence_contract_e20.cjs');

function cloneRole(role) {
  if (!role || typeof role !== 'object' || Array.isArray(role)) return null;
  const copy = {
    productVersion:String(role.productVersion || ''),
    releaseSha:String(role.releaseSha || ''),
    verdict:String(role.verdict || ''),
    issue:Number(role.issue),
  };
  if (Object.hasOwn(role, 'commentId')) copy.commentId = Number(role.commentId);
  if (Object.hasOwn(role, 'note')) copy.note = String(role.note);
  return Object.freeze(copy);
}

function resolveReleaseEvidenceView(spec) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
    const error = new Error('release evidence view requires a release spec object');
    error.code = 'RELEASE_EVIDENCE_VIEW_REJECTED';
    throw error;
  }

  if (Object.hasOwn(spec, 'releaseEvidence')) {
    if (Object.hasOwn(spec, 'verifiedBaseline') || Object.hasOwn(spec, 'latestInstalledEvidence')) {
      const error = new Error('structured release evidence cannot share ownership with legacy evidence fields');
      error.code = 'RELEASE_EVIDENCE_VIEW_REJECTED';
      throw error;
    }
    const findings = evidenceContract.inspectReleaseEvidence(spec.releaseEvidence, {targetProductVersion:spec.productVersion});
    if (findings.length) {
      const error = new Error(`structured release evidence rejected: ${findings.map((row)=>`${row.code}@${row.field}`).join(',')}`);
      error.code = 'RELEASE_EVIDENCE_VIEW_REJECTED';
      error.findings = findings;
      throw error;
    }
    const display = evidenceContract.formatReleaseEvidence(spec.releaseEvidence);
    return Object.freeze({
      mode:'structured',
      acceptedBaseline:cloneRole(spec.releaseEvidence.acceptedBaseline),
      latestInstalled:cloneRole(spec.releaseEvidence.latestInstalled),
      display:Object.freeze({...display}),
    });
  }

  const acceptedText = typeof spec.verifiedBaseline === 'string' ? spec.verifiedBaseline.trim() : '';
  if (!acceptedText) {
    const error = new Error('legacy release evidence requires verifiedBaseline text');
    error.code = 'RELEASE_EVIDENCE_VIEW_REJECTED';
    throw error;
  }
  const latestText = typeof spec.latestInstalledEvidence === 'string' && spec.latestInstalledEvidence.trim()
    ? spec.latestInstalledEvidence.trim()
    : null;
  return Object.freeze({
    mode:'legacy',
    acceptedBaseline:null,
    latestInstalled:null,
    display:Object.freeze({acceptedBaseline:acceptedText, latestInstalled:latestText}),
  });
}

module.exports = {resolveReleaseEvidenceView};
