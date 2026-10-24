#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const owner = require('../codex-review-recovery-owner.cjs');

const MAIN = '1'.repeat(40);
const HEAD = '2'.repeat(40);
const NEW_HEAD = '3'.repeat(40);
const NOW = Date.parse('2026-10-25T00:30:00Z');
const OLD = '2026-10-25T00:00:00Z';
const YOUNG = '2026-10-25T00:20:01Z';

function ownerError(reason, kind = 'BLOCKED') {
  const error = new Error(reason);
  error.kind = kind;
  error.reasonCodes = [reason];
  return error;
}

function pendingError(reason = 'CODEX_REVIEW_PENDING', kind = 'NEEDS_REVIEW') {
  return ownerError(reason, kind);
}

function pr(overrides = {}) {
  return {
    number: 7,
    state: 'open',
    draft: false,
    head: {sha: HEAD, repo: {full_name: owner.REPO}},
    base: {ref: 'main', sha: MAIN},
    ...overrides,
  };
}

function summary(updatedAt = OLD) {
  return {
    id: 99,
    user: {login: 'chatgpt-codex-connector[bot]'},
    updated_at: updatedAt,
    body: '<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 {} -->',
  };
}

function client({firstPr = pr(), secondPr = firstPr, comments = [summary()]} = {}) {
  let pullReads = 0;
  return {
    async api(endpoint) {
      if (endpoint === '/pulls/7') {
        pullReads += 1;
        return pullReads === 1 ? firstPr : secondPr;
      }
      if (endpoint.startsWith('/issues/7/comments?')) return comments;
      throw new Error('unexpected endpoint ' + endpoint);
    },
  };
}

function vm({review = 'pending', currentness = 'current'} = {}) {
  return {
    async readCurrentMain() {
      return {mainSha: MAIN, evidenceLocator: 'issue:#485'};
    },
    async readStrictPrMergeState() {
      if (currentness === 'behind') {
        throw ownerError('PR_HEAD_BEHIND_STRICT_BASE');
      }
      if (currentness === 'unknown') {
        throw ownerError('PR_MERGE_STATE_UNKNOWN', 'UNKNOWN');
      }
      return {mergeStateStatus: 'CLEAN'};
    },
    async readStrictAncestry() {
      if (currentness === 'diverged') {
        throw ownerError('PR_HEAD_NOT_CURRENT_MAIN_ANCESTOR');
      }
      return {status: 'ahead', mergeBaseSha: MAIN};
    },
    async readRequiredEvidence() {
      return {runId: 1, jobId: 2};
    },
    async readReviewBarrier() {
      if (review === 'pending') throw pendingError();
      if (review === 'findings') {
        throw pendingError('REVIEW_THREAD_UNRESOLVED', 'BLOCKED');
      }
      if (review === 'malformed') {
        throw pendingError('CODEX_REVIEW_STATE_INVALID', 'UNKNOWN');
      }
      return {codexReviewState: 'CODEX_COMPLETE_CLEAR'};
    },
  };
}

async function inspect(options = {}) {
  return owner.inspectWithClient({
    client: options.client || client(options.clientOptions),
    prNumber: 7,
    nowMs: NOW,
    validationMerge: options.validationMerge || vm(options.vmOptions),
  });
}

(async () => {
  const eligible = await inspect();
  assert.equal(eligible.disposition, 'ELIGIBLE');
  assert.equal(eligible.retriggerBody, owner.fixedRetriggerBody(HEAD));
  assert.equal(eligible.effectAuthorized, false);
  assert.equal(eligible.networkWriteAuthorized, false);
  assert.equal(eligible.repositoryMutationAuthorized, false);
  assert.equal(eligible.prCommentWriteAuthorized, false);

  const tooYoung = await inspect({
    clientOptions: {comments: [summary(YOUNG)]},
  });
  assert.equal(tooYoung.disposition, 'TOO_YOUNG');
  assert.equal(tooYoung.retriggerBody, null);

  const staleBase = await inspect({
    clientOptions: {
      firstPr: pr({base: {ref: 'main', sha: '4'.repeat(40)}}),
    },
  });
  assert.equal(staleBase.disposition, 'CURRENTIZE_FIRST');

  const behind = await inspect({vmOptions: {currentness: 'behind'}});
  assert.equal(behind.disposition, 'CURRENTIZE_FIRST');
  assert.deepEqual(behind.reasonCodes, ['PR_HEAD_BEHIND_STRICT_BASE']);

  const diverged = await inspect({vmOptions: {currentness: 'diverged'}});
  assert.equal(diverged.disposition, 'CURRENTIZE_FIRST');
  assert.deepEqual(diverged.reasonCodes, ['PR_HEAD_NOT_CURRENT_MAIN_ANCESTOR']);

  await assert.rejects(
    inspect({vmOptions: {currentness: 'unknown'}}),
    (error) => error instanceof owner.RecoveryError
      && error.disposition === 'UNKNOWN'
      && error.reasonCodes.includes('PR_MERGE_STATE_UNKNOWN'),
  );

  const headMove = await inspect({
    clientOptions: {
      secondPr: pr({
        head: {sha: NEW_HEAD, repo: {full_name: owner.REPO}},
      }),
    },
  });
  assert.equal(headMove.disposition, 'NO_EFFECT');
  assert.deepEqual(headMove.reasonCodes,
    ['PR_IDENTITY_CHANGED_DURING_INSPECTION']);

  const completed = await inspect({vmOptions: {review: 'completed'}});
  assert.equal(completed.disposition, 'NO_EFFECT');
  assert.deepEqual(completed.reasonCodes, ['CODEX_REVIEW_TERMINAL']);

  const findings = await inspect({vmOptions: {review: 'findings'}});
  assert.equal(findings.disposition, 'NO_EFFECT');
  assert.deepEqual(findings.reasonCodes, ['REVIEW_THREAD_UNRESOLVED']);

  await assert.rejects(
    inspect({vmOptions: {review: 'malformed'}}),
    (error) => error instanceof owner.RecoveryError
      && error.disposition === 'UNKNOWN'
      && error.reasonCodes.includes('CODEX_REVIEW_STATE_INVALID'),
  );

  const exactBody = owner.fixedRetriggerBody(HEAD);
  const dedupe = await inspect({
    clientOptions: {
      comments: [
        summary(),
        {id: 100, user: {login: owner.REPO_OWNER}, body: exactBody},
      ],
    },
  });
  assert.equal(dedupe.disposition, 'ALREADY_RETRIGGERED');
  assert.equal(dedupe.retriggerBody, null);

  const editedMarker = await inspect({
    clientOptions: {
      comments: [
        summary(),
        {
          id: 101,
          user: {login: owner.REPO_OWNER},
          body: 'operator note\n\n' + exactBody + '\n\nverified later',
        },
      ],
    },
  });
  assert.equal(editedMarker.disposition, 'ALREADY_RETRIGGERED');

  const oldHeadMarker = owner.fixedRetriggerBody(NEW_HEAD);
  const otherHeadDoesNotDedupe = await inspect({
    clientOptions: {
      comments: [
        summary(),
        {id: 102, user: {login: owner.REPO_OWNER}, body: oldHeadMarker},
      ],
    },
  });
  assert.equal(otherHeadDoesNotDedupe.disposition, 'ELIGIBLE');

  await assert.rejects(
    inspect({
      clientOptions: {
        comments: [
          summary(),
          {
            id: 103,
            user: {login: owner.REPO_OWNER},
            body: '<!-- canonical-main-codex-review-recovery:v1 not-json -->',
          },
        ],
      },
    }),
    (error) => error instanceof owner.RecoveryError
      && error.disposition === 'UNKNOWN'
      && error.reasonCodes.includes('RECOVERY_MARKER_INVALID'),
  );

  await assert.rejects(
    inspect({clientOptions: {comments: [summary('not-a-date')]}}),
    (error) => error instanceof owner.RecoveryError
      && error.disposition === 'UNKNOWN'
      && error.reasonCodes.includes('CODEX_SUMMARY_UPDATED_AT_INVALID'),
  );

  await assert.rejects(
    inspect({
      clientOptions: {
        comments: [summary('2026-10-25T00:31:00Z')],
      },
    }),
    (error) => error instanceof owner.RecoveryError
      && error.disposition === 'UNKNOWN'
      && error.reasonCodes.includes('CODEX_SUMMARY_UPDATED_AT_FUTURE'),
  );

  const source = fs.readFileSync(
    path.join(__dirname, '..', 'codex-review-recovery-owner.cjs'),
    'utf8',
  );
  assert.match(source, /readCurrentMain\(client\)/);
  assert.match(source, /readStrictPrMergeState\(client, prNumber, headSha\)/);
  assert.match(source, /readStrictAncestry\(client, current\.mainSha, headSha\)/);
  assert.match(source, /readRequiredEvidence\(client, headSha, prNumber\)/);
  assert.match(source, /readReviewBarrier\(client, prNumber, headSha\)/);
  assert.doesNotMatch(source, /CODEX_REVIEW_STATE_RE/);
  assert.doesNotMatch(source, /\.post\s*\(/);
  assert.doesNotMatch(source, /method:\s*['"]POST['"]/);

  console.log('PASS codex-review-recovery-owner-contract');
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
