#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const REPO = 'hanmiyoo10-alt/-';
const MODE = 'CANONICAL_MAIN_CODEX_DEGRADED_REVIEW';
const MARKER = 'canonical-main-codex-degraded-review:v1';
const LOCAL_MARKER = 'canonical-main-local-codex-review:v1';
const RECOVERY = 'canonical-main-codex-review-recovery:v1';
const CWD = '/home/alsl0/nyang-repo';
const INSTRUCTION = 'Perform a bug review of this commit. Include normal review prose, then emit exactly one machine marker: <!-- canonical-main-local-codex-review:v1 {"schemaVersion":1,"result":"CLEAR","findingsCount":0} --> or use result FINDINGS with a positive integer findingsCount (maximum 10000).';
const KEYS = ['schemaVersion', 'mode', 'repository', 'prNumber', 'headSha', 'baseSha', 'codexCliVersion', 'provider', 'model', 'result', 'findingsCount', 'reportSha256', 'recoveryMarkerCommentId', 'receiptDigest'];
const sha = (v, n = 40) => typeof v === 'string' && new RegExp('^[0-9a-f]{' + n + '}$').test(v);
const positive = (v) => Number.isSafeInteger(v) && v > 0;
const bounded = (v) => typeof v === 'string' && v.length > 0 && v.length <= 200 && !/[\x00-\x1f\x7f]/.test(v);
const exact = (v, keys) => v && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(Object.keys(v).sort()) === JSON.stringify([...keys].sort());
const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
function fail(kind, code) { const e = new Error(code); e.kind = kind; e.reasonCodes = [code]; throw e; }
function digestReceipt(value) {
  return hash(JSON.stringify(KEYS.filter((k) => k !== 'receiptDigest').map((k) => [k, value[k]])));
}
function validResult(v) {
  return (v.result === 'CLEAR' && v.findingsCount === 0)
    || (v.result === 'FINDINGS' && positive(v.findingsCount) && v.findingsCount <= 10000)
    || (['FAILED', 'UNKNOWN'].includes(v.result) && v.findingsCount === null);
}
function validateReceipt(v) {
  if (!exact(v, KEYS) || v.schemaVersion !== 1 || v.mode !== MODE || v.repository !== REPO
      || !positive(v.prNumber) || !sha(v.headSha) || !sha(v.baseSha)
      || !['codexCliVersion', 'provider', 'model'].every((k) => bounded(v[k]))
      || (['CLEAR', 'FINDINGS'].includes(v.result)
        && ['codexCliVersion', 'provider', 'model'].some((k) => v[k] === 'UNOBSERVED'))
      || !validResult(v) || !sha(v.reportSha256, 64) || !positive(v.recoveryMarkerCommentId)
      || !sha(v.receiptDigest, 64) || v.receiptDigest !== digestReceipt(v)) {
    fail('UNKNOWN', 'CODEX_DEGRADED_RECEIPT_INVALID');
  }
  return v;
}
function createReceipt(input) {
  const v = {schemaVersion: 1, mode: MODE, repository: REPO, ...input};
  v.receiptDigest = digestReceipt(v);
  return validateReceipt(v);
}
function renderReceipt(v) { return '<!-- ' + MARKER + ' ' + JSON.stringify(validateReceipt(v)) + ' -->'; }
function parseMarker(body, marker) {
  if (typeof body !== 'string' || body.length > 16384
      || body.split(marker).length !== 2) fail('UNKNOWN', 'CODEX_DEGRADED_MARKER_INVALID');
  const matches = [...body.matchAll(new RegExp('<!-- ' + marker + ' ([^\\r\\n]*?) -->', 'g'))];
  if (matches.length !== 1) fail('UNKNOWN', 'CODEX_DEGRADED_MARKER_INVALID');
  try { return JSON.parse(matches[0][1]); } catch { fail('UNKNOWN', 'CODEX_DEGRADED_MARKER_INVALID'); }
}
function parseReceipt(body) { return validateReceipt(parseMarker(body, MARKER)); }
function parseLocalMarker(output) {
  if (typeof output !== 'string' || output.split(LOCAL_MARKER).length !== 2) fail('UNKNOWN', 'LOCAL_CODEX_MARKER_INVALID');
  const matches = [...output.matchAll(new RegExp('<!-- ' + LOCAL_MARKER + ' ([^\\r\\n]*?) -->', 'g'))];
  if (matches.length !== 1 || Buffer.byteLength(matches[0][1], 'utf8') > 4096) fail('UNKNOWN', 'LOCAL_CODEX_MARKER_INVALID');
  let v;
  try { v = JSON.parse(matches[0][1]); } catch { fail('UNKNOWN', 'LOCAL_CODEX_MARKER_INVALID'); }
  if (!exact(v, ['schemaVersion', 'result', 'findingsCount']) || v.schemaVersion !== 1
      || !['CLEAR', 'FINDINGS'].includes(v.result) || !validResult(v)) fail('UNKNOWN', 'LOCAL_CODEX_MARKER_INVALID');
  return v;
}
function validateCompare(value, mainSha, headSha) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !['ahead', 'behind', 'identical', 'diverged'].includes(value.status)
      || !sha(value.base_commit?.sha) || !sha(value.merge_base_commit?.sha)
      || !['ahead_by', 'behind_by', 'total_commits'].every((k) => Number.isSafeInteger(value[k]) && value[k] >= 0)
      || !Array.isArray(value.commits) || !value.commits.every((v) => v && typeof v === 'object' && !Array.isArray(v) && sha(v.sha))) {
    fail('UNKNOWN', 'DEGRADED_COMPARE_INVALID');
  }
  if (value.base_commit.sha !== mainSha || value.merge_base_commit.sha !== mainSha
      || (value.commits.length === 1 && value.commits[0].sha !== headSha)) fail('CONFLICT', 'DEGRADED_COMPARE_IDENTITY_CONFLICT');
  if (value.status !== 'ahead' || value.ahead_by !== 1 || value.behind_by !== 0
      || value.total_commits !== 1 || value.commits.length !== 1) fail('BLOCKED', 'DEGRADED_PR_MULTI_COMMIT_UNSUPPORTED');
  return value;
}
function recoveryMarker(comments, headSha) {
  const found = [];
  for (const row of comments) {
    if (row?.user?.login !== 'hanmiyoo10-alt' || !row?.body?.includes(RECOVERY)) continue;
    const v = parseMarker(row.body, RECOVERY);
    if (!exact(v, ['schemaVersion', 'expectedHead']) || v.schemaVersion !== 1 || !sha(v.expectedHead)) fail('UNKNOWN', 'RECOVERY_MARKER_INVALID');
    if (v.expectedHead === headSha) found.push(row);
  }
  if (found.length > 1) fail('CONFLICT', 'RECOVERY_MARKER_DUPLICATE');
  if (found.length && !positive(found[0].id)) fail('UNKNOWN', 'RECOVERY_MARKER_ID_INVALID');
  return found[0] || null;
}
function classifyReceipts(comments, prNumber, headSha, baseSha) {
  const recovery = recoveryMarker(comments, headSha);
  const rows = comments.filter((r) => typeof r?.body === 'string' && r.body.includes(MARKER));
  if (rows.length > 1) fail('CONFLICT', 'CODEX_DEGRADED_RECEIPT_DUPLICATE');
  if (!rows.length) return null;
  if (rows[0]?.user?.login !== 'hanmiyoo10-alt') fail('UNKNOWN', 'CODEX_DEGRADED_RECEIPT_AUTHOR_INVALID');
  const v = parseReceipt(rows[0].body);
  if (v.prNumber !== prNumber || v.headSha !== headSha || v.baseSha !== baseSha) fail('CONFLICT', 'CODEX_DEGRADED_RECEIPT_STALE');
  if (!recovery) return null;
  if (v.recoveryMarkerCommentId !== recovery.id) fail('CONFLICT', 'CODEX_DEGRADED_RECOVERY_CONFLICT');
  if (v.result === 'FINDINGS') fail('BLOCKED', 'CODEX_DEGRADED_REVIEW_FINDINGS');
  if (v.result !== 'CLEAR') fail('UNKNOWN', 'CODEX_DEGRADED_REVIEW_' + v.result);
  return v;
}
function parseOutput(output, success = true) {
  const identity = {};
  for (const [key, re] of Object.entries({codexCliVersion: /^OpenAI Codex\s+v?([^\r\n]+)$/gmi, provider: /^provider:\s*([^\r\n]+)$/gmi, model: /^model:\s*([^\r\n]+)$/gmi})) {
    const values = [...new Set([...output.matchAll(re)].map((m) => m[1].trim()))];
    identity[key] = values.length === 1 && bounded(values[0]) ? values[0] : 'UNOBSERVED';
  }
  let result = 'UNKNOWN', findingsCount = null;
  try {
    const v = parseLocalMarker(output);
    if (exact(v, ['schemaVersion', 'result', 'findingsCount']) && v.schemaVersion === 1
        && ['CLEAR', 'FINDINGS'].includes(v.result) && validResult(v)
        && !Object.values(identity).includes('UNOBSERVED')) {
      result = success ? v.result : 'FAILED'; findingsCount = success ? v.findingsCount : null;
    }
  } catch { /* Unknown output never clears review. */ }
  return {...identity, result, findingsCount, reportSha256: hash(output)};
}
function executeLocal(headSha, runner = spawnSync) {
  if (!sha(headSha)) fail('UNKNOWN', 'HEAD_SHA_INVALID');
  const options = {cwd: CWD, shell: false, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 1024 * 1024};
  const object = runner('git', ['cat-file', '-e', headSha + '^{commit}'], options);
  if (object.error || object.status !== 0) fail('UNKNOWN', 'LOCAL_HEAD_OBJECT_MISSING');
  const run = runner('codex', ['--sandbox', 'read-only', '-c',
    'developer_instructions=' + JSON.stringify(INSTRUCTION), 'review', '--commit', headSha], options);
  return parseOutput(String(run.stdout || '') + '\n' + String(run.stderr || ''), !run.error && run.status === 0);
}
function parseArgs(argv) {
  const [command, flag, number, ...rest] = argv;
  const prNumber = Number(number);
  if (!['inspect', 'run'].includes(command) || flag !== '--pr' || !/^[1-9][0-9]*$/.test(number || '') || !positive(prNumber)
      || JSON.stringify(rest) !== JSON.stringify(command === 'run' ? ['--apply'] : [])) fail('UNKNOWN', 'ARGUMENT_INVALID');
  return {command, prNumber};
}
async function inspectWithClient({client, prNumber}) {
  if (!positive(prNumber)) fail('UNKNOWN', 'PR_NUMBER_INVALID');
  const vm = require('../validation-merge/validation-merge-owner.cjs');
  const recovery = require('../codex-review-recovery/codex-review-recovery-owner.cjs');
  const state = await recovery.inspectWithClient({client, prNumber});
  if (state.disposition !== 'ALREADY_RETRIGGERED') fail('UNKNOWN', 'DEGRADED_NOT_ELIGIBLE');
  const current = await vm.readCurrentMain(client);
  const pr = await client.api('/pulls/' + prNumber);
  if (pr?.number !== prNumber || pr.state !== 'open' || pr.draft || pr?.head?.repo?.full_name !== REPO
      || pr?.head?.sha !== state.expectedHead || pr?.base?.ref !== 'main' || pr?.base?.sha !== current.mainSha) fail('CONFLICT', 'DEGRADED_IDENTITY_CHANGED');
  await vm.readRequiredEvidence(client, state.expectedHead, prNumber);
  try { await vm.readReviewBarrier(client, prNumber, state.expectedHead); fail('UNKNOWN', 'DEGRADED_NOT_PENDING'); }
  catch (e) { if (e.kind !== 'NEEDS_REVIEW' || e.reasonCodes?.length !== 1 || e.reasonCodes[0] !== 'CODEX_REVIEW_PENDING') throw e; }
  validateCompare(await client.api('/compare/' + current.mainSha + '...' + state.expectedHead), current.mainSha, state.expectedHead);
  const comments = [];
  for (let page = 1; ; page++) {
    if (page > 20) fail('UNKNOWN', 'COMMENT_INVENTORY_INCOMPLETE');
    const rows = await client.api('/issues/' + prNumber + '/comments?per_page=100&page=' + page);
    if (!Array.isArray(rows)) fail('UNKNOWN', 'COMMENT_INVENTORY_INVALID');
    comments.push(...rows); if (rows.length < 100) break;
  }
  const marker = recoveryMarker(comments, state.expectedHead);
  if (!marker || comments.some((r) => r?.body?.includes(MARKER))) fail('CONFLICT', 'DEGRADED_RECEIPT_ALREADY_PRESENT_OR_RECOVERY_MISSING');
  return {prNumber, headSha: state.expectedHead, baseSha: current.mainSha, recoveryMarkerCommentId: marker.id};
}
async function runCli(argv, options = {}) {
  const args = parseArgs(argv);
  const vm = require('../validation-merge/validation-merge-owner.cjs');
  const client = options.client || vm.createLiveClient();
  const identity = await inspectWithClient({client, prNumber: args.prNumber});
  if (args.command === 'inspect') return {disposition: 'ELIGIBLE', ...identity};
  const output = executeLocal(identity.headSha, options.runner);
  const finalIdentity = await inspectWithClient({client, prNumber: args.prNumber});
  if (JSON.stringify(identity) !== JSON.stringify(finalIdentity)) fail('CONFLICT', 'DEGRADED_IDENTITY_CHANGED');
  return {receiptCommentBody: renderReceipt(createReceipt({...identity, ...output})), networkWriteAuthorized: false};
}
module.exports = {REPO, MODE, MARKER, LOCAL_MARKER, CWD, INSTRUCTION, digestReceipt, validateReceipt, createReceipt, renderReceipt, parseReceipt, parseLocalMarker, validateCompare, recoveryMarker, classifyReceipts, parseOutput, executeLocal, parseArgs, inspectWithClient, runCli};
if (require.main === module) runCli(process.argv.slice(2)).then((v) => process.stdout.write(JSON.stringify(v) + '\n')).catch((e) => { process.stderr.write(JSON.stringify({disposition: e.kind || 'UNKNOWN', reasonCodes: e.reasonCodes || ['DEGRADED_RUNTIME_FAILED']}) + '\n'); process.exitCode = 1; });
