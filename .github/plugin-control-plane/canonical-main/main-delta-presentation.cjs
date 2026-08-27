'use strict';

const { buildMainDeltaBrief } = require('./main-delta-brief.cjs');

const RISK_SCORE = Object.freeze({ NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 });
const SURFACE_ORDER = Object.freeze([
  'GOVERNANCE_AUTOMATION',
  'PRODUCT_RUNTIME',
  'TEST_ONLY',
  'DOCUMENTATION',
  'OTHER',
]);

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function isTestPath(path) {
  return /(^|\/)(test|tests|__tests__)(\/|$)/.test(path)
    || /\.(test|spec)\.[^/]+$/.test(path)
    || /(^|\/)test-[^/]+$/.test(path);
}

function classifyPath(value) {
  const path = normalizePath(value);
  if (!path) throw new Error('MAIN_DELTA_PRESENTATION_PATH_REQUIRED');

  if (path.startsWith('.github/')) {
    return { path, surface: 'GOVERNANCE_AUTOMATION', riskLevel: 'HIGH', riskScore: RISK_SCORE.HIGH };
  }

  if (
    path.startsWith('plugins/')
    || path.startsWith('products/')
    || path.startsWith('src/')
    || path.startsWith('scripts/')
    || path === 'package.json'
    || path.endsWith('/package.json')
    || path === 'package-lock.json'
    || path.endsWith('/package-lock.json')
  ) {
    if (isTestPath(path)) {
      return { path, surface: 'TEST_ONLY', riskLevel: 'LOW', riskScore: RISK_SCORE.LOW };
    }
    return { path, surface: 'PRODUCT_RUNTIME', riskLevel: 'MEDIUM', riskScore: RISK_SCORE.MEDIUM };
  }

  if (isTestPath(path)) {
    return { path, surface: 'TEST_ONLY', riskLevel: 'LOW', riskScore: RISK_SCORE.LOW };
  }

  if (
    path.startsWith('docs/')
    || path === 'README.md'
    || path.endsWith('/README.md')
    || /\.md$/i.test(path)
  ) {
    return { path, surface: 'DOCUMENTATION', riskLevel: 'LOW', riskScore: RISK_SCORE.LOW };
  }

  return { path, surface: 'OTHER', riskLevel: 'MEDIUM', riskScore: RISK_SCORE.MEDIUM };
}

function summarizeSurfaces(files) {
  const buckets = new Map(SURFACE_ORDER.map((surface) => [surface, []]));
  for (const entry of files) buckets.get(entry.surface).push(entry.path);
  return SURFACE_ORDER
    .map((surface) => ({ surface, count: buckets.get(surface).length, files: [...buckets.get(surface)].sort() }))
    .filter((entry) => entry.count > 0);
}

function deriveRiskAndAction(classifiedFiles) {
  if (!classifiedFiles.length) {
    return {
      riskLevel: 'NONE',
      actionRequired: false,
      actionCode: 'NO_ACTION_REQUIRED',
      riskDrivers: [],
    };
  }

  const maxScore = Math.max(...classifiedFiles.map((entry) => entry.riskScore));
  const riskLevel = Object.entries(RISK_SCORE).find(([, score]) => score === maxScore)[0];
  const riskDrivers = classifiedFiles
    .filter((entry) => entry.riskScore === maxScore)
    .map((entry) => entry.path)
    .sort();

  if (riskLevel === 'HIGH') {
    return {
      riskLevel,
      actionRequired: true,
      actionCode: 'REVIEW_GOVERNANCE_OR_AUTOMATION_CHANGE',
      riskDrivers,
    };
  }

  if (riskLevel === 'MEDIUM') {
    return {
      riskLevel,
      actionRequired: true,
      actionCode: 'REVIEW_PRODUCT_OR_RUNTIME_CHANGE',
      riskDrivers,
    };
  }

  return {
    riskLevel,
    actionRequired: false,
    actionCode: 'NO_IMMEDIATE_ACTION',
    riskDrivers,
  };
}

function buildAdvancementRequest(baseSha, headSha) {
  return {
    schemaVersion: 1,
    state: 'READY_AFTER_USER_VISIBLE_DELIVERY',
    expectedAnchorSha: baseSha,
    targetMainSha: headSha,
    reason: 'EXPLICIT_BRIEF_DELIVERED',
    issueMutationAuthorized: false,
    mainMutationAuthorized: false,
    releaseMutationAuthorized: false,
    executionAuthorized: false,
  };
}

function buildMainDeltaPresentation({ base, head, cwd = process.cwd() }) {
  const delta = buildMainDeltaBrief({ base, head, cwd });
  const classifiedFiles = delta.files.map(classifyPath);
  const risk = deriveRiskAndAction(classifiedFiles);

  return {
    schemaVersion: 1,
    mode: 'LAST_SEEN_MAIN_DELTA_PRESENTATION',
    state: 'OK',
    baseSha: delta.baseSha,
    headSha: delta.headSha,
    hasChanges: delta.commitCount > 0 || delta.fileCount > 0,
    commitCount: delta.commitCount,
    fileCount: delta.fileCount,
    riskLevel: risk.riskLevel,
    actionRequired: risk.actionRequired,
    actionCode: risk.actionCode,
    riskDrivers: risk.riskDrivers,
    claimsCurrentHealth: false,
    currentHealthState: 'NOT_EVALUATED_BY_U02',
    commits: delta.commits.map((entry) => ({ ...entry })),
    surfaces: summarizeSurfaces(classifiedFiles),
    advancementRequest: buildAdvancementRequest(delta.baseSha, delta.headSha),
  };
}

function inlineCode(value) {
  return `\`${String(value).replace(/`/g, "'")}\``;
}

function renderSurfaceLine(surface) {
  const preview = surface.files.slice(0, 6).map(inlineCode).join(', ');
  const remaining = surface.count - Math.min(surface.count, 6);
  const suffix = remaining > 0 ? ` (+${remaining} more)` : '';
  return `- ${surface.surface}: ${surface.count} file(s)${preview ? ` — ${preview}` : ''}${suffix}`;
}

function renderMainDeltaMarkdown(presentation) {
  if (!presentation || presentation.state !== 'OK') throw new Error('MAIN_DELTA_PRESENTATION_INVALID');

  const lines = [
    '## Last-Seen Main Delta Brief',
    `- From: ${inlineCode(presentation.baseSha)}`,
    `- To: ${inlineCode(presentation.headSha)}`,
    `- Changes: ${presentation.commitCount} commit(s) / ${presentation.fileCount} file(s)`,
    `- Risk: **${presentation.riskLevel}**`,
    `- Action: ${inlineCode(presentation.actionCode)}${presentation.actionRequired ? ' — review recommended' : ''}`,
    '- Current health: not evaluated by U-02; this brief describes change scope only.',
    '',
    '### Commits',
  ];

  if (!presentation.commits.length) {
    lines.push('- none');
  } else {
    for (const commit of presentation.commits) {
      lines.push(`- ${inlineCode(commit.sha.slice(0, 12))} ${String(commit.subject).replace(/\r?\n/g, ' ')}`);
    }
  }

  lines.push('', '### Changed surfaces');
  if (!presentation.surfaces.length) {
    lines.push('- none');
  } else {
    for (const surface of presentation.surfaces) lines.push(renderSurfaceLine(surface));
  }

  lines.push(
    '',
    '### Anchor handoff',
    `- State: ${inlineCode(presentation.advancementRequest.state)}`,
    `- Expected anchor: ${inlineCode(presentation.advancementRequest.expectedAnchorSha)}`,
    `- Target main: ${inlineCode(presentation.advancementRequest.targetMainSha)}`,
    '- This presenter does not mutate the anchor. A2 CAS advancement may be requested only after successful user-visible delivery.',
  );

  return `${lines.join('\n')}\n`;
}

function parseArgs(argv) {
  const args = Array.isArray(argv) ? [...argv] : [];
  let format = 'markdown';
  const formatIndex = args.findIndex((entry) => entry.startsWith('--format='));
  if (formatIndex >= 0) {
    format = args[formatIndex].slice('--format='.length);
    args.splice(formatIndex, 1);
  }
  if (!['json', 'markdown'].includes(format)) throw new Error(`MAIN_DELTA_PRESENTATION_FORMAT_INVALID:${format}`);
  if (args.length !== 2) throw new Error('usage: main-delta-presentation.cjs <base-sha-or-ref> <head-sha-or-ref> [--format=json|markdown]');
  return { base: args[0], head: args[1], format };
}

function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);
  const presentation = buildMainDeltaPresentation({ base: parsed.base, head: parsed.head });
  if (parsed.format === 'json') {
    process.stdout.write(`${JSON.stringify(presentation, null, 2)}\n`);
  } else {
    process.stdout.write(renderMainDeltaMarkdown(presentation));
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`MAIN_DELTA_PRESENTATION:ERROR:${error.message || String(error)}`);
    process.exitCode = 1;
  }
}

module.exports = {
  RISK_SCORE,
  SURFACE_ORDER,
  buildAdvancementRequest,
  buildMainDeltaPresentation,
  classifyPath,
  deriveRiskAndAction,
  isTestPath,
  normalizePath,
  parseArgs,
  renderMainDeltaMarkdown,
  summarizeSurfaces,
};
