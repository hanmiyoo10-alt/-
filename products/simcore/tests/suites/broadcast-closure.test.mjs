import { equal, assert, includes } from '../../tooling/assertions.mjs';

export async function runSuite({ source, loader, fixtures }) {
  const time = loader.load('time');
  const structure = loader.load('structure');
  assert(typeof structure.validateStructure === 'function', 'Structure validation missing');
  const fixture = fixtures[0];
  const state = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const commit = time.commitBroadcastAirtime(state, { mode: 'B_END', broadcastAirtimePrevious: fixture.input.previous }, fixture.input.validBody);
  equal(commit.timestamp, fixture.expected.terminalCommit, 'B_END explicit terminal commit');
  equal(state.broadcastAirtime, fixture.expected.terminalCommit, 'B_END state airtime commit');

  const badState = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const bad = time.commitBroadcastAirtime(badState, { mode: 'B_END', broadcastAirtimePrevious: fixture.input.previous }, fixture.input.nonMonotonic);
  equal(badState.broadcastAirtime, fixture.input.previous, 'non-monotonic must fail closed');
  assert(bad.timestamp === fixture.input.previous || bad.timestamp === badState.broadcastAirtime, 'non-monotonic result must remain previous');

  includes(source, 'Broadcast closure:', 'B_END closure diagnostic binding');
  includes(source, 'broadcastTerminalExplicit', 'B_END terminal diagnostic binding');
  includes(source, 'broadcastCommunityClean', 'B_END structure diagnostic binding');
  return {
    coverage: 'HYBRID_TRANSITIONAL',
    status: 'PASS',
    assertions: [
      { id: 'broadcast-closure.explicit-terminal', status: 'PASS' },
      { id: 'broadcast-closure.non-monotonic-fail-closed', status: 'PASS' }
    ],
    missingExecutableSurface: fixture.expected.missingExecutableSurface
  };
}
