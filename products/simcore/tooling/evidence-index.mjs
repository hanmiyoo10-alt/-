#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from '../tests/registry.mjs';

const DEFAULT_SOURCE = 'products/simcore/evidence/evidence-index-source-v1.json';
const DEFAULT_TARGET = 'docs/SIMCORE_EVIDENCE_INDEX.md';
const ALLOWED_STATUS = new Set(['PASS', 'WATCH', 'GAP']);
const ALLOWED_COVERAGE = new Set(['EXECUTABLE', 'HYBRID_TRANSITIONAL']);
const CONTRACT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RELATED_RE = /^[A-Za-z0-9_.:/-]+$/;
const RELEASE_RE = /^v\d+\.\d+\.\d+$/;
const ENTRY_KEYS = ['authority', 'contract', 'evidenceRelease', 'fixtureId', 'liveEvidence', 'owner', 'related', 'status'];
const MAX_ENTRIES = 256;
const MAX_OUTPUT = 256 * 1024;

export class EvidenceIndexError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new EvidenceIndexError(code, message);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(object, expected, label) {
  const actual = Object.keys(object).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail('INDEX_SOURCE_INVALID', `${label} keys invalid: ${actual.join(',')}`);
  }
}

function tableString(value, label, max = 512) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max || /[|\r\n]/.test(value)) {
    fail('INDEX_SOURCE_INVALID', `${label} must be a bounded single-line table value`);
  }
  return value;
}

function refPath(reference, label) {
  const value = tableString(reference, label, 512);
  const marker = value.indexOf(' §');
  const rel = (marker >= 0 ? value.slice(0, marker) : value).trim();
  if (!rel || path.isAbsolute(rel) || rel.includes('\\') || rel === '..' || rel.startsWith('../') || rel.includes('/../') || /^https?:/i.test(rel)) {
    fail('INDEX_SOURCE_INVALID', `${label} must be a repository-relative reference`);
  }
  return rel;
}

function resolveReference(root, reference, label) {
  const rel = refPath(reference, label);
  const repoRoot = path.resolve(root);
  const resolved = path.resolve(repoRoot, rel);
  if (resolved !== repoRoot && !resolved.startsWith(`${repoRoot}${path.sep}`)) {
    fail('INDEX_SOURCE_INVALID', `${label} escapes repository root`);
  }
  if (!fs.existsSync(resolved)) fail('INDEX_REFERENCE_UNAVAILABLE', `${label}: ${rel}`);
  return rel;
}

function registryMap() {
  return new Map(registry.map((row) => [row.id, row.coverage]));
}

export function validateSource(source, { root = process.cwd() } = {}) {
  if (!isObject(source)) fail('INDEX_SOURCE_INVALID', 'source must be an object');
  exactKeys(source, ['schemaVersion', 'entries'], 'source');
  if (source.schemaVersion !== 1) fail('INDEX_SOURCE_INVALID', 'schemaVersion must be 1');
  if (!Array.isArray(source.entries) || source.entries.length > MAX_ENTRIES) {
    fail('INDEX_SOURCE_INVALID', `entries must be an array <= ${MAX_ENTRIES}`);
  }

  const fixtures = registryMap();
  const contracts = new Set();
  const normalized = [];

  for (let index = 0; index < source.entries.length; index += 1) {
    const row = source.entries[index];
    if (!isObject(row)) fail('INDEX_SOURCE_INVALID', `entries[${index}] must be an object`);
    exactKeys(row, ENTRY_KEYS, `entries[${index}]`);

    const contract = tableString(row.contract, `entries[${index}].contract`, 128);
    if (!CONTRACT_RE.test(contract)) fail('INDEX_SOURCE_INVALID', `invalid contract key ${contract}`);
    if (contracts.has(contract)) fail('INDEX_SOURCE_INVALID', `duplicate contract ${contract}`);
    contracts.add(contract);

    const owner = tableString(row.owner, `${contract}.owner`, 256);
    const authority = tableString(row.authority, `${contract}.authority`, 512);
    resolveReference(root, authority, `${contract}.authority`);

    let liveEvidence = null;
    if (row.liveEvidence !== null) {
      liveEvidence = tableString(row.liveEvidence, `${contract}.liveEvidence`, 512);
      resolveReference(root, liveEvidence, `${contract}.liveEvidence`);
    }

    let evidenceRelease = null;
    if (row.evidenceRelease !== null) {
      evidenceRelease = tableString(row.evidenceRelease, `${contract}.evidenceRelease`, 32);
      if (!RELEASE_RE.test(evidenceRelease)) fail('INDEX_SOURCE_INVALID', `${contract}.evidenceRelease invalid`);
    }
    if ((liveEvidence === null) !== (evidenceRelease === null)) {
      fail('INDEX_SOURCE_INVALID', `${contract}: liveEvidence and evidenceRelease must both be null or both non-null`);
    }

    const status = tableString(row.status, `${contract}.status`, 16);
    if (!ALLOWED_STATUS.has(status)) fail('INDEX_SOURCE_INVALID', `${contract}.status invalid`);

    let fixture = 'NONE';
    let fixtureId = null;
    if (row.fixtureId !== null) {
      fixtureId = tableString(row.fixtureId, `${contract}.fixtureId`, 128);
      const coverage = fixtures.get(fixtureId);
      if (!coverage || !ALLOWED_COVERAGE.has(coverage)) {
        fail('INDEX_FIXTURE_UNRESOLVED', `${contract}: ${fixtureId}`);
      }
      fixture = `${fixtureId} [${coverage}]`;
    }

    if (!Array.isArray(row.related) || row.related.length > 16) {
      fail('INDEX_SOURCE_INVALID', `${contract}.related must be an array <= 16`);
    }
    const related = [];
    const seenRelated = new Set();
    for (const raw of row.related) {
      const id = tableString(raw, `${contract}.related`, 160);
      if (!RELATED_RE.test(id)) fail('INDEX_SOURCE_INVALID', `${contract}.related identifier invalid: ${id}`);
      if (seenRelated.has(id)) fail('INDEX_SOURCE_INVALID', `${contract}.related duplicate: ${id}`);
      seenRelated.add(id);
      related.push(id);
    }
    related.sort();

    if (status === 'WATCH' && liveEvidence === null && related.length === 0) {
      fail('INDEX_SOURCE_INVALID', `${contract}: WATCH requires Live Evidence or Related`);
    }

    normalized.push({
      contract,
      owner,
      authority,
      liveEvidence,
      fixtureId,
      fixture,
      evidenceRelease,
      status,
      related,
    });
  }

  normalized.sort((a, b) => a.contract.localeCompare(b.contract));
  return normalized;
}

export function renderIndex(rows) {
  const tableRows = rows.map((row) => {
    const live = row.liveEvidence ?? 'NONE';
    const release = row.evidenceRelease ?? 'NONE';
    const related = row.related.length ? row.related.join(', ') : 'NONE';
    return `| ${row.contract} | ${row.owner} | ${row.authority} | ${live} | ${row.fixture} | ${release} | ${row.status} | ${related} |`;
  });

  const text = `# SimCore Evidence Index

Status: \`GENERATED NAVIGATION INDEX · M-13 MATERIALIZED · S-09 SCHEMA · NON_RUNTIME\`

> GENERATED NAVIGATION VIEW  
> source: \`${DEFAULT_SOURCE}\`  
> schema: \`docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md\`  
> edit the source manifest, not generated rows.

Purpose: provide a compact contract-centric navigation surface from reviewed SimCore contracts to semantic owner, authority, qualifying direct live evidence, permanent fixture, evidence-release provenance, current evidence posture, and material debt/watch/gate identifiers.

Referenced contract/evidence/gate/debt documents remain authoritative for meaning, proof, severity, and sequencing. This generated file is a navigation projection only.

## Coverage rule

This index is intentionally curated and may be partial.

\`\`\`text
row present
= a reviewed S-09 projection is present in the curation source

row absent
!= GAP
!= unproven contract
!= deprecated contract
\`\`\`

Historical Evidence Release values remain historical and are never rewritten to current production automatically.

## Canonical index

| Contract | Owner | Authority | Live Evidence | Fixture | Evidence Release | Status | Related |
|---|---|---|---|---|---|---|---|
${tableRows.join('\n')}

## Update discipline

Update the curated source only after reviewing the actual semantic/evidence authorities. Then regenerate this file.

Mechanical generator rules:

\`\`\`text
fixture execution class = resolved from products/simcore/tests/registry.mjs
Status = explicit reviewed PASS / WATCH / GAP input
Live Evidence + Evidence Release = explicit reviewed provenance
row order = lexical Contract order
Related order = lexical identifier order
\`\`\`

The generator does not discover evidence, select the latest specimen, infer Owner, infer Status, reconcile contradictions, or update authority documents.

## Hard boundaries

This generated index must never contain or perform:

\`\`\`text
raw user/assistant bodies
raw Fresh bodies
full diagnostic copies
runtime-local fingerprint dumps
new semantic verdicts
new WATCH/FIX/BLOCKER classifications
automatic authority repair
runtime writes
release-simcore publication
\`\`\`

\`Status\` remains restricted to \`PASS / WATCH / GAP\` under the frozen S-09 contract.
`;
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length > MAX_OUTPUT) fail('INDEX_SOURCE_INVALID', `rendered index exceeds ${MAX_OUTPUT} bytes`);
  return text;
}

function parseArgs(argv) {
  let mode = null;
  const out = { source: DEFAULT_SOURCE, target: DEFAULT_TARGET, root: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check' || arg === '--write') {
      if (mode) fail('INDEX_SOURCE_INVALID', 'choose exactly one of --check or --write');
      mode = arg.slice(2);
      continue;
    }
    if (['--source', '--target', '--root'].includes(arg) && argv[i + 1]) {
      out[arg.slice(2)] = argv[++i];
      continue;
    }
    fail('INDEX_SOURCE_INVALID', `invalid argument ${arg}`);
  }
  if (!mode) fail('INDEX_SOURCE_INVALID', 'one of --check or --write is required');
  return { mode, ...out };
}

function inside(root, rel, label) {
  if (path.isAbsolute(rel) || rel.includes('\\') || rel === '..' || rel.startsWith('../') || rel.includes('/../')) {
    fail('INDEX_SOURCE_INVALID', `${label} must be repository-relative`);
  }
  const base = path.resolve(root);
  const resolved = path.resolve(base, rel);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) fail('INDEX_SOURCE_INVALID', `${label} escapes root`);
  return resolved;
}

function atomicWrite(target, text) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temp, text, 'utf8');
    fs.renameSync(temp, target);
  } finally {
    if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const sourcePath = inside(args.root, args.source, 'source');
  const targetPath = inside(args.root, args.target, 'target');
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const rows = validateSource(source, { root: args.root });
  const expected = renderIndex(rows);

  if (args.mode === 'check') {
    const actual = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : null;
    if (actual !== expected) return { outcome: 'INDEX_RENDER_DRIFT', rows: rows.length };
    return { outcome: 'INDEX_CLEAN', rows: rows.length };
  }

  atomicWrite(targetPath, expected);
  return { outcome: 'INDEX_WRITTEN', rows: rows.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = run();
    process.stdout.write(`${result.outcome} rows=${result.rows}\n`);
    if (result.outcome === 'INDEX_RENDER_DRIFT') process.exitCode = 1;
  } catch (error) {
    const code = error?.code || 'INDEX_SOURCE_INVALID';
    process.stderr.write(`${code}: ${error?.message || error}\n`);
    process.exitCode = 2;
  }
}
