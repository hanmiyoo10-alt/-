import { equal, assert } from '../../tooling/assertions.mjs';
import { VALIDATION_CONTRACT_MODES } from '../../tooling/validation-contract-profile.mjs';
import { preflightValidationTopology } from '../../tooling/validation-topology-preflight.mjs';
import {
  buildActiveValidationContext,
  loadActiveValidationProfile,
} from './release-validation-active-r2-9.mjs';
import {
  R2_9_AUTHORITY_CAPABILITIES,
  runProjectedValidationContract,
} from './release-validation-contracts-r2-9.mjs';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function runSuite(ctx) {
  const fixture = ctx.fixtures?.[0] || {};
  const sourceVersion = ctx.source.match(/^\/\/@version\s+([^\s]+)\s*$/m)?.[1] || '';
  assert(/^\d+\.\d+\.\d+$/.test(sourceVersion), 'active source semantic version missing');

  const activeProfile = loadActiveValidationProfile(ctx.source);
  equal(activeProfile.releaseVersion, sourceVersion, 'active profile/source identity');

  const assertions = [];
  const pass = (id) => assertions.push({ id, status: 'PASS' });

  equal(R2_9_AUTHORITY_CAPABILITIES['operator-release-card']?.exactCurrent, true, 'operator exact-current capability must be advertised');
  pass('operator-exact-current-capability');

  const changedProfile = clone(activeProfile);
  changedProfile.contracts['operator-release-card'] = {
    mode: VALIDATION_CONTRACT_MODES.CHANGED_CONTRACT,
    authorityVersion: sourceVersion,
  };

  const topology = preflightValidationTopology({
    profile: changedProfile,
    requiredContracts: ['operator-release-card'],
    authorityCapabilities: R2_9_AUTHORITY_CAPABILITIES,
    builderClosure: { status: 'PASS', suiteOnly: [], fixtureOnly: [], rows: [] },
    registryRows: [],
    availableModules: [],
    availableFixtureDirs: [],
  });
  equal(topology.status, 'PASS', `changed operator topology: ${topology.reasonCode || 'none'} ${(topology.findings || []).join(' | ')}`);
  pass('changed-contract-topology-pass');

  const coherent = buildActiveValidationContext('operator-release-card', ctx);
  const changedResult = await runProjectedValidationContract('operator-release-card', coherent, changedProfile);
  equal(changedResult.status, 'PASS', 'changed operator exact-current envelope');
  for (const id of fixture.expected?.changedAssertions || []) {
    assert(changedResult.assertions?.some((row) => row.id === id && row.status === 'PASS'), `changed operator assertion missing: ${id}`);
  }
  pass('changed-contract-executable-pass');

  const activeMode = activeProfile.contracts['operator-release-card']?.mode;
  if (activeMode === VALIDATION_CONTRACT_MODES.CURRENT_IDENTITY_INHERIT_BEHAVIOR) {
    const inheritedResult = await runProjectedValidationContract('operator-release-card', coherent, activeProfile);
    equal(inheritedResult.status, 'PASS', 'existing inherited operator projection must remain executable');
    assert(inheritedResult.assertions?.some((row) => row.id === 'r2-9-operator-card-current-identity' && row.status === 'PASS'), 'existing inherited current-identity assertion missing');
    pass('existing-inherited-path-preserved');
  } else if (activeMode === VALIDATION_CONTRACT_MODES.CHANGED_CONTRACT) {
    pass('active-profile-already-changed-contract');
  } else {
    throw new Error(`unexpected active operator contract mode: ${activeMode || '<missing>'}`);
  }

  equal(
    assertions.filter((row) => (fixture.input?.cases || []).includes(row.id)).length,
    (fixture.input?.cases || []).length,
    'R2.9 changed operator fixture coverage',
  );

  return { coverage: 'EXECUTABLE', status: 'PASS', assertions };
}
