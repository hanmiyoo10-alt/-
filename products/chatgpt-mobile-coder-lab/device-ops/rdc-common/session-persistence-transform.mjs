#!/usr/bin/env node
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MARKER = '// mcl-rdc-session-persistence:v1';
export const UPSTREAM_SHA256 = '9dfde0c2794811a0ec3b989cffb529e597535e4dab811b45bcc2031720c5d724';
export const MANAGED_SHA256 = '3478767122156690d8fb1d7b1a154a502eb11ee4a7a199d69c23e7b7c4c4fde6';

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) throw new Error(`transform anchor mismatch: ${label}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}

export function transformSource(source) {
  let out = source;
  out = replaceOnce(out,
`        this.persistSession = options.persistSession ?? true;
        // Initialize desktop integration`,
`        this.persistSession = options.persistSession ?? true;
        ${MARKER}
        this.sessionPersistenceRegistered = false;
        // Initialize desktop integration`, 'constructor');

  out = replaceOnce(out,
`            let session = await this.loadPersistedConfig();
            // 2. Set Session or Authenticate`,
`            let session = await this.loadPersistedConfig();
            this.setupSessionPersistence();
            // 2. Set Session or Authenticate`, 'startup-listener');

  const oldSave = `    async savePersistedConfig() {
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
    }`;
  const newSave = `    setupSessionPersistence() {
        if (!this.persistSession || this.sessionPersistenceRegistered || !this.remoteChannel.client)
            return;
        this.sessionPersistenceRegistered = true;
        this.remoteChannel.client.auth.onAuthStateChange((event, newSession) => {
            if (event !== 'TOKEN_REFRESHED' || !newSession?.access_token || !newSession?.refresh_token)
                return;
            void this.persistSessionSnapshot(newSession).catch((error) => {
                console.error(' - ❌ Failed to persist refreshed session:', error.message);
            });
        });
    }
    async persistSessionSnapshot(session) {
        if (!this.persistSession || !session?.access_token || !session?.refresh_token)
            return false;
        const config = {
            deviceId: this.deviceId,
            session: {
                access_token: session.access_token,
                refresh_token: session.refresh_token
            }
        };
        await fs.mkdir(path.dirname(this.configPath), { recursive: true });
        const tempPath = \`${'${this.configPath}'}.tmp-${'${process.pid}'}-${'${Date.now()}'}-${'${Math.random().toString(16).slice(2)}'}\`;
        await fs.writeFile(tempPath, JSON.stringify(config, null, 2), { mode: 0o600 });
        await fs.rename(tempPath, this.configPath);
        console.debug('[DEBUG] Persisted current rotated session');
        return true;
    }
    async savePersistedConfig() {
        try {
            console.debug('[DEBUG] Saving persisted config, persistSession:', this.persistSession);
            const currentSessionStore = await this.remoteChannel.getSession();
            const session = currentSessionStore.data.session;
            if (this.persistSession) {
                if (!session?.access_token || !session?.refresh_token) {
                    console.warn('⚠️ Current session unavailable; keeping existing persisted session');
                    return false;
                }
                return await this.persistSessionSnapshot(session);
            }
            const config = { deviceId: this.deviceId, session: null };
            await fs.mkdir(path.dirname(this.configPath), { recursive: true });
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
            return true;
        }
        catch (error) {
            console.error(' - ❌ Failed to save config:', error.message);
            console.debug('[DEBUG] Config save error details:', error);
            await captureRemote('remote_device_config_save_error', { error });
            return false;
        }
    }`;
  out = replaceOnce(out, oldSave, newSave, 'persistence-owner');

  out = replaceOnce(out,
`        try {
            // Stop heartbeat first to prevent new operations
            console.log('  → Stopping heartbeat...');`,
`        try {
            console.log('  → Persisting current session...');
            await this.savePersistedConfig();
            // Stop heartbeat first to prevent new operations
            console.log('  → Stopping heartbeat...');`, 'graceful-shutdown');
  return out;
}

export function classifySource(source, expected = {}) {
  const upstreamSha256 = expected.upstreamSha256 ?? UPSTREAM_SHA256;
  const managedSha256 = expected.managedSha256 ?? MANAGED_SHA256;
  const digest = sha256(source);
  if (digest === upstreamSha256 && !source.includes(MARKER)) return { state: 'upstream', digest };
  if (digest === managedSha256 && source.includes(MARKER)) return { state: 'managed', digest };
  return { state: 'unknown', digest };
}

async function atomicReplace(target, content) {
  const stat = await fs.stat(target);
  const temp = `${target}.mcl-session-${process.pid}-${Date.now()}`;
  try {
    await fs.writeFile(temp, content, { mode: stat.mode & 0o777 });
    await fs.rename(temp, target);
  } finally {
    await fs.rm(temp, { force: true }).catch(() => {});
  }
}

export async function inspectFile(target, expected = {}) {
  const source = await fs.readFile(target, 'utf8');
  return { source, ...classifySource(source, expected) };
}

export async function applyTransformToFile(target, expected = {}) {
  const before = await inspectFile(target, expected);
  if (before.state === 'managed') return { state: 'managed', changed: false, digest: before.digest };
  if (before.state !== 'upstream') throw new Error(`BLOCKED unknown vendor source sha256:${before.digest}`);
  const transformed = transformSource(before.source);
  const wanted = expected.managedSha256 ?? MANAGED_SHA256;
  const digest = sha256(transformed);
  if (digest !== wanted) throw new Error(`BLOCKED transformed source checksum mismatch sha256:${digest}`);
  await atomicReplace(target, transformed);
  const after = await inspectFile(target, expected);
  if (after.state !== 'managed') throw new Error('FAILED managed source verification after atomic replace');
  return { state: 'managed', changed: true, digest: after.digest };
}

function usage() {
  console.error('usage: session-persistence-transform.mjs [--check|--verify|--apply] <device.js>');
  process.exit(2);
}

async function main() {
  const [mode = '--check', target] = process.argv.slice(2);
  if (!target || !['--check', '--verify', '--apply'].includes(mode)) usage();
  if (mode === '--apply') {
    const result = await applyTransformToFile(target);
    console.log(`${result.changed ? 'INSTALLED' : 'PRESENT'} session-persistence sha256:${result.digest}`);
    return;
  }
  const result = await inspectFile(target);
  if (result.state === 'unknown') throw new Error(`BLOCKED unknown vendor source sha256:${result.digest}`);
  if (mode === '--verify' && result.state !== 'managed') throw new Error(`FAILED session-persistence not managed (state:${result.state})`);
  console.log(`${result.state === 'managed' ? 'PRESENT' : 'MISSING'} session-persistence state:${result.state} sha256:${result.digest}`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
