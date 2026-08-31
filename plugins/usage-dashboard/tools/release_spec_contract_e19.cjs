'use strict';

const evidenceContract = require('./release_evidence_contract_e20.cjs');

const PRODUCT_RE = /^3\.0\.0-alpha\.5\.\d+$/;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const WORKFLOW_RE = /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/;
const MATERIALIZER_RE = /^plugins\/usage-dashboard\/tools\/[A-Za-z0-9_.-]+\.py$/;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finding(code, field, detail = '') {
  return Object.freeze({code, field, detail:String(detail || '')});
}

function inspectBoundedTextArray(findings, spec, key) {
  const value = spec[key];
  if (!Array.isArray(value)) {
    findings.push(finding('array-required', key));
    return;
  }
  if (value.length < 1 || value.length > 5) findings.push(finding('array-count', key, String(value.length)));
  value.forEach((item, index) => {
    if (typeof item !== 'string' || !item.trim()) findings.push(finding('text-required', `${key}[${index}]`));
    else if (item.length > 160) findings.push(finding('text-too-long', `${key}[${index}]`, String(item.length)));
  });
}

function isForwardSpec(spec, currentProductVersion) {
  if (!PRODUCT_RE.test(String(spec?.productVersion || '')) || !PRODUCT_RE.test(String(currentProductVersion || ''))) return false;
  return evidenceContract.compareProductVersions(spec.productVersion, currentProductVersion) > 0;
}

function inspectReleaseSpec(spec, options = {}) {
  const findings = [];
  if (!isObject(spec)) return [finding('object-required', '$')];

  const requiredStrings = [
    'product', 'productVersion', 'releaseTitle', 'engineVersion', 'managerVersion',
    'materializer', 'callerWorkflow', 'sharedWorkflow', 'validatorWorkflow', 'publisherWorkflow',
  ];
  for (const key of requiredStrings) {
    if (typeof spec[key] !== 'string' || !spec[key].trim()) findings.push(finding('string-required', key));
  }

  if (typeof spec.productVersion === 'string' && !PRODUCT_RE.test(spec.productVersion)) findings.push(finding('product-version-format', 'productVersion', spec.productVersion));
  for (const key of ['engineVersion','managerVersion']) {
    if (typeof spec[key] === 'string' && !SEMVER_RE.test(spec[key])) findings.push(finding('semver-format', key, spec[key]));
  }

  const structuredEvidence = Object.hasOwn(spec,'releaseEvidence');
  const forward = isForwardSpec(spec, options.currentProductVersion);
  if (structuredEvidence) {
    findings.push(...evidenceContract.inspectReleaseEvidence(spec.releaseEvidence, {targetProductVersion:spec.productVersion}));
    for (const legacyKey of ['verifiedBaseline','latestInstalledEvidence']) {
      if (Object.hasOwn(spec,legacyKey)) findings.push(finding('evidence-legacy-owner', legacyKey));
    }
  } else {
    if (typeof spec.verifiedBaseline !== 'string' || !spec.verifiedBaseline.trim()) findings.push(finding('string-required','verifiedBaseline'));
    findings.push(...evidenceContract.inspectReleaseEvidence(undefined, {required:forward,targetProductVersion:spec.productVersion}));
  }

  for (const key of ['snapshotContract','recentRequestContract']) {
    if (!Number.isInteger(spec[key]) || spec[key] < 1) findings.push(finding('positive-integer-required', key, String(spec[key])));
  }
  if (!isObject(spec.contracts)) findings.push(finding('object-required', 'contracts'));
  else {
    if (spec.contracts.snapshot !== spec.snapshotContract) findings.push(finding('contract-mismatch', 'contracts.snapshot', `${spec.contracts.snapshot}!=${spec.snapshotContract}`));
    if (spec.contracts.recentRequest !== spec.recentRequestContract) findings.push(finding('contract-mismatch', 'contracts.recentRequest', `${spec.contracts.recentRequest}!=${spec.recentRequestContract}`));
  }

  if (typeof spec.materializer === 'string' && !MATERIALIZER_RE.test(spec.materializer)) findings.push(finding('materializer-path', 'materializer', spec.materializer));
  for (const key of ['callerWorkflow','sharedWorkflow','validatorWorkflow','publisherWorkflow']) {
    if (typeof spec[key] === 'string' && !WORKFLOW_RE.test(spec[key])) findings.push(finding('workflow-path', key, spec[key]));
  }

  inspectBoundedTextArray(findings, spec, 'highlights');
  inspectBoundedTextArray(findings, spec, 'diagnosticHints');

  if (Object.hasOwn(spec, 'releaseNotes')) {
    if (!isObject(spec.releaseNotes)) findings.push(finding('object-required', 'releaseNotes'));
    else {
      for (const key of ['highlights','diagnosticHints']) {
        if (!Array.isArray(spec.releaseNotes[key]) || JSON.stringify(spec.releaseNotes[key]) !== JSON.stringify(spec[key])) {
          findings.push(finding('release-notes-mirror-mismatch', `releaseNotes.${key}`));
        }
      }
    }
  }

  if (Object.hasOwn(spec, 'managedCliVersion') || Object.hasOwn(spec, 'managedCliAuthority')) {
    if (typeof spec.managedCliVersion !== 'string' || !SEMVER_RE.test(spec.managedCliVersion)) findings.push(finding('semver-format', 'managedCliVersion', spec.managedCliVersion));
    if (!isObject(spec.managedCliAuthority)) findings.push(finding('object-required', 'managedCliAuthority'));
    else {
      const authority = spec.managedCliAuthority;
      if (authority.schemaVersion !== 1) findings.push(finding('authority-schema', 'managedCliAuthority.schemaVersion', authority.schemaVersion));
      if (authority.package !== '@llmgateway/cli') findings.push(finding('authority-package', 'managedCliAuthority.package', authority.package));
      if (authority.version !== spec.managedCliVersion) findings.push(finding('authority-version', 'managedCliAuthority.version', authority.version));
      if (authority.exact !== true) findings.push(finding('authority-exact', 'managedCliAuthority.exact', authority.exact));
      if (typeof authority.tagCommit !== 'string' || !/^[0-9a-f]{40}$/.test(authority.tagCommit)) findings.push(finding('authority-sha', 'managedCliAuthority.tagCommit', authority.tagCommit));
    }
  }

  if (Object.hasOwn(spec, 'managedModelCatalogVersion') || Object.hasOwn(spec, 'managedModelCatalogAuthority')) {
    if (typeof spec.managedModelCatalogVersion !== 'string' || !SEMVER_RE.test(spec.managedModelCatalogVersion)) findings.push(finding('semver-format', 'managedModelCatalogVersion', spec.managedModelCatalogVersion));
    if (!isObject(spec.managedModelCatalogAuthority)) findings.push(finding('object-required', 'managedModelCatalogAuthority'));
    else {
      const authority = spec.managedModelCatalogAuthority;
      if (authority.package !== '@llmgateway/models') findings.push(finding('authority-package', 'managedModelCatalogAuthority.package', authority.package));
      if (authority.version !== spec.managedModelCatalogVersion) findings.push(finding('authority-version', 'managedModelCatalogAuthority.version', authority.version));
      if (authority.exact !== true) findings.push(finding('authority-exact', 'managedModelCatalogAuthority.exact', authority.exact));
    }
  }

  return findings;
}

function summarizeFindings(findings, limit = 12) {
  const rows = findings.slice(0, limit).map((row) => `${row.code}@${row.field}${row.detail ? `=${row.detail}` : ''}`);
  if (findings.length > limit) rows.push(`+${findings.length - limit}-more`);
  return rows.join(',');
}

function assertReleaseSpec(spec, label = 'release spec', options = {}) {
  const findings = inspectReleaseSpec(spec, options);
  if (findings.length) {
    const error = new Error(`${label} rejected: ${summarizeFindings(findings)}`);
    error.code = 'RELEASE_SPEC_CONTRACT_REJECTED';
    error.findings = findings;
    throw error;
  }
  return spec;
}

module.exports = {
  PRODUCT_RE,
  SEMVER_RE,
  WORKFLOW_RE,
  MATERIALIZER_RE,
  isForwardSpec,
  inspectReleaseSpec,
  summarizeFindings,
  assertReleaseSpec,
};
