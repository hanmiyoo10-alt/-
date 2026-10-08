'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-m-phantom-process-budget.cjs');

const ADB = 'C:\\Users\\test\\AppData\\Local\\Android\\platform-tools\\adb.exe';
const SERIAL = 'private-serial-value';
const M_WIRELESS = 'private-m-wireless';
const M_USB = 'private-m-usb';
const S_WIRELESS = 'private-s-wireless';
const S_USB = 'private-s-usb';

function phantomDump(globalCount, termuxCount) {
  const lines = [];
  for (let index = 0; index < globalCount; index += 1) {
    const token = index < termuxCount ? 'u0a496' : 'u0a777';
    lines.push('  proc #' + index + ': PhantomProcessRecord {abc ' + (1000 + index) + ':name/' + token + '}');
  }
  return lines.join('\n') + '\n';
}

function fixtureRunner({
  devices = SERIAL + ' device product:x model:y device:z transport_id:1\n',
  model = 'SM-S938N\n',
  modelsBySerial = null,
  modelFailureSerials = [],
  uid = 'package:com.termux uid:10496\n',
  settings = 'max_phantom_processes=32\n',
  processes = phantomDump(23, 21),
  failureKey = null,
  stderr = '',
} = {}) {
  const calls = [];
  function runner(command, args) {
    calls.push({command, args: [...args]});
    const key = args.join(' ');
    if (failureKey && key.includes(failureKey)) {
      return {code: 1, signal: null, error: null, stdout: '', stderr};
    }
    if (args[0] === 'devices') return {code: 0, stdout: devices, stderr: '', signal: null, error: null};
    if (key.includes('getprop ro.product.model')) {
      const serial = args[1];
      if (modelFailureSerials.includes(serial)) {
        return {code: 1, signal: null, error: null, stdout: '', stderr};
      }
      const selectedModel = modelsBySerial && Object.prototype.hasOwnProperty.call(modelsBySerial, serial)
        ? modelsBySerial[serial]
        : model;
      return {code: 0, stdout: selectedModel, stderr: '', signal: null, error: null};
    }
    if (key.includes('cmd package list packages -U com.termux')) return {code: 0, stdout: uid, stderr: '', signal: null, error: null};
    if (key.includes('dumpsys activity settings')) return {code: 0, stdout: settings, stderr: '', signal: null, error: null};
    if (key.includes('dumpsys activity processes')) return {code: 0, stdout: processes, stderr: '', signal: null, error: null};
    throw new Error('unexpected command');
  }
  return {runner, calls};
}

function collect(fixture = {}) {
  const fake = fixtureRunner(fixture);
  const receipt = owner.collectStatus({
    platform: 'win32',
    env: {LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local'},
    existsSync: (value) => value === ADB,
    runner: fake.runner,
  });
  return {receipt, calls: fake.calls};
}

test('pass receipt reports bounded counts and suppresses target identity', () => {
  const {receipt} = collect();
  assert.deepEqual(receipt, {
    schema: owner.SCHEMA,
    target: 'm',
    transport: 'wireless_adb',
    connection: 'connected',
    model: 'match',
    max_phantom_processes: 32,
    global_phantom_processes: 23,
    termux_phantom_processes: 21,
    headroom: 9,
    result: 'pass',
    details: 'withheld',
  });
  const rendered = owner.renderReceipt(receipt);
  assert.doesNotMatch(rendered, /private-serial-value|transport_id|PhantomProcessRecord|u0a496/);
});

test('headroom is bounded at zero when observed count exceeds max', () => {
  const {receipt} = collect({processes: phantomDump(40, 25)});
  assert.equal(receipt.headroom, 0);
  assert.equal(receipt.global_phantom_processes, 40);
  assert.equal(receipt.result, 'pass');
});

test('no non-USB connected target fails closed as offline', () => {
  const offline = collect({
    devices: M_USB + ' device usb:1-2 product:x transport_id:1\n',
  });
  assert.equal(offline.receipt.connection, 'offline');
  assert.equal(offline.receipt.result, 'blocked');
  assert.equal(offline.calls.length, 1);
});

test('normal multi-device topology selects exactly one wireless M internally', () => {
  const devices = [
    M_USB + ' device usb:1-2 product:m transport_id:1',
    M_WIRELESS + ' device product:m transport_id:2',
    S_USB + ' device usb:1-3 product:s transport_id:3',
    S_WIRELESS + ' device product:s transport_id:4',
  ].join('\n') + '\n';
  const {receipt, calls} = collect({
    devices,
    modelsBySerial: {
      [M_WIRELESS]: 'SM-S938N\n',
      [S_WIRELESS]: 'SM-G998N\n',
    },
  });
  assert.equal(receipt.connection, 'connected');
  assert.equal(receipt.model, 'match');
  assert.equal(receipt.result, 'pass');

  const modelCalls = calls.filter((row) => row.args.join(' ').includes('getprop ro.product.model'));
  assert.deepEqual(modelCalls.map((row) => row.args[1]).sort(), [M_WIRELESS, S_WIRELESS].sort());
  assert.equal(calls.some((row) => row.args.includes(M_USB) || row.args.includes(S_USB)), false);
  const postSelection = calls.filter((row) => row.args[0] === '-s'
    && !row.args.join(' ').includes('getprop ro.product.model'));
  assert.ok(postSelection.length >= 3);
  assert.equal(postSelection.every((row) => row.args[1] === M_WIRELESS), true);

  const rendered = owner.renderReceipt(receipt);
  assert.doesNotMatch(rendered, /private-m-wireless|private-m-usb|private-s-wireless|private-s-usb/);
});

test('multiple wireless M matches fail closed as ambiguous', () => {
  const devices = [
    M_WIRELESS + ' device product:m transport_id:2',
    'private-m-wireless-2 device product:m transport_id:5',
  ].join('\n') + '\n';
  const {receipt, calls} = collect({
    devices,
    modelsBySerial: {
      [M_WIRELESS]: 'SM-S938N\n',
      'private-m-wireless-2': 'SM-S938N\n',
    },
  });
  assert.equal(receipt.connection, 'ambiguous');
  assert.equal(receipt.model, 'unknown');
  assert.equal(receipt.result, 'blocked');
  assert.equal(calls.some((row) => row.args.join(' ').includes('cmd package')), false);
});

test('all readable wireless model mismatches block without package reads', () => {
  const {receipt, calls} = collect({
    devices: S_WIRELESS + ' device product:s transport_id:4\n',
    modelsBySerial: {[S_WIRELESS]: 'SM-G998N\n'},
  });
  assert.equal(receipt.connection, 'connected');
  assert.equal(receipt.model, 'mismatch');
  assert.equal(receipt.result, 'blocked');
  assert.equal(calls.some((row) => row.args.join(' ').includes('cmd package')), false);
});

test('unresolved wireless model read prevents false selection or mismatch', () => {
  const devices = [
    M_WIRELESS + ' device product:m transport_id:2',
    S_WIRELESS + ' device product:s transport_id:4',
  ].join('\n') + '\n';
  const {receipt, calls} = collect({
    devices,
    modelsBySerial: {[M_WIRELESS]: 'SM-S938N\n'},
    modelFailureSerials: [S_WIRELESS],
  });
  assert.equal(receipt.connection, 'unknown');
  assert.equal(receipt.model, 'unknown');
  assert.equal(receipt.result, 'unknown');
  assert.equal(calls.some((row) => row.args.join(' ').includes('cmd package')), false);
});

test('model mismatch blocks before package and ActivityManager reads', () => {
  const {receipt, calls} = collect({model: 'SM-OTHER\n'});
  assert.equal(receipt.connection, 'connected');
  assert.equal(receipt.model, 'mismatch');
  assert.equal(receipt.result, 'blocked');
  assert.equal(calls.length, 2);
});

test('malformed bounded evidence preserves unknown instead of guessing', () => {
  const badUid = collect({uid: 'unexpected\n'}).receipt;
  assert.equal(badUid.result, 'unknown');
  assert.equal(badUid.max_phantom_processes, 'unknown');

  const badMax = collect({settings: 'something_else=32\n'}).receipt;
  assert.equal(badMax.result, 'unknown');
  assert.equal(badMax.headroom, 'unknown');
});

test('runner errors and raw stderr never leak into receipt', () => {
  const secret = 'private-log-token-should-not-leak';
  const {receipt} = collect({
    failureKey: 'dumpsys activity settings',
    stderr: secret,
  });
  const rendered = owner.renderReceipt(receipt);
  assert.equal(receipt.result, 'unknown');
  assert.doesNotMatch(rendered, new RegExp(secret));
});

test('parsers accept only fixed expected shapes', () => {
  assert.deepEqual(owner.parseConnectedDevices(
    M_USB + ' device usb:1-2 product:m transport_id:1\n'
      + M_WIRELESS + ' device product:m transport_id:2\n'
      + 'private-offline offline transport_id:3\n',
  ), [
    {serial: M_USB, usb: true},
    {serial: M_WIRELESS, usb: false},
  ]);
  assert.equal(owner.parseTermuxUid('package:com.termux uid:10496\n'), 10496);
  assert.equal(owner.parseTermuxUid('package:other uid:10496\n'), null);
  assert.equal(owner.termuxUidToken(10496), 'u0a496');
  assert.equal(owner.termuxUidToken(9999), null);
  assert.equal(owner.parseMaxPhantomProcesses('max_phantom_processes: 32'), 32);
  assert.equal(owner.parseMaxPhantomProcesses('max_phantom_processes unknown'), null);
  assert.deepEqual(owner.parsePhantomCounts(phantomDump(3, 2), 'u0a496'), {global: 3, termux: 2});
});

test('source exposes no caller-selected mutation or arbitrary shell surface', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'mcl-m-phantom-process-budget.cjs'), 'utf8');
  assert.doesNotMatch(source, /settings\s+put|device_config\s+put|force-stop|\breboot\b|\buninstall\b|adb\s+install/i);
  assert.doesNotMatch(source, /\b(?:connect|disconnect|pair)\b/);
  assert.doesNotMatch(source, /childProcess\.(?:exec|execSync)\s*\(|shell:\s*true/);
  assert.match(source, /TERMUX_PACKAGE = 'com\.termux'/);
  assert.match(source, /TARGET_MODEL = 'SM-S938N'/);
});
