'use strict';

const PRODUCT_RE = /^3\.0\.0-alpha\.5\.(\d+)$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const LATEST_VERDICTS = new Set(['accepted','partial','rejected','unverified']);
const NOTE_LIMIT = 240;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finding(code, field, detail = '') {
  return Object.freeze({code, field, detail:String(detail || '')});
}

function productOrdinal(version) {
  const match = PRODUCT_RE.exec(String(version || ''));
  return match ? Number(match[1]) : null;
}

function compareProductVersions(left, right) {
  const a = productOrdinal(left);
  const b = productOrdinal(right);
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return null;
  return Math.sign(a - b);
}

function inspectRole(findings, role, field, acceptedRole = false) {
  if (!isObject(role)) {
    findings.push(finding('release-evidence-role-shape', field));
    return;
  }
  if (!PRODUCT_RE.test(String(role.productVersion || ''))) findings.push(finding('release-evidence-product', `${field}.productVersion`, role.productVersion));
  if (!SHA_RE.test(String(role.releaseSha || ''))) findings.push(finding('evidence-release-sha', `${field}.releaseSha`, role.releaseSha));
  if (!Number.isSafeInteger(role.issue) || role.issue < 1) findings.push(finding('release-evidence-issue', `${field}.issue`, role.issue));
  if (Object.hasOwn(role,'commentId') && (!Number.isSafeInteger(role.commentId) || role.commentId < 1)) findings.push(finding('release-evidence-comment', `${field}.commentId`, role.commentId));
  if (Object.hasOwn(role,'note') && (typeof role.note !== 'string' || !role.note.trim() || role.note.length > NOTE_LIMIT)) findings.push(finding('release-evidence-note', `${field}.note`, typeof role.note === 'string' ? role.note.length : typeof role.note));
  if (acceptedRole) {
    if (role.verdict !== 'accepted') findings.push(finding('accepted-baseline-verdict', `${field}.verdict`, role.verdict));
  } else if (!LATEST_VERDICTS.has(role.verdict)) {
    findings.push(finding('latest-installed-verdict', `${field}.verdict`, role.verdict));
  }
}

function sameIdentity(left, right) {
  return Boolean(left && right && left.productVersion === right.productVersion && left.releaseSha === right.releaseSha);
}

function inspectReleaseEvidence(evidence, options = {}) {
  const findings = [];
  const required = options.required === true;
  const targetProductVersion = String(options.targetProductVersion || '');
  if (evidence === undefined || evidence === null) {
    if (required) findings.push(finding('release-evidence-required','releaseEvidence'));
    return findings;
  }
  if (!isObject(evidence)) return [finding('release-evidence-role-shape','releaseEvidence')];
  if (evidence.schemaVersion !== 1) findings.push(finding('release-evidence-schema','releaseEvidence.schemaVersion',evidence.schemaVersion));

  const accepted = evidence.acceptedBaseline;
  const latest = evidence.latestInstalled;
  inspectRole(findings, accepted, 'releaseEvidence.acceptedBaseline', true);
  inspectRole(findings, latest, 'releaseEvidence.latestInstalled', false);

  if (isObject(accepted) && isObject(latest)) {
    const order = compareProductVersions(latest.productVersion, accepted.productVersion);
    if (order !== null && order < 0) findings.push(finding('evidence-release-order','releaseEvidence.latestInstalled.productVersion',`${latest.productVersion}<${accepted.productVersion}`));

    if (latest.verdict === 'accepted' && !sameIdentity(accepted, latest)) {
      findings.push(finding('accepted-latest-identity-mismatch','releaseEvidence.latestInstalled',`${latest.productVersion}:${latest.releaseSha}!=${accepted.productVersion}:${accepted.releaseSha}`));
    }
    if (sameIdentity(accepted, latest) && latest.verdict !== 'accepted') {
      findings.push(finding('same-release-conflicting-verdict','releaseEvidence.latestInstalled.verdict',latest.verdict));
    }
  }

  if (PRODUCT_RE.test(targetProductVersion)) {
    for (const [name, role] of [['acceptedBaseline',accepted],['latestInstalled',latest]]) {
      if (!isObject(role) || !PRODUCT_RE.test(String(role.productVersion || ''))) continue;
      const order = compareProductVersions(role.productVersion, targetProductVersion);
      if (order !== null && order >= 0) findings.push(finding('evidence-target-order',`releaseEvidence.${name}.productVersion`,`${role.productVersion}>=${targetProductVersion}`));
    }
  }
  return findings;
}

function formatReleaseEvidence(evidence) {
  const findings = inspectReleaseEvidence(evidence);
  if (findings.length) {
    const error = new Error(`release evidence rejected: ${findings.map((row)=>`${row.code}@${row.field}`).join(',')}`);
    error.code = 'RELEASE_EVIDENCE_CONTRACT_REJECTED';
    error.findings = findings;
    throw error;
  }
  const accepted = evidence.acceptedBaseline;
  const latest = evidence.latestInstalled;
  return Object.freeze({
    acceptedBaseline:`Accepted physical baseline: ${accepted.productVersion} · release ${accepted.releaseSha.slice(0,12)} · accepted`,
    latestInstalled:`Latest installed evidence: ${latest.productVersion} · release ${latest.releaseSha.slice(0,12)} · ${latest.verdict}`,
  });
}

module.exports = {
  PRODUCT_RE,
  SHA_RE,
  LATEST_VERDICTS,
  NOTE_LIMIT,
  productOrdinal,
  compareProductVersions,
  inspectReleaseEvidence,
  formatReleaseEvidence,
};
