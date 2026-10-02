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
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
const SHA40_RE = /^[0-9a-f]{40}$/;
const PACKET_RE = /^#([1-9][0-9]*)$/;

const packetProjection = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const scopeOverlap = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-system/scope-overlap.cjs'));
const taskLease = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const handoff = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const holder = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const operator = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs'));
const rdcSessionEvidence = require(path.join(
  ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/mcl-rdc-session-evidence.cjs'));
const pure = require(path.join(
  ROOT, '.github/plugin-control-plane/canonical-main/work-harness/published-progress-recovery/published-progress-recovery.cjs'));

class InspectError extends Error {
  constructor(reasonCodes) {
    super(reasonCodes[0] || 'PUBLISHED_PROGRESS_INSPECT_FAILED');
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}
function unique(values) { return [...new Set(values)].sort(); }
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function commandResult(command, args, {cwd = ROOT, input = null, env = process.env} = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd, encoding: 'utf8', shell: false, input, env, maxBuffer: 8 * 1024 * 1024,
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}
function runGit(args, cwd = ROOT, runner = commandResult) { return runner('git', args, {cwd}); }
function runGh(args, runner = commandResult) { return runner('gh', args, {cwd: ROOT}); }
function jsonFrom(result, reasonCode) {
  if (!result || result.code !== 0) throw new InspectError([reasonCode]);
  try { return JSON.parse(result.stdout || ''); }
  catch { throw new InspectError([reasonCode]); }
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
function readPaged(endpoint, fields, runner = commandResult) {
  const rows = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const value = ghApiJson(endpoint, {
      runner,
      fields: [...fields, ['per_page', String(PAGE_SIZE)], ['page', String(page)]],
    });
    if (!Array.isArray(value)) throw new InspectError(['PAGED_READ_INVALID']);
    rows.push(...value);
    if (value.length < PAGE_SIZE) return {complete: true, rows};
  }
  return {complete: false, rows};
}
function readComments(number, runner = commandResult) {
  return readPaged('repos/' + REPO + '/issues/' + number + '/comments', [], runner);
}
function readOpenPulls(branch, runner = commandResult) {
  return readPaged('repos/' + REPO + '/pulls', [['state', 'open'], ['head', REPO_OWNER + ':' + branch]], runner);
}
function readPrFiles(number, runner = commandResult) {
  return readPaged('repos/' + REPO + '/pulls/' + number + '/files', [], runner);
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
  if (projection.interactionStage !== 'VALIDATION_MERGE') reasons.push('PACKET_STAGE_NOT_VALIDATION_MERGE');
  if (!scope.ok || scope.conflict) reasons.push('PACKET_SCOPE_UNRESOLVED');
  const scopes = scope.ok && !scope.conflict
    ? unique((scope.scopes || []).map((item) => item.normalized))
    : [];
  return {
    packetRef, body, digest: taskLease.digest(body), projection,
    scopes, pathScopes: scopes.filter((item) => item.startsWith('path:')),
    exact: reasons.length === 0, reasons,
  };
}
function parseLedger(issue) {
  const parsed = taskLease.parseLedger(issue?.body || '');
  if (!parsed.ok) return {status: 'UNKNOWN', state: null, reasons: parsed.reasonCodes};
  return {status: 'EXACT', state: parsed.state, reasons: []};
}
function activeLeaseForPacket(state, packet) {
  if (!state) return {state: 'UNKNOWN', lease: null, reasons: ['LEDGER_UNRESOLVED']};
  const rows = state.activeLeases.filter((item) => item.packetRef === packet.packetRef);
  if (rows.length === 0) return {state: 'UNKNOWN', lease: null, reasons: ['ACTIVE_LEASE_MISSING']};
  if (rows.length !== 1) return {state: 'CONFLICT', lease: null, reasons: ['ACTIVE_LEASE_DUPLICATE']};
  const item = rows[0];
  const reasons = [];
  if (item.route !== 'S' || !['S', 'M'].includes(item.executor)) reasons.push('LEASE_ROUTE_EXECUTOR_UNSUPPORTED');
  if (item.workspace?.kind !== 'repository') reasons.push('LEASE_REPOSITORY_WORKSPACE_REQUIRED');
  if (item.packetBodySha256 !== packet.digest) reasons.push('LEASE_PACKET_BODY_DRIFT');
  if (!exactArray(item.scopes || [], packet.scopes)) reasons.push('LEASE_SCOPE_CONFLICT');
  if (!SHA40_RE.test(item.observedBaseSha || '')) reasons.push('LEASE_BASE_UNKNOWN');
  return {state: reasons.length ? 'CONFLICT' : 'ACTIVE_EXACT', lease: item, reasons};
}
function manifestCandidates(commentRead, packet, activeLease) {
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
    if (manifest.leaseEvidence?.leaseId !== activeLease.leaseId) continue;
    if (!exactArray(manifest.scopes || [], activeLease.scopes || [])) continue;
    if (JSON.stringify(manifest.workspace) !== JSON.stringify(activeLease.workspace)) continue;
    if (manifest.observedBaseSha !== activeLease.observedBaseSha) continue;
    matching.push(manifest);
  }
  if (matching.length === 0) return {state: 'UNKNOWN', manifest: null, reasons: ['MANIFEST_MATCH_MISSING']};
  const identities = new Map(matching.map((item) => [item.manifestId + ':' + item.payloadSha256, item]));
  if (identities.size !== 1) return {state: 'CONFLICT', manifest: null, reasons: ['MANIFEST_IDENTITY_CONFLICT']};
  return {state: 'EXACT', manifest: [...identities.values()][0], reasons: []};
}
function readHolderState(activeLease, manifestRead) {
  if (!activeLease?.workspace || manifestRead.state !== 'EXACT' || !manifestRead.manifest) {
    return {state: 'UNKNOWN', reasons: ['HOLDER_EVIDENCE_UNAVAILABLE']};
  }
  const workspace = holder.inspectWorkspace(manifestRead.manifest);
  if (!workspace.ok) return {state: 'UNKNOWN', reasons: workspace.reasonCodes};
  const read = holder.readHolder(workspace.holderPath);
  if (read.missing) return {state: 'ABSENT', reasons: []};
  if (!read.ok) return {state: 'CONFLICT', reasons: read.reasonCodes};
  if (read.value.leaseId !== activeLease.leaseId || read.value.manifestId !== manifestRead.manifest.manifestId) {
    return {state: 'CONFLICT', reasons: ['HOLDER_IDENTITY_CONFLICT']};
  }
  return {state: 'PRESENT_EXACT', reasons: []};
}
function sessionStateFromReceipt(value, expectedExecutor) {
  if (!value || value.owner !== 'mcl-rdc-session-evidence' || value.executor !== expectedExecutor) {
    return {state: 'UNKNOWN', reasons: ['SESSION_OWNER_IDENTITY_UNRESOLVED']};
  }
  if (value.status === 'PASS' && value.sessionState === 'ABSENT') return {state: 'ABSENT', reasons: []};
  if (value.status === 'PASS' && value.sessionState === 'PRESENT') return {state: 'PRESENT', reasons: ['OWNER_SESSION_PRESENT']};
  return {state: 'UNKNOWN', reasons: [value.reasonCode || 'SESSION_AUTHORITY_UNRESOLVED']};
}
function releaseState(plan) {
  if (plan?.status === 'PLAN_READY' && plan.operation === 'release') return {state: 'PROVEN', reasons: []};
  if (['BLOCKED', 'CONFLICT'].includes(plan?.status)) return {state: 'BLOCKED', reasons: plan.reasonCodes || ['LEASE_RELEASE_BLOCKED']};
  return {state: 'UNKNOWN', reasons: plan?.reasonCodes || ['LEASE_RELEASE_UNKNOWN']};
}
function gitPublishedIdentity(activeLease, runner = commandResult) {
  const cwd = activeLease.workspace.worktree;
  const branch = runGit(['branch', '--show-current'], cwd, runner);
  const head = runGit(['rev-parse', 'HEAD'], cwd, runner);
  const status = runGit(['status', '--porcelain=v1'], cwd, runner);
  if ([branch, head, status].some((item) => item.code !== 0)) {
    return {workspaceState: 'UNKNOWN', publishedIdentityState: 'UNKNOWN', descendantState: 'UNKNOWN', head: null, reasons: ['WORKSPACE_GIT_READ_FAILED']};
  }
  if (status.stdout.trim()) {
    return {workspaceState: 'DIRTY', publishedIdentityState: 'UNKNOWN', descendantState: 'UNKNOWN', head: head.stdout.trim(), reasons: ['WORKSPACE_DIRTY']};
  }
  const local = head.stdout.trim();
  if (branch.stdout.trim() !== activeLease.workspace.branch || !SHA40_RE.test(local)) {
    return {workspaceState: 'CLEAN', publishedIdentityState: 'CONFLICT', descendantState: 'UNKNOWN', head: local, reasons: ['LOCAL_BRANCH_HEAD_CONFLICT']};
  }
  const remoteRead = runGit(['ls-remote', 'origin', 'refs/heads/' + activeLease.workspace.branch], cwd, runner);
  if (remoteRead.code !== 0) return {workspaceState: 'CLEAN', publishedIdentityState: 'UNKNOWN', descendantState: 'UNKNOWN', head: local, reasons: ['REMOTE_BRANCH_READ_FAILED']};
  const rows = remoteRead.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1) return {workspaceState: 'CLEAN', publishedIdentityState: rows.length ? 'CONFLICT' : 'UNKNOWN', descendantState: 'UNKNOWN', head: local, reasons: ['REMOTE_BRANCH_IDENTITY_UNRESOLVED']};
  const remote = rows[0].split(/\s+/)[0];
  if (remote !== local) return {workspaceState: 'CLEAN', publishedIdentityState: 'CONFLICT', descendantState: 'UNKNOWN', head: local, reasons: ['LOCAL_REMOTE_HEAD_CONFLICT']};
  const descendant = runGit(['merge-base', '--is-ancestor', activeLease.observedBaseSha, local], cwd, runner);
  const descendantState = descendant.code === 0 ? 'PROVEN' : descendant.code === 1 ? 'CONFLICT' : 'UNKNOWN';
  return {workspaceState: 'CLEAN', publishedIdentityState: 'EXACT', head: local, remote, descendantState, reasons: []};
}
function prIdentityObservation(read, activeLease, packet, gitRead, runner = commandResult) {
  if (!read.complete) return {prState: 'UNKNOWN', changedPathsState: 'UNKNOWN', locator: null, reasons: ['PR_DISCOVERY_PARTIAL']};
  if (read.rows.length === 0) return {prState: 'ABSENT', changedPathsState: 'UNKNOWN', locator: null, reasons: []};
  if (read.rows.length !== 1) return {prState: 'CONFLICT', changedPathsState: 'CONFLICT', locator: null, reasons: ['PR_BRANCH_AMBIGUOUS']};
  const pr = read.rows[0];
  const locator = Number.isSafeInteger(pr.number) ? 'pr:#' + pr.number : null;
  const refsExact = pr.state === 'open' && pr.draft === false
    && pr.base?.ref === 'main' && pr.head?.ref === activeLease.workspace.branch
    && pr.head?.repo?.full_name === REPO && pr.head?.sha === gitRead.head;
  if (!refsExact) return {prState: 'CONFLICT', changedPathsState: 'CONFLICT', locator, reasons: ['PR_IDENTITY_CONFLICT']};
  const files = readPrFiles(pr.number, runner);
  if (!files.complete) return {prState: 'OPEN_EXACT', changedPathsState: 'UNKNOWN', locator, reasons: ['PR_FILES_PARTIAL']};
  const changed = files.rows.map((item) => item?.filename).filter((item) => typeof item === 'string').sort();
  const expected = packet.pathScopes.map((item) => item.slice('path:'.length)).sort();
  const exact = exactArray(changed, expected);
  return {
    prState: 'OPEN_EXACT',
    changedPathsState: exact ? 'EXACT' : 'CONFLICT',
    locator,
    reasons: exact ? [] : ['PR_CHANGED_PATHS_CONFLICT'],
  };
}
function evidenceLocators(packet, manifestRead, prRead, head) {
  const number = packet.packetRef.slice(1);
  return {
    packet: 'issue:' + packet.packetRef,
    lease: 'issue:#2352',
    manifest: manifestRead.manifest ? 'receipt:mcl-task-manifest:' + manifestRead.manifest.manifestId : 'receipt:mcl-task-manifest:unresolved-' + number,
    holder: 'receipt:mcl-workspace-holder:' + number,
    session: 'receipt:mcl-rdc-session-evidence:' + number,
    workspace: 'receipt:mcl-published-workspace:' + number,
    publishedIdentity: SHA40_RE.test(head || '') ? 'commit:' + head : 'receipt:mcl-published-head:unresolved-' + number,
    pr: prRead.locator || 'receipt:mcl-pr:unresolved-' + number,
    changedPaths: 'receipt:mcl-pr-paths:' + number,
    descendant: 'receipt:mcl-git-descendant:' + number,
    releaseEligibility: 'receipt:mcl-d013-release-plan:' + number,
  };
}
async function collectLiveObservation(packetNumber, {runner = commandResult, procRoot = '/proc'} = {}) {
  const mainBefore = readDirectMain(runner);
  const ops = readIssue(OPS_ISSUE, runner);
  const packet = parsePacket(packetNumber, readIssue(packetNumber, runner));
  const ledgerRead = parseLedger(readIssue(LEDGER_ISSUE, runner));
  const leaseRead = activeLeaseForPacket(ledgerRead.state, packet);
  const reasonCodes = [...packet.reasons, ...ledgerRead.reasons, ...leaseRead.reasons];

  if (!leaseRead.lease) throw new InspectError(unique(['ACTIVE_LEASE_UNRESOLVED', ...reasonCodes]));
  const manifestRead = manifestCandidates(readComments(packetNumber, runner), packet, leaseRead.lease);
  const holderRead = readHolderState(leaseRead.lease, manifestRead);
  const sessionReceipt = rdcSessionEvidence.inspectLocal({cwd: leaseRead.lease.workspace.worktree, procRoot});
  const sessionRead = sessionStateFromReceipt(sessionReceipt, leaseRead.lease.executor);
  const gitRead = gitPublishedIdentity(leaseRead.lease, runner);
  const prRead = prIdentityObservation(readOpenPulls(leaseRead.lease.workspace.branch, runner), leaseRead.lease, packet, gitRead, runner);

  let releaseRead;
  try {
    const client = operator.createGhIssueReadClient({repo: REPO, runner: (args) => runGh(args, runner)});
    releaseRead = releaseState(await operator.planRelease({
      client, packetRef: packet.packetRef, leaseId: leaseRead.lease.leaseId,
    }));
  } catch {
    releaseRead = {state: 'UNKNOWN', reasons: ['LEASE_RELEASE_PLAN_READ_FAILED']};
  }

  const mainAfter = readDirectMain(runner);
  const currentBarrierExact = mainBefore === mainAfter && opsHealthy(ops.body, mainBefore);
  return {
    packet, leaseRead, manifestRead, holderRead, sessionRead, gitRead, prRead, releaseRead,
    currentBarrierExact,
    reasonCodes: unique([
      ...reasonCodes, ...manifestRead.reasons, ...holderRead.reasons, ...sessionRead.reasons,
      ...gitRead.reasons, ...prRead.reasons, ...releaseRead.reasons,
      ...(mainBefore === mainAfter ? [] : ['DIRECT_MAIN_DRIFT']),
      ...(opsHealthy(ops.body, mainBefore) ? [] : ['OPS_CURRENTNESS_UNKNOWN']),
    ]),
  };
}
function buildEvidence(obs) {
  return {
    schemaVersion: 1,
    mode: 'PUBLISHED_PROGRESS_RECOVERY_EVIDENCE',
    subject: 'issue:' + obs.packet.packetRef,
    packetState: obs.currentBarrierExact && obs.packet.exact ? 'EXACT' : obs.packet.reasons.some((item) => item.includes('CONFLICT') || item.includes('DRIFT')) ? 'DRIFTED' : 'UNKNOWN',
    stageState: obs.packet.projection?.interactionStage === 'VALIDATION_MERGE' ? 'VALIDATION_MERGE' : obs.packet.projection?.interactionStage ? 'OTHER' : 'UNKNOWN',
    leaseState: obs.leaseRead.state,
    manifestState: obs.manifestRead.state,
    holderState: obs.holderRead.state,
    sessionState: obs.sessionRead.state,
    workspaceState: obs.gitRead.workspaceState,
    publishedIdentityState: obs.gitRead.publishedIdentityState,
    prState: obs.prRead.prState,
    changedPathsState: obs.prRead.changedPathsState,
    descendantState: obs.gitRead.descendantState || 'UNKNOWN',
    releaseEligibility: obs.releaseRead.state,
    locators: evidenceLocators(obs.packet, obs.manifestRead, obs.prRead, obs.gitRead.head),
  };
}
function fallbackObservation(packetNumber, reasons) {
  return {
    packet: {packetRef: '#' + packetNumber, exact: false, reasons: ['PACKET_AUTHORITY_UNRESOLVED'], projection: {}},
    leaseRead: {state: 'UNKNOWN', lease: null, reasons: []},
    manifestRead: {state: 'UNKNOWN', manifest: null, reasons: []},
    holderRead: {state: 'UNKNOWN', reasons: []},
    sessionRead: {state: 'UNKNOWN', reasons: []},
    gitRead: {workspaceState: 'UNKNOWN', publishedIdentityState: 'UNKNOWN', descendantState: 'UNKNOWN', head: null, reasons: []},
    prRead: {prState: 'UNKNOWN', changedPathsState: 'UNKNOWN', locator: null, reasons: []},
    releaseRead: {state: 'UNKNOWN', reasons: []},
    currentBarrierExact: false,
    reasonCodes: unique(['COLLECTOR_READ_FAILED', ...(reasons || [])]),
  };
}
function sanitizedReport(observation, decision) {
  return {
    schemaVersion: 1,
    mode: 'MCL_PUBLISHED_PROGRESS_RECOVERY_INSPECT_REPORT',
    packetRef: observation.packet.packetRef,
    states: {
      session: observation.sessionRead.state,
      workspace: observation.gitRead.workspaceState,
      publishedIdentity: observation.gitRead.publishedIdentityState,
      pr: observation.prRead.prState,
      changedPaths: observation.prRead.changedPathsState,
      descendant: observation.gitRead.descendantState || 'UNKNOWN',
      releaseEligibility: observation.releaseRead.state,
    },
    decision: {
      recoveryDisposition: decision.recoveryDisposition,
      result: decision.result,
      publishedProgress: decision.publishedProgress,
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
      return path.join(result.stdout.trim(), 'published-progress-recovery-evidence');
    }
  }
  return '/tmp/mcl-published-progress-recovery-evidence';
}
function writeArtifact(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true, mode: 0o700});
  const text = JSON.stringify(value, null, 2) + '\n';
  fs.writeFileSync(filePath, text, {encoding: 'utf8', mode: 0o600});
  return 'local-artifact:' + filePath + '#sha256=' + sha256(text);
}
async function inspectPacket(packetNumber, {
  collectObservation = collectLiveObservation,
  artifactWriter = null,
  runner = commandResult,
  procRoot = '/proc',
} = {}) {
  let observation;
  try {
    observation = await collectObservation(packetNumber, {runner, procRoot});
  } catch (error) {
    observation = fallbackObservation(packetNumber, error instanceof InspectError ? error.reasonCodes : ['COLLECTOR_INTERNAL_ERROR']);
  }
  const evidence = buildEvidence(observation);
  const decision = pure.projectPublishedProgressEvidence(evidence);
  const report = sanitizedReport(observation, decision);
  const base = artifactBase(observation, runner);
  const prefix = 'packet-' + packetNumber + '.inspect';
  const writer = artifactWriter || {
    writeReport(value) { return writeArtifact(path.join(base, prefix + '.report.json'), value); },
    writeDecision(value) { return writeArtifact(path.join(base, prefix + '.decision.json'), value); },
  };
  return {
    observation,
    evidence,
    decision,
    reportLocator: writer.writeReport(report),
    decisionLocator: writer.writeDecision(decision),
  };
}
function parseArgs(argv = process.argv.slice(2)) {
  const args = [...argv];
  if (args.shift() !== 'inspect') throw new InspectError(['COMMAND_UNSUPPORTED']);
  const values = {};
  while (args.length) {
    const key = args.shift();
    const value = args.shift();
    if (!key || !key.startsWith('--') || value === undefined) throw new InspectError(['ARGUMENT_INVALID']);
    const name = key.slice(2);
    if (!['packet', 'format'].includes(name) || Object.hasOwn(values, name)) throw new InspectError(['ARGUMENT_UNSUPPORTED']);
    values[name] = value;
  }
  if (!PACKET_RE.test(values.packet || '')) throw new InspectError(['PACKET_REF_INVALID']);
  if (!['agent-view', 'decision'].includes(values.format)) throw new InspectError(['FORMAT_UNSUPPORTED']);
  return {packetNumber: Number(values.packet.slice(1)), format: values.format};
}
async function runCli(argv = process.argv.slice(2), options = {}) {
  const args = parseArgs(argv);
  const result = await inspectPacket(args.packetNumber, options);
  const outward = args.format === 'decision'
    ? result.decision
    : {
        schemaVersion: 1,
        mode: 'REPOSITORY_AGENT_DECISION_VIEW',
        validity: result.decision.validity,
        phase: 'PUBLISHED_PROGRESS_RECOVERY',
        result: result.decision.result,
        attentionDisposition: result.decision.attentionDisposition,
        output: {
          recoveryDisposition: result.decision.recoveryDisposition,
          publishedProgress: result.decision.publishedProgress,
          sessionState: result.evidence.sessionState,
        },
        reasonCodes: result.decision.reasonCode ? [result.decision.reasonCode] : [],
        nextLegalAction: result.decision.nextLegalAction,
        decisionLocator: result.decisionLocator,
        reportLocator: result.reportLocator,
      };
  process.stdout.write(JSON.stringify(outward, null, 2) + '\n');
  return result.decision.result === 'PASS' ? 0 : ['CONFLICT', 'BLOCKED'].includes(result.decision.result) ? 2 : 3;
}
if (require.main === module) {
  runCli().then((code) => { process.exitCode = code; }).catch((error) => {
    process.stdout.write(JSON.stringify({status: 'UNKNOWN', reasonCodes: error.reasonCodes || ['INSPECT_INTERNAL_ERROR']}) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  InspectError,
  activeLeaseForPacket,
  buildEvidence,
  collectLiveObservation,
  gitPublishedIdentity,
  inspectPacket,
  manifestCandidates,
  parseArgs,
  parsePacket,
  prIdentityObservation,
  runCli,
  sanitizedReport,
  sessionStateFromReceipt,
};
