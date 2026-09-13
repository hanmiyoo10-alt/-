#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { evaluateBaseline, receiptText, runAtPaths, sha256, simulateRotationRestart } from './probe.mjs';

let pass = 0;
const ok = (name) => console.log(`ok ${++pass} - ${name}`);
const fixture = `class Device {
  async savePersistedConfig() {
    const currentSessionStore = await this.remoteChannel.getSession();
    await fs.writeFile(this.configPath, JSON.stringify({ generation: 'generation-0' }));
  }
}`;
const packageJson = JSON.stringify({ name: '@wonderwhy-er/desktop-commander', version: '0.2.50' });

assert.equal(evaluateBaseline({ packageJsonText: packageJson, deviceSource: fixture, expectedSha256: sha256(fixture) }), 'pass');
ok('synthetic stale-persistence structure reproduces the declared baseline class');

const refreshed = `${fixture}\nthis.remoteChannel.client.auth.onAuthStateChange((event, newSession) => { if (event !== 'TOKEN_REFRESHED') return; });`;
assert.equal(evaluateBaseline({ packageJsonText: packageJson, deviceSource: refreshed, expectedSha256: sha256(refreshed) }), 'fail');
ok('refresh-persistence hook contradicts the stale baseline structure');

assert.equal(evaluateBaseline({ packageJsonText: JSON.stringify({ version: '0.2.51' }), deviceSource: fixture, expectedSha256: sha256(fixture) }), 'blocked');
assert.equal(evaluateBaseline({ packageJsonText: packageJson, deviceSource: fixture, expectedSha256: '0'.repeat(64) }), 'blocked');
ok('version or exact-source drift fails closed to blocked');

const model = simulateRotationRestart();
assert.deepEqual(model, { memoryRotated: true, persistedStale: true, restartRejected: true });
ok('rotation/restart model uses generation labels and reproduces stale restart rejection');

assert.equal(receiptText('pass'), 'schema=mcl-private-check.v1\ncheck=rdc-rotation-repro\nresult=pass\ndetails=withheld\n');
ok('receipt schema is fixed and contains no diagnostics');

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcl-rotation-repro-'));
try {
  const pkg = path.join(dir, 'package.json');
  const device = path.join(dir, 'device.js');
  const receipt = path.join(dir, 'receipt');
  await fs.writeFile(pkg, packageJson);
  await fs.writeFile(device, fixture);
  const result = await runAtPaths({ packageJsonPath: pkg, deviceJsPath: device, receiptPath: receipt, expectedSha256: sha256(fixture) });
  assert.equal(result, 'pass');
  assert.equal(await fs.readFile(receipt, 'utf8'), receiptText('pass'));
  ok('fixed-path runner writes only the bounded pass receipt');
} finally { await fs.rm(dir, { recursive: true, force: true }); }

console.log(`1..${pass}`);
