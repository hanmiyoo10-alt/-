#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SCHEMA = 'mcl-m-phantom-process-budget.v1';
const TARGET_MODEL = 'SM-S938N';
const TERMUX_PACKAGE = 'com.termux';
const MAX_OUTPUT_BYTES = 1024 * 1024;
const COMMAND_TIMEOUT_MS = 10000;
const TRACK_TIMEOUT_MS = 1200;

function baseReceipt(overrides = {}) {
  return {
    schema: SCHEMA,
    target: 'm',
    transport: 'wireless_adb',
    connection: 'unknown',
    model: 'unknown',
    max_phantom_processes: 'unknown',
    global_phantom_processes: 'unknown',
    termux_phantom_processes: 'unknown',
    headroom: 'unknown',
    result: 'unknown',
    details: 'withheld',
    ...overrides,
  };
}

function renderReceipt(receipt) {
  const order = [
    'schema', 'target', 'transport', 'connection', 'model',
    'max_phantom_processes', 'global_phantom_processes',
    'termux_phantom_processes', 'headroom', 'result', 'details',
  ];
  return order.map((key) => key + '=' + String(receipt[key])).join('\n') + '\n';
}

function resolveAdbPath({
  platform = process.platform,
  env = process.env,
  existsSync = fs.existsSync,
} = {}) {
  if (platform !== 'win32') return {ok: false, reason: 'platform'};
  const root = typeof env.LOCALAPPDATA === 'string' ? env.LOCALAPPDATA.trim() : '';
  if (!root) return {ok: false, reason: 'localappdata'};
  const candidate = path.win32.join(root, 'Android', 'platform-tools', 'adb.exe');
  if (!existsSync(candidate)) return {ok: false, reason: 'missing'};
  return {ok: true, path: candidate};
}

function defaultRunner(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: args[0] === 'track-devices' && args[1] === '--proto-text' ? TRACK_TIMEOUT_MS : COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
  });
  return {
    code: result.status === null ? 1 : result.status,
    signal: result.signal || null,
    error: result.error || null,
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
  };
}

function successful(result) {
  return Boolean(result) && !result.error && !result.signal && result.code === 0;
}

function parseConnectedDevices(text) {
  const rows = [];
  for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
    const line = raw.trim();
    if (!line || line === 'List of devices attached') continue;
    const match = /^(\S+)\s+(\S+)(?:\s+.*)?$/.exec(line);
    if (match && match[2] === 'device') rows.push({serial: match[1]});
  }
  return rows;
}

function parseTermuxUid(text) {
  const match = /^package:com\.termux\s+uid:(\d+)\s*$/m.exec(String(text || '').replace(/\r/g, ''));
  if (!match) return null;
  const uid = Number(match[1]);
  return Number.isSafeInteger(uid) ? uid : null;
}

function termuxUidToken(uid) {
  if (!Number.isSafeInteger(uid) || uid < 10000 || uid >= 20000) return null;
  return 'u0a' + String(uid - 10000);
}

function parseMaxPhantomProcesses(text) {
  const match = /\bmax_phantom_processes\s*[=:]\s*(\d+)\b/.exec(String(text || ''));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parsePhantomCounts(text, termuxToken) {
  if (typeof termuxToken !== 'string' || !/^u0a\d+$/.test(termuxToken)) return null;
  const records = String(text || '').replace(/\r/g, '').split('\n')
    .filter((line) => /^\s*proc #\d+:\s+PhantomProcessRecord\b/.test(line));
  const escaped = termuxToken.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const tokenPattern = new RegExp('(?:^|[^A-Za-z0-9_])' + escaped + '(?:[^A-Za-z0-9_]|$)');
  return {
    global: records.length,
    termux: records.filter((line) => tokenPattern.test(line)).length,
  };
}

function runAdb(runner, adb, args) {
  return runner(adb, args);
}

function singleOutputLine(text, maxLength = 128) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  while (lines.length && lines.at(-1) === '') lines.pop();
  if (lines.length !== 1) return null;
  const value = lines[0].trim();
  if (!value || value.length > maxLength || /[^\x20-\x7e]/.test(value)) return null;
  return value;
}

function trackerSnapshotUsable(result) {
  if (!result || !String(result.stdout || '').trim()) return false;
  if (successful(result)) return true;
  return Boolean(result.error)
    && result.error.code === 'ETIMEDOUT'
    && result.signal === 'SIGTERM';
}

function parseTrackDevicesProto(text) {
  const normalized = String(text || '').replace(/\r/g, '');
  const blockPattern = /(?:^|\n)device\s*\{\n([\s\S]*?)\n\}/g;
  const entries = [];
  const seen = new Set();
  let match;
  while ((match = blockPattern.exec(normalized)) !== null) {
    const body = match[1];
    const serialMatch = /^\s*serial:\s*"([^"\\\x00-\x1f]{1,256})"\s*$/m.exec(body);
    const stateMatch = /^\s*state:\s*([A-Z_]+)\s*$/m.exec(body);
    const typeMatch = /^\s*connection_type:\s*([A-Z_]+)\s*$/m.exec(body);
    if (!serialMatch || !stateMatch || !typeMatch || seen.has(serialMatch[1])) {
      return {ok: false, entries: []};
    }
    seen.add(serialMatch[1]);
    entries.push({
      serial: serialMatch[1],
      state: stateMatch[1],
      connectionType: typeMatch[1],
    });
  }
  if (!entries.length) return {ok: false, entries: []};
  return {ok: true, entries};
}

function selectWirelessTarget({runner, adb, devices, trackerResult}) {
  if (devices.length === 0) return {state: 'offline'};
  if (!trackerSnapshotUsable(trackerResult)) return {state: 'unknown'};

  const parsed = parseTrackDevicesProto(trackerResult.stdout);
  if (!parsed.ok) return {state: 'unknown'};

  const bySerial = new Map(parsed.entries.map((entry) => [entry.serial, entry]));
  const connectedSerials = new Set(devices.map((row) => row.serial));
  let unresolved = parsed.entries.some((entry) => entry.state === 'DEVICE'
    && !connectedSerials.has(entry.serial)) ? 1 : 0;
  let socketCandidates = 0;
  const matches = [];

  for (const candidate of devices) {
    const tracked = bySerial.get(candidate.serial);
    if (!tracked || tracked.state !== 'DEVICE') {
      unresolved += 1;
      continue;
    }
    if (tracked.connectionType === 'USB') continue;
    if (tracked.connectionType !== 'SOCKET') {
      unresolved += 1;
      continue;
    }

    socketCandidates += 1;
    const modelResult = runAdb(runner, adb, [
      '-s', candidate.serial, 'shell', 'getprop', 'ro.product.model',
    ]);
    if (!successful(modelResult)) {
      unresolved += 1;
      continue;
    }
    const model = singleOutputLine(modelResult.stdout);
    if (!model) {
      unresolved += 1;
      continue;
    }
    if (model === TARGET_MODEL) matches.push(candidate.serial);
  }

  if (matches.length > 1) return {state: 'ambiguous'};
  if (unresolved > 0) return {state: 'unknown'};
  if (matches.length === 1) return {state: 'match', serial: matches[0]};
  if (socketCandidates === 0) return {state: 'offline'};
  return {state: 'mismatch'};
}

function collectStatus({
  platform = process.platform,
  env = process.env,
  existsSync = fs.existsSync,
  runner = defaultRunner,
} = {}) {
  const resolved = resolveAdbPath({platform, env, existsSync});
  if (!resolved.ok) return baseReceipt();

  const devicesResult = runAdb(runner, resolved.path, ['devices', '-l']);
  if (!successful(devicesResult)) return baseReceipt();
  const devices = parseConnectedDevices(devicesResult.stdout);
  const trackerResult = runAdb(runner, resolved.path, ['track-devices', '--proto-text']);
  const selected = selectWirelessTarget({
    runner, adb: resolved.path, devices, trackerResult,
  });
  if (selected.state === 'offline') {
    return baseReceipt({connection: 'offline', result: 'blocked'});
  }
  if (selected.state === 'ambiguous') {
    return baseReceipt({connection: 'ambiguous', result: 'blocked'});
  }
  if (selected.state === 'mismatch') {
    return baseReceipt({connection: 'connected', model: 'mismatch', result: 'blocked'});
  }
  if (selected.state !== 'match') return baseReceipt();

  const serial = selected.serial;
  const uidResult = runAdb(runner, resolved.path, [
    '-s', serial, 'shell', 'cmd', 'package', 'list', 'packages', '-U', TERMUX_PACKAGE,
  ]);
  if (!successful(uidResult)) {
    return baseReceipt({connection: 'connected', model: 'match'});
  }
  const uid = parseTermuxUid(uidResult.stdout);
  const token = termuxUidToken(uid);
  if (!token) return baseReceipt({connection: 'connected', model: 'match'});

  const settingsResult = runAdb(runner, resolved.path, [
    '-s', serial, 'shell', 'dumpsys', 'activity', 'settings',
  ]);
  if (!successful(settingsResult)) {
    return baseReceipt({connection: 'connected', model: 'match'});
  }
  const max = parseMaxPhantomProcesses(settingsResult.stdout);
  if (max === null) return baseReceipt({connection: 'connected', model: 'match'});

  const processesResult = runAdb(runner, resolved.path, [
    '-s', serial, 'shell', 'dumpsys', 'activity', 'processes',
  ]);
  if (!successful(processesResult)) {
    return baseReceipt({connection: 'connected', model: 'match'});
  }
  const counts = parsePhantomCounts(processesResult.stdout, token);
  if (!counts) return baseReceipt({connection: 'connected', model: 'match'});

  return baseReceipt({
    connection: 'connected',
    model: 'match',
    max_phantom_processes: max,
    global_phantom_processes: counts.global,
    termux_phantom_processes: counts.termux,
    headroom: Math.max(0, max - counts.global),
    result: 'pass',
  });
}

function main(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || argv[0] !== 'status') {
    process.stdout.write(renderReceipt(baseReceipt()));
    process.exitCode = 64;
    return;
  }
  const receipt = collectStatus();
  process.stdout.write(renderReceipt(receipt));
  process.exitCode = receipt.result === 'pass' ? 0 : receipt.result === 'blocked' ? 3 : 4;
}

if (require.main === module) main();

module.exports = {
  SCHEMA,
  TARGET_MODEL,
  TERMUX_PACKAGE,
  baseReceipt,
  collectStatus,
  parseConnectedDevices,
  parseTrackDevicesProto,
  parseMaxPhantomProcesses,
  parsePhantomCounts,
  parseTermuxUid,
  renderReceipt,
  resolveAdbPath,
  selectWirelessTarget,
  singleOutputLine,
  trackerSnapshotUsable,
  termuxUidToken,
};
