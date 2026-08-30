import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { equal, assert } from '../../tooling/assertions.mjs';
import { BundleLoader } from '../../tooling/bundle-loader.mjs';
import {
  R2_10_REQUIRED_CONTRACTS,
  createValidationContext,
  loadContractOwnedFixtures,
  loadExactValidationProfileForSource,
} from '../../tooling/validation-context-r2-10.mjs';
import { extractSourceReleaseVersion } from '../../tooling/validation-contract-profile.mjs';
import {
  buildActiveValidationContext,
  runActiveProjectedValidationContract,
} from './release-validation-active-r2-9.mjs';

function expectCode(code, fn) {
  let got = null;
  try { fn(); } catch (error) { got = error?.code || null; }
  equal(got, code, `expected ${code}`);
}

function replaceMetadataVersion(source, targetVersion) {
  const current = extractSourceReleaseVersion(source);
  const needle = `//@version ${current}`;
  const count = String(source).split(needle).length - 1;
  equal(count, 1, 'metadata version replacement count');
  return String(source).replace(needle, `//@version ${targetVersion}`);
}

function readProfile(version) {
  const url = new URL(`../../releases/validation-profiles/${version}.json`, import.meta.url);
  return JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'));
}

export async function runSuite(ctx) {
  const fixture = ctx.fixtures[0];
  assert(fixture, 'R2.10 fixture missing');
  equal(fixture.input.systemVersion, 'R2.10', 'R2.10 fixture system version');

  const sourceVersion = extractSourceReleaseVersion(ctx.source);
  assert(/^\d+\.\d+\.\d+$/.test(sourceVersion), 'active source must expose exact version');

  for (const contractId of R2_10_REQUIRED_CONTRACTS) {
    const coherent = buildActiveValidationContext(contractId, ctx);
    equal(coherent.source, ctx.source, `${contractId} exact source`);
    equal(coherent.sourceVersion, sourceVersion, `${contractId} exact source version`);
    equal(coherent.loader.source, ctx.source, `${contractId} loader source`);
    equal(coherent.profile.releaseVersion, sourceVersion, `${contractId} exact profile`);
    equal(coherent.contractId, contractId, `${contractId} contract identity`);
    equal(coherent.fixtureOwner, contractId, `${contractId} fixture owner`);
    assert(coherent.fixtures.length > 0, `${contractId} fixtures missing`);
    assert(coherent.fixtures.every((row) => row?.suite === contractId), `${contractId} fixture ownership`);
    equal(coherent.provenance.sourceVersion, sourceVersion, `${contractId} provenance source`);
    equal(coherent.provenance.profileVersion, sourceVersion, `${contractId} provenance profile`);
    equal(coherent.provenance.loaderSourceVersion, sourceVersion, `${contractId} provenance loader`);
    equal(coherent.provenance.fixtureOwner, contractId, `${contractId} provenance fixture owner`);
    assert(Object.isFrozen(coherent), `${contractId} context must be immutable at top level`);
    assert(Object.isFrozen(coherent.fixtures), `${contractId} fixture list must be immutable`);
    assert(Object.isFrozen(coherent.provenance), `${contractId} provenance must be immutable`);

    const result = await runActiveProjectedValidationContract(contractId, ctx);
    equal(result.status || 'PASS', 'PASS', `${contractId} active projected contract`);
  }

  const alternateVersion = sourceVersion === '0.70.0' ? '0.70.1' : '0.70.0';
  const alternateSource = replaceMetadataVersion(ctx.source, alternateVersion);
  const alternate = createValidationContext({
    source: alternateSource,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
  });
  equal(alternate.sourceVersion, alternateVersion, 'synthetic source exact version');
  equal(alternate.profile.releaseVersion, alternateVersion, 'synthetic exact profile');
  equal(alternate.loader.source, alternateSource, 'synthetic loader rebuilt from synthetic source');
  assert(alternate.loader !== ctx.loader, 'synthetic context must not inherit outer loader object');
  equal(alternate.fixtureOwner, 'reload-cache-continuity', 'synthetic fixture owner');
  assert(alternate.fixtures.every((row) => row?.suite === 'reload-cache-continuity'), 'synthetic contract fixtures must replace outer meta fixture authority');

  const unknownSource = replaceMetadataVersion(ctx.source, '9.99.9');
  expectCode('VALIDATION_CONTEXT_PROFILE_MISSING', () => createValidationContext({
    source: unknownSource,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
  }));

  const invalidSource = String(ctx.source).replace(`//@version ${sourceVersion}`, '//@version latest');
  expectCode('VALIDATION_CONTEXT_SOURCE_VERSION_INVALID', () => createValidationContext({
    source: invalidSource,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
  }));

  expectCode('VALIDATION_CONTEXT_CONTRACT_UNSUPPORTED', () => createValidationContext({
    source: ctx.source,
    contractId: 'unknown-contract',
    outerContext: ctx,
  }));

  expectCode('VALIDATION_CONTEXT_FIXTURE_OWNER_MISMATCH', () => createValidationContext({
    source: ctx.source,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
    validationAuthorityOverrides: { fixtureOwner: 'operator-release-card' },
  }));

  const alternateLoader = new BundleLoader(alternateSource);
  expectCode('VALIDATION_CONTEXT_OVERRIDE_CONTRADICTION', () => createValidationContext({
    source: ctx.source,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
    validationAuthorityOverrides: { loader: alternateLoader },
  }));

  const mismatchProfileVersion = sourceVersion === '0.70.0' ? '0.70.1' : '0.70.0';
  expectCode('VALIDATION_CONTEXT_PROFILE_VERSION_MISMATCH', () => createValidationContext({
    source: ctx.source,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
    validationAuthorityOverrides: { profile: readProfile(mismatchProfileVersion) },
  }));

  const operatorFixtures = loadContractOwnedFixtures('operator-release-card');
  expectCode('VALIDATION_CONTEXT_FIXTURE_OWNER_MISMATCH', () => createValidationContext({
    source: ctx.source,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
    validationAuthorityOverrides: { fixtures: operatorFixtures },
  }));

  expectCode('VALIDATION_CONTEXT_PROVENANCE_AMBIGUOUS', () => createValidationContext({
    source: ctx.source,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
    validationAuthorityOverrides: { provenance: { owner: 'external' } },
  }));

  const exactProfile = loadExactValidationProfileForSource(ctx.source);
  const exactFixtures = loadContractOwnedFixtures('reload-cache-continuity');
  const coherentOverride = createValidationContext({
    source: ctx.source,
    contractId: 'reload-cache-continuity',
    outerContext: ctx,
    validationAuthorityOverrides: {
      source: ctx.source,
      sourceVersion,
      contractId: 'reload-cache-continuity',
      fixtureOwner: 'reload-cache-continuity',
      loader: new BundleLoader(ctx.source),
      profile: exactProfile,
      fixtures: exactFixtures,
    },
  });
  equal(coherentOverride.sourceVersion, sourceVersion, 'coherent explicit authority proof');

  const activeRunnerSource = fs.readFileSync(fileURLToPath(new URL('./release-validation-active-r2-9.mjs', import.meta.url)), 'utf8');
  assert(activeRunnerSource.includes('createValidationContext'), 'active route must use R2.10 context owner');
  assert(!activeRunnerSource.includes('new BundleLoader('), 'active route must not manually pair loader');
  assert(!activeRunnerSource.includes('readFileSync('), 'active route must not manually read exact profile');

  const r29RegressionSource = fs.readFileSync(fileURLToPath(new URL('./release-system-r2-9-validation-contract-projection.test.mjs', import.meta.url)), 'utf8');
  assert(!r29RegressionSource.includes('new BundleLoader(source)'), 'R2.9 regression must not manually pair source and loader');
  assert(!r29RegressionSource.includes('function contractFixtures('), 'R2.9 regression must not manually substitute contract fixtures');

  equal(fixture.expected.automation, 'PRESERVED', 'automation must remain preserved');
  equal(fixture.expected.authorityExpansion, 'NONE', 'authority expansion must remain none');
  equal(fixture.expected.runtimeMutation, 'NONE', 'runtime mutation must remain none');
  equal(fixture.expected.releaseSimcoreMutation, 'NONE', 'release-simcore mutation must remain none');

  return {
    coverage: 'EXECUTABLE',
    status: 'PASS',
    assertions: [
      { id: 'r2-10-current-source-profile-loader-fixture-context-coherent', status: 'PASS' },
      { id: 'r2-10-active-projected-contracts-pass', status: 'PASS' },
      { id: 'r2-10-synthetic-source-rebuilds-loader-profile-fixtures', status: 'PASS' },
      { id: 'r2-10-unknown-profile-fails-closed', status: 'PASS' },
      { id: 'r2-10-invalid-source-version-fails-closed', status: 'PASS' },
      { id: 'r2-10-unsupported-contract-fails-closed', status: 'PASS' },
      { id: 'r2-10-fixture-owner-contradiction-fails-closed', status: 'PASS' },
      { id: 'r2-10-loader-contradiction-fails-closed', status: 'PASS' },
      { id: 'r2-10-profile-version-contradiction-fails-closed', status: 'PASS' },
      { id: 'r2-10-fixture-set-contradiction-fails-closed', status: 'PASS' },
      { id: 'r2-10-provenance-override-fails-closed', status: 'PASS' },
      { id: 'r2-10-coherent-explicit-authority-proof-pass', status: 'PASS' },
      { id: 'r2-10-active-route-manual-context-assembly-zero', status: 'PASS' },
      { id: 'r2-10-r2-9-regression-manual-context-assembly-zero', status: 'PASS' },
      { id: 'r2-10-authority-and-runtime-boundaries-frozen', status: 'PASS' },
    ],
  };
}
