#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registry } from '../tests/registry.mjs';

const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_LIST = 32;
const ASSERTION_BASES = new Set([
  'OWNER_DETERMINISTIC',
  'OWNER_REASON_CODE',
  'OWNER_STATE_TRANSITION',
  'OWNER_BOUNDED_COUNT',
]);
const PROOF_KINDS = new Set(['SINGLE', 'PAIRED', 'SEQUENCE']);
const INPUT_STABILITY = new Set(['DETERMINISTIC', 'CONTEXT_REQUIRED']);
const FORBIDDEN_KEYS = /^(raw|body|userBody|assistantBody|freshBody|prompt|fullDiagnostic|fullCommunity|fullKnowledge|chatHistory)$/i;

export class FixtureSkeletonError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new FixtureSkeletonError(code, message);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function boundedString(value, label, max = 512) {
  if (typeof value !== 'string' || value.length < 1 || value.length > max) {
    fail('SOURCE_INVALID', `${label} must be a non-empty string <= ${max} chars`);
  }
  return value;
}

function boundedScalar(value, label) {
  if (!['string', 'number', 'boolean'].includes(typeof value) && value !== null) {
    fail('SOURCE_INVALID', `${label} must be a bounded scalar`);
  }
  if (typeof value === 'string' && value.length > 512) {
    fail('SOURCE_INVALID', `${label} string exceeds 512 chars`);
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    fail('SOURCE_INVALID', `${label} must be finite`);
  }
  return value;
}

function rejectRawKeys(value, trail = 'source') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectRawKeys(entry, `${trail}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.test(key)) fail('RAW_FIELD_FORBIDDEN', `${trail}.${key}`);
    rejectRawKeys(child, `${trail}.${key}`);
  }
}

function repoReference(value, label) {
  const ref = boundedString(value, label, 512);
  const filePart = ref.split(/\s+§/u, 1)[0].trim();
  if (!filePart || path.isAbsolute(filePart) || filePart.startsWith('../') || filePart.includes('/../') || /^https?:/i.test(filePart)) {
    fail('SOURCE_INVALID', `${label} must be a repository-relative reference`);
  }
  return ref;
}

function array(value, label, max = MAX_LIST) {
  if (!Array.isArray(value) || value.length > max) fail('SOURCE_INVALID', `${label} must be an array <= ${max} items`);
  return value;
}

function uniqueIds(rows, label) {
  const seen = new Set();
  for (const row of rows) {
    if (!isObject(row)) fail('SOURCE_INVALID', `${label} entries must be objects`);
    const id = boundedString(row.id, `${label}.id`, 128);
    if (seen.has(id)) fail('SOURCE_INVALID', `${label} duplicate id ${id}`);
    seen.add(id);
  }
}

function sortById(rows) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function validateInputFacts(rows) {
  uniqueIds(rows, 'inputFacts');
  for (const row of rows) {
    boundedString(row.owner, `inputFacts.${row.id}.owner`, 128);
    boundedString(row.fact, `inputFacts.${row.id}.fact`, 160);
    boundedScalar(row.value, `inputFacts.${row.id}.value`);
    repoReference(row.evidenceRef, `inputFacts.${row.id}.evidenceRef`);
    if (!INPUT_STABILITY.has(row.stability)) fail('SOURCE_INVALID', `inputFacts.${row.id}.stability invalid`);
  }
}

function validateExpected(rows) {
  uniqueIds(rows, 'expectedCandidates');
  for (const row of rows) {
    boundedString(row.owner, `expectedCandidates.${row.id}.owner`, 128);
    boundedString(row.resultPath, `expectedCandidates.${row.id}.resultPath`, 160);
    boundedScalar(row.expected, `expectedCandidates.${row.id}.expected`);
    repoReference(row.evidenceRef, `expectedCandidates.${row.id}.evidenceRef`);
    if (!ASSERTION_BASES.has(row.assertionBasis)) fail('SOURCE_INVALID', `expectedCandidates.${row.id}.assertionBasis invalid`);
  }
}

function validateStatementRows(rows, label, statementKey) {
  uniqueIds(rows, label);
  for (const row of rows) {
    boundedString(row[statementKey], `${label}.${row.id}.${statementKey}`, 512);
    repoReference(row.evidenceRef, `${label}.${row.id}.evidenceRef`);
  }
}

function validateObservational(rows) {
  uniqueIds(rows, 'observationalFacts');
  for (const row of rows) {
    boundedString(row.fact, `observationalFacts.${row.id}.fact`, 160);
    boundedScalar(row.value, `observationalFacts.${row.id}.value`);
    repoReference(row.evidenceRef, `observationalFacts.${row.id}.evidenceRef`);
  }
}

function validateUnknowns(rows) {
  uniqueIds(rows, 'unknowns');
  for (const row of rows) {
    boundedString(row.subject, `unknowns.${row.id}.subject`, 160);
    boundedString(row.reason, `unknowns.${row.id}.reason`, 512);
    repoReference(row.evidenceRef, `unknowns.${row.id}.evidenceRef`);
  }
}

export function validateSource(source) {
  if (!isObject(source)) fail('SOURCE_INVALID', 'source must be an object');
  rejectRawKeys(source);
  if (source.schemaVersion !== 1 || source.kind !== 'simcore-live-fixture-source') fail('SOURCE_INVALID', 'unsupported source schema/kind');
  boundedString(source.sourceId, 'sourceId', 128);
  if (!/^v\d+\.\d+\.\d+$/.test(String(source.productionVersion || ''))) fail('SOURCE_INVALID', 'productionVersion must be vMAJOR.MINOR.PATCH');
  boundedString(source.scenario, 'scenario', 128);

  if (!isObject(source.evidence)) fail('SOURCE_INVALID', 'evidence required');
  repoReference(source.evidence.primary, 'evidence.primary');
  const additional = array(source.evidence.additional, 'evidence.additional', 8);
  additional.forEach((ref, index) => repoReference(ref, `evidence.additional[${index}]`));

  if (!isObject(source.proofUnit) || !PROOF_KINDS.has(source.proofUnit.kind)) fail('SOURCE_INVALID', 'proofUnit.kind invalid');
  const observations = array(source.proofUnit.observations, 'proofUnit.observations', 4);
  if (observations.length < 1) fail('SOURCE_INVALID', 'proofUnit requires at least one observation');
  observations.forEach((value, index) => boundedString(value, `proofUnit.observations[${index}]`, 256));
  if (source.proofUnit.kind === 'SINGLE' && observations.length !== 1) fail('SOURCE_INVALID', 'SINGLE proofUnit must contain exactly one observation');
  if (source.proofUnit.kind === 'PAIRED' && observations.length !== 2) fail('SOURCE_INVALID', 'PAIRED proofUnit must contain exactly two observations');
  if (source.proofUnit.kind === 'SEQUENCE' && observations.length < 2) fail('SOURCE_INVALID', 'SEQUENCE proofUnit requires at least two observations');

  if (!isObject(source.target)) fail('SOURCE_INVALID', 'target required');
  const suite = boundedString(source.target.suiteCandidate, 'target.suiteCandidate', 128);
  const owner = boundedString(source.target.semanticOwner, 'target.semanticOwner', 128);
  const surface = boundedString(source.target.surfaceCandidate, 'target.surfaceCandidate', 160);
  if (suite !== 'UNRESOLVED' && !registry.some((row) => row.id === suite)) fail('SUITE_NOT_REGISTERED', suite);

  const inputFacts = array(source.inputFacts, 'inputFacts');
  const expectedCandidates = array(source.expectedCandidates, 'expectedCandidates');
  const protectedInvariants = array(source.protectedInvariants, 'protectedInvariants');
  const observationalFacts = array(source.observationalFacts, 'observationalFacts');
  const unknowns = array(source.unknowns, 'unknowns');
  const minimizationNeeds = array(source.minimizationNeeds, 'minimizationNeeds');

  validateInputFacts(inputFacts);
  validateExpected(expectedCandidates);
  validateStatementRows(protectedInvariants, 'protectedInvariants', 'statement');
  validateObservational(observationalFacts);
  validateUnknowns(unknowns);
  minimizationNeeds.forEach((item, index) => boundedString(item, `minimizationNeeds[${index}]`, 512));

  if (owner === 'UNRESOLVED' && expectedCandidates.length) {
    fail('SOURCE_INVALID', 'expectedCandidates require a resolved semanticOwner');
  }
  if (surface === 'UNRESOLVED' && expectedCandidates.length) {
    fail('SOURCE_INVALID', 'expectedCandidates require a resolved surfaceCandidate');
  }
  return source;
}

function normalizedSource(source) {
  return {
    ...source,
    evidence: {
      primary: source.evidence.primary,
      additional: [...new Set(source.evidence.additional)].sort(),
    },
    inputFacts: sortById(source.inputFacts),
    expectedCandidates: sortById(source.expectedCandidates),
    protectedInvariants: sortById(source.protectedInvariants),
    observationalFacts: sortById(source.observationalFacts),
    unknowns: sortById(source.unknowns),
    minimizationNeeds: [...new Set(source.minimizationNeeds)].sort(),
  };
}

export function buildSkeleton(sourceInput) {
  validateSource(sourceInput);
  const source = normalizedSource(sourceInput);
  const digest = sha256(stableJson(source));
  const blockers = [];
  const reviewFlags = [];
  if (source.target.suiteCandidate === 'UNRESOLVED') blockers.push('SUITE_NOT_RESOLVED');
  if (source.target.semanticOwner === 'UNRESOLVED') blockers.push('OWNER_NOT_RESOLVED');
  if (source.target.surfaceCandidate === 'UNRESOLVED') blockers.push('SURFACE_NOT_RESOLVED');
  if (source.unknowns.length) reviewFlags.push('UNKNOWNS_INTENTIONALLY_UNASSERTED');
  if (source.minimizationNeeds.length) reviewFlags.push('MINIMIZATION_REQUIRED');
  if (source.inputFacts.some((row) => row.stability === 'CONTEXT_REQUIRED')) reviewFlags.push('CONTEXT_REQUIRED_INPUTS');

  return {
    schemaVersion: 1,
    kind: 'simcore-fixture-skeleton',
    skeletonId: `FKS1-${digest}`,
    sourceDigest: `sha256:${digest}`,
    source: {
      sourceId: source.sourceId,
      productionVersion: source.productionVersion,
      scenario: source.scenario,
      evidence: source.evidence,
    },
    proofUnit: source.proofUnit,
    target: source.target,
    inputFacts: source.inputFacts,
    expectedCandidates: source.expectedCandidates,
    protectedInvariants: source.protectedInvariants,
    observationalFacts: source.observationalFacts,
    unknowns: source.unknowns,
    minimizationNeeds: source.minimizationNeeds,
    promotion: {
      state: 'REVIEW_REQUIRED',
      fixtureV1Ready: false,
      blockers: blockers.sort(),
      reviewFlags: reviewFlags.sort(),
    },
  };
}

function serialize(skeleton) {
  const bytes = Buffer.from(`${JSON.stringify(skeleton, null, 2)}\n`, 'utf8');
  if (bytes.length > MAX_OUTPUT_BYTES) fail('OUTPUT_TOO_LARGE', `skeleton exceeds ${MAX_OUTPUT_BYTES} bytes`);
  return bytes;
}

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!['--source', '--out'].includes(arg) || !argv[index + 1]) fail('INVOCATION_ERROR', `invalid argument ${arg}`);
    out[arg.slice(2)] = argv[++index];
  }
  if (!out.source || !out.out) fail('INVOCATION_ERROR', '--source and --out are required');
  return out;
}

function assertSafeOutput(outPath) {
  const normalized = path.resolve(outPath).replaceAll('\\', '/');
  const fixtures = path.resolve('products/simcore/tests/fixtures').replaceAll('\\', '/');
  const registryPath = path.resolve('products/simcore/tests/registry.mjs').replaceAll('\\', '/');
  if (normalized === registryPath || normalized.startsWith(`${fixtures}/`)) {
    fail('OUTPUT_PATH_FORBIDDEN', 'M-10 may not write fixture-v1 or registry authority');
  }
}

function writeAtomic(outPath, bytes) {
  assertSafeOutput(outPath);
  const target = path.resolve(outPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temp, bytes);
    fs.renameSync(temp, target);
  } finally {
    if (fs.existsSync(temp)) fs.rmSync(temp, { force: true });
  }
}

export function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const source = JSON.parse(fs.readFileSync(path.resolve(args.source), 'utf8'));
  const skeleton = buildSkeleton(source);
  writeAtomic(args.out, serialize(skeleton));
  return skeleton;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const skeleton = run();
    process.stdout.write(`FIXTURE_SKELETON_READY ${skeleton.skeletonId}\n`);
  } catch (error) {
    const code = error?.code || 'FIXTURE_SKELETON_ERROR';
    process.stderr.write(`${code}: ${error?.message || error}\n`);
    process.exitCode = 2;
  }
}
