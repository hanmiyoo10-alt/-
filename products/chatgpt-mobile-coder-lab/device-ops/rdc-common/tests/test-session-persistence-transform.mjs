#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  MARKER,
  applyTransformToFile,
  inspectFile,
  sha256,
  transformSource,
} from '../session-persistence-transform.mjs';

let pass = 0;
const ok = (name) => console.log(`ok ${++pass} - ${name}`);

const fixture = `export class MCPDevice {
    constructor(options = {}) {
        this.persistSession = options.persistSession ?? true;
        // Initialize desktop integration
    }
    async start() {
            let session = await this.loadPersistedConfig();
            // 2. Set Session or Authenticate
    }
    async savePersistedConfig() {
        try {
            console.debug('[DEBUG] Saving persisted config, persistSession:', this.persistSession);
            const currentSessionStore = await this.remoteChannel.getSession();
            const session = currentSessionStore.data.session;
            const config = {
                deviceId: this.deviceId,
                // Only save session if --persist-session flag is set
                session: (session && this.persistSession) ? {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token
                } : null
            };
            // Ensure the config directory exists
            console.debug('[DEBUG] Creating config directory:', path.dirname(this.configPath));
            await fs.mkdir(path.dirname(this.configPath), { recursive: true });
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
            console.debug('[DEBUG] Config saved to:', this.configPath);
        }
        catch (error) {
            console.error(' - ❌ Failed to save config:', error.message);
            console.debug('[DEBUG] Config save error details:', error);
            await captureRemote('remote_device_config_save_error', { error });
        }
    }
    async shutdown() {
        if (this.isShuttingDown) return;
        try {
            // Stop heartbeat first to prevent new operations
            console.log('  → Stopping heartbeat...');
        } catch (error) {}
    }
}`;

const transformed = transformSource(fixture);
const expected = { upstreamSha256: sha256(fixture), managedSha256: sha256(transformed) };
assert.equal(transformed.split(MARKER).length - 1, 1);
assert.match(transformed, /onAuthStateChange\(\(event, newSession\)/);
assert.match(transformed, /event !== 'TOKEN_REFRESHED'/);
assert.match(transformed, /writeFile\(tempPath,[\s\S]*mode: 0o600/);
assert.match(transformed, /rename\(tempPath, this\.configPath\)/);
assert.match(transformed, /Current session unavailable; keeping existing persisted session/);
assert.ok(transformed.indexOf('Persisting current session...') < transformed.indexOf('Stopping heartbeat...'));
assert.doesNotMatch(transformed, /console\.(?:log|debug|warn|error)\([^\n]*(?:access_token|refresh_token)/);
ok('pure transform contains the complete bounded persistence contract');

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcl-rdc-session-'));
try {
  const target = path.join(dir, 'device.js');
  await fs.writeFile(target, fixture, { mode: 0o640 });
  const before = await inspectFile(target, expected);
  assert.equal(before.state, 'upstream');
  assert.equal(await fs.readFile(target, 'utf8'), fixture);
  ok('read-only inspection classifies exact upstream without mutation');

  const first = await applyTransformToFile(target, expected);
  assert.equal(first.changed, true);
  assert.equal((await fs.stat(target)).mode & 0o777, 0o640);
  assert.equal(await fs.readFile(target, 'utf8'), transformed);
  ok('explicit apply atomically installs exact managed transform and preserves mode');

  const firstDigest = sha256(await fs.readFile(target, 'utf8'));
  const second = await applyTransformToFile(target, expected);
  assert.equal(second.changed, false);
  assert.equal(sha256(await fs.readFile(target, 'utf8')), firstDigest);
  ok('second apply is an exact no-op');

  const drifted = transformed + '\n// unknown drift\n';
  await fs.writeFile(target, drifted);
  await assert.rejects(() => applyTransformToFile(target, expected), /BLOCKED unknown vendor source/);
  assert.equal(await fs.readFile(target, 'utf8'), drifted);
  ok('unknown source fails closed before write');
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}

console.log(`1..${pass}`);
