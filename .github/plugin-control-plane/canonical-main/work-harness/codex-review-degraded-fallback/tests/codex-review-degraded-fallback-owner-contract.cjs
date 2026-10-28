'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const owner = require('../codex-review-degraded-fallback-owner.cjs');
const HEAD = 'b'.repeat(40), BASE = 'a'.repeat(40);
function compare(extra = {}) { return {status: 'ahead', base_commit: {sha: BASE}, merge_base_commit: {sha: BASE},
  ahead_by: 1, behind_by: 0, total_commits: 1, commits: [{sha: HEAD}], ...extra}; }
test('compare proves exact one-commit whole-PR coverage or fails closed', () => {
  assert.deepEqual(owner.validateCompare(compare(), BASE, HEAD), compare());
  for (const extra of [{ahead_by: 2}, {total_commits: 2}, {commits: [{sha: HEAD}, {sha: BASE}]},
    {ahead_by: 2, total_commits: 2, commits: [{sha: BASE}, {sha: HEAD}]},
    {status: 'identical', ahead_by: 0, total_commits: 0, commits: []}, {behind_by: 1}]) {
    assert.throws(() => owner.validateCompare(compare(extra), BASE, HEAD),
      (e) => e.kind === 'BLOCKED' && e.reasonCodes[0] === 'DEGRADED_PR_MULTI_COMMIT_UNSUPPORTED');
  }
  for (const v of [null, {}, compare({commits: null}), compare({commits: [{}]}), compare({base_commit: {}}),
    compare({merge_base_commit: null}), compare({ahead_by: '1'}), compare({total_commits: -1}), compare({status: 'invalid'})]) {
    assert.throws(() => owner.validateCompare(v, BASE, HEAD), (e) => e.kind === 'UNKNOWN' && e.reasonCodes[0] === 'DEGRADED_COMPARE_INVALID');
  }
  for (const extra of [{base_commit: {sha: HEAD}}, {merge_base_commit: {sha: HEAD}}, {commits: [{sha: BASE}]}]) {
    assert.throws(() => owner.validateCompare(compare(extra), BASE, HEAD),
      (e) => e.kind === 'CONFLICT' && e.reasonCodes[0] === 'DEGRADED_COMPARE_IDENTITY_CONFLICT');
  }
});
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
test('verbose local transcripts have a separate UTF-8 payload bound and retain full hashes', () => {
  const verbose = 'Review prose. '.repeat(2000) + '\n' + output;
  assert.ok(Buffer.byteLength(verbose) > 20 * 1024);
  for (const text of [verbose, verbose.replace('"CLEAR","findingsCount":0', '"FINDINGS","findingsCount":3')]) {
    assert.equal(owner.parseOutput(text).result, text.includes('FINDINGS') ? 'FINDINGS' : 'CLEAR');
    assert.equal(owner.parseOutput(text).reportSha256, crypto.createHash('sha256').update(text).digest('hex'));
  }
  for (const text of [verbose + '\n' + output, output.replace('{"schemaVersion":1', '{broken'),
    output.replace('{"schemaVersion":1', '{"extra":true,"schemaVersion":1'),
    output.replace('{"schemaVersion":1', ' '.repeat(4096) + '{"schemaVersion":1'),
    output.replace('{"schemaVersion":1', '{"extra":"' + 'é'.repeat(2100) + '","schemaVersion":1')]) {
    assert.equal(owner.parseOutput(text).result, 'UNKNOWN');
  }
  const payload = '{"schemaVersion":1,"result":"CLEAR","findingsCount":0}';
  const atLimit = output.replace(payload, ' '.repeat(4096 - Buffer.byteLength(payload)) + payload);
  assert.equal(owner.parseOutput(atLimit).result, 'CLEAR');
  assert.equal(owner.parseOutput(atLimit.replace(payload, ' ' + payload)).result, 'UNKNOWN');
  assert.throws(() => owner.parseReceipt('x'.repeat(16385) + owner.renderReceipt(receipt())), /MARKER_INVALID/);
  assert.throws(() => owner.recoveryMarker([{...recovery(), body: 'x'.repeat(16385) + recovery().body}], HEAD), /MARKER_INVALID/);
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
  assert.deepEqual(calls[1].args, ['--sandbox', 'read-only', '-c', 'developer_instructions=' + JSON.stringify(owner.INSTRUCTION), 'review', '--commit', HEAD]);
  for (const call of calls) { assert.equal(call.options.shell, false); assert.equal(call.options.cwd, owner.CWD); assert.equal(call.options.maxBuffer, 1024 * 1024); }
  assert.throws(() => owner.executeLocal(HEAD, () => ({status: 1})), /LOCAL_HEAD/);
  const stderrReview = owner.executeLocal(HEAD, (command) => ({status: 0, stdout: '', stderr: command === 'codex' ? output : ''}));
  assert.equal(stderrReview.result, 'UNKNOWN');
  assert.equal(stderrReview.reportSha256, crypto.createHash('sha256').update('\n' + output).digest('hex'));
  const duplicateTransport = owner.executeLocal(HEAD, (command) => ({status: 0,
    stdout: command === 'codex' ? output : '', stderr: command === 'codex' ? output : ''}));
  assert.equal(duplicateTransport.result, 'CLEAR');
  assert.equal(duplicateTransport.reportSha256, crypto.createHash('sha256').update(output + '\n' + output).digest('hex'));
  const marker = '<!-- ' + owner.LOCAL_MARKER + ' {"schemaVersion":1,"result":"CLEAR","findingsCount":0} -->';
  const splitEvidence = owner.executeLocal(HEAD, (command) => ({status: 0,
    stdout: command === 'codex' ? marker : '',
    stderr: command === 'codex' ? 'OpenAI Codex v0.1\nprovider: openai\nmodel: codex' : ''}));
  assert.equal(splitEvidence.result, 'CLEAR');
  assert.equal(splitEvidence.reportSha256, crypto.createHash('sha256').update(
    marker + '\nOpenAI Codex v0.1\nprovider: openai\nmodel: codex').digest('hex'));
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
  let required = 0, comparisons = 0, compareValue = compare();
  const client = {async api(endpoint) {
    if (endpoint === '/compare/' + BASE + '...' + HEAD) { comparisons++; assert.equal(required, comparisons); return compareValue; }
    if (endpoint === '/pulls/3000') return {number: 3000, state: 'open', draft: false,
      head: {sha: HEAD, repo: {full_name: owner.REPO}}, base: {ref: 'main', sha: BASE}};
    assert.equal(endpoint, '/issues/3000/comments?per_page=100&page=1'); return [recovery()];
  }};
  try {
    vm.readCurrentMain = async () => ({mainSha: BASE});
    vm.readRequiredEvidence = async (_client, head, pr) => { assert.equal(head, HEAD); assert.equal(pr, 3000); required++; };
    vm.readReviewBarrier = async (...args) => { assert.equal(args.length, 3); const e = new Error('pending'); e.kind = 'NEEDS_REVIEW'; e.reasonCodes = ['CODEX_REVIEW_PENDING']; throw e; };
    recoveryOwner.inspectWithClient = async () => ({disposition: 'ALREADY_RETRIGGERED', expectedHead: HEAD});
    assert.deepEqual(await owner.inspectWithClient({client, prNumber: 3000}),
      {prNumber: 3000, headSha: HEAD, baseSha: BASE, recoveryMarkerCommentId: 12});
    assert.equal(required, 1);
    assert.equal(comparisons, 1);
    const result = await owner.runCli(['run', '--pr', '3000', '--apply'], {client,
      runner: (command) => ({status: 0, stdout: command === 'codex' ? output : ''})});
    assert.equal(owner.parseReceipt(result.receiptCommentBody).result, 'CLEAR');
    assert.equal(result.networkWriteAuthorized, false);
    assert.equal(comparisons, 3); // Initial inspection and final eligibility reread each compare.
    compareValue = compare({total_commits: 2});
    await assert.rejects(owner.inspectWithClient({client, prNumber: 3000}), (e) => e.kind === 'BLOCKED');
    compareValue = {};
    await assert.rejects(owner.inspectWithClient({client, prNumber: 3000}), (e) => e.kind === 'UNKNOWN');
    compareValue = compare({merge_base_commit: {sha: HEAD}});
    await assert.rejects(owner.inspectWithClient({client, prNumber: 3000}), (e) => e.kind === 'CONFLICT');
    compareValue = compare();
    await assert.rejects(owner.runCli(['run', '--pr', '3000', '--apply'], {client,
      runner: (command) => { if (command === 'codex') compareValue = compare({ahead_by: 2}); return {status: 0, stdout: output}; }}),
    (e) => e.kind === 'BLOCKED' && e.reasonCodes[0] === 'DEGRADED_PR_MULTI_COMMIT_UNSUPPORTED');
    recoveryOwner.inspectWithClient = async () => ({disposition: 'ELIGIBLE', expectedHead: HEAD});
    await assert.rejects(owner.inspectWithClient({client, prNumber: 3000}), /NOT_ELIGIBLE/);
  } finally { Object.assign(vm, saved); recoveryOwner.inspectWithClient = inspect; }
});
