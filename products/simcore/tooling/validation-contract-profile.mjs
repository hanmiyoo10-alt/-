export const VALIDATION_CONTRACT_MODES = Object.freeze({
  INHERIT_BEHAVIOR: 'INHERIT_BEHAVIOR',
  CURRENT_IDENTITY_INHERIT_BEHAVIOR: 'CURRENT_IDENTITY_INHERIT_BEHAVIOR',
  EXACT_CURRENT_IDENTITY: 'EXACT_CURRENT_IDENTITY',
  CHANGED_CONTRACT: 'CHANGED_CONTRACT',
});

const MODE_SET = new Set(Object.values(VALIDATION_CONTRACT_MODES));
const VERSION_RE = /^\d+\.\d+\.\d+$/;

function profileError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertVersion(value, field) {
  if (typeof value !== 'string' || !VERSION_RE.test(value)) {
    throw profileError('VALIDATION_PROFILE_VERSION_INVALID', `${field} must be an exact semantic version`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function validateValidationProfile(profile, { requiredContracts = [] } = {}) {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    throw profileError('VALIDATION_PROFILE_INVALID', 'profile must be an object');
  }
  if (profile.schemaVersion !== 1) {
    throw profileError('VALIDATION_PROFILE_SCHEMA_UNSUPPORTED', 'schemaVersion must equal 1');
  }
  assertVersion(profile.releaseVersion, 'releaseVersion');
  if (typeof profile.releaseName !== 'string' || !profile.releaseName.trim()) {
    throw profileError('VALIDATION_PROFILE_IDENTITY_INVALID', 'releaseName is required');
  }
  if (!profile.contracts || typeof profile.contracts !== 'object' || Array.isArray(profile.contracts)) {
    throw profileError('VALIDATION_PROFILE_CONTRACTS_INVALID', 'contracts must be an object');
  }

  const required = [...new Set(requiredContracts)].sort();
  for (const contractId of required) {
    if (!Object.prototype.hasOwnProperty.call(profile.contracts, contractId)) {
      throw profileError('VALIDATION_PROFILE_CONTRACT_MISSING', `required contract missing: ${contractId}`);
    }
  }

  for (const [contractId, contract] of Object.entries(profile.contracts)) {
    if (!contractId || !contract || typeof contract !== 'object' || Array.isArray(contract)) {
      throw profileError('VALIDATION_PROFILE_CONTRACT_INVALID', `invalid contract: ${contractId || '<empty>'}`);
    }
    if (!MODE_SET.has(contract.mode)) {
      throw profileError('VALIDATION_PROFILE_MODE_INVALID', `${contractId} mode is not explicit`);
    }
    assertVersion(contract.authorityVersion, `${contractId}.authorityVersion`);

    const inherits = contract.mode === VALIDATION_CONTRACT_MODES.INHERIT_BEHAVIOR
      || contract.mode === VALIDATION_CONTRACT_MODES.CURRENT_IDENTITY_INHERIT_BEHAVIOR;
    const exactCurrent = contract.mode === VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY
      || contract.mode === VALIDATION_CONTRACT_MODES.CHANGED_CONTRACT;

    if (inherits && contract.authorityVersion === profile.releaseVersion) {
      throw profileError('VALIDATION_PROFILE_INHERITANCE_SELF_REFERENCE', `${contractId} inheritance must name a predecessor authority`);
    }
    if (exactCurrent && contract.authorityVersion !== profile.releaseVersion) {
      throw profileError('VALIDATION_PROFILE_EXACT_IDENTITY_CONTRADICTION', `${contractId} exact current authority must equal releaseVersion`);
    }

    if (contract.mode === VALIDATION_CONTRACT_MODES.CURRENT_IDENTITY_INHERIT_BEHAVIOR) {
      if (!contract.authorityIdentity || typeof contract.authorityIdentity.releaseName !== 'string' || !contract.authorityIdentity.releaseName.trim()) {
        throw profileError('VALIDATION_PROFILE_AUTHORITY_IDENTITY_MISSING', `${contractId} authorityIdentity.releaseName is required`);
      }
    }

    if (contract.rejectVersions !== undefined) {
      if (!Array.isArray(contract.rejectVersions)) {
        throw profileError('VALIDATION_PROFILE_REJECT_VERSIONS_INVALID', `${contractId} rejectVersions must be an array`);
      }
      const seen = new Set();
      for (const version of contract.rejectVersions) {
        assertVersion(version, `${contractId}.rejectVersions`);
        if (version === profile.releaseVersion) {
          throw profileError('VALIDATION_PROFILE_REJECT_CURRENT_IDENTITY', `${contractId} cannot reject current releaseVersion`);
        }
        if (seen.has(version)) {
          throw profileError('VALIDATION_PROFILE_REJECT_VERSION_DUPLICATE', `${contractId} duplicate reject version: ${version}`);
        }
        seen.add(version);
      }
    }
  }

  return clone(profile);
}

export function resolveValidationContract(profile, contractId, options = {}) {
  const validated = validateValidationProfile(profile, options);
  const contract = validated.contracts[contractId];
  if (!contract) throw profileError('VALIDATION_PROFILE_CONTRACT_MISSING', `contract missing: ${contractId}`);
  return {
    contractId,
    releaseVersion: validated.releaseVersion,
    releaseName: validated.releaseName,
    ...clone(contract),
  };
}

export function extractSourceReleaseVersion(source) {
  return String(source || '').match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
}

export function assertProfileBindsSource(profile, source) {
  const validated = validateValidationProfile(profile);
  const sourceVersion = extractSourceReleaseVersion(source);
  if (sourceVersion !== validated.releaseVersion) {
    throw profileError('VALIDATION_PROFILE_SOURCE_IDENTITY_MISMATCH', `profile ${validated.releaseVersion} does not bind source ${sourceVersion || '<missing>'}`);
  }
  return validated;
}

export function normalizeMetadataVersion(source, fromVersion, toVersion) {
  const needle = `//@version ${fromVersion}`;
  const replacement = `//@version ${toVersion}`;
  const text = String(source || '');
  const count = text.split(needle).length - 1;
  if (count !== 1) throw profileError('VALIDATION_PROFILE_METADATA_NORMALIZATION_AMBIGUOUS', `expected exactly one metadata version ${fromVersion}, found ${count}`);
  return text.replace(needle, replacement);
}
