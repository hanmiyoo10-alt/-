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
import { discoverBuilderClosure } from '../../tooling/validation-builder-discovery.mjs';
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

const KNOWN_RELEASE_IDENTITIES = Object.freeze({
  '0.70.0': Object.freeze({ releaseName: 'Current Task Primacy Guard' }),
  '0.70.1': Object.freeze({ releaseName: 'Cold First-Turn Tail Attribution' }),
  '0.70.3': Object.freeze({ releaseName: 'Post-M2 Simplification Convergence' }),
  '0.70.4': Object.freeze({ releaseName: 'Manual Edit Rebuild Attribution' }),
  '0.70.5': Object.freeze({ releaseName: 'Manual Edit Commit Boundary Attribution' }),
});

function readJson(url) {
  return JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'));
}

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

function projectKnownReleaseIdentity(source, targetVersion) {
  const sourceVersion = extractSourceReleaseVersion(source);
  const sourceIdentity = KNOWN_RELEASE_IDENTITIES[sourceVersion];
  const targetIdentity = KNOWN_RELEASE_IDENTITIES[targetVersion];
  assert(sourceIdentity, `unsupported source identity projection: ${sourceVersion || '<missing>'}`);
  assert(targetIdentity, `unsupported target identity projection: ${targetVersion || '<missing>'}`);
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

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  assert(fixture, 'R2.9 fixture missing');

  const seedProfile = readJson(new URL('../../releases/validation-profiles/0.70.0.json', import.meta.url));
  const validatedSeed = validateValidationProfile(seedProfile, { requiredContracts: REQUIRED_CONTRACTS });
  equal(validatedSeed.releaseVersion, '0.70.0', 'seed validation profile version');
  equal(
    validatedSeed.contracts['host-local-telemetry'].mode,
    VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY,
    'seed Host-local contract must remain exact-current',
  );

  const v07001Profile = readJson(new URL('../../releases/validation-profiles/0.70.1.json', import.meta.url));
  const validatedV07001 = validateValidationProfile(v07001Profile, { requiredContracts: REQUIRED_CONTRACTS });
  equal(validatedV07001.releaseVersion, '0.70.1', 'v0.70.1 validation profile version');
  equal(validatedV07001.releaseName, 'Cold First-Turn Tail Attribution', 'v0.70.1 validation profile release name');
  equal(validatedV07001.contracts['host-local-telemetry'].authorityVersion, '0.70.1', 'v0.70.1 Host-local exact authority');
  equal(JSON.stringify(validatedV07001.contracts['host-local-telemetry'].rejectVersions), JSON.stringify(['0.70.0']), 'v0.70.1 Host-local predecessor rejection');

  const v07004Profile = readJson(new URL('../../releases/validation-profiles/0.70.4.json', import.meta.url));
  const validatedV07004 = validateValidationProfile(v07004Profile, { requiredContracts: REQUIRED_CONTRACTS });
  equal(validatedV07004.releaseVersion, '0.70.4', 'v0.70.4 validation profile version');
  equal(validatedV07004.releaseName, 'Manual Edit Rebuild Attribution', 'v0.70.4 validation profile release name');
  equal(validatedV07004.contracts['host-local-telemetry'].authorityVersion, '0.70.4', 'v0.70.4 Host-local exact authority');
  equal(JSON.stringify(validatedV07004.contracts['host-local-telemetry'].rejectVersions), JSON.stringify(['0.70.3']), 'v0.70.4 Host-local predecessor rejection');

  const v07005Profile = readJson(new URL('../../releases/validation-profiles/0.70.5.json', import.meta.url));
  const validatedV07005 = validateValidationProfile(v07005Profile, { requiredContracts: REQUIRED_CONTRACTS });
  equal(validatedV07005.releaseVersion, '0.70.5', 'v0.70.5 validation profile version');
  equal(validatedV07005.releaseName, 'Manual Edit Commit Boundary Attribution', 'v0.70.5 validation profile release name');
  equal(validatedV07005.contracts['host-local-telemetry'].authorityVersion, '0.70.5', 'v0.70.5 Host-local exact authority');
  equal(JSON.stringify(validatedV07005.contracts['host-local-telemetry'].rejectVersions), JSON.stringify(['0.70.4']), 'v0.70.5 Host-local predecessor rejection');

  for (const [id, module] of Object.entries(ACTIVE_R2_9_ROUTES)) {
    equal(registry.find((row) => row.id === id)?.module, module, `R2.9 active route mismatch: ${id}`);
  }
  assert(registry.some((row) => row.id === 'builder-v07000'), 'builder-v07000 explicit row must remain during bounded activation');
  assert(registry.some((row) => row.id === 'builder-v07001'), 'builder-v07001 explicit row must remain during bounded activation');
  assert(registry.some((row) => row.id === 'builder-v07004'), 'builder-v07004 explicit row must remain discoverable');
  assert(registry.some((row) => row.id === 'builder-v07005'), 'builder-v07005 explicit row must remain discoverable');

  const sourceVersion = extractSourceReleaseVersion(ctx.source);
  assert(KNOWN_RELEASE_IDENTITIES[sourceVersion], `R2.9 active regression source version unsupported: ${sourceVersion || '<missing>'}`);
  const loadedCurrent = await assertActiveContracts(ctx.source, ctx, `active source ${sourceVersion}`);
  equal(loadedCurrent.releaseVersion, sourceVersion, 'active loader must bind source to its exact profile');

  const source07000 = projectKnownReleaseIdentity(ctx.source, '0.70.0');
  const source07001 = projectKnownReleaseIdentity(ctx.source, '0.70.1');
  const source07004 = projectKnownReleaseIdentity(ctx.source, '0.70.4');
  const source07005 = projectKnownReleaseIdentity(ctx.source, '0.70.5');
  await assertActiveContracts(source07000, ctx, 'known v0.70.0');
  await assertActiveContracts(source07001, ctx, 'known v0.70.1');
  await assertActiveContracts(source07004, ctx, 'known v0.70.4');
  await assertActiveContracts(source07005, ctx, 'known v0.70.5');

  const inventory = filesystemInventory();
  const builderClosure = discoverBuilderClosure({
    suiteFiles: inventory.suiteFiles,
    fixtureDirs: inventory.fixtureDirs,
  });
  equal(builderClosure.status, 'PASS', 'current builder suite/fixture closure');
  assert(builderClosure.rows.some((row) => row.id === 'builder-v07000'), 'builder-v07000 must be auto-discoverable');
  assert(builderClosure.rows.some((row) => row.id === 'builder-v07001'), 'builder-v07001 must be auto-discoverable');
  assert(builderClosure.rows.some((row) => row.id === 'builder-v07004'), 'builder-v07004 must be auto-discoverable');
  assert(builderClosure.rows.some((row) => row.id === 'builder-v07005'), 'builder-v07005 must be auto-discoverable');

  const topology = preflightValidationTopology({
    profile: loadedCurrent,
    requiredContracts: REQUIRED_CONTRACTS,
    authorityCapabilities: R2_9_AUTHORITY_CAPABILITIES,
    builderClosure,
    registryRows: registry,
    availableModules: inventory.availableModules,
    availableFixtureDirs: inventory.fixtureDirs,
  });
  equal(topology.status, 'PASS', `active validation topology: ${(topology.findings || []).join('; ')}`);
  equal(topology.releaseVersion, sourceVersion, 'topology must bind the actual active source version');

  assert(!inventory.suiteFiles.includes('reload-cache-continuity-v07001.test.mjs'), 'v0.70.1 must not require a reload wrapper');
  assert(!inventory.suiteFiles.includes('operator-release-card-v07001.test.mjs'), 'v0.70.1 must not require an operator wrapper');
  assert(!inventory.suiteFiles.includes('host-local-telemetry-v07001.test.mjs'), 'v0.70.1 must not require a Host-local wrapper');
  assert(!inventory.suiteFiles.includes('bounded-telemetry-capsule-v07001.test.mjs'), 'v0.70.1 must not require a bounded telemetry wrapper');
  assert(!inventory.suiteFiles.includes('reload-cache-continuity-v07004.test.mjs'), 'v0.70.4 must not require a reload wrapper');
  assert(!inventory.suiteFiles.includes('operator-release-card-v07004.test.mjs'), 'v0.70.4 must not require an operator wrapper');
  assert(!inventory.suiteFiles.includes('host-local-telemetry-v07004.test.mjs'), 'v0.70.4 must not require a Host-local wrapper');
  assert(!inventory.suiteFiles.includes('bounded-telemetry-capsule-v07004.test.mjs'), 'v0.70.4 must not require a bounded telemetry wrapper');
  assert(!inventory.suiteFiles.includes('reload-cache-continuity-v07005.test.mjs'), 'v0.70.5 must not require a reload wrapper');
  assert(!inventory.suiteFiles.includes('operator-release-card-v07005.test.mjs'), 'v0.70.5 must not require an operator wrapper');
  assert(!inventory.suiteFiles.includes('host-local-telemetry-v07005.test.mjs'), 'v0.70.5 must not require a Host-local wrapper');
  assert(!inventory.suiteFiles.includes('bounded-telemetry-capsule-v07005.test.mjs'), 'v0.70.5 must not require a bounded telemetry wrapper');

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
    suiteFiles: inventory.suiteFiles,
    fixtureDirs: inventory.fixtureDirs.filter((name) => name !== 'builder-v07000'),
  });
  equal(builderFixtureMissing.reasonCode, 'BLOCK_FIXTURE_GAP', 'builder without fixture must fail closed');

  const builderSuiteMissing = discoverBuilderClosure({
    suiteFiles: inventory.suiteFiles.filter((name) => name !== 'builder-v07000.test.mjs'),
    fixtureDirs: inventory.fixtureDirs,
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
    registryRows: registry,
    availableModules: inventory.availableModules,
    availableFixtureDirs: inventory.fixtureDirs,
  });
  equal(authorityBlocked.reasonCode, 'BLOCK_AUTHORITY_UNRESOLVED', 'missing explicit authority must fail closed');

  equal(fixture.expected.activeRouteMutation, 'R2_9_PROJECTED_NORMAL_PATH', 'fixture must authorize active projected routes');
  equal(fixture.expected.runtimeMutation, 'NONE', 'fixture runtime mutation');
  equal(fixture.expected.releaseSimcoreMutation, 'NONE', 'fixture release-simcore mutation');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'r2-9-profile-schema-and-contract-modes', status: 'PASS' },
      { id: 'r2-9-active-projected-routes', status: 'PASS' },
      { id: 'r2-9-active-source-exact-profile-binding', status: 'PASS' },
      { id: 'r2-9-known-v07000-active-contracts-pass', status: 'PASS' },
      { id: 'r2-9-known-v07001-active-contracts-pass', status: 'PASS' },
      { id: 'r2-9-known-v07004-active-contracts-pass', status: 'PASS' },
      { id: 'r2-9-known-v07005-active-contracts-pass', status: 'PASS' },
      { id: 'r2-9-projected-contract-fixture-ownership', status: 'PASS' },
      { id: 'r2-9-r2-10-context-owner-coherent', status: 'PASS' },
      { id: 'r2-9-builder-fixture-closure-pass', status: 'PASS' },
      { id: 'r2-9-topology-preflight-active-source-bound', status: 'PASS' },
      { id: 'r2-9-v07001-no-wrapper-fanout', status: 'PASS' },
      { id: 'r2-9-v07004-no-wrapper-fanout', status: 'PASS' },
      { id: 'r2-9-v07005-no-wrapper-fanout', status: 'PASS' },
      { id: 'r2-9-unknown-active-profile-fails-closed', status: 'PASS' },
      { id: 'r2-9-missing-contract-fails-closed', status: 'PASS' },
      { id: 'r2-9-implicit-authority-fails-closed', status: 'PASS' },
      { id: 'r2-9-exact-identity-contradiction-fails-closed', status: 'PASS' },
      { id: 'r2-9-builder-or-fixture-half-registration-fails-closed', status: 'PASS' },
      { id: 'r2-9-unresolved-authority-fails-closed', status: 'PASS' },
      { id: 'r2-9-activation-no-runtime-release-mutation', status: 'PASS' },
    ],
  };
}
