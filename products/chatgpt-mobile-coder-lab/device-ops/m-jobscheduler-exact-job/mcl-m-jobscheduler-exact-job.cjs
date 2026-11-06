#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');

const transportOwner = require('../m-phantom-process-budget/mcl-m-phantom-process-budget.cjs');

const SCHEMA = 'mcl-m-jobscheduler-exact-job.v1';
const PACKAGE = 'com.termux.api';
const JOB_ID = 34070;
const SCRIPT = '/data/data/com.termux/files/home/.local/lib/mcl-m-termux-lifeline-job/job.sh';
const PERIOD_MS = 900000;
const MAX_OUTPUT_BYTES = 1024 * 1024;
const COMMAND_TIMEOUT_MS = 10000;
const TRACK_TIMEOUT_MS = 1200;

function baseReceipt(overrides = {}) {
  return {
    schema: SCHEMA,
    job: JOB_ID,
    presence: 'unknown',
    script: 'unknown',
    period: 'unknown',
    network: 'unknown',
    persisted: 'unknown',
    battery_not_low: 'unknown',
    storage_not_low: 'unknown',
    charging: 'unknown',
    result: 'unknown',
    details: 'withheld',
    ...overrides,
  };
}

function renderReceipt(receipt) {
  const order = [
    'schema', 'job', 'presence', 'script', 'period', 'network', 'persisted',
    'battery_not_low', 'storage_not_low', 'charging', 'result', 'details',
  ];
  return order.map((key) => key + '=' + String(receipt[key])).join('\n') + '\n';
}

function defaultRunner(command, args) {
  const result = childProcess.spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: args[0] === 'track-devices' && args[1] === '--proto-text'
      ? TRACK_TIMEOUT_MS : COMMAND_TIMEOUT_MS,
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

function classifyJobState(result) {
  if (!result || result.error || result.signal) return 'unknown';
  const text = (String(result.stdout || '') + '\n' + String(result.stderr || ''))
    .replace(/\r/g, '').trim();
  const lower = text.toLowerCase();

  if (result.code === 23 && (
    /could not find job\b/.test(lower)
    || /unknown\([^)]*\/jid34070\)/.test(lower)
    || /job\s+34070\b.*\bnot found\b/.test(lower)
  )) return 'absent';

  if (result.code !== 0) return 'unknown';

  const tokens = text.split(/\s+/).filter(Boolean);
  const allowed = new Set([
    'pending', 'active', 'user-stopped', 'backing-up', 'no-component', 'ready', 'waiting',
  ]);
  if (!tokens.length || tokens.some((token) => !allowed.has(token))) return 'unknown';
  return 'present';
}

function parseDurationMillis(value) {
  const token = String(value || '').trim();
  if (!/^\+?(?:\d+(?:ms|d|h|m|s))+$/.test(token)) return null;
  let total = 0;
  const units = {d: 86400000, h: 3600000, m: 60000, s: 1000, ms: 1};
  const body = token.startsWith('+') ? token.slice(1) : token;
  const pattern = /(\d+)(ms|d|h|m|s)/g;
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    if (match.index !== cursor) return null;
    total += Number(match[1]) * units[match[2]];
    cursor += match[0].length;
  }
  return cursor === body.length && Number.isSafeInteger(total) ? total : null;
}

function jobBlocks(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const starts = [];
  const headerRe = /^\s*(?:Job|JOB) #\d+:\s+.*#\S+\/(\d+)\b.*$/;
  for (let index = 0; index < lines.length; index += 1) {
    const match = headerRe.exec(lines[index]);
    if (match) starts.push({index, jobId: Number(match[1]), header: lines[index]});
  }
  return starts.map((start, i) => ({
    jobId: start.jobId,
    header: start.header,
    text: lines.slice(start.index, i + 1 < starts.length ? starts[i + 1].index : lines.length).join('\n'),
  }));
}

function parseTargetBlock(text) {
  const matches = jobBlocks(text).filter((row) => row.jobId === JOB_ID);
  if (matches.length !== 1) return null;
  const block = matches[0];

  const serviceMatch = /^\s*Service:\s+(\S+)\s*$/m.exec(block.text);
  if (!serviceMatch || !/^com\.termux\.api\/(?:\.apis\.)?JobSchedulerAPI\$JobSchedulerService$/.test(serviceMatch[1])) {
    return {complete: true, collision: true};
  }

  const extrasRe = /com\.termux\.api\.jobscheduler_script_path\s*[=:]\s*([^,}\]\s]+)/;
  const scriptMatch = extrasRe.exec(block.text);
  const periodicMatch = /^\s*PERIODIC:\s+interval=(\S+)/m.exec(block.text);
  const requiresMatch = /^\s*Requires:\s+charging=(true|false)\s+batteryNotLow=(true|false)\s+deviceIdle=(true|false)(?:\s+storageNotLow=(true|false))?\s*$/m.exec(block.text);
  const requiredConstraintsMatch = /^\s*Required constraints:\s*(.*)$/m.exec(block.text);

  if (!scriptMatch || !periodicMatch || !requiresMatch || !requiredConstraintsMatch) return null;

  const period = parseDurationMillis(periodicMatch[1]);
  if (period === null) return null;

  const constraints = requiredConstraintsMatch[1]
    .trim().split(/\s+/).filter(Boolean).map((value) => value.toUpperCase());
  const constraintSet = new Set(constraints);
  const networkConstraint = ['CONNECTIVITY', 'UNMETERED', 'NOT_ROAMING', 'METERED']
    .some((value) => constraintSet.has(value));
  const explicitNetwork = /^\s*Network(?: type)?:/mi.test(block.text)
    || /(?:^|\s)NET(?:=|\s|$)/.test(block.header);
  const networkNone = !networkConstraint && !explicitNetwork;

  const persisted = /^\s*PERSISTED\s*$/m.test(block.text)
    || /(?:^|\s)PERSISTED(?:\s|$)/.test(block.header);
  const headerCharging = /(?:^|\s)CHARGING(?:\s|$)/.test(block.header);
  const headerBattery = /(?:^|\s)BATNOTLOW(?:\s|$)/.test(block.header);
  const headerStorage = /(?:^|\s)STORENOTLOW(?:\s|$)/.test(block.header);

  const fields = {
    script: scriptMatch[1] === SCRIPT ? 'match' : 'mismatch',
    period: period === PERIOD_MS ? 'match' : 'mismatch',
    network: networkNone ? 'none' : 'other',
    persisted: persisted ? 'match' : 'mismatch',
    battery_not_low: requiresMatch[2] === 'false' && !headerBattery
      && !constraintSet.has('BATTERY_NOT_LOW') ? 'false' : 'other',
    storage_not_low: (requiresMatch[4] === undefined || requiresMatch[4] === 'false')
      && !headerStorage && !constraintSet.has('STORAGE_NOT_LOW') ? 'false' : 'other',
    charging: requiresMatch[1] === 'false' && !headerCharging
      && !constraintSet.has('CHARGING') ? 'false' : 'other',
  };
  const managed = fields.script === 'match'
    && fields.period === 'match'
    && fields.network === 'none'
    && fields.persisted === 'match'
    && fields.battery_not_low === 'false'
    && fields.storage_not_low === 'false'
    && fields.charging === 'false';

  return {complete: true, collision: !managed, fields};
}

function collectStatus({
  platform = process.platform,
  env = process.env,
  existsSync,
  runner = defaultRunner,
  transport = transportOwner,
} = {}) {
  const resolved = transport.resolveAdbPath({platform, env, existsSync});
  if (!resolved.ok) return baseReceipt();

  const devicesResult = runner(resolved.path, ['devices', '-l']);
  if (!successful(devicesResult)) return baseReceipt();
  const devices = transport.parseConnectedDevices(devicesResult.stdout);
  const trackerResult = runner(resolved.path, ['track-devices', '--proto-text']);
  const selected = transport.selectWirelessTarget({
    runner, adb: resolved.path, devices, trackerResult,
  });
  if (selected.state !== 'match') return baseReceipt();

  const jobState = runner(resolved.path, [
    '-s', selected.serial, 'shell', 'cmd', 'jobscheduler', 'get-job-state', PACKAGE, String(JOB_ID),
  ]);
  const state = classifyJobState(jobState);
  if (state === 'absent') {
    return baseReceipt({presence: 'absent', result: 'absent'});
  }
  if (state !== 'present') return baseReceipt();

  const dump = runner(resolved.path, [
    '-s', selected.serial, 'shell', 'dumpsys', 'jobscheduler', PACKAGE,
  ]);
  if (!successful(dump)) return baseReceipt({presence: 'present'});

  const parsed = parseTargetBlock(dump.stdout);
  if (!parsed || !parsed.complete) return baseReceipt({presence: 'present'});
  if (parsed.collision && !parsed.fields) {
    return baseReceipt({presence: 'present', result: 'collision'});
  }

  return baseReceipt({
    presence: 'present',
    ...parsed.fields,
    result: parsed.collision ? 'collision' : 'managed',
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
  process.exitCode = ['absent', 'managed'].includes(receipt.result)
    ? 0 : receipt.result === 'collision' ? 3 : 4;
}

if (require.main === module) main();

module.exports = {
  JOB_ID,
  PACKAGE,
  PERIOD_MS,
  SCHEMA,
  SCRIPT,
  baseReceipt,
  classifyJobState,
  collectStatus,
  jobBlocks,
  parseDurationMillis,
  parseTargetBlock,
  renderReceipt,
};
