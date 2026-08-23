import { equal, assert, includes } from '../../tooling/assertions.mjs';

export async function runSuite({ source, loader, fixtures }) {
  const time = loader.load('time');
  const structure = loader.load('structure');
  assert(typeof structure.validateStructure === 'function', 'Structure validation missing');
  const fixture = fixtures[0];
  const pending = { active: true, mode: 'B_END', broadcastAirtimePrevious: fixture.input.previous };

  const state = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const commit = time.commitBroadcastAirtime(state, pending, fixture.input.validBody);
  equal(commit.timestamp, fixture.expected.terminalCommit, 'B_END explicit terminal commit');
  equal(state.broadcastAirtime, fixture.expected.terminalCommit, 'B_END state airtime commit');

  const badState = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const bad = time.commitBroadcastAirtime(badState, pending, fixture.input.nonMonotonic);
  equal(badState.broadcastAirtime, fixture.input.previous, 'non-monotonic must fail closed');
  assert(bad.timestamp === fixture.input.previous || bad.timestamp === badState.broadcastAirtime, 'non-monotonic result must remain previous');

  const validIssues = structure.validateStructure(fixture.input.validEnvelope, pending);
  equal(validIssues.length, fixture.expected.validStructureIssues, `valid B_END structure: ${JSON.stringify(validIssues)}`);
  const quarantineIssues = structure.validateStructure(fixture.input.quarantinedEnvelope, pending);
  assert(quarantineIssues.length >= fixture.expected.quarantineMinimumIssues, 'quarantine fixture must produce structure issue');
  assert(quarantineIssues.some((x) => /반응 태그|reaction|COMMUNITY/i.test(String(x))), `quarantine issue attribution missing: ${JSON.stringify(quarantineIssues)}`);

  const quarantineState = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const quarantineCommit = time.commitBroadcastAirtime(quarantineState, pending, fixture.input.quarantinedEnvelope);
  equal(quarantineCommit.timestamp, fixture.expected.terminalCommit, 'quarantined structure does not erase explicit terminal time control');

  includes(source, 'Broadcast closure:', 'B_END closure diagnostic binding');
  includes(source, 'broadcastTerminalExplicit', 'B_END terminal diagnostic binding');
  includes(source, 'broadcastCommunityClean', 'B_END structure diagnostic binding');
  return {
    coverage: 'HYBRID_TRANSITIONAL',
    status: 'PASS',
    assertions: [
      { id: 'broadcast-closure.explicit-terminal', status: 'PASS' },
      { id: 'broadcast-closure.non-monotonic-fail-closed', status: 'PASS' },
      { id: 'broadcast-closure.structure-valid', status: 'PASS' },
      { id: 'broadcast-closure.structure-quarantined-independent-of-terminal', status: 'PASS' }
    ],
    missingExecutableSurface: fixture.expected.missingExecutableSurface
  };
}
