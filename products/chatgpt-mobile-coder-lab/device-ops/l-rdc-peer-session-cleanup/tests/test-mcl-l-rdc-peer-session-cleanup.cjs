#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-l-rdc-peer-session-cleanup.cjs');
const sessionEvidence = require('../../l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs');

const MARKER = 'node C:\\Users\\x\\AppData\\Local\\npm-cache\\node_modules\\@wonderwhy-er\\desktop-commander\\dist\\index.js remote';

const WINDOWS_EPOCH_FILETIME = 116444736000000000n;

function fileTimeForMs(ms, extraTicks = 0n) {
  return String(WINDOWS_EPOCH_FILETIME + (BigInt(ms) * 10000n) + extraTicks);
}

function row(pid, ppid, name, commandLine = name, creationTimeMs = 1000, commandLineReadable = true) {
  return {
    pid,
    ppid,
    name,
    commandLine,
    commandLineReadable,
    creationTimeMs,
    creationFileTime: fileTimeForMs(creationTimeMs),
  };
}

function setCreation(rowValue, creationTimeMs, extraTicks = 0n) {
  rowValue.creationTimeMs = creationTimeMs;
  rowValue.creationFileTime = fileTimeForMs(creationTimeMs, extraTicks);
  return rowValue;
}

function baseRows() {
  return [
    row(10, 0, 'services.exe', 'services.exe', 800),
    row(40, 10, 'node.exe', MARKER, 900),
    row(50, 40, 'node.exe', MARKER, 1000),
    row(60, 50, 'cmd.exe', 'cmd.exe /d /s /c current', 1100),
    row(61, 60, 'node.exe', 'node cleanup-owner inspect', 1200),
  ];
}

function addPeer(rows, pid, name = 'powershell.exe', creationTimeMs = 1150) {
  rows.push(row(pid, 50, name, name, creationTimeMs));
  rows.push(row(pid + 1, pid, 'conhost.exe', 'conhost.exe', creationTimeMs + 1));
  rows.push(row(pid + 2, pid, 'wsl.exe', 'wsl.exe', creationTimeMs + 1));
  return rows;
}

function cloneRows(rows) {
  return rows.map((item) => ({...item}));
}

function rawRows(rows) {
  return rows.map((item) => ({
    ProcessId: item.pid,
    ParentProcessId: item.ppid,
    Name: item.name,
    CommandLine: item.commandLineReadable ? item.commandLine : null,
    CreationTimeMs: item.creationTimeMs,
    CreationFileTime: item.creationFileTime,
  }));
}

function runnerFor(getRows) {
  return () => ({
    code: 0,
    stdout: JSON.stringify(rawRows(getRows())),
    stderr: '',
    signal: null,
    error: null,
  });
}

function removeTree(rows, rootPid) {
  const remove = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of rows) {
      if (remove.has(item.ppid) && !remove.has(item.pid)) {
        remove.add(item.pid);
        changed = true;
      }
    }
  }
  return rows.filter((item) => !remove.has(item.pid));
}

test('CLI exposes inspect and fixed-confirm cleanup only', () => {
  assert.deepEqual(owner.parseArgs(['inspect']), {operation: 'inspect', confirm: false});
  assert.deepEqual(owner.parseArgs(['cleanup']), {operation: 'cleanup', confirm: false});
  assert.deepEqual(owner.parseArgs(['cleanup', owner.CONFIRM_FLAG]), {
    operation: 'cleanup', confirm: true,
  });
  for (const argv of [
    [],
    ['inspect', '123'],
    ['cleanup', '--pid', '70'],
    ['cleanup', '--session', 'x'],
    ['cleanup', '--force'],
    ['taskkill'],
  ]) assert.throws(() => owner.parseArgs(argv), /ARGUMENT_UNSUPPORTED/);
});

test('current root alone is already clean', () => {
  const result = owner.classifyCleanupRows(baseRows(), 61);
  assert.equal(result.status, 'PASS');
  assert.equal(result.effectEligibility, 'ALREADY_CLEAN');
  assert.equal(result.peerShellCount, 0);
  assert.equal(result.cleanupCandidateCount, 0);
});

test('one exact direct peer is eligible', () => {
  const result = owner.classifyCleanupRows(addPeer(baseRows(), 70), 61);
  assert.equal(result.status, 'PASS');
  assert.equal(result.effectEligibility, 'ELIGIBLE');
  assert.equal(result.peerShellCount, 1);
  assert.equal(result.cleanupCandidateCount, 1);
  assert.equal(result.context.candidates[0].pid, 70);
  assert.notEqual(result.context.currentRoot.pid, result.context.candidates[0].pid);
});

test('three exact direct peers are all eligible', () => {
  const rows = addPeer(addPeer(addPeer(baseRows(), 70), 80, 'cmd.exe', 1160), 90, 'pwsh.exe', 1170);
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.effectEligibility, 'ELIGIBLE');
  assert.equal(result.peerShellCount, 3);
  assert.equal(result.cleanupCandidateCount, 3);
  assert.equal(result.blockedCandidateCount, 0);
});

test('cleanup without operator-idle confirmation is blocked before process read', () => {
  let reads = 0;
  const result = owner.cleanupLocal({
    confirm: false,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: () => { reads += 1; throw new Error('must not read'); },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reasonCode, 'OPERATOR_IDLE_CONFIRMATION_REQUIRED');
  assert.equal(result.effectCount, 0);
  assert.equal(reads, 0);
});

test('benign conhost sibling under current agent does not become a cleanup candidate', () => {
  const rows = addPeer(baseRows(), 70);
  rows.push(row(55, 50, 'conhost.exe', 'conhost.exe', 1110));
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.effectEligibility, 'ELIGIBLE');
  assert.equal(result.cleanupCandidateCount, 1);
});

test('unexpected current-agent direct child fails closed', () => {
  const rows = addPeer(baseRows(), 70);
  rows.push(row(56, 50, 'wsl.exe', 'wsl.exe', 1110));
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.status, 'UNKNOWN');
  assert.notEqual(result.effectEligibility, 'ELIGIBLE');
});

test('peer missing WSL child blocks the transaction', () => {
  const rows = addPeer(baseRows(), 70).filter((item) => item.pid !== 72);
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reasonCode, 'PEER_TREE_SHAPE_BLOCKED');
});

test('peer with extra direct child blocks the transaction', () => {
  const rows = addPeer(baseRows(), 70);
  rows.push(row(73, 70, 'node.exe', 'node work.js', 1152));
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reasonCode, 'PEER_TREE_SHAPE_BLOCKED');
});

test('stale agent to peer CreationTime relation fails closed', () => {
  const rows = addPeer(baseRows(), 70, 'powershell.exe', 900);
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.status, 'UNKNOWN');
});

test('marker-bearing peer descendant blocks cleanup', () => {
  const rows = addPeer(baseRows(), 70);
  rows.push(row(73, 72, 'node.exe', MARKER, 1152));
  const result = owner.classifyCleanupRows(rows, 61);
  assert.notEqual(result.status, 'PASS');
  assert.notEqual(result.effectEligibility, 'ELIGIBLE');
});

test('alternate marker-agent ambiguity fails closed', () => {
  const rows = addPeer(baseRows(), 70);
  rows.push(row(100, 10, 'node.exe', MARKER, 1050));
  rows.push(row(101, 100, 'python.exe', 'python.exe', 1060));
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.status, 'UNKNOWN');
});

test('unreadable plausible alternate agent fails closed', () => {
  const rows = addPeer(baseRows(), 70);
  rows.push(row(100, 10, 'node.exe', '', 1050, false));
  const result = owner.classifyCleanupRows(rows, 61);
  assert.equal(result.status, 'UNKNOWN');
});

test('high-resolution root identity drift before effect denies the effect', () => {
  const first = addPeer(baseRows(), 70);
  const reused = cloneRows(first);
  reused.find((item) => item.pid === 70).creationFileTime = fileTimeForMs(1150, 10n);
  let reads = 0;
  let effects = 0;
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => (++reads === 1 ? first : reused)),
    effectRunner: () => {
      effects += 1;
      return {code: 0, status: 'COMPLETE', attemptedCount: 1, terminatedCount: 1};
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reasonCode, 'TARGET_GUARD_DRIFT_BEFORE_EFFECT');
  assert.equal(result.effectCount, 0);
  assert.equal(effects, 0);
});

test('high-resolution descendant identity drift before effect denies the effect', () => {
  const first = addPeer(baseRows(), 70);
  const reused = cloneRows(first);
  reused.find((item) => item.pid === 72).creationFileTime = fileTimeForMs(1151, 10n);
  let reads = 0;
  let effects = 0;
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => (++reads === 1 ? first : reused)),
    effectRunner: () => {
      effects += 1;
      return {code: 0, status: 'COMPLETE', attemptedCount: 1, terminatedCount: 1};
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reasonCode, 'TARGET_GUARD_DRIFT_BEFORE_EFFECT');
  assert.equal(result.effectCount, 0);
  assert.equal(effects, 0);
});

test('current root movement between admission and effect denies the effect', () => {
  const first = addPeer(baseRows(), 70);
  const moved = cloneRows(first);
  setCreation(moved.find((item) => item.pid === 60), 9999);
  let reads = 0;
  let effects = 0;
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => (++reads === 1 ? first : moved)),
    effectRunner: () => {
      effects += 1;
      return {code: 0, status: 'COMPLETE', attemptedCount: 1, terminatedCount: 1};
    },
  });
  assert.notEqual(result.status, 'PASS');
  assert.notEqual(result.effectEligibility, 'ELIGIBLE');
  assert.equal(result.effectCount, 0);
  assert.equal(effects, 0);
});

test('pre-effect observation UNKNOWN is preserved with zero effect', () => {
  const first = addPeer(baseRows(), 70);
  let reads = 0;
  let effects = 0;
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: () => {
      reads += 1;
      if (reads === 1) return runnerFor(() => first)();
      return {code: 127, stdout: '', stderr: '', signal: null, error: new Error('read failed')};
    },
    effectRunner: () => {
      effects += 1;
      return {code: 0, status: 'COMPLETE', attemptedCount: 1, terminatedCount: 1};
    },
  });
  assert.equal(result.status, 'UNKNOWN');
  assert.equal(result.reasonCode, 'RDC_PROCESS_READ_FAILED');
  assert.equal(result.effectDisposition, 'UNKNOWN');
  assert.equal(result.effectCount, 0);
  assert.equal(effects, 0);
});

test('root disappearance with guarded children left behind is PARTIAL not COMPLETE', () => {
  let rows = addPeer(baseRows(), 70);
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
    effectRunner: ({targets}) => {
      const root = targets.find((guard) => guard.depth === 0);
      rows = rows.filter((item) => item.pid !== root.pid);
      return {code: 5, status: 'PARTIAL', reasonCode: 'HANDLE_TERMINATE_FAILED',
        attemptedCount: 1, terminatedCount: 1};
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reasonCode, 'GUARDED_TREE_STILL_PRESENT');
  assert.equal(result.effectDisposition, 'PARTIAL');
  assert.equal(result.effectCount, 0);
});

test('guarded child disappearance without root removal is PARTIAL not COMPLETE', () => {
  let rows = addPeer(baseRows(), 70);
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
    effectRunner: ({targets}) => {
      const child = targets.find((guard) => guard.depth === 1);
      rows = rows.filter((item) => item.pid !== child.pid);
      return {code: 5, status: 'PARTIAL', reasonCode: 'HANDLE_TERMINATE_FAILED',
        attemptedCount: 1, terminatedCount: 1};
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reasonCode, 'GUARDED_TREE_STILL_PRESENT');
  assert.equal(result.effectDisposition, 'PARTIAL');
  assert.equal(result.effectCount, 0);
});

test('identity helper denial before terminate has zero effect', () => {
  let rows = addPeer(baseRows(), 70);
  let effects = 0;
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
    effectRunner: () => {
      effects += 1;
      return {code: 2, status: 'BLOCKED', reasonCode: 'HANDLE_IDENTITY_MISMATCH',
        attemptedCount: 0, terminatedCount: 0};
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.effectCount, 0);
  assert.equal(effects, 1);
});

test('lost effect acknowledgement is recovered only after whole guarded tree readback', () => {
  let rows = addPeer(baseRows(), 70);
  let effects = 0;
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
    effectRunner: ({targets}) => {
      effects += 1;
      const root = targets.find((guard) => guard.depth === 0);
      rows = removeTree(rows, root.pid);
      return {code: 127, status: 'UNKNOWN', reasonCode: 'HANDLE_HELPER_OUTPUT_INVALID',
        attemptedCount: 1, terminatedCount: 0, error: new Error('ack lost'), signal: null};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.effectDisposition, 'COMPLETE');
  assert.equal(result.effectCount, 1);
  assert.equal(result.remainingPeerShellCount, 0);
  assert.equal(effects, 1);
});

test('partial cleanup stops without blind retry', () => {
  let rows = addPeer(addPeer(baseRows(), 70), 80, 'cmd.exe', 1160);
  let effects = 0;
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
    effectRunner: ({targets}) => {
      effects += 1;
      const root = targets.find((guard) => guard.depth === 0);
      if (effects === 1) {
        rows = removeTree(rows, root.pid);
        return {code: 0, status: 'COMPLETE', reasonCode: 'HANDLE_TREE_TERMINATION_COMPLETE',
          attemptedCount: targets.length, terminatedCount: targets.length};
      }
      return {code: 5, status: 'PARTIAL', reasonCode: 'HANDLE_TERMINATE_FAILED',
        attemptedCount: 1, terminatedCount: 0};
    },
  });
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.effectDisposition, 'PARTIAL');
  assert.equal(result.effectCount, 1);
  assert.equal(result.remainingPeerShellCount, 1);
  assert.equal(effects, 2);
});

test('successful cleanup requires final exact ABSENT evidence and whole-tree disappearance', () => {
  let rows = addPeer(baseRows(), 70);
  const result = owner.cleanupLocal({
    confirm: true,
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
    effectRunner: ({targets}) => {
      const root = targets.find((guard) => guard.depth === 0);
      rows = removeTree(rows, root.pid);
      return {code: 0, status: 'COMPLETE', reasonCode: 'HANDLE_TREE_TERMINATION_COMPLETE',
        attemptedCount: targets.length, terminatedCount: targets.length};
    },
  });
  assert.equal(result.status, 'PASS');
  assert.equal(result.reasonCode, 'PEER_SESSION_CLEANUP_COMPLETE');
  assert.equal(result.effectCount, 1);
  assert.deepEqual(sessionEvidence.classifyProcessTable(rows, 61), {
    sessionState: 'ABSENT',
    reasonCode: 'SOLE_RDC_COMMAND_SESSION',
  });
});

test('inspect receipt is bounded and privacy-safe', () => {
  const rows = addPeer(addPeer(addPeer(baseRows(), 70), 80), 90);
  const receipt = owner.inspectLocal({
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
  });
  const text = JSON.stringify(receipt);
  assert.equal(receipt.status, 'PASS');
  assert.equal(receipt.effectEligibility, 'ELIGIBLE');
  assert.equal(receipt.peerShellCount, 3);
  for (const forbidden of [
    'ProcessId', 'ParentProcessId', 'commandLine', 'creationTimeMs',
    'windows account', 'session id', 'device id', MARKER,
  ]) assert.equal(text.includes(forbidden), false);
  assert.deepEqual(receipt.authority, owner.FALSE_AUTHORITY);
});

test('source uses fixed handle-bound Win32 termination and no PID-only taskkill fallback', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-l-rdc-peer-session-cleanup.cjs'), 'utf8');
  assert.match(source, /OpenProcess/);
  assert.match(source, /GetProcessTimes/);
  assert.match(source, /TerminateProcess/);
  assert.match(source, /CloseHandle/);
  assert.match(source, /WaitForSingleObject/);
  assert.equal(source.toLowerCase().includes('taskkill.exe'), false);
  assert.equal(source.includes("'/F'") || source.includes('\"/F\"'), false);
  assert.equal(source.includes('childProcess.exec(') || source.includes('childProcess.execFile('), false);
  assert.equal(source.includes('fetch(') || source.includes('http://') || source.includes('https://'), false);
  assert.equal(source.includes('Stop-Process') || source.includes('Start-Process') || source.includes('Restart-Service') || source.includes('Stop-Service'), false);
  const bindLoop = source.indexOf('foreach($item in $items)');
  const terminateLoop = source.indexOf('foreach($entry in @($opened');
  assert.ok(bindLoop >= 0 && terminateLoop > bindLoop);
});

test('private creation identity never appears in public inspect receipt', () => {
  const rows = addPeer(baseRows(), 70);
  const receipt = owner.inspectLocal({
    platform: 'win32',
    arch: 'x64',
    selfPid: 61,
    runner: runnerFor(() => rows),
  });
  const text = JSON.stringify(receipt);
  assert.equal(text.includes('creationFileTime'), false);
  assert.equal(text.includes(fileTimeForMs(1150)), false);
});
