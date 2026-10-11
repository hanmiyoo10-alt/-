#!/usr/bin/env node
'use strict';
const childProcess = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../../../..');
const stageEntry = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/stage-entry/mcl-stage-entry.cjs'));
const taskHandoff = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs'));
const taskLease = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/task-lease.cjs'));
const finalizeRecovery = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation-finalize-recovery.cjs'));
const workspaceHolder = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/coordination/mcl-workspace-holder.cjs'));
const lOwner = require(path.join(
ROOT, 'products/chatgpt-mobile-coder-lab/device-ops/l-repository-owner/mcl-l-repository-owner.cjs'));
const prPreflight = require(path.join(
ROOT, '.github/plugin-control-plane/canonical-main/work-system/pr-authoring-preflight.cjs'));
const MODE = 'MCL_L_REPOSITORY_APPLY_COMPOSITION';
const REPO = 'hanmiyoo10-alt/-';
const LEDGER_ISSUE = 2352;
const MAX_MANIFEST_BYTES = 128 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_PR_REQUEST_BYTES = 16 * 1024;
const PAGE_SIZE = 100;
const MAX_COMMENT_PAGES = 20;
const PACKET_RE = /^#[1-9][0-9]*$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const ACTIVATION_FILE = 'mcl-l-repository-apply-composition.v1.json';
const ACTIVATION_MODE = 'MCL_L_REPOSITORY_APPLY_ACTIVATION';
const MAX_ACTIVATION_BYTES = 16 * 1024;
const FALSE_AUTHORITY = Object.freeze({
repositoryMutationAuthorized: false,
deviceMutationAuthorized: false,
mergeAuthorized: false,
releaseAuthorized: false,
productionAuthorized: false,
});
class CompositionError extends Error {
constructor(kind, reasonCodes) {
super(reasonCodes[0] || kind);
this.kind = kind;
this.reasonCodes = [...new Set(reasonCodes)].sort();
}
}
function output(status, reasonCodes = [], extras = {}) {
return {
schemaVersion: 1,
mode: MODE,
status,
reasonCodes: [...new Set(reasonCodes)].sort(),
...extras,
authority: {...FALSE_AUTHORITY},
};
}
function readRegular(filePath, field, maxBytes) {
const resolved = path.resolve(filePath);
let stat;
try { stat = fs.lstatSync(resolved); }
catch { throw new CompositionError('UNKNOWN', [field + '_READ_FAILED']); }
if (!stat.isFile() || stat.isSymbolicLink()) {
throw new CompositionError('UNKNOWN', [field + '_REGULAR_FILE_REQUIRED']);
}
if (stat.size > maxBytes) throw new CompositionError('UNKNOWN', [field + '_TOO_LARGE']);
return fs.readFileSync(resolved);
}
function parseArgs(argv = process.argv.slice(2)) {
if (!Array.isArray(argv) || !['apply', 'finalize'].includes(argv[0])) {
throw new CompositionError('UNKNOWN', ['COMMAND_UNSUPPORTED']);
}
const operation = argv[0];
const allowed = operation === 'apply'
? new Set(['packet', 'manifest', 'request', 'patch', 'pr-request'])
: new Set(['packet', 'manifest']);
const values = {};
let apply = false;
for (let index = 1; index < argv.length; index += 1) {
const token = argv[index];
if (token === '--apply') {
if (apply) throw new CompositionError('UNKNOWN', ['ARGUMENT_DUPLICATE:apply']);
apply = true;
continue;
}
if (!token.startsWith('--') || index + 1 >= argv.length) {
throw new CompositionError('UNKNOWN', ['ARGUMENT_INVALID']);
}
const key = token.slice(2);
if (!allowed.has(key) || Object.hasOwn(values, key)) {
throw new CompositionError('UNKNOWN', ['ARGUMENT_UNSUPPORTED_OR_DUPLICATE:' + key]);
}
values[key] = argv[++index];
}
if (!apply) throw new CompositionError('BLOCKED', ['APPLY_FLAG_REQUIRED']);
for (const key of allowed) {
if (!values[key]) throw new CompositionError('UNKNOWN', ['ARGUMENT_REQUIRED:' + key]);
}
if (!PACKET_RE.test(values.packet)) throw new CompositionError('UNKNOWN', ['PACKET_REF_INVALID']);
return {
operation,
packetRef: values.packet,
packetNumber: Number(values.packet.slice(1)),
manifestFile: values.manifest,
requestFile: values.request || null,
patchFile: values.patch || null,
prRequestFile: values['pr-request'] || null,
};
}
function parseManifest(text) {
const parsed = taskHandoff.parseManifest(text);
if (parsed.status !== 'VALID') {
throw new CompositionError(
parsed.status === 'CONFLICT' ? 'CONFLICT' : 'UNKNOWN',
parsed.reasonCodes || ['MANIFEST_INVALID']
);
}
try { lOwner.validateManifestShape(parsed.value); }
catch (error) {
throw new CompositionError(
error instanceof lOwner.OwnerError ? error.kind : 'UNKNOWN',
error instanceof lOwner.OwnerError ? error.reasonCodes : ['MANIFEST_L_OWNER_INVALID']
);
}
return parsed.value;
}
function listComments(packetNumber, runner = stageEntry.runDefault) {
const rows = [];
for (let page = 1; page <= MAX_COMMENT_PAGES; page += 1) {
const value = stageEntry.ghJson(
'repos/' + REPO + '/issues/' + packetNumber
+ '/comments?per_page=' + PAGE_SIZE + '&page=' + page,
runner
);
if (!Array.isArray(value)) throw new CompositionError('UNKNOWN', ['COMMENTS_INVALID']);
rows.push(...value);
if (value.length < PAGE_SIZE) return rows;
}
throw new CompositionError('UNKNOWN', ['COMMENTS_PAGINATION_BOUND']);
}
function exactCommentState(comments, text) {
const target = String(text).trim();
const matches = comments.filter((row) =>
typeof row?.body === 'string' && row.body.trim() === target);
return {
count: matches.length,
commentId: matches.length === 1 && Number.isSafeInteger(matches[0]?.id)
? matches[0].id : null,
};
}
function exactCompletionState(comments, text) {
const target = String(text).trim();
const ids = comments
.filter((row) => typeof row?.body === 'string' && row.body.trim() === target)
.map((row) => row?.id)
.filter((id) => Number.isSafeInteger(id))
.sort((a, b) => a - b);
return {
count: ids.length,
commentId: ids.length ? ids[0] : null,
};
}
function stable(value) {
if (Array.isArray(value)) return value.map(stable);
if (!value || typeof value !== 'object') return value;
return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function sha256Json(value) {
return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function activationCore({
manifest, manifestCommentId, owner, prRequest,
releaseGeneration = null, releaseEvidenceRef = null,
}) {
return {
schemaVersion: 1,
mode: ACTIVATION_MODE,
manifestId: manifest.manifestId,
manifestPayloadSha256: manifest.payloadSha256,
manifestCommentId,
packetRef: manifest.packetRef,
packetBodySha256: manifest.packetBodySha256,
leaseId: manifest.leaseEvidence.leaseId,
acquiredGeneration: manifest.leaseEvidence.acquiredGeneration,
branch: manifest.workspace.branch,
worktree: manifest.workspace.worktree,
observedBaseSha: manifest.observedBaseSha,
commit: owner.new_head,
prNumber: owner.pr_number,
prTitle: prRequest.title,
prBody: prRequest.body,
releaseGeneration,
releaseEvidenceRef,
};
}
function buildActivation(input) {
const core = activationCore(input);
return {...core, recordDigest: sha256Json(core)};
}
function normalizeActivation(value, manifest) {
const keys = new Set([
'schemaVersion', 'mode', 'manifestId', 'manifestPayloadSha256', 'manifestCommentId',
'packetRef', 'packetBodySha256', 'leaseId', 'acquiredGeneration', 'branch', 'worktree',
'observedBaseSha', 'commit', 'prNumber', 'prTitle', 'prBody',
'releaseGeneration', 'releaseEvidenceRef', 'recordDigest',
]);
if (!value || typeof value !== 'object' || Array.isArray(value)
|| Object.keys(value).some((key) => !keys.has(key))
|| Object.keys(value).length !== keys.size) {
throw new CompositionError('CONFLICT', ['ACTIVATION_SCHEMA_INVALID']);
}
if (value.schemaVersion !== 1 || value.mode !== ACTIVATION_MODE
|| !SHA256_RE.test(value.manifestId || '')
|| !SHA256_RE.test(value.manifestPayloadSha256 || '')
|| !Number.isSafeInteger(value.manifestCommentId)
|| !PACKET_RE.test(value.packetRef || '')
|| !SHA256_RE.test(value.packetBodySha256 || '')
|| !SHA256_RE.test(value.leaseId || '')
|| !Number.isSafeInteger(value.acquiredGeneration)
|| typeof value.branch !== 'string' || typeof value.worktree !== 'string'
|| !SHA40_RE.test(value.observedBaseSha || '')
|| !SHA40_RE.test(value.commit || '')
|| !Number.isSafeInteger(value.prNumber)
|| typeof value.prTitle !== 'string' || typeof value.prBody !== 'string'
|| !(value.releaseGeneration === null || Number.isSafeInteger(value.releaseGeneration))
|| !(value.releaseEvidenceRef === null || typeof value.releaseEvidenceRef === 'string')
|| !SHA256_RE.test(value.recordDigest || '')) {
throw new CompositionError('CONFLICT', ['ACTIVATION_FIELD_INVALID']);
}
const core = {...value};
delete core.recordDigest;
if (sha256Json(core) !== value.recordDigest) {
throw new CompositionError('CONFLICT', ['ACTIVATION_DIGEST_CONFLICT']);
}
for (const [field, expected] of [
['manifestId', manifest.manifestId],
['manifestPayloadSha256', manifest.payloadSha256],
['packetRef', manifest.packetRef],
['packetBodySha256', manifest.packetBodySha256],
['leaseId', manifest.leaseEvidence.leaseId],
['acquiredGeneration', manifest.leaseEvidence.acquiredGeneration],
['branch', manifest.workspace.branch],
['worktree', manifest.workspace.worktree],
['observedBaseSha', manifest.observedBaseSha],
]) {
if (value[field] !== expected) {
throw new CompositionError('CONFLICT', ['ACTIVATION_MANIFEST_CONFLICT:' + field]);
}
}
return value;
}
function activationPath(manifest) {
const inspected = workspaceHolder.inspectWorkspace(manifest);
if (!inspected?.ok || !inspected.holderPath) {
throw new CompositionError('BLOCKED', [
'ACTIVATION_WORKSPACE_INVALID',
...(inspected?.reasonCodes || []),
]);
}
return path.join(path.dirname(inspected.holderPath), ACTIVATION_FILE);
}
function defaultWriteActivation(manifest, value) {
const normalized = normalizeActivation(value, manifest);
const file = activationPath(manifest);
const tmp = file + '.tmp';
try { fs.unlinkSync(tmp); } catch (_) {}
fs.writeFileSync(tmp, JSON.stringify(normalized) + '\n', {mode: 0o600, flag: 'wx'});
fs.chmodSync(tmp, 0o600);
fs.renameSync(tmp, file);
fs.chmodSync(file, 0o600);
return normalized;
}
function defaultReadActivation(manifest) {
const file = activationPath(manifest);
let stat;
try { stat = fs.lstatSync(file); }
catch { throw new CompositionError('BLOCKED', ['ACTIVATION_MISSING']); }
if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_ACTIVATION_BYTES) {
throw new CompositionError('CONFLICT', ['ACTIVATION_FILE_INVALID']);
}
let value;
try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch { throw new CompositionError('CONFLICT', ['ACTIVATION_JSON_INVALID']); }
return normalizeActivation(value, manifest);
}
function defaultRemoveActivation(manifest) {
const file = activationPath(manifest);
try { fs.unlinkSync(file); }
catch (error) {
if (error.code !== 'ENOENT') {
throw new CompositionError('BLOCKED', ['ACTIVATION_REMOVE_FAILED']);
}
}
}
function gitRead(worktree, args) {
const env = {...process.env};
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR']) delete env[key];
const result = childProcess.spawnSync('git', ['-C', worktree, ...args], {
encoding: 'utf8', shell: false, env,
});
if (result.status !== 0 || result.error || result.signal) {
throw new CompositionError('UNKNOWN', ['PUBLISHED_GIT_READ_FAILED']);
}
return String(result.stdout || '').trim();
}
function defaultReadPublished(manifest, activation, runner = stageEntry.runDefault) {
const inspected = workspaceHolder.inspectWorkspace(manifest);
if (!inspected?.ok || !inspected.holderPath) {
throw new CompositionError('BLOCKED', [
'PUBLISHED_WORKSPACE_INVALID',
...(inspected?.reasonCodes || []),
]);
}
const holder = workspaceHolder.readHolder(inspected.holderPath);
if (!holder.missing) {
throw new CompositionError('BLOCKED', [
'HOLDER_NOT_ABSENT_FOR_FINALIZE',
...(holder.reasonCodes || []),
]);
}
const top = gitRead(manifest.workspace.worktree, ['rev-parse', '--show-toplevel']);
const branch = gitRead(manifest.workspace.worktree, ['branch', '--show-current']);
const head = gitRead(manifest.workspace.worktree, ['rev-parse', 'HEAD']);
const dirty = gitRead(manifest.workspace.worktree, ['status', '--porcelain=v1', '-uall']);
if (top !== manifest.workspace.worktree || branch !== manifest.workspace.branch
|| head !== activation.commit || dirty) {
throw new CompositionError('CONFLICT', ['PUBLISHED_LOCAL_IDENTITY_CONFLICT']);
}
const ref = stageEntry.ghJson(
'repos/' + REPO + '/git/ref/heads/' + manifest.workspace.branch, runner);
if (ref?.object?.sha !== activation.commit) {
throw new CompositionError('CONFLICT', ['PUBLISHED_REMOTE_HEAD_CONFLICT']);
}
const pr = stageEntry.ghJson('repos/' + REPO + '/pulls/' + activation.prNumber, runner);
if (!pr || pr.state !== 'open' || pr.draft !== false
|| pr.head?.ref !== manifest.workspace.branch
|| pr.head?.sha !== activation.commit
|| pr.base?.ref !== 'main'
|| pr.title !== activation.prTitle
|| pr.body !== activation.prBody) {
throw new CompositionError('CONFLICT', ['PUBLISHED_PR_IDENTITY_CONFLICT']);
}
return {ok: true, commit: activation.commit, prNumber: activation.prNumber};
}
function parseOwnerResult(value) {
if (!value || typeof value !== 'object' || Array.isArray(value)) {
throw new CompositionError('UNKNOWN', ['L_OWNER_RESULT_INVALID']);
}
if (!['PASS', 'BLOCKED', 'CONFLICT', 'UNKNOWN', 'PREPARED'].includes(value.status)) {
throw new CompositionError('UNKNOWN', ['L_OWNER_STATUS_INVALID']);
}
return value;
}
function parseOwnerCliResult(result) {
if (!result || typeof result.text !== 'string') {
throw new CompositionError('UNKNOWN', ['L_OWNER_CLI_RESULT_INVALID']);
}
let value;
try { value = JSON.parse(result.text); }
catch { throw new CompositionError('UNKNOWN', ['L_OWNER_CLI_JSON_INVALID']); }
return {code: result.code, value: parseOwnerResult(value)};
}
function writeEvidenceFiles({
manifestText, ledgerBody, packetBody, request, patchBytes, prRequest,
}, tempRoot = null) {
const dir = fs.mkdtempSync(path.join(tempRoot || os.tmpdir(), 'mcl-l-apply-'));
const manifestPath = path.join(dir, 'manifest.md');
const ledgerPath = path.join(dir, 'ledger.md');
const packetPath = path.join(dir, 'packet.md');
const requestPath = path.join(dir, 'request.json');
const patchPath = path.join(dir, 'patch.diff');
const prRequestPath = path.join(dir, 'pr-request.json');
fs.writeFileSync(manifestPath, manifestText, {mode: 0o600});
fs.writeFileSync(ledgerPath, ledgerBody, {mode: 0o600});
fs.writeFileSync(packetPath, packetBody, {mode: 0o600});
fs.writeFileSync(requestPath, JSON.stringify(request), {mode: 0o600});
fs.writeFileSync(patchPath, patchBytes, {mode: 0o600});
fs.writeFileSync(prRequestPath, JSON.stringify(prRequest), {mode: 0o600});
return {
dir, manifestPath, ledgerPath, packetPath, requestPath, patchPath, prRequestPath,
};
}
function updateEvidenceFiles(files, ledgerBody, packetBody) {
fs.writeFileSync(files.ledgerPath, ledgerBody, {mode: 0o600});
fs.writeFileSync(files.packetPath, packetBody, {mode: 0o600});
}
function refreshLiveBinding({args, manifest, manifestText, files, deps}) {
const current = deps.readCurrent(args.packetNumber);
const comments = deps.readComments(args.packetNumber);
const binding = requireLiveBinding({
packetRef: args.packetRef,
manifest,
manifestText,
issue: current.issue,
ledger: current.ledger,
comments,
deps,
});
updateEvidenceFiles(files, current.ledger.body, current.issue.body);
return binding;
}
function removeEvidenceFiles(files) {
try { fs.rmSync(files.dir, {recursive: true, force: true}); } catch (_) {}
}
function defaultReadCurrent(packetNumber, runner = stageEntry.runDefault) {
const issue = stageEntry.ghJson('repos/' + REPO + '/issues/' + packetNumber, runner);
const ledger = stageEntry.ghJson('repos/' + REPO + '/issues/' + LEDGER_ISSUE, runner);
return {issue, ledger};
}
function defaultDeps(overrides = {}) {
const runner = overrides.runner || stageEntry.runDefault;
return {
runner,
readCurrent: overrides.readCurrent || ((packetNumber) => defaultReadCurrent(packetNumber, runner)),
readComments: overrides.readComments || ((packetNumber) => listComments(packetNumber, runner)),
postComment: overrides.postComment || ((packetNumber, body) =>
stageEntry.postComment(packetNumber, body, runner)),
releaseLease: overrides.releaseLease || ((packetRef, leaseId) =>
stageEntry.releaseRepositoryLease({packetRef}, leaseId, runner)),
validateEvidence: overrides.validateEvidence || workspaceHolder.validateEvidence,
claimHolder: overrides.claimHolder || workspaceHolder.claimHolder,
checkHolder: overrides.checkHolder || workspaceHolder.checkHolder,
releaseHolder: overrides.releaseHolder || workspaceHolder.releaseHolder,
ownerRunCli: overrides.ownerRunCli || lOwner.runCli,
preflight: overrides.preflight || prPreflight.classifyNonClosingPrAuthoring,
buildCompletionReceipt: overrides.buildCompletionReceipt || taskHandoff.buildCompletionReceipt,
renderCompletionReceipt: overrides.renderCompletionReceipt || taskHandoff.renderCompletionReceipt,
writeActivation: overrides.writeActivation || defaultWriteActivation,
readActivation: overrides.readActivation || defaultReadActivation,
removeActivation: overrides.removeActivation || defaultRemoveActivation,
readPublished: overrides.readPublished || ((manifest, activation) =>
defaultReadPublished(manifest, activation, runner)),
historicalReleaseEvidence: overrides.historicalReleaseEvidence
|| ((leaseId, acquiredGeneration) =>
finalizeRecovery.historicalReleaseEvidence(leaseId, acquiredGeneration, runner)),
tempRoot: overrides.tempRoot || null,
};
}
function requireBinding({
packetRef, manifest, manifestText, issue, ledger, comments, deps, requireActiveLease,
}) {
if (!issue || issue.pull_request || issue.state !== 'open' || typeof issue.body !== 'string') {
throw new CompositionError('BLOCKED', ['PACKET_NOT_OPEN']);
}
if (!ledger || typeof ledger.body !== 'string') {
throw new CompositionError('UNKNOWN', ['LEDGER_READ_INVALID']);
}
if (manifest.packetRef !== packetRef) {
throw new CompositionError('CONFLICT', ['MANIFEST_PACKET_CONFLICT']);
}
const exact = exactCommentState(comments, manifestText);
if (exact.count === 0) throw new CompositionError('UNKNOWN', ['MANIFEST_COMMENT_MISSING']);
if (exact.count !== 1 || exact.commentId === null) {
throw new CompositionError('CONFLICT', ['MANIFEST_COMMENT_AMBIGUOUS']);
}
const checked = deps.validateEvidence({
manifest,
ledgerBody: ledger.body,
packetBody: issue.body,
requireActiveLease,
});
if (!checked?.ok) {
throw new CompositionError('BLOCKED', [
'COORDINATION_EVIDENCE_INVALID',
...(checked?.reasonCodes || []),
]);
}
return {manifestCommentId: exact.commentId, state: checked.state};
}
function requireLiveBinding(input) {
return requireBinding({...input, requireActiveLease: true});
}
function requireReleasedBinding(input) {
return requireBinding({...input, requireActiveLease: false});
}
function preflightRequest({packetRef, requestText, prRequestText, manifest}) {
let request;
let prRequest;
try {
request = lOwner.parseRequestText(requestText);
prRequest = lOwner.parsePrRequestText(prRequestText, packetRef);
} catch (error) {
throw new CompositionError(
error instanceof lOwner.OwnerError ? error.kind : 'UNKNOWN',
error instanceof lOwner.OwnerError ? error.reasonCodes : ['REQUEST_INVALID']
);
}
if (request.packet_ref !== packetRef) {
throw new CompositionError('CONFLICT', ['REQUEST_PACKET_CONFLICT']);
}
const scopedPaths = lOwner.manifestPathScopes(manifest);
if (JSON.stringify(request.expected_paths) !== JSON.stringify(scopedPaths)) {
throw new CompositionError('CONFLICT', ['REQUEST_SCOPE_CONFLICT']);
}
const preflight = prPreflight.classifyNonClosingPrAuthoring({
packetRef,
title: prRequest.title,
body: prRequest.body,
});
if (preflight.disposition !== 'PASS') {
throw new CompositionError(
preflight.disposition === 'BLOCKED' ? 'BLOCKED' : 'UNKNOWN',
preflight.reasonCodes || ['PR_AUTHORING_PREFLIGHT_FAILED']
);
}
return {request, prRequest};
}
function callOwnerCli(argv, env, deps) {
try {
return parseOwnerCliResult(deps.ownerRunCli(argv, env));
} catch (error) {
if (!(error instanceof lOwner.OwnerError)) throw error;
const status = ['BLOCKED', 'CONFLICT', 'UNKNOWN'].includes(error.kind)
? error.kind : 'UNKNOWN';
return {
code: status === 'UNKNOWN' ? 3 : 2,
value: {
status,
reason_codes: [...(error.reasonCodes || [])],
next_legal_action: 'TARGETED_RECOVERY_REQUIRED',
},
};
}
}
function invokeOwnerApply({files, claim, deps}) {
const env = {...process.env, [workspaceHolder.CLAIM_ENV]: claim};
return callOwnerCli([
'apply',
'--manifest', files.manifestPath,
'--ledger', files.ledgerPath,
'--packet', files.packetPath,
'--request', files.requestPath,
'--patch', files.patchPath,
'--pr-request', files.prRequestPath,
'--apply',
], env, deps);
}
function inspectPrepared(files, deps) {
const parsed = callOwnerCli([
'inspect',
'--manifest', files.manifestPath,
'--ledger', files.ledgerPath,
'--packet', files.packetPath,
], process.env, deps);
if (parsed.code !== 0 || parsed.value.status !== 'PASS') {
throw new CompositionError(
parsed.value.status === 'CONFLICT' ? 'CONFLICT'
: parsed.value.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
parsed.value.reason_codes || ['L_OWNER_INSPECT_FAILED']
);
}
if (parsed.value.workspace_state !== 'PREPARED') {
throw new CompositionError('BLOCKED', ['WORKSPACE_NOT_PREPARED']);
}
if (parsed.value.holder_state !== 'ABSENT') {
throw new CompositionError('BLOCKED', ['HOLDER_NOT_ABSENT_BEFORE_COMPOSITION']);
}
return parsed.value;
}
function completionBody({manifest, owner, release, deps}) {
const releaseGeneration = release?.value?.observedGeneration;
if (!Number.isSafeInteger(releaseGeneration)
|| releaseGeneration <= manifest.leaseEvidence.acquiredGeneration) {
throw new CompositionError('BLOCKED', ['D013_RELEASE_GENERATION_INVALID']);
}
const receipt = deps.buildCompletionReceipt(manifest, {
disposition: 'COMPLETE',
outputRefs: [
'commit:' + owner.new_head,
'pr:#' + owner.pr_number,
],
validationRefs: [
'pr:#' + owner.pr_number,
'receipt:mcl-l-repository-owner:apply:' + manifest.manifestId,
'receipt:canonical-pr-authoring-preflight:pass',
],
observedRefs: [
'commit:' + manifest.observedBaseSha,
'commit:' + owner.new_head,
'pr:#' + owner.pr_number,
],
leaseDisposition: 'RELEASED',
leaseReleaseEvidence: {
ledgerRef: '#2352',
leaseId: manifest.leaseEvidence.leaseId,
releasedGeneration: releaseGeneration,
evidenceRef: release.value.evidenceRef,
},
workspaceResult: 'clean',
blockerRefs: [],
requiredUnknownRefs: [],
});
return {receipt, text: deps.renderCompletionReceipt(receipt)};
}
function postCompletionOnce(packetNumber, receiptText, deps) {
const before = exactCompletionState(deps.readComments(packetNumber), receiptText);
if (before.count >= 1 && before.commentId !== null) return before.commentId;
let commentId = null;
try {
commentId = deps.postComment(packetNumber, receiptText);
} catch (_) {
const recovered = exactCompletionState(deps.readComments(packetNumber), receiptText);
if (recovered.count >= 1 && recovered.commentId !== null) return recovered.commentId;
throw new CompositionError('UNKNOWN', ['COMPLETION_COMMENT_WRITE_UNPROVEN']);
}
if (!Number.isSafeInteger(commentId)) {
throw new CompositionError('UNKNOWN', ['COMPLETION_COMMENT_WRITE_UNPROVEN']);
}
const after = exactCompletionState(deps.readComments(packetNumber), receiptText);
if (after.count < 1 || after.commentId === null) {
throw new CompositionError('UNKNOWN', ['COMPLETION_COMMENT_READBACK_FAILED']);
}
return after.commentId;
}
function recoverReleaseActivation({args, manifest, manifestText, activation, deps}) {
let normalized = normalizeActivation(activation, manifest);
const hasRelease = Number.isSafeInteger(normalized.releaseGeneration)
&& normalized.releaseGeneration > manifest.leaseEvidence.acquiredGeneration
&& typeof normalized.releaseEvidenceRef === 'string'
&& normalized.releaseEvidenceRef.length > 0;
if (hasRelease) return normalized;
const current = deps.readCurrent(args.packetNumber);
const binding = requireReleasedBinding({
packetRef: args.packetRef,
manifest,
manifestText,
issue: current.issue,
ledger: current.ledger,
comments: deps.readComments(args.packetNumber),
deps,
});
if (binding.manifestCommentId !== normalized.manifestCommentId) {
throw new CompositionError('CONFLICT', ['FINALIZE_MANIFEST_COMMENT_CONFLICT']);
}
const parsed = taskLease.parseLedger(current.ledger.body || '');
if (!parsed.ok) {
throw new CompositionError('UNKNOWN', [
'FINALIZE_LEDGER_INVALID',
...(parsed.reasonCodes || []),
]);
}
if (parsed.state.activeLeases.some((row) => row.leaseId === normalized.leaseId)) {
throw new CompositionError('BLOCKED', ['FINALIZE_LEASE_STILL_ACTIVE']);
}
let releaseGeneration = null;
let releaseEvidenceRef = null;
if (parsed.state.lastRelease?.leaseId === normalized.leaseId
&& Number.isSafeInteger(parsed.state.lastRelease.releasedAtGeneration)
&& parsed.state.lastRelease.releasedAtGeneration > normalized.acquiredGeneration) {
releaseGeneration = parsed.state.lastRelease.releasedAtGeneration;
releaseEvidenceRef = 'receipt:mcl-task-lease-readback:release:'
+ normalized.leaseId + ':generation:' + releaseGeneration;
} else {
const historical = deps.historicalReleaseEvidence(
normalized.leaseId, normalized.acquiredGeneration);
if (!historical || !Number.isSafeInteger(historical.runId)
|| !Number.isSafeInteger(historical.generation)
|| historical.generation <= normalized.acquiredGeneration) {
throw new CompositionError('BLOCKED', ['D013_RELEASE_NOT_PROVEN']);
}
releaseGeneration = historical.generation;
releaseEvidenceRef = 'run:' + historical.runId;
}
if (!Number.isSafeInteger(binding.state?.generation)
|| binding.state.generation < releaseGeneration) {
throw new CompositionError('BLOCKED', ['D013_RELEASE_READBACK_STALE']);
}
normalized = buildActivation({
manifest,
manifestCommentId: normalized.manifestCommentId,
owner: {new_head: normalized.commit, pr_number: normalized.prNumber},
prRequest: {title: normalized.prTitle, body: normalized.prBody},
releaseGeneration,
releaseEvidenceRef,
});
deps.writeActivation(manifest, normalized);
return normalized;
}
function releasedReadback({
args, manifest, manifestText, deps, releaseGeneration,
}) {
const current = deps.readCurrent(args.packetNumber);
const binding = requireReleasedBinding({
packetRef: args.packetRef,
manifest,
manifestText,
issue: current.issue,
ledger: current.ledger,
comments: deps.readComments(args.packetNumber),
deps,
});
if (!Number.isSafeInteger(binding.state?.generation)
|| binding.state.generation < releaseGeneration) {
throw new CompositionError('BLOCKED', ['D013_RELEASE_READBACK_STALE']);
}
return binding;
}
function finalizeFromActivation({args, manifest, manifestText, activation, deps}) {
const normalized = recoverReleaseActivation({
args, manifest, manifestText, activation, deps,
});
const binding = releasedReadback({
args,
manifest,
manifestText,
deps,
releaseGeneration: normalized.releaseGeneration,
});
if (binding.manifestCommentId !== normalized.manifestCommentId) {
throw new CompositionError('CONFLICT', ['FINALIZE_MANIFEST_COMMENT_CONFLICT']);
}
const completion = completionBody({
manifest,
owner: {new_head: normalized.commit, pr_number: normalized.prNumber},
release: {
value: {
observedGeneration: normalized.releaseGeneration,
evidenceRef: normalized.releaseEvidenceRef,
},
},
deps,
});
const existing = exactCompletionState(
deps.readComments(args.packetNumber), completion.text);
if (existing.count >= 1 && existing.commentId !== null) {
return output('PASS', [], {
packetRef: args.packetRef,
manifestId: manifest.manifestId,
manifestCommentId: normalized.manifestCommentId,
commit: normalized.commit,
prNumber: normalized.prNumber,
completionReceiptId: completion.receipt.receiptId,
completionCommentId: existing.commentId,
releaseEvidenceRef: normalized.releaseEvidenceRef,
nextLegalAction: 'VALIDATION_MERGE',
});
}
deps.readPublished(manifest, normalized);
const completionCommentId = postCompletionOnce(args.packetNumber, completion.text, deps);
return output('PASS', [], {
packetRef: args.packetRef,
manifestId: manifest.manifestId,
manifestCommentId: normalized.manifestCommentId,
commit: normalized.commit,
prNumber: normalized.prNumber,
completionReceiptId: completion.receipt.receiptId,
completionCommentId,
releaseEvidenceRef: normalized.releaseEvidenceRef,
nextLegalAction: 'VALIDATION_MERGE',
});
}
function executeFinalize(args, depsInput = {}) {
const deps = defaultDeps(depsInput);
const manifestText = readRegular(
args.manifestFile, 'MANIFEST_FILE', MAX_MANIFEST_BYTES).toString('utf8');
const manifest = parseManifest(manifestText);
const activation = deps.readActivation(manifest);
return finalizeFromActivation({args, manifest, manifestText, activation, deps});
}
function executeComposition(args, depsInput = {}) {
const deps = defaultDeps(depsInput);
const manifestText = readRegular(args.manifestFile, 'MANIFEST_FILE', MAX_MANIFEST_BYTES).toString('utf8');
const requestText = readRegular(args.requestFile, 'REQUEST_FILE', MAX_REQUEST_BYTES).toString('utf8');
const patchBytes = readRegular(args.patchFile, 'PATCH_FILE', lOwner.MAX_PATCH_BYTES);
const prRequestText = readRegular(
args.prRequestFile, 'PR_REQUEST_FILE', MAX_PR_REQUEST_BYTES).toString('utf8');
const manifest = parseManifest(manifestText);
const {request, prRequest} = preflightRequest({
packetRef: args.packetRef,
requestText,
prRequestText,
manifest,
});
if (lOwner.sha256Bytes(patchBytes) !== request.patch_sha256) {
throw new CompositionError('CONFLICT', ['PATCH_SHA_CONFLICT']);
}
const current = deps.readCurrent(args.packetNumber);
const comments = deps.readComments(args.packetNumber);
let binding = requireLiveBinding({
packetRef: args.packetRef,
manifest,
manifestText,
issue: current.issue,
ledger: current.ledger,
comments,
deps,
});
const files = writeEvidenceFiles({
manifestText,
ledgerBody: current.ledger.body,
packetBody: current.issue.body,
request,
patchBytes,
prRequest,
}, deps.tempRoot);
let claim = null;
try {
inspectPrepared(files, deps);
binding = refreshLiveBinding({args, manifest, manifestText, files, deps});
const claimed = deps.claimHolder(files);
if (claimed?.result?.status !== 'CLAIMED'
|| typeof claimed.claim !== 'string') {
const capability = claimed?.secret;
if (claimed?.result?.status !== 'CLAIMED' || typeof capability !== 'string') {
throw new CompositionError('BLOCKED', [
...(claimed?.result?.reasonCodes || ['HOLDER_CLAIM_FAILED']),
]);
}
claim = capability;
} else {
claim = claimed.claim;
}
binding = refreshLiveBinding({args, manifest, manifestText, files, deps});
const checked = deps.checkHolder(files, claim);
if (checked?.status !== 'CHECK_PASS') {
throw new CompositionError('BLOCKED', [
...(checked?.reasonCodes || ['HOLDER_CHECK_FAILED']),
]);
}
const ownerRun = invokeOwnerApply({
files,
claim,
deps,
});
const owner = ownerRun.value;
if (ownerRun.code !== 0 || owner.status !== 'PASS') {
return output(
owner.status === 'CONFLICT' ? 'CONFLICT'
: owner.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
owner.reason_codes || ['L_OWNER_APPLY_NOT_PASS'],
{
packetRef: args.packetRef,
manifestId: manifest.manifestId,
nextLegalAction: owner.next_legal_action || 'TARGETED_RECOVERY_REQUIRED',
}
);
}
if (!SHA40_RE.test(owner.new_head || '') || !Number.isSafeInteger(owner.pr_number)) {
throw new CompositionError('CONFLICT', ['L_OWNER_SUCCESS_IDENTITY_INVALID']);
}
let activation = buildActivation({
manifest,
manifestCommentId: binding.manifestCommentId,
owner,
prRequest,
});
deps.writeActivation(manifest, activation);
const beforeRelease = deps.checkHolder(files, claim);
if (beforeRelease?.status !== 'CHECK_PASS') {
throw new CompositionError('BLOCKED', [
...(beforeRelease?.reasonCodes || ['HOLDER_CHECK_BEFORE_D013_RELEASE_FAILED']),
]);
}
const release = deps.releaseLease(args.packetRef, manifest.leaseEvidence.leaseId);
if (!release?.ok || typeof release?.value?.evidenceRef !== 'string'
|| !Number.isSafeInteger(release?.value?.observedGeneration)) {
throw new CompositionError('BLOCKED', ['D013_RELEASE_NOT_PROVEN']);
}
const after = deps.readCurrent(args.packetNumber);
updateEvidenceFiles(files, after.ledger.body || '', after.issue.body || '');
const released = deps.validateEvidence({
manifest,
ledgerBody: after.ledger.body || '',
packetBody: after.issue.body || '',
requireActiveLease: false,
});
if (!released?.ok || !Number.isSafeInteger(released?.state?.generation)) {
throw new CompositionError('BLOCKED', [
'D013_RELEASE_READBACK_INVALID',
...(released?.reasonCodes || []),
]);
}
if (released.state.generation < release.value.observedGeneration) {
throw new CompositionError('BLOCKED', ['D013_RELEASE_READBACK_STALE']);
}
activation = buildActivation({
manifest,
manifestCommentId: binding.manifestCommentId,
owner,
prRequest,
releaseGeneration: release.value.observedGeneration,
releaseEvidenceRef: release.value.evidenceRef,
});
deps.writeActivation(manifest, activation);
const holderRelease = deps.releaseHolder(files, claim);
if (holderRelease?.status !== 'RELEASED') {
throw new CompositionError('BLOCKED', [
...(holderRelease?.reasonCodes || ['HOLDER_RELEASE_FAILED']),
]);
}
return finalizeFromActivation({
args,
manifest,
manifestText,
activation,
deps,
});
} finally {
claim = null;
removeEvidenceFiles(files);
}
}
function exitCodeFor(status) {
if (status === 'PASS') return 0;
if (status === 'UNKNOWN') return 3;
return 2;
}
function runCli(argv = process.argv.slice(2), deps = {}) {
try {
const args = parseArgs(argv);
const result = args.operation === 'finalize'
? executeFinalize(args, deps)
: executeComposition(args, deps);
return {code: exitCodeFor(result.status), text: JSON.stringify(result) + '\n'};
} catch (error) {
const kind = error instanceof CompositionError ? error.kind : 'UNKNOWN';
const reasons = error instanceof CompositionError ? error.reasonCodes : ['UNEXPECTED_ERROR'];
const result = output(kind, reasons, {nextLegalAction: 'TARGETED_DRILLDOWN_REQUIRED'});
return {code: exitCodeFor(kind), text: JSON.stringify(result) + '\n'};
}
}
if (require.main === module) {
const {code, text} = runCli();
process.stdout.write(text);
process.exitCode = code;
}
module.exports = {
FALSE_AUTHORITY,
MODE,
CompositionError,
activationCore,
buildActivation,
completionBody,
defaultDeps,
defaultReadActivation,
defaultReadPublished,
defaultRemoveActivation,
defaultWriteActivation,
exactCommentState,
executeComposition,
executeFinalize,
finalizeFromActivation,
exitCodeFor,
inspectPrepared,
listComments,
output,
parseArgs,
parseManifest,
parseOwnerCliResult,
postCompletionOnce,
preflightRequest,
requireBinding,
requireLiveBinding,
requireReleasedBinding,
runCli,
};
