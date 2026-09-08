'use strict';

const fs = require('node:fs');
const handoff = require('./release_handoff_e15.cjs');

const SHA_RE = /^[0-9a-f]{40}$/;
const ACTIONS = Object.freeze({
  BLOCK_HANDOFF: 'BLOCK_HANDOFF',
  DISPATCH_FIRST: 'DISPATCH_FIRST',
  WAIT_IN_FLIGHT: 'WAIT_IN_FLIGHT',
  RETRY_ONCE: 'RETRY_ONCE',
  BLOCK_LOGICAL_RED: 'BLOCK_LOGICAL_RED',
  BLOCK_RETRY_EXHAUSTED: 'BLOCK_RETRY_EXHAUSTED',
  CONTINUE_GREEN: 'CONTINUE_GREEN',
  BLOCK_AMBIGUOUS: 'BLOCK_AMBIGUOUS',
});
const RESULT_CLASSES = Object.freeze({
  GREEN: 'GREEN',
  RED_LOGICAL: 'RED_LOGICAL',
  RED_RETRYABLE: 'RED_RETRYABLE',
  RED_AMBIGUOUS: 'RED_AMBIGUOUS',
});
const ATTEMPT_REASONS = new Set(['first-validation', 'retryable-validation-failure']);
const RESULT_REASONS = new Set([
  'exact-registry-green',
  'exact-registry-failed',
  'validation-job-cancelled',
  'validation-outcome-ambiguous',
]);

function fail(code, detail = '') {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function normalizeSha(value) {
  const sha = String(value || '').trim().toLowerCase();
  if (!SHA_RE.test(sha)) fail('E26_CANDIDATE_SHA_INVALID', sha || '<empty>');
  return sha;
}

function normalizePr(value) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) fail('E26_PR_NUMBER_INVALID', String(value));
  return number;
}

function normalizeAttempt(value) {
  const attempt = Number(value);
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > 2) fail('E26_VALIDATION_ATTEMPT_INVALID', String(value));
  return attempt;
}

function boundedE15Reason(error) {
  const text = String(error?.message || error || '');
  const match = /^(E15_[A-Z0-9_]+)/.exec(text);
  return match ? match[1] : 'E15_HANDOFF_INVALID';
}

function evaluateHandoff(body, requestNumber) {
  try {
    handoff.validateStablePrBody(String(body || ''), normalizePr(requestNumber));
    return {ok:true, reason:'E15_OK'};
  } catch (error) {
    return {ok:false, reason:boundedE15Reason(error)};
  }
}

function field(body, key, pattern) {
  const match = new RegExp(`^${key}:\\s*(${pattern})\\s*$`, 'm').exec(String(body || ''));
  return match ? match[1] : null;
}

function bodies(comments) {
  if (!Array.isArray(comments)) return [];
  return comments.map((row) => String(row?.body || ''));
}

function parseAttempts(comments, candidateSha, prNumber) {
  const sha = normalizeSha(candidateSha);
  const pr = normalizePr(prNumber);
  const attempts = [];
  let ambiguous = false;
  for (const body of bodies(comments)) {
    if (!body.split(/\r?\n/).some((line) => line.trim() === 'UD_E9_VALIDATION_ATTEMPT_V2')) continue;
    const receiptSha = field(body, 'candidate_sha', '[0-9a-fA-F]{40}');
    const receiptPr = field(body, 'pr', '#?[1-9][0-9]*');
    if (!receiptSha || !receiptPr) { ambiguous = true; continue; }
    if (receiptSha.toLowerCase() !== sha || Number(receiptPr.replace('#','')) !== pr) continue;
    const attemptText = field(body, 'attempt', '[0-9]+');
    const state = field(body, 'state', '[A-Z_]+');
    const reason = field(body, 'reason', '[a-z0-9-]+');
    const retryOfText = field(body, 'retry_of', '[0-9]+');
    if (!attemptText || state !== 'DISPATCHED' || !reason || !ATTEMPT_REASONS.has(reason)) { ambiguous = true; continue; }
    let attempt;
    try { attempt = normalizeAttempt(attemptText); } catch { ambiguous = true; continue; }
    let retryOf = null;
    if (retryOfText !== null) {
      try { retryOf = normalizeAttempt(retryOfText); } catch { ambiguous = true; continue; }
    }
    if (attempt === 1 && (reason !== 'first-validation' || retryOf !== null)) { ambiguous = true; continue; }
    if (attempt === 2 && (reason !== 'retryable-validation-failure' || retryOf !== 1)) { ambiguous = true; continue; }
    attempts.push({attempt, state, reason, retryOf});
  }
  const seen = new Set();
  for (const item of attempts) {
    if (seen.has(item.attempt)) ambiguous = true;
    seen.add(item.attempt);
  }
  const ordered = attempts.slice().sort((a,b) => a.attempt-b.attempt);
  if (ordered.length && ordered[0].attempt !== 1) ambiguous = true;
  if (ordered.length === 2 && ordered[1].attempt !== 2) ambiguous = true;
  return {attempts:ordered, ambiguous};
}

function parseResults(comments, candidateSha, prNumber) {
  const sha = normalizeSha(candidateSha);
  const pr = normalizePr(prNumber);
  const results = [];
  let ambiguous = false;
  for (const body of bodies(comments)) {
    if (!body.includes('UD_VALIDATION_RESULT')) continue;
    const validated = field(body, 'validated_sha', '[0-9a-fA-F]{40}');
    const receiptPr = field(body, 'pr', '#?[1-9][0-9]*');
    if (!validated || !receiptPr) continue;
    if (validated.toLowerCase() !== sha || Number(receiptPr.replace('#','')) !== pr) continue;
    const status = field(body, 'status', 'GREEN|RED');
    if (!status) { ambiguous = true; continue; }
    const resultClassLine = field(body, 'result_class', '[A-Z_]+');
    const attemptText = field(body, 'attempt', '[0-9]+');
    const reason = field(body, 'reason', '[a-z0-9-]+');
    let resultClass = resultClassLine;
    let attempt = null;
    let legacy = false;
    if (!resultClassLine) {
      legacy = true;
      resultClass = status === 'GREEN' ? RESULT_CLASSES.GREEN : RESULT_CLASSES.RED_LOGICAL;
    } else {
      if (!Object.values(RESULT_CLASSES).includes(resultClassLine)) { ambiguous = true; continue; }
      if (!attemptText || !reason || !RESULT_REASONS.has(reason)) { ambiguous = true; continue; }
      try { attempt = normalizeAttempt(attemptText); } catch { ambiguous = true; continue; }
      if ((resultClass === RESULT_CLASSES.GREEN) !== (status === 'GREEN')) { ambiguous = true; continue; }
    }
    results.push({validatedSha:sha, status, resultClass, attempt, reason:reason || (status === 'GREEN' ? 'legacy-green' : 'legacy-red'), legacy});
  }
  const keyed = new Set();
  for (const item of results) {
    if (item.attempt === null) continue;
    if (keyed.has(item.attempt)) ambiguous = true;
    keyed.add(item.attempt);
  }
  return {results, ambiguous};
}

function hasLegacyDispatch(comments, candidateSha) {
  const marker = `UD_E9_VALIDATION_DISPATCHED:${normalizeSha(candidateSha)}`;
  return bodies(comments).some((body) => body.split(/\r?\n/).some((line) => line.trim() === marker));
}

function classifyValidationConvergence(input = {}) {
  const sha = normalizeSha(input.candidateSha);
  const pr = normalizePr(input.prNumber);
  if (!input.handoffOk) {
    const reason = /^E15_[A-Z0-9_]+$/.test(String(input.handoffReason || '')) ? String(input.handoffReason) : 'E15_HANDOFF_INVALID';
    return {action:ACTIONS.BLOCK_HANDOFF, reason, candidateSha:sha, prNumber:pr, nextAttempt:null, validation:null};
  }

  const attemptState = parseAttempts(input.comments, sha, pr);
  const resultState = parseResults(input.comments, sha, pr);
  if (attemptState.ambiguous || resultState.ambiguous) {
    return {action:ACTIONS.BLOCK_AMBIGUOUS, reason:'E26_VALIDATION_LEDGER_AMBIGUOUS', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:null};
  }

  const attempts = attemptState.attempts;
  const results = resultState.results;
  for (const result of results) {
    if (result.attempt !== null && !attempts.some((item) => item.attempt === result.attempt)) {
      return {action:ACTIONS.BLOCK_AMBIGUOUS, reason:'E26_RESULT_WITHOUT_DISPATCH', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:result};
    }
  }

  const latest = results.length ? results[results.length-1] : null;
  const highestAttempt = attempts.length ? attempts[attempts.length-1].attempt : 0;

  if (latest) {
    if (latest.resultClass === RESULT_CLASSES.GREEN) {
      return {action:ACTIONS.CONTINUE_GREEN, reason:'E26_VALIDATION_GREEN', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:latest};
    }
    if (latest.resultClass === RESULT_CLASSES.RED_LOGICAL) {
      return {action:ACTIONS.BLOCK_LOGICAL_RED, reason:'E26_VALIDATION_LOGICAL_RED', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:latest};
    }
    if (latest.resultClass === RESULT_CLASSES.RED_AMBIGUOUS) {
      return {action:ACTIONS.BLOCK_AMBIGUOUS, reason:'E26_VALIDATION_RESULT_AMBIGUOUS', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:latest};
    }
    if (latest.resultClass === RESULT_CLASSES.RED_RETRYABLE) {
      const resultAttempt = latest.attempt || highestAttempt;
      if (resultAttempt === 1 && highestAttempt === 1) {
        return {action:ACTIONS.RETRY_ONCE, reason:'E26_VALIDATION_RETRYABLE_RED', candidateSha:sha, prNumber:pr, nextAttempt:2, validation:latest};
      }
      if (highestAttempt >= 2) {
        if (results.some((item) => item.attempt === 2)) {
          return {action:ACTIONS.BLOCK_RETRY_EXHAUSTED, reason:'E26_VALIDATION_RETRY_EXHAUSTED', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:latest};
        }
        return {action:ACTIONS.WAIT_IN_FLIGHT, reason:'E26_VALIDATION_ATTEMPT_IN_FLIGHT', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:latest};
      }
      return {action:ACTIONS.BLOCK_AMBIGUOUS, reason:'E26_RETRYABLE_RESULT_ATTEMPT_AMBIGUOUS', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:latest};
    }
  }

  if (highestAttempt > 0) {
    return {action:ACTIONS.WAIT_IN_FLIGHT, reason:'E26_VALIDATION_ATTEMPT_IN_FLIGHT', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:null};
  }
  if (hasLegacyDispatch(input.comments, sha)) {
    return {action:ACTIONS.WAIT_IN_FLIGHT, reason:'E26_LEGACY_VALIDATION_IN_FLIGHT', candidateSha:sha, prNumber:pr, nextAttempt:null, validation:null};
  }
  return {action:ACTIONS.DISPATCH_FIRST, reason:'E26_FIRST_VALIDATION_REQUIRED', candidateSha:sha, prNumber:pr, nextAttempt:1, validation:null};
}

function formatAttemptReceipt(input = {}) {
  const sha = normalizeSha(input.candidateSha);
  const pr = normalizePr(input.prNumber);
  const attempt = normalizeAttempt(input.attempt);
  const reason = String(input.reason || '');
  if (!ATTEMPT_REASONS.has(reason)) fail('E26_ATTEMPT_REASON_INVALID', reason);
  const lines = [
    'UD_E9_VALIDATION_ATTEMPT_V2',
    `candidate_sha: ${sha}`,
    `pr: #${pr}`,
    `attempt: ${attempt}`,
    'state: DISPATCHED',
    `reason: ${reason}`,
  ];
  if (attempt === 1) {
    if (reason !== 'first-validation') fail('E26_ATTEMPT_REASON_MISMATCH');
  } else {
    const retryOf = normalizeAttempt(input.retryOf);
    if (retryOf !== 1 || reason !== 'retryable-validation-failure') fail('E26_RETRY_CONTRACT_INVALID');
    lines.push(`retry_of: ${retryOf}`);
  }
  lines.push(`UD_E9_VALIDATION_DISPATCHED:${sha}`);
  return lines.join('\n');
}

function classifyWorkflowOutcome(value) {
  const outcome = String(value || '').trim().toLowerCase();
  if (outcome === 'success') return {status:'GREEN', resultClass:RESULT_CLASSES.GREEN, reason:'exact-registry-green'};
  if (outcome === 'failure') return {status:'RED', resultClass:RESULT_CLASSES.RED_LOGICAL, reason:'exact-registry-failed'};
  if (outcome === 'cancelled') return {status:'RED', resultClass:RESULT_CLASSES.RED_RETRYABLE, reason:'validation-job-cancelled'};
  return {status:'RED', resultClass:RESULT_CLASSES.RED_AMBIGUOUS, reason:'validation-outcome-ambiguous'};
}

function main() {
  const args = process.argv.slice(2);
  const command = args.shift() || '';
  if (command === '--handoff-file') {
    const pr = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    process.stdout.write(JSON.stringify(evaluateHandoff(pr.body || '', args[1])));
    return;
  }
  if (command === '--classify-file') {
    const comments = JSON.parse(fs.readFileSync(args[0], 'utf8'));
    process.stdout.write(JSON.stringify(classifyValidationConvergence({comments,candidateSha:args[1],prNumber:args[2],handoffOk:args[3] === 'true',handoffReason:args[4]})));
    return;
  }
  if (command === '--format-attempt') {
    process.stdout.write(formatAttemptReceipt({candidateSha:args[0],prNumber:args[1],attempt:args[2],reason:args[3],retryOf:args[4] || null}));
    return;
  }
  if (command === '--classify-workflow-outcome') {
    process.stdout.write(JSON.stringify(classifyWorkflowOutcome(args[0])));
    return;
  }
  fail('E26_USAGE');
}

module.exports = {
  ACTIONS,
  RESULT_CLASSES,
  evaluateHandoff,
  boundedE15Reason,
  parseAttempts,
  parseResults,
  hasLegacyDispatch,
  classifyValidationConvergence,
  formatAttemptReceipt,
  classifyWorkflowOutcome,
};

if (require.main === module) {
  try { main(); }
  catch (error) { console.error(error?.stack || String(error)); process.exitCode = 1; }
}
