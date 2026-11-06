#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-m-jobscheduler-exact-job.cjs');

const MANAGED = [
  'Registered 1 jobs:',
  ' JOB #u0a321/34070: abcd com.termux.api/.apis.JobSchedulerAPI$JobSchedulerService PERIODIC PERSISTED',
  '  Source: uid=u0a321 user=0 pkg=com.termux.api',
  '  JobInfo:',
  '   Service: com.termux.api/.apis.JobSchedulerAPI$JobSchedulerService',
  '   PERIODIC: interval=+15m0s0ms flex=+5m0s0ms',
  '   PERSISTED',
  '   Requires: charging=false batteryNotLow=false deviceIdle=false',
  '   Extras: {com.termux.api.jobscheduler_script_path=' + owner.SCRIPT + '}',
  '  Required constraints: TIMING_DELAY DEVICE_NOT_DOZING BACKGROUND_NOT_RESTRICTED WITHIN_QUOTA',
  ' Ready: true',
].join('\n');

function fixture(overrides = {}) {
  return {
    resolveAdbPath: () => ({ok: true, path: 'adb.exe'}),
    parseConnectedDevices: () => [{serial: 'internal'}],
    selectWirelessTarget: () => ({state: 'match', serial: 'internal'}),
    ...overrides,
  };
}

function runnerFor({state, dump = MANAGED, calls}) {
  return (_command, args) => {
    calls.push(args);
    if (args[0] === 'devices') return {code: 0, stdout: 'List of devices attached\ninternal device\n', stderr: ''};
    if (args[0] === 'track-devices') return {code: 0, stdout: 'ignored', stderr: ''};
    if (args.includes('get-job-state')) return state;
    if (args.includes('dumpsys')) return {code: 0, stdout: dump, stderr: ''};
    throw new Error('unexpected args: ' + JSON.stringify(args));
  };
}

test('duration parser handles Android formatted 15 minute period', () => {
  assert.equal(owner.parseDurationMillis('+15m0s0ms'), 900000);
  assert.equal(owner.parseDurationMillis('900000ms'), 900000);
  assert.equal(owner.parseDurationMillis('+14m59s999ms'), 899999);
  assert.equal(owner.parseDurationMillis('nonsense'), null);
});

test('target block classifies exact reviewed job as managed', () => {
  const parsed = owner.parseTargetBlock(MANAGED);
  assert.ok(parsed);
  assert.equal(parsed.collision, false);
  assert.deepEqual(parsed.fields, {
    script: 'match',
    period: 'match',
    network: 'none',
    persisted: 'match',
    battery_not_low: 'false',
    storage_not_low: 'false',
    charging: 'false',
  });
});

for (const [name, mutate] of [
  ['script', (x) => x.replace(owner.SCRIPT, '/wrong.sh')],
  ['script-whitespace-suffix', (x) => x.replace(owner.SCRIPT, owner.SCRIPT + ' backup')],
  ['period', (x) => x.replace('+15m0s0ms', '+16m0s0ms')],
  ['network', (x) => x.replace('Required constraints:', 'Network: required\n  Required constraints: CONNECTIVITY')],
  ['persisted', (x) => x.replace(/\n\s*PERSISTED/g, '').replace(/ PERSISTED/g, '')],
  ['battery', (x) => x.replace('batteryNotLow=false', 'batteryNotLow=true')],
  ['storage', (x) => x.replace('Required constraints:', 'Required constraints: STORAGE_NOT_LOW')],
  ['charging', (x) => x.replace('charging=false', 'charging=true')],
]) {
  test(name + ' mismatch is collision', () => {
    const parsed = owner.parseTargetBlock(mutate(MANAGED));
    assert.ok(parsed);
    assert.equal(parsed.collision, true);
  });
}

test('legacy synthetic job header is not accepted as a registered-job block', () => {
  assert.equal(owner.parseTargetBlock(
    MANAGED.replace('JOB #u0a321/34070:', 'Job #0: abcd #u0a321/34070'),
  ), null);
});

test('wrong JobScheduler service is collision', () => {
  const parsed = owner.parseTargetBlock(
    MANAGED.replaceAll(
      'com.termux.api/.apis.JobSchedulerAPI$JobSchedulerService',
      'com.termux.api/.OtherService',
    ),
  );
  assert.ok(parsed);
  assert.equal(parsed.collision, true);
});

test('opaque parcelled extras remain unknown', () => {
  assert.equal(owner.parseTargetBlock(
    MANAGED.replace(
      /Extras: \{com\.termux\.api\.jobscheduler_script_path=[^\n]*\}/,
      'Extras: mParcelledData.dataSize=128',
    ),
  ), null);
});

test('subsequent active-job network lines do not leak into registered target block', () => {
  const parsed = owner.parseTargetBlock(MANAGED + [
    '',
    'Active jobs:',
    ' Slot #0(ID=1): unrelated',
    '  Network: NetworkRequest [ id=1 ]',
  ].join('\n'));
  assert.ok(parsed);
  assert.equal(parsed.collision, false);
  assert.equal(parsed.fields.network, 'none');
});

test('missing required structural line is unknown', () => {
  assert.equal(owner.parseTargetBlock(
    MANAGED.replace(/\n\s*Required constraints:[^\n]*/, ''),
  ), null);
});

test('duplicate target job blocks are unknown', () => {
  assert.equal(owner.parseTargetBlock(MANAGED + '\n' + MANAGED), null);
});

test('job-state classifier accepts only fixed bounded states', () => {
  assert.equal(owner.classifyJobState({
    code: 23, stdout: '', stderr: 'Could not find job 34070',
  }), 'absent');
  assert.equal(owner.classifyJobState({
    code: 0, stdout: 'pending ready\n', stderr: '',
  }), 'present');
  assert.equal(owner.classifyJobState({
    code: 0, stdout: 'surprise\n', stderr: '',
  }), 'unknown');
  assert.equal(owner.classifyJobState({
    code: 1, stdout: '', stderr: 'error',
  }), 'unknown');
});

test('absent job returns without package dump', () => {
  const calls = [];
  const receipt = owner.collectStatus({
    platform: 'win32',
    env: {LOCALAPPDATA: 'C:\\local'},
    existsSync: () => true,
    transport: fixture(),
    runner: runnerFor({
      calls,
      state: {code: 23, stdout: '', stderr: 'Could not find job 34070'},
    }),
  });
  assert.equal(receipt.result, 'absent');
  assert.equal(receipt.presence, 'absent');
  assert.equal(calls.filter((args) => args.includes('dumpsys')).length, 0);
});

test('present exact job emits only fixed managed receipt', () => {
  const calls = [];
  const receipt = owner.collectStatus({
    platform: 'win32',
    env: {LOCALAPPDATA: 'C:\\local'},
    existsSync: () => true,
    transport: fixture(),
    runner: runnerFor({
      calls,
      state: {code: 0, stdout: 'pending\n', stderr: ''},
    }),
  });
  assert.equal(receipt.result, 'managed');
  assert.equal(receipt.presence, 'present');
  assert.equal(calls.filter((args) => args.includes('dumpsys')).length, 1);
  const rendered = owner.renderReceipt(receipt);
  assert.ok(!rendered.includes('internal'));
  assert.ok(!rendered.includes(owner.SCRIPT));
  assert.ok(!rendered.includes('com.termux.api'));
});

test('present collision is bounded and secret-free', () => {
  const calls = [];
  const receipt = owner.collectStatus({
    platform: 'win32',
    env: {LOCALAPPDATA: 'C:\\local'},
    existsSync: () => true,
    transport: fixture(),
    runner: runnerFor({
      calls,
      state: {code: 0, stdout: 'waiting\n', stderr: ''},
      dump: MANAGED.replace(owner.SCRIPT, '/private/wrong.sh'),
    }),
  });
  assert.equal(receipt.result, 'collision');
  assert.equal(receipt.script, 'mismatch');
  assert.ok(!owner.renderReceipt(receipt).includes('/private/wrong.sh'));
});

test('ambiguous target fails closed before scheduler reads', () => {
  const calls = [];
  const receipt = owner.collectStatus({
    platform: 'win32',
    env: {LOCALAPPDATA: 'C:\\local'},
    existsSync: () => true,
    transport: fixture({selectWirelessTarget: () => ({state: 'ambiguous'})}),
    runner: runnerFor({
      calls,
      state: {code: 0, stdout: 'pending\n', stderr: ''},
    }),
  });
  assert.equal(receipt.result, 'unknown');
  assert.equal(calls.some((args) => args.includes('get-job-state')), false);
});

test('runtime command surface is fixed and read-only', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'mcl-m-jobscheduler-exact-job.cjs'), 'utf8',
  );
  for (const forbidden of [
    "'connect'", "'pair'", "'disconnect'", "'cancel'", "'run'",
    "'monitor-battery'", "'reset-execution-quota'",
    "'heartbeat'", "'trigger-dock-state'",
  ]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.ok(source.includes("'get-job-state'"));
  assert.ok(source.includes("'dumpsys', 'jobscheduler', PACKAGE"));
});

test('CLI rejects extra or unsupported arguments', () => {
  const script = path.join(
    __dirname, '..', 'mcl-m-jobscheduler-exact-job.cjs',
  );
  const result = childProcess.spawnSync(
    process.execPath, [script, 'status', 'extra'], {encoding: 'utf8'},
  );
  assert.equal(result.status, 64);
  assert.match(result.stdout, /^schema=mcl-m-jobscheduler-exact-job\.v1/m);
  assert.match(result.stdout, /^result=unknown$/m);
});
