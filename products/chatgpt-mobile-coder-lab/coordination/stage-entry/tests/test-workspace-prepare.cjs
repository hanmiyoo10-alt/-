#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const test = require('node:test');

const owner = require('../workspace-prepare.cjs');

function run(args, cwd) {
  const result = childProcess.spawnSync(args[0], args.slice(1), {
    cwd, encoding: 'utf8', shell: false,
    stdout: 'pipe', stderr: 'pipe',
  });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed: ${result.stderr}`);
  return (result.stdout || '').trim();
}

function localCreateRemote(f) {
  return ({identity, baseSha}) => {
    const ref = `refs/heads/${identity.branch}`;
    const before = childProcess.spawnSync('git', ['-C', f.control, 'ls-remote', '--exit-code', 'origin', ref], {encoding: 'utf8'});
    if (before.status === 0) return {ok: false};
    if (before.status !== 2) return {ok: false};
    const push = childProcess.spawnSync('git', ['-C', f.control, 'push', '-q', 'origin', `${baseSha}:${ref}`], {encoding: 'utf8'});
    return {ok: push.status === 0};
  };
}

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-stage-entry-ws-'));
  const remote = path.join(root, 'remote.git');
  const control = path.join(root, 'control');
  const worktreeRoot = path.join(root, 'worktrees');
  fs.mkdirSync(worktreeRoot, {recursive: true});
  run(['git', 'init', '--bare', '-q', remote], root);
  run(['git', 'init', '-q', '-b', 'main', control], root);
  fs.writeFileSync(path.join(control, 'README.md'), 'seed\n');
  run(['git', '-C', control, 'add', 'README.md'], root);
  run(['git', '-C', control, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid',
    'commit', '-qm', 'seed'], root);
  run(['git', '-C', control, 'remote', 'add', 'origin', remote], root);
  run(['git', '-C', control, 'push', '-q', '-u', 'origin', 'main'], root);
  const base = run(['git', '-C', control, 'rev-parse', 'HEAD'], root);
  const profile = {
    control,
    worktreeRoot,
    branchPrefix: 'server/mcl-packet-',
    targetPrefix: 'mcl-packet-',
    remote: 'origin',
  };
  return {root, remote, control, worktreeRoot, base, profile,
    close() { fs.rmSync(root, {recursive: true, force: true}); }};
}

test('deterministic identity derives only from packet number', () => {
  const id = owner.workspaceIdentity(2567, {
    control: '/fixed/control',
    worktreeRoot: '/fixed/worktrees',
    branchPrefix: 'server/mcl-packet-',
    targetPrefix: 'mcl-packet-',
    remote: 'origin',
  });
  assert.equal(id.branch, 'server/mcl-packet-2567');
  assert.equal(id.target, 'mcl-packet-2567');
  assert.equal(id.worktree, '/fixed/worktrees/mcl-packet-2567');
  assert.equal(id.remote, 'origin');
});

test('inspect reports READY only when branch worktree and remote ref are absent', () => {
  const f = fixture();
  try {
    const value = owner.inspectWorkspace({packetNumber: 41, baseSha: f.base, profile: f.profile});
    assert.equal(value.status, 'READY');
    assert.deepEqual(value.reasonCodes, []);
    assert.equal(value.stateChanged, false);
  } finally { f.close(); }
});

test('existing local branch blocks before effect', () => {
  const f = fixture();
  try {
    run(['git', '-C', f.control, 'branch', 'server/mcl-packet-42', f.base], f.root);
    const value = owner.inspectWorkspace({packetNumber: 42, baseSha: f.base, profile: f.profile});
    assert.equal(value.status, 'BLOCKED');
    assert(value.reasonCodes.includes('LOCAL_BRANCH_EXISTS'));
  } finally { f.close(); }
});

test('existing target path blocks before effect', () => {
  const f = fixture();
  try {
    fs.mkdirSync(path.join(f.worktreeRoot, 'mcl-packet-43'));
    const value = owner.inspectWorkspace({packetNumber: 43, baseSha: f.base, profile: f.profile});
    assert.equal(value.status, 'BLOCKED');
    assert(value.reasonCodes.includes('WORKTREE_PATH_EXISTS'));
  } finally { f.close(); }
});

test('existing remote branch blocks before effect', () => {
  const f = fixture();
  try {
    run(['git', '-C', f.control, 'push', '-q', 'origin',
      `${f.base}:refs/heads/server/mcl-packet-44`], f.root);
    const value = owner.inspectWorkspace({packetNumber: 44, baseSha: f.base, profile: f.profile});
    assert.equal(value.status, 'BLOCKED');
    assert(value.reasonCodes.includes('REMOTE_BRANCH_EXISTS'));
  } finally { f.close(); }
});

test('create makes one clean local worktree and exact remote ref', () => {
  const f = fixture();
  try {
    const value = owner.createWorkspace({
      packetNumber: 45, baseSha: f.base, profile: f.profile,
      remoteCreate: localCreateRemote(f),
    });
    assert.equal(value.status, 'CREATED');
    assert.equal(value.stateChanged, true);
    assert.equal(value.localCreated, true);
    assert.equal(value.remoteCreated, true);
    assert.equal(value.remoteHead, f.base);
    assert.equal(run(['git', '-C', value.identity.worktree, 'rev-parse', 'HEAD'], f.root), f.base);
    assert.equal(run(['git', '-C', value.identity.worktree, 'branch', '--show-current'], f.root),
      'server/mcl-packet-45');
    assert.equal(run(['git', '-C', value.identity.worktree, 'status', '--porcelain=v1'], f.root), '');
    const remote = run(['git', '-C', f.control, 'ls-remote', 'origin',
      'refs/heads/server/mcl-packet-45'], f.root).split(/\s+/)[0];
    assert.equal(remote, f.base);
  } finally { f.close(); }
});

test('remote create race fails closed and preserves partial local state', () => {
  const f = fixture();
  try {
    const value = owner.createWorkspace({
      packetNumber: 46,
      baseSha: f.base,
      profile: f.profile,
      remoteCreate: localCreateRemote(f),
      beforeRemoteCreate: ({identity}) => {
        run(['git', '-C', f.control, 'push', '-q', 'origin',
          `${f.base}:refs/heads/${identity.branch}`], f.root);
      },
    });
    assert.equal(value.status, 'PARTIAL');
    assert(value.reasonCodes.includes('REMOTE_BRANCH_CREATE_FAILED'));
    assert.equal(value.stateChanged, true);
    assert.equal(value.localCreated, true);
    assert.equal(value.remoteCreated, false);
    assert.equal(fs.existsSync(value.identity.worktree), true);
    assert.equal(run(['git', '-C', value.identity.worktree, 'rev-parse', 'HEAD'], f.root), f.base);
  } finally { f.close(); }
});

test('source uses GitHub create-ref API and no delete or broad force path', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'workspace-prepare.cjs'), 'utf8');
  assert.match(source, /git\/refs/);
  assert.match(source, /--method', 'POST'/);
  assert.doesNotMatch(source, /--delete/);
  assert.doesNotMatch(source, /--force-with-lease/);
  assert.doesNotMatch(source, /['"]--force['"]/);
  assert.doesNotMatch(source, /worktree['"],\s*['"]remove/);
});
