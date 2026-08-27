'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const {
  ANCHOR_END,
  ANCHOR_START,
  executeAnchorAdvance,
  parseAnchorMarker,
  planAnchorAdvance,
  renderAnchorMarker,
} = require('../main-delta-anchor.cjs');

const A = '1111111111111111111111111111111111111111';
const B = '2222222222222222222222222222222222222222';
const C = '3333333333333333333333333333333333333333';

function state(overrides = {}) {
  return {
    schemaVersion: 1,
    scope: 'canonical-main',
    anchorSha: A,
    generation: 4,
    advancedFrom: null,
    advanceReason: 'INITIALIZED_FROM_EXPLICIT_USER_VISIBLE_MAIN_BRIEF',
    sourceRefs: ['issue:#293', `commit:${A}`],
    ...overrides,
  };
}

function bodyFor(anchorState = state()) {
  return `# Anchor\n\n${renderAnchorMarker(anchorState)}\n\nFooter\n`;
}

function assertBlocked(plan, code) {
  assert.equal(plan.status, 'ANCHOR_ADVANCE_BLOCKED');
  assert.equal(plan.changed, false);
  assert.equal(plan.issueMutationAuthorized, false);
  assert.equal(plan.mainMutationAuthorized, false);
  assert(plan.reasonCodes.some((entry) => entry === code || entry.startsWith(`${code}:`)), `${code} missing from ${plan.reasonCodes.join(',')}`);
}

async function main() {
  const initialBody = bodyFor();
  const parsed = parseAnchorMarker(initialBody);
  assert.equal(parsed.error, null);
  assert.deepEqual(parsed.state, state());
  assert.equal(renderAnchorMarker(parsed.state), initialBody.slice(initialBody.indexOf(ANCHOR_START), initialBody.indexOf(ANCHOR_END) + ANCHOR_END.length));

  const missing = parseAnchorMarker('# no marker');
  assert.equal(missing.error, 'ANCHOR_MARKER_MISSING');

  const duplicate = parseAnchorMarker(`${initialBody}\n${renderAnchorMarker(state())}\n`);
  assert.equal(duplicate.error, 'ANCHOR_MARKER_COUNT_INVALID');

  const malformed = parseAnchorMarker(`${ANCHOR_START}\n\`\`\`json\n{ nope }\n\`\`\`\n${ANCHOR_END}`);
  assert.equal(malformed.error, 'ANCHOR_JSON_INVALID');

  const invalidState = parseAnchorMarker(`${ANCHOR_START}\n\`\`\`json\n${JSON.stringify({ ...state(), anchorSha: 'bad' }, null, 2)}\n\`\`\`\n${ANCHOR_END}`);
  assert.equal(invalidState.error, 'ANCHOR_STATE_INVALID');
  assert(invalidState.validationErrors.includes('ANCHOR_SHA_INVALID'));

  const ready = planAnchorAdvance({
    body: initialBody,
    expectedAnchorSha: A,
    targetMainSha: B,
    observedMainSha: B,
    compareStatus: 'ahead',
    reason: 'EXPLICIT_BRIEF_DELIVERED',
  });
  assert.equal(ready.status, 'ANCHOR_ADVANCE_READY');
  assert.equal(ready.changed, true);
  assert.equal(ready.issueMutationAuthorized, true);
  assert.equal(ready.mainMutationAuthorized, false);
  assert.equal(ready.anchorSha, B);
  assert.equal(ready.generation, 5);
  const advanced = parseAnchorMarker(ready.updatedBody);
  assert.equal(advanced.error, null);
  assert.equal(advanced.state.anchorSha, B);
  assert.equal(advanced.state.advancedFrom, A);
  assert.equal(advanced.state.generation, 5);
  assert.equal(advanced.state.advanceReason, 'EXPLICIT_BRIEF_DELIVERED');
  assert(advanced.state.sourceRefs.includes(`commit:${B}`));

  assertBlocked(planAnchorAdvance({
    body: initialBody,
    expectedAnchorSha: C,
    targetMainSha: B,
    observedMainSha: B,
    compareStatus: 'ahead',
  }), 'ANCHOR_CAS_STALE_EXPECTATION');

  assertBlocked(planAnchorAdvance({
    body: initialBody,
    expectedAnchorSha: A,
    targetMainSha: B,
    observedMainSha: C,
    compareStatus: 'ahead',
  }), 'ANCHOR_TARGET_NOT_CURRENT_MAIN');

  for (const compareStatus of ['behind', 'diverged', null]) {
    assertBlocked(planAnchorAdvance({
      body: initialBody,
      expectedAnchorSha: A,
      targetMainSha: B,
      observedMainSha: B,
      compareStatus,
    }), 'ANCHOR_FORWARD_COMPARE_REJECTED');
  }

  const noopBody = bodyFor(state({ anchorSha: B, generation: 9, advancedFrom: A }));
  const noop = planAnchorAdvance({
    body: noopBody,
    expectedAnchorSha: B,
    targetMainSha: B,
    observedMainSha: B,
    compareStatus: 'identical',
  });
  assert.equal(noop.status, 'ANCHOR_ADVANCE_NOOP');
  assert.equal(noop.changed, false);
  assert.equal(noop.generation, 9);

  const calls = [];
  let liveBody = initialBody;
  const client = {
    api: async (endpoint, options = {}) => {
      calls.push({ endpoint, method: options.method || 'GET' });
      if (endpoint === '/issues/562' && (!options.method || options.method === 'GET')) return { number: 562, state: 'open', body: liveBody };
      if (endpoint === '/branches/main') return { commit: { sha: B } };
      if (endpoint === `/compare/${A}...${B}`) return { status: 'ahead' };
      if (endpoint === '/issues/562' && options.method === 'PATCH') {
        liveBody = options.body.body;
        return { number: 562, state: 'open', body: liveBody };
      }
      throw new Error(`unexpected endpoint ${options.method || 'GET'} ${endpoint}`);
    },
  };

  const executed = await executeAnchorAdvance({
    client,
    issueNumber: 562,
    expectedAnchorSha: A,
    targetMainSha: B,
    reason: 'EXPLICIT_BRIEF_DELIVERED',
  });
  assert.equal(executed.status, 'ANCHOR_ADVANCE_UPDATED');
  assert.equal(executed.changed, true);
  const live = parseAnchorMarker(liveBody);
  assert.equal(live.error, null);
  assert.equal(live.state.anchorSha, B);
  assert.equal(live.state.generation, 5);
  assert(calls.some((entry) => entry.endpoint === '/issues/562' && entry.method === 'PATCH'));
  assert.equal(calls.some((entry) => /\/git\/refs|\/contents|\/releases/.test(entry.endpoint)), false, 'anchor controller must not touch refs, contents, or releases');

  let issueReads = 0;
  const raceClient = {
    api: async (endpoint, options = {}) => {
      if (endpoint === '/issues/562' && (!options.method || options.method === 'GET')) {
        issueReads += 1;
        return { number: 562, state: 'open', body: issueReads === 1 ? initialBody : `${initialBody}\nexternal edit\n` };
      }
      if (endpoint === '/branches/main') return { commit: { sha: B } };
      if (endpoint === `/compare/${A}...${B}`) return { status: 'ahead' };
      if (options.method === 'PATCH') throw new Error('PATCH must not occur after issue barrier mismatch');
      throw new Error(`unexpected endpoint ${options.method || 'GET'} ${endpoint}`);
    },
  };
  const race = await executeAnchorAdvance({ client: raceClient, issueNumber: 562, expectedAnchorSha: A, targetMainSha: B });
  assertBlocked(race, 'ANCHOR_ISSUE_CHANGED_BEFORE_WRITE');

  let mainReads = 0;
  const mainRaceClient = {
    api: async (endpoint, options = {}) => {
      if (endpoint === '/issues/562' && (!options.method || options.method === 'GET')) return { number: 562, state: 'open', body: initialBody };
      if (endpoint === '/branches/main') {
        mainReads += 1;
        return { commit: { sha: mainReads === 1 ? B : C } };
      }
      if (endpoint === `/compare/${A}...${B}`) return { status: 'ahead' };
      if (options.method === 'PATCH') throw new Error('PATCH must not occur after main barrier mismatch');
      throw new Error(`unexpected endpoint ${options.method || 'GET'} ${endpoint}`);
    },
  };
  const mainRace = await executeAnchorAdvance({ client: mainRaceClient, issueNumber: 562, expectedAnchorSha: A, targetMainSha: B });
  assertBlocked(mainRace, 'ANCHOR_MAIN_CHANGED_BEFORE_WRITE');

  const workflow = readFileSync('.github/workflows/canonical-main-delta-anchor.yml', 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /issues:\s*write/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /group:\s*canonical-main-delta-anchor/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /main-delta-anchor\.cjs advance/);
  assert.doesNotMatch(workflow, /^\s*push:/m, 'anchor advancement must not auto-trigger on push');
  assert.doesNotMatch(workflow, /contents:\s*write/, 'anchor workflow must not have contents write');

  console.log('MAIN_DELTA_ANCHOR_CONTRACT:PASS');
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
