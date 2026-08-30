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

const REQUIRED_CONTRACTS = Object.freeze([
  'reload-cache-continuity',
  'operator-release-card',
  'host-local-telemetry',
  'bounded-telemetry-capsule',
]);

const ACTIVE_V07000_ROUTES = Object.freeze({
  'reload-cache-continuity': './suites/reload-cache-continuity-v07000.test.mjs',
  'operator-release-card': './suites/operator-release-card-v07000.test.mjs',
  'host-local-telemetry': './suites/host-local-telemetry-v07000.test.mjs',
  'bounded-telemetry-capsule': './suites/bounded-telemetry-capsule-v07000.test.mjs',
});

function readJson(url) {
  return JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'));
}

function expectCode(code, fn) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}`);
}

function syntheticNextSource(source) {
  let out = source;
  const replacements = [
    ['//@version 0.70.0', '//@version 0.70.1'],
    ["const SIMCORE_RUNTIME_VERSION = '0.70.0';", "const SIMCORE_RUNTIME_VERSION = '0.70.1';"],
    ["const HOST_COMPAT_VERSION = '0.70.0';", "const HOST_COMPAT_VERSION = '0.70.1';"],
    [
      "    version: '0.70.0',\n    name: 'Current Task Primacy Guard',",
      "    version: '0.70.1',\n    name: 'Synthetic Next Validation Release',",
    ],
  ];
  for (const [from, to] of replacements) {
    const before = out;
    out = out.replace(from, to);
    assert(out !== before, `synthetic next-version replacement missing: ${from}`);
  }
  return out;
}

function syntheticNextProfile(profile) {
  const out = JSON.parse(JSON.stringify(profile));
  out.releaseVersion = '0.70.1';
  out.releaseName = 'Synthetic Next Validation Release';
  out.contracts['host-local-telemetry'].authorityVersion = '0.70.1';
  out.contracts['host-local-telemetry'].rejectVersions = ['0.70.0'];
  return out;
}

function filesystemInventory() {
  const suitesDir = path.dirname(fileURLToPath(import.meta.url));
  const fixturesDir = path.resolve(suitesDir, '../fixtures');
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
  const profile = readJson(new URL('../../releases/validation-profiles/0.70.0.json', import.meta.url));
  const validated = validateValidationProfile(profile, { requiredContracts: REQUIRED_CONTRACTS });
  equal(validated.releaseVersion, '0.70.0', 'seed validation profile version');
  equal(validated.contracts['host-local-telemetry'].mode, VALIDATION_CONTRACT_MODES.EXACT_CURRENT_IDENTITY, 'Host-local contract must remain exact-current');

  for (const [id, module] of Object.entries(ACTIVE_V07000_ROUTES)) {
    equal(registry.find((row) => row.id === id)?.module, module, `R2.9 shadow implementation must not activate ${id}`);
  }
  assert(registry.some((row) => row.id === 'builder-v07000'), 'active explicit builder-v07000 row must remain before R2.9 activation');

  for (const contractId of REQUIRED_CONTRACTS) {
    const result = await runProjectedValidationContract(contractId, ctx, validated);
    equal(result.status || 'PASS', 'PASS', `projected current contract ${contractId}`);
  }

  const inventory = filesystemInventory();
  const builderClosure = discoverBuilderClosure({
    suiteFiles: inventory.suiteFiles,
    fixtureDirs: inventory.fixtureDirs,
  });
  equal(builderClosure.status, 'PASS', 'current builder suite/fixture closure');
  assert(builderClosure.rows.some((row) => row.id === 'builder-v07000'), 'builder-v07000 must be auto-discoverable');

  const topology = preflightValidationTopology({
    profile: validated,
    requiredContracts: REQUIRED_CONTRACTS,
    authorityCapabilities: R2_9_AUTHORITY_CAPABILITIES,
    builderClosure,
    registryRows: registry,
    availableModules: inventory.availableModules,
    availableFixtureDirs: inventory.fixtureDirs,
  });
  equal(topology.status, 'PASS', `current validation topology: ${(topology.findings || []).join('; ')}`);

  const nextProfile = syntheticNextProfile(validated);
  validateValidationProfile(nextProfile, { requiredContracts: REQUIRED_CONTRACTS });
  const nextSource = syntheticNextSource(ctx.source);
  const nextCtx = { ...ctx, source: nextSource, loader: new BundleLoader(nextSource) };
  for (const contractId of REQUIRED_CONTRACTS) {
    const result = await runProjectedValidationContract(contractId, nextCtx, nextProfile);
    equal(result.status || 'PASS', 'PASS', `synthetic next-version contract ${contractId}`);
  }
  assert(!inventory.suiteFiles.includes('reload-cache-continuity-v07001.test.mjs'), 'synthetic next version must not require a reload wrapper');
  assert(!inventory.suiteFiles.includes('operator-release-card-v07001.test.mjs'), 'synthetic next version must not require an operator wrapper');
  assert(!inventory.suiteFiles.includes('host-local-telemetry-v07001.test.mjs'), 'synthetic next version must not require a Host-local wrapper');
  assert(!inventory.suiteFiles.includes('bounded-telemetry-capsule-v07001.test.mjs'), 'synthetic next version must not require a bounded telemetry wrapper');

  const missingContract = JSON.parse(JSON.stringify(validated));
  delete missingContract.contracts['reload-cache-continuity'];
  expectCode('VALIDATION_PROFILE_CONTRACT_MISSING', () => validateValidationProfile(missingContract, { requiredContracts: REQUIRED_CONTRACTS }));

  const implicitAuthority = JSON.parse(JSON.stringify(validated));
  implicitAuthority.contracts['reload-cache-continuity'].authorityVersion = 'latest';
  expectCode('VALIDATION_PROFILE_VERSION_INVALID', () => validateValidationProfile(implicitAuthority, { requiredContracts: REQUIRED_CONTRACTS }));

  const exactContradiction = JSON.parse(JSON.stringify(validated));
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
    profile: validated,
    requiredContracts: REQUIRED_CONTRACTS,
    authorityCapabilities: missingAuthority,
    builderClosure,
    registryRows: registry,
    availableModules: inventory.availableModules,
    availableFixtureDirs: inventory.fixtureDirs,
  });
  equal(authorityBlocked.reasonCode, 'BLOCK_AUTHORITY_UNRESOLVED', 'missing explicit authority must fail closed');

  equal(fixture.expected.activeRouteMutation, 'NONE', 'fixture must freeze shadow-only activation boundary');
  equal(fixture.expected.runtimeMutation, 'NONE', 'fixture runtime mutation');
  equal(fixture.expected.releaseSimcoreMutation, 'NONE', 'fixture release-simcore mutation');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'r2-9-profile-schema-and-contract-modes', status: 'PASS' },
      { id: 'r2-9-active-v07000-routes-unchanged', status: 'PASS' },
      { id: 'r2-9-current-profile-projected-contracts-pass', status: 'PASS' },
      { id: 'r2-9-builder-fixture-closure-pass', status: 'PASS' },
      { id: 'r2-9-topology-preflight-pass', status: 'PASS' },
      { id: 'r2-9-synthetic-next-version-no-wrapper-fanout', status: 'PASS' },
      { id: 'r2-9-missing-contract-fails-closed', status: 'PASS' },
      { id: 'r2-9-implicit-authority-fails-closed', status: 'PASS' },
      { id: 'r2-9-exact-identity-contradiction-fails-closed', status: 'PASS' },
      { id: 'r2-9-builder-or-fixture-half-registration-fails-closed', status: 'PASS' },
      { id: 'r2-9-unresolved-authority-fails-closed', status: 'PASS' },
      { id: 'r2-9-shadow-only-no-runtime-release-mutation', status: 'PASS' },
    ],
  };
}
