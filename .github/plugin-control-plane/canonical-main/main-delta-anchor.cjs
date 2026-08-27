'use strict';

const { createGitHubClient } = require('./infra/github-client.cjs');

const ANCHOR_START = '<!-- canonical-main-delta-anchor:v1:start -->';
const ANCHOR_END = '<!-- canonical-main-delta-anchor:v1:end -->';
const SHA_RE = /^[0-9a-f]{40}$/;
const REASON_RE = /^[A-Z0-9][A-Z0-9_:-]{0,79}$/;

function isSha(value) {
  return typeof value === 'string' && SHA_RE.test(value);
}

function markerCount(body, marker) {
  const text = typeof body === 'string' ? body : '';
  return text.split(/\r?\n/).filter((line) => line.trim() === marker).length;
}

function validateAnchorState(state) {
  const errors = [];
  if (!state || typeof state !== 'object' || Array.isArray(state)) return ['ANCHOR_STATE_OBJECT_REQUIRED'];
  if (state.schemaVersion !== 1) errors.push('ANCHOR_SCHEMA_VERSION_INVALID');
  if (state.scope !== 'canonical-main') errors.push('ANCHOR_SCOPE_INVALID');
  if (!isSha(state.anchorSha)) errors.push('ANCHOR_SHA_INVALID');
  if (!Number.isSafeInteger(state.generation) || state.generation < 0) errors.push('ANCHOR_GENERATION_INVALID');
  if (state.advancedFrom !== null && !isSha(state.advancedFrom)) errors.push('ANCHOR_ADVANCED_FROM_INVALID');
  if (typeof state.advanceReason !== 'string' || !REASON_RE.test(state.advanceReason)) errors.push('ANCHOR_ADVANCE_REASON_INVALID');
  if (!Array.isArray(state.sourceRefs) || state.sourceRefs.some((entry) => typeof entry !== 'string' || entry.length === 0 || entry.length > 200)) {
    errors.push('ANCHOR_SOURCE_REFS_INVALID');
  } else if (state.sourceRefs.length > 20) {
    errors.push('ANCHOR_SOURCE_REFS_TOO_MANY');
  }
  return errors.sort();
}

function parseAnchorMarker(body) {
  const text = typeof body === 'string' ? body : '';
  const starts = markerCount(text, ANCHOR_START);
  const ends = markerCount(text, ANCHOR_END);
  if (starts === 0 && ends === 0) return { marked: false, state: null, error: 'ANCHOR_MARKER_MISSING', validationErrors: [] };
  if (starts !== 1 || ends !== 1) return { marked: true, state: null, error: 'ANCHOR_MARKER_COUNT_INVALID', validationErrors: [] };

  const start = text.indexOf(ANCHOR_START);
  const end = text.indexOf(ANCHOR_END, start + ANCHOR_START.length);
  if (start < 0 || end < 0 || end <= start) return { marked: true, state: null, error: 'ANCHOR_MARKER_RANGE_INVALID', validationErrors: [] };

  const block = text.slice(start + ANCHOR_START.length, end).trim().replace(/\r\n/g, '\n');
  const match = /^```json\n([\s\S]*?)\n```$/.exec(block);
  if (!match) return { marked: true, state: null, error: 'ANCHOR_JSON_FENCE_INVALID', validationErrors: [] };

  let state;
  try {
    state = JSON.parse(match[1]);
  } catch {
    return { marked: true, state: null, error: 'ANCHOR_JSON_INVALID', validationErrors: [] };
  }
  const validationErrors = validateAnchorState(state);
  if (validationErrors.length) return { marked: true, state, error: 'ANCHOR_STATE_INVALID', validationErrors };
  return { marked: true, state, error: null, validationErrors: [] };
}

function renderAnchorMarker(state) {
  const errors = validateAnchorState(state);
  if (errors.length) throw new Error(`ANCHOR_RENDER_INVALID:${errors.join(',')}`);
  const stable = {
    schemaVersion: 1,
    scope: 'canonical-main',
    anchorSha: state.anchorSha,
    generation: state.generation,
    advancedFrom: state.advancedFrom,
    advanceReason: state.advanceReason,
    sourceRefs: [...state.sourceRefs],
  };
  return `${ANCHOR_START}\n\`\`\`json\n${JSON.stringify(stable, null, 2)}\n\`\`\`\n${ANCHOR_END}`;
}

function replaceAnchorMarker(body, state) {
  const text = typeof body === 'string' ? body : '';
  const parsed = parseAnchorMarker(text);
  if (parsed.error) return { ok: false, body: text, reasonCodes: ['ANCHOR_REPLACE_EXISTING_INVALID', parsed.error, ...parsed.validationErrors] };
  const start = text.indexOf(ANCHOR_START);
  const end = text.indexOf(ANCHOR_END, start + ANCHOR_START.length);
  const after = end + ANCHOR_END.length;
  return { ok: true, body: `${text.slice(0, start)}${renderAnchorMarker(state)}${text.slice(after)}`, reasonCodes: ['ANCHOR_REPLACE_READY'] };
}

function result(status, reasonCodes, extras = {}) {
  return {
    schemaVersion: 1,
    mode: 'MAIN_DELTA_ANCHOR_CAS',
    status,
    changed: Boolean(extras.changed),
    issueMutationAuthorized: Boolean(extras.issueMutationAuthorized),
    mainMutationAuthorized: false,
    releaseMutationAuthorized: false,
    executionAuthorized: false,
    anchorSha: extras.anchorSha || null,
    targetMainSha: extras.targetMainSha || null,
    generation: Number.isSafeInteger(extras.generation) ? extras.generation : null,
    updatedBody: extras.updatedBody || null,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

function planAnchorAdvance({ body, expectedAnchorSha, targetMainSha, observedMainSha, compareStatus, reason = 'EXPLICIT_BRIEF_DELIVERED' } = {}) {
  if (!isSha(expectedAnchorSha)) return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_EXPECTED_SHA_INVALID']);
  if (!isSha(targetMainSha)) return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_TARGET_SHA_INVALID']);
  if (!isSha(observedMainSha)) return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_OBSERVED_MAIN_SHA_INVALID']);
  if (typeof reason !== 'string' || !REASON_RE.test(reason)) return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_REASON_INVALID']);

  const parsed = parseAnchorMarker(body);
  if (parsed.error) return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_STATE_READ_BLOCKED', parsed.error, ...parsed.validationErrors]);
  const current = parsed.state;

  if (expectedAnchorSha !== current.anchorSha) {
    return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_CAS_STALE_EXPECTATION'], { anchorSha: current.anchorSha, targetMainSha, generation: current.generation });
  }
  if (targetMainSha !== observedMainSha) {
    return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_TARGET_NOT_CURRENT_MAIN'], { anchorSha: current.anchorSha, targetMainSha, generation: current.generation });
  }

  if (current.anchorSha === targetMainSha) {
    if (compareStatus !== 'identical') {
      return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_IDENTICAL_COMPARE_MISMATCH'], { anchorSha: current.anchorSha, targetMainSha, generation: current.generation });
    }
    return result('ANCHOR_ADVANCE_NOOP', ['ANCHOR_ALREADY_CURRENT'], { anchorSha: current.anchorSha, targetMainSha, generation: current.generation });
  }

  if (compareStatus !== 'ahead') {
    return result('ANCHOR_ADVANCE_BLOCKED', [`ANCHOR_FORWARD_COMPARE_REJECTED:${String(compareStatus || 'unknown')}`], {
      anchorSha: current.anchorSha,
      targetMainSha,
      generation: current.generation,
    });
  }

  const sourceRefs = [...new Set([...(current.sourceRefs || []), `commit:${targetMainSha}`])].slice(-20);
  const next = {
    schemaVersion: 1,
    scope: 'canonical-main',
    anchorSha: targetMainSha,
    generation: current.generation + 1,
    advancedFrom: current.anchorSha,
    advanceReason: reason,
    sourceRefs,
  };
  const replacement = replaceAnchorMarker(body, next);
  if (!replacement.ok) return result('ANCHOR_ADVANCE_BLOCKED', replacement.reasonCodes, { anchorSha: current.anchorSha, targetMainSha, generation: current.generation });

  return result('ANCHOR_ADVANCE_READY', ['ANCHOR_CAS_MATCH', 'ANCHOR_CURRENT_MAIN_MATCH', 'ANCHOR_FORWARD_ONLY_PROVEN'], {
    changed: true,
    issueMutationAuthorized: true,
    anchorSha: next.anchorSha,
    targetMainSha,
    generation: next.generation,
    updatedBody: replacement.body,
  });
}

async function executeAnchorAdvance({ client, issueNumber, expectedAnchorSha, targetMainSha, reason = 'EXPLICIT_BRIEF_DELIVERED' } = {}) {
  if (!client || typeof client.api !== 'function') return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_CLIENT_REQUIRED']);
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_ISSUE_NUMBER_INVALID']);

  const issue = await client.api(`/issues/${issueNumber}`);
  if (!issue || issue.pull_request || issue.state !== 'open') return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_STATE_ISSUE_INVALID']);
  const main = await client.api('/branches/main');
  const observedMainSha = main && main.commit && main.commit.sha;

  const parsed = parseAnchorMarker(issue.body);
  if (parsed.error) return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_STATE_READ_BLOCKED', parsed.error, ...parsed.validationErrors]);
  if (!isSha(expectedAnchorSha) || expectedAnchorSha !== parsed.state.anchorSha) {
    return planAnchorAdvance({ body: issue.body, expectedAnchorSha, targetMainSha, observedMainSha, compareStatus: null, reason });
  }
  if (!isSha(targetMainSha) || targetMainSha !== observedMainSha) {
    return planAnchorAdvance({ body: issue.body, expectedAnchorSha, targetMainSha, observedMainSha, compareStatus: null, reason });
  }

  const comparison = await client.api(`/compare/${parsed.state.anchorSha}...${targetMainSha}`);
  const plan = planAnchorAdvance({
    body: issue.body,
    expectedAnchorSha,
    targetMainSha,
    observedMainSha,
    compareStatus: comparison && comparison.status,
    reason,
  });
  if (plan.status !== 'ANCHOR_ADVANCE_READY') return plan;

  const issueBarrier = await client.api(`/issues/${issueNumber}`);
  const mainBarrier = await client.api('/branches/main');
  if (!issueBarrier || issueBarrier.body !== issue.body) {
    return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_ISSUE_CHANGED_BEFORE_WRITE'], { anchorSha: parsed.state.anchorSha, targetMainSha, generation: parsed.state.generation });
  }
  if (!mainBarrier || !mainBarrier.commit || mainBarrier.commit.sha !== observedMainSha) {
    return result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_MAIN_CHANGED_BEFORE_WRITE'], { anchorSha: parsed.state.anchorSha, targetMainSha, generation: parsed.state.generation });
  }

  await client.api(`/issues/${issueNumber}`, { method: 'PATCH', body: { body: plan.updatedBody } });
  return result('ANCHOR_ADVANCE_UPDATED', ['ANCHOR_ISSUE_STATE_UPDATED'], {
    changed: true,
    anchorSha: plan.anchorSha,
    targetMainSha,
    generation: plan.generation,
  });
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  if (args[0] !== 'advance') return null;
  function value(flag) {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : null;
  }
  const issueRaw = value('--issue');
  const issueNumber = /^\d+$/.test(issueRaw || '') ? Number(issueRaw) : null;
  const expectedAnchorSha = value('--expected-anchor');
  const targetMainSha = value('--target-main');
  const reason = value('--reason') || 'EXPLICIT_BRIEF_DELIVERED';
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0 || !expectedAnchorSha || !targetMainSha) return null;
  return { issueNumber, expectedAnchorSha, targetMainSha, reason };
}

async function run({ argv = process.argv.slice(2), env = process.env } = {}) {
  const parsed = parseArgs(argv);
  if (!parsed) {
    process.stdout.write(`${JSON.stringify(result('ANCHOR_ADVANCE_BLOCKED', ['ANCHOR_ARGUMENTS_INVALID']), null, 2)}\n`);
    return 2;
  }
  const client = createGitHubClient({
    token: env.GH_TOKEN || env.GITHUB_TOKEN,
    repo: env.GITHUB_REPOSITORY,
    userAgent: 'canonical-main-delta-anchor',
  });
  const output = await executeAnchorAdvance({ client, ...parsed });
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  return output.status === 'ANCHOR_ADVANCE_UPDATED' || output.status === 'ANCHOR_ADVANCE_NOOP' ? 0 : 2;
}

if (require.main === module) {
  run().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`main-delta-anchor fatal: ${error && error.message ? error.message : error}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  ANCHOR_END,
  ANCHOR_START,
  executeAnchorAdvance,
  isSha,
  markerCount,
  parseAnchorMarker,
  parseArgs,
  planAnchorAdvance,
  renderAnchorMarker,
  replaceAnchorMarker,
  result,
  run,
  validateAnchorState,
};
