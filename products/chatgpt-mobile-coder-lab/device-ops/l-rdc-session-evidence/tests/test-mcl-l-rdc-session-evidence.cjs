'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-l-rdc-session-evidence.cjs');

function row(pid, ppid, name, commandLine = '', creationTimeMs = 1000) {
  const commandLineReadable = typeof commandLine === 'string' && commandLine.length > 0;
  return {
    pid,
    ppid,
    name: name.toLowerCase(),
    commandLine: commandLineReadable ? commandLine : '',
    commandLineReadable,
    creationTimeMs,
  };
}

function rawTable(rows) {
  return rows.map((item) => ({
    ProcessId: item.pid,
    ParentProcessId: item.ppid,
    Name: item.name,
    CommandLine: item.commandLine,
    CreationTimeMs: item.creationTimeMs,
  }));
}

const AGENT_COMMAND =
  'node C:\\Users\\x\\desktop-commander-remote\\node_modules\\@wonderwhy-er\\desktop-commander\\dist\\index.js';


const WSL_SCRIPT =
  '/home/alsl0/.npm/_npx/cache123/node_modules/@wonderwhy-er/desktop-commander/dist/index.js';
const WSL_OTHER_SCRIPT =
  '/home/alsl0/.npm/_npx/other456/node_modules/@wonderwhy-er/desktop-commander/dist/index.js';

function wslRow(pid, ppid, name, argv = []) {
  return {pid, ppid, name: name.toLowerCase(), argv};
}

function wslFixture({
  peer = null,
  benign = false,
  secondAgent = false,
  parentScript = WSL_SCRIPT,
  agentScript = WSL_SCRIPT,
  agentRemote = false,
  parentRemote = true,
} = {}) {
  const agentArgv = agentRemote
    ? ['node', agentScript, 'remote']
    : ['node', agentScript];
  const parentLauncher = parentScript.replace(
    '/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
    '/node_modules/.bin/desktop-commander');
  const parentArgv = parentRemote
    ? ['node', parentLauncher, 'remote']
    : ['node', parentLauncher, 'serve'];
  const rows = [
    wslRow(1, 0, 'systemd', ['/sbin/init']),
    wslRow(40, 1, 'MainThread', parentArgv),
    wslRow(50, 40, 'MainThread', agentArgv),
    wslRow(60, 50, 'bash', ['bash', '-lc', 'node evidence.cjs inspect']),
    wslRow(61, 60, 'node', ['node', 'evidence.cjs', 'inspect']),
  ];
  if (peer) rows.push(wslRow(80, 50, peer, [peer, '-NoProfile']));
  if (benign) rows.push(wslRow(81, 50, 'python3', ['python3', '--version']));
  if (secondAgent) {
    const otherLauncher = WSL_OTHER_SCRIPT.replace(
      '/node_modules/@wonderwhy-er/desktop-commander/dist/index.js',
      '/node_modules/.bin/desktop-commander');
    rows.push(
      wslRow(90, 1, 'MainThread', ['node', otherLauncher, 'remote']),
      wslRow(91, 90, 'MainThread', ['node', WSL_OTHER_SCRIPT]),
      wslRow(92, 91, 'bash', ['bash']),
    );
  }
  return rows;
}

function fixture({peer = false, unexpected = false, duplicateAgent = false} = {}) {
  const rows = [
    row(1, 0, 'system.exe'),
    row(50, 1, 'node.exe', AGENT_COMMAND),
    row(60, 50, 'powershell.exe', 'powershell -NoProfile'),
    row(61, 60, 'node.exe', 'node evidence.cjs inspect'),
    row(70, 50, 'conhost.exe', 'conhost.exe'),
  ];
  if (peer) rows.push(row(80, 50, 'cmd.exe', 'cmd.exe'));
  if (unexpected) rows.push(row(81, 50, 'python.exe', 'python.exe worker.py'));
  if (duplicateAgent) {
    rows.push(row(40, 1, 'node.exe', AGENT_COMMAND));
    rows[0] = row(1, 40, 'powershell.exe', 'powershell');
  }
  return rows;
}

function withAlternateAgent(rows, {
  agentPid = 90,
  childPid = 91,
  childName = 'cmd.exe',
  agentTime = 1000,
  childTime = 1001,
  includeChild = true,
} = {}) {
  const out = [...rows, row(agentPid, 1, 'node.exe', AGENT_COMMAND, agentTime)];
  if (includeChild) out.push(row(childPid, agentPid, childName, childName, childTime));
  return out;
}

function withCurrentAgentWrapper(rows, {
  wrapperPid = 40,
  peer = false,
  unexpected = false,
} = {}) {
  const out = rows.map((item) => ({...item}));
  const agent = out.find((item) => item.pid === 50);
  agent.ppid = wrapperPid;
  out.push(row(wrapperPid, 1, 'node.exe', AGENT_COMMAND));
  if (peer) out.push(row(82, wrapperPid, 'cmd.exe', 'cmd.exe'));
  if (unexpected) out.push(row(83, wrapperPid, 'python.exe', 'python.exe worker.py'));
  return out;
}

function withOuterParentChain(rows, {
  wrapperPid = 40,
  count,
  startPid = 200,
  terminalPpid = 0,
} = {}) {
  const out = withCurrentAgentWrapper(rows, {wrapperPid});
  let child = out.find((item) => item.pid === wrapperPid);
  for (let index = 0; index < count; index += 1) {
    const parent = row(
      startPid + index,
      0,
      'runtimebroker.exe',
      'runtimebroker.exe',
      1000,
    );
    child.ppid = parent.pid;
    out.push(parent);
    child = parent;
  }
  child.ppid = terminalPpid;
  return out;
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
  for (const options of [
    {platform: 'linux', arch: 'x64', cwd: '/tmp', osRelease: 'microsoft-standard-WSL2'},
    {platform: 'linux', arch: 'x64', cwd: '/home/alsl0/nyang-repo', osRelease: 'generic-linux'},
    {platform: 'linux', arch: 'arm64', cwd: '/home/alsl0/nyang-repo', osRelease: 'microsoft-standard-WSL2'},
  ]) {
    const result = owner.inspectLocal({...options, selfPid: 61});
    assert.equal(result.status, 'UNKNOWN');
    assert.equal(result.sessionState, 'UNKNOWN');
    assert.equal(result.reasonCode, 'EXECUTION_PROFILE_UNKNOWN');
  }
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


test('same-instance marker wrapper lineage is not an alternate agent', () => {
  const result = owner.classifyProcessTable(withCurrentAgentWrapper(fixture()), 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('same-lineage wrapper direct shell remains definite PRESENT evidence', () => {
  const result = owner.classifyProcessTable(
    withCurrentAgentWrapper(fixture(), {peer: true}), 61);
  assert.deepEqual(result, {
    sessionState: 'PRESENT',
    reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
  });
});

test('same-lineage wrapper unexpected sibling remains global UNKNOWN', () => {
  const result = owner.classifyProcessTable(
    withCurrentAgentWrapper(fixture(), {unexpected: true}), 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('same-lineage wrapper does not hide a separate alternate shell agent', () => {
  const rows = withAlternateAgent(withCurrentAgentWrapper(fixture()));
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'PRESENT',
    reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
  });
});

test('same-lineage wrapper does not hide an ambiguous separate alternate agent', () => {
  const rows = withAlternateAgent(
    withCurrentAgentWrapper(fixture()), {includeChild: false});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('alternate eligible command agent with direct shell returns PRESENT', () => {
  const rows = withAlternateAgent(fixture());
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'PRESENT',
    reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
  });
});

test('alternate marker agent without classifiable shell returns global UNKNOWN', () => {
  const rows = withAlternateAgent(fixture(), {includeChild: false});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('alternate marker agent with stale creation-time relation returns global UNKNOWN', () => {
  const rows = withAlternateAgent(fixture(), {agentTime: 2000, childTime: 1000});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('alternate marker agent with unexpected direct child returns global UNKNOWN', () => {
  const rows = withAlternateAgent(fixture(), {childName: 'python.exe'});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('later definite alternate shell wins over earlier ambiguous alternate marker', () => {
  let rows = withAlternateAgent(fixture(), {
    agentPid: 90,
    childPid: 91,
    includeChild: false,
  });
  rows = withAlternateAgent(rows, {
    agentPid: 100,
    childPid: 101,
    childName: 'pwsh.exe',
  });
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'PRESENT',
    reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
  });
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

test('stale unrelated outer ancestor stops discovery without poisoning valid wrapper lineage', () => {
  const rows = withCurrentAgentWrapper(fixture(), {wrapperPid: 40});
  rows.push(row(30, 0, 'runtimebroker.exe', 'runtimebroker.exe', 2000));
  const wrapper = rows.find((item) => item.pid === 40);
  wrapper.ppid = 30;
  wrapper.creationTimeMs = 1000;
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('outer ancestor PID cycle remains fail closed', () => {
  const rows = withCurrentAgentWrapper(fixture(), {wrapperPid: 40});
  rows.push(row(30, 40, 'runtimebroker.exe', 'runtimebroker.exe', 900));
  const wrapper = rows.find((item) => item.pid === 40);
  wrapper.ppid = 30;
  wrapper.creationTimeMs = 1000;
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
  });
});

test('outer PID cycle is caught even when the first outer edge is stale', () => {
  const rows = withCurrentAgentWrapper(fixture(), {wrapperPid: 40});
  rows.push(row(30, 40, 'runtimebroker.exe', 'runtimebroker.exe', 2000));
  const wrapper = rows.find((item) => item.pid === 40);
  wrapper.ppid = 30;
  wrapper.creationTimeMs = 1000;
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
  });
});

test('longer outer PID cycle remains fail closed before stale-edge stopping', () => {
  const rows = withCurrentAgentWrapper(fixture(), {wrapperPid: 40});
  rows.push(row(30, 20, 'runtimebroker.exe', 'runtimebroker.exe', 2000));
  rows.push(row(20, 40, 'services.exe', 'services.exe', 1500));
  const wrapper = rows.find((item) => item.pid === 40);
  wrapper.ppid = 30;
  wrapper.creationTimeMs = 1000;
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
  });
});

test('cycle closing on the 16th parent lookup remains UNKNOWN', () => {
  const rows = withOuterParentChain(fixture(), {count: 12, terminalPpid: 61});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
  });
});

test('exact bounded parent chain ending at root remains eligible for ABSENT', () => {
  const rows = withOuterParentChain(fixture(), {count: 13, terminalPpid: 0});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('known ancestry beyond the bounded parent probe remains UNKNOWN', () => {
  const rows = withOuterParentChain(fixture(), {count: 14, terminalPpid: 0});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
  });
});

test('missing parent on the final bounded lookup remains a normal stop', () => {
  const rows = withOuterParentChain(fixture(), {count: 12, terminalPpid: 9999});
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('stale current-agent to marker-wrapper relation remains UNKNOWN', () => {
  const rows = withCurrentAgentWrapper(fixture(), {wrapperPid: 40});
  const wrapper = rows.find((item) => item.pid === 40);
  const agent = rows.find((item) => item.pid === 50);
  wrapper.creationTimeMs = 2000;
  agent.creationTimeMs = 1000;
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
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
    {ProcessId: 1, ParentProcessId: 0, Name: 'a.exe', CommandLine: '', CreationTimeMs: 1000},
    {ProcessId: 1, ParentProcessId: 0, Name: 'b.exe', CommandLine: '', CreationTimeMs: 1000},
  ])));
  assert.throws(() => owner.parseProcessTable(JSON.stringify([
    {ProcessId: 0, ParentProcessId: 0, Name: 'a.exe', CommandLine: '', CreationTimeMs: 1000},
  ])));
  assert.throws(() => owner.parseProcessTable(JSON.stringify([
    {ProcessId: 1, ParentProcessId: 0, Name: 'a.exe', CommandLine: ''},
  ])));
});

test('command-line readability is preserved internally and malformed types fail closed', () => {
  for (const value of [null, undefined, '']) {
    const normalized = owner.normalizeProcessRow({
      ProcessId: 1,
      ParentProcessId: 0,
      Name: 'node.exe',
      CommandLine: value,
      CreationTimeMs: 1000,
    });
    assert.equal(normalized.commandLine, '');
    assert.equal(normalized.commandLineReadable, false);
  }
  const readable = owner.normalizeProcessRow({
    ProcessId: 1,
    ParentProcessId: 0,
    Name: 'node.exe',
    CommandLine: 'node unrelated.js',
    CreationTimeMs: 1000,
  });
  assert.equal(readable.commandLineReadable, true);
  assert.equal(readable.commandLine, 'node unrelated.js');
  assert.throws(() => owner.normalizeProcessRow({
    ProcessId: 1,
    ParentProcessId: 0,
    Name: 'node.exe',
    CommandLine: 7,
    CreationTimeMs: 1000,
  }));
});

test('unreadable same-executable alternate process blocks global ABSENT', () => {
  const rows = [...fixture(), row(90, 1, 'node.exe', '')];
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('readable same-executable non-marker alternate does not block safe ABSENT', () => {
  const rows = [...fixture(), row(90, 1, 'node.exe', 'node unrelated-worker.js')];
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('unreadable unrelated executable does not become an agent candidate by absence alone', () => {
  const rows = [...fixture(), row(90, 1, 'python.exe', '')];
  const result = owner.classifyProcessTable(rows, 61);
  assert.deepEqual(result, {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});


test('WSL exact npx agent with sole current root returns ABSENT', () => {
  assert.deepEqual(owner.classifyWslProcessTable(wslFixture(), 61), {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('WSL known ancestry beyond the bounded traversal remains UNKNOWN', () => {
  const rows = wslFixture();
  rows[1].ppid = 100;
  for (let pid = 100; pid < 120; pid += 1) {
    rows.push(wslRow(pid, pid + 1, 'bash', ['bash']));
  }
  rows.push(wslRow(120, 0, 'systemd', ['/sbin/init']));
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL cycle closing beyond the bounded traversal remains UNKNOWN', () => {
  const rows = wslFixture();
  rows[1].ppid = 100;
  for (let pid = 100; pid < 120; pid += 1) {
    rows.push(wslRow(pid, pid + 1, 'bash', ['bash']));
  }
  rows.push(wslRow(120, 61, 'bash', ['bash']));
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL direct powershell peer returns PRESENT', () => {
  assert.deepEqual(owner.classifyWslProcessTable(
    wslFixture({peer: 'powershell.exe'}), 61), {
    sessionState: 'PRESENT',
    reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
  });
});

test('WSL arbitrary readable peer direct child is definite PRESENT', () => {
  assert.deepEqual(owner.classifyWslProcessTable(
    wslFixture({peer: 'ruby'}), 61), {
    sessionState: 'PRESENT',
    reasonCode: 'OTHER_RDC_COMMAND_SESSION_PRESENT',
  });
});

test('WSL exact python version probe is the only reviewed benign sibling', () => {
  assert.deepEqual(owner.classifyWslProcessTable(wslFixture({benign: true}), 61), {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
  const near = wslFixture();
  near.push(wslRow(81, 50, 'python3', ['python3', '-V']));
  assert.equal(owner.classifyWslProcessTable(near, 61).sessionState, 'PRESENT');
});

test('WSL marker text embedded in caller argv cannot self-spoof agent identity', () => {
  const rows = wslFixture();
  rows[4].argv = ['node', 'caller.cjs',
    '/home/alsl0/.npm/_npx/cache123/node_modules/@wonderwhy-er/desktop-commander/dist/index.js'];
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('WSL near-match package path remains UNKNOWN', () => {
  const rows = wslFixture({agentScript:
    '/home/alsl0/desktop-commander/node_modules/@wonderwhy-er/desktop-commander/dist/index.js'});
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL command agent with final remote is not admitted', () => {
  assert.equal(owner.classifyWslProcessTable(
    wslFixture({agentRemote: true}), 61).sessionState, 'UNKNOWN');
});

test('WSL remote parent requires exact final remote argument', () => {
  assert.equal(owner.classifyWslProcessTable(
    wslFixture({parentRemote: false}), 61).sessionState, 'UNKNOWN');
});

test('WSL remote parent must use the same npx cache identity', () => {
  assert.equal(owner.classifyWslProcessTable(
    wslFixture({parentScript: WSL_OTHER_SCRIPT}), 61).sessionState, 'UNKNOWN');
});

test('WSL remote parent requires the exact same-cache launcher path', () => {
  const rows = wslFixture();
  rows[1].argv[1] =
    '/home/alsl0/.npm/_npx/cache123/near-match/desktop-commander';
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL proc cmdline decoding preserves internal and trailing empty argv entries', () => {
  assert.deepEqual(owner.parseWslCmdline(
    Buffer.from('node\0script\0\0')), ['node', 'script', '']);
  assert.deepEqual(owner.parseWslCmdline(
    Buffer.from('node\0\0script\0')), ['node', '', 'script']);
  assert.deepEqual(owner.parseWslCmdline(Buffer.alloc(0)), []);
});

test('WSL agent extra empty argv cannot collapse into the admitted two-argument shape', () => {
  const rows = wslFixture();
  rows[2].argv = ['node', WSL_SCRIPT, ''];
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL parent extra empty argv cannot collapse into the admitted three-argument shape', () => {
  const rows = wslFixture();
  rows[1].argv.push('');
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL npx cache identity is case-sensitive', () => {
  const upperCacheScript =
    '/home/alsl0/.npm/_npx/Cache123/node_modules/@wonderwhy-er/desktop-commander/dist/index.js';
  const rows = wslFixture({agentScript: upperCacheScript});
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL launcher path treats backslash as a literal character', () => {
  const rows = wslFixture();
  rows[1].argv[1] =
    '/home/alsl0/.npm/_npx/cache123/node_modules/.bin\\desktop-commander';
  assert.equal(owner.classifyWslProcessTable(rows, 61).sessionState, 'UNKNOWN');
});

test('WSL multiple globally qualifying agents remain UNKNOWN', () => {
  const result = owner.classifyWslProcessTable(wslFixture({secondAgent: true}), 61);
  assert.deepEqual(result, {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('WSL orphaned exact-script alternate remains global UNKNOWN', () => {
  const rows = wslFixture();
  rows.push(wslRow(90, 1, 'MainThread', ['node', WSL_OTHER_SCRIPT]));
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('WSL exact-script alternate with unsupported extra argv remains global UNKNOWN', () => {
  const rows = wslFixture();
  rows.push(wslRow(90, 1, 'MainThread', ['node', WSL_OTHER_SCRIPT, 'remote']));
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('WSL unreadable plausible node alternate blocks global ABSENT', () => {
  const rows = wslFixture();
  rows.push(wslRow(90, 1, 'node', []));
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('WSL unreadable plausible MainThread alternate blocks global ABSENT', () => {
  const rows = wslFixture();
  rows.push(wslRow(90, 1, 'MainThread', []));
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS',
  });
});

test('WSL readable nonmatching node alternate does not block safe ABSENT', () => {
  const rows = wslFixture();
  rows.push(wslRow(90, 1, 'node', ['node', 'unrelated-worker.js']));
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('WSL unreadable unrelated executable does not become a plausible agent', () => {
  const rows = wslFixture();
  rows.push(wslRow(90, 1, 'python3', []));
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('WSL unreadable direct peer remains fail-closed UNKNOWN', () => {
  const rows = wslFixture();
  rows.push(wslRow(80, 50, 'powershell.exe', []));
  assert.deepEqual(owner.classifyWslProcessTable(rows, 61), {
    sessionState: 'UNKNOWN',
    reasonCode: 'RDC_AGENT_CHILD_TOPOLOGY_AMBIGUOUS',
  });
});

test('WSL inspect profile can emit repository-owned PRESENT from injected proc evidence', () => {
  const result = owner.inspectLocal({
    platform: 'linux',
    arch: 'x64',
    cwd: '/home/alsl0/nyang-repo',
    osRelease: '6.6.0-microsoft-standard-WSL2',
    selfPid: 61,
    wslReader() { return wslFixture({peer: 'powershell.exe'}); },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.sessionState, 'PRESENT');
  assert.equal(result.reasonCode, 'OTHER_RDC_COMMAND_SESSION_PRESENT');
  assert.deepEqual(result.authority, owner.FALSE_AUTHORITY);
});

test('WSL proc read failure remains bounded UNKNOWN', () => {
  const result = owner.inspectLocal({
    platform: 'linux',
    arch: 'x64',
    cwd: '/home/alsl0/nyang-worktrees/example',
    osRelease: 'microsoft-standard-WSL2',
    selfPid: 61,
    wslReader() { throw new Error('private proc failure'); },
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.sessionState, 'UNKNOWN');
  assert.equal(result.reasonCode, 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  assert.equal(JSON.stringify(result).includes('private proc failure'), false);
});

test('WSL fixed L roots and positive WSL release are both required', () => {
  assert.equal(owner.isLWorkspaceCwd('/home/alsl0/nyang-repo'), true);
  assert.equal(owner.isLWorkspaceCwd('/home/alsl0/nyang-worktrees/x'), true);
  assert.equal(owner.isLWorkspaceCwd('/home/alsl0/nyang-repository'), false);
  assert.equal(owner.isWslRelease('6.6.0-microsoft-standard-WSL2'), true);
  assert.equal(owner.isWslRelease('6.6.0-generic'), false);
});

test('fixed PowerShell transport forces UTF-8 and projects creation time', () => {
  assert.match(owner.FIXED_POWERSHELL_SOURCE, /System\.Text\.UTF8Encoding/);
  assert.match(owner.FIXED_POWERSHELL_SOURCE, /\[Console\]::OutputEncoding=\$utf8/);
  assert.match(owner.FIXED_POWERSHELL_SOURCE, /\$OutputEncoding=\$utf8/);
  assert.match(owner.FIXED_POWERSHELL_SOURCE, /CreationTimeMs/);
  assert.match(owner.FIXED_POWERSHELL_SOURCE, /ToUnixTimeMilliseconds/);
});

test('non-ASCII command line round-trips through bounded JSON parser', () => {
  const commandLine = 'powershell -Command "세션 測試"';
  const rows = owner.parseProcessTable(JSON.stringify([{
    ProcessId: 1,
    ParentProcessId: 0,
    Name: 'powershell.exe',
    CommandLine: commandLine,
    CreationTimeMs: 1000,
  }]));
  assert.equal(rows[0].commandLine, commandLine);
});

test('Windows command-line ceiling admits 32767 and rejects larger rows', () => {
  assert.equal(owner.MAX_COMMAND_LINE, 32767);
  const exact = owner.normalizeProcessRow({
    ProcessId: 1,
    ParentProcessId: 0,
    Name: 'node.exe',
    CommandLine: 'x'.repeat(32767),
    CreationTimeMs: 1000,
  });
  assert.equal(exact.commandLine.length, 32767);
  assert.throws(() => owner.normalizeProcessRow({
    ProcessId: 1,
    ParentProcessId: 0,
    Name: 'node.exe',
    CommandLine: 'x'.repeat(32768),
    CreationTimeMs: 1000,
  }));
});

test('parent creation time must not be later than child creation time', () => {
  const parent = row(50, 1, 'node.exe', '', 1000);
  const child = row(60, 50, 'powershell.exe', '', 1001);
  assert.equal(owner.validParentLink(parent, child), true);
  assert.equal(owner.validParentLink({...parent, creationTimeMs: 1002}, child), false);
});

test('reused parent PID in ancestor chain fails closed', () => {
  const rows = fixture();
  rows.find((item) => item.pid === 50).creationTimeMs = 2000;
  rows.find((item) => item.pid === 60).creationTimeMs = 1000;
  const result = owner.classifyProcessTable(rows, 61);
  assert.equal(result.sessionState, 'UNKNOWN');
  assert.equal(result.reasonCode, 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
});

test('stale reused-parent peer shell never becomes PRESENT evidence', () => {
  const rows = fixture({peer: true});
  rows.find((item) => item.pid === 80).creationTimeMs = 999;
  const result = owner.classifyProcessTable(rows, 61);
  assert.equal(result.sessionState, 'UNKNOWN');
  assert.notEqual(result.sessionState, 'PRESENT');
});

test('malformed creation time becomes bounded UNKNOWN', () => {
  const raw = rawTable(fixture());
  delete raw[0].CreationTimeMs;
  const result = owner.inspectLocal({
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner() {
      return {code: 0, stdout: JSON.stringify(raw), stderr: '', signal: null, error: null};
    },
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.sessionState, 'UNKNOWN');
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

test('v2 schema marks the global-safe producer generation while field shape stays stable', () => {
  assert.equal(owner.SCHEMA, 'mcl-l-rdc-session-evidence.v2');
  assert.equal(owner.OWNER, 'mcl-l-rdc-session-evidence');
  assert.deepEqual(Object.keys(owner.receipt({
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  })), [
    'schema', 'status', 'executor', 'sessionState', 'reasonCode',
    'owner', 'details', 'authority',
  ]);
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
    'fs.writeFile',
    'fs.appendFile',
    'fs.rmSync',
    'fs.unlinkSync',
    'fs.renameSync',
  ]) assert.equal(source.includes(forbidden), false, forbidden);
});
