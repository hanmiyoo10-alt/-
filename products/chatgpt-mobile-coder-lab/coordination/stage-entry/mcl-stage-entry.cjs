#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const OPS_ISSUE = 485;
const LEDGER_ISSUE = 2352;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const MAX_PLAN_BYTES = 16 * 1024;
const PACKET_REF_RE = /^#[1-9][0-9]*$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';

const packetProjection = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const scopeOverlap = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs'));
const executionReceipt = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));
const taskHandoff = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const workspacePrepare = require('./workspace-prepare.cjs');

const OPERATOR = path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs');
const S_PREFLIGHT = path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/s-family-status/s-env-status');
const LANDING = path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/landing-freshness/mcl-landing-freshness');
const LANDING_SCOPE = 'surface:mcl-landing-origin-main:S';
const LANDING_BRANCH = 'server/work';
const LANDING_WORKTREE = '/root/nyang-repo';

const PLAN_FIELDS = new Set([
  'schema', 'phase', 'route', 'executor', 'preflight_owner', 'repository_effect',
  'overlap_guard', 'lease_guard', 'handoff_guard', 'fallback', 'next_gate', 'details',
]);
const SCOPE_HEADINGS = new Set([
  'Bounded write scope',
  'Bounded implementation write scope',
  'Locked write scope',
  'Bounded IMPLEMENTATION_PR write scope',
  'Repository write-scope ceiling used by IMPLEMENTATION_PR',
]);

class StageError extends Error {
  constructor(kind, reasonCodes, extra = {}) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
    this.extra = extra;
  }
}

function unique(values) {
  return [...new Set(values)].sort();
}
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}
function runDefault(args, options = {}) {
  const result = childProcess.spawnSync(args[0], args.slice(1), {
    encoding: 'utf8',
    shell: false,
    cwd: options.cwd,
    input: options.input,
    env: options.env || process.env,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function readRegularJson(filePath, maxBytes = MAX_PLAN_BYTES) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); }
  catch { throw new StageError('UNKNOWN', ['PLAN_FILE_READ_FAILED']); }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new StageError('UNKNOWN', ['PLAN_REGULAR_FILE_REQUIRED']);
  }
  if (stat.size > maxBytes) throw new StageError('UNKNOWN', ['PLAN_FILE_TOO_LARGE']);
  try { return JSON.parse(fs.readFileSync(resolved, 'utf8')); }
  catch { throw new StageError('UNKNOWN', ['PLAN_JSON_INVALID']); }
}

function exactKeys(value, allowed, prefix) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StageError('UNKNOWN', [`${prefix}_OBJECT_REQUIRED`]);
  }
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (extras.length || missing.length) {
    throw new StageError('UNKNOWN', [
      ...extras.map((key) => `${prefix}_UNKNOWN_FIELD:${key}`),
      ...missing.map((key) => `${prefix}_FIELD_REQUIRED:${key}`),
    ]);
  }
}

function parsePlan(value) {
  exactKeys(value, PLAN_FIELDS, 'PLAN');
  const expected = {
    schema: 'mcl-dispatch-plan.v1',
    phase: '1/1',
    route: 'S',
    executor: 'S',
    preflight_owner: 'mcl-preflight',
    repository_effect: 'mutable',
    overlap_guard: 'required',
    lease_guard: 'required',
    handoff_guard: 'required',
    details: 'withheld',
  };
  const reasons = [];
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (value[key] !== expectedValue) reasons.push(`PLAN_${key.toUpperCase()}_UNSUPPORTED`);
  }
  if (!['M_candidate', 'none'].includes(value.fallback)) reasons.push('PLAN_FALLBACK_UNSUPPORTED');
  if (!['preflight', 'scope_overlap', 'lease_plan', 'git_currentness', 'owner_effect'].includes(value.next_gate)) {
    reasons.push('PLAN_NEXT_GATE_UNSUPPORTED');
  }
  if (reasons.length) throw new StageError('BLOCKED', reasons);
  return {...value};
}

function parseArgs(argv) {
  const args = [...argv];
  const command = args.shift();
  if (!['inspect', 'apply'].includes(command)) throw new StageError('UNKNOWN', ['COMMAND_UNSUPPORTED']);
  const values = {};
  while (args.length) {
    const key = args.shift();
    if (!key || !key.startsWith('--')) throw new StageError('UNKNOWN', ['ARGUMENT_INVALID']);
    if (key === '--apply') {
      if (values.apply) throw new StageError('UNKNOWN', ['ARGUMENT_DUPLICATE:apply']);
      values.apply = true;
      continue;
    }
    const value = args.shift();
    if (value === undefined) throw new StageError('UNKNOWN', ['ARGUMENT_VALUE_MISSING']);
    const name = key.slice(2);
    if (values[name] !== undefined) throw new StageError('UNKNOWN', [`ARGUMENT_DUPLICATE:${name}`]);
    values[name] = value;
  }
  const allowed = new Set(['packet', 'plan', 'apply']);
  const extras = Object.keys(values).filter((key) => !allowed.has(key));
  if (extras.length) throw new StageError('UNKNOWN', extras.map((key) => `ARGUMENT_UNSUPPORTED:${key}`));
  if (!PACKET_REF_RE.test(values.packet || '')) throw new StageError('UNKNOWN', ['PACKET_REF_INVALID']);
  if (!values.plan) throw new StageError('UNKNOWN', ['PLAN_FILE_REQUIRED']);
  if (command === 'apply' && values.apply !== true) throw new StageError('BLOCKED', ['EXPLICIT_APPLY_REQUIRED']);
  if (command === 'inspect' && values.apply) throw new StageError('UNKNOWN', ['INSPECT_APPLY_FORBIDDEN']);
  return {command, packetRef: values.packet, packetNumber: Number(values.packet.slice(1)), planFile: values.plan};
}

function parseKeyValueReceipt(text) {
  const rows = {};
  for (const line of String(text || '').trim().split('\n')) {
    if (!line) continue;
    const index = line.indexOf('=');
    if (index < 1) throw new StageError('UNKNOWN', ['OWNER_RECEIPT_INVALID']);
    const key = line.slice(0, index);
    const value = line.slice(index + 1);
    if (rows[key] !== undefined) throw new StageError('CONFLICT', ['OWNER_RECEIPT_DUPLICATE_FIELD']);
    rows[key] = value;
  }
  return rows;
}

function ghJson(endpoint, runner = runDefault, {method = 'GET', body = null} = {}) {
  const args = ['gh', 'api', endpoint];
  const options = {};
  if (method !== 'GET') args.push('--method', method);
  if (body !== null) {
    args.push('--input', '-');
    options.input = JSON.stringify(body);
  }
  const response = runner(args, options);
  if (response.code !== 0) throw new StageError('UNKNOWN', ['GITHUB_READ_OR_WRITE_FAILED']);
  try { return JSON.parse(response.stdout); }
  catch { throw new StageError('UNKNOWN', ['GITHUB_JSON_INVALID']); }
}

function readMainSha(runner = runDefault) {
  const value = ghJson(`repos/${REPO}/branches/main`, runner);
  const sha = value?.commit?.sha;
  if (!SHA40_RE.test(sha || '')) throw new StageError('UNKNOWN', ['MAIN_SHA_INVALID']);
  return sha;
}

function readIssue(number, runner = runDefault) {
  const issue = ghJson(`repos/${REPO}/issues/${number}`, runner);
  if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') {
    throw new StageError('BLOCKED', ['SOURCE_PACKET_INVALID']);
  }
  return issue;
}

function parseOpsCapsule(body, expectedMain) {
  const text = typeof body === 'string' ? body : '';
  const start = text.indexOf('## Canonical Operator Capsule');
  if (start < 0) throw new StageError('UNKNOWN', ['OPS_CAPSULE_MISSING']);
  const block = text.slice(start).split('\n').slice(1);
  const fields = {};
  for (const line of block) {
    if (!line.trim()) break;
    const match = /^- ([A-Z]+): (.+)$/.exec(line);
    if (!match) throw new StageError('UNKNOWN', ['OPS_CAPSULE_INVALID']);
    fields[match[1]] = match[2];
  }
  if (fields.STATE !== '`CLEAR`') throw new StageError('BLOCKED', ['OPS_STATE_NOT_CLEAR']);
  if (!fields.MAIN?.startsWith(`\`${expectedMain}\` / Required PASS`)) {
    throw new StageError('UNKNOWN', ['OPS_MAIN_OR_REQUIRED_MISMATCH']);
  }
  if (fields.UNKNOWN !== 'NONE') throw new StageError('UNKNOWN', ['OPS_REQUIRED_UNKNOWN_PRESENT']);
  return fields;
}

function sections(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^##\s+(.+?)\s*$/.exec(lines[index]);
    if (!match || !SCOPE_HEADINGS.has(match[1])) continue;
    const body = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^##\s+/.test(lines[cursor])) break;
      body.push(lines[cursor]);
    }
    found.push({heading: match[1], lines: body});
  }
  return found;
}

function extractPacketScopes(body) {
  const found = sections(body);
  if (found.length === 0) throw new StageError('UNKNOWN', ['PACKET_SCOPE_SECTION_MISSING']);
  if (found.length !== 1) throw new StageError('CONFLICT', ['PACKET_SCOPE_SECTION_DUPLICATE']);
  const raw = [];
  for (const line of found[0].lines) {
    const matches = [...line.matchAll(/`((?:path|surface):[^`]+)`/g)].map((item) => item[1]);
    raw.push(...matches);
  }
  if (!raw.length) throw new StageError('UNKNOWN', ['PACKET_SCOPE_EMPTY']);
  const normalized = [];
  for (const item of raw) {
    const parsed = scopeOverlap.normalizeScope(item);
    if (!parsed.ok) throw new StageError('UNKNOWN', ['PACKET_SCOPE_INVALID']);
    normalized.push(parsed.normalized);
  }
  if (new Set(normalized).size !== normalized.length) throw new StageError('CONFLICT', ['PACKET_SCOPE_DUPLICATE']);
  return normalized.sort();
}

function fetchPaged(endpointBuilder, runner = runDefault) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = ghJson(endpointBuilder(page), runner);
    if (!Array.isArray(value)) throw new StageError('UNKNOWN', ['DISCOVERY_PAGE_INVALID']);
    rows.push(...value);
    if (value.length < PAGE_SIZE) return {complete: true, rows};
  }
  return {complete: false, rows};
}

function discoverOverlap({packetNumber, requestedScopes, runner = runDefault}) {
  const issues = fetchPaged(
    (page) => `repos/${REPO}/issues?state=open&per_page=${PAGE_SIZE}&page=${page}`, runner);
  if (!issues.complete) {
    return scopeOverlap.resolveScopeOverlap({requestedScopes, discovery: 'PARTIAL', candidates: []});
  }
  const candidates = [];
  const prIssues = [];
  for (const item of issues.rows) {
    if (!Number.isSafeInteger(item?.number) || typeof item?.state !== 'string') {
      return scopeOverlap.resolveScopeOverlap({requestedScopes, discovery: 'UNKNOWN', candidates});
    }
    if (item.pull_request) {
      prIssues.push(item);
      continue;
    }
    if (item.number === packetNumber) continue;
    if (typeof item.body === 'string' && item.body.includes(PACKET_MARKER)) {
      candidates.push({type: 'packet', ref: `#${item.number}`, issueState: item.state, body: item.body});
    }
  }
  for (const pr of prIssues) {
    const files = fetchPaged(
      (page) => `repos/${REPO}/pulls/${pr.number}/files?per_page=${PAGE_SIZE}&page=${page}`, runner);
    const changedFiles = files.rows.map((file) => file?.filename).filter((name) => typeof name === 'string');
    candidates.push({
      type: 'pr',
      ref: `#${pr.number}`,
      state: pr.state,
      changedFiles,
      filesComplete: files.complete && changedFiles.length === files.rows.length,
    });
  }
  return scopeOverlap.resolveScopeOverlap({
    requestedScopes,
    discovery: 'COMPLETE',
    candidates,
  });
}

function runOwner(command, args, runner = runDefault) {
  return runner([command, ...args], {cwd: ROOT});
}

function inspectPreflight(runner = runDefault) {
  const preflightRaw = runOwner(S_PREFLIGHT, ['status'], runner);
  if (preflightRaw.code !== 0) throw new StageError('BLOCKED', ['S_PREFLIGHT_FAILED']);
  const preflight = parseKeyValueReceipt(preflightRaw.stdout);
  if (preflight.schema !== 'mcl-s-env-status.v1'
      || preflight.common_ubuntu_profile !== 'pass'
      || preflight.github_cli_auth !== 'pass'
      || preflight.repository_access !== 'pass'
      || preflight.details !== 'withheld') {
    throw new StageError('BLOCKED', ['S_PREFLIGHT_NOT_READY']);
  }
  return preflight;
}

function classifyLanding(mainSha, landing) {
  if (landing.schema !== 'mcl-landing-freshness.v1'
      || landing.operation !== 'status'
      || landing.route !== 'S'
      || landing.details !== 'withheld') {
    throw new StageError('UNKNOWN', ['LANDING_RECEIPT_INVALID']);
  }
  if (landing.actual_branch !== LANDING_BRANCH) {
    throw new StageError('BLOCKED', ['LANDING_BRANCH_NOT_READY']);
  }
  if (landing.worktree !== 'clean') {
    throw new StageError('BLOCKED', ['LANDING_WORKTREE_NOT_CLEAN']);
  }
  if (landing.remote_main !== mainSha) {
    const kind = landing.remote_main === 'unknown' ? 'UNKNOWN' : 'BLOCKED';
    throw new StageError(kind, ['LANDING_REMOTE_MAIN_MISMATCH']);
  }
  if (landing.origin_main === mainSha && landing.origin_remote_relation === 'same') {
    return {state: 'CURRENT', normalizationRequired: false};
  }
  const originKnown = landing.origin_main === 'missing' || SHA40_RE.test(landing.origin_main || '');
  if (originKnown && landing.origin_main !== mainSha && landing.origin_remote_relation === 'stale') {
    if (!SHA40_RE.test(landing.landing_head || '')) {
      throw new StageError('UNKNOWN', ['LANDING_HEAD_INVALID']);
    }
    return {state: 'NORMALIZATION_REQUIRED', normalizationRequired: true};
  }
  throw new StageError('BLOCKED', ['LANDING_CURRENTNESS_NOT_NORMALIZABLE']);
}

function inspectLanding(mainSha, runner = runDefault) {
  const landingRaw = runOwner(LANDING, ['status', 'S'], runner);
  if (landingRaw.code !== 0) throw new StageError('BLOCKED', ['LANDING_STATUS_FAILED']);
  const landing = parseKeyValueReceipt(landingRaw.stdout);
  const classification = classifyLanding(mainSha, landing);
  return {landing, ...classification};
}

function inspectContext({packetNumber, plan, runner = runDefault, profile}) {
  const firstMain = readMainSha(runner);
  const ops = ghJson(`repos/${REPO}/issues/${OPS_ISSUE}`, runner);
  const secondMain = readMainSha(runner);
  if (firstMain !== secondMain) throw new StageError('UNKNOWN', ['MAIN_CHANGED_DURING_CAPTURE']);
  parseOpsCapsule(ops?.body, firstMain);

  const issue = readIssue(packetNumber, runner);
  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition === 'CONFLICT') throw new StageError('CONFLICT', projection.reasonCodes);
  if (projection.disposition !== 'PASS') throw new StageError('UNKNOWN', projection.reasonCodes);
  if (projection.lifecycle !== 'IN_PROGRESS') throw new StageError('BLOCKED', ['PACKET_NOT_IN_PROGRESS']);
  if (projection.interactionStage !== 'IMPLEMENTATION_PR') {
    throw new StageError('BLOCKED', ['PACKET_STAGE_NOT_IMPLEMENTATION_PR']);
  }

  const requestedScopes = extractPacketScopes(issue.body);
  const overlap = discoverOverlap({packetNumber, requestedScopes, runner});
  if (overlap.state === 'CONFLICT') throw new StageError('CONFLICT', ['OVERLAP_CONFLICT']);
  if (overlap.state === 'UNKNOWN') throw new StageError('UNKNOWN', ['OVERLAP_UNKNOWN']);
  if (overlap.state === 'OVERLAP') throw new StageError('BLOCKED', ['OVERLAP_PRESENT']);

  const preflight = inspectPreflight(runner);
  const landingState = inspectLanding(firstMain, runner);
  const workspace = workspacePrepare.inspectWorkspace({
    packetNumber, baseSha: firstMain, runner, profile,
  });
  if (workspace.status !== 'READY') {
    const baseOnly = landingState.normalizationRequired
      && workspace.reasonCodes.length === 1
      && workspace.reasonCodes[0] === 'BASE_OBJECT_MISSING';
    if (!baseOnly) {
      const kind = workspace.reasonCodes.some((code) => code.endsWith('_READ_FAILED') || code === 'BASE_OBJECT_MISSING')
        ? 'UNKNOWN' : 'BLOCKED';
      throw new StageError(kind, workspace.reasonCodes, {workspace});
    }
  }

  return {
    packetNumber,
    packetRef: `#${packetNumber}`,
    plan,
    mainSha: firstMain,
    packetBody: issue.body,
    packetBodySha256: sha256(issue.body),
    requestedScopes,
    overlap,
    preflight,
    landing: landingState.landing,
    landingState: landingState.state,
    normalizationRequired: landingState.normalizationRequired,
    workspace,
  };
}

function invokeOperator(args, runner = runDefault) {
  const response = runner([process.execPath, OPERATOR, ...args], {cwd: ROOT});
  if (response.code !== 0 && !response.stdout.trim()) {
    throw new StageError('BLOCKED', ['D013_OPERATOR_FAILED']);
  }
  let value;
  try { value = JSON.parse(response.stdout); }
  catch { throw new StageError('UNKNOWN', ['D013_OPERATOR_OUTPUT_INVALID']); }
  return value;
}

function acquireLandingLease(context, runner = runDefault) {
  const value = invokeOperator([
    'lease-acquire',
    '--repo', REPO,
    '--packet', context.packetRef,
    '--route', 'S',
    '--executor', 'S',
    '--scopes-json', JSON.stringify([LANDING_SCOPE]),
    '--scope-disposition', 'DISJOINT',
    '--workspace-kind', 'landing_metadata',
    '--branch', LANDING_BRANCH,
    '--worktree', LANDING_WORKTREE,
    '--observed-base-sha', context.landing.landing_head,
    '--dispatch',
  ], runner);
  if (value.status !== 'DISPATCH_COMPLETE'
      || !SHA256_RE.test(value.leaseId || '')
      || !Number.isSafeInteger(value.observedGeneration)
      || !Number.isSafeInteger(value.runId)
      || value.runConclusion !== 'success') {
    throw new StageError('BLOCKED', ['LANDING_D013_ACQUIRE_NOT_PROVEN']);
  }
  return value;
}

function buildLandingManifest(context, lease) {
  try {
    return taskHandoff.buildManifest({
      schemaVersion: 1,
      mode: 'MCL_TASK_MANIFEST',
      packetRef: context.packetRef,
      packetBodySha256: context.packetBodySha256,
      phaseId: `${context.packetNumber}-stage-entry-landing-normalization`,
      phaseClass: 'REPOSITORY_MUTATION',
      route: 'S',
      executor: 'S',
      scopes: [LANDING_SCOPE],
      workspace: {kind: 'landing_metadata', branch: LANDING_BRANCH, worktree: LANDING_WORKTREE},
      observedBaseSha: context.landing.landing_head,
      leaseRequirement: 'REQUIRED',
      leaseEvidence: {
        ledgerRef: '#2352',
        leaseId: lease.leaseId,
        acquiredGeneration: lease.observedGeneration,
        acquireEvidenceRef: `run:${lease.runId}`,
      },
      sourceAuthorityRefs: [
        context.packetRef,
        'issue:#2352',
        'doc:products/chatgpt-mobile-coder-lab/docs/task-lease.md',
        'doc:products/chatgpt-mobile-coder-lab/docs/task-handoff.md',
        'doc:products/chatgpt-mobile-coder-lab/device-ops/landing-freshness/README.md',
      ],
      inputRefs: [`commit:${context.mainSha}`, `run:${lease.runId}`],
      expectedOutputRefs: [`commit:${context.mainSha}`],
      acceptanceRefs: [context.packetRef, 'issue:#2352'],
      stopCondition: 'Normalize only fixed S origin/main metadata to exact current main, release D-013, record completion, and revalidate stage-entry once.',
      authority: {
        repositoryMutationAuthorized: false,
        deviceMutationAuthorized: false,
        mergeAuthorized: false,
        releaseAuthorized: false,
        productionAuthorized: false,
      },
    });
  } catch {
    throw new StageError('UNKNOWN', ['LANDING_D014_MANIFEST_BUILD_FAILED']);
  }
}

function revalidateBeforeLandingRefresh(context, lease, {
  runner = runDefault,
  profile,
  inspector = inspectContext,
} = {}) {
  const fresh = inspector({
    packetNumber: context.packetNumber,
    plan: context.plan,
    runner,
    profile,
  });
  const conflicts = [];
  if (fresh.mainSha !== context.mainSha) conflicts.push('LANDING_LATE_MAIN_SHA_CONFLICT');
  if (fresh.packetBodySha256 !== context.packetBodySha256) conflicts.push('LANDING_LATE_PACKET_DIGEST_CONFLICT');
  if (JSON.stringify(fresh.requestedScopes) !== JSON.stringify(context.requestedScopes)) {
    conflicts.push('LANDING_LATE_SCOPE_CONFLICT');
  }
  if (fresh.overlap.state !== 'DISJOINT') conflicts.push('LANDING_LATE_SOURCE_OVERLAP_CONFLICT');
  if (!fresh.normalizationRequired || fresh.landingState !== 'NORMALIZATION_REQUIRED') {
    conflicts.push('LANDING_LATE_NORMALIZATION_STATE_CONFLICT');
  }
  if (fresh.landing.landing_head !== context.landing.landing_head) {
    conflicts.push('LANDING_LATE_HEAD_CONFLICT');
  }
  if (conflicts.length) throw new StageError('CONFLICT', conflicts);

  const leaseView = invokeOperator([
    'inspect',
    '--repo', REPO,
    '--packet', context.packetRef,
    '--scopes-json', JSON.stringify([LANDING_SCOPE]),
  ], runner);
  if (leaseView.status !== 'READY') {
    throw new StageError('UNKNOWN', ['LANDING_LATE_D013_INSPECT_NOT_READY']);
  }
  if (leaseView.packetBodySha256 !== context.packetBodySha256) {
    throw new StageError('CONFLICT', ['LANDING_LATE_D013_PACKET_DIGEST_CONFLICT']);
  }
  if (!Array.isArray(leaseView.matchingLeaseIds)
      || leaseView.matchingLeaseIds.length !== 1
      || leaseView.matchingLeaseIds[0] !== lease.leaseId) {
    throw new StageError('CONFLICT', ['LANDING_LATE_D013_LEASE_IDENTITY_CONFLICT']);
  }
  if (!Number.isSafeInteger(leaseView.ledgerGeneration)
      || leaseView.ledgerGeneration < lease.observedGeneration) {
    throw new StageError('UNKNOWN', ['LANDING_LATE_D013_GENERATION_INVALID']);
  }
  return fresh;
}

function normalizeLandingCurrentness(context, {
  runner = runDefault,
  overlapResolver = discoverOverlap,
  profile,
  authorityBarrier = revalidateBeforeLandingRefresh,
} = {}) {
  if (!context.normalizationRequired || context.landingState !== 'NORMALIZATION_REQUIRED') {
    return {normalized: false, count: 0, artifacts: []};
  }
  const overlap = overlapResolver({
    packetNumber: context.packetNumber,
    requestedScopes: [LANDING_SCOPE],
    runner,
  });
  if (overlap.state === 'CONFLICT') throw new StageError('CONFLICT', ['LANDING_NORMALIZATION_OVERLAP_CONFLICT']);
  if (overlap.state === 'UNKNOWN') throw new StageError('UNKNOWN', ['LANDING_NORMALIZATION_OVERLAP_UNKNOWN']);
  if (overlap.state === 'OVERLAP') throw new StageError('BLOCKED', ['LANDING_NORMALIZATION_OVERLAP_PRESENT']);

  const lease = acquireLandingLease(context, runner);
  let released = null;
  try {
    authorityBarrier(context, lease, {runner, profile});
    const manifest = buildLandingManifest(context, lease);
    const manifestComment = postComment(
      context.packetNumber, taskHandoff.renderManifest(manifest), runner);

    const refreshedRaw = runOwner(LANDING, ['refresh', 'S'], runner);
    if (refreshedRaw.code !== 0) throw new StageError('BLOCKED', ['LANDING_REFRESH_FAILED']);
    const refreshed = parseKeyValueReceipt(refreshedRaw.stdout);
    if (refreshed.schema !== 'mcl-landing-freshness.v1'
        || refreshed.operation !== 'refresh'
        || refreshed.route !== 'S'
        || refreshed.actual_branch !== LANDING_BRANCH
        || refreshed.worktree !== 'clean'
        || refreshed.landing_head !== context.landing.landing_head
        || refreshed.origin_main !== context.mainSha
        || refreshed.remote_main !== context.mainSha
        || refreshed.origin_remote_relation !== 'same'
        || refreshed.refresh !== 'refreshed'
        || refreshed.details !== 'withheld') {
      throw new StageError('UNKNOWN', ['LANDING_REFRESH_READBACK_INVALID']);
    }

    released = releaseLease(context, lease.leaseId, runner);
    if (!released.ok) throw new StageError('BLOCKED', ['LANDING_D013_RELEASE_FAILED']);

    const receipt = taskHandoff.buildCompletionReceipt(manifest, {
      disposition: 'COMPLETE',
      outputRefs: [`commit:${context.mainSha}`],
      validationRefs: [`run:${lease.runId}`, `run:${released.value.runId}`],
      observedRefs: [`commit:${context.mainSha}`, `run:${lease.runId}`, `run:${released.value.runId}`],
      leaseDisposition: 'RELEASED',
      leaseReleaseEvidence: {
        ledgerRef: '#2352',
        leaseId: lease.leaseId,
        releasedGeneration: released.value.observedGeneration,
        evidenceRef: `run:${released.value.runId}`,
      },
      workspaceResult: 'clean',
      blockerRefs: [],
      requiredUnknownRefs: [],
    });
    const completionComment = postComment(
      context.packetNumber, taskHandoff.renderCompletionReceipt(receipt), runner);
    return {
      normalized: true,
      count: 1,
      receipt,
      artifacts: [
        `issue-comment:${manifestComment}`,
        `issue-comment:${completionComment}`,
        `receipt:mcl-task-completion:${receipt.receiptId}`,
      ],
    };
  } catch (error) {
    if (!released) {
      const cleanup = releaseLease(context, lease.leaseId, runner);
      if (!cleanup.ok) {
        const reasons = error instanceof StageError ? error.reasonCodes : ['LANDING_NORMALIZATION_FAILED'];
        throw new StageError('BLOCKED', [...reasons, 'LANDING_D013_CLEANUP_RELEASE_FAILED']);
      }
    }
    throw error;
  }
}

function revalidateAfterNormalization(context, {
  runner = runDefault,
  profile,
  inspector = inspectContext,
} = {}) {
  const fresh = inspector({
    packetNumber: context.packetNumber,
    plan: context.plan,
    runner,
    profile,
  });
  const conflicts = [];
  if (fresh.mainSha !== context.mainSha) conflicts.push('NORMALIZATION_MAIN_SHA_CONFLICT');
  if (fresh.packetBodySha256 !== context.packetBodySha256) conflicts.push('NORMALIZATION_PACKET_DIGEST_CONFLICT');
  if (JSON.stringify(fresh.requestedScopes) !== JSON.stringify(context.requestedScopes)) {
    conflicts.push('NORMALIZATION_SCOPE_CONFLICT');
  }
  if (fresh.overlap.state !== 'DISJOINT') conflicts.push('NORMALIZATION_SOURCE_OVERLAP_CONFLICT');
  if (fresh.normalizationRequired || fresh.landingState !== 'CURRENT') {
    conflicts.push('NORMALIZATION_NOT_CONVERGED');
  }
  if (fresh.workspace.status !== 'READY') conflicts.push('NORMALIZATION_WORKSPACE_NOT_READY');
  if (conflicts.length) throw new StageError('CONFLICT', conflicts);
  return fresh;
}

function acquireLease(context, runner = runDefault) {
  const identity = context.workspace.identity;
  const value = invokeOperator([
    'lease-acquire',
    '--repo', REPO,
    '--packet', context.packetRef,
    '--route', 'S',
    '--executor', 'S',
    '--scopes-json', JSON.stringify(context.requestedScopes),
    '--scope-disposition', 'DISJOINT',
    '--workspace-kind', 'repository',
    '--branch', identity.branch,
    '--worktree', identity.worktree,
    '--observed-base-sha', context.mainSha,
    '--dispatch',
  ], runner);
  if (value.status !== 'DISPATCH_COMPLETE'
      || !SHA256_RE.test(value.leaseId || '')
      || !Number.isSafeInteger(value.observedGeneration)
      || !Number.isSafeInteger(value.runId)
      || value.runConclusion !== 'success') {
    throw new StageError('BLOCKED', ['D013_ACQUIRE_NOT_PROVEN']);
  }
  return value;
}

function releaseLease(context, leaseId, runner = runDefault) {
  try {
    const value = invokeOperator([
      'lease-release',
      '--repo', REPO,
      '--packet', context.packetRef,
      '--lease-id', leaseId,
      '--dispatch',
    ], runner);
    return value.status === 'DISPATCH_COMPLETE' && value.runConclusion === 'success'
      ? {ok: true, value} : {ok: false, value};
  } catch (error) {
    return {ok: false, error};
  }
}

function postComment(packetNumber, body, runner = runDefault) {
  const value = ghJson(`repos/${REPO}/issues/${packetNumber}/comments`, runner, {
    method: 'POST', body: {body},
  });
  if (!Number.isSafeInteger(value?.id)) throw new StageError('UNKNOWN', ['COMMENT_WRITE_UNPROVEN']);
  return value.id;
}

function deterministicLeaseEvidenceRef(lease) {
  return `receipt:mcl-task-lease:${lease.leaseId}:generation:${lease.observedGeneration}`;
}

function buildManifest(context, lease) {
  try {
    const leaseEvidenceRef = deterministicLeaseEvidenceRef(lease);
    return taskHandoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: context.packetRef,
    packetBodySha256: context.packetBodySha256,
    phaseId: `${context.packetNumber}-implementation-pr-stage-entry`,
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: context.requestedScopes,
    workspace: {
      kind: 'repository',
      branch: context.workspace.identity.branch,
      worktree: context.workspace.identity.worktree,
    },
    observedBaseSha: context.mainSha,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: {
      ledgerRef: '#2352',
      leaseId: lease.leaseId,
      acquiredGeneration: lease.observedGeneration,
      acquireEvidenceRef: leaseEvidenceRef,
    },
    sourceAuthorityRefs: [
      context.packetRef,
      'issue:#2352',
      'doc:products/chatgpt-mobile-coder-lab/docs/task-lease.md',
      'doc:products/chatgpt-mobile-coder-lab/docs/task-handoff.md',
    ],
    inputRefs: [
      `commit:${context.mainSha}`,
      'receipt:mcl-dispatch-plan:v1',
      leaseEvidenceRef,
    ],
    expectedOutputRefs: context.requestedScopes.filter((scope) => scope.startsWith('path:')),
    acceptanceRefs: [context.packetRef, 'issue:#2352'],
    stopCondition: 'Prepare one current S repository workspace and bounded HANDOFF_READY evidence; do not execute the source effect owner.',
    authority: {
      repositoryMutationAuthorized: false,
      deviceMutationAuthorized: false,
      mergeAuthorized: false,
      releaseAuthorized: false,
      productionAuthorized: false,
    },
    });
  } catch {
    throw new StageError('UNKNOWN', ['D014_MANIFEST_BUILD_FAILED']);
  }
}

function buildHandoff(context, manifest, lease) {
  return {
    schema: 'mcl-execution-handoff.v1',
    status: 'HANDOFF_READY',
    packet_ref: context.packetRef,
    phase: context.plan.phase,
    route: 'S',
    executor: 'S',
    effect_class: 'repository_mutation',
    manifest_id: manifest.manifestId,
    lease_id: lease.leaseId,
    next_owner: 'existing_route_owner',
    reason_codes: [],
    mutation_authorized: false,
    execution_authorized: false,
    details: 'withheld',
  };
}

function renderHandoff(handoff) {
  return [
    '<!-- mcl-execution-handoff:v1 -->',
    '```json',
    JSON.stringify(handoff, null, 2),
    '```',
    '<!-- /mcl-execution-handoff:v1 -->',
  ].join('\n');
}

function receiptFor({
  packetNumber,
  packetBodySha256 = 'UNKNOWN',
  reasonCodes = [],
  steps = [],
  counters = [],
  artifacts = [],
  result = 'PASS',
  nextLegalAction,
  workspaceStateChanged = false,
}) {
  const disposition = result === 'PASS'
    ? 'COMPLETE'
    : result === 'CONFLICT'
      ? 'CONFLICT'
      : result === 'UNKNOWN'
        ? 'UNKNOWN'
        : result === 'BLOCKED'
          ? 'BLOCKED'
          : 'NEEDS_REVIEW';
  const input = {
    schemaVersion: 2,
    operationId: `mcl-stage-entry:${packetNumber}`,
    primitiveId: 'mcl-stage-entry.v1',
    sourceIdentity: {
      kind: 'ISSUE',
      locator: `issue:#${packetNumber}`,
      identity: packetBodySha256 === 'UNKNOWN' ? 'UNKNOWN' : `sha256:${packetBodySha256}`,
    },
    executionSurface: 'RDC:S:repository-owned-stage-entry',
    stage: 'IMPLEMENTATION_PR',
    executionLifecycle: 'FINISHED',
    attentionDisposition: disposition,
    result,
    proofScope: 'MCL_STAGE_ENTRY_COORDINATION_PREPARATION_V1',
    steps: steps.length ? steps : [{
      name: 'stage-entry',
      result,
      evidenceLocator: `issue:#${packetNumber}`,
    }],
    counters: [
      ...counters,
      {name: 'workspace_state_changed', value: workspaceStateChanged ? 1 : 0},
    ],
    affectedFiles: [],
    artifactLocators: unique(artifacts),
    reasonCodes: unique(reasonCodes),
    requiredUnknowns: result === 'UNKNOWN' ? unique(reasonCodes) : [],
    conflicts: result === 'CONFLICT' ? unique(reasonCodes) : [],
    blockers: result === 'BLOCKED' ? unique(reasonCodes) : [],
    exitCode: result === 'PASS' ? 0 : 2,
    stderrTail: null,
    nextLegalAction: nextLegalAction || 'TARGETED_DRILLDOWN_REQUIRED',
  };
  return executionReceipt.projectExecutionReceipt(input);
}

function errorReceipt(packetNumber, error, packetBodySha256 = 'UNKNOWN', extra = {}) {
  const kind = error instanceof StageError ? error.kind : 'UNKNOWN';
  const reasons = error instanceof StageError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
  const result = ['BLOCKED', 'CONFLICT', 'UNKNOWN'].includes(kind) ? kind : 'FAIL';
  return receiptFor({
    packetNumber,
    packetBodySha256,
    reasonCodes: reasons,
    result,
    workspaceStateChanged: Boolean(extra.workspaceStateChanged),
    artifacts: extra.artifacts || [],
    nextLegalAction: extra.nextLegalAction || (
      result === 'BLOCKED' ? 'RESOLVE_BLOCKER'
        : result === 'UNKNOWN' ? 'TARGETED_DRILLDOWN_REQUIRED'
          : result === 'CONFLICT' ? 'RESOLVE_CONFLICT'
            : 'REPAIR_AND_RETRY'
    ),
  });
}

function revalidateAfterAcquire(context, lease, {
  runner = runDefault,
  profile,
  inspector = inspectContext,
} = {}) {
  const fresh = inspector({
    packetNumber: context.packetNumber,
    plan: context.plan,
    runner,
    profile,
  });
  const conflicts = [];
  if (fresh.mainSha !== context.mainSha) conflicts.push('LATE_MAIN_SHA_CONFLICT');
  if (fresh.packetBodySha256 !== context.packetBodySha256) conflicts.push('LATE_PACKET_DIGEST_CONFLICT');
  if (JSON.stringify(fresh.requestedScopes) !== JSON.stringify(context.requestedScopes)) {
    conflicts.push('LATE_SCOPE_CONFLICT');
  }
  if (fresh.workspace?.identity?.branch !== context.workspace?.identity?.branch
      || fresh.workspace?.identity?.worktree !== context.workspace?.identity?.worktree) {
    conflicts.push('LATE_WORKSPACE_IDENTITY_CONFLICT');
  }
  if (conflicts.length) throw new StageError('CONFLICT', conflicts);

  const leaseView = invokeOperator([
    'inspect',
    '--repo', REPO,
    '--packet', context.packetRef,
    '--scopes-json', JSON.stringify(context.requestedScopes),
  ], runner);
  if (leaseView.status !== 'READY') {
    throw new StageError('UNKNOWN', ['LATE_D013_INSPECT_NOT_READY']);
  }
  if (leaseView.packetBodySha256 !== context.packetBodySha256) {
    throw new StageError('CONFLICT', ['LATE_D013_PACKET_DIGEST_CONFLICT']);
  }
  if (!Array.isArray(leaseView.matchingLeaseIds)
      || leaseView.matchingLeaseIds.length !== 1
      || leaseView.matchingLeaseIds[0] !== lease.leaseId) {
    throw new StageError('CONFLICT', ['LATE_D013_LEASE_IDENTITY_CONFLICT']);
  }
  if (!Number.isSafeInteger(leaseView.ledgerGeneration)
      || leaseView.ledgerGeneration < lease.observedGeneration) {
    throw new StageError('UNKNOWN', ['LATE_D013_GENERATION_INVALID']);
  }
  return fresh;
}

function applyRepositoryContext(context, {
  runner = runDefault,
  profile,
  remoteCreate,
  manifestBuilder = buildManifest,
  manifestRenderer = taskHandoff.renderManifest,
  lateBarrier = revalidateAfterAcquire,
} = {}) {
  let lease = null;
  let manifest = null;
  let manifestComment = null;
  let workspaceStateChanged = false;
  try {
    lease = acquireLease(context, runner);
    manifest = manifestBuilder(context, lease);
    try {
      manifestComment = postComment(context.packetNumber, manifestRenderer(manifest), runner);
    } catch {
      throw new StageError('UNKNOWN', ['D014_MANIFEST_COMMENT_FAILED']);
    }

    lateBarrier(context, lease, {runner, profile});

    const created = workspacePrepare.createWorkspace({
      packetNumber: context.packetNumber,
      baseSha: context.mainSha,
      runner,
      profile,
      ...(remoteCreate ? {remoteCreate} : {}),
    });
    workspaceStateChanged = Boolean(created.stateChanged);
    if (created.status !== 'CREATED') {
      const result = created.status === 'PARTIAL' ? 'FAIL' : 'BLOCKED';
      let reasons = [...created.reasonCodes];
      let nextLegalAction = created.stateChanged
        ? 'PRESERVE_PARTIAL_STATE_AND_RECOVER'
        : 'REPAIR_AND_RETRY';
      if (!created.stateChanged) {
        const cleanup = releaseLease(context, lease.leaseId, runner);
        if (!cleanup.ok) {
          reasons = [...reasons, 'D013_CLEANUP_RELEASE_FAILED'];
          nextLegalAction = 'EXPLICIT_D013_RECOVERY_REQUIRED';
        }
      }
      return receiptFor({
        packetNumber: context.packetNumber,
        packetBodySha256: context.packetBodySha256,
        result,
        reasonCodes: reasons,
        workspaceStateChanged,
        artifacts: [`issue:#${context.packetNumber}`, `receipt:mcl-task-manifest:${manifest.manifestId}`],
        nextLegalAction,
      });
    }

    const handoff = buildHandoff(context, manifest, lease);
    let handoffComment;
    try {
      handoffComment = postComment(context.packetNumber, renderHandoff(handoff), runner);
    } catch {
      throw new StageError('UNKNOWN', ['HANDOFF_COMMENT_FAILED']);
    }
    return receiptFor({
      packetNumber: context.packetNumber,
      packetBodySha256: context.packetBodySha256,
      result: 'PASS',
      workspaceStateChanged: true,
      counters: [
        {name: 'd013_lease_active', value: 1},
        {name: 'local_workspace_created', value: 1},
        {name: 'remote_branch_created', value: 1},
        {name: 'manifest_comment_written', value: 1},
        {name: 'handoff_comment_written', value: 1},
      ],
      steps: [
        {name: 'authority-currentness-overlap', result: 'PASS', evidenceLocator: `issue:#${context.packetNumber}`},
        {name: 'd013-acquire', result: 'PASS', evidenceLocator: `run:${lease.runId}`},
        {name: 'd014-manifest', result: 'PASS', evidenceLocator: `issue-comment:${manifestComment}`},
        {name: 'workspace-prepare', result: 'PASS', evidenceLocator: `receipt:mcl-stage-entry-workspace:${created.remoteHead}`},
        {name: 'execution-handoff', result: 'PASS', evidenceLocator: `issue-comment:${handoffComment}`},
      ],
      artifacts: [
        `issue:#${context.packetNumber}`,
        `run:${lease.runId}`,
        `receipt:mcl-task-manifest:${manifest.manifestId}`,
        `receipt:mcl-execution-handoff:${manifest.manifestId}`,
      ],
      nextLegalAction: 'CLAIM_OWNER_LOCAL_HOLDER_IF_REQUIRED_THEN_INVOKE_EXISTING_ROUTE_OWNER',
    });
  } catch (error) {
    if (lease && !workspaceStateChanged) {
      const cleanup = releaseLease(context, lease.leaseId, runner);
      const extraReason = cleanup.ok ? [] : ['D013_CLEANUP_RELEASE_FAILED'];
      const wrapped = error instanceof StageError
        ? new StageError(error.kind, [...error.reasonCodes, ...extraReason])
        : new StageError('UNKNOWN', ['UNEXPECTED_ERROR', ...extraReason]);
      return errorReceipt(context.packetNumber, wrapped, context.packetBodySha256, {
        workspaceStateChanged: false,
        artifacts: [`issue:#${context.packetNumber}`],
        nextLegalAction: cleanup.ok ? 'REPAIR_AND_RETRY' : 'EXPLICIT_D013_RECOVERY_REQUIRED',
      });
    }
    return errorReceipt(context.packetNumber, error, context.packetBodySha256, {
      workspaceStateChanged,
      artifacts: [`issue:#${context.packetNumber}`],
      nextLegalAction: workspaceStateChanged ? 'PRESERVE_PARTIAL_STATE_AND_RECOVER' : undefined,
    });
  }
}

function applyContext(context, {
  runner = runDefault,
  profile,
  normalizationRunner = normalizeLandingCurrentness,
  normalizationBarrier = revalidateAfterNormalization,
  ...rest
} = {}) {
  let activeContext = context;
  let normalization = {normalized: false, count: 0, artifacts: []};
  if (context.normalizationRequired) {
    try {
      normalization = normalizationRunner(context, {runner, profile});
      if (!normalization.normalized || normalization.count !== 1) {
        throw new StageError('UNKNOWN', ['LANDING_NORMALIZATION_UNPROVEN']);
      }
      activeContext = normalizationBarrier(context, {runner, profile});
    } catch (error) {
      const explicitRecovery = error instanceof StageError
        && error.reasonCodes.some((code) => ['LANDING_D013_RELEASE_FAILED', 'LANDING_D013_CLEANUP_RELEASE_FAILED'].includes(code));
      return errorReceipt(context.packetNumber, error, context.packetBodySha256, {
        workspaceStateChanged: false,
        artifacts: normalization.artifacts || [],
        nextLegalAction: explicitRecovery ? 'EXPLICIT_D013_RECOVERY_REQUIRED' : undefined,
      });
    }
  }
  const receipt = applyRepositoryContext(activeContext, {
    runner,
    profile,
    ...rest,
  });
  const counters = [...(receipt.counters || [])];
  if (!counters.some((row) => row.name === 'landing_normalization_count')) {
    counters.push({name: 'landing_normalization_count', value: normalization.count, status: 'KNOWN'});
  }
  const steps = [...(receipt.steps || [])];
  if (normalization.normalized && receipt.result === 'PASS') {
    steps.splice(1, 0, {
      name: 'landing-currentness-normalization',
      result: 'PASS',
      evidenceLocator: normalization.artifacts.at(-1) || context.packetRef,
    });
  }
  return {
    ...receipt,
    counters,
    steps,
    artifactLocators: unique([...(receipt.artifactLocators || []), ...normalization.artifacts]),
  };
}

function run(argv = process.argv.slice(2), deps = {}) {
  let parsed;
  try {
    parsed = parseArgs(argv);
    const plan = parsePlan(readRegularJson(parsed.planFile));
    const context = inspectContext({
      packetNumber: parsed.packetNumber,
      plan,
      runner: deps.runner || runDefault,
      profile: deps.profile,
    });
    if (parsed.command === 'inspect') {
      return receiptFor({
        packetNumber: parsed.packetNumber,
        packetBodySha256: context.packetBodySha256,
        result: 'PASS',
        counters: [
          {name: 'overlap_candidate_count', value: context.overlap.candidateCount || 0},
          {name: 'landing_normalization_required', value: context.normalizationRequired ? 1 : 0},
        ],
        steps: [
          {name: 'main-ops-currentness', result: 'PASS', evidenceLocator: 'issue:#485'},
          {name: 'packet-plan-scope', result: 'PASS', evidenceLocator: context.packetRef},
          {name: 'overlap-discovery', result: 'PASS', evidenceLocator: 'owner:work-system-scope-overlap'},
          {name: 's-preflight', result: 'PASS', evidenceLocator: 'owner:mcl-s-env-status'},
          {name: context.normalizationRequired ? 'landing-currentness-normalizable' : 'landing-currentness', result: 'PASS', evidenceLocator: 'owner:mcl-landing-freshness'},
          {name: 'workspace-absence', result: 'PASS', evidenceLocator: `receipt:mcl-stage-entry-workspace:${parsed.packetNumber}`},
        ],
        artifacts: [context.packetRef, 'issue:#485', 'issue:#2352'],
        nextLegalAction: 'APPLY_STAGE_ENTRY_WITH_EXPLICIT_EFFECT_FLAG',
      });
    }
    return applyContext(context, {runner: deps.runner || runDefault, profile: deps.profile});
  } catch (error) {
    return errorReceipt(parsed?.packetNumber || 'unknown', error);
  }
}

if (require.main === module) {
  const receipt = run();
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  process.exitCode = executionReceipt.exitCodeFor(receipt);
}

module.exports = {
  LANDING_BRANCH,
  LANDING_SCOPE,
  LANDING_WORKTREE,
  MAX_PAGES,
  PAGE_SIZE,
  PLAN_FIELDS,
  REPO,
  SCOPE_HEADINGS,
  StageError,
  acquireLandingLease,
  acquireLease,
  applyContext,
  applyRepositoryContext,
  buildHandoff,
  buildLandingManifest,
  buildManifest,
  classifyLanding,
  discoverOverlap,
  errorReceipt,
  extractPacketScopes,
  fetchPaged,
  ghJson,
  inspectContext,
  inspectLanding,
  inspectPreflight,
  normalizeLandingCurrentness,
  parseArgs,
  parseKeyValueReceipt,
  parseOpsCapsule,
  parsePlan,
  postComment,
  receiptFor,
  releaseLease,
  revalidateAfterAcquire,
  revalidateAfterNormalization,
  revalidateBeforeLandingRefresh,
  renderHandoff,
  run,
  runDefault,
};
