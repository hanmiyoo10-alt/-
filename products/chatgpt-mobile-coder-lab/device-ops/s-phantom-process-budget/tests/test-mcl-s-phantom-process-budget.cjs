'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const owner = require('../mcl-s-phantom-process-budget.cjs');

const SERIAL = 'private-serial-value';

function phantomDump(globalCount, termuxCount) {
  const lines = [];
  for (let index = 0; index < globalCount; index += 1) {
    const token = index < termuxCount ? 'u0a496' : 'u0a777';
    lines.push(
      '  proc #' + index + ': PhantomProcessRecord {abc ' +
      (1000 + index) + ':name/' + token + '}',
    );
  }
  return lines.join('\n') + '\n';
}

function fixtureRunner({
  devices = SERIAL + ' device product:x model:y device:z transport_id:1\n',
  model = 'SM-G998N\n',
  uid = 'package:com.termux uid:10496\n',
  settings = 'max_phantom_processes=32\n',
  processes = phantomDump(12, 7),
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
    if (args[0] === 'devices') {
      return {code: 0, stdout: devices, stderr: '', signal: null, error: null};
    }
    if (key.includes('getprop ro.product.model')) {
      return {code: 0, stdout: model, stderr: '', signal: null, error: null};
    }
    if (key.includes('cmd package list packages -U com.termux')) {
      return {code: 0, stdout: uid, stderr: '', signal: null, error: null};
    }
    if (key.includes('dumpsys activity settings')) {
      return {code: 0, stdout: settings, stderr: '', signal: null, error: null};
    }
    if (key.includes('dumpsys activity processes')) {
      return {code: 0, stdout: processes, stderr: '', signal: null, error: null};
    }
    throw new Error('unexpected command');
  }
  return {runner, calls};
}

function collect(fixture = {}) {
  const fake = fixtureRunner(fixture);
  const receipt = owner.collectStatus({
    existsSync: (value) => value === owner.ADB_PATH,
    runner: fake.runner,
  });
  return {receipt, calls: fake.calls};
}

test('pass receipt reports bounded counts and suppresses target identity', () => {
  const {receipt, calls} = collect();
  assert.deepEqual(receipt, {
    schema: owner.SCHEMA,
    target: 's',
    transport: 'wireless_adb',
    connection: 'connected',
    model: 'match',
    max_phantom_processes: 32,
    global_phantom_processes: 12,
    termux_phantom_processes: 7,
    headroom: 20,
    result: 'pass',
    details: 'withheld',
  });
  assert.equal(calls[0].command, owner.ADB_PATH);
  assert.deepEqual(calls[0].args, ['devices', '-l']);
  const rendered = owner.renderReceipt(receipt);
  assert.doesNotMatch(
    rendered,
    /private-serial-value|transport_id|PhantomProcessRecord|u0a496|10496/,
  );
});

test('zero observed phantom records remain known zero', () => {
  const {receipt} = collect({processes: phantomDump(0, 0)});
  assert.equal(receipt.global_phantom_processes, 0);
  assert.equal(receipt.termux_phantom_processes, 0);
  assert.equal(receipt.headroom, 32);
  assert.equal(receipt.result, 'pass');
});

test('headroom is bounded at zero when observed count exceeds max', () => {
  const {receipt} = collect({processes: phantomDump(40, 25)});
  assert.equal(receipt.headroom, 0);
  assert.equal(receipt.global_phantom_processes, 40);
  assert.equal(receipt.result, 'pass');
});

test('zero and multiple connected targets fail closed before shell reads', () => {
  const offline = collect({devices: ''});
  assert.equal(offline.receipt.connection, 'offline');
  assert.equal(offline.receipt.result, 'blocked');
  assert.equal(offline.calls.length, 1);

  const ambiguous = collect({
    devices: SERIAL + ' device x\nother-private device y\n',
  });
  assert.equal(ambiguous.receipt.connection, 'ambiguous');
  assert.equal(ambiguous.receipt.result, 'blocked');
  assert.equal(ambiguous.calls.length, 1);
});

test('model mismatch blocks before package and ActivityManager reads', () => {
  const {receipt, calls} = collect({model: 'SM-OTHER\n'});
  assert.equal(receipt.connection, 'connected');
  assert.equal(receipt.model, 'mismatch');
  assert.equal(receipt.result, 'blocked');
  assert.equal(calls.length, 2);
});

test('missing adb and malformed bounded evidence preserve unknown', () => {
  const missing = owner.collectStatus({
    existsSync: () => false,
    runner: () => {
      throw new Error('runner should not execute');
    },
  });
  assert.equal(missing.result, 'unknown');

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
  assert.equal(owner.parseTermuxUid('package:com.termux uid:10496\n'), 10496);
  assert.equal(owner.parseTermuxUid('package:other uid:10496\n'), null);
  assert.equal(owner.termuxUidToken(10496), 'u0a496');
  assert.equal(owner.termuxUidToken(9999), null);
  assert.equal(owner.parseMaxPhantomProcesses('max_phantom_processes: 32'), 32);
  assert.equal(owner.parseMaxPhantomProcesses('max_phantom_processes unknown'), null);
  assert.deepEqual(
    owner.parsePhantomCounts(phantomDump(3, 2), 'u0a496'),
    {global: 3, termux: 2},
  );
});

test('source exposes only fixed read-only target and adb surface', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'mcl-s-phantom-process-budget.cjs'),
    'utf8',
  );
  assert.doesNotMatch(
    source,
    /settings\s+put|device_config\s+put|force-stop|\breboot\b|\buninstall\b|adb\s+install/i,
  );
  assert.doesNotMatch(source, /childProcess\.(?:exec|execSync)\s*\(|shell:\s*true/);
  assert.doesNotMatch(source, /--serial|--adb|--package|--command/);
  assert.match(source, /ADB_PATH = '\/data\/data\/com\.termux\/files\/usr\/bin\/adb'/);
  assert.match(source, /TERMUX_PACKAGE = 'com\.termux'/);
  assert.match(source, /TARGET_MODEL = 'SM-G998N'/);
  assert.match(source, /\['devices', '-l'\]/);
  assert.match(source, /'dumpsys', 'activity', 'settings'/);
  assert.match(source, /'dumpsys', 'activity', 'processes'/);
});

test('routing and decision docs bind the narrow S phantom route', () => {
  const root = path.resolve(__dirname, '../../../../../');
  const routing = fs.readFileSync(
    path.join(root, 'products/chatgpt-mobile-coder-lab/docs/device-routing.md'),
    'utf8',
  );
  const decisions = fs.readFileSync(
    path.join(root, 'products/chatgpt-mobile-coder-lab/docs/decisions.md'),
    'utf8',
  );
  assert.match(routing, /S_ANDROID_PHANTOM_BUDGET_READ/);
  assert.match(routing, /device-ops\/s-phantom-process-budget\/\*\*/);
  assert.match(decisions, /D-020/);
  assert.match(decisions, /S_ANDROID_PHANTOM_BUDGET_READ/);
});

test('receipt rendering order is fixed and bounded', () => {
  const rendered = owner.renderReceipt(owner.baseReceipt());
  assert.equal(
    rendered,
    [
      'schema=mcl-s-phantom-process-budget.v1',
      'target=s',
      'transport=wireless_adb',
      'connection=unknown',
      'model=unknown',
      'max_phantom_processes=unknown',
      'global_phantom_processes=unknown',
      'termux_phantom_processes=unknown',
      'headroom=unknown',
      'result=unknown',
      'details=withheld',
      '',
    ].join('\n'),
  );
});
