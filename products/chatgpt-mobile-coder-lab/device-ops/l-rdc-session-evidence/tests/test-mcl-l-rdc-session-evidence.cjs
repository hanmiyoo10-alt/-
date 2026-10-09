'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-l-rdc-session-evidence.cjs');

function row(pid, ppid, name, commandLine = '') {
  return {pid, ppid, name: name.toLowerCase(), commandLine};
}

function rawTable(rows) {
  return rows.map((item) => ({
    ProcessId: item.pid,
    ParentProcessId: item.ppid,
    Name: item.name,
    CommandLine: item.commandLine,
  }));
}

function fixture({peer = false, unexpected = false, duplicateAgent = false} = {}) {
  const rows = [
    row(1, 0, 'system.exe'),
    row(50, 1, 'node.exe',
      'node C:\\Users\\x\\desktop-commander-remote\\node_modules\\@wonderwhy-er\\desktop-commander\\dist\\index.js'),
    row(60, 50, 'powershell.exe', 'powershell -NoProfile'),
    row(61, 60, 'node.exe', 'node evidence.cjs inspect'),
    row(70, 50, 'conhost.exe', 'conhost.exe'),
  ];
  if (peer) rows.push(row(80, 50, 'cmd.exe', 'cmd.exe'));
  if (unexpected) rows.push(row(81, 50, 'python.exe', 'python.exe worker.py'));
  if (duplicateAgent) {
    rows.push(row(40, 1, 'node.exe',
      'node C:\\Users\\x\\desktop-commander-remote\\node_modules\\@wonderwhy-er\\desktop-commander\\dist\\index.js'));
    rows[0] = row(1, 40, 'powershell.exe', 'powershell');
  }
  return rows;
}

test('fixed CLI admits inspect only', () => {
  assert.deepEqual(owner.parseArgs(['inspect']), {operation: 'inspect'});
  for (const argv of [
    [],
    ['status'],
    ['inspect', '--pid', '1'],
    ['inspect', '--process', 'x'],
    ['inspect', '--agent', 'x'],
    ['inspect', '--timeout', '1'],
  ]) assert.throws(() => owner.parseArgs(argv));
});

test('unsupported execution profile fails closed', () => {
  const result = owner.inspectLocal({
    platform: 'linux',
    arch: 'x64',
    selfPid: 61,
    runner() { throw new Error('must not run'); },
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.sessionState, 'UNKNOWN');
  assert.equal(result.reasonCode, 'EXECUTION_PROFILE_UNKNOWN');
});

test('verified agent with sole shell returns ABSENT', () => {
  const result = owner.inspectLocal({
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner() {
      return {code: 0, stdout: JSON.stringify(rawTable(fixture())), stderr: '', signal: null, error: null};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.sessionState, 'ABSENT');
  assert.equal(result.reasonCode, 'SOLE_RDC_COMMAND_SESSION');
});

test('peer direct shell returns PRESENT without owner inference', () => {
  const result = owner.inspectLocal({
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner() {
      return {code: 0, stdout: JSON.stringify(rawTable(fixture({peer: true}))), stderr: '', signal: null, error: null};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.sessionState, 'PRESENT');
  assert.equal(result.reasonCode, 'OTHER_RDC_COMMAND_SESSION_PRESENT');
  assert.notEqual(result.sessionState, 'LIVE');
  assert.deepEqual(result.authority, owner.FALSE_AUTHORITY);
});

test('conhost direct child is the only Windows benign sibling', () => {
  const result = owner.classifyProcessTable(fixture(), 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
  const bad = owner.classifyProcessTable(fixture({unexpected: true}), 61);
  assert.deepEqual(bad, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_CHILD_TOPOLOGY_AMBIGUOUS',
  });
});

test('missing current process fails closed', () => {
  const result = owner.classifyProcessTable(fixture(), 999);
  assert.equal(result.sessionState, 'UNKNOWN');
});

test('missing ancestor above verified agent does not invalidate direct relation', () => {
  const rows = fixture().filter((item) => item.pid !== 1);
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('agent marker requires direct shell-child relation', () => {
  const rows = fixture();
  rows.find((item) => item.pid === 60).name = 'node.exe';
  const result = owner.classifyProcessTable(rows, 61);
  assert.equal(result.sessionState, 'UNKNOWN');
  assert.equal(result.reasonCode, 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
});

test('ambiguous agent candidates fail closed', () => {
  const rows = [
    row(100, 1, 'node.exe',
      'node desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js'),
    row(110, 100, 'powershell.exe', 'powershell'),
    row(120, 110, 'node.exe',
      'node desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js'),
    row(130, 120, 'cmd.exe', 'cmd'),
    row(140, 130, 'node.exe', 'node evidence.cjs inspect'),
  ];
  const result = owner.classifyProcessTable(rows, 140);
  assert.equal(result.sessionState, 'UNKNOWN');
  assert.equal(result.reasonCode, 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
});

test('malformed process table is UNKNOWN and raw data is not returned', () => {
  const result = owner.inspectLocal({
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner() {
      return {code: 0, stdout: '{broken', stderr: 'private raw error', signal: null, error: null};
    },
  });
  assert.equal(result.status, 'UNKNOWN');
  const text = JSON.stringify(result);
  assert.equal(text.includes('private raw error'), false);
  assert.equal(text.includes('ProcessId'), false);
});

test('process table rejects duplicate PID and invalid fields', () => {
  assert.throws(() => owner.parseProcessTable(JSON.stringify([
    {ProcessId: 1, ParentProcessId: 0, Name: 'a.exe', CommandLine: ''},
    {ProcessId: 1, ParentProcessId: 0, Name: 'b.exe', CommandLine: ''},
  ])));
  assert.throws(() => owner.parseProcessTable(JSON.stringify([
    {ProcessId: 0, ParentProcessId: 0, Name: 'a.exe', CommandLine: ''},
  ])));
});

test('fixed Windows transport has no caller interpolation surface', () => {
  assert.equal(owner.POWERSHELL,
    'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.ok(owner.FIXED_POWERSHELL_ARGS.includes('-EncodedCommand'));
  assert.match(owner.FIXED_POWERSHELL_SOURCE, /Get-CimInstance Win32_Process/);
  assert.match(owner.FIXED_POWERSHELL_SOURCE, /ConvertTo-Json/);
  const source = fs.readFileSync(
    path.resolve(__dirname, '../mcl-l-rdc-session-evidence.cjs'), 'utf8');
  assert.match(source, /shell: false/);
  assert.doesNotMatch(source, /shell: true/);
  assert.doesNotMatch(source, /childProcess\.exec/);
});

test('receipt is bounded and excludes raw process/session identity', () => {
  const value = owner.receipt({
    sessionState: 'PRESENT',
    reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
  });
  assert.deepEqual(Object.keys(value), [
    'schema', 'status', 'executor', 'sessionState', 'reasonCode',
    'owner', 'details', 'authority',
  ]);
  const text = JSON.stringify(value).toLowerCase();
  for (const forbidden of [
    'processid', 'parentprocessid', 'cmdline', 'commandline',
    'ppid', 'session_id', 'device_id', 'username', 'environment',
  ]) assert.equal(text.includes(forbidden), false, forbidden);
});

test('source has no process/session/repository/recovery mutation surface', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../mcl-l-rdc-session-evidence.cjs'), 'utf8');
  for (const forbidden of [
    'process.kill(',
    'childProcess.kill',
    'Stop-Process',
    'taskkill',
    'TerminateProcess',
    "['commit'",
    "['push'",
    "['reset'",
    "['clean'",
    "['checkout'",
    "'PATCH'",
    "'POST'",
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});
