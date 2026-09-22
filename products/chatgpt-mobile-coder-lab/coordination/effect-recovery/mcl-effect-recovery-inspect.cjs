#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const REPO_OWNER = 'hanmiyoo10-alt';
const OPS_ISSUE = 485;
const LEDGER_ISSUE = 2352;
const MAX_COMMENT_PAGES = 5;
const PAGE_SIZE = 100;
const PACKET_RE = /^#([1-9][0-9]*)$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHELL_COMMS = new Set(['sh', 'bash', 'dash', 'zsh', 'ksh']);

const packetProjection = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const scopeOverlap = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs'));
const lease = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const handoff = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const holder = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const operator = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs'));
const recovery = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/effect-recovery/effect-recovery.cjs'));

class InspectError extends Error {
  constructor(reasonCodes) {
    super(reasonCodes[0] || 'INSPECT_FAILED');
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function unique(values) {
  return [...new Set(values)].sort();
}

function commandResult(command, args, {cwd = ROOT, input = null, env = process.env} = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    input,
    env,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function runGit(args, cwd = ROOT, runner = commandResult) {
  return runner('git', args, {cwd});
}

function runGh(args, runner = commandResult) {
  return runner('gh', args, {cwd: ROOT});
}

function jsonFrom(result, reasonCode) {
  if (!result || result.code !== 0) throw new InspectError([reasonCode]);
  try {
    const value = JSON.parse(result.stdout || '');
    if (value === null || typeof value !== 'object') throw new Error('not object');
    return value;
  } catch {
    throw new InspectError([reasonCode]);
  }
}

function ghApiJson(endpoint, {fields = [], runner = commandResult} = {}) {
  const args = ['api', endpoint, '--method', 'GET', '--header', 'Accept: application/vnd.github+json'];
  for (const [key, value] of fields) args.push('-f', key + '=' + value);
  return jsonFrom(runGh(args, runner), 'GITHUB_READ_FAILED');
}

function readIssue(number, runner = commandResult) {
  const issue = ghApiJson('repos/' + REPO + '/issues/' + number, {runner});
  if (!issue || issue.pull_request) throw new InspectError(['ISSUE_READ_INVALID']);
  return issue;
}

function readIssueComments(number, runner = commandResult) {
  const rows = [];
  for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
    const result = ghApiJson('repos/' + REPO + '/issues/' + number + '/comments', {
      runner,
      fields: [['per_page', String(PAGE_SIZE)], ['page', String(page)]],
    });
    if (!Array.isArray(result)) throw new InspectError(['COMMENTS_READ_INVALID']);
    rows.push(...result);
    if (result.length < PAGE_SIZE) return {complete: true, rows};
  }
  return {complete: false, rows};
}

function readPullsForBranch(branch, runner = commandResult) {
  const rows = [];
  for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
    const result = ghApiJson('repos/' + REPO + '/pulls', {
      runner,
      fields: [
        ['state', 'all'],
        ['head', REPO_OWNER + ':' + branch],
        ['per_page', String(PAGE_SIZE)],
        ['page', String(page)],
      ],
    });
    if (!Array.isArray(result)) throw new InspectError(['PR_READ_INVALID']);
    rows.push(...result);
    if (result.length < PAGE_SIZE) return {complete: true, rows};
  }
  return {complete: false, rows};
}

function readDirectMain(runner = commandResult) {
  const result = runGit(['ls-remote', 'origin', 'refs/heads/main'], ROOT, runner);
  if (result.code !== 0) throw new InspectError(['DIRECT_MAIN_READ_FAILED']);
  const rows = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1) throw new InspectError(['DIRECT_MAIN_IDENTITY_UNKNOWN']);
  const sha = rows[0].split(/\s+/)[0];
  if (!SHA40_RE.test(sha || '')) throw new InspectError(['DIRECT_MAIN_IDENTITY_UNKNOWN']);
  return sha;
}

function opsHealthy(body, mainSha) {
  const text = String(body || '');
  return text.includes('- STATE: `CLEAR`')
    && text.includes('- MAIN: `' + mainSha + '` / Required PASS')
    && text.includes('- UNKNOWN: NONE');
}

function exactArray(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function parsePacket(number, issue) {
  const packetRef = '#' + number;
  const body = typeof issue?.body === 'string' ? issue.body : '';
  const projection = packetProjection.classifyPacketProjection(body);
  const scope = scopeOverlap.extractPacketScopes(body);
  const reasons = [];
  if (issue?.state !== 'open') reasons.push('PACKET_NOT_OPEN');
  if (projection.disposition === 'CONFLICT') reasons.push('PACKET_PROJECTION_CONFLICT');
  else if (projection.disposition !== 'PASS') reasons.push('PACKET_PROJECTION_UNKNOWN');
  if (projection.lifecycle !== 'IN_PROGRESS') reasons.push('PACKET_LIFECYCLE_NOT_IN_PROGRESS');
  if (projection.interactionStage !== 'IMPLEMENTATION_PR') reasons.push('PACKET_STAGE_NOT_IMPLEMENTATION_PR');
  if (!scope.ok || scope.conflict) reasons.push('PACKET_SCOPE_UNRESOLVED');
  const scopes = scope.ok && !scope.conflict
    ? unique((scope.scopes || []).map((item) => item.normalized))
    : [];
  return {
    packetRef,
    body,
    digest: lease.digest(body),
    scopes,
    pathScopes: scopes.filter((item) => item.startsWith('path:')),
    exact: reasons.length === 0,
    reasons,
  };
}

function parseLedgerIssue(issue) {
  const parsed = lease.parseLedger(issue?.body || '');
  if (!parsed.ok) return {state: null, status: 'UNKNOWN', reasons: parsed.reasonCodes};
  return {state: parsed.state, status: 'EXACT', reasons: []};
}

function activeLeaseForPacket(state, packet) {
  if (!state) return {state: 'UNKNOWN', lease: null, reasons: ['LEDGER_UNRESOLVED']};
  const rows = state.activeLeases.filter((item) => item.packetRef === packet.packetRef);
  if (rows.length === 0) return {state: 'UNKNOWN', lease: null, reasons: ['ACTIVE_LEASE_MISSING']};
  if (rows.length !== 1) return {state: 'CONFLICT', lease: null, reasons: ['ACTIVE_LEASE_DUPLICATE']};
  const item = rows[0];
  const reasons = [];
  if (item.route !== 'S' || item.executor !== 'S') reasons.push('LEASE_ROUTE_EXECUTOR_UNSUPPORTED');
  if (item.workspace?.kind !== 'repository') reasons.push('LEASE_REPOSITORY_WORKSPACE_REQUIRED');
  if (item.packetBodySha256 !== packet.digest) reasons.push('LEASE_PACKET_BODY_DRIFT');
  if (!exactArray(item.scopes || [], packet.scopes)) reasons.push('LEASE_SCOPE_CONFLICT');
  const expectedBranch = 'server/mcl-packet-' + packet.packetRef.slice(1);
  const expectedWorktree = '/root/nyang-worktrees/mcl-packet-' + packet.packetRef.slice(1);
  if (item.workspace?.branch !== expectedBranch || item.workspace?.worktree !== expectedWorktree) {
    reasons.push('LEASE_WORKSPACE_IDENTITY_CONFLICT');
  }
  if (!SHA40_RE.test(item.observedBaseSha || '')) reasons.push('LEASE_BASE_UNKNOWN');
  return {
    state: reasons.length ? 'CONFLICT' : 'ACTIVE_EXACT',
    lease: item,
    reasons,
  };
}

function readHolderRecord(activeLease) {
  if (!activeLease?.workspace) {
    return {state: 'UNKNOWN', record: null, holderPath: null, reasons: ['HOLDER_WORKSPACE_UNKNOWN']};
  }
  const workspace = holder.inspectWorkspace({workspace: activeLease.workspace});
  if (!workspace.ok) {
    return {state: 'UNKNOWN', record: null, holderPath: null, reasons: workspace.reasonCodes};
  }
  const read = holder.readHolder(workspace.holderPath);
  if (read.missing) {
    return {state: 'ABSENT_EXACT', record: null, holderPath: workspace.holderPath, reasons: []};
  }
  if (!read.ok) {
    return {state: 'CONFLICT', record: null, holderPath: workspace.holderPath, reasons: read.reasonCodes};
  }
  if (read.value.leaseId !== activeLease.leaseId) {
    return {state: 'CONFLICT', record: read.value, holderPath: workspace.holderPath, reasons: ['HOLDER_LEASE_CONFLICT']};
  }
  return {state: 'PRESENT_UNBOUND', record: read.value, holderPath: workspace.holderPath, reasons: []};
}

function manifestCandidates(commentRead, packet, activeLease, holderRead) {
  if (!commentRead.complete) return {state: 'UNKNOWN', manifest: null, reasons: ['COMMENTS_DISCOVERY_PARTIAL']};
  const matching = [];
  for (const row of commentRead.rows) {
    const body = typeof row?.body === 'string' ? row.body : '';
    if (!body.includes(handoff.MANIFEST_START)) continue;
    const parsed = handoff.parseManifest(body);
    if (parsed.status !== 'VALID') continue;
    const manifest = parsed.value;
    if (manifest.packetRef !== packet.packetRef) continue;
    if (manifest.packetBodySha256 !== packet.digest) continue;
    if (manifest.leaseRequirement !== 'REQUIRED') continue;
    if (manifest.leaseEvidence?.leaseId !== activeLease.leaseId) continue;
    if (manifest.route !== activeLease.route || manifest.executor !== activeLease.executor) continue;
    if (!exactArray(manifest.scopes || [], activeLease.scopes || [])) continue;
    if (JSON.stringify(manifest.workspace) !== JSON.stringify(activeLease.workspace)) continue;
    if (manifest.observedBaseSha !== activeLease.observedBaseSha) continue;
    if (holderRead.record && manifest.manifestId !== holderRead.record.manifestId) continue;
    matching.push(manifest);
  }
  if (matching.length === 0) return {state: 'UNKNOWN', manifest: null, reasons: ['MANIFEST_MATCH_MISSING']};
  if (matching.length !== 1) return {state: 'CONFLICT', manifest: null, reasons: ['MANIFEST_MATCH_DUPLICATE']};
  return {state: 'EXACT', manifest: matching[0], reasons: []};
}

function finalizeHolderState(holderRead, manifestRead, activeLease) {
  if (holderRead.state === 'ABSENT_EXACT') return {state: 'ABSENT_EXACT', reasons: []};
  if (holderRead.state === 'CONFLICT') return {state: 'CONFLICT', reasons: holderRead.reasons};
  if (holderRead.state !== 'PRESENT_UNBOUND' || !holderRead.record) {
    return {state: 'UNKNOWN', reasons: holderRead.reasons.length ? holderRead.reasons : ['HOLDER_UNRESOLVED']};
  }
  if (manifestRead.state === 'CONFLICT') return {state: 'CONFLICT', reasons: manifestRead.reasons};
  if (manifestRead.state !== 'EXACT' || !manifestRead.manifest) {
    return {state: 'UNKNOWN', reasons: ['HOLDER_MANIFEST_UNRESOLVED']};
  }
  if (holderRead.record.leaseId !== activeLease.leaseId
      || holderRead.record.manifestId !== manifestRead.manifest.manifestId) {
    return {state: 'CONFLICT', reasons: ['HOLDER_IDENTITY_CONFLICT']};
  }
  return {state: 'PRESENT_EXACT', reasons: []};
}

function nulPaths(text) {
  return String(text || '').split('\0').filter(Boolean);
}

function pathInScopes(repoPath, pathScopes) {
  const requested = scopeOverlap.normalizeScope('path:' + repoPath);
  if (!requested.ok) return false;
  return pathScopes.some((raw) => {
    const scope = scopeOverlap.normalizeScope(raw);
    return scope.ok && scopeOverlap.scopesOverlap(scope, requested);
  });
}

function workspaceObservation(activeLease, manifest, packet, runner = commandResult) {
  if (!activeLease?.workspace || !manifest) {
    return {
      workspaceState: 'UNKNOWN', dirtyScopeState: 'UNKNOWN', gitIdentityState: 'UNKNOWN',
      reasons: ['WORKSPACE_EVIDENCE_UNAVAILABLE'],
    };
  }
  const inspected = holder.inspectWorkspace(manifest);
  if (!inspected.ok) {
    return {
      workspaceState: 'UNKNOWN', dirtyScopeState: 'UNKNOWN', gitIdentityState: 'CONFLICT',
      reasons: inspected.reasonCodes,
    };
  }
  const worktree = activeLease.workspace.worktree;
  const branch = runGit(['branch', '--show-current'], worktree, runner);
  const head = runGit(['rev-parse', 'HEAD'], worktree, runner);
  const unmerged = runGit(['diff', '--name-only', '--diff-filter=U', '-z'], worktree, runner);
  const unstaged = runGit(['diff', '--name-only', '-z'], worktree, runner);
  const staged = runGit(['diff', '--cached', '--name-only', '-z'], worktree, runner);
  const untracked = runGit(['ls-files', '--others', '--exclude-standard', '-z'], worktree, runner);
  const reads = [branch, head, unmerged, unstaged, staged, untracked];
  if (reads.some((item) => item.code !== 0)) {
    return {
      workspaceState: 'UNKNOWN', dirtyScopeState: 'UNKNOWN', gitIdentityState: 'UNKNOWN',
      reasons: ['WORKSPACE_GIT_READ_FAILED'],
    };
  }
  if (nulPaths(unmerged.stdout).length) {
    return {
      workspaceState: 'CONFLICT', dirtyScopeState: 'CONFLICT', gitIdentityState: 'CONFLICT',
      reasons: ['WORKSPACE_UNMERGED_CONFLICT'],
    };
  }
  const gitExact = branch.stdout.trim() === activeLease.workspace.branch
    && head.stdout.trim() === activeLease.observedBaseSha;
  const paths = unique([
    ...nulPaths(unstaged.stdout),
    ...nulPaths(staged.stdout),
    ...nulPaths(untracked.stdout),
  ]);
  if (paths.length === 0) {
    return {
      workspaceState: 'CLEAN',
      dirtyScopeState: 'NOT_APPLICABLE',
      gitIdentityState: gitExact ? 'EXACT' : 'CONFLICT',
      reasons: gitExact ? [] : ['LOCAL_GIT_IDENTITY_CONFLICT'],
    };
  }
  const scopeExact = paths.every((item) => pathInScopes(item, packet.pathScopes));
  return {
    workspaceState: 'DIRTY_PRESERVED',
    dirtyScopeState: scopeExact ? 'EXACT' : 'CONFLICT',
    gitIdentityState: gitExact ? 'EXACT' : 'CONFLICT',
    reasons: [
      ...(scopeExact ? [] : ['DIRTY_SCOPE_CONFLICT']),
      ...(gitExact ? [] : ['LOCAL_GIT_IDENTITY_CONFLICT']),
    ],
  };
}

function remoteBranchObservation(activeLease, runner = commandResult) {
  if (!activeLease?.workspace?.branch || !SHA40_RE.test(activeLease.observedBaseSha || '')) {
    return {state: 'UNKNOWN', sha: null, reasons: ['REMOTE_BRANCH_INPUT_UNKNOWN']};
  }
  const result = runGit(
    ['ls-remote', 'origin', 'refs/heads/' + activeLease.workspace.branch],
    activeLease.workspace.worktree,
    runner,
  );
  if (result.code !== 0) return {state: 'UNKNOWN', sha: null, reasons: ['REMOTE_BRANCH_READ_FAILED']};
  const rows = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length === 0) return {state: 'MISSING', sha: null, reasons: []};
  if (rows.length !== 1) return {state: 'CONFLICT', sha: null, reasons: ['REMOTE_BRANCH_IDENTITY_CONFLICT']};
  const sha = rows[0].split(/\s+/)[0];
  if (!SHA40_RE.test(sha || '')) return {state: 'UNKNOWN', sha: null, reasons: ['REMOTE_BRANCH_SHA_UNKNOWN']};
  return {
    state: sha === activeLease.observedBaseSha ? 'UNCHANGED_BASE' : 'ADVANCED',
    sha,
    reasons: [],
  };
}

function prObservation(read, activeLease, remote) {
  if (!read || !Array.isArray(read.rows)) {
    return {state: 'UNKNOWN', locator: null, reasons: ['PR_ROWS_INVALID']};
  }
  if (read.complete !== true) {
    return {state: 'UNKNOWN', locator: null, reasons: ['PR_DISCOVERY_PARTIAL']};
  }
  const rows = read.rows;
  if (rows.length === 0) return {state: 'ABSENT', locator: null, reasons: []};
  if (rows.length !== 1) return {state: 'CONFLICT', locator: null, reasons: ['PR_BRANCH_AMBIGUOUS']};
  const pr = rows[0];
  const locator = Number.isSafeInteger(pr.number) ? 'pr:#' + pr.number : null;
  const exactRefs = pr?.head?.ref === activeLease.workspace.branch && pr?.base?.ref === 'main';
  if (!exactRefs) return {state: 'CONFLICT', locator, reasons: ['PR_REF_CONFLICT']};
  if (remote.sha && pr?.head?.sha !== remote.sha) {
    return {state: 'CONFLICT', locator, reasons: ['PR_HEAD_CONFLICT']};
  }
  if (pr.state === 'open' && !pr.merged_at) return {state: 'OPEN_EXACT', locator, reasons: []};
  if (pr.merged_at) return {state: 'MERGED_EXACT', locator, reasons: []};
  return {state: 'CONFLICT', locator, reasons: ['PR_CLOSED_UNMERGED']};
}

function releaseEligibilityObservation(plan) {
  if (!plan || typeof plan !== 'object') return {state: 'UNKNOWN', reasons: ['RELEASE_PLAN_UNKNOWN']};
  if (plan.status === 'PLAN_READY' && plan.operation === 'release') return {state: 'PROVEN', reasons: []};
  if (plan.status === 'BLOCKED' || plan.status === 'CONFLICT') {
    return {state: 'BLOCKED', reasons: plan.reasonCodes || ['RELEASE_PLAN_BLOCKED']};
  }
  return {state: 'UNKNOWN', reasons: plan.reasonCodes || ['RELEASE_PLAN_UNKNOWN']};
}

function readProcRecord(procRoot, pid) {
  const statText = fs.readFileSync(path.join(procRoot, String(pid), 'stat'), 'utf8');
  const end = statText.lastIndexOf(')');
  if (end < 0) throw new Error('PROC_STAT_INVALID');
  const fields = statText.slice(end + 2).trim().split(/\s+/);
  const ppid = Number(fields[1]);
  if (!Number.isSafeInteger(ppid) || ppid < 0) throw new Error('PROC_PPID_INVALID');
  const comm = fs.readFileSync(path.join(procRoot, String(pid), 'comm'), 'utf8').trim();
  const cmdline = fs.readFileSync(path.join(procRoot, String(pid), 'cmdline'))
    .toString('utf8').replace(/\0/g, ' ').trim();
  return {pid, ppid, comm, cmdline};
}

function isCommandAgent(record) {
  const marker = 'desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js';
  if (!record.cmdline.includes(marker)) return false;
  const tokens = record.cmdline.split(/\s+/).filter(Boolean);
  return tokens[tokens.length - 1] !== 'remote';
}

function sessionStateFromSnapshot(snapshot) {
  if (!snapshot || snapshot.topologyResolved !== true || snapshot.currentRootShell !== true) {
    return {state: 'UNKNOWN', reason: 'SESSION_TOPOLOGY_UNRESOLVED'};
  }
  if (snapshot.otherShellCount > 0) {
    return {state: 'UNKNOWN', reason: 'OTHER_RDC_COMMAND_SESSION_PRESENT'};
  }
  if (snapshot.unexpectedChildCount > 0) {
    return {state: 'UNKNOWN', reason: 'RDC_AGENT_CHILD_TOPOLOGY_AMBIGUOUS'};
  }
  return {state: 'ABSENT', reason: 'SOLE_RDC_COMMAND_SESSION'};
}

function scanLocalSession({procRoot = '/proc', selfPid = process.pid} = {}) {
  try {
    const chain = [];
    let pid = selfPid;
    for (let index = 0; index < 16 && pid > 1; index += 1) {
      const record = readProcRecord(procRoot, pid);
      chain.push(record);
      if (isCommandAgent(record)) break;
      pid = record.ppid;
    }
    const agentIndex = chain.findIndex(isCommandAgent);
    if (agentIndex <= 0) return sessionStateFromSnapshot({topologyResolved: false});
    const agent = chain[agentIndex];
    const currentRoot = chain[agentIndex - 1];
    const currentRootShell = currentRoot.ppid === agent.pid && SHELL_COMMS.has(currentRoot.comm);
    if (!currentRootShell) return sessionStateFromSnapshot({topologyResolved: false});

    let otherShellCount = 0;
    let unexpectedChildCount = 0;
    for (const name of fs.readdirSync(procRoot)) {
      if (!/^[0-9]+$/.test(name)) continue;
      const childPid = Number(name);
      let child;
      try {
        child = readProcRecord(procRoot, childPid);
      } catch (error) {
        if (error && (error.code === 'ENOENT' || error.code === 'ESRCH')) continue;
        return sessionStateFromSnapshot({topologyResolved: false});
      }
      if (child.ppid !== agent.pid || child.pid === currentRoot.pid) continue;
      if (SHELL_COMMS.has(child.comm)) {
        otherShellCount += 1;
        continue;
      }
      const benignProbe = child.comm.startsWith('python')
        && /python(?:3)?\s+--version\s*$/.test(child.cmdline);
      if (!benignProbe) unexpectedChildCount += 1;
    }
    return sessionStateFromSnapshot({
      topologyResolved: true,
      currentRootShell: true,
      otherShellCount,
      unexpectedChildCount,
    });
  } catch {
    return sessionStateFromSnapshot({topologyResolved: false});
  }
}

function evidenceLocators(packet, activeLease, manifestRead, prRead) {
  const number = packet.packetRef.slice(1);
  return {
    packet: 'issue:' + packet.packetRef,
    lease: 'issue:#2352',
    manifest: manifestRead.manifest
      ? 'receipt:mcl-task-manifest:' + manifestRead.manifest.manifestId
      : 'receipt:mcl-task-manifest:unresolved-' + number,
    holder: 'receipt:mcl-workspace-holder:' + number,
    session: 'receipt:mcl-rdc-session-absence:' + number,
    workspace: 'receipt:mcl-recovery-workspace:' + number,
    dirtyScope: 'receipt:mcl-recovery-dirty-scope:' + number,
    gitIdentity: activeLease && SHA40_RE.test(activeLease.observedBaseSha || '')
      ? 'commit:' + activeLease.observedBaseSha
      : 'receipt:mcl-recovery-git:unresolved-' + number,
    remoteBranch: 'receipt:mcl-recovery-remote-branch:' + number,
    pr: prRead.locator || 'receipt:mcl-recovery-pr-state:' + number,
    releaseEligibility: 'receipt:mcl-d013-release-plan:' + number,
  };
}

function buildRecoveryEvidence(observation) {
  const packetState = observation.currentBarrierExact && observation.packet.exact
    ? 'EXACT'
    : observation.currentBarrierConflict || observation.packet.reasons.some((item) => item.includes('DRIFT'))
      ? 'DRIFTED'
      : 'UNKNOWN';
  return {
    schemaVersion: 1,
    mode: 'EFFECT_RECOVERY_EVIDENCE',
    subject: 'issue:' + observation.packet.packetRef,
    packetState,
    leaseState: observation.leaseRead.state,
    manifestState: observation.manifestRead.state,
    holderState: observation.holderState.state,
    sessionState: observation.sessionRead.state,
    workspaceState: observation.workspaceRead.workspaceState,
    dirtyScopeState: observation.workspaceRead.dirtyScopeState,
    gitIdentityState: observation.workspaceRead.gitIdentityState,
    remoteBranchState: observation.remoteRead.state,
    prState: observation.prRead.state,
    releaseEligibility: observation.releaseRead.state,
    locators: evidenceLocators(
      observation.packet,
      observation.leaseRead.lease,
      observation.manifestRead,
      observation.prRead,
    ),
  };
}

function sanitizedReport(observation, evidence, decision) {
  return {
    schemaVersion: 1,
    mode: 'MCL_EFFECT_RECOVERY_INSPECT_REPORT',
    packetRef: observation.packet.packetRef,
    mainSha: observation.mainSha,
    evidence: {
      packetState: evidence.packetState,
      leaseState: evidence.leaseState,
      manifestState: evidence.manifestState,
      holderState: evidence.holderState,
      sessionState: evidence.sessionState,
      workspaceState: evidence.workspaceState,
      dirtyScopeState: evidence.dirtyScopeState,
      gitIdentityState: evidence.gitIdentityState,
      remoteBranchState: evidence.remoteBranchState,
      prState: evidence.prState,
      releaseEligibility: evidence.releaseEligibility,
    },
    decision: {
      recoveryDisposition: decision.recoveryDisposition,
      result: decision.result,
      attentionDisposition: decision.attentionDisposition,
      reasonCode: decision.reasonCode,
      nextLegalAction: decision.nextLegalAction,
    },
    reasonCodes: unique(observation.reasonCodes),
  };
}

function artifactBase(observation, runner = commandResult) {
  const worktree = observation.leaseRead.lease?.workspace?.worktree;
  if (worktree) {
    const result = runGit(['rev-parse', '--absolute-git-dir'], worktree, runner);
    if (result.code === 0 && path.isAbsolute(result.stdout.trim())) {
      return path.join(result.stdout.trim(), 'effect-recovery-evidence');
    }
  }
  return '/tmp/mcl-effect-recovery-evidence';
}

function writeJsonArtifact(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true, mode: 0o700});
  const text = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(filePath, text, {encoding: 'utf8', mode: 0o600});
  return 'local-artifact:' + filePath + '#sha256=' + sha256(text);
}

async function collectLiveObservation(packetNumber, {runner = commandResult, procRoot = '/proc'} = {}) {
  const reasonCodes = [];
  const mainBefore = readDirectMain(runner);
  const ops = readIssue(OPS_ISSUE, runner);
  const packetIssue = readIssue(packetNumber, runner);
  const packet = parsePacket(packetNumber, packetIssue);
  if (!packet.exact) reasonCodes.push(...packet.reasons);

  const ledgerIssue = readIssue(LEDGER_ISSUE, runner);
  const ledgerRead = parseLedgerIssue(ledgerIssue);
  if (ledgerRead.status !== 'EXACT') reasonCodes.push(...ledgerRead.reasons);
  const leaseRead = activeLeaseForPacket(ledgerRead.state, packet);
  reasonCodes.push(...leaseRead.reasons);

  let holderRead = {state: 'UNKNOWN', record: null, holderPath: null, reasons: ['ACTIVE_LEASE_UNRESOLVED']};
  let manifestRead = {state: 'UNKNOWN', manifest: null, reasons: ['ACTIVE_LEASE_UNRESOLVED']};
  let holderState = {state: 'UNKNOWN', reasons: ['ACTIVE_LEASE_UNRESOLVED']};
  let workspaceRead = {
    workspaceState: 'UNKNOWN', dirtyScopeState: 'UNKNOWN', gitIdentityState: 'UNKNOWN',
    reasons: ['ACTIVE_LEASE_UNRESOLVED'],
  };
  let remoteRead = {state: 'UNKNOWN', sha: null, reasons: ['ACTIVE_LEASE_UNRESOLVED']};
  let prRead = {state: 'UNKNOWN', locator: null, reasons: ['ACTIVE_LEASE_UNRESOLVED']};
  let releaseRead = {state: 'UNKNOWN', reasons: ['ACTIVE_LEASE_UNRESOLVED']};

  if (leaseRead.lease) {
    holderRead = readHolderRecord(leaseRead.lease);
    reasonCodes.push(...holderRead.reasons);
    const comments = readIssueComments(packetNumber, runner);
    manifestRead = manifestCandidates(comments, packet, leaseRead.lease, holderRead);
    reasonCodes.push(...manifestRead.reasons);
    holderState = finalizeHolderState(holderRead, manifestRead, leaseRead.lease);
    reasonCodes.push(...holderState.reasons);
    workspaceRead = workspaceObservation(
      leaseRead.lease,
      manifestRead.manifest,
      packet,
      runner,
    );
    reasonCodes.push(...workspaceRead.reasons);
    remoteRead = remoteBranchObservation(leaseRead.lease, runner);
    reasonCodes.push(...remoteRead.reasons);
    let pulls;
    try {
      pulls = readPullsForBranch(leaseRead.lease.workspace.branch, runner);
      prRead = prObservation(pulls, leaseRead.lease, remoteRead);
    } catch (error) {
      prRead = {state: 'UNKNOWN', locator: null, reasons: error.reasonCodes || ['PR_READ_FAILED']};
    }
    reasonCodes.push(...prRead.reasons);

    try {
      const client = operator.createGhIssueReadClient({
        repo: REPO,
        runner: (args) => runGh(args, runner),
      });
      const plan = await operator.planRelease({
        client,
        packetRef: packet.packetRef,
        leaseId: leaseRead.lease.leaseId,
      });
      releaseRead = releaseEligibilityObservation(plan);
    } catch {
      releaseRead = {state: 'UNKNOWN', reasons: ['RELEASE_PLAN_READ_FAILED']};
    }
    reasonCodes.push(...releaseRead.reasons);
  }

  const sessionRead = scanLocalSession({procRoot, selfPid: process.pid});
  if (sessionRead.reason !== 'SOLE_RDC_COMMAND_SESSION') reasonCodes.push(sessionRead.reason);

  const mainAfter = readDirectMain(runner);
  const currentBarrierExact = mainBefore === mainAfter && opsHealthy(ops.body, mainBefore);
  const currentBarrierConflict = mainBefore !== mainAfter;
  if (mainBefore !== mainAfter) reasonCodes.push('DIRECT_MAIN_DRIFT');
  if (!opsHealthy(ops.body, mainBefore)) reasonCodes.push('OPS_CURRENTNESS_UNKNOWN');

  return {
    packet,
    mainSha: mainBefore,
    currentBarrierExact,
    currentBarrierConflict,
    ledgerRead,
    leaseRead,
    manifestRead,
    holderState,
    workspaceRead,
    remoteRead,
    prRead,
    releaseRead,
    sessionRead,
    reasonCodes,
  };
}


function fallbackObservation(packetNumber, reasonCodes) {
  const packetRef = '#' + packetNumber;
  return {
    packet: {
      packetRef,
      body: '',
      digest: lease.digest(''),
      scopes: [],
      pathScopes: [],
      exact: false,
      reasons: ['PACKET_AUTHORITY_UNRESOLVED'],
    },
    mainSha: 'UNKNOWN',
    currentBarrierExact: false,
    currentBarrierConflict: false,
    ledgerRead: {status: 'UNKNOWN', state: null, reasons: ['LEDGER_UNRESOLVED']},
    leaseRead: {state: 'UNKNOWN', lease: null, reasons: ['LEASE_AUTHORITY_UNRESOLVED']},
    manifestRead: {state: 'UNKNOWN', manifest: null, reasons: ['MANIFEST_AUTHORITY_UNRESOLVED']},
    holderState: {state: 'UNKNOWN', reasons: ['HOLDER_AUTHORITY_UNRESOLVED']},
    workspaceRead: {
      workspaceState: 'UNKNOWN',
      dirtyScopeState: 'UNKNOWN',
      gitIdentityState: 'UNKNOWN',
      reasons: ['WORKSPACE_EVIDENCE_UNRESOLVED'],
    },
    remoteRead: {state: 'UNKNOWN', sha: null, reasons: ['REMOTE_BRANCH_STATE_UNRESOLVED']},
    prRead: {state: 'UNKNOWN', locator: null, reasons: ['PR_STATE_UNRESOLVED']},
    releaseRead: {state: 'UNKNOWN', reasons: ['D013_RELEASE_ELIGIBILITY_UNRESOLVED']},
    sessionRead: {state: 'UNKNOWN', reason: 'SESSION_AUTHORITY_UNRESOLVED'},
    reasonCodes: unique(['COLLECTOR_READ_FAILED', ...(reasonCodes || [])]),
  };
}

async function inspectPacket(packetNumber, {
  collectObservation = collectLiveObservation,
  runner = commandResult,
  artifactWriter = null,
  procRoot = '/proc',
} = {}) {
  let observation;
  try {
    observation = await collectObservation(packetNumber, {runner, procRoot});
  } catch (error) {
    observation = fallbackObservation(
      packetNumber,
      error instanceof InspectError ? error.reasonCodes : ['COLLECTOR_INTERNAL_ERROR'],
    );
  }
  const evidence = buildRecoveryEvidence(observation);
  const built = recovery.buildRecoveryReceipt(evidence);
  const report = sanitizedReport(observation, evidence, built.decision);
  const base = artifactBase(observation, runner);
  const prefix = 'packet-' + packetNumber + '.inspect';
  const writer = artifactWriter || {
    writeReport(value) {
      return writeJsonArtifact(path.join(base, prefix + '.report.json'), value);
    },
    writeReceipt(value) {
      return writeJsonArtifact(path.join(base, prefix + '.receipt.json'), value);
    },
  };
  const reportLocator = writer.writeReport(report);
  const receiptLocator = writer.writeReceipt(built.receipt);
  const projected = recovery.projectRecoveryEvidence(evidence, {receiptLocator, reportLocator});
  if (projected.receipt.receiptDigest !== built.receipt.receiptDigest) {
    throw new InspectError(['RECOVERY_RECEIPT_NONDETERMINISTIC']);
  }
  return {
    observation,
    evidence,
    decision: projected.decision,
    receipt: projected.receipt,
    view: projected.view,
  };
}

function parseArgs(argv = process.argv.slice(2)) {
  const args = [...argv];
  if (args.shift() !== 'inspect') throw new InspectError(['COMMAND_UNSUPPORTED']);
  const values = {};
  while (args.length) {
    const key = args.shift();
    const value = args.shift();
    if (!key || !key.startsWith('--') || value === undefined) {
      throw new InspectError(['ARGUMENT_INVALID']);
    }
    const name = key.slice(2);
    if (!['packet', 'format'].includes(name) || Object.hasOwn(values, name)) {
      throw new InspectError(['ARGUMENT_UNSUPPORTED']);
    }
    values[name] = value;
  }
  if (!PACKET_RE.test(values.packet || '')) throw new InspectError(['PACKET_REF_INVALID']);
  if (!['agent-view', 'receipt'].includes(values.format)) throw new InspectError(['FORMAT_UNSUPPORTED']);
  return {packetNumber: Number(values.packet.slice(1)), format: values.format};
}

function exitCodeFor(result) {
  if (result.view?.validity !== 'VALID') return 2;
  if (result.view.result === 'PASS' && result.view.attentionDisposition === 'COMPLETE') return 0;
  if (['CONFLICT', 'BLOCKED', 'FAIL'].includes(result.view.result)) return 2;
  return 3;
}

async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const result = await inspectPacket(args.packetNumber, options);
  const outward = args.format === 'receipt' ? result.receipt : result.view;
  process.stdout.write(JSON.stringify(outward, null, 2) + '\n');
  return exitCodeFor(result);
}

if (require.main === module) {
  runCli().then((code) => {
    process.exitCode = code;
  }).catch((error) => {
    const reasons = error instanceof InspectError ? error.reasonCodes : ['INSPECT_INTERNAL_ERROR'];
    process.stderr.write(JSON.stringify({status: 'UNKNOWN', reasonCodes: reasons}) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  InspectError,
  activeLeaseForPacket,
  buildRecoveryEvidence,
  collectLiveObservation,
  fallbackObservation,
  finalizeHolderState,
  inspectPacket,
  manifestCandidates,
  parseArgs,
  parsePacket,
  prObservation,
  releaseEligibilityObservation,
  remoteBranchObservation,
  runCli,
  sanitizedReport,
  scanLocalSession,
  sessionStateFromSnapshot,
  workspaceObservation,
};
