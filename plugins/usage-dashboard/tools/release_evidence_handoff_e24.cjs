'use strict';

const requestE9 = require('./release_request_e9.cjs');
const e22 = require('./release_closure_e22.cjs');
const e23 = require('./release_baseline_handoff_e23.cjs');

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

function normalizeRequestBundle(bundle) {
  if (!isObject(bundle) || !isObject(bundle.issue)) {
    return {ok:false, finding:finding('E24_EVIDENCE_BUNDLE_INCOMPLETE','issue')};
  }
  const issueNumber = Number(bundle.issue.number);
  if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) {
    return {ok:false, finding:finding('E24_DURABLE_REQUEST_INVALID','issue-number')};
  }
  if (!Array.isArray(bundle.comments)) {
    return {ok:false, finding:finding('E24_EVIDENCE_BUNDLE_INCOMPLETE',`comments:${issueNumber}`)};
  }

  let parsed;
  try {
    parsed = requestE9.parseIssue(bundle.issue.title, bundle.issue.body);
  } catch (error) {
    return {ok:false, finding:finding('E24_DURABLE_REQUEST_INVALID',`${issueNumber}:${error?.message || error}`)};
  }

  if (parsed.prNumber !== null) {
    if (!isObject(bundle.pr)) return {ok:false, finding:finding('E24_EVIDENCE_BUNDLE_INCOMPLETE',`pr:${issueNumber}`)};
    if (Number(bundle.pr.number) !== parsed.prNumber) {
      return {ok:false, finding:finding('E24_DURABLE_REQUEST_INVALID',`pr-number:${issueNumber}:${parsed.prNumber}!=${bundle.pr.number}`)};
    }
  } else if (isObject(bundle.pr)) {
    return {ok:false, finding:finding('E24_DURABLE_REQUEST_INVALID',`pr-number-missing:${issueNumber}`)};
  }

  return {
    ok:true,
    parsed,
    issueNumber,
    input:{
      request:{
        issueNumber,
        releaseVersion:parsed.releaseVersion,
        prNumber:parsed.prNumber,
      },
      comments:bundle.comments,
      pr:bundle.pr || null,
      productionSha:String(bundle.productionSha || ''),
      productionManifest:isObject(bundle.productionManifest) ? bundle.productionManifest : null,
      releaseSpecIdentity:isObject(bundle.releaseSpecIdentity) ? bundle.releaseSpecIdentity : null,
    },
  };
}

function inspectEnumeration(enumeration, releases) {
  const findings = [];
  if (!isObject(enumeration) || enumeration.complete !== true) {
    findings.push(finding('E24_EVIDENCE_ENUMERATION_INCOMPLETE','complete'));
    return findings;
  }
  const count = Number(enumeration.durableRequestCount);
  if (!Number.isSafeInteger(count) || count < 1 || count !== releases.length) {
    findings.push(finding('E24_EVIDENCE_ENUMERATION_INCOMPLETE',`count:${enumeration.durableRequestCount}!=${releases.length}`));
  }
  if (!String(enumeration.repository || '').trim()) {
    findings.push(finding('E24_EVIDENCE_ENUMERATION_INCOMPLETE','repository'));
  }
  return findings;
}

function resolveReleaseEvidenceHandoff(input = {}) {
  const releases = Array.isArray(input.releases) ? input.releases : [];
  const findings = inspectEnumeration(input.enumeration, releases);
  const normalized = [];
  const issueNumbers = new Set();
  const versions = new Set();

  for (const bundle of releases) {
    const row = normalizeRequestBundle(bundle);
    if (!row.ok) {
      findings.push(row.finding);
      continue;
    }
    if (issueNumbers.has(row.issueNumber)) findings.push(finding('E24_DURABLE_REQUEST_INVALID',`duplicate-issue:${row.issueNumber}`));
    if (versions.has(row.parsed.releaseVersion)) findings.push(finding('E24_DURABLE_REQUEST_INVALID',`duplicate-release:${row.parsed.releaseVersion}`));
    issueNumbers.add(row.issueNumber);
    versions.add(row.parsed.releaseVersion);
    normalized.push(row);
  }

  if (findings.length) {
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, resolution:null, projections:[], findings});
  }

  normalized.sort((a,b) => a.issueNumber - b.issueNumber || a.parsed.releaseVersion.localeCompare(b.parsed.releaseVersion));
  const projections = normalized.map((row) => e22.projectReleaseClosure(row.input));
  for (const projection of projections) {
    for (const row of Array.isArray(projection.findings) ? projection.findings : []) findings.push(row);
  }
  if (findings.length) {
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, resolution:null, projections, findings});
  }

  const resolution = e22.resolveLatestAccepted(projections);
  for (const row of Array.isArray(resolution.findings) ? resolution.findings : []) findings.push(row);
  if (findings.length) {
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, resolution, projections, findings});
  }

  const targetProductVersion = String(input.targetProductVersion || '');
  if (!targetProductVersion) {
    findings.push(finding('E24_HANDOFF_COMPOSITION_FAILED','target-product-version'));
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, resolution, projections, findings});
  }
  const handoff = e23.resolveAcceptedBaselineHandoff(resolution,{targetProductVersion});
  if (!handoff.ok) {
    return freeze({ok:false, releaseEvidence:null, acceptedIdentity:null, resolution, projections, findings:handoff.findings});
  }

  return freeze({
    ok:true,
    releaseEvidence:handoff.releaseEvidence,
    acceptedIdentity:handoff.acceptedIdentity,
    resolution,
    projections,
    findings:[],
  });
}

function inspectReleaseEvidenceHandoff(actualEvidence, input = {}) {
  const composed = resolveReleaseEvidenceHandoff(input);
  if (!composed.ok) return composed.findings;
  return e23.inspectReleaseEvidenceHandoff(actualEvidence,composed.resolution,{targetProductVersion:String(input.targetProductVersion || '')});
}

module.exports = {
  normalizeRequestBundle,
  inspectEnumeration,
  resolveReleaseEvidenceHandoff,
  inspectReleaseEvidenceHandoff,
};
