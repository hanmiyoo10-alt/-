#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_STALE_DAYS = 14;
const MAX_ROWS = 512;
const MAX_TEXT = 4096;
const MAX_REPORT = 512 * 1024;
const REQUIRED = Object.freeze(['number', 'state', 'title', 'base', 'head', 'createdAt', 'updatedAt']);
const CLASSIFICATIONS = new Set([
  'KEEP_ACTIVE',
  'REVIEW_LEGACY_CONTROL',
  'COMMAND_ONLY_DONE',
  'SUPERSEDED',
  'REVIEW_STALE',
  'UNKNOWN',
]);

function parseArgs(argv) {
  const out = { staleDays: DEFAULT_STALE_DAYS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--input' || arg === '--report' || arg === '--stale-days') {
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) throw new Error(`missing value for ${arg}`);
      const value = argv[++i];
      if (arg === '--input') out.input = value;
      else if (arg === '--report') out.report = value;
      else out.staleDays = Number(value);
    } else throw new Error(`invalid argument ${arg}`);
  }
  if (!out.input || !out.report) throw new Error('--input and --report required');
  if (!Number.isInteger(out.staleDays) || out.staleDays < 1 || out.staleDays > 3650) throw new Error('--stale-days must be an integer from 1 to 3650');
  return out;
}

function boundedText(value) {
  return typeof value === 'string' ? value.slice(0, MAX_TEXT) : '';
}

function validDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function normalizeToken(value) {
  return String(value ?? '').trim();
}

function normalizeContext(raw = {}) {
  const array = (name) => Array.isArray(raw?.[name]) ? raw[name].map(normalizeToken).filter(Boolean) : [];
  return {
    productionBranch: normalizeToken(raw?.productionBranch),
    activePullRequests: new Set(array('activePullRequests')),
    activeHeads: new Set(array('activeHeads')),
    knownCompletedWork: new Set(array('knownCompletedWork')),
    knownSupersededHeads: new Set(array('knownSupersededHeads')),
  };
}

function hasRequired(row) {
  return row && REQUIRED.every((key) => Object.prototype.hasOwnProperty.call(row, key));
}

function workTokens(row) {
  return [String(row.number), `#${row.number}`, normalizeToken(row.head)].filter(Boolean);
}

function setContainsAny(set, values) {
  return values.some((value) => set.has(String(value)));
}

function bodyMarksCommandOnly(body) {
  const text = boundedText(body);
  return /\bcommand[- ]only\b/i.test(text)
    || (/\btrigger\b/i.test(text) && /not intended to merge|not for merge|do not merge/i.test(text));
}

function reasonSorted(values) {
  return [...new Set(values)].sort();
}

export function classifyPullRequest(row, { capturedAtMs, staleDays, context }) {
  if (!hasRequired(row)
      || !Number.isInteger(row.number) || row.number <= 0
      || !['open', 'closed', 'merged'].includes(String(row.state).toLowerCase())
      || typeof row.title !== 'string'
      || typeof row.base !== 'string'
      || typeof row.head !== 'string') {
    return {
      number: Number.isInteger(row?.number) ? row.number : null,
      classification: 'UNKNOWN',
      reasonCodes: ['MISSING_REQUIRED_METADATA'],
      action: 'REVIEW_METADATA',
    };
  }

  const state = String(row.state).toLowerCase();
  if (state !== 'open') return null;

  const updatedAtMs = validDate(row.updatedAt);
  const createdAtMs = validDate(row.createdAt);
  if (updatedAtMs === null || createdAtMs === null || updatedAtMs > capturedAtMs || createdAtMs > capturedAtMs) {
    return {
      number: row.number,
      classification: 'UNKNOWN',
      reasonCodes: ['MISSING_REQUIRED_METADATA'],
      action: 'REVIEW_METADATA',
    };
  }

  const tokens = workTokens(row);
  const active = context.activePullRequests.has(String(row.number)) || context.activeHeads.has(row.head);
  const superseded = context.knownSupersededHeads.has(row.head);

  if (active && superseded) {
    return {
      number: row.number,
      classification: 'UNKNOWN',
      reasonCodes: ['CONTEXT_CONTRADICTORY'],
      action: 'REVIEW_METADATA',
    };
  }

  if (active) {
    return {
      number: row.number,
      classification: 'KEEP_ACTIVE',
      reasonCodes: ['EXPLICIT_ACTIVE_CONTEXT'],
      action: 'KEEP_OPEN',
    };
  }

  if (context.productionBranch && row.head === context.productionBranch) {
    return {
      number: row.number,
      classification: 'REVIEW_LEGACY_CONTROL',
      reasonCodes: ['PRODUCTION_BRANCH_HEAD'],
      action: 'HUMAN_REVIEW_ONLY',
    };
  }

  const completed = setContainsAny(context.knownCompletedWork, tokens);
  if (bodyMarksCommandOnly(row.body) && completed) {
    return {
      number: row.number,
      classification: 'COMMAND_ONLY_DONE',
      reasonCodes: reasonSorted(['BODY_NOT_INTENDED_TO_MERGE', 'KNOWN_WORK_COMPLETED']),
      action: 'REVIEW_FOR_MANUAL_CLOSE',
    };
  }

  if (superseded) {
    return {
      number: row.number,
      classification: 'SUPERSEDED',
      reasonCodes: ['KNOWN_SUPERSEDED_HEAD'],
      action: 'REVIEW_FOR_MANUAL_CLOSE',
    };
  }

  const ageDays = Math.floor((capturedAtMs - updatedAtMs) / 86400000);
  if (ageDays >= staleDays) {
    return {
      number: row.number,
      classification: 'REVIEW_STALE',
      reasonCodes: ['AGE_THRESHOLD_EXCEEDED'],
      action: 'HUMAN_REVIEW_ONLY',
    };
  }

  return {
    number: row.number,
    classification: 'KEEP_ACTIVE',
    reasonCodes: ['NO_STALE_SIGNAL'],
    action: 'KEEP_OPEN',
  };
}

export function classifySnapshot(input, staleDays = DEFAULT_STALE_DAYS) {
  if (!input || input.schemaVersion !== 1 || !Array.isArray(input.pullRequests) || input.pullRequests.length > MAX_ROWS) {
    throw new Error('invalid S-11 input envelope');
  }
  const capturedAtMs = validDate(input.capturedAt);
  if (capturedAtMs === null) throw new Error('capturedAt required');
  const context = normalizeContext(input.context || {});

  const rows = input.pullRequests
    .map((row) => classifyPullRequest(row, { capturedAtMs, staleDays, context }))
    .filter(Boolean)
    .sort((a, b) => (a.number ?? Number.MAX_SAFE_INTEGER) - (b.number ?? Number.MAX_SAFE_INTEGER));

  for (const row of rows) {
    if (!CLASSIFICATIONS.has(row.classification)) throw new Error(`unsupported classification ${row.classification}`);
    row.reasonCodes = reasonSorted(row.reasonCodes).slice(0, 8);
  }

  const result = rows.some((row) => row.classification === 'UNKNOWN') ? 'BLOCKED'
    : rows.some((row) => row.classification !== 'KEEP_ACTIVE') ? 'REVIEW_REQUIRED'
      : 'CLEAN';

  return {
    schemaVersion: 1,
    tool: 'stale-pr-hygiene',
    staleReviewDays: staleDays,
    result,
    rows,
  };
}

function writeReport(file, report) {
  const bytes = Buffer.from(`${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (bytes.length > MAX_REPORT) throw new Error('S-11 report exceeds 512 KiB');
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(path.resolve(file), bytes);
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const input = JSON.parse(fs.readFileSync(path.resolve(args.input), 'utf8'));
  const report = classifySnapshot(input, args.staleDays);
  writeReport(args.report, report);
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = run();
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.result === 'BLOCKED' ? 2 : report.result === 'REVIEW_REQUIRED' ? 1 : 0;
  } catch (error) {
    console.error(`STALE_PR_HYGIENE_ERROR: ${error?.message || error}`);
    process.exitCode = 2;
  }
}
