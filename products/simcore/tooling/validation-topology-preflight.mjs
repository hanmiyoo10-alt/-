import { VALIDATION_CONTRACT_MODES, validateValidationProfile } from './validation-contract-profile.mjs';

function blocked(reasonCode, findings, extra = {}) {
  return { status: 'BLOCK', reasonCode, findings, ...extra };
}

export function preflightValidationTopology({
  profile,
  requiredContracts = [],
  authorityCapabilities = {},
  builderClosure = null,
  registryRows = [],
  availableModules = [],
  availableFixtureDirs = [],
} = {}) {
  let validated;
  try {
    validated = validateValidationProfile(profile, { requiredContracts });
  } catch (error) {
    return blocked(error?.code || 'BLOCK_PROFILE_INVALID', [String(error?.message || error)]);
  }

  const findings = [];
  for (const contractId of requiredContracts) {
    const contract = validated.contracts[contractId];
    const capability = authorityCapabilities[contractId];
    if (!capability) {
      findings.push(`authority capability missing: ${contractId}`);
      continue;
    }

    const exactCurrent = contract.mode === VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY
      || contract.mode === VALIDATION_CONTRACT_MODES.CHANGED_CONTRACT;
    if (exactCurrent) {
      if (capability.exactCurrent !== true) findings.push(`exact-current runner missing: ${contractId}`);
    } else {
      const versions = new Set(capability.versions || []);
      if (!versions.has(contract.authorityVersion)) {
        findings.push(`authority ${contract.authorityVersion} unresolved: ${contractId}`);
      }
    }
  }
  if (findings.length) return blocked('BLOCK_AUTHORITY_UNRESOLVED', findings);

  if (!builderClosure || builderClosure.status !== 'PASS') {
    return blocked('BLOCK_FIXTURE_GAP', [
      ...(builderClosure?.suiteOnly || []).map((x) => `builder suite missing fixture: ${x}`),
      ...(builderClosure?.fixtureOnly || []).map((x) => `builder fixture missing suite: ${x}`),
      ...(!builderClosure ? ['builder closure missing'] : []),
    ]);
  }

  const moduleSet = new Set(availableModules);
  const fixtureSet = new Set(availableFixtureDirs);
  const dangling = [];
  for (const row of registryRows) {
    if (!row?.id || !row?.module || !row?.fixtureDir) {
      dangling.push(`registry row incomplete: ${row?.id || '<missing>'}`);
      continue;
    }
    if (!moduleSet.has(row.module)) dangling.push(`registry module missing: ${row.id} -> ${row.module}`);
    if (!fixtureSet.has(row.fixtureDir)) dangling.push(`registry fixture missing: ${row.id} -> ${row.fixtureDir}`);
  }
  if (dangling.length) return blocked('BLOCK_REGISTRY_DANGLING', dangling);

  return {
    status: 'PASS',
    reasonCode: null,
    findings: [],
    releaseVersion: validated.releaseVersion,
    contractCount: requiredContracts.length,
    projectedBuilderRows: builderClosure.rows,
  };
}
