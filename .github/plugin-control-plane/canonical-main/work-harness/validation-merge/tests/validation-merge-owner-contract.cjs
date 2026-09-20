'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '../../../../../..');
const owner = require('../validation-merge-owner.cjs');
const stageReceipt = require('../../stage-receipt.cjs');
const agentView = require('../../agent-decision-view.cjs');
const scopeOverlap = require('../../../work-system/scope-overlap.cjs');

const PACKET = 2586;
const PR = 3000;
const BASE = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);
const MERGE = 'c'.repeat(40);
const TICK = String.fromCharCode(96);
const PATHS = [
  '.github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-merge/README.md',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-merge/tests/validation-merge-owner-contract.cjs',
  '.github/plugin-control-plane/canonical-main/work-harness/validation-merge/validation-merge-owner.cjs',
  '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs',
].sort();
const SCOPES = [...PATHS.map((value) => 'path:' + value), 'surface:repo:validation-merge-projection'];

function packetBody(paths = PATHS, state = 'IN_PROGRESS', stage = 'VALIDATION_MERGE') {
  return [
    '<!-- canonical-main-work-packet:v1 -->',
    '## State',
    TICK + state + TICK,
    '## Bounded implementation write scope',
    ...paths.map((value, index) => (index + 1) + '. ' + TICK + 'path:' + value + TICK),
    '6. ' + TICK + 'surface:repo:validation-merge-projection' + TICK,
    '## Interaction stage',
    '- Current stage: ' + TICK + stage + TICK,
  ].join('\n');
}

function opsBody(main = BASE, overrides = {}) {
  const state = overrides.state || 'CLEAR';
  const required = overrides.required || 'PASS — run 42';
  const unknown = overrides.unknown || 'NONE';
  return [
    '# Canonical Main — Operations View',
    '',
    '## Canonical Operator Capsule',
    '- STATE: ' + TICK + state + TICK,
    '- MAIN: ' + TICK + main + TICK + ' / Required ' + required,
    '- CHANGE: HIGH — fixture',
    '- WHY: NONE',
    '- NEXT: REVIEW_CHANGED_GOVERNANCE_PATHS',
    '- AUTHORITY: Production MATCH',
    '- UNKNOWN: ' + unknown,
    '',
  ].join('\n');
}

function implementationReceipt(overrides = {}) {
  const input = {
    schemaVersion: 1,
    packetNumber: PACKET,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'GIT_REF', locator: 'refs/heads/main', identity: BASE},
      {kind: 'PR', locator: 'pr:#' + PR, identity: HEAD},
      {kind: 'COMMIT', locator: 'commit:' + HEAD, identity: HEAD},
    ],
    requiredGates: [
      {name: 'focused-contracts', result: 'PASS', evidenceLocator: 'local:test'},
    ],
    scope: {
      paths: PATHS,
      diffRequired: true,
      diffIdentity: 'd'.repeat(64),
      diffEvidenceLocator: 'commit:' + HEAD,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + HEAD},
      {term: 'CONTRACT_PROVEN', evidenceLocator: 'local:test'},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
    ...overrides,
  };
  return stageReceipt.projectStageReceipt(input);
}

function prObject(overrides = {}) {
  return {
    number: PR,
    state: 'open',
    draft: false,
    mergeable: true,
    merged_at: null,
    merge_commit_sha: null,
    base: {ref: 'main', sha: BASE},
    head: {ref: 'server/mcl-packet-2586', sha: HEAD, repo: {full_name: owner.REPO}},
    ...overrides,
  };
}

function emptyThreads(nodes = []) {
  return {
    data: {
      repository: {
        pullRequest: {
          reviewThreads: {pageInfo: {hasNextPage: false}, nodes},
        },
      },
    },
  };
}

function fixtureClient(options = {}) {
  const calls = [];
  let branchReads = 0;
  let packetReads = 0;
  let prReads = 0;
  let overlapIssueReads = 0;
  const otherPacket = {
    number: 9901,
    state: 'open',
    body: [
      '<!-- canonical-main-work-packet:v1 -->',
      '## State',
      TICK + 'IN_PROGRESS' + TICK,
      '## Bounded write scope',
      '1. ' + TICK + 'path:docs/**' + TICK,
    ].join('\n'),
  };
  const client = {
    calls,
    async api(endpoint) {
      calls.push(endpoint);
      if (endpoint === '/branches/main') {
        branchReads += 1;
        const sha = options.branchSequence?.[branchReads - 1] || BASE;
        return {commit: {sha}};
      }
      if (endpoint === '/issues/485') {
        return {state: 'open', body: options.opsBody || opsBody()};
      }
      if (endpoint === '/issues/' + PACKET) {
        packetReads += 1;
        const body = options.packetSequence?.[packetReads - 1]
          || options.packetBody || packetBody();
        return {number: PACKET, state: 'open', body};
      }
      if (endpoint === '/pulls/' + PR) {
        prReads += 1;
        if (options.finalizePr) return options.finalizePr;
        const value = options.prSequence?.[prReads - 1] || options.pr || prObject();
        return value;
      }
      if (endpoint.startsWith('/pulls/' + PR + '/files?')) {
        return (options.prFiles || PATHS).map((filename) => ({filename}));
      }
      if (endpoint.startsWith('/pulls/' + PR + '/reviews?')) {
        return options.reviews || [];
      }
      if (endpoint.startsWith('/issues/' + PR + '/comments?')) {
        return options.issueComments || [];
      }
      if (endpoint.startsWith('/pulls/' + PR + '/comments?')) {
        return options.reviewComments || [];
      }
      if (endpoint.startsWith('/pulls/' + PR + '/requested_reviewers?')) {
        return options.requested || {users: [], teams: []};
      }
      if (endpoint === '/actions/runs?head_sha=' + HEAD + '&per_page=100') {
        const runs = options.runs || [{
          id: 501,
          name: 'SimCore CI',
          path: '.github/workflows/simcore-ci.yml',
          event: 'pull_request',
          head_sha: HEAD,
          status: 'completed',
          conclusion: 'success',
          pull_requests: [{number: PR}],
        }];
        return {total_count: runs.length, workflow_runs: runs};
      }
      if (endpoint === '/actions/runs/501/jobs?per_page=100') {
        const jobs = options.jobs || [
          {id: 601, name: 'Verify', status: 'completed', conclusion: 'success'},
          {id: 602, name: 'Required', status: 'completed', conclusion: 'success'},
        ];
        return {total_count: jobs.length, jobs};
      }
      if (endpoint.startsWith('/issues?state=open&per_page=100&page=')) {
        const page = Number(new URL('https://x' + endpoint).searchParams.get('page'));
        if (page !== 1) return [];
        overlapIssueReads += 1;
        const rows = [
          {number: PACKET, state: 'open', body: options.packetBody || packetBody()},
          otherPacket,
        ];
        if (options.lateOverlapPacket && overlapIssueReads >= 2) rows.push(options.lateOverlapPacket);
        return rows;
      }
      if (endpoint.startsWith('/pulls?state=open&per_page=100&page=')) {
        const page = Number(new URL('https://x' + endpoint).searchParams.get('page'));
        return page === 1 ? [prObject(), {
          number: 9902,
          state: 'open',
          base: {ref: 'main', sha: BASE},
          head: {ref: 'server/other', sha: 'e'.repeat(40), repo: {full_name: owner.REPO}},
        }] : [];
      }
      if (endpoint.startsWith('/pulls/9902/files?')) {
        return [{filename: 'docs/unrelated.md'}];
      }
      throw new Error('unexpected endpoint ' + endpoint);
    },
    async graphql() {
      if (options.graphqlError) throw new Error('fixture graphql error');
      return options.threads || emptyThreads();
    },
  };
  return client;
}

test('CLI exposes only inspect/finalize and bounded fixed arguments', () => {
  assert.equal(owner.parseArgs([
    'inspect', '--packet', '#2586', '--pr', '3000',
    '--implementation-receipt-file', '/tmp/receipt.json',
  ]).command, 'inspect');
  assert.equal(owner.parseArgs(['finalize', '--packet', '2586', '--pr', '3000']).command,
    'finalize');
  assert.throws(() => owner.parseArgs([
    'inspect', '--packet', '2586', '--pr', '3000',
    '--implementation-receipt-file', '/tmp/r.json', '--repo', owner.REPO,
  ]), /ARGUMENT_INVALID/);
  assert.throws(() => owner.parseArgs([
    'finalize', '--packet', '2586', '--pr', '3000', '--implementation-receipt-file', '/tmp/r',
  ]), /ARGUMENT_INVALID/);
});

test('canonical IMPLEMENTATION_PR receipt is reprojected and bound to PR head', () => {
  const receipt = implementationReceipt();
  const value = owner.validateImplementationReceipt(receipt, PACKET, PR);
  assert.equal(value.expectedHead, HEAD);
  assert.deepEqual(value.paths, PATHS);
  const forged = structuredClone(receipt);
  forged.nextLegalAction = 'DONE';
  assert.throws(() => owner.validateImplementationReceipt(forged, PACKET, PR),
    /IMPLEMENTATION_STAGE_RECEIPT_IDENTITY_CONFLICT/);
});

test('current main capture requires exact CLEAR PASS and UNKNOWN NONE', async () => {
  const value = await owner.readCurrentMain(fixtureClient());
  assert.equal(value.mainSha, BASE);
  await assert.rejects(
    owner.readCurrentMain(fixtureClient({opsBody: opsBody(BASE, {state: 'UNKNOWN'})})),
    /OPS_STATE_UNKNOWN/);
  await assert.rejects(
    owner.readCurrentMain(fixtureClient({opsBody: opsBody(BASE, {unknown: 'writers'})})),
    /OPS_REQUIRED_UNKNOWN_PRESENT/);
});

test('inspect PASS returns canonical v2 readiness with no merge effect', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient(),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(result.receipt.validity, 'VALID');
  assert.equal(result.receipt.schemaVersion, 2);
  assert.equal(result.receipt.result, 'PASS');
  assert.equal(result.receipt.attentionDisposition, 'COMPLETE');
  assert.equal(result.receipt.nextLegalAction, 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT');
  assert.equal(result.report.output.merge, 'NOT_RUN');
  assert.equal(result.report.output.expectedHead, HEAD);
  assert.equal(result.receipt.counters.find((row) => row.name === 'merge_effects_performed').value, 0);
});


test('PR base or path drift fails closed', async () => {
  const baseDrift = await owner.inspectWithClient({
    client: fixtureClient({pr: prObject({base: {ref: 'main', sha: 'f'.repeat(40)}})}),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(baseDrift.receipt.result, 'BLOCKED');
  assert.ok(baseDrift.receipt.reasonCodes.includes('PR_BASE_NOT_CURRENT_MAIN'));

  const pathDrift = await owner.inspectWithClient({
    client: fixtureClient({prFiles: [...PATHS, 'docs/outside.md']}),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(pathDrift.receipt.result, 'CONFLICT');
  assert.ok(pathDrift.receipt.reasonCodes.includes('PR_CHANGED_FILES_SCOPE_MISMATCH'));
});

test('packet and implementation receipt scopes must agree exactly', async () => {
  const narrowed = implementationReceipt({
    scope: {
      paths: PATHS.slice(0, 4),
      diffRequired: true,
      diffIdentity: 'd'.repeat(64),
      diffEvidenceLocator: 'commit:' + HEAD,
    },
  });
  const result = await owner.inspectWithClient({
    client: fixtureClient(),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: narrowed,
  });
  assert.equal(result.receipt.result, 'CONFLICT');
  assert.ok(result.receipt.reasonCodes.includes('IMPLEMENTATION_PACKET_SCOPE_MISMATCH'));
});

test('changes requested and unresolved current threads block', async () => {
  const changes = await owner.inspectWithClient({
    client: fixtureClient({
      reviews: [{id: 1, submitted_at: '2026-09-20T00:00:00Z',
        state: 'CHANGES_REQUESTED', user: {login: 'reviewer'}}],
    }),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(changes.receipt.result, 'BLOCKED');
  assert.ok(changes.receipt.reasonCodes.includes('REVIEW_CHANGES_REQUESTED'));

  const unresolved = await owner.inspectWithClient({
    client: fixtureClient({
      threads: emptyThreads([{
        isResolved: false,
        comments: {pageInfo: {hasNextPage: false}, nodes: [{outdated: false}]},
      }]),
    }),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(unresolved.receipt.result, 'BLOCKED');
  assert.ok(unresolved.receipt.reasonCodes.includes('REVIEW_THREAD_UNRESOLVED'));
});

test('requested reviewer is NEEDS_REVIEW, not green by absence', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({requested: {users: [{login: 'reviewer'}], teams: []}}),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(result.receipt.result, 'PARTIAL');
  assert.equal(result.receipt.attentionDisposition, 'NEEDS_REVIEW');
  assert.ok(result.receipt.reasonCodes.includes('REVIEW_REQUEST_PENDING'));
});

test('review thread completeness failure stays UNKNOWN', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient({
      threads: {
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {pageInfo: {hasNextPage: true}, nodes: []},
            },
          },
        },
      },
    }),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(result.receipt.result, 'UNKNOWN');
  assert.ok(result.receipt.reasonCodes.includes('REVIEW_THREADS_INCOMPLETE'));
});

test('Required missing, ambiguous, or failed never becomes PASS', async () => {
  const missing = await owner.inspectWithClient({
    client: fixtureClient({runs: []}),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(missing.receipt.result, 'UNKNOWN');
  assert.ok(missing.receipt.reasonCodes.includes('REQUIRED_RUN_MISSING'));

  const failed = await owner.inspectWithClient({
    client: fixtureClient({runs: [{
      id: 501, name: 'SimCore CI', path: '.github/workflows/simcore-ci.yml',
      event: 'pull_request', head_sha: HEAD, status: 'completed', conclusion: 'failure',
      pull_requests: [{number: PR}],
    }]}),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(failed.receipt.result, 'FAIL');
  assert.ok(failed.receipt.reasonCodes.includes('REQUIRED_RUN_FAILED'));
});

test('fresh overlap blocks competing writer', async () => {
  const client = fixtureClient();
  const originalApi = client.api.bind(client);
  client.api = async (endpoint) => {
    if (endpoint.startsWith('/issues?state=open&per_page=100&page=1')) {
      return [{
        number: 9901,
        state: 'open',
        body: [
          '<!-- canonical-main-work-packet:v1 -->',
          '## State',
          TICK + 'IN_PROGRESS' + TICK,
          '## Bounded write scope',
          '1. ' + TICK + 'path:' + PATHS[0] + TICK,
        ].join('\n'),
      }];
    }
    return originalApi(endpoint);
  };
  const result = await owner.inspectWithClient({
    client,
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(result.receipt.result, 'BLOCKED');
  assert.ok(result.receipt.reasonCodes.includes('OVERLAP_PRESENT'));
});

test('late competing packet is caught by final overlap barrier', async () => {
  const latePacket = {
    number: 9903,
    state: 'open',
    body: [
      '<!-- canonical-main-work-packet:v1 -->',
      '## State',
      TICK + 'IN_PROGRESS' + TICK,
      '## Bounded write scope',
      '1. ' + TICK + 'path:' + PATHS[0] + TICK,
    ].join('\n'),
  };
  const result = await owner.inspectWithClient({
    client: fixtureClient({lateOverlapPacket: latePacket}),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(result.receipt.result, 'BLOCKED');
  assert.ok(result.receipt.reasonCodes.includes('OVERLAP_PRESENT'));
  assert.ok(result.receipt.steps.some((row) => (
    row.name === 'final-overlap-currentness' && row.result === 'BLOCKED'
  )));
});

test('late main movement is preserved as UNKNOWN', async () => {
  const sequence = [BASE, BASE, 'f'.repeat(40), 'f'.repeat(40)];
  const result = await owner.inspectWithClient({
    client: fixtureClient({branchSequence: sequence}),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(result.receipt.result, 'UNKNOWN');
  assert.ok(result.receipt.reasonCodes.some((code) => (
    code === 'OPS_MAIN_MISMATCH' || code === 'VALIDATION_STATE_CHANGED_DURING_CAPTURE'
  )));
});

test('agent decision view is bounded and says merge NOT_RUN on inspect', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient(),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  const view = owner.projectView(result, {
    receiptLocator: 'local-artifact:/tmp/receipt#sha256=' + '1'.repeat(64),
    reportLocator: 'local-artifact:/tmp/report#sha256=' + '2'.repeat(64),
  });
  assert.equal(view.validity, 'VALID');
  assert.equal(view.phase, 'VALIDATION_MERGE');
  assert.equal(view.result, 'PASS');
  assert.equal(view.output.merge, 'NOT_RUN');
  assert.equal(view.nextLegalAction, 'MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT');
  assert.equal(view.attention.length, 0);
});

test('fixed sidecars are restrictive and outside tracked bytes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-merge-'));
  fs.mkdirSync(path.join(root, '.git'));
  try {
    const result = await owner.inspectWithClient({
      client: fixtureClient(),
      packetNumber: PACKET,
      prNumber: PR,
      implementationReceipt: implementationReceipt(),
    });
    const locators = owner.persistResult(result, PACKET, PR, 'inspect', root);
    assert.ok(locators.receiptLocator.startsWith('local-artifact:' + path.join(root, '.git')));
    assert.equal(fs.statSync(locators.paths.receipt).mode & 0o777, 0o600);
    assert.equal(fs.statSync(locators.paths.report).mode & 0o777, 0o600);
    const raw = fs.readFileSync(locators.paths.report, 'utf8');
    assert.doesNotMatch(raw, /authorization|bearer|token=|secret=/i);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('finalize proves exact merged PR head without claiming current main', async () => {
  const inspect = await owner.inspectWithClient({
    client: fixtureClient(),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  const finalized = await owner.finalizeWithClient({
    client: fixtureClient({
      finalizePr: prObject({
        state: 'closed',
        mergeable: false,
        merged_at: '2026-09-20T01:00:00Z',
        merge_commit_sha: MERGE,
      }),
    }),
    packetNumber: PACKET,
    prNumber: PR,
    inspectEvidence: {receipt: inspect.receipt, report: inspect.report},
  });
  assert.equal(finalized.receipt.result, 'PASS');
  assert.equal(finalized.report.output.merge, 'COMPLETE');
  assert.equal(finalized.report.output.mergeCommit, MERGE);
  assert.equal(finalized.receipt.nextLegalAction, 'POSTMERGE_CONVERGENCE');
  assert.equal(finalized.receipt.steps.some((row) => row.name.includes('main')), false);
});

test('finalize head mismatch is CONFLICT', async () => {
  const inspect = await owner.inspectWithClient({
    client: fixtureClient(),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  const finalized = await owner.finalizeWithClient({
    client: fixtureClient({
      finalizePr: prObject({
        state: 'closed',
        merged_at: '2026-09-20T01:00:00Z',
        merge_commit_sha: MERGE,
        head: {ref: 'server/mcl-packet-2586', sha: 'f'.repeat(40),
          repo: {full_name: owner.REPO}},
      }),
    }),
    packetNumber: PACKET,
    prNumber: PR,
    inspectEvidence: {receipt: inspect.receipt, report: inspect.report},
  });
  assert.equal(finalized.receipt.result, 'CONFLICT');
  assert.ok(finalized.receipt.reasonCodes.includes('MERGED_PR_HEAD_MISMATCH'));
});

test('Work System parser export is exact current parser, not a duplicate grammar', () => {
  assert.equal(typeof scopeOverlap.extractPacketScopes, 'function');
  const parsed = scopeOverlap.extractPacketScopes(packetBody());
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.scopes.map((row) => row.normalized), SCOPES.sort());
});

test('source contains no merge writer, PR update, auto-merge, or retry loop', () => {
  const source = fs.readFileSync(path.join(__dirname, '../validation-merge-owner.cjs'), 'utf8');
  assert.doesNotMatch(source, /pulls\/.*\/merge/);
  assert.doesNotMatch(source, /merge_method=|enablePullRequestAutoMerge|auto[_-]?merge/i);
  assert.doesNotMatch(source, /update-ref\s+main|force-with-lease|delete-ref/i);
  assert.doesNotMatch(source, /setInterval|while\s*\(\s*true\s*\)/);
  assert.match(source, /https:\/\/api\.github\.com\/graphql/);
  assert.match(source, /extractPacketScopes/);
  assert.match(source, /MERGE_PR_WITH_EXISTING_EXPECTED_HEAD_ENDPOINT/);
});

test('generic receipt and decision view authority remain false', async () => {
  const result = await owner.inspectWithClient({
    client: fixtureClient(),
    packetNumber: PACKET,
    prNumber: PR,
    implementationReceipt: implementationReceipt(),
  });
  assert.equal(result.receipt.mutationAuthorized, false);
  assert.equal(result.receipt.executionAuthorized, false);
  assert.equal(result.receipt.mergeAuthorized, false);
  assert.equal(result.receipt.releaseAuthorized, false);
  const view = agentView.projectAgentDecisionView({
    receipt: result.receipt,
    phase: 'VALIDATION_MERGE',
    output: result.report.output,
    attention: [],
    receiptLocator: 'local-artifact:/tmp/r#sha256=' + '1'.repeat(64),
    reportLocator: 'local-artifact:/tmp/p#sha256=' + '2'.repeat(64),
  });
  assert.equal(view.result, 'PASS');
});
