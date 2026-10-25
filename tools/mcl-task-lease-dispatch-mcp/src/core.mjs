[Reading 549 lines from start (total: 549 lines, 0 remaining)]

import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const OPERATOR_PATH =
  'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs';
export const operator = require(join(ROOT, OPERATOR_PATH));

export const REPOSITORY = 'hanmiyoo10-alt/-';
export const API = 'https://api.github.com/repos/hanmiyoo10-alt/-';
export const WORKFLOW = 'mcl-task-lease.yml';
export const WORKFLOW_NAME = 'MCL Task Lease';
export const WORKFLOW_PATH = '.github/workflows/mcl-task-lease.yml';
export const TOKEN_ENV = 'GITHUB_D013_DISPATCH_TOKEN';
export const MAX_LOG_BYTES = 64 * 1024;
export const MAX_RUNS = 20;
export const DEFAULT_MAX_POLLS = 20;
export const DEFAULT_POLL_MS = 1000;
const PACKET_RE = /^#[1-9][0-9]*$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ROUTES = Object.freeze([
  'S', 'M', 'L', 'S_TERMUX', 'M_PRIVATE_LAB', 'M_VM_LAB', 'S_PRIVATE_LOCAL'
]);
const WORKSPACE_KINDS = Object.freeze([
  'repository', 'landing_metadata', 'landing_residue_cleanup',
  'landing_branch_repair', 'not_applicable'
]);
const INPUT_LOG_KEYS = Object.freeze({
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
  lease_id: 'MCL_LEASE_ID'
});
const RESULT_PREFIX = '{"schemaVersion":1,"mode":"MCL_TASK_LEASE"';

export class D013TransportError extends Error {
  constructor(reasonCode) {
    super(reasonCode);
    this.reasonCode = reasonCode;
  }
}

function boundedString(value, maxBytes) {
  return typeof value === 'string' &&
    Buffer.byteLength(value, 'utf8') <= maxBytes &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function exactKeys(value, allowed) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).every((key) => allowed.has(key));
}

function blocked(reasonCodes, extras = {}) {
  return operator.output('BLOCKED', reasonCodes, extras);
}

function capability(reasonCode) {
  return operator.output('BLOCKED_CAPABILITY', [reasonCode]);
}

export function validateAcquireArgs(value) {
  const allowed = new Set([
    'packet_ref', 'expected_generation', 'route', 'executor', 'scopes',
    'scope_disposition', 'workspace_kind', 'branch', 'worktree', 'observed_base_sha'
  ]);
  if (!exactKeys(value, allowed)) return ['TOOL_ARGUMENTS_INVALID'];
  const reasons = [];
  if (!PACKET_RE.test(value.packet_ref || '')) reasons.push('REQUEST_PACKET_REF_INVALID');
  if (!Number.isSafeInteger(value.expected_generation) || value.expected_generation < 0) {
    reasons.push('REQUEST_GENERATION_INVALID');
  }
  if (!ROUTES.includes(value.route)) reasons.push('REQUEST_ROUTE_INVALID');
  if (!ROUTES.includes(value.executor)) reasons.push('REQUEST_EXECUTOR_INVALID');
  if (value.scope_disposition !== 'DISJOINT') reasons.push('REQUEST_SCOPE_DISCOVERY_NOT_DISJOINT');
  if (!Array.isArray(value.scopes) || value.scopes.length < 1 || value.scopes.length > 16 ||
      value.scopes.some((item) => !boundedString(item, 512))) {
    reasons.push('REQUEST_SCOPES_INVALID');
  }
  if (!WORKSPACE_KINDS.includes(value.workspace_kind)) reasons.push('WORKSPACE_KIND_INVALID');
  if (!boundedString(value.branch, 300) || !boundedString(value.worktree, 1024)) {
    reasons.push('WORKSPACE_FIELDS_INVALID');
  }
  if (value.observed_base_sha !== undefined &&
      !SHA40_RE.test(value.observed_base_sha || '')) {
    reasons.push('REQUEST_BASE_SHA_INVALID');
  }
  return [...new Set(reasons)].sort();
}

export function validateReleaseArgs(value) {
  const allowed = new Set(['packet_ref', 'expected_generation', 'lease_id']);
  if (!exactKeys(value, allowed)) return ['TOOL_ARGUMENTS_INVALID'];
  const reasons = [];
  if (!PACKET_RE.test(value.packet_ref || '')) reasons.push('REQUEST_PACKET_REF_INVALID');
  if (!Number.isSafeInteger(value.expected_generation) || value.expected_generation < 0) {
    reasons.push('REQUEST_GENERATION_INVALID');
  }
  if (!SHA256_RE.test(value.lease_id || '')) reasons.push('REQUEST_LEASE_ID_INVALID');
  return [...new Set(reasons)].sort();
}

function githubHeaders(token, json = true) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'User-Agent': 'mcl-task-lease-dispatch-mcp/0.1',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

export function createGitHubRest({
  token,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000
} = {}) {
  const dedicated = typeof token === 'string' ? token.trim() : '';

  async function request(path, { method = 'GET', body = null, text = false } = {}) {
    if (!dedicated) throw new D013TransportError('DEDICATED_D013_CREDENTIAL_UNAVAILABLE');
    let response;
    try {
      response = await fetchImpl(`${API}${path}`, {
        method,
        headers: githubHeaders(dedicated, body !== null),
        ...(body === null ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow'
      });
    } catch {
      throw new D013TransportError('GITHUB_NETWORK_ERROR');
    }
    if (!response?.ok) {
      throw new D013TransportError(
        `GITHUB_HTTP_${Number.isInteger(response?.status) ? response.status : 'UNKNOWN'}`
      );
    }
    if (response.status === 204) return null;
    if (text) {
      let raw;
      try { raw = await response.text(); }
      catch { throw new D013TransportError('GITHUB_RESPONSE_READ_ERROR'); }
      if (Buffer.byteLength(raw, 'utf8') > MAX_LOG_BYTES) {
        throw new D013TransportError('DISPATCH_RUN_LOG_TOO_LARGE');
      }
      return raw;
    }
    try { return await response.json(); }
    catch { throw new D013TransportError('GITHUB_JSON_INVALID'); }
  }

  return {
    hasCredential: Boolean(dedicated),
    async readIssue(number) {
      if (!Number.isSafeInteger(number) || number <= 0) {
        throw new D013TransportError('ISSUE_NUMBER_INVALID');
      }
      return request(`/issues/${number}`);
    },
    async listWorkflowRuns() {
      const payload = await request(
        `/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=${MAX_RUNS}`
      );
      if (!payload || !Array.isArray(payload.workflow_runs) ||
          payload.workflow_runs.length > MAX_RUNS) {
        throw new D013TransportError('DISPATCH_RUN_LIST_INVALID');
      }
      return payload.workflow_runs;
    },
    async dispatchWorkflow(inputs) {
      return request(`/actions/workflows/${WORKFLOW}/dispatches`, {
        method: 'POST',
        body: { ref: 'main', inputs }
      });
    },
    async readRun(runId) {
      return request(`/actions/runs/${runId}`);
    },
    async readRunJobs(runId) {
      const payload = await request(`/actions/runs/${runId}/jobs?per_page=100`);
      if (!payload || !Array.isArray(payload.jobs) || payload.jobs.length > 100) {
        throw new D013TransportError('DISPATCH_RUN_JOBS_INVALID');
      }
      return payload.jobs;
    },
    async readJobLog(jobId) {
      return request(`/actions/jobs/${jobId}/logs`, { text: true });
    }
  };
}

export function createOperatorClient(github) {
  return {
    repo: REPOSITORY,
    async api(endpoint, options = {}) {
      if (options && Object.keys(options).length) {
        throw new D013TransportError('ISSUE_READ_OPTIONS_FORBIDDEN');
      }
      const match = /^\/issues\/([1-9][0-9]*)$/.exec(endpoint || '');
      if (!match) throw new D013TransportError('ISSUE_READ_ENDPOINT_FORBIDDEN');
      return github.readIssue(Number(match[1]));
    }
  };
}

function exactLogInput(log, key, expected) {
  const marker = INPUT_LOG_KEYS[key];
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
    const index = line.indexOf(RESULT_PREFIX);
    if (index < 0) continue;
    try {
      const value = JSON.parse(line.slice(index));
      if (value?.schemaVersion === 1 && value?.mode === 'MCL_TASK_LEASE') rows.push(value);
    } catch {
      // Malformed workflow output remains unproven.
    }
  }
  return rows;
}

function resultMatchesPlan(value, plan) {
  if (!value || value.leaseId !== plan.leaseId ||
      !Number.isSafeInteger(value.generation)) return false;
  if (plan.operation === 'acquire') {
    return ['ACQUIRE_UPDATED', 'ACQUIRE_NOOP'].includes(value.status);
  }
  if (plan.operation === 'release') {
    return ['RELEASE_UPDATED', 'RELEASE_NOOP'].includes(value.status);
  }
  return false;
}

export async function inspectRunCandidate(github, run, plan) {
  const runId = Number(run?.id);
  if (!Number.isSafeInteger(runId) || runId <= 0) return { state: 'NO_MATCH' };

  let info;
  try { info = await github.readRun(runId); }
  catch (error) {
    return { state: 'UNKNOWN', runId, reasonCode: error?.reasonCode || 'DISPATCH_RUN_READ_FAILED' };
  }
  if (!info || info.id !== runId || info.event !== 'workflow_dispatch' ||
      info.name !== WORKFLOW_NAME || info.path !== WORKFLOW_PATH ||
      info.head_branch !== 'main') {
    return { state: 'NO_MATCH', runId };
  }
  if (info.status !== 'completed') return { state: 'PENDING', runId };

  let jobs;
  try { jobs = await github.readRunJobs(runId); }
  catch (error) {
    return { state: 'UNKNOWN', runId, reasonCode: error?.reasonCode || 'DISPATCH_RUN_JOBS_READ_FAILED' };
  }
  const matches = jobs.filter((job) => job?.name === 'mutate-ledger' &&
    Number.isSafeInteger(job?.id) && job.id > 0);
  if (matches.length !== 1) {
    return { state: 'UNKNOWN', runId, reasonCode: 'DISPATCH_RUN_JOB_IDENTITY_UNPROVEN' };
  }

  let log;
  try { log = await github.readJobLog(matches[0].id); }
  catch (error) {
    return { state: 'UNKNOWN', runId, reasonCode: error?.reasonCode || 'DISPATCH_RUN_LOG_READ_FAILED' };
  }
  if (Buffer.byteLength(log, 'utf8') > MAX_LOG_BYTES) {
    return { state: 'UNKNOWN', runId, reasonCode: 'DISPATCH_RUN_LOG_TOO_LARGE' };
  }
  for (const [key, value] of Object.entries(plan.workflowInputs || {})) {
    if (!exactLogInput(log, key, value)) return { state: 'NO_MATCH', runId };
  }
  if (info.conclusion !== 'success') {
    return { state: 'MATCH_FAILURE', runId, runConclusion: info.conclusion || null };
  }
  const results = taskLeaseResults(log).filter((value) => resultMatchesPlan(value, plan));
  if (results.length !== 1) {
    return {
      state: 'UNKNOWN',
      runId,
      reasonCode: results.length > 1
        ? 'DISPATCH_RUN_RESULT_AMBIGUOUS'
        : 'DISPATCH_RUN_RESULT_UNPROVEN'
    };
  }
  return {
    state: 'MATCH_SUCCESS',
    runId,
    runConclusion: 'success',
    observedGeneration: results[0].generation
  };
}

export function reconcileNoRunReadback(plan, current) {
  if (current?.status !== 'READY' || !Number.isSafeInteger(plan?.ledgerGeneration) ||
      !SHA256_RE.test(plan?.leaseId || '')) return null;
  const expectedGeneration = plan.ledgerGeneration + 1;
  if (current.ledgerGeneration !== expectedGeneration) return null;
  const active = current.ledgerState?.activeLeases || [];
  if (plan.operation === 'acquire') {
    const matches = active.filter((item) => item.leaseId === plan.leaseId);
    if (matches.length !== 1) return null;
    const exact = matches[0];
    if (exact.packetRef !== plan.workflowInputs?.packet_ref) return null;
    if (plan.workflowInputs?.packet_body_sha256 &&
        exact.packetBodySha256 !== plan.workflowInputs.packet_body_sha256) return null;
  } else if (plan.operation === 'release') {
    if (active.some((item) => item.leaseId === plan.leaseId)) return null;
    const last = current.ledgerState?.lastRelease;
    if (!last || last.leaseId !== plan.leaseId ||
        last.releasedAtGeneration !== expectedGeneration) return null;
  } else {
    return null;
  }
  return operator.output('DISPATCH_READBACK_COMPLETE', [], {
    runId: null,
    runConclusion: null,
    observedGeneration: expectedGeneration,
    leaseId: plan.leaseId,
    evidenceRef:
      `receipt:mcl-task-lease-readback:${plan.operation}:${plan.leaseId}:generation:${expectedGeneration}`
  });
}

async function sleep(ms) {
  await new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

export async function dispatchRestPlan({
  github,
  plan,
  client,
  sleepFn = sleep,
  maxPolls = DEFAULT_MAX_POLLS
}) {
  if (plan.status !== 'PLAN_READY') return plan;

  let before;
  try { before = await github.listWorkflowRuns(); }
  catch (error) {
    return operator.output('UNKNOWN', [error?.reasonCode || 'DISPATCH_RUN_LIST_FAILED']);
  }
  const beforeIds = new Set(before.map((item) => item?.id).filter(Number.isSafeInteger));

  try { await github.dispatchWorkflow(plan.workflowInputs); }
  catch (error) {
    return operator.output('DISPATCH_FAILED', [
      error?.reasonCode || 'WORKFLOW_DISPATCH_REQUEST_FAILED'
    ]);
  }

  let selected = null;
  let selectedFailure = null;
  let sawFresh = false;
  let sawUnknown = false;

  for (let attempt = 0; attempt < maxPolls; attempt += 1) {
    let listed;
    try { listed = await github.listWorkflowRuns(); }
    catch (error) {
      return operator.output('UNKNOWN', [error?.reasonCode || 'DISPATCH_RUN_LIST_FAILED']);
    }
    const fresh = listed.filter((item) => Number.isSafeInteger(item?.id) && !beforeIds.has(item.id));
    if (fresh.length) sawFresh = true;
    const inspected = await Promise.all(
      fresh.map((candidate) => inspectRunCandidate(github, candidate, plan))
    );
    const exact = inspected.filter((item) =>
      ['MATCH_SUCCESS', 'MATCH_FAILURE'].includes(item.state));
    if (exact.length > 1) return operator.output('UNKNOWN', ['DISPATCH_RUN_AMBIGUOUS']);
    const pending = inspected.some((item) => item.state === 'PENDING');
    const unknown = inspected.some((item) => item.state === 'UNKNOWN');
    sawUnknown = sawUnknown || unknown;
    if (exact.length === 1 && !pending && !unknown) {
      if (exact[0].state === 'MATCH_SUCCESS') selected = exact[0];
      else selectedFailure = exact[0];
      break;
    }
    if (attempt + 1 < maxPolls) await sleepFn(DEFAULT_POLL_MS);
  }

  if (selectedFailure) {
    return operator.output('DISPATCH_FAILED', ['WORKFLOW_FAILED_NO_AUTO_RETRY'], {
      runId: selectedFailure.runId,
      runConclusion: selectedFailure.runConclusion,
      observedGeneration: null,
      leaseId: plan.leaseId
    });
  }

  if (!selected) {
    if (!sawFresh && !sawUnknown) {
      const current = await operator.readContext({
        client,
        packetRef: plan.workflowInputs.packet_ref
      });
      const reconciled = reconcileNoRunReadback(plan, current);
      if (reconciled) return reconciled;
    }
    return operator.output('UNKNOWN', [
      sawFresh || sawUnknown
        ? 'DISPATCH_RUN_ATTRIBUTION_UNRESOLVED'
        : 'DISPATCH_RUN_NOT_FOUND'
    ]);
  }

  const final = await inspectRunCandidate(github, { id: selected.runId }, plan);
  if (final.state === 'MATCH_FAILURE') {
    return operator.output('DISPATCH_FAILED', ['WORKFLOW_FAILED_NO_AUTO_RETRY'], {
      runId: final.runId,
      runConclusion: final.runConclusion,
      observedGeneration: null,
      leaseId: plan.leaseId
    });
  }
  if (final.state !== 'MATCH_SUCCESS') {
    return operator.output('UNKNOWN', [
      final.reasonCode || 'DISPATCH_RUN_IDENTITY_UNPROVEN'
    ], { runId: selected.runId });
  }

  const current = await operator.readContext({
    client,
    packetRef: plan.workflowInputs.packet_ref
  });
  if (current.status !== 'READY') {
    return operator.output('UNKNOWN', ['DISPATCH_LEDGER_READBACK_UNPROVEN'], {
      runId: selected.runId,
      runConclusion: 'success',
      observedGeneration: final.observedGeneration,
      leaseId: plan.leaseId
    });
  }
  const common = {
    runId: selected.runId,
    runConclusion: 'success',
    observedGeneration: final.observedGeneration,
    leaseId: plan.leaseId
  };
  const active = current.ledgerState?.activeLeases || [];
  if (plan.operation === 'acquire' &&
      !active.some((item) => item.leaseId === plan.leaseId)) {
    return operator.output('UNKNOWN', ['ACQUIRE_READBACK_MISSING'], common);
  }
  if (plan.operation === 'release' &&
      active.some((item) => item.leaseId === plan.leaseId)) {
    return operator.output('UNKNOWN', ['RELEASE_READBACK_STILL_ACTIVE'], common);
  }
  return operator.output('DISPATCH_COMPLETE', [], common);
}

function generationMatches(plan, expected) {
  return Number.isSafeInteger(plan?.ledgerGeneration) &&
    plan.ledgerGeneration === expected;
}

export function createD013Service({
  token = process.env[TOKEN_ENV],
  fetchImpl = globalThis.fetch,
  github = null,
  operatorImpl = operator,
  sleepFn
} = {}) {
  const transport = github || createGitHubRest({ token, fetchImpl });
  const client = createOperatorClient(transport);

  async function acquire(args) {
    const invalid = validateAcquireArgs(args);
    if (invalid.length) return blocked(invalid);
    if (!transport.hasCredential && !github) {
      return capability('DEDICATED_D013_CREDENTIAL_UNAVAILABLE');
    }
    const plan = await operatorImpl.planAcquire({
      client,
      packetRef: args.packet_ref,
      route: args.route,
      executor: args.executor,
      scopes: args.scopes,
      scopeDisposition: args.scope_disposition,
      workspaceKind: args.workspace_kind,
      branch: args.branch,
      worktree: args.worktree,
      observedBaseSha: args.observed_base_sha || null
    });
    if (plan.status !== 'PLAN_READY') return plan;
    if (!generationMatches(plan, args.expected_generation)) {
      return blocked(['STALE_EXPECTED_GENERATION'], {
        ledgerGeneration: plan.ledgerGeneration,
        leaseId: plan.leaseId || null
      });
    }
    return dispatchRestPlan({
      github: transport,
      plan,
      client,
      ...(sleepFn ? { sleepFn } : {})
    });
  }

  async function release(args) {
    const invalid = validateReleaseArgs(args);
    if (invalid.length) return blocked(invalid);
    if (!transport.hasCredential && !github) {
      return capability('DEDICATED_D013_CREDENTIAL_UNAVAILABLE');
    }
    const plan = await operatorImpl.planRelease({
      client,
      packetRef: args.packet_ref,
      leaseId: args.lease_id
    });
    if (plan.status !== 'PLAN_READY') return plan;
    if (!generationMatches(plan, args.expected_generation)) {
      return blocked(['STALE_EXPECTED_GENERATION'], {
        ledgerGeneration: plan.ledgerGeneration,
        leaseId: args.lease_id
      });
    }
    return dispatchRestPlan({
      github: transport,
      plan,
      client,
      ...(sleepFn ? { sleepFn } : {})
    });
  }

  return { acquire, release, github: transport };
}

[executed on device: L-Gram (a2beef8a-fa0b-4423-b6fc-8f017f907cef)]