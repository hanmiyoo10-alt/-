import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BundleLoader } from './bundle-loader.mjs';
import {
  extractSourceReleaseVersion,
  validateValidationProfile,
} from './validation-contract-profile.mjs';

export const R2_10_REQUIRED_CONTRACTS = Object.freeze([
  'reload-cache-continuity',
  'operator-release-card',
  'host-local-telemetry',
  'bounded-telemetry-capsule',
]);

const EXACT_VERSION_RE = /^\d+\.\d+\.\d+$/;
const AUTHORITY_KEYS = new Set([
  'source',
  'sourceVersion',
  'loader',
  'profile',
  'contractId',
  'fixtureOwner',
  'fixtures',
  'provenance',
  'validationAuthorityOverrides',
]);

function contextError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function stable(value) {
  return JSON.stringify(value);
}

function preservedOuterContext(outerContext) {
  const out = {};
  for (const [key, value] of Object.entries(outerContext || {})) {
    if (!AUTHORITY_KEYS.has(key)) out[key] = value;
  }
  return out;
}

function validationProfilesDirectory() {
  return fileURLToPath(new URL('../releases/validation-profiles/', import.meta.url));
}

function fixturesDirectory() {
  return fileURLToPath(new URL('../tests/fixtures/', import.meta.url));
}

function readJsonFile(filePath, code, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw contextError(code, `${label}: ${error?.message || error}`);
  }
}

export function loadExactValidationProfileForSource(source, { requiredContracts = R2_10_REQUIRED_CONTRACTS } = {}) {
  const sourceVersion = extractSourceReleaseVersion(source);
  if (!EXACT_VERSION_RE.test(sourceVersion)) {
    throw contextError('VALIDATION_CONTEXT_SOURCE_VERSION_INVALID', `source version is not an exact semantic version: ${sourceVersion || '<missing>'}`);
  }

  const profilePath = path.join(validationProfilesDirectory(), `${sourceVersion}.json`);
  if (!fs.existsSync(profilePath)) {
    throw contextError('VALIDATION_CONTEXT_PROFILE_MISSING', `no exact validation profile for source version ${sourceVersion}`);
  }

  const raw = readJsonFile(profilePath, 'VALIDATION_CONTEXT_PROFILE_INVALID', `cannot read validation profile ${sourceVersion}`);
  const profile = validateValidationProfile(raw, { requiredContracts });
  if (profile.releaseVersion !== sourceVersion) {
    throw contextError(
      'VALIDATION_CONTEXT_PROFILE_VERSION_MISMATCH',
      `source ${sourceVersion} does not match profile ${profile.releaseVersion}`,
    );
  }
  return profile;
}

export function loadContractOwnedFixtures(contractId) {
  if (typeof contractId !== 'string' || !contractId) {
    throw contextError('VALIDATION_CONTEXT_CONTRACT_UNSUPPORTED', 'contract id is required');
  }
  const fixtureDir = path.join(fixturesDirectory(), contractId);
  if (!fs.existsSync(fixtureDir) || !fs.statSync(fixtureDir).isDirectory()) {
    throw contextError('VALIDATION_CONTEXT_FIXTURE_MISSING', `contract fixture directory missing: ${contractId}`);
  }
  const files = fs.readdirSync(fixtureDir).filter((name) => name.endsWith('.json')).sort();
  if (!files.length) {
    throw contextError('VALIDATION_CONTEXT_FIXTURE_MISSING', `contract fixture files missing: ${contractId}`);
  }
  const fixtures = files.map((name) => readJsonFile(
    path.join(fixtureDir, name),
    'VALIDATION_CONTEXT_FIXTURE_INVALID',
    `cannot read contract fixture ${contractId}/${name}`,
  ));
  for (const fixture of fixtures) {
    if (fixture?.suite !== contractId) {
      throw contextError(
        'VALIDATION_CONTEXT_FIXTURE_OWNER_MISMATCH',
        `fixture ${fixture?.id || '<unknown>'} declares ${fixture?.suite || '<missing>'}, expected ${contractId}`,
      );
    }
  }
  return fixtures;
}

function assertOverridesCoherent({ overrides, source, sourceVersion, loader, profile, contractId, fixtureOwner, fixtures }) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return;

  if (Object.prototype.hasOwnProperty.call(overrides, 'provenance')) {
    throw contextError('VALIDATION_CONTEXT_PROVENANCE_AMBIGUOUS', 'provenance is constructor-owned');
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'source') && String(overrides.source) !== source) {
    throw contextError('VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION', 'source override does not equal exact source under test');
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'sourceVersion') && overrides.sourceVersion !== sourceVersion) {
    throw contextError('VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION', 'sourceVersion override contradicts exact source metadata');
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'contractId') && overrides.contractId !== contractId) {
    throw contextError('VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION', 'contractId override contradicts requested contract');
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'fixtureOwner') && overrides.fixtureOwner !== fixtureOwner) {
    throw contextError('VALIDATION_CONTEXT_FIXTURE_OWNER_MISMATCH', 'fixtureOwner override contradicts contract ownership');
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'loader')) {
    const overrideSource = String(overrides.loader?.source || '');
    if (overrideSource !== source || String(loader.source) !== source) {
      throw contextError('VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION', 'loader override is not bound to exact source under test');
    }
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'profile')) {
    const overrideProfile = validateValidationProfile(overrides.profile, { requiredContracts: R2_10_REQUIRED_CONTRACTS });
    if (overrideProfile.releaseVersion !== sourceVersion || stable(overrideProfile) !== stable(profile)) {
      throw contextError('VALIDATION_CONTEXT_PROFILE_VERSION_MISMATCH', 'profile override does not equal exact source profile');
    }
  }
  if (Object.prototype.hasOwnProperty.call(overrides, 'fixtures')) {
    const overrideFixtures = Array.isArray(overrides.fixtures) ? overrides.fixtures : [];
    if (!overrideFixtures.length || overrideFixtures.some((fixture) => fixture?.suite !== contractId)) {
      throw contextError('VALIDATION_CONTEXT_FIXTURE_OWNER_MISMATCH', 'fixture override does not belong to requested contract');
    }
    if (stable(overrideFixtures) !== stable(fixtures)) {
      throw contextError('VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION', 'fixture override differs from canonical contract-owned fixture set');
    }
  }
}

export function createValidationContext({
  source,
  contractId,
  outerContext = {},
  validationAuthorityOverrides = null,
} = {}) {
  const exactSource = String(source || '');
  const sourceVersion = extractSourceReleaseVersion(exactSource);
  if (!EXACT_VERSION_RE.test(sourceVersion)) {
    throw contextError('VALIDATION_CONTEXT_SOURCE_VERSION_INVALID', `source version is not an exact semantic version: ${sourceVersion || '<missing>'}`);
  }
  if (!R2_10_REQUIRED_CONTRACTS.includes(contractId)) {
    throw contextError('VALIDATION_CONTEXT_CONTRACT_UNSUPPORTED', `unsupported validation contract: ${contractId || '<missing>'}`);
  }

  const profile = loadExactValidationProfileForSource(exactSource);
  if (!profile.contracts?.[contractId]) {
    throw contextError('VALIDATION_CONTEXT_CONTRACT_UNSUPPORTED', `profile ${sourceVersion} does not declare ${contractId}`);
  }
  const loader = new BundleLoader(exactSource);
  if (loader.source !== exactSource) {
    throw contextError('VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION', 'constructed loader source mismatch');
  }
  const fixtureOwner = contractId;
  const fixtures = loadContractOwnedFixtures(contractId);

  assertOverridesCoherent({
    overrides: validationAuthorityOverrides,
    source: exactSource,
    sourceVersion,
    loader,
    profile,
    contractId,
    fixtureOwner,
    fixtures,
  });

  const provenance = Object.freeze({
    owner: 'R2.10_CONTEXT_COHERENT_VALIDATION_HARNESS',
    sourceVersion,
    profileVersion: profile.releaseVersion,
    loaderSourceVersion: extractSourceReleaseVersion(loader.source),
    contractId,
    fixtureOwner,
    exactProfile: true,
    loaderDerivedFromSource: true,
    fixturesDerivedFromContract: true,
  });

  if (
    provenance.sourceVersion !== provenance.profileVersion
    || provenance.sourceVersion !== provenance.loaderSourceVersion
    || provenance.contractId !== provenance.fixtureOwner
  ) {
    throw contextError('VALIDATION_CONTEXT_PROVENANCE_AMBIGUOUS', 'derived validation provenance is contradictory');
  }

  return Object.freeze({
    ...preservedOuterContext(outerContext),
    source: exactSource,
    sourceVersion,
    loader,
    profile,
    contractId,
    fixtureOwner,
    fixtures: Object.freeze([...fixtures]),
    provenance,
  });
}
