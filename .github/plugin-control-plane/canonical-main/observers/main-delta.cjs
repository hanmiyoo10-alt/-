'use strict';

const {ANCHOR_START, parseAnchorMarker} = require('../main-delta-anchor.cjs');
const {classifyPath, deriveRiskAndAction, summarizeCommitNoise} = require('../main-delta-presentation.cjs');

const SHA_RE = /^[0-9a-f]{40}$/;
const COMPARE_FILE_CEILING = 300;

function unknown(summary, reasonCode, data = {}) {
  return {
    known: false,
    summary: `UNKNOWN — ${summary}`,
    events: [],
    data: {state: 'UNKNOWN', reasonCode, ...data},
  };
}

function knownDelta({
  anchorSha,
  generation,
  headSha,
  commitCount,
  files,
  commits = [],
  fileEvidenceSource = 'compare',
  commitMessageCoverageComplete = commits.length === commitCount,
}) {
  const classified = files.map(classifyPath);
  const risk = deriveRiskAndAction(classified);
  const noise = commitMessageCoverageComplete ? summarizeCommitNoise(commits, commitCount) : null;
  const commitSummary = noise?.routineGeneratedDocCommitCount > 0
    ? `${commitCount} total commit(s) (${noise.meaningfulCommitCount} meaningful + ${noise.routineGeneratedDocCommitCount} routine generated-doc)`
    : `${commitCount} commit(s)`;
  return {
    known: true,
    summary: `${risk.riskLevel} — ${commitSummary} / ${files.length} file(s)`,
    events: [],
    data: {
      state: 'OK',
      anchorSha,
      generation,
      headSha,
      commitCount,
      meaningfulCommitCount: noise ? noise.meaningfulCommitCount : null,
      routineGeneratedDocCommitCount: noise ? noise.routineGeneratedDocCommitCount : null,
      commitMessageCoverageComplete,
      fileCount: files.length,
      fileEvidenceSource,
      riskLevel: risk.riskLevel,
      actionRequired: risk.actionRequired,
      actionCode: risk.actionCode,
      riskDrivers: risk.riskDrivers,
      claimsCurrentHealth: false,
    },
  };
}

function treeEntriesToLeafMap(tree, treeRole) {
  if (!tree || typeof tree !== 'object' || Array.isArray(tree) || !Array.isArray(tree.tree)) {
    return {ok: false, reasonCode: 'MAIN_DELTA_TREE_RESPONSE_INVALID', treeRole};
  }
  if (tree.truncated === true) return {ok: false, reasonCode: 'MAIN_DELTA_TREE_TRUNCATED', treeRole};
  if (tree.truncated !== false) return {ok: false, reasonCode: 'MAIN_DELTA_TREE_RESPONSE_INVALID', treeRole};

  const leaves = new Map();
  for (const entry of tree.tree) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return {ok: false, reasonCode: 'MAIN_DELTA_TREE_ENTRY_INVALID', treeRole};
    }
    if (entry.type === 'tree') continue;
    if (
      typeof entry.path !== 'string'
      || entry.path.length === 0
      || typeof entry.type !== 'string'
      || entry.type.length === 0
      || typeof entry.mode !== 'string'
      || entry.mode.length === 0
      || !SHA_RE.test(String(entry.sha || ''))
      || leaves.has(entry.path)
    ) {
      return {ok: false, reasonCode: 'MAIN_DELTA_TREE_ENTRY_INVALID', treeRole};
    }
    leaves.set(entry.path, `${entry.type}\0${entry.mode}\0${entry.sha}`);
  }
  return {ok: true, leaves};
}

function changedPathsFromTrees(baseLeaves, headLeaves) {
  const paths = new Set([...baseLeaves.keys(), ...headLeaves.keys()]);
  return [...paths]
    .filter((path) => baseLeaves.get(path) !== headLeaves.get(path))
    .sort();
}

async function fetchCompleteTree(client, commitSha, treeRole) {
  try {
    const commit = await client.api(`/git/commits/${commitSha}`);
    const treeSha = commit?.tree?.sha;
    if (!SHA_RE.test(String(treeSha || ''))) {
      return {ok: false, reasonCode: 'MAIN_DELTA_TREE_COMMIT_INVALID', treeRole};
    }
    const tree = await client.api(`/git/trees/${treeSha}?recursive=1`);
    const parsed = treeEntriesToLeafMap(tree, treeRole);
    if (!parsed.ok) return parsed;
    return {ok: true, treeSha, leaves: parsed.leaves};
  } catch {
    return {ok: false, reasonCode: 'MAIN_DELTA_TREE_FETCH_FAILED', treeRole};
  }
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
  if (!SHA_RE.test(String(mainSha || ''))) return unknown('current main SHA is invalid', 'MAIN_DELTA_MAIN_SHA_INVALID');

  const {anchorSha, generation} = parsed.state;
  if (anchorSha === mainSha) {
    return knownDelta({
      anchorSha,
      generation,
      headSha: mainSha,
      commitCount: 0,
      files: [],
      commits: [],
      fileEvidenceSource: 'identical',
      commitMessageCoverageComplete: true,
    });
  }
  if (!client || typeof client.api !== 'function') return unknown('GitHub compare client is unavailable', 'MAIN_DELTA_COMPARE_CLIENT_UNAVAILABLE', {anchorSha, headSha: mainSha});

  const comparison = await client.api(`/compare/${anchorSha}...${mainSha}`);
  if (!comparison || comparison.status !== 'ahead') {
    return unknown(`last-seen anchor is not a proven ancestor of current main (${comparison?.status || 'missing'})`, 'MAIN_DELTA_COMPARE_NOT_AHEAD', {
      anchorSha,
      headSha: mainSha,
      compareStatus: comparison?.status || null,
    });
  }

  const compareFiles = Array.isArray(comparison.files) ? comparison.files.map((row) => row?.filename).filter(Boolean) : [];
  let files = compareFiles;
  let fileEvidenceSource = 'compare';
  if (compareFiles.length >= COMPARE_FILE_CEILING) {
    const baseTree = await fetchCompleteTree(client, anchorSha, 'anchor');
    if (!baseTree.ok) {
      return unknown('complete anchor tree evidence is unavailable at the compare file boundary', baseTree.reasonCode, {
        anchorSha,
        headSha: mainSha,
        observedFileCount: compareFiles.length,
        treeRole: baseTree.treeRole,
      });
    }
    const headTree = await fetchCompleteTree(client, mainSha, 'head');
    if (!headTree.ok) {
      return unknown('complete head tree evidence is unavailable at the compare file boundary', headTree.reasonCode, {
        anchorSha,
        headSha: mainSha,
        observedFileCount: compareFiles.length,
        treeRole: headTree.treeRole,
      });
    }
    files = changedPathsFromTrees(baseTree.leaves, headTree.leaves);
    fileEvidenceSource = 'git-tree-fallback';
  }

  const commits = Array.isArray(comparison.commits) ? comparison.commits : [];
  const commitCount = Number.isSafeInteger(comparison.ahead_by)
    ? comparison.ahead_by
    : commits.length;
  const commitMessageCoverageComplete = Number.isSafeInteger(comparison.ahead_by)
    && comparison.ahead_by >= 0
    && commits.length === comparison.ahead_by;
  return knownDelta({
    anchorSha,
    generation,
    headSha: mainSha,
    commitCount,
    files,
    commits,
    fileEvidenceSource,
    commitMessageCoverageComplete,
  });
}

module.exports = {
  changedPathsFromTrees,
  fetchCompleteTree,
  knownDelta,
  observe,
  treeEntriesToLeafMap,
  unknown,
};
