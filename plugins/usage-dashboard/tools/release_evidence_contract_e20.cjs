'use strict';

const releaseVersion = require('./release_version_order.cjs');

const PRODUCT_RE = releaseVersion.VERSION_RE;
const SHA_RE = /^[0-9a-f]{40}$/;
const LATEST_VERDICTS = new Set(['accepted','partial','rejected','unverified']);
const NOTE_LIMIT = 240;
const EVIDENCE_KEYS = new Set(['schemaVersion','acceptedBaseline','latestInstalled']);
const ROLE_KEYS = new Set(['productVersion','releaseSha','verdict','issue','commentId','note']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finding(code, field, detail = '') {
  return Object.freeze({code, field, detail:String(detail || '')});
}

function productOrdinal(version) {
  const parsed = releaseVersion.parseReleaseVersion(version);
  return parsed && parsed.stage === 0 && parsed.series === 5 ? parsed.iteration : null;
}

function compareProductVersions(left, right) {
  return releaseVersion.compareReleaseVersions(left, right);
}

function inspectUnknownKeys(findings, value, allowed, field, code) {
  if (!isObject(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) findings.push(finding(code, `${field}.${key}`, key));
  }
}

function inspectRole(findings, role, field, acceptedRole = false) {
  if (!isObject(role)) {
    findings.push(finding('release-evidence-role-shape', field));
    return;
  }
  inspectUnknownKeys(findings, role, ROLE_KEYS, field, 'release-evidence-role-key');
  if (!releaseVersion.parseReleaseVersion(role.productVersion)) findings.push(finding('release-evidence-product', `${field}.productVersion`, role.productVersion));
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
  inspectUnknownKeys(findings, evidence, EVIDENCE_KEYS, 'releaseEvidence', 'release-evidence-key');
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

  if (releaseVersion.parseReleaseVersion(targetProductVersion)) {
    for (const [name, role] of [['acceptedBaseline',accepted],['latestInstalled',latest]]) {
      if (!isObject(role) || !releaseVersion.parseReleaseVersion(role.productVersion)) continue;
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
  EVIDENCE_KEYS,
  ROLE_KEYS,
  productOrdinal,
  compareProductVersions,
  inspectReleaseEvidence,
  formatReleaseEvidence,
};
