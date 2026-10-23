'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../external-pr-adoption-owner.cjs');

const PACKET = 9001;
const PR = 4242;
const BASE = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const RUN = 7001;
const REQUIRED_JOB = 8002;
const PATHS = [
  'tools/example/package-lock.json',
  'tools/example/package.json',
].sort();

function packetBody({
  paths = PATHS,
  surfaces = ['surface:repo:external-pr-adoption:pr-' + PR],
  state = 'IN_PROGRESS',
  stage = 'IMPLEMENTATION_PR',
} = {}) {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '',
    '**State: ' + state + '**',
    '',
    '## Bounded write scope',
    '',
    ...paths.map((value) => '- `path:' + value + '`'),
    ...surfaces.map((value) => '- `' + value + '`'),
    '',
    '## Interaction stage',
    '',
    '- Current stage: `' + stage + '`',
    '- Completed stage(s): `AUTHORITY_SCOPE`',
    '- Next stage: `VALIDATION_MERGE`',
  ].join('\n');
}

function opsBody() {
  return [
    '## Canonical Operator Capsule',
    '- STATE: `CLEAR`',
    '- MAIN: `' + BASE + '` / Required PASS 1',
    '- CHANGE: none',
    '- WHY: healthy',
    '- NEXT: continue',
    '- AUTHORITY: protected main',
    '- UNKNOWN: NONE',
    '',
  ].join('\n');
}

function prObject(overrides = {}) {
  return {
    number: PR,
    state: 'open',
    draft: false,
    mergeable: true,
    created_at: '2026-10-21T17:00:00Z',
    base: {ref: 'main', sha: BASE},
    head: {
      ref: 'dependabot/example',
      sha: HEAD,
      repo: {full_name: owner.REPO},
    },
    ...overrides,
  };
}

function fixtureClient({
  packetCreatedAt = '2026-10-21T17:10:00Z',
  packetBodyValue = packetBody(),
  pr = prObject(),
  prFiles = PATHS,
  requiredConclusion = 'success',
  reviewState = null,
  strict = true,
  mergeStateStatus = 'CLEAN',
  compareStatus = 'ahead',
  compareMergeBase = BASE,
  compareAhead = 1,
  compareBehind = 0,
} = {}) {
  const calls = [];
  return {
    calls,
    async api(endpoint) {
      calls.push(['api', endpoint]);
      if (endpoint === '/issues/' + PACKET) {
        return {
          number: PACKET,
          state: 'open',
          created_at: packetCreatedAt,
          body: packetBodyValue,
        };
      }
      if (endpoint === '/branches/main') {
        return {commit: {sha: BASE}};
      }
      if (endpoint === '/issues/485') {
        return {number: 485, state: 'open', body: opsBody()};
      }
      if (endpoint === '/pulls/' + PR) return pr;
      if (endpoint === '/pulls/' + PR + '/files?per_page=100&page=1') {
        return prFiles.map((filename) => ({filename}));
      }
      if (endpoint === '/actions/runs?head_sha=' + HEAD + '&per_page=100') {
        return {
          total_count: 1,
          workflow_runs: [{
            id: RUN,
            name: 'SimCore CI',
            path: '.github/workflows/simcore-ci.yml',
            event: 'pull_request',
            head_sha: HEAD,
            status: 'completed',
            conclusion: requiredConclusion,
            pull_requests: [{number: PR}],
          }],
        };
      }
      if (endpoint === '/actions/runs/' + RUN + '/jobs?per_page=100') {
        return {
          total_count: 2,
          jobs: [
            {id: 8001, name: 'Verify', status: 'completed', conclusion: 'success'},
            {id: REQUIRED_JOB, name: 'Required', status: 'completed', conclusion: 'success'},
          ],
        };
      }
      if (endpoint === '/pulls/' + PR + '/reviews?per_page=100&page=1') {
        return reviewState ? [{
          id: 1,
          submitted_at: '2026-10-21T17:05:00Z',
          state: reviewState,
          user: {login: 'reviewer'},
        }] : [];
      }
      if (endpoint === '/issues/' + PR + '/comments?per_page=100&page=1') return [];
      if (endpoint === '/pulls/' + PR + '/comments?per_page=100&page=1') return [];
      if (endpoint === '/pulls/' + PR + '/requested_reviewers?per_page=100') {
        return {users: [], teams: []};
      }
      if (endpoint === '/branches/main/protection/required_status_checks') {
        return {strict};
      }
      if (endpoint === '/compare/' + BASE + '...' + HEAD) {
        return {
          status: compareStatus,
          ahead_by: compareAhead,
          behind_by: compareBehind,
          base_commit: {sha: BASE},
          merge_base_commit: {sha: compareMergeBase},
        };
      }
      throw new Error('unexpected endpoint: ' + endpoint);
    },
    async graphql(query) {
      calls.push(['graphql', query.includes('reviewThreads')
        ? 'reviewThreads' : 'strictCurrentness']);
      if (query.includes('reviewThreads')) {
        return {
          data: {
            repository: {
              pullRequest: {
                reviewThreads: {
                  pageInfo: {hasNextPage: false},
                  nodes: [],
                },
              },
            },
          },
        };
      }
      if (query.includes('mergeStateStatus')) {
        return {
          data: {
            repository: {
              pullRequest: {
                number: PR,
                headRefOid: HEAD,
                baseRefOid: BASE,
                mergeStateStatus,
              },
            },
          },
        };
      }
      throw new Error('unexpected graphql query');
    },
  };
}

test('adopts an already-existing exact PR into a canonical IMPLEMENTATION_PR receipt', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient(),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.prNumber, PR);
  assert.equal(result.headSha, HEAD);
  assert.equal(result.baseSha, BASE);
  assert.deepEqual(result.paths, PATHS);
  assert.equal(result.provenance, 'ADOPTED_EXISTING_EXTERNAL_PR');
  assert.equal(result.candidateCreatedByPacket, false);
  assert.equal(result.candidatePublishedByPacket, false);
  assert.equal(result.receipt.status, 'PASS');
  assert.equal(result.receipt.stage, 'IMPLEMENTATION_PR');
  assert.equal(result.receipt.nextLegalAction, 'VALIDATION_MERGE');
  assert.deepEqual(result.receipt.scope.paths, PATHS);
  assert.deepEqual(
    result.receipt.proof.map((row) => row.term),
    ['IMPLEMENTED', 'CONTRACT_PROVEN'],
  );
  const prRef = result.receipt.authorityRefs.find((row) => row.kind === 'PR');
  assert.equal(prRef.locator, 'pr:#' + PR);
  assert.equal(prRef.identity, HEAD);
  assert.ok(!result.receipt.proof.some((row) => (
    row.term === 'LIVE_PROVEN' || row.term === 'DONE'
  )));
});

test('requires the external PR to predate the adoption packet', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({
      packetCreatedAt: '2026-10-21T16:59:59Z',
    }),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('EXTERNAL_PR_MUST_PREDATE_PACKET'));
});

test('rejects broad path scopes', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({
      packetBodyValue: packetBody({paths: ['tools/example/**']}),
    }),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('ADOPTION_BROAD_PATH_SCOPE_FORBIDDEN'));
});

test('rejects missing or multiple adoption surfaces', async () => {
  const missing = await owner.inspectWithClient({
    client: fixtureClient({
      packetBodyValue: packetBody({surfaces: ['surface:repo:other']}),
    }),
    packetNumber: PACKET,
  });
  assert.equal(missing.status, 'BLOCKED');
  assert.ok(missing.reasonCodes.includes('ADOPTION_SURFACE_INVALID'));

  const multiple = await owner.inspectWithClient({
    client: fixtureClient({
      packetBodyValue: packetBody({
        surfaces: [
          'surface:repo:external-pr-adoption:pr-' + PR,
          'surface:repo:external-pr-adoption:pr-9999',
        ],
      }),
    }),
    packetNumber: PACKET,
  });
  assert.equal(multiple.status, 'CONFLICT');
  assert.ok(multiple.reasonCodes.includes('ADOPTION_SURFACE_COUNT_INVALID'));
});

test('rejects exact path mismatch', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({
      prFiles: ['tools/example/package-lock.json'],
    }),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'CONFLICT');
  assert.ok(result.reasonCodes.includes('PR_CHANGED_FILES_SCOPE_MISMATCH'));
});

test('preserves exact-head Required failure', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({requiredConclusion: 'failure'}),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'FAIL');
  assert.ok(result.reasonCodes.includes('REQUIRED_RUN_FAILED'));
});

test('preserves review barrier failure', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({reviewState: 'CHANGES_REQUESTED'}),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('REVIEW_CHANGES_REQUESTED'));
});

test('preserves strict-currentness failure', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({mergeStateStatus: 'BEHIND'}),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.reasonCodes.includes('PR_HEAD_BEHIND_STRICT_BASE'));
});

test('allows non-strict protection without inventing currentness proof', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({strict: false}),
    packetNumber: PACKET,
  });
  assert.equal(result.status, 'PASS');
  const gate = result.receipt.requiredGates.find(
    (row) => row.name === 'strict-currentness');
  assert.equal(gate.result, 'NOT_APPLICABLE');
});

test('CLI does not accept caller-selected PR, repo, head or base', () => {
  assert.throws(
    () => owner.parseArgs(['inspect', '--packet', '#1', '--pr', '2']),
    /ARGUMENT_INVALID/,
  );
  assert.throws(
    () => owner.parseArgs(['inspect', '--packet', '#1', '--repo', 'x/y']),
    /ARGUMENT_INVALID/,
  );
  assert.throws(
    () => owner.parseArgs(['inspect', '--packet', '#1', '--head', HEAD]),
    /ARGUMENT_INVALID/,
  );
  assert.throws(
    () => owner.parseArgs(['inspect', '--packet', '#1', '--base', BASE]),
    /ARGUMENT_INVALID/,
  );
});

test('diff identity is deterministic and binds base/head/paths', () => {
  const a = owner.adoptionDiffIdentity(BASE, HEAD, PATHS);
  const b = owner.adoptionDiffIdentity(BASE, HEAD, [...PATHS].reverse());
  const c = owner.adoptionDiffIdentity(BASE, 'c'.repeat(40), PATHS);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('owner source is read-only and contains no merge or mutation transport', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '../external-pr-adoption-owner.cjs'), 'utf8');
  assert.doesNotMatch(source, /pulls\/.*\/merge/);
  assert.doesNotMatch(source, /--method|\bPATCH\b|\bPOST\b|\bPUT\b|\bDELETE\b/);
  assert.doesNotMatch(source, /workflow_dispatch|update-ref|force-with-lease/);
  assert.match(source, /readCurrentMain/);
  assert.match(source, /readOpenPr/);
  assert.match(source, /readRequiredEvidence/);
  assert.match(source, /readReviewBarrier/);
  assert.match(source, /readStrictProtection/);
  assert.match(source, /projectStageReceipt/);
});
