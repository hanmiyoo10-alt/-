#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const bridge = require('../l_workspace_prepare_mcp/owner_bridge.cjs');

const MID = 'a'.repeat(64);
const MAIN = '1'.repeat(40);
const PACKET = '- Current stage: `IMPLEMENTATION_PR`\n';
const packetHash = bridge.sha256(Buffer.from(PACKET, 'utf8'));

function manifest(overrides = {}) {
  return {
    manifestId: MID,
    packetRef: '#3808',
    packetBodySha256: packetHash,
    route: 'L',
    executor: 'L',
    observedBaseSha: MAIN,
    workspace: {
      kind: 'repository',
      branch: 'laptop/example-3808',
      worktree: '/home/alsl0/nyang-worktrees/example-3808',
    },
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    ledgerBody: 'ledger',
    mainSha: MAIN,
    manifestId: MID,
    manifestText: 'manifest',
    packetBody: PACKET,
    packetNumber: 3808,
    ...overrides,
  };
}

function deps(value = manifest(), ownerValue = null) {
  return {
    parseManifest() { return {status: 'VALID', value}; },
    validateManifestShape() {},
    validateEvidence() { return {ok: true}; },
    ownerRunCli(argv) {
      assert.deepEqual(argv.slice(0, 1), ['prepare-workspace']);
      return ownerValue || {
        code: 0,
        text: JSON.stringify({
          status: 'PREPARED',
          base_sha: MAIN,
          branch: 'private',
          worktree: '/private',
        }),
      };
    },
  };
}


test('default dependency loader is pinned to exact current-main objects', () => {
  const source = fs.readFileSync(
    require('node:path').resolve(__dirname, '../l_workspace_prepare_mcp/owner_bridge.cjs'),
    'utf8');
  assert.match(source, /cat-file', '-e', mainSha/);
  assert.match(source, /'cat-file', 'blob', mainSha/);
  assert.match(source, /CURRENT_OWNER_PATHS/);
  assert.match(source, /fs\.writeFileSync\(destination, read\.stdout/);
  assert.match(source, /CURRENT_MAIN_OBJECT_MISSING/);
  assert.match(source, /FIXED_GIT = '\/usr\/bin\/git'/);
  assert.match(source, /require\('node:child_process'\)/);
  assert.match(source, /GIT_NO_REPLACE_OBJECTS: '1'/);
  assert.doesNotMatch(source, /require\(path\.join\(\s*repoRoot, 'products\/chatgpt-mobile-coder-lab\/coordination\/task-handoff\.cjs'/);
});

test('exact evidence invokes only prepare-workspace and sanitizes result', () => {
  const out = bridge.run(input(), deps());
  assert.equal(out.status, 'PASS');
  assert.equal(out.workspaceState, 'PREPARED');
  assert.equal(out.baseSha, MAIN);
  assert.equal(out.headSha, MAIN);
  assert.equal(JSON.stringify(out).includes('/private'), false);
  assert.equal(JSON.stringify(out).includes('branch'), false);
});

test('packet hash mismatch blocks before effect', () => {
  let called = false;
  const d = deps(manifest({packetBodySha256: 'b'.repeat(64)}));
  d.ownerRunCli = () => { called = true; throw new Error('must not run'); };
  const out = bridge.run(input(), d);
  assert.equal(out.status, 'CONFLICT');
  assert.equal(called, false);
});

test('route, executor, workspace and current-main profile fail closed', () => {
  for (const changed of [
    {route: 'S'},
    {executor: 'S'},
    {workspace: {kind: 'not_applicable'}},
    {observedBaseSha: '2'.repeat(40)},
  ]) {
    const out = bridge.run(input(), deps(manifest(changed)));
    assert.notEqual(out.status, 'PASS');
  }
});

test('inactive or mismatched coordination evidence blocks before effect', () => {
  let called = false;
  const d = deps();
  d.validateEvidence = () => ({ok: false, reasonCodes: ['LEASE_RELEASED']});
  d.ownerRunCli = () => { called = true; throw new Error('must not run'); };
  const out = bridge.run(input(), d);
  assert.equal(out.status, 'BLOCKED');
  assert.equal(called, false);
  assert.ok(out.reasonCodes.includes('LEASE_RELEASED'));
});

test('owner failure exposes only stable reason codes', () => {
  const out = bridge.run(input(), deps(manifest(), {
    code: 2,
    text: JSON.stringify({
      status: 'BLOCKED',
      reason_codes: ['WORKSPACE_PARTIAL_STATE'],
      worktree: '/secret/path',
      stderr: 'private raw data',
    }),
  }));
  assert.equal(out.status, 'BLOCKED');
  assert.deepEqual(out.reasonCodes, ['WORKSPACE_PARTIAL_STATE']);
  const text = JSON.stringify(out);
  assert.equal(text.includes('/secret/path'), false);
  assert.equal(text.includes('private raw data'), false);
});

test('public result authority is always false', () => {
  const out = bridge.run(input(), deps());
  assert.deepEqual(out.authority, bridge.FALSE_AUTHORITY);
});
