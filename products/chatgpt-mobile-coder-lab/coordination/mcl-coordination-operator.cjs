'use strict';

const fs = require('node:fs');
const childProcess = require('node:child_process');
const { createGitHubClient } = require('../../../.github/plugin-control-plane/canonical-main/infra/github-client.cjs');
const { normalizeScope } = require('../../../.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs');
const lease = require('./task-lease.cjs');
const handoff = require('./task-handoff.cjs');

const WORKFLOW = 'mcl-task-lease.yml';
const LEDGER_ISSUE = 2352;
const PACKET_RE = /^#([1-9][0-9]*)$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ISSUE_ENDPOINT_RE = /^\/issues\/([1-9][0-9]*)$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const RUN_ID_RE = /^[1-9][0-9]*$/;
const MAX_DISPATCH_LOG_BYTES = 64 * 1024;
const WORKFLOW_NAME = 'MCL Task Lease';
const TASK_LEASE_RESULT_PREFIX = '{"schemaVersion":1,"mode":"MCL_TASK_LEASE"';
const WORKFLOW_INPUT_LOG_KEYS = Object.freeze({
  operation: 'MCL_LEASE_OPERATION',
  expected_generation: 'MCL_LEASE_EXPECTED_GENERATION',
  packet_ref: 'MCL_LEASE_PACKET_REF',
  packet_body_sha256: 'MCL_LEASE_PACKET_BODY_SHA256',
  route: 'MCL_LEASE_ROUTE',
  executor: 'MCL_LEASE_EXECUTOR',
  scopes_json: 'MCL_LEASE_SCOPES_JSON',
  scope_disposition: 'MCL_LEASE_SCOPE_DISPOSITION',
  workspace_kind: 'MCL_LEASE_WORKSPACE_KIND',
  branch: 'MCL_LEASE_BRANCH',
  worktree: 'MCL_LEASE_WORKTREE',
  observed_base_sha: 'MCL_LEASE_OBSERVED_BASE_SHA',
  lease_id: 'MCL_LEASE_ID',
});
const AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function output(status, reasonCodes = [], extras = {}) {
  return {schemaVersion: 1, mode: 'MCL_COORDINATION_OPERATOR', status,
    reasonCodes: [...new Set(reasonCodes)].sort(), ...extras, authority: {...AUTHORITY}};
}
function packetNumber(packetRef) {
  const match = PACKET_RE.exec(packetRef || '');
  return match ? Number(match[1]) : null;
}

function validateRepo(repo) {
  return typeof repo === 'string' && REPO_RE.test(repo);
}

function normalizeRequestedScopes(rawScopes, {allowEmpty = false} = {}) {
  if (!Array.isArray(rawScopes) || (!allowEmpty && rawScopes.length < 1)) {
    return {ok: false, scopes: [], reasonCodes: ['REQUEST_SCOPES_INVALID']};
  }
  const scopes = [];
  for (const raw of rawScopes) {
    const parsed = normalizeScope(raw);
    if (!parsed.ok) return {ok: false, scopes: [], reasonCodes: ['REQUEST_SCOPE_INVALID']};
    scopes.push(parsed.normalized);
  }
  const normalized = [...new Set(scopes)].sort();
  if (normalized.length !== scopes.length) {
    return {ok: false, scopes: [], reasonCodes: ['REQUEST_SCOPE_DUPLICATE']};
  }
  return {ok: true, scopes: normalized, reasonCodes: []};
}
async function readContext({client, packetRef, scopes = []}) {
  const number = packetNumber(packetRef);
  if (!number) return output('BLOCKED', ['REQUEST_PACKET_REF_INVALID']);
  const packet = await client.api(`/issues/${number}`);
  if (!packet || packet.pull_request || packet.state !== 'open') {
    return output('BLOCKED', ['PACKET_ISSUE_NOT_OPEN']);
  }
  const body = typeof packet.body === 'string' ? packet.body : '';
  const reasonCodes = [];
  if (!body.split(/\r?\n/).some((line) => line.trim() === '<!-- canonical-main-work-packet:v1 -->')) {
    reasonCodes.push('PACKET_MARKER_MISSING');
  }
  const lifecycle = lease.extractPacketLifecycle(body);
  if (!lifecycle) reasonCodes.push('PACKET_LIFECYCLE_UNKNOWN');
  if (['DONE', 'CANCELLED', 'SUPERSEDED'].includes(lifecycle)) reasonCodes.push('PACKET_TERMINAL');
  const ledgerIssue = await client.api(`/issues/${LEDGER_ISSUE}`);
  const parsed = lease.parseLedger(ledgerIssue?.body || '');
  if (!parsed.ok) reasonCodes.push('LEDGER_STATE_INVALID', ...parsed.reasonCodes);
  const normalized = normalizeRequestedScopes(scopes, {allowEmpty: true});
  reasonCodes.push(...normalized.reasonCodes);
  const state = parsed.ok ? parsed.state : null;
  const matching = state ? state.activeLeases.filter((item) => item.packetRef === packetRef) : [];
  return output(reasonCodes.length ? 'BLOCKED' : 'READY', reasonCodes, {
    packetRef, packetBodySha256: lease.digest(body), packetLifecycle: lifecycle,
    ledgerGeneration: state?.generation ?? null, matchingLeaseIds: matching.map((item) => item.leaseId).sort(),
    normalizedScopes: normalized.scopes, ledgerState: state,
  });
}
async function planAcquire({client, packetRef, route, executor, scopes, scopeDisposition,
  workspaceKind, branch, worktree, observedBaseSha = null}) {
  const context = await readContext({client, packetRef, scopes});
  if (context.status !== 'READY') return publicContext(context);
  const request = {
    expectedGeneration: context.ledgerGeneration, packetRef,
    packetBodySha256: context.packetBodySha256, route, executor, scopes,
    scopeDisposition, workspaceKind, branch, worktree, observedBaseSha,
  };
  const normalized = lease.normalizeAcquireRequest(request);
  if (!normalized.ok) return output('BLOCKED', normalized.reasonCodes, {ledgerGeneration: context.ledgerGeneration});
  const plan = lease.planAcquire(context.ledgerState, request);
  if (!['ACQUIRE_READY', 'ACQUIRE_NOOP'].includes(plan.status)) {
    return output(plan.status, plan.reasonCodes, {ledgerGeneration: plan.generation, leaseId: plan.leaseId || null});
  }
  const workflowInputs = {
    operation: 'acquire', expected_generation: String(context.ledgerGeneration), packet_ref: packetRef,
    packet_body_sha256: context.packetBodySha256, route, executor,
    scopes_json: JSON.stringify(normalized.lease.scopes), scope_disposition: 'DISJOINT',
    workspace_kind: workspaceKind, branch, worktree,
    observed_base_sha: observedBaseSha || '',
  };
  return output('PLAN_READY', plan.reasonCodes, {
    operation: 'acquire', ledgerGeneration: context.ledgerGeneration,
    leaseId: plan.leaseId || normalized.lease.leaseId, workflowInputs,
  });
}
async function planRelease({client, packetRef, leaseId}) {
  const context = await readContext({client, packetRef});
  if (context.status !== 'READY') return publicContext(context);
  if (!SHA256_RE.test(leaseId || '')) return output('BLOCKED', ['REQUEST_LEASE_ID_INVALID']);
  const plan = lease.planRelease(context.ledgerState, {
    expectedGeneration: context.ledgerGeneration, leaseId, packetRef,
  });
  if (!['RELEASE_READY', 'RELEASE_NOOP'].includes(plan.status)) {
    return output(plan.status, plan.reasonCodes, {ledgerGeneration: plan.generation, leaseId});
  }
  return output('PLAN_READY', plan.reasonCodes, {
    operation: 'release', ledgerGeneration: context.ledgerGeneration, leaseId,
    workflowInputs: {
      operation: 'release', expected_generation: String(context.ledgerGeneration),
      packet_ref: packetRef, lease_id: leaseId,
    },
  });
}

function normalizeRunId(value) {
  const text = String(value ?? '');
  if (!RUN_ID_RE.test(text)) return null;
  const runId = Number(text);
  return Number.isSafeInteger(runId) ? runId : null;
}

function readFailedReleaseEvidence({repo, failedRunId, packetRef, leaseId, runner = defaultRunner}) {
  const runId = normalizeRunId(failedRunId);
  if (!runId) return output('BLOCKED', ['RECOVERY_FAILED_RUN_ID_INVALID']);
  if (!PACKET_RE.test(packetRef || '')) return output('BLOCKED', ['REQUEST_PACKET_REF_INVALID'], {recoveryOfRunId: runId});
  if (!SHA256_RE.test(leaseId || '')) return output('BLOCKED', ['REQUEST_LEASE_ID_INVALID'], {recoveryOfRunId: runId});

  const viewed = runner(['run', 'view', String(runId), '--repo', repo, '--json',
    'databaseId,status,conclusion,event,url,workflowName']);
  let info = null;
  try { info = JSON.parse(viewed.stdout || '{}'); } catch { info = null; }
  if (viewed.code !== 0 || !info) {
    return output('UNKNOWN', ['RECOVERY_FAILED_RUN_READ_FAILED'], {recoveryOfRunId: runId, leaseId});
  }
  if (info.databaseId !== runId) {
    return output('BLOCKED', ['RECOVERY_FAILED_RUN_IDENTITY_MISMATCH'], {recoveryOfRunId: runId, leaseId});
  }
  if (info.event !== 'workflow_dispatch') {
    return output('BLOCKED', ['RECOVERY_FAILED_RUN_EVENT_MISMATCH'], {recoveryOfRunId: runId, leaseId});
  }
  if (info.workflowName !== 'MCL Task Lease') {
    return output('BLOCKED', ['RECOVERY_FAILED_RUN_WORKFLOW_MISMATCH'], {recoveryOfRunId: runId, leaseId});
  }
  if (info.status !== 'completed' || info.conclusion !== 'failure') {
    return output('BLOCKED', ['RECOVERY_FAILED_RUN_NOT_COMPLETED_FAILURE'], {recoveryOfRunId: runId, leaseId});
  }

  const logged = runner(['run', 'view', String(runId), '--repo', repo, '--log']);
  if (logged.code !== 0) {
    return output('UNKNOWN', ['RECOVERY_FAILED_RUN_LOG_READ_FAILED'], {recoveryOfRunId: runId, leaseId});
  }
  const log = logged.stdout || '';
  if (!log.includes('MCL_LEASE_OPERATION: release')) {
    return output('BLOCKED', ['RECOVERY_FAILED_RUN_OPERATION_MISMATCH'], {recoveryOfRunId: runId, leaseId});
  }
  if (!log.includes(`MCL_LEASE_PACKET_REF: ${packetRef}`)) {
    return output('BLOCKED', ['RECOVERY_FAILED_RUN_PACKET_MISMATCH'], {recoveryOfRunId: runId, leaseId});
  }
  if (!log.includes(`MCL_LEASE_ID: ${leaseId}`)) {
    return output('BLOCKED', ['RECOVERY_FAILED_RUN_LEASE_MISMATCH'], {recoveryOfRunId: runId, leaseId});
  }
  if (!log.includes('mcl-task-lease fatal: fetch failed')) {
    return output('BLOCKED', ['RECOVERY_FAILURE_CLASS_NOT_ELIGIBLE'], {recoveryOfRunId: runId, leaseId});
  }
  return output('RECOVERY_EVIDENCE_READY', ['RECOVERY_TRANSIENT_FETCH_FAILURE_PROVEN'], {
    recoveryOfRunId: runId, leaseId,
  });
}

async function planReleaseRecovery({repo, client, runner = defaultRunner, packetRef, leaseId, failedRunId}) {
  const evidence = readFailedReleaseEvidence({repo, failedRunId, packetRef, leaseId, runner});
  if (evidence.status !== 'RECOVERY_EVIDENCE_READY') return evidence;

  const context = await readContext({client, packetRef});
  const common = {recoveryOfRunId: evidence.recoveryOfRunId,
    ledgerGeneration: context.ledgerGeneration, leaseId};
  if (context.status !== 'READY') return output(context.status, context.reasonCodes, common);

  const plan = lease.planRelease(context.ledgerState, {
    expectedGeneration: context.ledgerGeneration, leaseId, packetRef,
  });
  if (plan.status === 'RELEASE_NOOP') {
    return output('RECOVERY_COMPLETE',
      ['LEASE_ALREADY_RELEASED', 'RECOVERY_TRANSIENT_FETCH_FAILURE_PROVEN'], common);
  }
  if (plan.status !== 'RELEASE_READY') {
    return output(plan.status, plan.reasonCodes, {
      ...common, ledgerGeneration: plan.generation ?? context.ledgerGeneration,
    });
  }

  const active = context.ledgerState.activeLeases.find((item) => item.leaseId === leaseId);
  if (!active) return output('UNKNOWN', ['RECOVERY_ACTIVE_LEASE_UNPROVEN'], common);
  if (active.packetBodySha256 !== context.packetBodySha256) {
    return output('BLOCKED', ['RECOVERY_PACKET_DIGEST_DRIFT'], common);
  }

  return output('PLAN_READY',
    [...plan.reasonCodes, 'RECOVERY_TRANSIENT_FETCH_FAILURE_PROVEN'], {
      operation: 'release', recoveryOfRunId: evidence.recoveryOfRunId,
      ledgerGeneration: context.ledgerGeneration, leaseId,
      workflowInputs: {
        operation: 'release', expected_generation: String(context.ledgerGeneration),
        packet_ref: packetRef, lease_id: leaseId,
      },
    });
}

async function dispatchRecoveryPlan({repo, plan, client, runner = defaultRunner,
  sleepFn = sleepMs, maxPolls = 20}) {
  if (plan.status === 'RECOVERY_COMPLETE') return plan;
  if (plan.status !== 'PLAN_READY') return plan;
  const result = await dispatchPlan({repo, plan, client, runner, sleepFn, maxPolls});
  return output(result.status, result.reasonCodes, {
    recoveryOfRunId: plan.recoveryOfRunId,
    recoveryRunId: result.runId ?? null,
    runConclusion: result.runConclusion ?? null,
    observedGeneration: result.observedGeneration ?? plan.ledgerGeneration,
    leaseId: plan.leaseId,
  });
}

function buildDispatchArgs(repo, workflowInputs) {
  if (!validateRepo(repo)) throw new Error('REPOSITORY_INVALID');
  const args = ['workflow', 'run', WORKFLOW, '--repo', repo, '--ref', 'main'];
  for (const [key, value] of Object.entries(workflowInputs)) args.push('-f', `${key}=${value}`);
  return args;
}

function defaultRunner(args) {
  const result = childProcess.spawnSync('gh', args, {encoding: 'utf8', shell: false});
  return {code: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || ''};
}

function createGhIssueReadClient({repo, runner = defaultRunner} = {}) {
  if (!validateRepo(repo)) throw new Error('REPOSITORY_INVALID');
  return {
    repo,
    async api(endpoint, options = {}) {
      if (!ISSUE_ENDPOINT_RE.test(endpoint || '')) throw new Error('GH_API_ISSUE_ENDPOINT_INVALID');
      if (options && Object.keys(options).length > 0) throw new Error('GH_API_ISSUE_OPTIONS_INVALID');
      const result = runner(['api', `repos/${repo}${endpoint}`, '--method', 'GET',
        '--header', 'Accept: application/vnd.github+json']);
      if (result.code !== 0) throw new Error('GH_API_ISSUE_READ_FAILED');
      try {
        const value = JSON.parse(result.stdout || '');
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('invalid');
        }
        return value;
      } catch {
        throw new Error('GH_API_ISSUE_RESPONSE_INVALID');
      }
    },
  };
}

function createOperatorGitHubClient({repo, env = process.env, runner = defaultRunner, fetchImpl} = {}) {
  const token = env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token) return createGhIssueReadClient({repo, runner});
  const options = {token, repo, userAgent: 'mcl-coordination-operator-v1'};
  if (fetchImpl) options.fetchImpl = fetchImpl;
  return createGitHubClient(options);
}
function parseRuns(text) {
  try {
    const runs = JSON.parse(text || '[]');
    return Array.isArray(runs) ? runs : [];
  } catch {
    return [];
  }
}

function listRuns(repo, runner) {
  const result = runner(['run', 'list', '--repo', repo, '--workflow', WORKFLOW,
    '--event', 'workflow_dispatch', '--limit', '20', '--json',
    'databaseId,headSha,status,conclusion,createdAt']);
  if (result.code !== 0) return {ok: false, runs: [], reason: 'DISPATCH_RUN_LIST_FAILED'};
  return {ok: true, runs: parseRuns(result.stdout)};
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function findNewRun(beforeIds, runs) {
  return runs.filter((item) => Number.isSafeInteger(item.databaseId) && !beforeIds.has(item.databaseId));
}

function exactLogInput(log, key, expected) {
  const marker = WORKFLOW_INPUT_LOG_KEYS[key];
  if (!marker) return false;
  const wanted = String(expected ?? '');
  return String(log || '').split(/\r?\n/).some((line) => {
    const needle = marker + ':';
    const index = line.indexOf(needle);
    return index >= 0 && line.slice(index + needle.length).trim() === wanted;
  });
}

function taskLeaseResults(log) {
  const rows = [];
  for (const line of String(log || '').split(/\r?\n/)) {
    const index = line.indexOf(TASK_LEASE_RESULT_PREFIX);
    if (index < 0) continue;
    try {
      const value = JSON.parse(line.slice(index));
      if (value?.schemaVersion === 1 && value?.mode === 'MCL_TASK_LEASE') rows.push(value);
    } catch {
      // Malformed task-lease output remains unproven.
    }
  }
  return rows;
}

function resultMatchesPlan(result, plan) {
  if (!result || result.leaseId !== plan.leaseId
      || !Number.isSafeInteger(result.generation)) return false;
  if (plan.operation === 'acquire') {
    return ['ACQUIRE_UPDATED', 'ACQUIRE_NOOP'].includes(result.status);
  }
  if (plan.operation === 'release') {
    return ['RELEASE_UPDATED', 'RELEASE_NOOP'].includes(result.status);
  }
  return false;
}

function inspectDispatchCandidate({repo, candidate, plan, runner}) {
  const runId = normalizeRunId(candidate?.databaseId);
  if (!runId) return {state: 'NO_MATCH'};
  const viewed = runner(['run', 'view', String(runId), '--repo', repo, '--json',
    'databaseId,headSha,status,conclusion,event,url,workflowName']);
  let info = null;
  try { info = JSON.parse(viewed.stdout || '{}'); } catch { info = null; }
  if (viewed.code !== 0 || !info) return {state: 'UNKNOWN', runId};
  if (info.databaseId !== runId || info.event !== 'workflow_dispatch'
      || info.workflowName !== WORKFLOW_NAME) return {state: 'NO_MATCH', runId};
  if (info.status !== 'completed') return {state: 'PENDING', runId};

  const logged = runner(['run', 'view', String(runId), '--repo', repo, '--log']);
  if (logged.code !== 0) return {state: 'UNKNOWN', runId};
  const log = logged.stdout || '';
  if (Buffer.byteLength(log, 'utf8') > MAX_DISPATCH_LOG_BYTES) {
    return {state: 'UNKNOWN', runId, reasonCode: 'DISPATCH_RUN_LOG_TOO_LARGE'};
  }
  for (const [key, value] of Object.entries(plan.workflowInputs || {})) {
    if (!exactLogInput(log, key, value)) return {state: 'NO_MATCH', runId};
  }
  if (info.conclusion !== 'success') {
    return {state: 'MATCH_FAILURE', runId, runConclusion: info.conclusion || null};
  }

  const matchingResults = taskLeaseResults(log).filter((value) => resultMatchesPlan(value, plan));
  if (matchingResults.length !== 1) {
    return {state: 'UNKNOWN', runId,
      reasonCode: matchingResults.length > 1
        ? 'DISPATCH_RUN_RESULT_AMBIGUOUS' : 'DISPATCH_RUN_RESULT_UNPROVEN'};
  }
  return {
    state: 'MATCH_SUCCESS', runId, runConclusion: 'success',
    observedGeneration: matchingResults[0].generation,
  };
}

async function dispatchPlan({repo, plan, client, runner = defaultRunner, sleepFn = sleepMs, maxPolls = 20}) {
  if (plan.status !== 'PLAN_READY') return plan;
  const before = listRuns(repo, runner);
  if (!before.ok) return output('UNKNOWN', [before.reason]);
  const beforeIds = new Set(before.runs.map((item) => item.databaseId));
  const dispatched = runner(buildDispatchArgs(repo, plan.workflowInputs));
  if (dispatched.code !== 0) return output('DISPATCH_FAILED', ['WORKFLOW_DISPATCH_COMMAND_FAILED']);

  let selected = null;
  let selectedFailure = null;
  let sawFresh = false;
  let sawUnknown = false;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const listed = listRuns(repo, runner);
    if (!listed.ok) return output('UNKNOWN', [listed.reason]);
    const fresh = findNewRun(beforeIds, listed.runs);
    if (fresh.length) sawFresh = true;
    const inspected = fresh.map((candidate) =>
      inspectDispatchCandidate({repo, candidate, plan, runner}));
    const exact = inspected.filter((item) =>
      ['MATCH_SUCCESS', 'MATCH_FAILURE'].includes(item.state));
    if (exact.length > 1) return output('UNKNOWN', ['DISPATCH_RUN_AMBIGUOUS']);
    const pending = inspected.some((item) => item.state === 'PENDING');
    const unknown = inspected.some((item) => item.state === 'UNKNOWN');
    sawUnknown = sawUnknown || unknown;
    if (exact.length === 1 && !pending && !unknown) {
      if (exact[0].state === 'MATCH_SUCCESS') selected = exact[0];
      else selectedFailure = exact[0];
      break;
    }
    sleepFn(1000);
  }
  if (selectedFailure) {
    return output('DISPATCH_FAILED', ['WORKFLOW_FAILED_NO_AUTO_RETRY'], {
      runId: selectedFailure.runId,
      runConclusion: selectedFailure.runConclusion,
      observedGeneration: null,
      leaseId: plan.leaseId,
    });
  }
  if (!selected) {
    return output('UNKNOWN', [
      sawFresh || sawUnknown ? 'DISPATCH_RUN_ATTRIBUTION_UNRESOLVED' : 'DISPATCH_RUN_NOT_FOUND',
    ]);
  }

  const runId = selected.runId;
  runner(['run', 'watch', String(runId), '--repo', repo, '--exit-status']);
  const final = inspectDispatchCandidate({
    repo, candidate: {databaseId: runId}, plan, runner,
  });
  if (final.state === 'MATCH_FAILURE') {
    return output('DISPATCH_FAILED', ['WORKFLOW_FAILED_NO_AUTO_RETRY'], {
      runId, runConclusion: final.runConclusion, observedGeneration: null, leaseId: plan.leaseId,
    });
  }
  if (final.state !== 'MATCH_SUCCESS') {
    return output('UNKNOWN', [final.reasonCode || 'DISPATCH_RUN_IDENTITY_UNPROVEN'], {runId});
  }

  const current = await readContext({client, packetRef: plan.workflowInputs.packet_ref});
  if (current.status !== 'READY') {
    return output('UNKNOWN', ['DISPATCH_LEDGER_READBACK_UNPROVEN'], {
      runId, runConclusion: 'success', observedGeneration: final.observedGeneration,
      leaseId: plan.leaseId,
    });
  }
  const common = {runId, runConclusion: 'success',
    observedGeneration: final.observedGeneration, leaseId: plan.leaseId};
  const active = current.ledgerState?.activeLeases || [];
  if (plan.operation === 'acquire' && !active.some((item) => item.leaseId === plan.leaseId)) {
    return output('UNKNOWN', ['ACQUIRE_READBACK_MISSING'], common);
  }
  if (plan.operation === 'release' && active.some((item) => item.leaseId === plan.leaseId)) {
    return output('UNKNOWN', ['RELEASE_READBACK_STILL_ACTIVE'], common);
  }
  return output('DISPATCH_COMPLETE', [], common);
}
function parseCli(argv) {
  const command = argv[0];
  const values = {};
  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dispatch') { values.dispatch = true; continue; }
    if (!token.startsWith('--') || i + 1 >= argv.length) throw new Error('ARGUMENT_INVALID');
    values[token.slice(2)] = argv[++i];
  }
  return {command, values};
}

function parseScopesJson(raw) {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function readJsonInput(filePath) {
  if (!filePath) throw new Error('INPUT_REQUIRED');
  const text = filePath === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(filePath, 'utf8');
  return JSON.parse(text);
}

function publicContext(value) {
  const {ledgerState, ...bounded} = value;
  return bounded;
}
function readManifestInput(filePath) {
  if (!filePath) throw new Error('MANIFEST_REQUIRED');
  const text = filePath === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(filePath, 'utf8');
  try {
    const parsed = JSON.parse(text);
    const verified = handoff.verifyManifestObject(parsed);
    if (!verified.ok) throw new Error(verified.errors.join(','));
    return verified.value;
  } catch (jsonError) {
    const envelope = handoff.parseManifest(text);
    if (envelope.status !== 'VALID') throw new Error(envelope.reasonCodes.join(','));
    return envelope.value;
  }
}

async function runCli(argv = process.argv.slice(2), env = process.env, options = {}) {
  const {command, values} = parseCli(argv);
  if (command === 'handoff-manifest') {
    const manifest = handoff.buildManifest(readJsonInput(values.input));
    return {text: `${handoff.renderManifest(manifest)}\n`, code: 0};
  }
  if (command === 'handoff-receipt') {
    const manifest = readManifestInput(values.manifest);
    const receipt = handoff.buildCompletionReceipt(manifest, readJsonInput(values.input));
    return {text: `${handoff.renderCompletionReceipt(receipt)}\n`, code: 0};
  }
  const repo = values.repo;
  if (!validateRepo(repo)) throw new Error('REPOSITORY_INVALID');
  const runner = options.runner || defaultRunner;
  const client = createOperatorGitHubClient({repo, env, runner, fetchImpl: options.fetchImpl});
  const packetRef = values.packet;
  if (command === 'inspect') {
    const scopes = parseScopesJson(values['scopes-json']);
    if (scopes === null) return {text: `${JSON.stringify(output('BLOCKED', ['REQUEST_SCOPES_INVALID']))}\n`, code: 2};
    const inspected = publicContext(await readContext({client, packetRef, scopes}));
    return {text: `${JSON.stringify(inspected)}\n`, code: inspected.status === 'READY' ? 0 : 2};
  }
  let plan;
  if (command === 'lease-acquire') {
    const scopes = parseScopesJson(values['scopes-json']);
    if (scopes === null) plan = output('BLOCKED', ['REQUEST_SCOPES_INVALID']);
    else plan = await planAcquire({
      client, packetRef, route: values.route, executor: values.executor, scopes,
      scopeDisposition: values['scope-disposition'], workspaceKind: values['workspace-kind'],
      branch: values.branch, worktree: values.worktree,
      observedBaseSha: values['observed-base-sha'] || null,
    });
  } else if (command === 'lease-release') {
    plan = await planRelease({client, packetRef, leaseId: values['lease-id']});
  } else if (command === 'lease-release-recover') {
    plan = await planReleaseRecovery({
      repo, client, runner, packetRef, leaseId: values['lease-id'],
      failedRunId: values['failed-run-id'],
    });
  } else {
    throw new Error('COMMAND_UNSUPPORTED');
  }
  const final = command === 'lease-release-recover' && values.dispatch
    ? await dispatchRecoveryPlan({repo, plan, client, runner,
      sleepFn: options.sleepFn, maxPolls: options.maxPolls})
    : values.dispatch
      ? await dispatchPlan({repo, plan, client, runner,
        sleepFn: options.sleepFn, maxPolls: options.maxPolls})
      : plan;
  const code = ['PLAN_READY', 'DISPATCH_COMPLETE', 'RECOVERY_COMPLETE'].includes(final.status) ? 0 : 2;
  return {text: `${JSON.stringify(final)}\n`, code};
}

if (require.main === module) {
  runCli().then(({text, code}) => { process.stdout.write(text); process.exitCode = code; })
    .catch((error) => {
      process.stdout.write(`${JSON.stringify(output('BLOCKED', [String(error?.message || error)]))}\n`);
      process.exitCode = 2;
    });
}

module.exports = {
  AUTHORITY,
  LEDGER_ISSUE,
  WORKFLOW,
  buildDispatchArgs,
  createGhIssueReadClient,
  createOperatorGitHubClient,
  dispatchPlan,
  dispatchRecoveryPlan,
  normalizeRequestedScopes,
  output,
  packetNumber,
  planAcquire,
  planRelease,
  planReleaseRecovery,
  publicContext,
  readFailedReleaseEvidence,
  readContext,
  runCli,
  validateRepo,
};
