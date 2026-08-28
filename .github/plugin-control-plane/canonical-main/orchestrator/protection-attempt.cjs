'use strict';

const {execFileSync} = require('child_process');
const {BLOCK_CLASSES, decideCircuitBreaker} = require('../domains/circuit-breaker.cjs');
const {loadProtectedMainContract} = require('../protected-main.cjs');

const MARKER = '<!-- canonical-main-protection-circuit-breaker:v1 -->';
const ACTION = 'ACTIVATE_NATIVE_PROTECTION';
const OWNER = 'canonical-main-protection-guard';
const LANE_REASON = 'NATIVE_PROTECTION_CAPABILITY';

function capabilityCandidate(contract, {explicitRearm = false} = {}) {
  const capability = contract.activation?.capability || {};
  const state = String(capability.state || 'UNKNOWN');
  const target = String(capability.stableTarget || 'branch:main/native-protection');
  const evidenceFingerprint = String(capability.evidenceFingerprint || `state:${state}`);
  const blocked = state === 'BLOCKED_PERMISSION' || state === 'UNKNOWN';
  return Object.freeze({
    action: ACTION,
    target,
    owner: OWNER,
    reasonCode: LANE_REASON,
    evidenceFingerprint,
    blockClass: explicitRearm ? BLOCK_CLASSES.NONE : blocked ? BLOCK_CLASSES.CAPABILITY : BLOCK_CLASSES.NONE,
  });
}

function parseRecord(body) {
  if (!String(body || '').includes(MARKER)) return null;
  const match = String(body).match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && parsed.mode === 'CANONICAL_MAIN_CIRCUIT_BREAKER' ? parsed : null;
  } catch {
    return null;
  }
}

function recordView(decision) {
  return {
    schemaVersion: decision.schemaVersion,
    mode: decision.mode,
    state: decision.state,
    action: decision.action,
    target: decision.target,
    owner: decision.owner,
    reasonCode: decision.reasonCode,
    evidenceFingerprint: decision.evidenceFingerprint,
    laneKey: decision.laneKey,
    identityKey: decision.identityKey,
    blockClass: decision.blockClass,
    allowAttempt: decision.allowAttempt,
    deferred: decision.deferred,
    neutral: decision.neutral,
  };
}

function renderRecord(decision) {
  const record = recordView(decision);
  return [
    MARKER,
    '## Native protection circuit breaker',
    '',
    'This machine-readable record is coordination/accounting evidence only. Direct GitHub branch read-back remains native-protection authority.',
    '',
    '```json',
    JSON.stringify(record, null, 2),
    '```',
  ].join('\n');
}

function sameRecord(a, b) {
  return JSON.stringify(a || null) === JSON.stringify(b || null);
}

function ghJson(args) {
  const text = execFileSync('gh', ['api', ...args], {encoding: 'utf8', maxBuffer: 1024 * 1024});
  return text.trim() ? JSON.parse(text) : null;
}

function loadStored(repo, issueNumber) {
  const comments = ghJson([`repos/${repo}/issues/${issueNumber}/comments?per_page=100`]) || [];
  const comment = comments.find((row) => String(row.body || '').includes(MARKER));
  return comment ? {comment, record: parseRecord(comment.body)} : {comment: null, record: null};
}

function persist(repo, issueNumber, stored, decision) {
  const next = recordView(decision);
  if (stored.comment && sameRecord(stored.record, next)) return {changed: false, commentId: stored.comment.id};
  const body = renderRecord(decision);
  if (stored.comment) {
    ghJson(['--method', 'PATCH', `repos/${repo}/issues/comments/${stored.comment.id}`, '-f', `body=${body}`]);
    return {changed: true, commentId: stored.comment.id};
  }
  const created = ghJson(['--method', 'POST', `repos/${repo}/issues/${issueNumber}/comments`, '-f', `body=${body}`]);
  return {changed: true, commentId: created?.id || null};
}

function appendOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  require('fs').appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function gate({contract, previous = null, explicitRearm = false} = {}) {
  const candidate = capabilityCandidate(contract, {explicitRearm});
  return decideCircuitBreaker(candidate, previous);
}

function runGate() {
  const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
  const issueNumber = String(process.env.PROTECTION_ISSUE_NUMBER || '321').trim();
  if (!repo) throw new Error('protection-attempt missing GITHUB_REPOSITORY');
  if (!process.env.GH_TOKEN) throw new Error('protection-attempt missing GH_TOKEN');
  const explicitRearm = String(process.env.EXPLICIT_REARM || '').toLowerCase() === 'true';
  const contract = loadProtectedMainContract();
  const stored = loadStored(repo, issueNumber);
  const decision = gate({contract, previous: stored.record, explicitRearm});
  const persisted = persist(repo, issueNumber, stored, decision);
  appendOutput('allow_attempt', decision.allowAttempt ? 'true' : 'false');
  appendOutput('state', decision.state);
  appendOutput('reason_code', decision.reasonCode);
  appendOutput('record_changed', persisted.changed ? 'true' : 'false');
  console.log(`PROTECTED_MAIN_CIRCUIT_BREAKER:${decision.state}:allowAttempt=${decision.allowAttempt}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    require('fs').appendFileSync(process.env.GITHUB_STEP_SUMMARY, `NATIVE_PROTECTION_CIRCUIT_BREAKER=${decision.state} allowAttempt=${decision.allowAttempt} recordChanged=${persisted.changed}\n`);
  }
}

if (require.main === module) {
  const command = process.argv[2];
  if (command !== 'gate') throw new Error(`protection-attempt unknown command: ${command || 'NONE'}`);
  runGate();
}

module.exports = {
  ACTION,
  OWNER,
  LANE_REASON,
  MARKER,
  capabilityCandidate,
  gate,
  parseRecord,
  recordView,
  renderRecord,
  sameRecord,
};
