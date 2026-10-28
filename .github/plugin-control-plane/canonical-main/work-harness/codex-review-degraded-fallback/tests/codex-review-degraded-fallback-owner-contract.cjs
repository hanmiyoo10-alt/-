'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const owner = require('../codex-review-degraded-fallback-owner.cjs');
const HEAD = 'b'.repeat(40), BASE = 'a'.repeat(40);
function receipt(extra = {}) {
  return owner.createReceipt({prNumber: 3000, headSha: HEAD, baseSha: BASE,
    codexCliVersion: '0.1', provider: 'openai', model: 'codex', result: 'CLEAR',
    findingsCount: 0, reportSha256: 'd'.repeat(64), recoveryMarkerCommentId: 12, ...extra});
}
function recovery(extra = {}) { return {id: 12, user: {login: 'hanmiyoo10-alt'}, body:
  '<!-- canonical-main-codex-review-recovery:v1 ' + JSON.stringify({schemaVersion: 1, expectedHead: HEAD, ...extra}) + ' -->'}; }
function comment(v = receipt()) { return {id: 13, user: {login: 'hanmiyoo10-alt'}, body: owner.renderReceipt(v)}; }
test('deterministic digest, exact keys, rendering and parsing', () => {
  const v = receipt();
  assert.deepEqual(owner.parseReceipt(owner.renderReceipt(v)), v);
  assert.equal(receipt().receiptDigest, v.receiptDigest);
  assert.throws(() => owner.validateReceipt({...v, model: 'changed'}));
  assert.throws(() => receipt({extra: true}));
  assert.throws(() => receipt({findingsCount: 1}));
  assert.throws(() => receipt({model: 'x'.repeat(201)}));
  assert.throws(() => receipt({provider: 'UNOBSERVED'}));
});
test('exact unique owner-authored V1 recovery required', () => {
  assert.equal(owner.classifyReceipts([comment()], 3000, HEAD, BASE), null);
  assert.equal(owner.classifyReceipts([recovery(), comment()], 3000, HEAD, BASE).result, 'CLEAR');
  assert.throws(() => owner.classifyReceipts([recovery(), recovery(), comment()], 3000, HEAD, BASE), /DUPLICATE/);
  assert.throws(() => owner.recoveryMarker([recovery({extra: 1})], HEAD), /INVALID/);
  assert.equal(owner.recoveryMarker([{...recovery(), user: {login: 'other'}}], HEAD), null);
  assert.equal(owner.recoveryMarker([recovery({expectedHead: BASE})], HEAD), null);
});
test('all non-clear results and identity conflicts fail closed', () => {
  for (const result of ['FINDINGS', 'FAILED', 'UNKNOWN']) {
    assert.throws(() => owner.classifyReceipts([recovery(), comment(receipt({result,
      findingsCount: result === 'FINDINGS' ? 2 : null}))], 3000, HEAD, BASE),
    (e) => e.kind === (result === 'FINDINGS' ? 'BLOCKED' : 'UNKNOWN'));
  }
  for (const extra of [{prNumber: 3001}, {headSha: BASE}, {baseSha: HEAD}, {recoveryMarkerCommentId: 14}]) {
    assert.throws(() => owner.classifyReceipts([recovery(), comment(receipt(extra))], 3000, HEAD, BASE), (e) => e.kind === 'CONFLICT');
  }
  assert.throws(() => owner.classifyReceipts([recovery(), comment(), comment()], 3000, HEAD, BASE), /DUPLICATE/);
  assert.throws(() => owner.classifyReceipts([recovery(), {...comment(), body: '<!-- ' + owner.MARKER + ' invalid -->'}], 3000, HEAD, BASE));
  assert.throws(() => owner.parseReceipt(owner.renderReceipt(receipt()) + owner.renderReceipt(receipt())));
});
test('CLI accepts only bounded PR and explicit run apply', () => {
  assert.deepEqual(owner.parseArgs(['run', '--pr', '3000', '--apply']), {command: 'run', prNumber: 3000});
  for (const argv of [['run', '--pr', '3000'], ['inspect', '--pr', '0'], ['inspect', '--pr', '1', '--apply'],
    ...['repo', 'head', 'base', 'model', 'prompt', 'command', 'sandbox', 'workdir'].map((k) => ['run', '--pr', '1', '--apply', '--' + k, 'x'])]) assert.throws(() => owner.parseArgs(argv));
});
const output = 'OpenAI Codex v0.1\nprovider: openai\nmodel: codex\nBug review prose\n<!-- ' + owner.LOCAL_MARKER + ' {"schemaVersion":1,"result":"CLEAR","findingsCount":0} -->';
test('runtime marker, identity, status and exact combined-output hashing', () => {
  const parsed = owner.parseOutput(output);
  assert.equal(parsed.result, 'CLEAR');
  assert.equal(parsed.reportSha256, crypto.createHash('sha256').update(output).digest('hex'));
  assert.equal(owner.parseOutput(output, false).result, 'FAILED');
  for (const text of [output + output, output.replace('provider:', 'missing:'), output.replace('"findingsCount":0', '"findingsCount":1'), output.replace('"CLEAR"', '"UNKNOWN"'), 'timeout']) assert.equal(owner.parseOutput(text).result, 'UNKNOWN');
  assert.equal(owner.parseOutput(output.replace('"CLEAR","findingsCount":0', '"FINDINGS","findingsCount":3')).result, 'FINDINGS');
});
test('fixed read-only spawn profile and no mutation surface', () => {
  const calls = [];
  const runner = (command, args, options) => { calls.push({command, args, options}); return {status: 0, stdout: command === 'codex' ? output : '', stderr: ''}; };
  assert.equal(owner.executeLocal(HEAD, runner).result, 'CLEAR');
  assert.deepEqual(calls[0].args, ['cat-file', '-e', HEAD + '^{commit}']);
  assert.equal(calls[1].command, 'codex');
  assert.ok(calls[1].args.includes('read-only'));
  assert.equal(calls[1].args[calls[1].args.indexOf('--commit') + 1], HEAD);
  assert.ok(calls[1].args.includes('developer_instructions=' + JSON.stringify(owner.INSTRUCTION)));
  for (const call of calls) { assert.equal(call.options.shell, false); assert.equal(call.options.cwd, owner.CWD); }
  assert.throws(() => owner.executeLocal(HEAD, () => ({status: 1})), /LOCAL_HEAD/);
  const stderrReview = owner.executeLocal(HEAD, (command) => ({status: 0, stdout: '', stderr: command === 'codex' ? output : ''}));
  assert.equal(stderrReview.result, 'CLEAR');
  assert.equal(stderrReview.reportSha256, crypto.createHash('sha256').update('\n' + output).digest('hex'));
  assert.equal(owner.executeLocal(HEAD, (command) => command === 'git' ? {status: 0} : {status: null, error: new Error('timeout'), stdout: output}).result, 'FAILED');
  const source = fs.readFileSync(require.resolve('../codex-review-degraded-fallback-owner.cjs'), 'utf8');
  assert.doesNotMatch(source, /\.writeFile|\.appendFile|\.post\(|\.patch\(|\.put\(|update-ref|\['fetch'|\.comment\(/);
  assert.equal(typeof require('../../validation-merge/validation-merge-owner.cjs').readReviewBarrier, 'function');
});
test('runtime composes current owners, exact Required and hosted-only pending', async () => {
  const vm = require('../../validation-merge/validation-merge-owner.cjs');
  const recoveryOwner = require('../../codex-review-recovery/codex-review-recovery-owner.cjs');
  const saved = {readCurrentMain: vm.readCurrentMain, readRequiredEvidence: vm.readRequiredEvidence, readReviewBarrier: vm.readReviewBarrier};
  const inspect = recoveryOwner.inspectWithClient;
  let required = 0;
  const client = {async api(endpoint) {
    if (endpoint === '/pulls/3000') return {number: 3000, state: 'open', draft: false,
      head: {sha: HEAD, repo: {full_name: owner.REPO}}, base: {ref: 'main', sha: BASE}};
    return [recovery()];
  }};
  try {
    vm.readCurrentMain = async () => ({mainSha: BASE});
    vm.readRequiredEvidence = async (_client, head, pr) => { assert.equal(head, HEAD); assert.equal(pr, 3000); required++; };
    vm.readReviewBarrier = async (...args) => { assert.equal(args.length, 3); const e = new Error('pending'); e.kind = 'NEEDS_REVIEW'; e.reasonCodes = ['CODEX_REVIEW_PENDING']; throw e; };
    recoveryOwner.inspectWithClient = async () => ({disposition: 'ALREADY_RETRIGGERED', expectedHead: HEAD});
    assert.deepEqual(await owner.inspectWithClient({client, prNumber: 3000}),
      {prNumber: 3000, headSha: HEAD, baseSha: BASE, recoveryMarkerCommentId: 12});
    assert.equal(required, 1);
    recoveryOwner.inspectWithClient = async () => ({disposition: 'ELIGIBLE', expectedHead: HEAD});
    await assert.rejects(owner.inspectWithClient({client, prNumber: 3000}), /NOT_ELIGIBLE/);
  } finally { Object.assign(vm, saved); recoveryOwner.inspectWithClient = inspect; }
});
