'use strict';

const crypto = require('node:crypto');

const validationMerge = require('../validation-merge/validation-merge-owner.cjs');
const stageReceipt = require('../stage-receipt.cjs');
const packetProjection = require('../../work-system/packet-projection.cjs');
const scopeOverlap = require('../../work-system/scope-overlap.cjs');

const REPO = validationMerge.REPO;
const ADOPTION_SURFACE_RE =
  /^surface:repo:external-pr-adoption:pr-([1-9][0-9]*)$/;
const SHA40_RE = /^[0-9a-f]{40}$/;

class AdoptionError extends Error {
  constructor(kind, reasonCodes, evidenceLocator = null) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
    this.evidenceLocator = evidenceLocator;
  }
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function sorted(values) {
  return [...values].sort();
}

function packetEvidenceIdentity(body) {
  return 'sha256:' + sha256(String(body || ''));
}

function adoptionDiffIdentity(baseSha, headSha, paths) {
  return sha256([
    'CANONICAL_MAIN_EXTERNAL_PR_ADOPTION_DIFF_V1',
    baseSha,
    headSha,
    ...sorted(paths),
  ].join('\0'));
}

function parseTimestamp(value, reasonCode, locator) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new AdoptionError('UNKNOWN', [reasonCode], locator);
  }
  return parsed;
}

async function readPacket(client, packetNumber) {
  let issue;
  try {
    issue = await client.api('/issues/' + packetNumber);
  } catch {
    throw new AdoptionError(
      'UNKNOWN', ['PACKET_READ_FAILED'], 'issue:#' + packetNumber);
  }
  if (!issue || issue.pull_request || issue.state !== 'open') {
    throw new AdoptionError(
      'BLOCKED', ['PACKET_NOT_OPEN'], 'issue:#' + packetNumber);
  }

  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition === 'CONFLICT') {
    throw new AdoptionError(
      'CONFLICT', projection.reasonCodes, 'issue:#' + packetNumber);
  }
  if (projection.disposition !== 'PASS') {
    throw new AdoptionError(
      'UNKNOWN', projection.reasonCodes, 'issue:#' + packetNumber);
  }
  if (projection.lifecycle !== 'IN_PROGRESS') {
    throw new AdoptionError(
      'BLOCKED', ['PACKET_NOT_IN_PROGRESS'], 'issue:#' + packetNumber);
  }
  if (projection.interactionStage !== 'IMPLEMENTATION_PR') {
    throw new AdoptionError(
      'BLOCKED', ['PACKET_STAGE_NOT_IMPLEMENTATION_PR'], 'issue:#' + packetNumber);
  }

  const parsed = scopeOverlap.extractPacketScopes(issue.body);
  if (!parsed.ok) {
    throw new AdoptionError(
      parsed.conflict ? 'CONFLICT' : 'UNKNOWN',
      [parsed.conflict ? 'PACKET_SCOPE_CONFLICT' : 'PACKET_SCOPE_UNKNOWN'],
      'issue:#' + packetNumber);
  }

  const pathRows = parsed.scopes.filter((row) => row.kind === 'path');
  if (!pathRows.length) {
    throw new AdoptionError(
      'BLOCKED', ['ADOPTION_EXACT_PATH_SCOPE_REQUIRED'], 'issue:#' + packetNumber);
  }
  if (pathRows.some((row) => row.mode !== 'exact')) {
    throw new AdoptionError(
      'BLOCKED', ['ADOPTION_BROAD_PATH_SCOPE_FORBIDDEN'], 'issue:#' + packetNumber);
  }

  const surfaceRows = parsed.scopes.filter((row) => row.kind === 'surface');
  if (surfaceRows.length !== 1) {
    throw new AdoptionError(
      'CONFLICT', ['ADOPTION_SURFACE_COUNT_INVALID'], 'issue:#' + packetNumber);
  }
  const match = ADOPTION_SURFACE_RE.exec(surfaceRows[0].normalized);
  if (!match) {
    throw new AdoptionError(
      'BLOCKED', ['ADOPTION_SURFACE_INVALID'], 'issue:#' + packetNumber);
  }

  const paths = sorted(pathRows.map((row) => row.value));
  return {
    issue,
    packetNumber,
    prNumber: Number(match[1]),
    adoptionSurface: surfaceRows[0].normalized,
    paths,
    bodySha256: sha256(String(issue.body || '')),
    evidenceLocator: 'issue:#' + packetNumber,
  };
}

async function readRawPr(client, prNumber) {
  let pr;
  try {
    pr = await client.api('/pulls/' + prNumber);
  } catch {
    throw new AdoptionError('UNKNOWN', ['PR_READ_FAILED'], 'pr:#' + prNumber);
  }
  if (!pr || Number(pr.number) !== prNumber) {
    throw new AdoptionError(
      'UNKNOWN', ['PR_IDENTITY_INVALID'], 'pr:#' + prNumber);
  }
  return pr;
}

function requirePrPredatesPacket(packet, pr) {
  const packetAt = parseTimestamp(
    packet.issue.created_at, 'PACKET_CREATED_AT_UNKNOWN', packet.evidenceLocator);
  const prAt = parseTimestamp(
    pr.created_at, 'PR_CREATED_AT_UNKNOWN', 'pr:#' + packet.prNumber);
  if (!(prAt < packetAt)) {
    throw new AdoptionError(
      'BLOCKED', ['EXTERNAL_PR_MUST_PREDATE_PACKET'], 'pr:#' + packet.prNumber);
  }
}

async function readStrictCurrentness(client, prNumber, mainSha, headSha) {
  const protection = await validationMerge.readStrictProtection(client);
  if (!protection.strict) {
    return {
      result: 'NOT_APPLICABLE',
      evidenceLocator: protection.evidenceLocator,
    };
  }
  const mergeState = await validationMerge.readStrictPrMergeState(
    client, prNumber, headSha);
  const ancestry = await validationMerge.readStrictAncestry(
    client, mainSha, headSha);
  return {
    result: 'PASS',
    evidenceLocator: ancestry.evidenceLocator,
    mergeStateStatus: mergeState.mergeStateStatus,
    ancestryStatus: ancestry.status,
  };
}

function makeReceipt({
  packet,
  mainSha,
  headSha,
  required,
  review,
  strict,
}) {
  const prLocator = 'pr:#' + packet.prNumber;
  const diffIdentity = adoptionDiffIdentity(mainSha, headSha, packet.paths);
  const facts = {
    schemaVersion: 1,
    packetNumber: packet.packetNumber,
    stage: 'IMPLEMENTATION_PR',
    authorityRefs: [
      {kind: 'GIT_REF', locator: 'refs/heads/main', identity: mainSha},
      {kind: 'COMMIT', locator: 'commit:adopted-candidate', identity: headSha},
      {kind: 'PR', locator: prLocator, identity: headSha},
      {kind: 'WORKFLOW_RUN', locator: 'run:' + required.runId, identity: 'success'},
      {kind: 'ISSUE', locator: packet.evidenceLocator,
        identity: 'sha256:' + packet.bodySha256},
    ],
    requiredGates: [
      {name: 'adoption-provenance', result: 'PASS',
        evidenceLocator: packet.evidenceLocator},
      {name: 'external-pr-adoption-surface', result: 'PASS',
        evidenceLocator: packet.adoptionSurface},
      {name: 'external-pr-predates-packet', result: 'PASS',
        evidenceLocator: prLocator},
      {name: 'candidate-current-main', result: 'PASS',
        evidenceLocator: prLocator},
      {name: 'exact-path-scope', result: 'PASS',
        evidenceLocator: prLocator},
      {name: 'exact-head-required', result: 'PASS',
        evidenceLocator: required.evidenceLocator},
      {name: 'review-barrier', result: 'PASS',
        evidenceLocator: review.evidenceLocator},
      {name: 'strict-currentness', result: strict.result,
        evidenceLocator: strict.evidenceLocator},
    ],
    scope: {
      paths: packet.paths,
      diffRequired: true,
      diffIdentity,
      diffEvidenceLocator: prLocator,
    },
    proof: [
      {term: 'IMPLEMENTED', evidenceLocator: 'commit:' + headSha},
      {term: 'CONTRACT_PROVEN', evidenceLocator: required.evidenceLocator},
    ],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    dependencies: [],
    nextLegalAction: 'VALIDATION_MERGE',
  };
  const receipt = stageReceipt.projectStageReceipt(facts);
  if (receipt.status !== 'PASS') {
    throw new AdoptionError(
      receipt.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
      ['ADOPTION_STAGE_RECEIPT_NOT_PASS', ...(receipt.reasonCodes || [])],
      packet.evidenceLocator);
  }
  return {receipt, diffIdentity};
}

function failure(error, packetNumber = null, prNumber = null) {
  if (error instanceof AdoptionError
      || error instanceof validationMerge.OwnerError) {
    return {
      schemaVersion: 1,
      mode: 'CANONICAL_MAIN_EXTERNAL_PR_ADOPTION',
      status: error.kind,
      reasonCodes: [...new Set(error.reasonCodes || [])].sort(),
      packetNumber,
      prNumber,
      evidenceLocator: error.evidenceLocator || error.locator || null,
      mutationAuthorized: false,
      executionAuthorized: false,
      mergeAuthorized: false,
    };
  }
  return {
    schemaVersion: 1,
    mode: 'CANONICAL_MAIN_EXTERNAL_PR_ADOPTION',
    status: 'UNKNOWN',
    reasonCodes: ['ADOPTION_RUNTIME_ERROR'],
    packetNumber,
    prNumber,
    evidenceLocator: null,
    mutationAuthorized: false,
    executionAuthorized: false,
    mergeAuthorized: false,
  };
}

async function inspectWithClient({client, packetNumber}) {
  let packet = null;
  try {
    packet = await readPacket(client, packetNumber);
    const rawPr = await readRawPr(client, packet.prNumber);
    requirePrPredatesPacket(packet, rawPr);

    const headSha = String(rawPr?.head?.sha || '');
    if (!SHA40_RE.test(headSha)) {
      throw new AdoptionError(
        'UNKNOWN', ['PR_HEAD_SHA_INVALID'], 'pr:#' + packet.prNumber);
    }

    const current = await validationMerge.readCurrentMain(client);
    await validationMerge.readOpenPr(
      client, packet.prNumber, current.mainSha, headSha, packet.paths);
    const required = await validationMerge.readRequiredEvidence(
      client, headSha, packet.prNumber);
    const review = await validationMerge.readReviewBarrier(
      client, packet.prNumber);
    const strict = await readStrictCurrentness(
      client, packet.prNumber, current.mainSha, headSha);
    await validationMerge.readOpenPr(
      client, packet.prNumber, current.mainSha, headSha, packet.paths);

    const projected = makeReceipt({
      packet,
      mainSha: current.mainSha,
      headSha,
      required,
      review,
      strict,
    });
    return {
      schemaVersion: 1,
      mode: 'CANONICAL_MAIN_EXTERNAL_PR_ADOPTION',
      status: 'PASS',
      reasonCodes: [],
      packetNumber,
      prNumber: packet.prNumber,
      headSha,
      baseSha: current.mainSha,
      paths: packet.paths,
      diffIdentity: projected.diffIdentity,
      provenance: 'ADOPTED_EXISTING_EXTERNAL_PR',
      candidateCreatedByPacket: false,
      candidatePublishedByPacket: false,
      receipt: projected.receipt,
      mutationAuthorized: false,
      executionAuthorized: false,
      mergeAuthorized: false,
    };
  } catch (error) {
    return failure(error, packetNumber, packet?.prNumber || null);
  }
}

function parseNumber(value, label) {
  const text = String(value || '').replace(/^#/, '');
  if (!/^[1-9][0-9]*$/.test(text)) throw new Error(label + '_INVALID');
  return Number(text);
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv[0] !== 'inspect') throw new Error('COMMAND_INVALID');
  const allowed = new Set(['packet', 'format']);
  const values = {};
  for (let index = 1; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith('--') || value === undefined) {
      throw new Error('ARGUMENT_INVALID');
    }
    const key = token.slice(2);
    if (!allowed.has(key) || key in values) throw new Error('ARGUMENT_INVALID');
    values[key] = value;
  }
  const packetNumber = parseNumber(values.packet, 'PACKET');
  const format = values.format || 'json';
  if (!['json', 'markdown'].includes(format)) throw new Error('FORMAT_INVALID');
  return {packetNumber, format};
}

function exitCodeFor(result) {
  if (result?.status === 'PASS') return 0;
  if (result?.status === 'UNKNOWN' || result?.status === 'NEEDS_REVIEW') return 3;
  return 2;
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  let args;
  try {
    args = parseArgs(argv);
  } catch {
    const result = failure(
      new AdoptionError('UNKNOWN', ['ARGUMENT_INVALID']));
    return {result, text: JSON.stringify(result, null, 2) + '\n', code: 3};
  }
  const client = options.client || validationMerge.createLiveClient(options);
  const result = await inspectWithClient({
    client,
    packetNumber: args.packetNumber,
  });
  const text = result.status === 'PASS' && args.format === 'markdown'
    ? stageReceipt.renderStageReceipt(result.receipt) + '\n'
    : result.status === 'PASS'
      ? JSON.stringify(result.receipt, null, 2) + '\n'
      : JSON.stringify(result, null, 2) + '\n';
  return {result, text, code: exitCodeFor(result)};
}

async function main() {
  const output = await runCli();
  process.stdout.write(output.text);
  process.exitCode = output.code;
}

if (require.main === module) {
  main().catch(() => {
    process.stdout.write(JSON.stringify({
      schemaVersion: 1,
      mode: 'CANONICAL_MAIN_EXTERNAL_PR_ADOPTION',
      status: 'UNKNOWN',
      reasonCodes: ['ADOPTION_RUNTIME_ERROR'],
      mutationAuthorized: false,
      executionAuthorized: false,
      mergeAuthorized: false,
    }) + '\n');
    process.exitCode = 3;
  });
}

module.exports = {
  ADOPTION_SURFACE_RE,
  AdoptionError,
  REPO,
  adoptionDiffIdentity,
  exitCodeFor,
  inspectWithClient,
  parseArgs,
  readAdoptionPacket: readPacket,
  runCli,
};
