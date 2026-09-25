#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const REPO = 'hanmiyoo10-alt/-';
const REPO_OWNER = 'hanmiyoo10-alt';
const PR_SCHEMA = 'mcl-pr-publication-request.v1';
const PR_FIELDS = new Set(['schema', 'title', 'body']);
const MAX_INPUT_BYTES = 64 * 1024;
const MAX_PR_BODY_BYTES = 12 * 1024;
const MAX_PR_TITLE_BYTES = 240;
const MAX_COMMENT_PAGES = 5;
const PAGE_SIZE = 100;
const DETACHED_CHECKPOINT_SCHEMA = 'mcl-detached-owner-checkpoint.v1';
const DETACHED_CHECKPOINT_ACK_SCHEMA = 'mcl-detached-owner-checkpoint-ack.v1';
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

const taskHandoff = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const workspaceHolder = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const operator = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/mcl-coordination-operator.cjs'));
const stageEntry = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const patchOwner = require(path.join(ROOT,
  'products/chatgpt-mobile-coder-lab/device-ops/repository-patch/mcl-repository-patch-owner-invoke.cjs'));
const packetProjection = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-system/packet-projection.cjs'));
const executionReceipt = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/execution-receipt.cjs'));
const agentDecisionView = require(path.join(ROOT,
  '.github/plugin-control-plane/canonical-main/work-harness/agent-decision-view.cjs'));

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const PACKET_RE = /^#[1-9][0-9]*$/;

class ImplementationError extends Error {
  constructor(kind, reasonCodes) {
    super(reasonCodes[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes)].sort();
  }
}
function fail(kind, ...codes) {
  throw new ImplementationError(kind, codes.flat());
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function same(left, right) {
  return JSON.stringify(taskHandoff.stable(left)) === JSON.stringify(taskHandoff.stable(right));
}
function readRegular(filePath, field, max = MAX_INPUT_BYTES) {
  const resolved = path.resolve(filePath);
  let stat;
  try { stat = fs.lstatSync(resolved); } catch (_) { fail('UNKNOWN', field + '_READ_FAILED'); }
  if (!stat.isFile() || stat.isSymbolicLink()) fail('UNKNOWN', field + '_REGULAR_FILE_REQUIRED');
  if (stat.size > max) fail('UNKNOWN', field + '_TOO_LARGE');
  return fs.readFileSync(resolved);
}
function exactKeys(value, allowed, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('UNKNOWN', field + '_OBJECT_REQUIRED');
  const extra = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (extra.length || missing.length) {
    fail('UNKNOWN',
      ...extra.map((key) => field + '_UNKNOWN_FIELD:' + key),
      ...missing.map((key) => field + '_FIELD_REQUIRED:' + key));
  }
}
function packetNumber(packetRef) {
  if (!PACKET_RE.test(packetRef || '')) fail('UNKNOWN', 'PACKET_REF_INVALID');
  return Number(packetRef.slice(1));
}
function commentUrl(packet, id) {
  if (!Number.isSafeInteger(packet) || packet < 1 || !Number.isSafeInteger(id) || id < 1) {
    fail('UNKNOWN', 'COMMENT_LOCATOR_INVALID');
  }
  return `https://github.com/${REPO}/issues/${packet}#issuecomment-${id}`;
}
function pathScopes(scopes) {
  return [...scopes].filter((scope) => scope.startsWith('path:')).map((scope) => scope.slice(5)).sort();
}
function parsePrRequestText(text, packetRef) {
  let value;
  try { value = JSON.parse(text); } catch (_) { fail('UNKNOWN', 'PR_REQUEST_JSON_INVALID'); }
  exactKeys(value, PR_FIELDS, 'PR_REQUEST');
  if (value.schema !== PR_SCHEMA) fail('UNKNOWN', 'PR_REQUEST_SCHEMA_INVALID');
  if (typeof value.title !== 'string' || !value.title.trim()
      || Buffer.byteLength(value.title, 'utf8') > MAX_PR_TITLE_BYTES
      || /[\u0000-\u001f\u007f]/.test(value.title)) fail('UNKNOWN', 'PR_REQUEST_TITLE_INVALID');
  if (typeof value.body !== 'string' || !value.body.trim()
      || Buffer.byteLength(value.body, 'utf8') > MAX_PR_BODY_BYTES
      || /\u0000/.test(value.body)) fail('UNKNOWN', 'PR_REQUEST_BODY_INVALID');
  const n = packetNumber(packetRef);
  const refs = new RegExp('(^|\\s)Refs\\s+#' + n + '\\b', 'i');
  const closes = /\\b(?:close(?:s|d)?|fix(?:es|ed)?|resolve(?:s|d)?)\\s*:?[ \\t]*#\\d+\\b/i;
  if (!refs.test(value.body)) fail('BLOCKED', 'PR_REQUEST_NON_CLOSING_REF_REQUIRED');
  if (closes.test(value.title) || closes.test(value.body)) {
    fail('BLOCKED', 'PR_REQUEST_CLOSING_LINK_FORBIDDEN');
  }
  return {schema: PR_SCHEMA, title: value.title.trim(), body: value.body};
}
function parseHandoffEnvelope(text) {
  const start = '<!-- mcl-execution-handoff:v1 -->';
  const end = '<!-- /mcl-execution-handoff:v1 -->';
  const trimmed = String(text || '').trim();
  const prefix = start + '\n```json\n';
  const suffix = '\n```\n' + end;
  if (!trimmed.startsWith(prefix) || !trimmed.endsWith(suffix)
      || trimmed.split(start).length !== 2 || trimmed.split(end).length !== 2) {
    fail('UNKNOWN', 'PARENT_HANDOFF_ENVELOPE_INVALID');
  }
  const jsonText = trimmed.slice(prefix.length, trimmed.length - suffix.length);
  return patchOwner.parseHandoffText(jsonText);
}
function renderHandoff(manifest) {
  return stageEntry.renderHandoff({
    schema: 'mcl-execution-handoff.v1',
    status: 'HANDOFF_READY',
    packet_ref: manifest.packetRef,
    phase: '1/1',
    route: 'S',
    executor: 'S',
    effect_class: 'repository_mutation',
    manifest_id: manifest.manifestId,
    lease_id: manifest.leaseEvidence.leaseId,
    next_owner: 'existing_route_owner',
    reason_codes: [],
    mutation_authorized: false,
    execution_authorized: false,
    details: 'withheld',
  });
}
function runGit(worktree, args, spawn = childProcess.spawnSync) {
  const result = spawn('git', ['-C', worktree, ...args], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) fail('UNKNOWN', 'GIT_READ_FAILED');
  return String(result.stdout || '').trim();
}
function changedBetween(worktree, base, head, spawn = childProcess.spawnSync) {
  if (base === head) return [];
  return runGit(worktree, ['diff', '--name-only', base + '..' + head], spawn)
    .split(/\r?\n/).filter(Boolean).sort();
}
function assertWorkspaceState(parentManifest, mainSha, requestedPaths, spawn = childProcess.spawnSync) {
  const inspected = workspaceHolder.inspectWorkspace(parentManifest);
  if (!inspected.ok) fail('BLOCKED', ...inspected.reasonCodes);
  const holder = workspaceHolder.readHolder(inspected.holderPath);
  if (!holder.missing) fail('BLOCKED', 'HOLDER_ALREADY_EXISTS');
  const wt = parentManifest.workspace.worktree;
  const head = runGit(wt, ['rev-parse', 'HEAD'], spawn);
  const branch = runGit(wt, ['branch', '--show-current'], spawn);
  const remote = runGit(wt, ['ls-remote', '--heads', 'origin', parentManifest.workspace.branch], spawn)
    .split(/\s+/)[0] || '';
  const dirty = runGit(wt, ['status', '--porcelain=v1'], spawn);
  if (branch !== parentManifest.workspace.branch) fail('CONFLICT', 'WORKTREE_BRANCH_CONFLICT');
  if (head !== parentManifest.observedBaseSha || remote !== head) fail('CONFLICT', 'WORKTREE_HEAD_CONFLICT');
  if (dirty) fail('BLOCKED', 'WORKTREE_NOT_CLEAN');
  const drift = changedBetween(wt, head, mainSha, spawn);
  const overlap = drift.filter((item) => requestedPaths.includes(item));
  if (overlap.length) fail('CONFLICT', 'CURRENT_MAIN_SCOPE_DRIFT');
  return {head, branch, remote, drift};
}
function readComments(packet, runner) {
  const rows = [];
  for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
    const pageRows = stageEntry.ghJson(
      `repos/${REPO}/issues/${packet}/comments?per_page=${PAGE_SIZE}&page=${page}`, runner);
    if (!Array.isArray(pageRows)) fail('UNKNOWN', 'COMMENTS_INVALID');
    rows.push(...pageRows);
    if (pageRows.length < PAGE_SIZE) return rows;
  }
  fail('UNKNOWN', 'COMMENTS_PAGINATION_BOUND');
}
function exactComment(comments, text, field) {
  const target = String(text).trim();
  const matches = comments.filter((row) => typeof row?.body === 'string' && row.body.trim() === target);
  if (matches.length === 0) fail('UNKNOWN', field + '_COMMENT_MISSING');
  if (matches.length !== 1) fail('CONFLICT', field + '_COMMENT_AMBIGUOUS');
  if (!Number.isSafeInteger(matches[0].id)) fail('UNKNOWN', field + '_COMMENT_ID_INVALID');
  return matches[0].id;
}
function mainHealth(runner) {
  const first = stageEntry.ghJson(`repos/${REPO}/branches/main`, runner)?.commit?.sha;
  if (!SHA40_RE.test(first || '')) fail('UNKNOWN', 'MAIN_SHA_INVALID');
  const ops = stageEntry.ghJson(`repos/${REPO}/issues/485`, runner);
  stageEntry.parseOpsCapsule(ops?.body || '', first);
  const second = stageEntry.ghJson(`repos/${REPO}/branches/main`, runner)?.commit?.sha;
  if (second !== first) fail('CONFLICT', 'MAIN_MOVED_DURING_READ');
  return first;
}
async function prepareLiveContext({
  packetRef, parentManifestText, parentHandoffText, env, runner, fetchImpl, spawnSyncImpl,
}) {
  const packet = packetNumber(packetRef);
  const manifestParsed = taskHandoff.parseManifest(parentManifestText);
  if (manifestParsed.status !== 'VALID') fail('UNKNOWN', ...manifestParsed.reasonCodes);
  const parentManifest = manifestParsed.value;
  const parentHandoff = parseHandoffEnvelope(parentHandoffText);
  const operatorRunner = (args) => runner(['gh', ...args]);
  const client = operator.createOperatorGitHubClient({
    repo: REPO, env, runner: operatorRunner, fetchImpl,
  });
  const issue = await client.api('/issues/' + packet);
  const ledgerIssue = await client.api('/issues/2352');
  if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') {
    fail('BLOCKED', 'PACKET_NOT_OPEN');
  }
  const projection = packetProjection.classifyPacketProjection(issue.body);
  if (projection.disposition !== 'PASS' || projection.lifecycle !== 'IN_PROGRESS'
      || projection.interactionStage !== 'IMPLEMENTATION_PR') {
    fail(projection.disposition === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED', 'PACKET_STAGE_NOT_IMPLEMENTATION_PR');
  }
  const requestedScopes = stageEntry.extractPacketScopes(issue.body);
  const context = await operator.readContext({client, packetRef, scopes: requestedScopes});
  if (context.status !== 'READY') fail('BLOCKED', ...context.reasonCodes);
  const overlap = stageEntry.discoverOverlap({packetNumber: packet, requestedScopes, runner});
  if (overlap.state !== 'DISJOINT' || overlap.discovery !== 'COMPLETE') {
    fail(overlap.state === 'CONFLICT' ? 'CONFLICT' : 'BLOCKED', 'CURRENT_SCOPE_NOT_DISJOINT');
  }
  const mainSha = mainHealth(runner);
  const comments = readComments(packet, runner);
  const parentManifestComment = exactComment(comments, parentManifestText, 'PARENT_MANIFEST');
  const parentHandoffComment = exactComment(comments, parentHandoffText, 'PARENT_HANDOFF');
  if (parentManifest.packetRef !== packetRef
      || parentManifest.phaseId !== `${packet}-implementation-pr-stage-entry`
      || parentManifest.phaseClass !== 'REPOSITORY_MUTATION'
      || parentManifest.route !== 'S' || parentManifest.executor !== 'S'
      || parentManifest.leaseRequirement !== 'REQUIRED'
      || !same(parentManifest.scopes, requestedScopes)
      || parentManifest.workspace?.kind !== 'repository'
      || parentManifest.workspace?.branch !== `server/mcl-packet-${packet}`
      || parentManifest.workspace?.worktree !== `/root/nyang-worktrees/mcl-packet-${packet}`) {
    fail('CONFLICT', 'PARENT_MANIFEST_CONFLICT');
  }
  if (parentHandoff.status !== 'HANDOFF_READY' || parentHandoff.packet_ref !== packetRef
      || parentHandoff.phase !== '1/1' || parentHandoff.route !== 'S'
      || parentHandoff.executor !== 'S' || parentHandoff.effect_class !== 'repository_mutation'
      || parentHandoff.manifest_id !== parentManifest.manifestId
      || parentHandoff.lease_id !== parentManifest.leaseEvidence.leaseId) {
    fail('CONFLICT', 'PARENT_HANDOFF_CONFLICT');
  }
  const evidence = workspaceHolder.validateEvidence({
    manifest: parentManifest, ledgerBody: ledgerIssue.body || '',
    packetBody: issue.body, requireActiveLease: true,
  });
  if (!evidence.ok) fail('BLOCKED', ...evidence.reasonCodes);
  const workspace = assertWorkspaceState(
    parentManifest, mainSha, pathScopes(requestedScopes), spawnSyncImpl || childProcess.spawnSync);
  return {
    packet, packetRef, issue, ledgerIssue, context, mainSha, requestedScopes,
    parentManifest, parentHandoff, parentManifestText, parentHandoffText,
    parentManifestComment, parentHandoffComment, workspace,
  };
}
function resolveValidationProfileBinding(ctx, validationText) {
  try {
    const profile = patchOwner.resolveValidationProfileForScopes(ctx.requestedScopes);
    const request = patchOwner.parseValidationRequestText(validationText);
    if (request.profile !== profile.profileId) {
      fail('BLOCKED', 'VALIDATION_PROFILE_REQUEST_MISMATCH');
    }
    return {profile, request};
  } catch (error) {
    if (error instanceof patchOwner.InvocationError) {
      fail(error.kind, ...error.reasonCodes);
    }
    throw error;
  }
}
function buildChildManifest(ctx, request, validationText, prText, selectedProfile = null) {
  const profile = selectedProfile || resolveValidationProfileBinding(ctx, validationText).profile;
  const patchRef = 'receipt:mcl-repository-patch-request:' + request.patch_sha256;
  const validationRef = patchOwner.VALIDATION_REF_PREFIX + sha256(Buffer.from(validationText, 'utf8'));
  const validationContractRef =
    patchOwner.VALIDATION_CONTRACT_REF_PREFIX + profile.contractDigest;
  const validationAdapterRef = patchOwner.IMPLEMENTATION_VALIDATION_ADAPTER_REF_PREFIX
    + patchOwner.IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT.contractDigest;
  const prRef = 'receipt:mcl-pr-publication-request:' + sha256(Buffer.from(prText, 'utf8'));
  return taskHandoff.buildManifest({
    schemaVersion: 1,
    mode: 'MCL_TASK_MANIFEST',
    packetRef: ctx.packetRef,
    packetBodySha256: ctx.context.packetBodySha256,
    phaseId: `${ctx.packet}-implementation-pr-effect`,
    phaseClass: 'REPOSITORY_MUTATION',
    route: 'S',
    executor: 'S',
    scopes: ctx.requestedScopes,
    workspace: ctx.parentManifest.workspace,
    observedBaseSha: ctx.parentManifest.observedBaseSha,
    leaseRequirement: 'REQUIRED',
    leaseEvidence: ctx.parentManifest.leaseEvidence,
    sourceAuthorityRefs: [
      ctx.packetRef, 'issue:#2352', 'issue:#2577',
      'doc:products/chatgpt-mobile-coder-lab/docs/task-handoff.md',
      'doc:products/chatgpt-mobile-coder-lab/docs/task-lease.md',
    ],
    inputRefs: [
      `commit:${ctx.parentManifest.observedBaseSha}`,
      commentUrl(ctx.packet, ctx.parentManifestComment),
      commentUrl(ctx.packet, ctx.parentHandoffComment),
      patchRef, validationRef, validationContractRef, validationAdapterRef, prRef,
      ctx.parentManifest.leaseEvidence.acquireEvidenceRef,
    ],
    expectedOutputRefs: pathScopes(ctx.requestedScopes).map((item) => 'path:' + item),
    acceptanceRefs: [ctx.packetRef, 'issue:#2352', 'issue:#2577'],
    stopCondition: 'Execute one fixed S repository implementation effect, publish one non-closing PR, and converge D-013/holder/D-014 evidence.',
    authority: {...FALSE_AUTHORITY},
  });
}
function writeEvidenceFiles(ctx, manifestText, tempRoot = null) {
  const dir = fs.mkdtempSync(path.join(tempRoot || os.tmpdir(), 'mcl-repo-impl-'));
  const manifestPath = path.join(dir, 'manifest.md');
  const ledgerPath = path.join(dir, 'ledger.md');
  const packetPath = path.join(dir, 'packet.md');
  fs.writeFileSync(manifestPath, manifestText, {mode: 0o600});
  fs.writeFileSync(ledgerPath, ctx.ledgerIssue.body || '', {mode: 0o600});
  fs.writeFileSync(packetPath, ctx.issue.body || '', {mode: 0o600});
  return {dir, manifestPath, ledgerPath, packetPath};
}
function removeEvidenceFiles(files) {
  try { fs.rmSync(files.dir, {recursive: true, force: true}); } catch (_) {}
}
function patchOwnerPassState(receipt) {
  if (!receipt || receipt.validity !== 'VALID' || receipt.schemaVersion !== 2
      || receipt.executionLifecycle !== 'FINISHED') {
    fail(receipt?.result === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN', 'PATCH_OWNER_RECEIPT_INVALID');
  }
  return receipt.attentionDisposition === 'COMPLETE' && receipt.result === 'PASS';
}
function patchOwnerCounter(receipt, name) {
  const row = receipt?.counters?.find((item) => item.name === name);
  return row?.status === 'KNOWN' ? row.value : null;
}
function patchOwnerAttention(receipt, locator) {
  const reasonCode = receipt?.reasonCodes?.[0]
    || receipt?.conflicts?.[0]
    || receipt?.requiredUnknowns?.[0]
    || receipt?.blockers?.[0]
    || 'PATCH_OWNER_ATTENTION_REQUIRED';
  const severity = receipt?.result === 'CONFLICT' ? 'CONFLICT'
    : receipt?.result === 'UNKNOWN' ? 'UNKNOWN'
      : receipt?.result === 'BLOCKED' ? 'BLOCKER'
        : receipt?.result === 'FAIL' ? 'FAIL' : 'WARN';
  return [{
    subject: receipt?.primitiveId || 'mcl:repository-worktree-patch',
    reasonCode,
    severity,
    constraint: 'IMPLEMENTATION_ATTENTION',
    nextPhase: receipt?.nextLegalAction || 'NEEDS_SEMANTIC_DECISION',
    locator,
  }];
}
function projectPatchOwnerStopView({ctx, child, patchReceipt, deps = {}}) {
  const persistChild = deps.persistPatchOwnerArtifacts || patchOwner.persistAgentArtifacts;
  const childLocators = persistChild(patchReceipt, child, deps.patchOwnerArtifactDeps || {});
  const childOutput = patchOwner.ownerDecisionOutput(patchReceipt);
  const counters = [
    {name: 'changed_file_count', value: patchOwnerCounter(patchReceipt, 'changed_paths') || 0},
    {name: 'pr_created', value: 0},
    {name: 'commit_created', value: patchOwnerCounter(patchReceipt, 'commit_created') || 0},
  ];
  for (const name of [
    'validation_passed', 'validation_failed', 'validation_infra', 'validation_not_run',
  ]) {
    const value = patchOwnerCounter(patchReceipt, name);
    if (value !== null) counters.push({name, value});
  }
  const receipt = executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'mcl-repository-implementation:' + child.manifestId,
    primitiveId: 'mcl:known-owner-repository-implementation:s',
    sourceIdentity: {
      kind: 'WORK_PACKET', locator: ctx.packetRef, identity: ctx.context.packetBodySha256,
    },
    executionSurface: 'MCL:S',
    stage: 'IMPLEMENTATION_PR',
    executionLifecycle: patchReceipt.executionLifecycle,
    attentionDisposition: patchReceipt.attentionDisposition,
    result: patchReceipt.result,
    proofScope: 'BOUND_REPOSITORY_IMPLEMENTATION_PR_CHILD_STOP',
    steps: [
      {name: 'parent-stage-entry', result: 'PASS',
        evidenceLocator: commentUrl(ctx.packet, ctx.parentHandoffComment)},
      {name: 'repository-patch-owner', result: patchReceipt.result,
        evidenceLocator: childLocators.reportLocator},
    ],
    counters,
    affectedFiles: patchReceipt.affectedFiles || [],
    artifactLocators: [
      childLocators.receiptLocator,
      childLocators.reportLocator,
      ...(patchReceipt.artifactLocators || []),
    ],
    reasonCodes: patchReceipt.reasonCodes || [],
    requiredUnknowns: patchReceipt.requiredUnknowns || [],
    conflicts: patchReceipt.conflicts || [],
    blockers: patchReceipt.blockers || [],
    exitCode: patchReceipt.exitCode,
    stderrTail: null,
    nextLegalAction: patchReceipt.nextLegalAction,
  });
  const report = {
    schemaVersion: 1,
    mode: 'MCL_REPOSITORY_IMPLEMENTATION_REPORT',
    packetRef: ctx.packetRef,
    childManifestId: child.manifestId,
    childReceiptDigest: patchReceipt.receiptDigest,
    childReceiptLocator: childLocators.receiptLocator,
    childReportLocator: childLocators.reportLocator,
    result: receipt.result,
    attentionDisposition: receipt.attentionDisposition,
    reasonCodes: receipt.reasonCodes,
    output: childOutput,
    nextLegalAction: receipt.nextLegalAction,
    authority: {...FALSE_AUTHORITY},
  };
  const persist = deps.persistArtifacts || persistArtifacts;
  const locators = persist(child, report, receipt);
  const locator = childOutput.validationArtifact || childLocators.reportLocator;
  return agentDecisionView.projectAgentDecisionView({
    receipt,
    phase: 'IMPLEMENTATION_PR',
    output: {
      stageOwner: patchOwner.STAGE_OWNER_ID,
      mutationPrimitive: patchOwner.MUTATION_PRIMITIVE_ID,
      ...childOutput,
    },
    attention: patchOwnerAttention(patchReceipt, locator),
    receiptLocator: locators.receiptLocator,
    reportLocator: locators.reportLocator,
  });
}
function currentGitHead(manifest, spawn = childProcess.spawnSync) {
  const local = runGit(manifest.workspace.worktree, ['rev-parse', 'HEAD'], spawn);
  const remote = runGit(manifest.workspace.worktree,
    ['ls-remote', '--heads', 'origin', manifest.workspace.branch], spawn).split(/\s+/)[0] || '';
  const dirty = runGit(manifest.workspace.worktree, ['status', '--porcelain=v1'], spawn);
  if (!SHA40_RE.test(local) || remote !== local || dirty) fail('CONFLICT', 'PUBLISHED_HEAD_NOT_EXACT');
  return local;
}
function publishPr({manifest, request, expectedHead, runner}) {
  const existing = stageEntry.ghJson(
    `repos/${REPO}/pulls?state=open&head=${encodeURIComponent(REPO_OWNER + ':' + manifest.workspace.branch)}&per_page=100`,
    runner);
  if (!Array.isArray(existing)) fail('UNKNOWN', 'PR_DISCOVERY_INVALID');
  if (existing.length) fail('CONFLICT', 'OPEN_PR_ALREADY_EXISTS');
  const created = stageEntry.ghJson(`repos/${REPO}/pulls`, runner, {
    method: 'POST',
    body: {
      title: request.title, body: request.body,
      head: manifest.workspace.branch, base: 'main', draft: false,
    },
  });
  if (!Number.isSafeInteger(created?.number)) fail('UNKNOWN', 'PR_CREATE_UNPROVEN');
  const pr = stageEntry.ghJson(`repos/${REPO}/pulls/${created.number}`, runner);
  const files = stageEntry.ghJson(`repos/${REPO}/pulls/${created.number}/files?per_page=100`, runner);
  if (!Array.isArray(files)) fail('UNKNOWN', 'PR_FILES_INVALID');
  const changed = files.map((item) => item?.filename).filter((item) => typeof item === 'string').sort();
  if (pr?.state !== 'open' || pr?.draft !== false || pr?.base?.ref !== 'main'
      || pr?.head?.ref !== manifest.workspace.branch || pr?.head?.sha !== expectedHead
      || !same(changed, pathScopes(manifest.scopes)) || pr?.body !== request.body) {
    fail('CONFLICT', 'PR_READBACK_CONFLICT');
  }
  return {number: created.number, head: expectedHead, changed};
}
function updateEvidenceFiles(files, packetBody, ledgerBody) {
  fs.writeFileSync(files.packetPath, packetBody, {mode: 0o600});
  fs.writeFileSync(files.ledgerPath, ledgerBody, {mode: 0o600});
}
function persistArtifacts(manifest, report, receipt) {
  const workspace = workspaceHolder.inspectWorkspace(manifest);
  if (!workspace.ok || !workspace.holderPath) fail('UNKNOWN', 'REPORT_WORKSPACE_INVALID');
  const dir = path.dirname(workspace.holderPath);
  const prefix = 'mcl-repository-implementation-' + manifest.manifestId;
  const reportPath = path.join(dir, prefix + '.report.json');
  const receiptPath = path.join(dir, prefix + '.receipt.json');
  const reportBytes = JSON.stringify(report, null, 2) + '\n';
  const receiptBytes = JSON.stringify(receipt, null, 2) + '\n';
  if (Buffer.byteLength(reportBytes) > 16 * 1024 || Buffer.byteLength(receiptBytes) > 16 * 1024) {
    fail('UNKNOWN', 'ARTIFACT_TOO_LARGE');
  }
  fs.writeFileSync(reportPath, reportBytes, {mode: 0o600});
  fs.writeFileSync(receiptPath, receiptBytes, {mode: 0o600});
  return {
    reportLocator: 'artifact:git-admin:mcl-repository-implementation-report:' + manifest.manifestId,
    receiptLocator: 'artifact:git-admin:mcl-repository-implementation-receipt:' + manifest.manifestId,
    receiptPath,
  };
}
function validationSummaryOutput(patchReceipt) {
  const child = patchOwner.ownerDecisionOutput(patchReceipt);
  const output = {};
  for (const key of [
    'validationPassed', 'validationFailed', 'validationInfra', 'validationNotRun',
    'validationArtifact',
  ]) {
    if (child[key] !== undefined) output[key] = child[key];
  }
  return output;
}
function validationSummaryCounters(patchReceipt) {
  const child = patchOwner.ownerDecisionOutput(patchReceipt);
  const counters = [];
  for (const [key, name] of [
    ['validationPassed', 'validation_passed'],
    ['validationFailed', 'validation_failed'],
    ['validationInfra', 'validation_infra'],
    ['validationNotRun', 'validation_not_run'],
  ]) {
    if (Number.isSafeInteger(child[key]) && child[key] >= 0) {
      counters.push({name, value: child[key]});
    }
  }
  return counters;
}
function buildStageReceipt({ctx, child, commit, pr, locators, comments, patchReceipt}) {
  const validationOutput = validationSummaryOutput(patchReceipt);
  return executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'mcl-repository-implementation:' + child.manifestId,
    primitiveId: 'mcl:known-owner-repository-implementation:s',
    sourceIdentity: {
      kind: 'WORK_PACKET', locator: ctx.packetRef, identity: ctx.context.packetBodySha256,
    },
    executionSurface: 'MCL:S',
    stage: 'IMPLEMENTATION_PR',
    executionLifecycle: 'FINISHED',
    attentionDisposition: 'COMPLETE',
    result: 'PASS',
    proofScope: 'BOUND_REPOSITORY_IMPLEMENTATION_PR',
    steps: [
      {name: 'parent-stage-entry', result: 'PASS', evidenceLocator: commentUrl(ctx.packet, ctx.parentHandoffComment)},
      {name: 'child-d014', result: 'PASS', evidenceLocator: commentUrl(ctx.packet, comments.childManifest)},
      {name: 'repository-patch-owner', result: 'PASS', evidenceLocator: `commit:${commit}`},
      {name: 'pr-publication', result: 'PASS', evidenceLocator: `pr:#${pr.number}`},
      {name: 'coordination-convergence', result: 'PASS', evidenceLocator: commentUrl(ctx.packet, comments.childReceipt)},
    ],
    counters: [
      {name: 'changed_file_count', value: pr.changed.length},
      {name: 'pr_created', value: 1},
      {name: 'commit_created', value: 1},
      ...validationSummaryCounters(patchReceipt),
    ],
    affectedFiles: pr.changed,
    artifactLocators: [
      `commit:${commit}`, `pr:#${pr.number}`,
      commentUrl(ctx.packet, comments.childManifest), commentUrl(ctx.packet, comments.childHandoff),
      commentUrl(ctx.packet, comments.childReceipt), commentUrl(ctx.packet, comments.parentReceipt),
      locators.reportLocator,
      ...(validationOutput.validationArtifact ? [validationOutput.validationArtifact] : []),
    ],
    reasonCodes: [],
    requiredUnknowns: [],
    conflicts: [],
    blockers: [],
    exitCode: 0,
    stderrTail: null,
    nextLegalAction: 'VALIDATION_MERGE',
  });
}
async function emitDetachedCheckpoint(checkpointSink, {
  checkpoint,
  primitiveId,
  targetIdentity,
  evidenceLocator,
  nextPrimitive,
  finalReceiptDigest = null,
  finalReceiptLocator = null,
}) {
  if (checkpointSink === null || checkpointSink === undefined) return;
  if (typeof checkpointSink !== 'function') {
    fail('UNKNOWN', 'CONTINUITY_CHECKPOINT_SINK_INVALID');
  }
  try {
    await checkpointSink({
      schema: DETACHED_CHECKPOINT_SCHEMA,
      checkpoint,
      primitiveId,
      targetIdentity,
      evidenceLocator,
      nextPrimitive,
      finalReceiptDigest,
      finalReceiptLocator,
    });
  } catch (error) {
    if (error instanceof ImplementationError) throw error;
    fail('BLOCKED', 'CONTINUITY_CHECKPOINT_PERSIST_FAILED');
  }
}

async function executePrepared(ctx, inputs, deps = {}) {
  const runner = deps.runner || stageEntry.runDefault;
  const operatorRunner = (args) => runner(['gh', ...args]);
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl;
  const spawnSyncImpl = deps.spawnSyncImpl || childProcess.spawnSync;
  const postComment = deps.postComment || ((body) => stageEntry.postComment(ctx.packet, body, runner));
  const claimHolder = deps.claimHolder || workspaceHolder.claimHolder;
  const checkHolder = deps.checkHolder || workspaceHolder.checkHolder;
  const releaseHolder = deps.releaseHolder || workspaceHolder.releaseHolder;
  const validateReleased = deps.validateReleased || workspaceHolder.validateEvidence;
  const headReader = deps.currentGitHead || currentGitHead;
  const persist = deps.persistArtifacts || persistArtifacts;
  const checkpointSink = deps.checkpointSink || null;
  const readAfterRelease = deps.readAfterRelease || (async () => {
    const client = operator.createOperatorGitHubClient({
    repo: REPO, env, runner: operatorRunner, fetchImpl,
  });
    const [packetAfter, ledgerAfter] = await Promise.all([
      client.api('/issues/' + ctx.packet), client.api('/issues/2352'),
    ]);
    return {packetAfter, ledgerAfter};
  });
  const request = patchOwner.parseRequestText(inputs.requestText);
  const patchBytes = readRegular(inputs.patchFile, 'PATCH_FILE', patchOwner.MAX_PATCH_BYTES);
  if (sha256(patchBytes) !== request.patch_sha256) fail('CONFLICT', 'PATCH_HASH_CONFLICT');
  if (!same(request.expected_paths, pathScopes(ctx.requestedScopes))) fail('CONFLICT', 'PATCH_PATH_SCOPE_CONFLICT');
  const validationBinding = resolveValidationProfileBinding(ctx, inputs.validationRequestText);
  if (!readRegular(inputs.requestFile, 'REQUEST_FILE').equals(Buffer.from(inputs.requestText, 'utf8'))) {
    fail('CONFLICT', 'REQUEST_TEXT_FILE_CONFLICT');
  }
  if (!readRegular(inputs.validationRequestFile, 'VALIDATION_REQUEST_FILE')
      .equals(Buffer.from(inputs.validationRequestText, 'utf8'))) {
    fail('CONFLICT', 'VALIDATION_REQUEST_TEXT_FILE_CONFLICT');
  }
  const prRequest = parsePrRequestText(inputs.prRequestText, ctx.packetRef);
  const child = buildChildManifest(
    ctx, request, inputs.validationRequestText, inputs.prRequestText, validationBinding.profile);
  const childText = taskHandoff.renderManifest(child);
  const childManifestComment = postComment(childText);
  const childHandoffText = renderHandoff(child);
  const childHandoffComment = postComment(childHandoffText);
  const evidenceFiles = writeEvidenceFiles(ctx, childText, deps.tempRoot);
  try {
    const claimed = claimHolder(evidenceFiles);
    if (claimed.result.status !== 'CLAIMED' || !SHA256_RE.test(claimed.secret || '')) {
      fail('BLOCKED', ...(claimed.result.reasonCodes || ['HOLDER_CLAIM_FAILED']));
    }
    const secret = claimed.secret;
    const check = checkHolder(evidenceFiles, secret);
    if (check.status !== 'CHECK_PASS') fail('BLOCKED', ...(check.reasonCodes || ['HOLDER_CHECK_FAILED']));
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'WORKSPACE_READY',
      primitiveId: 'MCL_WORKSPACE_HOLDER',
      targetIdentity: 'manifest:' + child.manifestId,
      evidenceLocator: 'receipt:mcl-task-manifest:' + child.manifestId,
      nextPrimitive: 'PATCH_PREPARE',
    });
    const childHandoff = parseHandoffEnvelope(childHandoffText);
    const patchReceipt = await (deps.invokePatchOwner || patchOwner.invokeLive)({
      repo: REPO,
      handoffText: JSON.stringify(childHandoff),
      manifestText: childText,
      requestText: inputs.requestText,
      requestFile: path.resolve(inputs.requestFile),
      patchFile: path.resolve(inputs.patchFile),
      validationRequestText: inputs.validationRequestText,
      validationRequestFile: path.resolve(inputs.validationRequestFile),
      env: {...env, [workspaceHolder.CLAIM_ENV]: secret},
      runner: operatorRunner, fetchImpl, spawnSyncImpl,
      validationSpawnSyncImpl: deps.validationSpawnSyncImpl || childProcess.spawnSync,
      root: ROOT,
      checkpointSink,
    });
    if (!patchOwnerPassState(patchReceipt)) {
      return projectPatchOwnerStopView({ctx, child, patchReceipt, deps});
    }
    const validationOutput = validationSummaryOutput(patchReceipt);
    await (deps.guardCurrent || patchOwner.guardCurrent)({
      repo: REPO, manifest: child, handoff: childHandoff,
      holderSecret: secret, env, runner: operatorRunner, fetchImpl,
    });
    const commit = headReader(child, spawnSyncImpl);
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'REMOTE_HEAD_VERIFIED',
      primitiveId: 'REPOSITORY_REMOTE_HEAD_VERIFY',
      targetIdentity: 'commit:' + commit,
      evidenceLocator: 'commit:' + commit,
      nextPrimitive: 'PR_CREATE',
    });
    const pr = (deps.publishPr || publishPr)({
      manifest: child, request: prRequest, expectedHead: commit, runner,
    });
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'PR_CREATED',
      primitiveId: 'REPOSITORY_PR_CREATE',
      targetIdentity: 'pr:#' + pr.number,
      evidenceLocator: 'pr:#' + pr.number,
      nextPrimitive: 'COORDINATION_RELEASE',
    });
    await (deps.guardCurrent || patchOwner.guardCurrent)({
      repo: REPO, manifest: child, handoff: childHandoff,
      holderSecret: secret, env, runner: operatorRunner, fetchImpl,
    });
    const release = (deps.releaseLease || stageEntry.releaseLease)(
      {packetRef: ctx.packetRef}, child.leaseEvidence.leaseId, runner);
    if (!release?.ok || !Number.isSafeInteger(release.value?.runId)) {
      fail('BLOCKED', 'D013_RELEASE_NOT_PROVEN');
    }
    const {packetAfter, ledgerAfter} = await readAfterRelease();
    updateEvidenceFiles(evidenceFiles, packetAfter.body || '', ledgerAfter.body || '');
    const released = validateReleased({
      manifest: child, ledgerBody: ledgerAfter.body || '', packetBody: packetAfter.body || '',
      requireActiveLease: false,
    });
    if (!released.ok) fail('BLOCKED', ...released.reasonCodes);
    const holderRelease = releaseHolder(evidenceFiles, secret);
    if (holderRelease.status !== 'RELEASED') fail('BLOCKED', ...holderRelease.reasonCodes);
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'COORDINATION_RELEASED',
      primitiveId: 'MCL_COORDINATION_RELEASE',
      targetIdentity: 'lease:' + child.leaseEvidence.leaseId,
      evidenceLocator: 'run:' + release.value.runId,
      nextPrimitive: 'FINALIZE_RECEIPTS',
    });
    const releaseEvidence = {
      ledgerRef: '#2352',
      leaseId: child.leaseEvidence.leaseId,
      releasedGeneration: released.state.generation,
      evidenceRef: `run:${release.value.runId}`,
    };
    const childReceipt = taskHandoff.buildCompletionReceipt(child, {
      disposition: 'COMPLETE',
      outputRefs: [`commit:${commit}`, `pr:#${pr.number}`],
      validationRefs: [
        `pr:#${pr.number}`,
        `receipt:mcl-repository-patch-owner:${child.manifestId}`,
        patchOwner.VALIDATION_CONTRACT_REF_PREFIX + validationBinding.profile.contractDigest,
        patchOwner.IMPLEMENTATION_VALIDATION_ADAPTER_REF_PREFIX
          + patchOwner.IMPLEMENTATION_VALIDATION_ADAPTER_CONTRACT.contractDigest,
        ...(validationOutput.validationArtifact ? [validationOutput.validationArtifact] : []),
      ],
      observedRefs: [`commit:${ctx.mainSha}`, `commit:${commit}`, `pr:#${pr.number}`],
      leaseDisposition: 'RELEASED',
      leaseReleaseEvidence: releaseEvidence,
      workspaceResult: 'clean',
      blockerRefs: [],
      requiredUnknownRefs: [],
    });
    const childReceiptComment = postComment(taskHandoff.renderCompletionReceipt(childReceipt));
    const parentReceipt = taskHandoff.buildCompletionReceipt(ctx.parentManifest, {
      disposition: 'COMPLETE',
      outputRefs: [`commit:${commit}`, `pr:#${pr.number}`],
      validationRefs: [commentUrl(ctx.packet, childReceiptComment), `pr:#${pr.number}`],
      observedRefs: [`commit:${ctx.mainSha}`, `commit:${commit}`, `pr:#${pr.number}`],
      leaseDisposition: 'RELEASED',
      leaseReleaseEvidence: releaseEvidence,
      workspaceResult: 'clean',
      blockerRefs: [],
      requiredUnknownRefs: [],
    });
    const parentReceiptComment = postComment(taskHandoff.renderCompletionReceipt(parentReceipt));
    const comments = {
      childManifest: childManifestComment,
      childHandoff: childHandoffComment,
      childReceipt: childReceiptComment,
      parentReceipt: parentReceiptComment,
    };
    const report = {
      schemaVersion: 1,
      mode: 'MCL_REPOSITORY_IMPLEMENTATION_REPORT',
      packetRef: ctx.packetRef,
      childManifestId: child.manifestId,
      parentManifestId: ctx.parentManifest.manifestId,
      baseSha: child.observedBaseSha,
      observedCurrentMain: ctx.mainSha,
      commit: `commit:${commit}`,
      pr: `pr:#${pr.number}`,
      changedFiles: pr.changed,
      stageOwnerId: patchOwner.STAGE_OWNER_ID,
      mutationPrimitiveId: patchOwner.MUTATION_PRIMITIVE_ID,
      validationProfile: validationBinding.profile.profileId,
      validationProfileVersion: validationBinding.profile.profileVersion,
      validationContractDigest: validationBinding.profile.contractDigest,
      leaseReleasedGeneration: released.state.generation,
      comments,
      result: 'PASS',
      nextLegalAction: 'VALIDATION_MERGE',
      authority: {...FALSE_AUTHORITY},
    };
    const preReceipt = executionReceipt.projectExecutionReceipt({
      schemaVersion: 2,
      operationId: 'mcl-repository-implementation:' + child.manifestId,
      primitiveId: 'mcl:known-owner-repository-implementation:s',
      sourceIdentity: {kind: 'WORK_PACKET', locator: ctx.packetRef, identity: ctx.context.packetBodySha256},
      executionSurface: 'MCL:S', stage: 'IMPLEMENTATION_PR',
      executionLifecycle: 'FINISHED', attentionDisposition: 'COMPLETE', result: 'PASS',
      proofScope: 'BOUND_REPOSITORY_IMPLEMENTATION_PR',
      steps: [{name: 'coordination-convergence', result: 'PASS', evidenceLocator: commentUrl(ctx.packet, childReceiptComment)}],
      counters: [{name: 'changed_file_count', value: pr.changed.length}],
      affectedFiles: pr.changed,
      artifactLocators: [`commit:${commit}`, `pr:#${pr.number}`],
      reasonCodes: [], requiredUnknowns: [], conflicts: [], blockers: [],
      exitCode: 0, stderrTail: null, nextLegalAction: 'VALIDATION_MERGE',
    });
    const locators = persist(child, report, preReceipt);
    const receipt = buildStageReceipt({ctx, child, commit, pr, locators, comments});
    fs.writeFileSync(locators.receiptPath, JSON.stringify(receipt, null, 2) + '\n', {mode: 0o600});
    const view = agentDecisionView.projectAgentDecisionView({
      receipt,
      phase: 'IMPLEMENTATION_PR',
      output: {
        changedFileCount: pr.changed.length,
        stageOwner: patchOwner.STAGE_OWNER_ID,
        mutationPrimitive: patchOwner.MUTATION_PRIMITIVE_ID,
        validationProfile: validationBinding.profile.profileId,
        commit: `commit:${commit}`,
        pr: `pr:#${pr.number}`,
      },
      attention: [],
      receiptLocator: locators.receiptLocator,
      reportLocator: locators.reportLocator,
    });
    if (agentDecisionView.exitCodeFor(view) !== 0) fail('UNKNOWN', 'AGENT_VIEW_NOT_COMPLETE');
    await emitDetachedCheckpoint(checkpointSink, {
      checkpoint: 'FINISHED',
      primitiveId: 'MCL_REPOSITORY_IMPLEMENTATION_FINAL',
      targetIdentity: 'receipt:' + receipt.receiptDigest,
      evidenceLocator: locators.receiptLocator,
      nextPrimitive: null,
      finalReceiptDigest: receipt.receiptDigest,
      finalReceiptLocator: locators.receiptLocator,
    });
    return view;
  } finally {
    removeEvidenceFiles(evidenceFiles);
  }
}
function errorView(error, packetRef = 'UNKNOWN') {
  const kind = error instanceof ImplementationError ? error.kind : 'UNKNOWN';
  const reasons = error instanceof ImplementationError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
  const result = kind === 'CONFLICT' ? 'CONFLICT' : kind === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN';
  const receipt = executionReceipt.projectExecutionReceipt({
    schemaVersion: 2,
    operationId: 'mcl-repository-implementation:' + packetRef,
    primitiveId: 'mcl:known-owner-repository-implementation:s',
    sourceIdentity: {kind: 'WORK_PACKET', locator: packetRef, identity: 'UNKNOWN'},
    executionSurface: 'MCL:S', stage: 'IMPLEMENTATION_PR',
    executionLifecycle: 'FINISHED',
    attentionDisposition: kind === 'CONFLICT' ? 'CONFLICT' : kind === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
    result, proofScope: 'BOUND_REPOSITORY_IMPLEMENTATION_PR',
    steps: [{name: 'repository-implementation', result, evidenceLocator: packetRef}],
    counters: [], affectedFiles: [], artifactLocators: [packetRef],
    reasonCodes: reasons,
    requiredUnknowns: kind === 'UNKNOWN' ? reasons : [],
    conflicts: kind === 'CONFLICT' ? reasons : [],
    blockers: kind === 'BLOCKED' ? reasons : [],
    exitCode: 2, stderrTail: null, nextLegalAction: 'TARGETED_DRILL_DOWN',
  });
  return agentDecisionView.projectAgentDecisionView({
    receipt, phase: 'IMPLEMENTATION_PR', output: {}, attention: [],
    receiptLocator: packetRef, reportLocator: packetRef,
  });
}
function parseArgs(argv) {
  const allowed = new Set([
    'packet', 'parent-manifest-file', 'parent-handoff-file', 'request-file', 'patch-file',
    'validation-request-file', 'pr-request-file',
  ]);
  const values = {};
  let apply = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') { apply = true; continue; }
    if (!arg.startsWith('--') || i + 1 >= argv.length) fail('UNKNOWN', 'ARGUMENT_INVALID');
    const key = arg.slice(2);
    if (!allowed.has(key) || key in values) fail('UNKNOWN', 'ARGUMENT_UNSUPPORTED');
    values[key] = argv[++i];
  }
  if (!apply) fail('BLOCKED', 'EXPLICIT_APPLY_REQUIRED');
  for (const key of allowed) if (!values[key]) fail('UNKNOWN', 'ARGUMENT_REQUIRED:' + key);
  return values;
}
function createDetachedIpcCheckpointSink(processRef = process, timeoutMs = 15000) {
  if (typeof processRef.send !== 'function') fail('UNKNOWN', 'DETACHED_IPC_REQUIRED');
  let seq = 0;
  return (event) => new Promise((resolve, reject) => {
    const current = ++seq;
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      processRef.off('message', onMessage);
      if (error) reject(error); else resolve();
    };
    const onMessage = (message) => {
      if (!message || message.schema !== DETACHED_CHECKPOINT_ACK_SCHEMA
          || message.seq !== current) return;
      if (message.status === 'PASS') finish();
      else finish(new ImplementationError('BLOCKED',
        Array.isArray(message.reasonCodes) && message.reasonCodes.length
          ? message.reasonCodes : ['CONTINUITY_CHECKPOINT_PERSIST_FAILED']));
    };
    const timer = setTimeout(() => finish(new ImplementationError(
      'BLOCKED', ['CONTINUITY_CHECKPOINT_ACK_TIMEOUT'])), timeoutMs);
    processRef.on('message', onMessage);
    processRef.send({type: 'checkpoint', seq: current, event}, (error) => {
      if (error) finish(new ImplementationError(
        'BLOCKED', ['CONTINUITY_CHECKPOINT_IPC_FAILED']));
    });
  });
}

async function runCli(argv = process.argv.slice(2), deps = {}) {
  let packetRef = 'UNKNOWN';
  try {
    const args = parseArgs(argv);
    packetRef = args.packet;
    const parentManifestText = readRegular(args['parent-manifest-file'], 'PARENT_MANIFEST_FILE').toString('utf8');
    const parentHandoffText = readRegular(args['parent-handoff-file'], 'PARENT_HANDOFF_FILE').toString('utf8');
    const requestText = readRegular(args['request-file'], 'REQUEST_FILE').toString('utf8');
    const validationRequestText =
      readRegular(args['validation-request-file'], 'VALIDATION_REQUEST_FILE').toString('utf8');
    const prRequestText = readRegular(args['pr-request-file'], 'PR_REQUEST_FILE').toString('utf8');
    const ctx = await (deps.prepareLiveContext || prepareLiveContext)({
      packetRef, parentManifestText, parentHandoffText,
      env: deps.env || process.env,
      runner: deps.runner || stageEntry.runDefault,
      fetchImpl: deps.fetchImpl,
      spawnSyncImpl: deps.spawnSyncImpl,
    });
    return await executePrepared(ctx, {
      requestText, requestFile: args['request-file'], patchFile: args['patch-file'],
      validationRequestText, validationRequestFile: args['validation-request-file'],
      prRequestText,
    }, deps);
  } catch (error) {
    return errorView(error, packetRef);
  }
}
if (require.main === module) {
  const detachedWorker = process.env.MCL_DETACHED_FIXED_WORKER_V1 === '1';
  const deps = detachedWorker ? {checkpointSink: createDetachedIpcCheckpointSink(process)} : {};
  runCli(process.argv.slice(2), deps).then((view) => {
    process.stdout.write(JSON.stringify(view, null, 2) + '\n');
    process.exitCode = agentDecisionView.exitCodeFor(view);
  }).catch((error) => {
    process.stdout.write(JSON.stringify(errorView(error), null, 2) + '\n');
    process.exitCode = 2;
  });
}

module.exports = {
  FALSE_AUTHORITY,
  ImplementationError,
  PR_FIELDS,
  PR_SCHEMA,
  buildChildManifest,
  buildStageReceipt,
  createDetachedIpcCheckpointSink,
  emitDetachedCheckpoint,
  resolveValidationProfileBinding,
  commentUrl,
  changedBetween,
  errorView,
  exactComment,
  executePrepared,
  mainHealth,
  packetNumber,
  parseArgs,
  parseHandoffEnvelope,
  parsePrRequestText,
  pathScopes,
  prepareLiveContext,
  publishPr,
  readComments,
  renderHandoff,
  runCli,
  sha256,
};
