#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  FIXED_CLOSE_CODE,
  classifyRawEvent,
  evaluateRuns,
  exerciseRealtime,
  receiptText,
  resolveIdentities,
  runAtRoot,
} from './probe.mjs';

let count = 0;
const ok = (name) => console.log(`ok ${++count} - ${name}`);

const fakeModule = (leakClose = false) => `
class FakeChannel {
  constructor(client) {
    this.client = client;
    this.state = 'closed';
    this.rejoinTimer = { scheduleTimeout() {}, reset() {} };
  }
  subscribe(callback) {
    this.callback = callback;
    this.client.connect();
    return this;
  }
}
export default class FakeRealtimeClient {
  constructor(_endpoint, options) {
    this.options = options;
    this.reconnectTimer = { scheduleTimeout() {}, reset() {} };
  }
  channel() {
    this.fixtureChannel = new FakeChannel(this);
    return this.fixtureChannel;
  }
  connect() {
    if (this.conn) return;
    this.conn = new this.options.transport();
    this.conn.onerror = (event) => {
      this.options.logger?.('transport', String(event));
      this.fixtureChannel.state = 'errored';
      this.fixtureChannel.rejoinTimer.scheduleTimeout();
      this.fixtureChannel.callback?.('CHANNEL_ERROR', new Error('channel error: transport failure'));
    };
    this.conn.onclose = (event) => {
      this.options.logger?.('transport', 'close', event);
      ${leakClose ? "this.fixtureChannel.callback?.('CHANNEL_ERROR', new Error('socket closed: ' + event.code));" : ''}
      this.reconnectTimer.scheduleTimeout();
    };
  }
  disconnect() {}
}
`;

async function writePackage(dir, name, version, extra = {}) {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name, version, ...extra }));
}
async function makeRoot({ realtimeVersion = '2.116.0', leakClose = false, omitWs = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcl-rdc-transport-'));
  await fs.writeFile(path.join(root, '.mcl-rdc-rotation-repro-v1'), 'mcl-rdc-rotation-repro:v1\n');
  await writePackage(path.join(root, 'node_modules/@wonderwhy-er/desktop-commander'), '@wonderwhy-er/desktop-commander', '0.2.50');
  const realtime = path.join(root, 'node_modules/@supabase/realtime-js');
  await writePackage(realtime, '@supabase/realtime-js', realtimeVersion, { type: 'module', exports: './index.js' });
  await fs.writeFile(path.join(realtime, 'index.js'), fakeModule(leakClose));
  await writePackage(path.join(root, 'node_modules/@supabase/phoenix'), '@supabase/phoenix', '0.4.5');
  if (!omitWs) await writePackage(path.join(root, 'node_modules/ws'), 'ws', '8.21.3');
  return root;
}

assert.equal(
  receiptText('pass'),
  'schema=mcl-private-check.v1\ncheck=rdc-realtime-transport-observer\nresult=pass\ndetails=withheld\n',
);
ok('receipt is exactly four fixed lines');

assert.deepEqual(classifyRawEvent('error', { message: 'secret-ish fixture text' }), { eventClass: 'error' });
assert.deepEqual(
  classifyRawEvent('close', { code: FIXED_CLOSE_CODE, reason: 'must-not-escape', wasClean: false }),
  { eventClass: 'close', code: FIXED_CLOSE_CODE, wasClean: false },
);
ok('raw observation keeps only allowlisted event class, close code, and cleanliness');
const passRoot = await makeRoot();
try {
  const identities = await resolveIdentities(passRoot);
  assert.equal(identities.rdc.parsed.version, '0.2.50');
  assert.equal(identities.realtime.parsed.version, '2.116.0');
  assert.equal(identities.phoenix.parsed.version, '0.4.5');
  assert.equal(identities.ws.parsed.version, '8.21.3');
  ok('exact dependency identity set resolves from the fixed-root layout');

  assert.equal(await runAtRoot(passRoot), 'pass');
  ok('deterministic error-before-close fixture satisfies the observer contract');

  const module = await import(`${pathToFileURL(path.join(passRoot, 'node_modules/@supabase/realtime-js/index.js')).href}?direct=1`);
  const withLogger = await exerciseRealtime(module.default, true);
  const withoutLogger = await exerciseRealtime(module.default, false);
  assert.equal(withLogger.statuses[0].status, 'CHANNEL_ERROR');
  assert.match(withLogger.statuses[0].message, /transport failure/i);
  assert.equal(withLogger.stateAfterError, 'errored');
  assert.deepEqual(withLogger.rawEvents[1], { eventClass: 'close', code: FIXED_CLOSE_CODE, wasClean: false });
  assert.equal(withoutLogger.loggerEvents.length, 0);
  assert.equal(evaluateRuns(withLogger, withoutLogger), 'pass');
  ok('logger toggle does not change the errored/rejoin outcome and raw close detail remains observable');
} finally {
  await fs.rm(passRoot, { recursive: true, force: true });
}
const mismatchRoot = await makeRoot({ realtimeVersion: '2.116.1' });
try {
  assert.equal(await runAtRoot(mismatchRoot), 'blocked');
  ok('dependency version mismatch fails closed to blocked');
} finally {
  await fs.rm(mismatchRoot, { recursive: true, force: true });
}

const missingRoot = await makeRoot({ omitWs: true });
try {
  assert.equal(await runAtRoot(missingRoot), 'blocked');
  ok('missing required ws identity fails closed to blocked');
} finally {
  await fs.rm(missingRoot, { recursive: true, force: true });
}

const leakRoot = await makeRoot({ leakClose: true });
try {
  assert.equal(await runAtRoot(leakRoot), 'fail');
  ok('subscription recovery of the later close code contradicts the lossy-path contract');
} finally {
  await fs.rm(leakRoot, { recursive: true, force: true });
}

assert.equal(receiptText('not-an-enum'), receiptText('unknown'));
ok('invalid outward result collapses to unknown without diagnostics');

console.log(`1..${count}`);
