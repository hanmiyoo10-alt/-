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
const SHA256_RE = /^[0-9a-f]{64}$/;
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

async function dispatchPlan({repo, plan, client, runner = defaultRunner, sleepFn = sleepMs, maxPolls = 20}) {
  if (plan.status !== 'PLAN_READY') return plan;
  const before = listRuns(repo, runner);
  if (!before.ok) return output('UNKNOWN', [before.reason]);
  const beforeIds = new Set(before.runs.map((item) => item.databaseId));
  const dispatched = runner(buildDispatchArgs(repo, plan.workflowInputs));
  if (dispatched.code !== 0) return output('DISPATCH_FAILED', ['WORKFLOW_DISPATCH_COMMAND_FAILED']);
  let candidate = null;
  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    const listed = listRuns(repo, runner);
    if (!listed.ok) return output('UNKNOWN', [listed.reason]);
    const fresh = findNewRun(beforeIds, listed.runs);
    if (fresh.length > 1) return output('UNKNOWN', ['DISPATCH_RUN_AMBIGUOUS']);
    if (fresh.length === 1) { candidate = fresh[0]; break; }
    sleepFn(1000);
  }
  if (!candidate) return output('UNKNOWN', ['DISPATCH_RUN_NOT_FOUND']);
  const runId = candidate.databaseId;
  const watched = runner(['run', 'watch', String(runId), '--repo', repo, '--exit-status']);
  const viewed = runner(['run', 'view', String(runId), '--repo', repo, '--json',
    'databaseId,headSha,status,conclusion,event,url']);
  let runInfo = null;
  try { runInfo = JSON.parse(viewed.stdout || '{}'); } catch { runInfo = null; }
  if (viewed.code !== 0 || !runInfo) return output('UNKNOWN', ['DISPATCH_RUN_READ_FAILED'], {runId});
  const current = await readContext({client, packetRef: plan.workflowInputs.packet_ref});
  const common = {runId, runConclusion: runInfo.conclusion || null,
    observedGeneration: current.ledgerGeneration, leaseId: plan.leaseId};
  if (watched.code !== 0 || runInfo.conclusion !== 'success') {
    return output('DISPATCH_FAILED', ['WORKFLOW_FAILED_NO_AUTO_RETRY'], common);
  }
  const logged = runner(['run', 'view', String(runId), '--repo', repo, '--log']);
  if (logged.code !== 0 || !logged.stdout.includes(plan.leaseId)) {
    return output('UNKNOWN', ['DISPATCH_RUN_IDENTITY_UNPROVEN'], common);
  }
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

async function runCli(argv = process.argv.slice(2), env = process.env) {
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
  const client = createGitHubClient({token: env.GH_TOKEN || env.GITHUB_TOKEN, repo,
    userAgent: 'mcl-coordination-operator-v1'});
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
  } else {
    throw new Error('COMMAND_UNSUPPORTED');
  }
  const final = values.dispatch ? await dispatchPlan({repo, plan, client}) : plan;
  const code = ['PLAN_READY', 'DISPATCH_COMPLETE'].includes(final.status) ? 0 : 2;
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
  dispatchPlan,
  normalizeRequestedScopes,
  output,
  packetNumber,
  planAcquire,
  planRelease,
  publicContext,
  readContext,
  runCli,
  validateRepo,
};
