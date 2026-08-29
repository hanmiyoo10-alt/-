#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_FIELDS = new Set(['validation_status', 'current_priority', 'major_update_checkpoint']);
const ALLOWED_DOCUMENT_PATHS = new Set(['docs/CURRENT_DEVELOPMENT.md']);
const IDENTITY_FIELDS = ['production_version', 'release_name', 'release_branch', 'release_commit', 'release_blob'];
const TOP_LEVEL_KEYS = new Set([
  'schemaVersion', 'product', 'transitionId', 'expectedProductionCommit',
  'expected', 'set', 'evidence', 'documentReplacements',
]);

function fail(code, detail = '') {
  const error = new Error(detail || code);
  error.code = code;
  throw error;
}

function parseArgs(argv) {
  const out = { write: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--write') { out.write = true; continue; }
    if (!arg.startsWith('--') || i + 1 >= argv.length) fail('ADMIN_TRANSITION_ARGS_INVALID', arg);
    out[arg.slice(2)] = argv[++i];
  }
  for (const key of ['root', 'transition', 'manifest']) if (!out[key]) fail('ADMIN_TRANSITION_ARGS_INVALID', `--${key} required`);
  return out;
}

function inside(root, rel) {
  const base = path.resolve(root);
  const resolved = path.resolve(base, rel);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) fail('ADMIN_TRANSITION_PATH_INVALID', rel);
  return resolved;
}

function readJson(file, code) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { fail(code, error.message); }
}

function countLiteral(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let at = 0;
  while (true) {
    const found = text.indexOf(needle, at);
    if (found === -1) return count;
    count += 1;
    at = found + needle.length;
  }
}

function validateTransition(t) {
  if (t?.schemaVersion !== 1 || t?.product !== 'SimCore') fail('ADMIN_TRANSITION_SCHEMA_INVALID');
  for (const key of Object.keys(t)) if (!TOP_LEVEL_KEYS.has(key)) fail('ADMIN_TRANSITION_TOP_LEVEL_FIELD_DENIED', key);
  if (!/^[A-Za-z0-9._-]{3,120}$/.test(String(t.transitionId || ''))) fail('ADMIN_TRANSITION_ID_INVALID');
  if (!/^[0-9a-f]{40}$/.test(String(t.expectedProductionCommit || ''))) fail('ADMIN_TRANSITION_PRODUCTION_ID_INVALID');
  if (!t.expected || typeof t.expected !== 'object' || Array.isArray(t.expected)) fail('ADMIN_TRANSITION_EXPECTED_INVALID');
  if (!t.set || typeof t.set !== 'object' || Array.isArray(t.set)) fail('ADMIN_TRANSITION_SET_INVALID');

  const expectedKeys = Object.keys(t.expected).sort();
  const setKeys = Object.keys(t.set).sort();
  if (setKeys.length === 0 || JSON.stringify(expectedKeys) !== JSON.stringify(setKeys)) fail('ADMIN_TRANSITION_FIELD_SET_MISMATCH');
  for (const key of setKeys) {
    if (!ALLOWED_FIELDS.has(key)) fail('ADMIN_TRANSITION_FIELD_DENIED', key);
    if (typeof t.expected[key] !== 'string' || !t.expected[key]) fail('ADMIN_TRANSITION_VALUE_INVALID', `expected.${key}`);
    if (typeof t.set[key] !== 'string' || !t.set[key]) fail('ADMIN_TRANSITION_VALUE_INVALID', `set.${key}`);
    if (t.expected[key] === t.set[key]) fail('ADMIN_TRANSITION_NOOP_FIELD', key);
  }

  if (!Array.isArray(t.evidence) || t.evidence.length === 0 || t.evidence.some((x) => typeof x !== 'string' || !x.startsWith('docs/'))) {
    fail('ADMIN_TRANSITION_EVIDENCE_INVALID');
  }

  const replacements = t.documentReplacements ?? [];
  if (!Array.isArray(replacements)) fail('ADMIN_TRANSITION_DOCUMENT_REPLACEMENTS_INVALID');
  const ids = new Set();
  for (const row of replacements) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) fail('ADMIN_TRANSITION_DOCUMENT_REPLACEMENT_INVALID');
    const keys = Object.keys(row).sort();
    if (JSON.stringify(keys) !== JSON.stringify(['from', 'id', 'path', 'to'])) fail('ADMIN_TRANSITION_DOCUMENT_REPLACEMENT_SHAPE_INVALID');
    if (!/^[A-Za-z0-9._-]{3,120}$/.test(String(row.id || '')) || ids.has(row.id)) fail('ADMIN_TRANSITION_DOCUMENT_REPLACEMENT_ID_INVALID', row.id);
    ids.add(row.id);
    if (!ALLOWED_DOCUMENT_PATHS.has(row.path)) fail('ADMIN_TRANSITION_DOCUMENT_PATH_DENIED', row.path);
    if (typeof row.from !== 'string' || !row.from || typeof row.to !== 'string' || !row.to || row.from === row.to) {
      fail('ADMIN_TRANSITION_DOCUMENT_REPLACEMENT_TEXT_INVALID', row.id);
    }
  }

  return { fields: setKeys, replacements };
}

function sameIdentity(before, after) {
  return IDENTITY_FIELDS.every((key) => before[key] === after[key]);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = path.resolve(args.root);
  const transitionPath = inside(root, args.transition);
  const manifestPath = inside(root, args.manifest);
  const reportPath = args.report ? inside(root, args.report) : null;
  const transition = readJson(transitionPath, 'ADMIN_TRANSITION_SPEC_INVALID');
  const { fields, replacements } = validateTransition(transition);
  const manifest = readJson(manifestPath, 'ADMIN_TRANSITION_MANIFEST_INVALID');

  if (manifest.product !== 'SimCore') fail('ADMIN_TRANSITION_PRODUCT_MISMATCH');
  if (manifest.release_commit !== transition.expectedProductionCommit) {
    fail('ADMIN_TRANSITION_PRODUCTION_MISMATCH', `${manifest.release_commit} != ${transition.expectedProductionCommit}`);
  }

  const nextManifest = structuredClone(manifest);
  const manifestChanged = [];
  for (const key of fields) {
    if (manifest[key] === transition.expected[key]) {
      nextManifest[key] = transition.set[key];
      manifestChanged.push(key);
    } else if (manifest[key] !== transition.set[key]) {
      fail('ADMIN_TRANSITION_STATE_MISMATCH', `${key}=${JSON.stringify(manifest[key])}`);
    }
  }
  if (!sameIdentity(manifest, nextManifest)) fail('ADMIN_TRANSITION_IDENTITY_MUTATION');

  const documents = new Map();
  const documentChanged = [];
  for (const row of replacements) {
    const file = inside(root, row.path);
    let text = documents.has(row.path) ? documents.get(row.path) : fs.readFileSync(file, 'utf8');
    const fromCount = countLiteral(text, row.from);
    const toCount = countLiteral(text, row.to);
    if (fromCount === 1 && toCount === 0) {
      text = text.replace(row.from, row.to);
      documents.set(row.path, text);
      documentChanged.push(row.id);
    } else if (fromCount === 0 && toCount === 1) {
      documents.set(row.path, text);
    } else {
      fail('ADMIN_TRANSITION_DOCUMENT_STATE_MISMATCH', `${row.id}:from=${fromCount}:to=${toCount}`);
    }
  }

  const changeCount = manifestChanged.length + documentChanged.length;
  const disposition = changeCount === 0 ? 'ALREADY_APPLIED' : args.write ? 'APPLIED' : 'WOULD_APPLY';

  if (args.write && changeCount > 0) {
    if (manifestChanged.length > 0) fs.writeFileSync(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, 'utf8');
    for (const [rel, text] of documents.entries()) {
      if (replacements.some((row) => row.path === rel && documentChanged.includes(row.id))) {
        fs.writeFileSync(inside(root, rel), text, 'utf8');
      }
    }
  }

  const report = {
    schemaVersion: 1,
    product: 'SimCore',
    transitionId: transition.transitionId,
    productionCommit: manifest.release_commit,
    manifestFields: fields,
    manifestChanged,
    documentReplacementIds: replacements.map((row) => row.id),
    documentChanged,
    disposition,
    write: Boolean(args.write),
    evidence: transition.evidence,
  };
  if (reportPath) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  process.stdout.write(`SIMCORE_ADMIN_STATE_TRANSITION_${disposition}:${transition.transitionId}\n`);
}

try { main(); }
catch (error) {
  console.error(`${error?.code || 'ADMIN_TRANSITION_ERROR'}: ${error?.message || error}`);
  process.exit(2);
}
