#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ALLOWED_FIELDS = new Set(['validation_status', 'current_priority']);
const IDENTITY_FIELDS = ['production_version', 'release_name', 'release_branch', 'release_commit', 'release_blob'];

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

function validateTransition(t) {
  if (t?.schemaVersion !== 1 || t?.product !== 'SimCore') fail('ADMIN_TRANSITION_SCHEMA_INVALID');
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
  return setKeys;
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
  const fields = validateTransition(transition);
  const manifest = readJson(manifestPath, 'ADMIN_TRANSITION_MANIFEST_INVALID');

  if (manifest.product !== 'SimCore') fail('ADMIN_TRANSITION_PRODUCT_MISMATCH');
  if (manifest.release_commit !== transition.expectedProductionCommit) fail('ADMIN_TRANSITION_PRODUCTION_MISMATCH', `${manifest.release_commit} != ${transition.expectedProductionCommit}`);

  const expectedMatches = fields.map((key) => manifest[key] === transition.expected[key]);
  const desiredMatches = fields.map((key) => manifest[key] === transition.set[key]);
  const allExpected = expectedMatches.every(Boolean);
  const allDesired = desiredMatches.every(Boolean);

  if (!allExpected && !allDesired) {
    const states = fields.map((key) => `${key}=${JSON.stringify(manifest[key])}`).join(',');
    fail('ADMIN_TRANSITION_STATE_MISMATCH', states);
  }

  let disposition = 'ALREADY_APPLIED';
  let next = manifest;
  if (allExpected) {
    next = structuredClone(manifest);
    for (const key of fields) next[key] = transition.set[key];
    if (!sameIdentity(manifest, next)) fail('ADMIN_TRANSITION_IDENTITY_MUTATION');
    disposition = args.write ? 'APPLIED' : 'WOULD_APPLY';
    if (args.write) fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  }

  const report = {
    schemaVersion: 1,
    product: 'SimCore',
    transitionId: transition.transitionId,
    productionCommit: manifest.release_commit,
    fields,
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
