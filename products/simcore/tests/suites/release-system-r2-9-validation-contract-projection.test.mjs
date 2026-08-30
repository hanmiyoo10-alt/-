import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';
import { registry } from '../registry.mjs';
import {
  VALIDATION_CONTRACT_MODES,
  validateValidationProfile,
} from '../../tooling/validation-contract-profile.mjs';
import { discoverBuilderClosure } from '../../tooling/validation-builder-discovery.mjs';
import { preflightValidationTopology } from '../../tooling/validation-topology-preflight.mjs';
import {
  R2_9_AUTHORITY_CAPABILITIES,
  runProjectedValidationContract,
} from './release-validation-contracts-r2-9.mjs';
import {
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

function readJson(url) {
  return JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'));
}

function expectCode(code, fn) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}`);
}

function syntheticNextSource(source, releaseName) {
  let out = source;
  const replacements = [
    ['//@version 0.70.0', '//@version 0.70.1'],
    ["const SIMCORE_RUNTIME_VERSION = '0.70.0';", "const SIMCORE_RUNTIME_VERSION = '0.70.1';"],
    ["const HOST_COMPAT_VERSION = '0.70.0';", "const HOST_COMPAT_VERSION = '0.70.1';"],
    [
      "    version: '0.70.0',\n    name: 'Current Task Primacy Guard',",
      `    version: '0.70.1',\n    name: '${releaseName}',`,
    ],
  ];
  for (const [from, to] of replacements) {
    const before = out;
    out = out.replace(from, to);
    assert(out !== before, `synthetic next-version replacement missing: ${from}`);
  }
  return out;
}

function suitesDirectory() {
  return path.dirname(fileURLToPath(import.meta.url));
}

function fixturesDirectory() {
  return path.resolve(suitesDirectory(), '../fixtures');
}

function contractFixtures(contractId) {
  const dir = path.join(fixturesDirectory(), contractId);
  assert(fs.existsSync(dir) && fs.statSync(dir).isDirectory(), `contract fixture directory missing: ${contractId}`);
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.json')).sort();
  assert(files.length > 0, `contract fixture files missing: ${contractId}`);
  return files.map((name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')));
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

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  assert(fixture, 'R2.9 fixture missing');

  const currentProfile = readJson(new URL('../../releases/validation-profiles/0.70.0.json', import.meta.url));
  const validatedCurrent = validateValidationProfile(currentProfile, { requiredContracts: REQUIRED_CONTRACTS });
  equal(validatedCurrent.releaseVersion, '0.70.0', 'seed validation profile version');
  equal(
    validatedCurrent.contracts['host-local-telemetry'].mode,
    VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY,
    'Host-local contract must remain exact-current',
  );

  for (const [id, module] of Object.entries(ACTIVE_R2_9_ROUTES)) {
    equal(registry.find((row) => row.id === id)?.module, module, `R2.9 active route mismatch: ${id}`);
  }
  assert(registry.some((row) => row.id === 'builder-v07000'), 'builder-v07000 explicit row must remain during bounded activation');
  assert(registry.some((row) => row.id === 'builder-v07001'), 'builder-v07001 explicit row must remain during bounded activation');

  const loadedCurrent = loadActiveValidationProfile(ctx.source);
  equal(loadedCurrent.releaseVersion, '0.70.0', 'active loader must bind current source to exact current profile');

  for (const contractId of REQUIRED_CONTRACTS) {
    const projectedCtx = { ...ctx, fixtures: contractFixtures(contractId) };
    const direct = await runProjectedValidationContract(contractId, projectedCtx, validatedCurrent);
    equal(direct.status || 'PASS', 'PASS', `projected current contract ${contractId}`);
    const active = await runActiveProjectedValidationContract(contractId, projectedCtx);
    equal(active.status || 'PASS', 'PASS', `active current contract ${contractId}`);
  }

  const inventory = filesystemInventory();
  const builderClosure = discoverBuilderClosure({
    suiteFiles: inventory.suiteFiles,
    fixtureDirs: inventory.fixtureDirs,
  });
  equal(builderClosure.status, 'PASS', 'current builder suite/fixture closure');
  assert(builderClosure.rows.some((row) => row.id === 'builder-v07000'), 'builder-v07000 must be auto-discoverable');
  assert(builderClosure.rows.some((row) => row.id === 'builder-v07001'), 'builder-v07001 must be auto-discoverable');

  const topology = preflightValidationTopology({
    profile: validatedCurrent,
    requiredContracts: REQUIRED_CONTRACTS,
    authorityCapabilities: R2_9_AUTHORITY_CAPABILITIES,
    builderClosure,
    registryRows: registry,
    availableModules: inventory.availableModules,
    availableFixtureDirs: inventory.fixtureDirs,
  });
  equal(topology.status, 'PASS', `current validation topology: ${(topology.findings || []).join('; ')}`);

  const nextProfile = readJson(new URL('../../releases/validation-profiles/0.70.1.json', import.meta.url));
  const validatedNext = validateValidationProfile(nextProfile, { requiredContracts: REQUIRED_CONTRACTS });
  equal(validatedNext.releaseVersion, '0.70.1', 'v0.70.1 validation profile version');
  equal(validatedNext.releaseName, 'Cold First-Turn Tail Attribution', 'v0.70.1 validation profile release name');
  equal(validatedNext.contracts['host-local-telemetry'].authorityVersion, '0.70.1', 'v0.70.1 Host-local exact authority');
  equal(JSON.stringify(validatedNext.contracts['host-local-telemetry'].rejectVersions), JSON.stringify(['0.70.0']), 'v0.70.1 Host-local predecessor rejection');

  const nextSource = syntheticNextSource(ctx.source, validatedNext.releaseName);
  const nextLoader = new BundleLoader(nextSource);
  const loadedNext = loadActiveValidationProfile(nextSource);
  equal(loadedNext.releaseVersion, '0.70.1', 'active loader must bind synthetic v0.70.1 to exact profile');

  for (const contractId of REQUIRED_CONTRACTS) {
    const nextCtx = {
      ...ctx,
      source: nextSource,
      loader: nextLoader,
      fixtures: contractFixtures(contractId),
    };
    const result = await runActiveProjectedValidationContract(contractId, nextCtx);
    equal(result.status || 'PASS', 'PASS', `active v0.70.1 contract ${contractId}`);
  }

  assert(!inventory.suiteFiles.includes('reload-cache-continuity-v07001.test.mjs'), 'v0.70.1 must not require a reload wrapper');
  assert(!inventory.suiteFiles.includes('operator-release-card-v07001.test.mjs'), 'v0.70.1 must not require an operator wrapper');
  assert(!inventory.suiteFiles.includes('host-local-telemetry-v07001.test.mjs'), 'v0.70.1 must not require a Host-local wrapper');
  assert(!inventory.suiteFiles.includes('bounded-telemetry-capsule-v07001.test.mjs'), 'v0.70.1 must not require a bounded telemetry wrapper');

  const unknownSource = nextSource.replace('//@version 0.70.1', '//@version 0.70.2');
  expectCode('VALIDATION_ACTIVE_PROFILE_MISSING', () => loadActiveValidationProfile(unknownSource));

  const missingContract = JSON.parse(JSON.stringify(validatedCurrent));
  delete missingContract.contracts['reload-cache-continuity'];
  expectCode('VALIDATION_PROFILE_CONTRACT_MISSING', () => validateValidationProfile(missingContract, { requiredContracts: REQUIRED_CONTRACTS }));

  const implicitAuthority = JSON.parse(JSON.stringify(validatedCurrent));
  implicitAuthority.contracts['reload-cache-continuity'].authorityVersion = 'latest';
  expectCode('VALIDATION_PROFILE_VERSION_INVALID', () => validateValidationProfile(implicitAuthority, { requiredContracts: REQUIRED_CONTRACTS }));

  const exactContradiction = JSON.parse(JSON.stringify(validatedCurrent));
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
    profile: validatedCurrent,
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
      { id: 'r2-9-current-profile-active-contracts-pass', status: 'PASS' },
      { id: 'r2-9-v07001-exact-profile-active-contracts-pass', status: 'PASS' },
      { id: 'r2-9-projected-contract-fixture-ownership', status: 'PASS' },
      { id: 'r2-9-builder-fixture-closure-pass', status: 'PASS' },
      { id: 'r2-9-topology-preflight-pass', status: 'PASS' },
      { id: 'r2-9-v07001-no-wrapper-fanout', status: 'PASS' },
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
