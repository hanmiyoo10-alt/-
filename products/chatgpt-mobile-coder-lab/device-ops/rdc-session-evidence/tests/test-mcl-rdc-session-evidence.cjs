#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-rdc-session-evidence.cjs');

const LEGACY_AGENT = [
  '/data/data/com.termux/files/usr/bin/node',
  '/root/.local/share/desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
];
const TERMUX_AGENT = [
  '/data/data/com.termux/files/usr/bin/node',
  '/data/data/com.termux/files/home/.local/share/desktop-commander-remote-termux/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
];
const FIXED_PROOT = [
  '/data/data/com.termux/files/usr/bin/proot',
  '--kill-on-exit',
  '--link2symlink',
  '--sysvipc',
  '--rootfs=.',
  '--cwd=/root',
  '/bin/bash',
  '-c',
  'node inspect.js',
];

function procRow(root, pid, ppid, comm, argv) {
  const dir = path.join(root, String(pid));
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'stat'), `${pid} (${comm}) S ${ppid} 0 0 0 0\n`);
  fs.writeFileSync(path.join(dir, 'comm'), comm + '\n');
  fs.writeFileSync(path.join(dir, 'cmdline'), Buffer.from(argv.join('\0') + '\0'));
}

function fixture({
  peerShell = false,
  unexpectedChild = false,
  includeRemoteParent = false,
  agentArgv = LEGACY_AGENT,
  currentRoot = 'shell',
  peerProot = false,
  nearMatchProot = false,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcl-rdc-session-'));
  procRow(root, 10, 20, 'node', ['node', 'inspect.js']);
  if (currentRoot === 'proot') {
    const argv = nearMatchProot
      ? FIXED_PROOT.filter((item) => item !== '--sysvipc')
      : FIXED_PROOT;
    procRow(root, 20, 30, 'proot', argv);
  } else {
    procRow(root, 20, 30, 'sh', ['/bin/sh', '-c', 'node inspect.js']);
  }
  procRow(root, 30, includeRemoteParent ? 40 : 1, 'node-MainThread', agentArgv);
  if (includeRemoteParent) {
    procRow(root, 40, 1, 'node-MainThread', [...agentArgv, 'remote']);
  }
  if (peerShell) procRow(root, 21, 30, 'sh', ['/bin/sh', '-c', 'sleep 20']);
  if (peerProot) procRow(root, 22, 30, 'proot', FIXED_PROOT);
  if (unexpectedChild) procRow(root, 23, 30, 'node', ['node', 'unexpected.js']);
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

test('legacy direct S/M shell sessions remain bounded ABSENT', () => {
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

test('legacy and termux wrapper script tokens are accepted but embedded marker text is not', () => {
  assert.equal(owner.isCommandAgent({argv: LEGACY_AGENT}), true);
  assert.equal(owner.isCommandAgent({argv: TERMUX_AGENT}), true);
  assert.equal(owner.isCommandAgent({argv: [...TERMUX_AGENT, 'remote']}), false);
  const embedded = [
    'node',
    '-e',
    `console.log("${TERMUX_AGENT[1]}")`,
  ];
  assert.equal(owner.isCommandAgent({argv: embedded}), false);
});

test('exact S Termux PRoot command root projects ABSENT', () => {
  const root = fixture({agentArgv: TERMUX_AGENT, currentRoot: 'proot', includeRemoteParent: true});
  try {
    const out = owner.inspectLocal({
      cwd: '/root/nyang-worktrees/mcl-packet-3738',
      procRoot: root,
      selfPid: 10,
    });
    assert.equal(out.status, 'PASS');
    assert.equal(out.sessionState, 'ABSENT');
    assert.equal(out.reasonCode, 'SOLE_RDC_COMMAND_SESSION');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('peer direct shell projects PRESENT under S Termux PRoot ingress', () => {
  const root = fixture({agentArgv: TERMUX_AGENT, currentRoot: 'proot', peerShell: true});
  try {
    const out = owner.inspectLocal({
      cwd: '/root/nyang-repo',
      procRoot: root,
      selfPid: 10,
    });
    assert.equal(out.status, 'PASS');
    assert.equal(out.sessionState, 'PRESENT');
    assert.equal(out.reasonCode, 'OTHER_RDC_COMMAND_SESSION_PRESENT');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('peer exact S Termux PRoot command root projects PRESENT', () => {
  const root = fixture({agentArgv: TERMUX_AGENT, currentRoot: 'proot', peerProot: true});
  try {
    const out = owner.inspectLocal({
      cwd: '/root/nyang-repo',
      procRoot: root,
      selfPid: 10,
    });
    assert.equal(out.status, 'PASS');
    assert.equal(out.sessionState, 'PRESENT');
    assert.equal(out.reasonCode, 'OTHER_RDC_COMMAND_SESSION_PRESENT');
  } finally {
    fs.rmSync(root, {recursive: true, force: true});
  }
});

test('near-match PRoot root remains UNKNOWN', () => {
  const root = fixture({agentArgv: TERMUX_AGENT, currentRoot: 'proot', nearMatchProot: true});
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

test('M does not gain PRoot-root admission', () => {
  const root = fixture({agentArgv: TERMUX_AGENT, currentRoot: 'proot'});
  try {
    const out = owner.inspectLocal({
      cwd: '/data/data/com.termux/files/home/nyang-repo',
      procRoot: root,
      selfPid: 10,
    });
    assert.equal(out.status, 'UNKNOWN');
    assert.equal(out.sessionState, 'UNKNOWN');
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

test('command agent is distinguished from parent remote server for both wrappers', () => {
  for (const argv of [LEGACY_AGENT, TERMUX_AGENT]) {
    const root = fixture({includeRemoteParent: true, agentArgv: argv});
    try {
      const agent = owner.readProcRecord(root, 30);
      const remote = owner.readProcRecord(root, 40);
      assert.equal(owner.isCommandAgent(agent), true);
      assert.equal(owner.isCommandAgent(remote), false);
    } finally {
      fs.rmSync(root, {recursive: true, force: true});
    }
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
  const root = fixture({agentArgv: TERMUX_AGENT, currentRoot: 'proot', peerShell: true});
  try {
    const out = owner.inspectLocal({
      cwd: '/root/nyang-repo',
      procRoot: root,
      selfPid: 10,
    });
    const text = JSON.stringify(out);
    for (const forbidden of [
      'pid', 'ppid', 'cmdline', 'argv', 'process tree', '/proc/', 'sleep 20',
      'desktop-commander-remote-termux', '/data/data/com.termux/files/usr/bin/proot',
    ]) {
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
