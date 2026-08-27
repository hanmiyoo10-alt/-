'use strict';

const {ANCHOR_START, parseAnchorMarker} = require('../main-delta-anchor.cjs');
const {classifyPath, deriveRiskAndAction} = require('../main-delta-presentation.cjs');

function unknown(summary, reasonCode, data = {}) {
  return {
    known: false,
    summary: `UNKNOWN — ${summary}`,
    events: [],
    data: {state: 'UNKNOWN', reasonCode, ...data},
  };
}

function knownDelta({anchorSha, generation, headSha, commitCount, files}) {
  const classified = files.map(classifyPath);
  const risk = deriveRiskAndAction(classified);
  return {
    known: true,
    summary: `${risk.riskLevel} — ${commitCount} commit(s) / ${files.length} file(s)`,
    events: [],
    data: {
      state: 'OK',
      anchorSha,
      generation,
      headSha,
      commitCount,
      fileCount: files.length,
      riskLevel: risk.riskLevel,
      actionRequired: risk.actionRequired,
      actionCode: risk.actionCode,
      riskDrivers: risk.riskDrivers,
      claimsCurrentHealth: false,
    },
  };
}

async function observe(context) {
  const allIssues = Array.isArray(context?.allIssues) ? context.allIssues : [];
  const mainSha = context?.mainSha;
  const client = context?.client;
  const candidates = allIssues.filter((issue) => issue?.state === 'open' && String(issue?.body || '').includes(ANCHOR_START));
  if (candidates.length !== 1) {
    return unknown('last-seen anchor cardinality is not exactly one', 'MAIN_DELTA_ANCHOR_CARDINALITY', {candidateCount: candidates.length});
  }

  const parsed = parseAnchorMarker(candidates[0].body || '');
  if (parsed.error) {
    return unknown('last-seen anchor marker is invalid', parsed.error, {validationErrors: parsed.validationErrors || []});
  }
  if (!/^[0-9a-f]{40}$/.test(String(mainSha || ''))) return unknown('current main SHA is invalid', 'MAIN_DELTA_MAIN_SHA_INVALID');

  const {anchorSha, generation} = parsed.state;
  if (anchorSha === mainSha) return knownDelta({anchorSha, generation, headSha: mainSha, commitCount: 0, files: []});
  if (!client || typeof client.api !== 'function') return unknown('GitHub compare client is unavailable', 'MAIN_DELTA_COMPARE_CLIENT_UNAVAILABLE', {anchorSha, headSha: mainSha});

  const comparison = await client.api(`/compare/${anchorSha}...${mainSha}`);
  if (!comparison || comparison.status !== 'ahead') {
    return unknown(`last-seen anchor is not a proven ancestor of current main (${comparison?.status || 'missing'})`, 'MAIN_DELTA_COMPARE_NOT_AHEAD', {
      anchorSha,
      headSha: mainSha,
      compareStatus: comparison?.status || null,
    });
  }

  const files = Array.isArray(comparison.files) ? comparison.files.map((row) => row?.filename).filter(Boolean) : [];
  if (files.length >= 300) {
    return unknown('changed-file compare reached the GitHub bounded file ceiling', 'MAIN_DELTA_COMPARE_FILE_BOUNDARY', {
      anchorSha,
      headSha: mainSha,
      observedFileCount: files.length,
    });
  }
  const commitCount = Number.isSafeInteger(comparison.ahead_by)
    ? comparison.ahead_by
    : (Array.isArray(comparison.commits) ? comparison.commits.length : 0);
  return knownDelta({anchorSha, generation, headSha: mainSha, commitCount, files});
}

module.exports = {knownDelta, observe, unknown};
