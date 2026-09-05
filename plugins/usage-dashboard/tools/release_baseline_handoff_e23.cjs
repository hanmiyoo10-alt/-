'use strict';

const evidenceContract = require('./release_evidence_contract_e20.cjs');
const versionOrder = require('./release_version_order.cjs');

const SHA_RE = /^[0-9a-f]{40}$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(freeze));
  if (!isObject(value)) return value;
  const out = {};
  for (const [key,item] of Object.entries(value)) out[key] = freeze(item);
  return Object.freeze(out);
}

function finding(code, detail = '') {
  return Object.freeze({code, detail:String(detail || '')});
}

function inspectAcceptedIdentity(identity) {
  const findings = [];
  if (!isObject(identity)) {
    findings.push(finding('E23_ACCEPTED_BASELINE_MISSING'));
    return findings;
  }
  if (!versionOrder.parseReleaseVersion(identity.productVersion)) findings.push(finding('E23_ACCEPTED_IDENTITY_INCOMPLETE','productVersion'));
  if (!SHA_RE.test(String(identity.releaseSha || ''))) findings.push(finding('E23_ACCEPTED_IDENTITY_INCOMPLETE','releaseSha'));
  if (!Number.isSafeInteger(identity.issue) || identity.issue < 1) findings.push(finding('E23_ACCEPTED_IDENTITY_INCOMPLETE','issue'));
  if (!Number.isSafeInteger(identity.commentId) || identity.commentId < 1) findings.push(finding('E23_ACCEPTED_IDENTITY_INCOMPLETE','commentId'));
  if (identity.verdict !== 'ACCEPTED') findings.push(finding('E23_ACCEPTED_IDENTITY_INCOMPLETE','verdict'));
  return findings;
}

function normalizeAcceptedIdentity(identity) {
  return freeze({
    productVersion:String(identity.productVersion),
    releaseSha:String(identity.releaseSha),
    issue:Number(identity.issue),
    commentId:Number(identity.commentId),
    verdict:'ACCEPTED',
  });
}

function resolveAcceptedBaselineHandoff(e22Resolution, options = {}) {
  const findings = [];
  if (!isObject(e22Resolution)) {
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, findings:[finding('E23_ACCEPTED_BASELINE_MISSING','e22-resolution')]});
  }

  const upstreamFindings = Array.isArray(e22Resolution.findings) ? e22Resolution.findings : [];
  if (upstreamFindings.some((row) => row?.code === 'E22_ACCEPTED_BASELINE_AMBIGUOUS')) {
    findings.push(finding('E23_ACCEPTED_ORDER_AMBIGUOUS','E22_ACCEPTED_BASELINE_AMBIGUOUS'));
  }

  const identity = e22Resolution.latestAcceptedIdentity;
  findings.push(...inspectAcceptedIdentity(identity));
  if (findings.length) return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, findings});

  const acceptedIdentity = normalizeAcceptedIdentity(identity);
  const latestDeployed = e22Resolution.latestDeployedIdentity;
  if (isObject(latestDeployed) && latestDeployed.productVersion === acceptedIdentity.productVersion && latestDeployed.releaseSha && latestDeployed.releaseSha !== acceptedIdentity.releaseSha) {
    findings.push(finding('E23_ACCEPTED_IDENTITY_CONFLICT',`${acceptedIdentity.productVersion}:${acceptedIdentity.releaseSha}!=${latestDeployed.releaseSha}`));
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, findings});
  }

  const targetProductVersion = String(options.targetProductVersion || '');
  if (targetProductVersion && !versionOrder.parseReleaseVersion(targetProductVersion)) {
    findings.push(finding('E23_RELEASE_EVIDENCE_MISMATCH','targetProductVersion'));
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, findings});
  }

  const acceptedNote = `E23 handoff from exact E22 physical acceptance receipt ${acceptedIdentity.commentId}.`;
  const latestNote = 'Same exact physically accepted installed baseline; newer deployments do not displace it until accepted.';
  const roleBase = {
    productVersion:acceptedIdentity.productVersion,
    releaseSha:acceptedIdentity.releaseSha,
    verdict:'accepted',
    issue:acceptedIdentity.issue,
    commentId:acceptedIdentity.commentId,
  };
  const releaseEvidence = freeze({
    schemaVersion:1,
    acceptedBaseline:{...roleBase,note:acceptedNote},
    latestInstalled:{...roleBase,note:latestNote},
  });

  const contractFindings = evidenceContract.inspectReleaseEvidence(releaseEvidence, targetProductVersion ? {targetProductVersion} : {});
  if (contractFindings.length) {
    for (const row of contractFindings) findings.push(finding('E23_RELEASE_EVIDENCE_MISMATCH',`${row.code}@${row.field}`));
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, findings});
  }

  return freeze({ok:true, releaseEvidence, acceptedIdentity, findings:[]});
}

function inspectReleaseEvidenceHandoff(actualEvidence, e22Resolution, options = {}) {
  const derived = resolveAcceptedBaselineHandoff(e22Resolution, options);
  if (!derived.ok) return derived.findings;
  const actual = JSON.stringify(actualEvidence);
  const expected = JSON.stringify(derived.releaseEvidence);
  if (actual !== expected) return freeze([finding('E23_RELEASE_EVIDENCE_MISMATCH','derived-handoff')]);
  return freeze([]);
}

module.exports = {
  SHA_RE,
  inspectAcceptedIdentity,
  resolveAcceptedBaselineHandoff,
  inspectReleaseEvidenceHandoff,
};
