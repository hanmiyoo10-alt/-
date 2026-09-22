#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-rdc-session-evidence.cjs');

function procRow(root, pid, ppid, comm, argv) {
  const dir = path.join(root, String(pid));
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'stat'), `${pid} (${comm}) S ${ppid} 0 0 0 0\n`);
  fs.writeFileSync(path.join(dir, 'comm'), comm + '\n');
  fs.writeFileSync(path.join(dir, 'cmdline'), Buffer.from(argv.join('\0') + '\0'));
}

function fixture({peerShell = false, unexpectedChild = false, includeRemoteParent = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-rdc-session-'));
  procRow(root, 10, 20, 'node', ['node', 'inspect.js']);
  procRow(root, 20, 30, 'sh', ['/bin/sh', '-c', 'node inspect.js']);
  procRow(root, 30, includeRemoteParent ? 40 : 1, 'node-MainThread', [
    '/data/data/com.termux/files/usr/bin/node',
    '/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
  ]);
  if (includeRemoteParent) {
    procRow(root, 40, 1, 'node-MainThread', [
      '/data/data/com.termux/files/usr/bin/node',
      '/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
      'remote',
    ]);
  }
  if (peerShell) procRow(root, 21, 30, 'sh', ['/bin/sh', '-c', 'sleep 20']);
  if (unexpectedChild) procRow(root, 22, 30, 'node', ['node', 'unexpected.js']);
  return root;
}

test('fixed S/M source contexts classify without caller-selected executor', () => {
  assert.equal(owner.inferExecutor('/root/nyang-repo'), 'S');
  assert.equal(owner.inferExecutor('/root/nyang-worktrees/mcl-packet-2776'), 'S');
  assert.equal(owner.inferExecutor('/data/data/com.termux/files/home/nyang-repo'), 'M');
  assert.equal(
    owner.inferExecutor('/data/data/com.termux/files/home/nyang-worktrees/example'),
    'M',
  );
  assert.equal(owner.inferExecutor('/tmp/other'), 'unknown');
});

test('sole command session projects bounded ABSENT on S and M', () => {
  const root = fixture({includeRemoteParent: true});
  try {
    for (const cwd of [
      '/root/nyang-worktrees/mcl-packet-2776',
      '/data/data/com.termux/files/home/nyang-worktrees/example',
    ]) {
      const out = owner.inspectLocal({cwd, procRoot: root, selfPid: 10});
      assert.equal(out.status, 'PASS');
      assert.equal(out.sessionState, 'ABSENT');
      assert.equal(out.reasonCode, 'SOLE_RDC_COMMAND_SESSION');
    }
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('peer direct command shell projects PRESENT without owner binding', () => {
  const root = fixture({peerShell: true});
  try {
    const out = owner.inspectLocal({
      cwd: '/root/nyang-worktrees/mcl-packet-2776',
      procRoot: root,
      selfPid: 10,
    });
    assert.equal(out.status, 'PASS');
    assert.equal(out.sessionState, 'PRESENT');
    assert.equal(out.reasonCode, 'OTHER_RDC_COMMAND_SESSION_PRESENT');
    assert.equal(out.authority.repositoryMutationAuthorized, false);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('unexpected command-agent child fails closed as UNKNOWN', () => {
  const root = fixture({unexpectedChild: true});
  try {
    const out = owner.inspectLocal({
      cwd: '/root/nyang-repo',
      procRoot: root,
      selfPid: 10,
    });
    assert.equal(out.status, 'UNKNOWN');
    assert.equal(out.sessionState, 'UNKNOWN');
    assert.equal(out.reasonCode, 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('command agent is distinguished from parent remote server', () => {
  const root = fixture({includeRemoteParent: true});
  try {
    const agent = owner.readProcRecord(root, 30);
    const remote = owner.readProcRecord(root, 40);
    assert.equal(owner.isCommandAgent(agent), true);
    assert.equal(owner.isCommandAgent(remote), false);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('unsupported execution context remains UNKNOWN', () => {
  const out = owner.inspectLocal({cwd: '/tmp/unsupported', procRoot: '/missing', selfPid: 10});
  assert.equal(out.executor, 'unknown');
  assert.equal(out.status, 'UNKNOWN');
  assert.equal(out.sessionState, 'UNKNOWN');
  assert.equal(out.reasonCode, 'EXECUTION_PROFILE_UNKNOWN');
});

test('outward receipt withholds raw process and identity data', () => {
  const root = fixture({peerShell: true});
  try {
    const out = owner.inspectLocal({
      cwd: '/root/nyang-repo',
      procRoot: root,
      selfPid: 10,
    });
    const text = JSON.stringify(out);
    for (const forbidden of ['pid', 'ppid', 'cmdline', 'process tree', '/proc/', 'sleep 20']) {
      assert.equal(text.includes(forbidden), false);
    }
    assert.equal(out.details, 'withheld');
    assert.deepEqual(Object.values(out.authority), [false, false, false, false, false]);
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('public CLI accepts only inspect and no caller selectors', () => {
  assert.deepEqual(owner.parseArgs(['inspect']), {operation: 'inspect'});
  for (const argv of [
    [],
    ['status'],
    ['inspect', '--executor', 'S'],
    ['inspect', '--proc-root', '/tmp/proc'],
    ['inspect', '--pid', '10'],
  ]) {
    assert.throws(() => owner.parseArgs(argv), /ARGUMENT_UNSUPPORTED/);
  }
});

test('source contains no clock, process-control, packet, lease, holder or Git effects', () => {
  const source = fs.readFileSync(path.join(__dirname, '../mcl-rdc-session-evidence.cjs'), 'utf8');
  for (const forbidden of [
    /Date\.now/,
    /setTimeout/,
    /kill\s*\(/,
    /process\.kill/,
    /task-lease/,
    /workspace-holder/,
    /git\s/,
    /gh\s/,
  ]) {
    assert.doesNotMatch(source, forbidden);
  }
});
