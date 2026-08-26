import { equal, assert, includes } from '../../tooling/assertions.mjs';

function fresh(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function runSuite({ source, loader, fixtures }) {
  const time = loader.load('time');
  const lifecycle = loader.load('lifecycle');
  const structure = loader.load('structure');
  assert(typeof lifecycle.classifyMode === 'function', 'Lifecycle.classifyMode missing');
  assert(typeof time.commitBroadcastAirtime === 'function', 'Time.commitBroadcastAirtime missing');
  assert(typeof structure.validateStructure === 'function', 'Structure validation missing');

  const fixture = fixtures[0];
  const assertions = [];

  for (const row of fixture.input.lifecycleCases) {
    const state = fresh(row.state);
    const actual = lifecycle.classifyMode(state, row.text);
    equal(actual.mode, row.expected.mode, `${row.id} mode`);
    equal(actual.wasLocked, row.expected.wasLocked, `${row.id} wasLocked`);
    equal(state.broadcastLocked, row.expected.broadcastLocked, `${row.id} broadcastLocked`);
    equal(state.episodeNo, row.expected.episodeNo, `${row.id} episodeNo`);
    assertions.push({ id: `broadcast-closure.${row.id}`, status: 'PASS' });
  }

  for (const row of fixture.input.airtimeCases) {
    const state = fresh(row.state);
    const actual = time.commitBroadcastAirtime(state, fresh(row.pending), row.content);
    equal(actual.changed, row.expected.changed, `${row.id} changed`);
    equal(actual.reason, row.expected.reason, `${row.id} reason`);
    equal(actual.timestamp, row.expected.timestamp, `${row.id} timestamp`);
    equal(state.broadcastAirtime, row.expected.broadcastAirtime, `${row.id} broadcastAirtime`);
    equal(state.broadcastAirtimeStart, row.expected.broadcastAirtimeStart, `${row.id} broadcastAirtimeStart`);
    assertions.push({ id: `broadcast-closure.${row.id}`, status: 'PASS' });
  }

  for (const mode of ['B_START', 'B_CONTINUE']) {
    const pending = { active: true, mode };
    const validIssues = structure.validateStructure(fixture.input.openBroadcastEnvelope, pending);
    equal(validIssues.length, fixture.expected.openBroadcastStructureIssues, `${mode} valid open-broadcast structure: ${JSON.stringify(validIssues)}`);
    assertions.push({ id: `broadcast-closure.${mode === 'B_START' ? 'b-start-one-community-valid' : 'b-continue-one-community-valid'}`, status: 'PASS' });

    const terminalEnvelope = fixture.input.openBroadcastEnvelope.replace('방송 진행', fixture.input.terminalExpression);
    const terminalIssues = structure.validateStructure(terminalEnvelope, pending);
    assert(terminalIssues.some((x) => /열린 방송 장면에 종결 표현/.test(String(x))), `${mode} terminal-expression rejection missing: ${JSON.stringify(terminalIssues)}`);
    assertions.push({ id: `broadcast-closure.${mode === 'B_START' ? 'b-start-terminal-expression-rejected' : 'b-continue-terminal-expression-rejected'}`, status: 'PASS' });
  }

  const pending = { active: true, mode: 'B_END', broadcastAirtimePrevious: fixture.input.previous };
  const state = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const commit = time.commitBroadcastAirtime(state, pending, fixture.input.validBody);
  equal(commit.timestamp, fixture.expected.terminalCommit, 'B_END explicit terminal commit');
  equal(state.broadcastAirtime, fixture.expected.terminalCommit, 'B_END state airtime commit');
  assertions.push({ id: 'broadcast-closure.explicit-terminal', status: 'PASS' });

  const badState = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const bad = time.commitBroadcastAirtime(badState, pending, fixture.input.nonMonotonic);
  equal(badState.broadcastAirtime, fixture.input.previous, 'non-monotonic must fail closed');
  assert(bad.timestamp === fixture.input.previous || bad.timestamp === badState.broadcastAirtime, 'non-monotonic result must remain previous');
  assertions.push({ id: 'broadcast-closure.non-monotonic-fail-closed', status: 'PASS' });

  const validIssues = structure.validateStructure(fixture.input.validEnvelope, pending);
  equal(validIssues.length, fixture.expected.validStructureIssues, `valid B_END structure: ${JSON.stringify(validIssues)}`);
  assertions.push({ id: 'broadcast-closure.structure-valid', status: 'PASS' });

  const quarantineIssues = structure.validateStructure(fixture.input.quarantinedEnvelope, pending);
  assert(quarantineIssues.length >= fixture.expected.quarantineMinimumIssues, 'quarantine fixture must produce structure issue');
  assert(quarantineIssues.some((x) => /반응 태그|reaction|COMMUNITY/i.test(String(x))), `quarantine issue attribution missing: ${JSON.stringify(quarantineIssues)}`);

  const quarantineState = { broadcastAirtime: fixture.input.previous, broadcastAirtimeStart: fixture.input.previous };
  const quarantineCommit = time.commitBroadcastAirtime(quarantineState, pending, fixture.input.quarantinedEnvelope);
  equal(quarantineCommit.timestamp, fixture.expected.terminalCommit, 'quarantined structure does not erase explicit terminal time control');
  assertions.push({ id: 'broadcast-closure.structure-quarantined-independent-of-terminal', status: 'PASS' });

  includes(source, 'Broadcast closure:', 'B_END closure diagnostic binding');
  includes(source, 'broadcastTerminalExplicit', 'B_END terminal diagnostic binding');
  includes(source, 'broadcastCommunityClean', 'B_END structure diagnostic binding');

  equal(assertions.length, 20, 'broadcast-closure expanded assertion count');
  return {
    coverage: 'HYBRID_TRANSITIONAL',
    status: 'PASS',
    assertions,
    subcoverage: fixture.expected.subcoverage,
    missingExecutableSurface: fixture.expected.missingExecutableSurface
  };
}
