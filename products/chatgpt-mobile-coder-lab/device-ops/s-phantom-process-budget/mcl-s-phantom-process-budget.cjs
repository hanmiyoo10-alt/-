#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');

const SCHEMA = 'mcl-s-phantom-process-budget.v1';
const TARGET_MODEL = 'SM-G998N';
const TERMUX_PACKAGE = 'com.termux';
const ADB_PATH = '/data/data/com.termux/files/usr/bin/adb';
const MAX_OUTPUT_BYTES = 1024 * 1024;
const COMMAND_TIMEOUT_MS = 10000;

function baseReceipt(overrides = {}) {
  return {
    schema: SCHEMA,
    target: 's',
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

function resolveAdbPath({existsSync = fs.existsSync} = {}) {
  if (!existsSync(ADB_PATH)) return {ok: false, reason: 'missing'};
  return {ok: true, path: ADB_PATH};
}

function defaultRunner(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    timeout: COMMAND_TIMEOUT_MS,
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
  const match = /^package:com\.termux\s+uid:(\d+)\s*$/m.exec(
    String(text || '').replace(/\r/g, ''),
  );
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
  const tokenPattern = new RegExp(
    '(?:^|[^A-Za-z0-9_])' + escaped + '(?:[^A-Za-z0-9_]|$)',
  );
  return {
    global: records.length,
    termux: records.filter((line) => tokenPattern.test(line)).length,
  };
}

function runAdb(runner, adb, args) {
  return runner(adb, args);
}

function collectStatus({
  existsSync = fs.existsSync,
  runner = defaultRunner,
} = {}) {
  const resolved = resolveAdbPath({existsSync});
  if (!resolved.ok) return baseReceipt();

  const devicesResult = runAdb(runner, resolved.path, ['devices', '-l']);
  if (!successful(devicesResult)) return baseReceipt();
  const devices = parseConnectedDevices(devicesResult.stdout);
  if (devices.length === 0) {
    return baseReceipt({connection: 'offline', result: 'blocked'});
  }
  if (devices.length !== 1) {
    return baseReceipt({connection: 'ambiguous', result: 'blocked'});
  }

  const serial = devices[0].serial;
  const modelResult = runAdb(runner, resolved.path, [
    '-s', serial, 'shell', 'getprop', 'ro.product.model',
  ]);
  if (!successful(modelResult)) return baseReceipt({connection: 'connected'});
  const model = modelResult.stdout.trim();
  if (model !== TARGET_MODEL) {
    return baseReceipt({connection: 'connected', model: 'mismatch', result: 'blocked'});
  }

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
  ADB_PATH,
  SCHEMA,
  TARGET_MODEL,
  TERMUX_PACKAGE,
  baseReceipt,
  collectStatus,
  parseConnectedDevices,
  parseMaxPhantomProcesses,
  parsePhantomCounts,
  parseTermuxUid,
  renderReceipt,
  resolveAdbPath,
  termuxUidToken,
};
