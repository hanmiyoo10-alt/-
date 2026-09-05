import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { equal, assert } from '../../tooling/assertions.mjs';
import { registry } from '../registry.mjs';
import {
  VALIDATION_CONTRACT_MODES,
  extractSourceReleaseVersion,
  validateValidationProfile,
} from '../../tooling/validation-contract-profile.mjs';
import {
  buildValidationProfileInventory,
  buildValidationProfileInventoryFromEntries,
} from '../../tooling/validation-profile-inventory-r2-11.mjs';
import {
  discoverBuilderClosure,
  mergeProjectedBuilderRows,
} from '../../tooling/validation-builder-discovery.mjs';
import { preflightValidationTopology } from '../../tooling/validation-topology-preflight.mjs';
import {
  R2_9_AUTHORITY_CAPABILITIES,
} from './release-validation-contracts-r2-9.mjs';
import {
  buildActiveValidationContext,
  loadActiveValidationProfile,
  runActiveProjectedValidationContract,
} from './release-validation-active-r2-9.mjs';

const REQUIRED_CONTRACTS = Object.freeze([
  'reload-cache-continuity',
  'operator-release-card',
  'host-local-telemetry',
  'bounded-telemetry-capsule',
]);

const ACTIVE_R2_9_ROUTES = Object.freeze({
  'reload-cache-continuity': './suites/release-validation-active-r2-9.mjs',
  'operator-release-card': './suites/release-validation-active-r2-9.mjs',
  'host-local-telemetry': './suites/release-validation-active-r2-9.mjs',
  'bounded-telemetry-capsule': './suites/release-validation-active-r2-9.mjs',
});

const PROJECTED_NO_WRAPPER_FLOOR = '0.70.1';

function expectCode(code, fn) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}`);
}

function replaceExactlyOnce(source, from, to, label) {
  const count = source.split(from).length - 1;
  equal(count, 1, `${label} replacement count`);
  return source.replace(from, to);
}

function projectProfileIdentity(source, targetVersion, profileInventory) {
  const sourceVersion = extractSourceReleaseVersion(source);
  const sourceIdentity = profileInventory.identitiesByVersion[sourceVersion];
  const targetIdentity = profileInventory.identitiesByVersion[targetVersion];
  assert(sourceIdentity, `source identity profile missing: ${sourceVersion || '<missing>'}`);
  assert(targetIdentity, `target identity profile missing: ${targetVersion || '<missing>'}`);
  if (sourceVersion === targetVersion) return source;

  let out = source;
  out = replaceExactlyOnce(out, `//@version ${sourceVersion}`, `//@version ${targetVersion}`, 'metadata version');
  out = replaceExactlyOnce(
    out,
    `const SIMCORE_RUNTIME_VERSION = '${sourceVersion}';`,
    `const SIMCORE_RUNTIME_VERSION = '${targetVersion}';`,
    'runtime version',
  );
  out = replaceExactlyOnce(
    out,
    `const HOST_COMPAT_VERSION = '${sourceVersion}';`,
    `const HOST_COMPAT_VERSION = '${targetVersion}';`,
    'Host compatibility version',
  );
  out = replaceExactlyOnce(
    out,
    `    version: '${sourceVersion}',\n    name: '${sourceIdentity.releaseName}',`,
    `    version: '${targetVersion}',\n    name: '${targetIdentity.releaseName}',`,
    'operator release-card identity',
  );
  return out;
}

function suitesDirectory() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function fixturesDirectory() {
  return path.resolve(suitesDirectory(), '../fixtures');
}

function filesystemInventory() {
  const suitesDir = suitesDirectory();
  const fixturesDir = fixturesDirectory();
  const suiteFiles = fs.readdirSync(suitesDir).filter((name) => name.endsWith('.mjs')).sort();
  const fixtureDirs = fs.readdirSync(fixturesDir)
    .filter((name) => fs.statSync(path.join(fixturesDir, name)).isDirectory())
    .sort();
  return {
    suiteFiles,
    fixtureDirs,
    availableModules: suiteFiles.map((name) => `./suites/${name}`),
  };
}

async function assertActiveContracts(source, ctx, label) {
  const profile = loadActiveValidationProfile(source);
  equal(profile.releaseVersion, extractSourceReleaseVersion(source), `${label} exact profile binding`);
  for (const contractId of REQUIRED_CONTRACTS) {
    const ambientCtx = { ...ctx, source };
    const coherent = buildActiveValidationContext(contractId, ambientCtx);
    equal(coherent.source, source, `${label} coherent source ${contractId}`);
    equal(coherent.sourceVersion, profile.releaseVersion, `${label} coherent source version ${contractId}`);
    equal(coherent.loader.source, source, `${label} coherent loader ${contractId}`);
    equal(coherent.profile.releaseVersion, profile.releaseVersion, `${label} coherent profile ${contractId}`);
    equal(coherent.fixtureOwner, contractId, `${label} coherent fixture owner ${contractId}`);
    assert(coherent.fixtures.length > 0, `${label} coherent fixtures missing ${contractId}`);
    assert(coherent.fixtures.every((fixture) => fixture?.suite === contractId), `${label} coherent fixture suite ${contractId}`);
    equal(coherent.provenance.owner, 'R2.10_CONTEXT_COHERENT_VALIDATION_HARNESS', `${label} context provenance owner ${contractId}`);
    const result = await runActiveProjectedValidationContract(contractId, ambientCtx);
    equal(result.status || 'PASS', 'PASS', `${label} active contract ${contractId}`);
  }
  return profile;
}

function futureProfileFromCurrent(currentProfile, sourceVersion, futureVersion) {
  const future = JSON.parse(JSON.stringify(currentProfile));
  future.releaseVersion = futureVersion;
  future.releaseName = 'Synthetic Future Inventory Control';
  for (const contract of Object.values(future.contracts || {})) {
    if (
      contract.mode === VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY
      || contract.mode === VALIDATION_CONTRACT_MODES.CHANGED_CONTRACT
    ) {
      contract.authorityVersion = futureVersion;
      if (Array.isArray(contract.rejectVersions)) contract.rejectVersions = [sourceVersion];
    }
  }
  return future;
}

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  assert(fixture, 'R2.9 fixture missing');

  const profileInventory = buildValidationProfileInventory({ requiredContracts: REQUIRED_CONTRACTS });
  equal(profileInventory.provenance.owner, 'R2.11_PROFILE_DRIVEN_VALIDATION_INVENTORY', 'R2.11 inventory provenance');
  assert(profileInventory.versions.length > 0, 'R2.11 inventory must not be empty');
  equal(
    JSON.stringify(profileInventory.versions),
    JSON.stringify([...profileInventory.versions].sort((a, b) => {
      const ap = a.split('.').map(Number);
      const bp = b.split('.').map(Number);
      return ap[0] - bp[0] || ap[1] - bp[1] || ap[2] - bp[2];
    })),
    'R2.11 inventory semantic ordering',
  );

  for (const version of profileInventory.versions) {
    const profile = profileInventory.profilesByVersion[version];
    const identity = profileInventory.identitiesByVersion[version];
    equal(profile.releaseVersion, version, `inventory profile version ${version}`);
    equal(identity.releaseVersion, version, `inventory identity version ${version}`);
    equal(identity.releaseName, profile.releaseName, `inventory identity release name ${version}`);
    assert(Boolean(identity.releaseName?.trim()), `inventory release name missing ${version}`);
  }

  const validatedSeed = profileInventory.profilesByVersion['0.70.0'];
  assert(validatedSeed, 'seed validation profile 0.70.0 missing');
  equal(
    validatedSeed.contracts['host-local-telemetry'].mode,
    VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY,
    'seed Host-local contract must remain exact-current',
  );

  const validatedV07001 = profileInventory.profilesByVersion['0.70.1'];
  assert(validatedV07001, 'historical v0.70.1 validation profile missing');
  equal(validatedV07001.releaseName, 'Cold First-Turn Tail Attribution', 'v0.70.1 historical release name');
  equal(validatedV07001.contracts['host-local-telemetry'].authorityVersion, '0.70.1', 'v0.70.1 Host-local exact authority');
  equal(JSON.stringify(validatedV07001.contracts['host-local-telemetry'].rejectVersions), JSON.stringify(['0.70.0']), 'v0.70.1 Host-local predecessor rejection');

  for (const [id, module] of Object.entries(ACTIVE_R2_9_ROUTES)) {
    equal(registry.find((row) => row.id === id)?.module, module, `R2.9 active route mismatch: ${id}`);
  }

  const sourceVersion = extractSourceReleaseVersion(ctx.source);
  const loadedCurrent = await assertActiveContracts(ctx.source, ctx, `active source ${sourceVersion}`);
  equal(loadedCurrent.releaseVersion, sourceVersion, 'active loader must bind source to its exact profile');
  equal(
    loadedCurrent.releaseName,
    profileInventory.identitiesByVersion[sourceVersion]?.releaseName,
    'active source identity must come from exact profile inventory',
  );

  for (const version of profileInventory.versions) {
    const projected = projectProfileIdentity(ctx.source, version, profileInventory);
    await assertActiveContracts(projected, ctx, `inventory-projected ${version}`);
  }

  const fileInventory = filesystemInventory();
  const builderClosure = discoverBuilderClosure({
    suiteFiles: fileInventory.suiteFiles,
    fixtureDirs: fileInventory.fixtureDirs,
  });
  equal(builderClosure.status, 'PASS', 'current builder suite/fixture closure');
  assert(builderClosure.rows.length > 0, 'structural builder discovery must produce executable rows');
  const projectedRegistry = mergeProjectedBuilderRows(registry, builderClosure.rows);
  equal(
    projectedRegistry.filter((row) => /^builder-v\d{5}$/.test(String(row?.id || ''))).length,
    builderClosure.rows.length,
    'builder registry projection must be discovery-driven',
  );

  const topology = preflightValidationTopology({
    profile: loadedCurrent,
    requiredContracts: REQUIRED_CONTRACTS,
    authorityCapabilities: R2_9_AUTHORITY_CAPABILITIES,
    builderClosure,
    registryRows: projectedRegistry,
    availableModules: fileInventory.availableModules,
    availableFixtureDirs: fileInventory.fixtureDirs,
  });
  equal(topology.status, 'PASS', `active validation topology: ${(topology.findings || []).join('; ')}`);
  equal(topology.releaseVersion, sourceVersion, 'topology must bind the actual active source version');

  const noWrapperFloorIndex = profileInventory.versions.indexOf(PROJECTED_NO_WRAPPER_FLOOR);
  assert(noWrapperFloorIndex >= 0, 'projected no-wrapper migration floor profile missing');
  for (const version of profileInventory.versions.slice(noWrapperFloorIndex)) {
    const suffix = version.replaceAll('.', '');
    for (const contractId of REQUIRED_CONTRACTS) {
      assert(
        !fileInventory.suiteFiles.includes(`${contractId}-v${suffix}.test.mjs`),
        `${version} must not require per-version wrapper ${contractId}`,
      );
    }
  }

  const currentProfile = profileInventory.profilesByVersion[sourceVersion];
  assert(currentProfile, `active source exact profile missing from inventory: ${sourceVersion || '<missing>'}`);
  const futureVersion = '9.99.99';
  const futureProfile = futureProfileFromCurrent(currentProfile, sourceVersion, futureVersion);
  const syntheticInventory = buildValidationProfileInventoryFromEntries([
    { filename: `${sourceVersion}.json`, profile: currentProfile },
    { filename: `${futureVersion}.json`, profile: futureProfile },
  ], { requiredContracts: REQUIRED_CONTRACTS });
  equal(syntheticInventory.identitiesByVersion[futureVersion]?.releaseName, futureProfile.releaseName, 'synthetic future profile enters inventory without census row');
  const syntheticFutureSource = projectProfileIdentity(ctx.source, futureVersion, syntheticInventory);
  equal(extractSourceReleaseVersion(syntheticFutureSource), futureVersion, 'synthetic future source identity projection');

  expectCode('VALIDATION_INVENTORY_FILENAME_INVALID', () => buildValidationProfileInventoryFromEntries([
    { filename: 'future.json', profile: futureProfile },
  ], { requiredContracts: REQUIRED_CONTRACTS }));

  expectCode('VALIDATION_INVENTORY_PROFILE_PARSE_FAIL', () => buildValidationProfileInventoryFromEntries([
    { filename: `${futureVersion}.json`, content: '{' },
  ], { requiredContracts: REQUIRED_CONTRACTS }));

  const invalidProfile = JSON.parse(JSON.stringify(currentProfile));
  invalidProfile.schemaVersion = 999;
  expectCode('VALIDATION_INVENTORY_PROFILE_INVALID', () => buildValidationProfileInventoryFromEntries([
    { filename: `${sourceVersion}.json`, profile: invalidProfile },
  ], { requiredContracts: REQUIRED_CONTRACTS }));

  const invalidReleaseName = JSON.parse(JSON.stringify(currentProfile));
  invalidReleaseName.releaseName = '   ';
  expectCode('VALIDATION_INVENTORY_RELEASE_NAME_INVALID', () => buildValidationProfileInventoryFromEntries([
    { filename: `${sourceVersion}.json`, profile: invalidReleaseName },
  ], { requiredContracts: REQUIRED_CONTRACTS }));

  expectCode('VALIDATION_INVENTORY_VERSION_MISMATCH', () => buildValidationProfileInventoryFromEntries([
    { filename: `${futureVersion}.json`, profile: currentProfile },
  ], { requiredContracts: REQUIRED_CONTRACTS }));

  expectCode('VALIDATION_INVENTORY_DUPLICATE_VERSION', () => buildValidationProfileInventoryFromEntries([
    { filename: `${sourceVersion}.json`, profile: currentProfile },
    { filename: `${sourceVersion}.json`, profile: currentProfile },
  ], { requiredContracts: REQUIRED_CONTRACTS }));

  expectCode('VALIDATION_INVENTORY_EMPTY', () => buildValidationProfileInventoryFromEntries([], {
    requiredContracts: REQUIRED_CONTRACTS,
  }));

  const unknownSource = ctx.source.replace(`//@version ${sourceVersion}`, '//@version 0.70.2');
  expectCode('VALIDATION_ACTIVE_PROFILE_MISSING', () => loadActiveValidationProfile(unknownSource));

  const missingContract = JSON.parse(JSON.stringify(validatedSeed));
  delete missingContract.contracts['reload-cache-continuity'];
  expectCode('VALIDATION_PROFILE_CONTRACT_MISSING', () => validateValidationProfile(missingContract, { requiredContracts: REQUIRED_CONTRACTS }));

  const implicitAuthority = JSON.parse(JSON.stringify(validatedSeed));
  implicitAuthority.contracts['reload-cache-continuity'].authorityVersion = 'latest';
  expectCode('VALIDATION_PROFILE_VERSION_INVALID', () => validateValidationProfile(implicitAuthority, { requiredContracts: REQUIRED_CONTRACTS }));

  const exactContradiction = JSON.parse(JSON.stringify(validatedSeed));
  exactContradiction.contracts['host-local-telemetry'].authorityVersion = '0.69.2';
  expectCode('VALIDATION_PROFILE_EXACT_IDENTITY_CONTRADICTION', () => validateValidationProfile(exactContradiction, { requiredContracts: REQUIRED_CONTRACTS }));

  const builderFixtureMissing = discoverBuilderClosure({
    suiteFiles: fileInventory.suiteFiles,
    fixtureDirs: fileInventory.fixtureDirs.filter((name) => name !== 'builder-v07000'),
  });
  equal(builderFixtureMissing.reasonCode, 'BLOCK_FIXTURE_GAP', 'builder without fixture must fail closed');

  const builderSuiteMissing = discoverBuilderClosure({
    suiteFiles: fileInventory.suiteFiles.filter((name) => name !== 'builder-v07000.test.mjs'),
    fixtureDirs: fileInventory.fixtureDirs,
  });
  equal(builderSuiteMissing.reasonCode, 'BLOCK_FIXTURE_GAP', 'fixture without builder must fail closed');

  const missingAuthority = {
    ...R2_9_AUTHORITY_CAPABILITIES,
    'reload-cache-continuity': { versions: [], exactCurrent: false },
  };
  const authorityBlocked = preflightValidationTopology({
    profile: loadedCurrent,
    requiredContracts: REQUIRED_CONTRACTS,
    authorityCapabilities: missingAuthority,
    builderClosure,
    registryRows: projectedRegistry,
    availableModules: fileInventory.availableModules,
    availableFixtureDirs: fileInventory.fixtureDirs,
  });
  equal(authorityBlocked.reasonCode, 'BLOCK_AUTHORITY_UNRESOLVED', 'missing explicit authority must fail closed');

  equal(fixture.expected.activeRouteMutation, 'R2_9_PROJECTED_NORMAL_PATH', 'fixture must authorize active projected routes');
  equal(fixture.expected.runtimeMutation, 'NONE', 'fixture runtime mutation');
  equal(fixture.expected.releaseSimcoreMutation, 'NONE', 'fixture release-simcore mutation');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'r2-11-profile-inventory-validates-all-exact-profiles', status: 'PASS' },
      { id: 'r2-11-active-source-no-manual-version-census-gate', status: 'PASS' },
      { id: 'r2-11-profile-derived-identity-projection', status: 'PASS' },
      { id: 'r2-11-all-inventory-projected-contracts-pass', status: 'PASS' },
      { id: 'r2-11-builder-fixture-closure-discovery-driven', status: 'PASS' },
      { id: 'r2-11-no-wrapper-proof-inventory-driven', status: 'PASS' },
      { id: 'r2-11-synthetic-future-profile-needs-no-census-row', status: 'PASS' },
      { id: 'r2-11-inventory-fail-closed-family', status: 'PASS' },
      { id: 'r2-9-r2-10-context-owner-coherent', status: 'PASS' },
      { id: 'r2-9-unknown-active-profile-fails-closed', status: 'PASS' },
      { id: 'r2-9-profile-contract-fail-closed-controls', status: 'PASS' },
      { id: 'r2-9-builder-or-fixture-half-registration-fails-closed', status: 'PASS' },
      { id: 'r2-9-unresolved-authority-fails-closed', status: 'PASS' },
      { id: 'r2-11-activation-no-runtime-release-mutation', status: 'PASS' },
    ],
  };
}
