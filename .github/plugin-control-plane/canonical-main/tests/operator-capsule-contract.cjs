'use strict';

const assert = require('assert');
const {renderAnchorMarker} = require('../main-delta-anchor.cjs');
const mainDelta = require('../observers/main-delta.cjs');
const {renderSummary, topOperationalReason, unknownEvidence} = require('../surfaces/summary.cjs');

const anchorSha = 'a'.repeat(40);
const mainSha = 'b'.repeat(40);
const anchorBody = renderAnchorMarker({
  schemaVersion: 1,
  scope: 'canonical-main',
  anchorSha,
  generation: 7,
  advancedFrom: null,
  advanceReason: 'EXPLICIT_BRIEF_DELIVERED',
  sourceRefs: ['issue:#562'],
});

function issue(body = anchorBody) {
  return {number: 562, state: 'open', body};
}

function snapshot(overrides = {}) {
  const base = {
    operatorState: 'CLEAR',
    observedMainSha: mainSha,
    observedAt: '2026-08-27T09:10:00Z',
    convergence: {state: 'STABLE', waitingFor: [], ageSeconds: 0, stale: false},
    observations: {
      requiredCi: {known: true, summary: 'PASS — run 42'},
      productionAuthority: {known: true, summary: 'MATCH — release-simcore abc'},
      writers: {known: true, summary: 'PASS'},
      bootstrap: {known: true, summary: 'PASS'},
      projectStatus: {known: true, summary: 'FRESH'},
      mainDelta: {known: true, summary: 'HIGH — 2 commit(s) / 2 file(s)', data: {state: 'OK', anchorSha, headSha: mainSha, commitCount: 2, fileCount: 2, riskLevel: 'HIGH', actionRequired: true, actionCode: 'REVIEW_CHANGED_GOVERNANCE_PATHS'}},
      protection: {known: true, data: {state: 'READY_TO_ACTIVATE', protected: false, softEnforcementEnabled: true}},
      delivery: {known: true, data: {health: 'HEALTHY'}},
    },
    incidents: {active: [], attention: []},
    freshness: {configuredCoverageComplete: true, observationCoverageValid: true, projectStatusFresh: true, valid: true},
    policy: {notifications: {bridgeState: 'ACTIVE_PROVEN'}},
  };
  return {...base, ...overrides, observations: {...base.observations, ...(overrides.observations || {})}, incidents: {...base.incidents, ...(overrides.incidents || {})}, freshness: {...base.freshness, ...(overrides.freshness || {})}};
}

(async () => {
  const calls = [];
  const observed = await mainDelta.observe({
    allIssues: [issue()],
    mainSha,
    client: {api: async (path, options) => {
      calls.push({path, options});
      return {
        status: 'ahead',
        ahead_by: 2,
        commits: [
          {sha: 'c'.repeat(40), commit: {message: 'docs: promote canonical-main generated documentation (#99)'}},
          {sha: 'd'.repeat(40), commit: {message: 'ci: change workflow'}},
        ],
        files: [{filename: 'docs/NOTE.md'}, {filename: '.github/workflows/example.yml'}],
      };
    }},
  });
  assert.equal(observed.known, true);
  assert.equal(observed.data.generation, 7);
  assert.equal(observed.data.commitCount, 2);
  assert.equal(observed.data.meaningfulCommitCount, 1);
  assert.equal(observed.data.routineGeneratedDocCommitCount, 1);
  assert.equal(observed.data.fileCount, 2);
  assert.equal(observed.data.riskLevel, 'HIGH');
  assert.equal(observed.data.actionCode, 'REVIEW_CHANGED_GOVERNANCE_PATHS');
  assert(observed.data.riskDrivers.includes('.github/workflows/example.yml'));
  assert.deepEqual(calls, [{path: `/compare/${anchorSha}...${mainSha}`, options: undefined}], 'Q1 delta observation must be read-only compare access');

  const noChange = await mainDelta.observe({allIssues: [issue(renderAnchorMarker({schemaVersion: 1, scope: 'canonical-main', anchorSha: mainSha, generation: 8, advancedFrom: anchorSha, advanceReason: 'EXPLICIT_BRIEF_DELIVERED', sourceRefs: []}))], mainSha, client: {api: async () => { throw new Error('compare must not run for identical anchor'); }}});
  assert.equal(noChange.known, true);
  assert.equal(noChange.data.riskLevel, 'NONE');
  assert.equal(noChange.data.actionCode, 'NONE');
  assert.equal(noChange.data.commitCount, 0);
  assert.equal(noChange.data.meaningfulCommitCount, 0);
  assert.equal(noChange.data.routineGeneratedDocCommitCount, 0);

  const divergent = await mainDelta.observe({allIssues: [issue()], mainSha, client: {api: async () => ({status: 'diverged', ahead_by: 1, files: []})}});
  assert.equal(divergent.known, false);
  assert.equal(divergent.data.reasonCode, 'MAIN_DELTA_COMPARE_NOT_AHEAD');
  const duplicateAnchor = await mainDelta.observe({allIssues: [issue(), {...issue(), number: 999}], mainSha, client: {api: async () => ({})}});
  assert.equal(duplicateAnchor.known, false);
  assert.equal(duplicateAnchor.data.reasonCode, 'MAIN_DELTA_ANCHOR_CARDINALITY');

  const clear = snapshot({observations: {mainDelta: observed}});
  const rendered = renderSummary(clear);
  const visible = rendered.split('\n<!-- canonical-main-summary-compat:v1')[0].trim().split('\n');
  assert.equal(visible.length, 8, 'default capsule must remain heading + exactly seven compact fields');
  for (const label of ['STATE', 'MAIN', 'CHANGE', 'WHY', 'NEXT', 'AUTHORITY', 'UNKNOWN']) assert(visible.some((line) => line.startsWith(`- ${label}:`)), `missing capsule field ${label}`);
  assert.match(rendered, /- STATE: `CLEAR`/);
  assert.match(rendered, /- CHANGE: HIGH — 2 total commit\(s\) \(1 meaningful \+ 1 routine generated-doc\) \/ 2 file\(s\)/);
  assert.match(rendered, /- WHY: `NONE`/);
  assert.match(rendered, /- NEXT: `REVIEW_CHANGED_GOVERNANCE_PATHS`/);
  assert.match(rendered, /native protection `READY_TO_ACTIVATE` \/ protected `false`/);
  assert.match(rendered, /soft fallback `ACTIVE`/);
  assert.match(rendered, /- UNKNOWN: NONE/);

  const incidentSnapshot = snapshot({
    incidents: {active: [{severity: 'P1', reasonCode: 'REQUIRED_CHECK_FAILED', issue: {number: 502, body: '- Reason: `REQUIRED_CHECK_FAILED`\n', labels: [{name: 'scope:repo'}]}}]},
  });
  assert.deepEqual(topOperationalReason(incidentSnapshot), {why: 'REQUIRED_CHECK_FAILED #502', next: 'REVIEW_REQUIRED_CHECK_FAILURE'});
  assert.match(renderSummary(incidentSnapshot), /- WHY: `REQUIRED_CHECK_FAILED` — evidence `issue:#502`, `severity:P1` — owner `scope:repo`/);
  assert.match(renderSummary(incidentSnapshot), /- NEXT: `REVIEW_REQUIRED_CHECK_FAILURE`/);
  assert.doesNotMatch(renderSummary(incidentSnapshot), /- NEXT: `REVIEW_CHANGED_GOVERNANCE_PATHS`/, 'blocked NEXT must outrank change-only NEXT');

  const authoritySnapshot = snapshot({
    incidents: {active: [{severity: 'P0', reasonCode: 'RELEASE_AUTHORITY_IDENTITY_MISMATCH', issue: {number: 637, labels: [{name: 'plugin:simcore'}]}}]},
  });
  assert.match(renderSummary(authoritySnapshot), /- NEXT: `REVIEW_PRODUCTION_AUTHORITY_MISMATCH`/);

  const attentionSnapshot = snapshot({incidents: {attention: [{severity: 'P2', reasonCode: 'UNSTABLE_COMPONENT', issue: {number: 437, labels: [{name: 'scope:repo'}]}}]}});
  assert.deepEqual(topOperationalReason(attentionSnapshot), {why: 'UNSTABLE_COMPONENT #437', next: 'REVIEW_CURRENT_ATTENTION'});
  assert.match(renderSummary(attentionSnapshot), /- WHY: `UNSTABLE_COMPONENT` — evidence `issue:#437`, `severity:P2` — owner `scope:repo`/);
  assert.match(renderSummary(attentionSnapshot), /- NEXT: `REVIEW_CURRENT_ATTENTION`/);

  const settlingSnapshot = snapshot({convergence: {state: 'SETTLING', waitingFor: ['requiredCi'], ageSeconds: 30, stale: false}});
  assert.deepEqual(topOperationalReason(settlingSnapshot), {why: 'EVIDENCE_SETTLING', next: 'WAIT_FOR_CURRENT_EVIDENCE'});
  assert.match(renderSummary(settlingSnapshot), /- WHY: `EVIDENCE_SETTLING` — evidence `observation:requiredCi` — owner `scope:repo`/);
  assert.match(renderSummary(settlingSnapshot), /- NEXT: `WAIT_FOR_CURRENT_EVIDENCE`/);
  assert.doesNotMatch(renderSummary(settlingSnapshot), /- NEXT: `REVIEW_CHANGED_GOVERNANCE_PATHS`/, 'settling evidence must outrank delta review');

  const unknownSnapshot = snapshot({
    operatorState: 'UNKNOWN',
    observations: {
      mainDelta: {known: false, summary: 'UNKNOWN — anchor invalid', data: {state: 'UNKNOWN'}},
      extraA: {known: false}, extraB: {known: false}, extraC: {known: false}, extraD: {known: false},
    },
    freshness: {valid: false},
  });
  assert.match(renderSummary(unknownSnapshot), /- CHANGE: UNKNOWN — anchor invalid/);
  assert.match(unknownEvidence(unknownSnapshot), /\(\+1 more\)$/);
  assert.match(renderSummary(unknownSnapshot), /- NEXT: `WAIT_FOR_CURRENT_EVIDENCE`/);

  console.log('CANONICAL_MAIN_OPERATOR_CAPSULE_CONTRACT:OK');
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
