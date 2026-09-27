'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { createGitHubClient } = require('../../../.github/plugin-control-plane/canonical-main/infra/github-client.cjs');
const { normalizeScope, scopesOverlap } = require('../../../.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs');
const { extractPacketLifecycle } = require('../../../.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs');

const LEDGER_MARKER = '<!-- mcl-task-lease-state:v1 -->';
const STATE_ISSUE_NUMBER = 2352;
const OWNER_PACKET_REF = '#2350';
const CONTROLLER_PATH = 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs';
const ROUTES = Object.freeze(['S_PRIVATE_LOCAL', 'M_VM_LAB', 'M_PRIVATE_LAB', 'S_TERMUX', 'M', 'S']);
const EXECUTORS = new Set(ROUTES);
const WORKSPACE_KINDS = Object.freeze(['repository', 'not_applicable', 'landing_metadata', 'landing_branch_repair']);
const LANDING_METADATA = Object.freeze({
  S: Object.freeze({branch: 'server/work', worktree: '/root/nyang-repo', scope: 'surface:mcl-landing-origin-main:S'}),
  M: Object.freeze({branch: 'mainphone/work', worktree: '/data/data/com.termux/files/home/nyang-worktrees/mainphone-work', scope: 'surface:mcl-landing-origin-main:M'}),
});
const LANDING_BRANCH_REPAIR = Object.freeze({
  S: Object.freeze({branch: 'server/work', worktree: '/root/nyang-repo', scope: 'surface:mcl-landing-branch:S'}),
  M: Object.freeze({branch: 'mainphone/work', worktree: '/data/data/com.termux/files/home/nyang-worktrees/mainphone-work', scope: 'surface:mcl-landing-branch:M'}),
});
const TERMINAL_PACKET_STATES = new Set(['DONE', 'CANCELLED', 'SUPERSEDED']);
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_REF_RE = /^#([1-9][0-9]*)$/;
const MAX_ACTIVE_LEASES = 32;
const MAX_SCOPES = 16;
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function digest(value) {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(stable(value))).digest('hex');
}

function uniq(items) {
  return [...new Set(items)];
}

function result(status, reasonCodes, extras = {}) {
  return {
    schemaVersion: 1,
    mode: 'MCL_TASK_LEASE',
    status,
    changed: Boolean(extras.changed),
    generation: Number.isSafeInteger(extras.generation) ? extras.generation : null,
    leaseId: extras.leaseId || null,
    reasonCodes: uniq(reasonCodes).sort(),
    issueMutationAuthorized: Boolean(extras.issueMutationAuthorized),
    repositoryMutationAuthorized: false,
    deviceMutationAuthorized: false,
    mergeAuthorized: false,
    releaseAuthorized: false,
    productionAuthorized: false,
    updatedBody: extras.updatedBody || null,
  };
}
function orderedLedger(state) {
  return {
    schemaVersion: state.schemaVersion,
    scope: state.scope,
    mode: state.mode,
    status: state.status,
    generation: state.generation,
    controllerPath: state.controllerPath,
    controllerCommit: state.controllerCommit,
    packetRef: state.packetRef,
    activeLeases: state.activeLeases,
    lastRelease: state.lastRelease,
  };
}

function renderLedger(state) {
  const statusText = state.status === 'INACTIVE' ? 'INACTIVE / CONTROLLER NOT MERGED' : 'ACTIVE';
  return [
    '# Mobile Coder Lab task lease ledger v1',
    '',
    `Status: \`${statusText}\``,
    '',
    LEDGER_MARKER,
    '```json',
    JSON.stringify(orderedLedger(state)),
    '```',
    '',
    'Coordination state only. This issue grants no repository, device, runtime, merge, release, or production authority. It must remain inactive until the reviewed controller is merged and explicitly activated through the bounded workflow.',
  ].join('\n');
}
function landingMetadataIdentity(executor) {
  return LANDING_METADATA[executor] || null;
}
function landingBranchRepairIdentity(executor) {
  return LANDING_BRANCH_REPAIR[executor] || null;
}
function validateWorkspace(workspace, executor) {
  if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) return ['WORKSPACE_INVALID'];
  if (!WORKSPACE_KINDS.includes(workspace.kind)) return ['WORKSPACE_KIND_INVALID'];
  if (workspace.kind === 'not_applicable') {
    return workspace.branch === 'not_applicable' && workspace.worktree === 'not_applicable'
      ? [] : ['WORKSPACE_NOT_APPLICABLE_FIELDS_INVALID'];
  }
  if (workspace.kind === 'landing_metadata') {
    const identity = landingMetadataIdentity(executor);
    if (!identity) return ['WORKSPACE_LANDING_EXECUTOR_INVALID'];
    if (workspace.branch !== identity.branch || workspace.worktree !== identity.worktree) return ['WORKSPACE_LANDING_IDENTITY_INVALID'];
    return [];
  }
  if (workspace.kind === 'landing_branch_repair') {
    const identity = landingBranchRepairIdentity(executor);
    if (!identity) return ['WORKSPACE_LANDING_BRANCH_REPAIR_EXECUTOR_INVALID'];
    if (workspace.branch !== identity.branch || workspace.worktree !== identity.worktree) return ['WORKSPACE_LANDING_BRANCH_REPAIR_IDENTITY_INVALID'];
    return [];
  }
  if (!['S', 'M'].includes(executor)) return ['WORKSPACE_REPOSITORY_EXECUTOR_INVALID'];
  if (typeof workspace.branch !== 'string' || typeof workspace.worktree !== 'string') return ['WORKSPACE_FIELDS_INVALID'];
  const prefix = executor === 'S' ? 'server/' : 'mainphone/';
  if (!workspace.branch.startsWith(prefix) || workspace.branch === `${prefix}work`) return ['WORKSPACE_BRANCH_INVALID'];
  if (!path.posix.isAbsolute(workspace.worktree) || path.posix.normalize(workspace.worktree) !== workspace.worktree) return ['WORKTREE_PATH_INVALID'];
  const landing = landingMetadataIdentity(executor);
  if (landing && workspace.worktree === landing.worktree) return ['WORKTREE_LANDING_RESERVED'];
  const root = executor === 'S' ? '/root/nyang-worktrees/' : '/data/data/com.termux/files/home/nyang-worktrees/';
  if (!workspace.worktree.startsWith(root) || workspace.worktree === root.slice(0, -1)) return ['WORKTREE_ROOT_INVALID'];
  return [];
}
function validateLandingMetadataBinding({workspace, executor, scopes, observedBaseSha}) {
  if (workspace?.kind !== 'landing_metadata') return [];
  const identity = landingMetadataIdentity(executor);
  if (!identity) return ['LANDING_METADATA_EXECUTOR_INVALID'];
  const errors = [];
  if (!Array.isArray(scopes) || scopes.length !== 1 || scopes[0] !== identity.scope) errors.push('LANDING_METADATA_SCOPE_INVALID');
  if (!SHA40_RE.test(observedBaseSha || '')) errors.push('LANDING_METADATA_BASE_SHA_REQUIRED');
  return errors;
}
function validateLandingBranchRepairBinding({workspace, route, executor, scopes, observedBaseSha}) {
  if (workspace?.kind !== 'landing_branch_repair') return [];
  const identity = landingBranchRepairIdentity(executor);
  const errors = [];
  if (!identity || route !== executor || !['S', 'M'].includes(route)) errors.push('LANDING_BRANCH_REPAIR_ROUTE_EXECUTOR_INVALID');
  if (identity && (!Array.isArray(scopes) || scopes.length !== 1 || scopes[0] !== identity.scope)) errors.push('LANDING_BRANCH_REPAIR_SCOPE_INVALID');
  if (!SHA40_RE.test(observedBaseSha || '')) errors.push('LANDING_BRANCH_REPAIR_BASE_SHA_REQUIRED');
  return errors;
}
function isGitWorkspace(workspace) {
  return workspace?.kind === 'repository' || workspace?.kind === 'landing_metadata' || workspace?.kind === 'landing_branch_repair';
}

function validateLease(lease) {
  const errors = [];
  if (!lease || typeof lease !== 'object' || Array.isArray(lease)) return ['LEASE_OBJECT_REQUIRED'];
  if (!SHA256_RE.test(lease.leaseId || '')) errors.push('LEASE_ID_INVALID');
  if (!PACKET_REF_RE.test(lease.packetRef || '')) errors.push('LEASE_PACKET_REF_INVALID');
  if (!SHA256_RE.test(lease.packetBodySha256 || '')) errors.push('LEASE_PACKET_HASH_INVALID');
  if (!ROUTES.includes(lease.route)) errors.push('LEASE_ROUTE_INVALID');
  if (!EXECUTORS.has(lease.executor)) errors.push('LEASE_EXECUTOR_INVALID');
  if (!Array.isArray(lease.scopes) || lease.scopes.length < 1 || lease.scopes.length > MAX_SCOPES) errors.push('LEASE_SCOPES_INVALID');
  if (!SHA256_RE.test(lease.scopeFingerprint || '')) errors.push('LEASE_SCOPE_FINGERPRINT_INVALID');
  if (lease.scopeDisposition !== 'DISJOINT') errors.push('LEASE_SCOPE_DISPOSITION_INVALID');
  errors.push(...validateWorkspace(lease.workspace, lease.executor));
  if (lease.observedBaseSha !== null && !SHA40_RE.test(lease.observedBaseSha || '')) errors.push('LEASE_BASE_SHA_INVALID');
  errors.push(...validateLandingMetadataBinding({workspace: lease.workspace, executor: lease.executor, scopes: lease.scopes, observedBaseSha: lease.observedBaseSha}));
  errors.push(...validateLandingBranchRepairBinding({workspace: lease.workspace, route: lease.route, executor: lease.executor, scopes: lease.scopes, observedBaseSha: lease.observedBaseSha}));
  if (!Array.isArray(lease.sourceRefs) || lease.sourceRefs.length < 1 || lease.sourceRefs.length > 8) errors.push('LEASE_SOURCE_REFS_INVALID');
  return errors;
}
function validateLedger(state) {
  const errors = [];
  if (!state || typeof state !== 'object' || Array.isArray(state)) return ['LEDGER_OBJECT_REQUIRED'];
  if (state.schemaVersion !== 1) errors.push('LEDGER_SCHEMA_INVALID');
  if (state.scope !== 'chatgpt-mobile-coder-lab') errors.push('LEDGER_SCOPE_INVALID');
  if (state.mode !== 'MCL_TASK_LEASE_LEDGER') errors.push('LEDGER_MODE_INVALID');
  if (!['INACTIVE', 'ACTIVE'].includes(state.status)) errors.push('LEDGER_STATUS_INVALID');
  if (!Number.isSafeInteger(state.generation) || state.generation < 0) errors.push('LEDGER_GENERATION_INVALID');
  if (state.controllerPath !== CONTROLLER_PATH) errors.push('LEDGER_CONTROLLER_PATH_INVALID');
  if (state.controllerCommit !== null && !SHA40_RE.test(state.controllerCommit || '')) errors.push('LEDGER_CONTROLLER_COMMIT_INVALID');
  if (state.packetRef !== OWNER_PACKET_REF) errors.push('LEDGER_PACKET_REF_INVALID');
  if (!Array.isArray(state.activeLeases) || state.activeLeases.length > MAX_ACTIVE_LEASES) errors.push('LEDGER_ACTIVE_LEASES_INVALID');
  else state.activeLeases.forEach((lease) => errors.push(...validateLease(lease)));
  if (state.lastRelease !== null) {
    if (!state.lastRelease || !SHA256_RE.test(state.lastRelease.leaseId || '') || !Number.isSafeInteger(state.lastRelease.releasedAtGeneration)) {
      errors.push('LEDGER_LAST_RELEASE_INVALID');
    }
  }
  if (state.status === 'INACTIVE' && (state.generation !== 0 || state.controllerCommit !== null || state.activeLeases.length !== 0 || state.lastRelease !== null)) {
    errors.push('LEDGER_INACTIVE_STATE_INVALID');
  }
  if (state.status === 'ACTIVE' && !SHA40_RE.test(state.controllerCommit || '')) errors.push('LEDGER_ACTIVE_CONTROLLER_INVALID');
  return uniq(errors).sort();
}
function parseLedger(body) {
  const text = typeof body === 'string' ? body.replace(/\r\n/g, '\n') : '';
  const markerCount = text.split('\n').filter((line) => line.trim() === LEDGER_MARKER).length;
  if (markerCount !== 1) return {ok: false, state: null, reasonCodes: ['LEDGER_MARKER_COUNT_INVALID']};
  const markerIndex = text.indexOf(LEDGER_MARKER);
  const tail = text.slice(markerIndex + LEDGER_MARKER.length);
  const match = /^\n```json\n([^\n]+)\n```(?:\n|$)/.exec(tail);
  if (!match) return {ok: false, state: null, reasonCodes: ['LEDGER_JSON_FENCE_INVALID']};
  let state;
  try {
    state = JSON.parse(match[1]);
  } catch {
    return {ok: false, state: null, reasonCodes: ['LEDGER_JSON_INVALID']};
  }
  const errors = validateLedger(state);
  if (errors.length) return {ok: false, state, reasonCodes: ['LEDGER_STATE_INVALID', ...errors]};
  if (renderLedger(state) !== text) return {ok: false, state, reasonCodes: ['LEDGER_BODY_DRIFT']};
  return {ok: true, state, reasonCodes: []};
}

function routeExecutorCompatible(route, executor) {
  if (!ROUTES.includes(route) || !EXECUTORS.has(executor)) return false;
  if (route === 'S') return executor === 'S' || executor === 'M';
  return route === executor;
}

function normalizeScopes(rawScopes) {
  if (!Array.isArray(rawScopes) || rawScopes.length < 1 || rawScopes.length > MAX_SCOPES) {
    return {ok: false, scopes: [], reasonCodes: ['REQUEST_SCOPES_INVALID']};
  }
  const scopes = [];
  for (const raw of rawScopes) {
    const parsed = normalizeScope(raw);
    if (!parsed.ok) return {ok: false, scopes: [], reasonCodes: ['REQUEST_SCOPE_INVALID']};
    scopes.push(parsed.normalized);
  }
  const normalized = [...new Set(scopes)].sort();
  if (normalized.length !== rawScopes.length) return {ok: false, scopes: [], reasonCodes: ['REQUEST_SCOPE_DUPLICATE']};
  return {ok: true, scopes: normalized, reasonCodes: []};
}

function normalizeExpectedGeneration(value) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function normalizeAcquireRequest(request) {
  const reasonCodes = [];
  const expectedGeneration = normalizeExpectedGeneration(request?.expectedGeneration);
  if (expectedGeneration === null) reasonCodes.push('REQUEST_GENERATION_INVALID');
  if (!PACKET_REF_RE.test(request?.packetRef || '')) reasonCodes.push('REQUEST_PACKET_REF_INVALID');
  if (!SHA256_RE.test(request?.packetBodySha256 || '')) reasonCodes.push('REQUEST_PACKET_HASH_INVALID');
  if (!ROUTES.includes(request?.route)) reasonCodes.push('REQUEST_ROUTE_INVALID');
  if (!EXECUTORS.has(request?.executor)) reasonCodes.push('REQUEST_EXECUTOR_INVALID');
  if (!routeExecutorCompatible(request?.route, request?.executor)) reasonCodes.push('REQUEST_ROUTE_EXECUTOR_CONFLICT');
  if (request?.scopeDisposition !== 'DISJOINT') reasonCodes.push('REQUEST_SCOPE_DISCOVERY_NOT_DISJOINT');
  const scopeResult = normalizeScopes(request?.scopes);
  reasonCodes.push(...scopeResult.reasonCodes);
  const workspace = {
    kind: request?.workspaceKind,
    branch: request?.branch,
    worktree: request?.worktree,
  };
  reasonCodes.push(...validateWorkspace(workspace, request?.executor));
  if (request?.route === 'S' && !['repository', 'landing_metadata', 'landing_branch_repair'].includes(workspace.kind)) reasonCodes.push('REQUEST_S_ROUTE_REPOSITORY_REQUIRED');
  const observedBaseSha = request?.observedBaseSha || null;
  if (observedBaseSha !== null && !SHA40_RE.test(observedBaseSha)) reasonCodes.push('REQUEST_BASE_SHA_INVALID');
  reasonCodes.push(...validateLandingMetadataBinding({workspace, executor: request?.executor, scopes: scopeResult.scopes, observedBaseSha}));
  reasonCodes.push(...validateLandingBranchRepairBinding({workspace, route: request?.route, executor: request?.executor, scopes: scopeResult.scopes, observedBaseSha}));
  if (reasonCodes.length) return {ok: false, reasonCodes: uniq(reasonCodes).sort()};

  const profile = {
    packetRef: request.packetRef,
    packetBodySha256: request.packetBodySha256,
    route: request.route,
    executor: request.executor,
    scopes: scopeResult.scopes,
    scopeFingerprint: digest(scopeResult.scopes),
    scopeDisposition: 'DISJOINT',
    workspace,
    observedBaseSha,
    sourceRefs: [request.packetRef, `issue:#${STATE_ISSUE_NUMBER}`],
  };
  return {
    ok: true,
    reasonCodes: [],
    expectedGeneration,
    lease: {leaseId: digest(profile), ...profile},
  };
}
function leaseScopesOverlap(leftLease, rightLease) {
  return leftLease.scopes.some((leftRaw) => {
    const left = normalizeScope(leftRaw);
    return rightLease.scopes.some((rightRaw) => scopesOverlap(left, normalizeScope(rightRaw)));
  });
}

function planActivate(state, request) {
  const expectedGeneration = normalizeExpectedGeneration(request?.expectedGeneration);
  const controllerCommit = request?.controllerCommit;
  if (expectedGeneration === null) return result('BLOCKED', ['REQUEST_GENERATION_INVALID'], {generation: state.generation});
  if (!SHA40_RE.test(controllerCommit || '')) return result('BLOCKED', ['REQUEST_CONTROLLER_COMMIT_INVALID'], {generation: state.generation});
  if (state.status === 'ACTIVE') {
    if (state.controllerCommit === controllerCommit) return result('ACTIVE_NOOP', ['LEDGER_ALREADY_ACTIVE'], {generation: state.generation});
    return result('CONFLICT', ['LEDGER_ACTIVE_CONTROLLER_CONFLICT'], {generation: state.generation});
  }
  if (expectedGeneration !== state.generation) return result('BLOCKED', ['STALE_EXPECTED_GENERATION'], {generation: state.generation});
  const next = {...state, status: 'ACTIVE', generation: state.generation + 1, controllerCommit};
  return result('ACTIVATE_READY', ['ACTIVATION_GENERATION_MATCH'], {
    changed: true, generation: next.generation, issueMutationAuthorized: true, updatedBody: renderLedger(next),
  });
}

function planAcquire(state, request) {
  if (state.status !== 'ACTIVE') return result('BLOCKED', ['LEDGER_INACTIVE'], {generation: state.generation});
  const normalized = normalizeAcquireRequest(request);
  if (!normalized.ok) return result('BLOCKED', normalized.reasonCodes, {generation: state.generation});
  const candidate = normalized.lease;
  const identical = state.activeLeases.find((lease) => lease.leaseId === candidate.leaseId);
  if (identical) {
    const retryGeneration = normalized.expectedGeneration === state.generation || normalized.expectedGeneration + 1 === state.generation;
    if (retryGeneration) return result('ACQUIRE_NOOP', ['LEASE_ALREADY_ACTIVE'], {generation: state.generation, leaseId: identical.leaseId});
  }
  if (normalized.expectedGeneration !== state.generation) return result('BLOCKED', ['STALE_EXPECTED_GENERATION'], {generation: state.generation});
  const samePacket = state.activeLeases.find((lease) => lease.packetRef === candidate.packetRef && lease.leaseId !== candidate.leaseId);
  if (samePacket) return result('CONFLICT', ['PACKET_ALREADY_LEASED_WITH_DIFFERENT_PROFILE'], {generation: state.generation, leaseId: samePacket.leaseId});
  for (const active of state.activeLeases) {
    if (leaseScopesOverlap(active, candidate)) {
      return result('CONFLICT', ['ACTIVE_LEASE_SCOPE_OVERLAP'], {generation: state.generation, leaseId: active.leaseId});
    }
    if (isGitWorkspace(active.workspace) && isGitWorkspace(candidate.workspace)) {
      if (active.workspace.worktree === candidate.workspace.worktree) {
        return result('CONFLICT', ['ACTIVE_LEASE_WORKTREE_RESERVED'], {generation: state.generation, leaseId: active.leaseId});
      }
      if (active.workspace.branch === candidate.workspace.branch) {
        return result('CONFLICT', ['ACTIVE_LEASE_BRANCH_RESERVED'], {generation: state.generation, leaseId: active.leaseId});
      }
    }
  }
  if (state.activeLeases.length >= MAX_ACTIVE_LEASES) return result('BLOCKED', ['ACTIVE_LEASE_LIMIT_REACHED'], {generation: state.generation});
  const next = {
    ...state,
    generation: state.generation + 1,
    activeLeases: [...state.activeLeases, candidate].sort((a, b) => a.leaseId.localeCompare(b.leaseId)),
  };
  return result('ACQUIRE_READY', ['LEASE_PROFILE_DISJOINT', 'LEASE_GENERATION_MATCH'], {
    changed: true,
    generation: next.generation,
    leaseId: candidate.leaseId,
    issueMutationAuthorized: true,
    updatedBody: renderLedger(next),
  });
}
function planRelease(state, request) {
  if (state.status !== 'ACTIVE') return result('BLOCKED', ['LEDGER_INACTIVE'], {generation: state.generation});
  const expectedGeneration = normalizeExpectedGeneration(request?.expectedGeneration);
  if (expectedGeneration === null) return result('BLOCKED', ['REQUEST_GENERATION_INVALID'], {generation: state.generation});
  if (!SHA256_RE.test(request?.leaseId || '')) return result('BLOCKED', ['REQUEST_LEASE_ID_INVALID'], {generation: state.generation});
  if (!PACKET_REF_RE.test(request?.packetRef || '')) return result('BLOCKED', ['REQUEST_PACKET_REF_INVALID'], {generation: state.generation});
  if (expectedGeneration !== state.generation) return result('BLOCKED', ['STALE_EXPECTED_GENERATION'], {generation: state.generation});
  const active = state.activeLeases.find((lease) => lease.leaseId === request.leaseId);
  if (!active) {
    if (state.lastRelease?.leaseId === request.leaseId) {
      return result('RELEASE_NOOP', ['LEASE_ALREADY_RELEASED'], {generation: state.generation, leaseId: request.leaseId});
    }
    return result('BLOCKED', ['ACTIVE_LEASE_NOT_FOUND'], {generation: state.generation, leaseId: request.leaseId});
  }
  if (active.packetRef !== request.packetRef) {
    return result('CONFLICT', ['LEASE_PACKET_IDENTITY_MISMATCH'], {generation: state.generation, leaseId: request.leaseId});
  }
  const nextGeneration = state.generation + 1;
  const next = {
    ...state,
    generation: nextGeneration,
    activeLeases: state.activeLeases.filter((lease) => lease.leaseId !== request.leaseId),
    lastRelease: {leaseId: request.leaseId, releasedAtGeneration: nextGeneration},
  };
  return result('RELEASE_READY', ['LEASE_IDENTITY_MATCH', 'LEASE_GENERATION_MATCH'], {
    changed: true,
    generation: next.generation,
    leaseId: request.leaseId,
    issueMutationAuthorized: true,
    updatedBody: renderLedger(next),
  });
}
async function readLedgerIssue(client) {
  const issue = await client.api(`/issues/${STATE_ISSUE_NUMBER}`);
  if (!issue || issue.pull_request || issue.state !== 'open') {
    return {ok: false, issue, state: null, body: null, reasonCodes: ['LEDGER_ISSUE_INVALID']};
  }
  const parsed = parseLedger(issue.body);
  return parsed.ok
    ? {ok: true, issue, state: parsed.state, body: issue.body, reasonCodes: []}
    : {ok: false, issue, state: parsed.state, body: issue.body, reasonCodes: parsed.reasonCodes};
}

async function verifyPacketEvidence(client, request) {
  const match = PACKET_REF_RE.exec(request?.packetRef || '');
  if (!match || !SHA256_RE.test(request?.packetBodySha256 || '')) return ['PACKET_EVIDENCE_INPUT_INVALID'];
  const issue = await client.api(`/issues/${Number(match[1])}`);
  if (!issue || issue.pull_request || issue.state !== 'open') return ['PACKET_ISSUE_NOT_OPEN'];
  const body = typeof issue.body === 'string' ? issue.body : '';
  if (digest(body) !== request.packetBodySha256) return ['PACKET_BODY_HASH_MISMATCH'];
  if (!body.split(/\r?\n/).some((line) => line.trim() === '<!-- canonical-main-work-packet:v1 -->')) return ['PACKET_MARKER_MISSING'];
  const lifecycle = extractPacketLifecycle(body);
  if (!lifecycle) return ['PACKET_LIFECYCLE_UNKNOWN'];
  if (TERMINAL_PACKET_STATES.has(lifecycle)) return ['PACKET_TERMINAL'];
  return [];
}

async function applyLedgerPlan(client, original, plan) {
  if (!plan.changed) return plan;
  const barrier = await readLedgerIssue(client);
  if (!barrier.ok) return result('BLOCKED', ['LEDGER_BARRIER_READ_FAILED', ...barrier.reasonCodes], {generation: original.state.generation});
  if (barrier.body !== original.body) return result('CONFLICT', ['LEDGER_CHANGED_BEFORE_WRITE'], {generation: barrier.state.generation});
  await client.api(`/issues/${STATE_ISSUE_NUMBER}`, {method: 'PATCH', body: {body: plan.updatedBody}});
  const readback = await readLedgerIssue(client);
  if (!readback.ok) return result('UNKNOWN', ['LEDGER_READBACK_INVALID', ...readback.reasonCodes]);
  if (readback.body !== plan.updatedBody) return result('UNKNOWN', ['LEDGER_READBACK_MISMATCH'], {generation: readback.state.generation});
  return {...plan, status: plan.status.replace('_READY', '_UPDATED'), updatedBody: null};
}
async function executeOperation({client, operation, request, actor, repositoryOwner} = {}) {
  if (!client || typeof client.api !== 'function') return result('BLOCKED', ['GITHUB_CLIENT_REQUIRED']);
  if (!actor || !repositoryOwner || actor !== repositoryOwner) return result('BLOCKED', ['REPOSITORY_OWNER_REQUIRED']);
  const current = await readLedgerIssue(client);
  if (!current.ok) return result('UNKNOWN', ['LEDGER_READ_FAILED', ...current.reasonCodes]);

  let plan;
  if (operation === 'activate') {
    const main = await client.api('/branches/main');
    const observedMain = main?.commit?.sha;
    if (!SHA40_RE.test(observedMain || '') || observedMain !== request?.controllerCommit) {
      return result('BLOCKED', ['CONTROLLER_COMMIT_NOT_CURRENT_MAIN'], {generation: current.state.generation});
    }
    plan = planActivate(current.state, request);
  } else if (operation === 'acquire') {
    const packetErrors = await verifyPacketEvidence(client, request);
    if (packetErrors.length) return result('BLOCKED', packetErrors, {generation: current.state.generation});
    plan = planAcquire(current.state, request);
  } else if (operation === 'release') {
    plan = planRelease(current.state, request);
  } else {
    return result('BLOCKED', ['OPERATION_UNSUPPORTED'], {generation: current.state.generation});
  }
  return applyLedgerPlan(client, current, plan);
}

function parseScopesJson(raw) {
  try {
    const value = JSON.parse(raw || '[]');
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}
function requestFromEnv(operation, env) {
  const expectedGeneration = env.MCL_LEASE_EXPECTED_GENERATION;
  if (operation === 'activate') {
    return {expectedGeneration, controllerCommit: env.MCL_LEASE_CONTROLLER_COMMIT};
  }
  if (operation === 'release') {
    return {expectedGeneration, leaseId: env.MCL_LEASE_ID, packetRef: env.MCL_LEASE_PACKET_REF};
  }
  return {
    expectedGeneration,
    packetRef: env.MCL_LEASE_PACKET_REF,
    packetBodySha256: env.MCL_LEASE_PACKET_BODY_SHA256,
    route: env.MCL_LEASE_ROUTE,
    executor: env.MCL_LEASE_EXECUTOR,
    scopes: parseScopesJson(env.MCL_LEASE_SCOPES_JSON),
    scopeDisposition: env.MCL_LEASE_SCOPE_DISPOSITION,
    workspaceKind: env.MCL_LEASE_WORKSPACE_KIND,
    branch: env.MCL_LEASE_BRANCH,
    worktree: env.MCL_LEASE_WORKTREE,
    observedBaseSha: env.MCL_LEASE_OBSERVED_BASE_SHA || null,
  };
}

function publicResult(output) {
  const {updatedBody, ...bounded} = output;
  return bounded;
}

async function run({env = process.env} = {}) {
  const operation = env.MCL_LEASE_OPERATION;
  const client = createGitHubClient({
    token: env.GH_TOKEN || env.GITHUB_TOKEN,
    repo: env.GITHUB_REPOSITORY,
    userAgent: 'mcl-task-lease-v1',
  });
  const output = await executeOperation({
    client,
    operation,
    request: requestFromEnv(operation, env),
    actor: env.GITHUB_ACTOR,
    repositoryOwner: env.GITHUB_REPOSITORY_OWNER,
  });
  process.stdout.write(`${JSON.stringify(publicResult(output))}\n`);
  if (/_UPDATED$|_NOOP$/.test(output.status)) return 0;
  if (output.status === 'CONFLICT') return 3;
  if (output.status === 'UNKNOWN') return 4;
  return 2;
}
if (require.main === module) {
  run().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stderr.write(`mcl-task-lease fatal: ${error?.message || error}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  CONTROLLER_PATH,
  EXECUTORS,
  LANDING_BRANCH_REPAIR,
  LANDING_METADATA,
  LEDGER_MARKER,
  MAX_ACTIVE_LEASES,
  OWNER_PACKET_REF,
  ROUTES,
  STATE_ISSUE_NUMBER,
  WORKSPACE_KINDS,
  digest,
  executeOperation,
  extractPacketLifecycle,
  landingBranchRepairIdentity,
  landingMetadataIdentity,
  normalizeAcquireRequest,
  parseLedger,
  planAcquire,
  planActivate,
  planRelease,
  publicResult,
  renderLedger,
  requestFromEnv,
  result,
  run,
  validateLandingBranchRepairBinding,
  validateLandingMetadataBinding,
  validateLedger,
  validateWorkspace,
};
