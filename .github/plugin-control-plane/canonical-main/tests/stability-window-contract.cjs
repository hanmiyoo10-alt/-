'use strict';

const assert = require('assert');
const {loadPolicy} = require('../contract.cjs');
const {
  metricsFromTransitions,
  metricsMarker,
  parseIncidentMetrics,
  advanceIncidentMetrics,
  latestQualifyingFlapAt,
  unstableAttention,
} = require('../domains/incident-metrics.cjs');

const policy = loadPolicy();
assert.equal(policy.stability.flapThreshold, 3);
assert.equal(policy.stability.flapWindowSeconds, 300);
assert.equal(policy.stability.flapQuietSeconds, 300);

const flappyTransitions = [
  {state: 'OPEN', observedAt: '2026-08-27T08:00:00Z'},
  {state: 'RECOVERED', observedAt: '2026-08-27T08:01:00Z'},
  {state: 'OPEN', observedAt: '2026-08-27T08:02:00Z'},
  {state: 'RECOVERED', observedAt: '2026-08-27T08:03:00Z'},
];
const metrics = metricsFromTransitions(flappyTransitions);
assert.equal(metrics.schemaVersion, 2);
assert.deepEqual(
  {openCount: metrics.openCount, recoveryCount: metrics.recoveryCount, flapCount: metrics.flapCount},
  {openCount: 2, recoveryCount: 2, flapCount: 1},
  'cumulative diagnostic counts remain independent of recent instability threshold',
);
assert.equal(metrics.recentTransitions.length, 4);
assert.equal(latestQualifyingFlapAt(metrics, 3, 300), '2026-08-27T08:03:00Z');
assert.deepEqual(parseIncidentMetrics(`x\n${metricsMarker(metrics)}`), metrics);

const recoveredFlappy = {
  state: 'RECOVERED', severity: 'P1', metrics,
  issue: {number: 77, title: '[repo-incident:P1] example'},
};
assert.equal(
  unstableAttention([recoveredFlappy], policy, Date.parse('2026-08-27T08:03:30Z'))[0].reasonCode,
  'UNSTABLE_COMPONENT',
  'three alternating transitions inside the configured window enter P2 attention',
);
assert.equal(
  unstableAttention([recoveredFlappy], policy, Date.parse('2026-08-27T08:08:01Z')).length,
  0,
  'quiet-window hysteresis automatically clears recovered instability',
);

const historicalOnly = {
  schemaVersion: 1,
  openCount: 99,
  recoveryCount: 98,
  flapCount: 98,
  lastTransitionAt: '2026-08-27T08:03:00Z',
};
assert.equal(
  unstableAttention([{...recoveredFlappy, metrics: historicalOnly}], policy, Date.parse('2026-08-27T08:03:30Z')).length,
  0,
  'historical cumulative flap count without recent-window evidence must not poison current attention',
);

const legacyMarker = `<!-- canonical-main-incident-metrics:${Buffer.from(JSON.stringify(historicalOnly), 'utf8').toString('base64url')} -->`;
const legacyBody = `- State: **OPEN**\n${legacyMarker}`;
assert.equal(parseIncidentMetrics(legacyBody).schemaVersion, 1, 'schema-v1 markers remain readable');
const migrated = advanceIncidentMetrics(
  legacyBody,
  [
    {state: 'OPEN', observedAt: '2026-08-27T08:02:00Z'},
    {state: 'RECOVERED', observedAt: '2026-08-27T08:03:00Z'},
  ],
  'RECOVERED',
  '2026-08-27T08:03:00Z',
);
assert.equal(migrated.schemaVersion, 2);
assert.equal(migrated.openCount, 99);
assert.equal(migrated.recoveryCount, 99);
assert.equal(migrated.flapCount, 98);
assert.deepEqual(migrated.recentTransitions.map((row) => row.state), ['OPEN', 'RECOVERED']);

const openP1 = {...recoveredFlappy, state: 'OPEN', severity: 'P1'};
assert.equal(unstableAttention([openP1], policy, Date.parse('2026-08-27T08:03:30Z')).length, 0, 'real open P0/P1 outranks duplicate P2 unstable attention');

const manyTransitions = Array.from({length: 20}, (_, index) => ({
  state: index % 2 === 0 ? 'OPEN' : 'RECOVERED',
  observedAt: new Date(Date.parse('2026-08-27T08:00:00Z') + index * 10000).toISOString(),
}));
assert.equal(metricsFromTransitions(manyTransitions).recentTransitions.length, 12, 'recent evidence remains bounded');

console.log('CANONICAL_MAIN_STABILITY_WINDOW_CONTRACT:OK');
