#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const FIXED_ROOT = '/opt/mcl-private-lab/vendor/rdc-session-rotation';
export const FIXED_CLOSE_CODE = 1012;
export const FIXED_CLOSE_REASON = 'mcl-observer-fixture';
export const EXPECTED = Object.freeze({
  '@wonderwhy-er/desktop-commander': '0.2.50',
  '@supabase/realtime-js': '2.116.0',
  '@supabase/phoenix': '0.4.5',
  ws: '8.21.3',
});

const RDC_DIR = 'node_modules/@wonderwhy-er/desktop-commander';
const DEP_CANDIDATES = Object.freeze({
  '@supabase/realtime-js': [
    'node_modules/@supabase/realtime-js',
    `${RDC_DIR}/node_modules/@supabase/realtime-js`,
    `${RDC_DIR}/node_modules/@supabase/supabase-js/node_modules/@supabase/realtime-js`,
  ],
  '@supabase/phoenix': [
    'node_modules/@supabase/phoenix',
    `${RDC_DIR}/node_modules/@supabase/phoenix`,
    `${RDC_DIR}/node_modules/@supabase/supabase-js/node_modules/@supabase/phoenix`,
    `${RDC_DIR}/node_modules/@supabase/supabase-js/node_modules/@supabase/realtime-js/node_modules/@supabase/phoenix`,
  ],
  ws: [
    'node_modules/ws',
    `${RDC_DIR}/node_modules/ws`,
    `${RDC_DIR}/node_modules/@supabase/supabase-js/node_modules/ws`,
    `${RDC_DIR}/node_modules/@supabase/supabase-js/node_modules/@supabase/realtime-js/node_modules/ws`,
  ],
});

const RECEIPT_RESULTS = new Set(['pass', 'fail', 'blocked', 'unknown']);

export function receiptText(result) {
  if (!RECEIPT_RESULTS.has(result)) result = 'unknown';
  return [
    'schema=mcl-private-check.v1',
    'check=rdc-realtime-transport-observer',
    `result=${result}`,
    'details=withheld',
    '',
  ].join('\n');
}

async function readPackage(dir, expectedName, expectedVersion) {
  const dirStat = await fs.lstat(dir);
  if (!dirStat.isDirectory() || dirStat.isSymbolicLink()) throw new Error('identity');
  const packagePath = path.join(dir, 'package.json');
  const stat = await fs.lstat(packagePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 65536) throw new Error('identity');
  let parsed;
  try { parsed = JSON.parse(await fs.readFile(packagePath, 'utf8')); } catch { throw new Error('identity'); }
  if (parsed.name !== expectedName || parsed.version !== expectedVersion) throw new Error('identity');
  return { dir, packagePath, parsed };
}
async function resolveCandidate(root, name, candidates) {
  let sawMismatch = false;
  for (const rel of candidates) {
    const dir = path.join(root, rel);
    try {
      return await readPackage(dir, name, EXPECTED[name]);
    } catch (error) {
      if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') continue;
      sawMismatch = true;
    }
  }
  if (sawMismatch) throw new Error('identity');
  const missing = new Error('missing');
  missing.code = 'ENOENT';
  throw missing;
}

export async function resolveIdentities(root = FIXED_ROOT) {
  const marker = path.join(root, '.mcl-rdc-rotation-repro-v1');
  const markerStat = await fs.lstat(marker);
  if (!markerStat.isFile() || markerStat.isSymbolicLink() || markerStat.size > 128) throw new Error('identity');
  if ((await fs.readFile(marker, 'utf8')).trim() !== 'mcl-rdc-rotation-repro:v1') throw new Error('identity');
  const rdc = await readPackage(path.join(root, RDC_DIR), '@wonderwhy-er/desktop-commander', EXPECTED['@wonderwhy-er/desktop-commander']);
  const realtime = await resolveCandidate(root, '@supabase/realtime-js', DEP_CANDIDATES['@supabase/realtime-js']);
  const phoenix = await resolveCandidate(root, '@supabase/phoenix', DEP_CANDIDATES['@supabase/phoenix']);
  const ws = await resolveCandidate(root, 'ws', DEP_CANDIDATES.ws);
  return { rdc, realtime, phoenix, ws };
}
function selectExport(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return null;
  for (const key of ['import', 'node', 'default', 'require']) {
    const selected = selectExport(value[key]);
    if (selected) return selected;
  }
  return null;
}

async function moduleEntry(identity) {
  const pkg = identity.parsed;
  const exported = pkg.exports?.['.'] ?? pkg.exports;
  const rel = selectExport(exported) ?? pkg.module ?? pkg.main;
  if (typeof rel !== 'string' || rel.length > 256) throw new Error('entry');
  const full = path.resolve(identity.dir, rel);
  const prefix = `${path.resolve(identity.dir)}${path.sep}`;
  if (!full.startsWith(prefix)) throw new Error('entry');
  const stat = await fs.lstat(full);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('entry');
  return full;
}

export function classifyRawEvent(kind, event) {
  if (kind === 'error') return Object.freeze({ eventClass: 'error' });
  if (kind === 'close') {
    const code = Number.isInteger(event?.code) ? event.code : null;
    const wasClean = typeof event?.wasClean === 'boolean' ? event.wasClean : null;
    return Object.freeze({ eventClass: 'close', code, wasClean });
  }
  return Object.freeze({ eventClass: 'unknown' });
}
function createSyntheticTransport(rawEvents) {
  return class SyntheticTransport {
    static latest = null;
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    constructor() {
      this.CONNECTING = 0;
      this.OPEN = 1;
      this.CLOSING = 2;
      this.CLOSED = 3;
      this.readyState = 0;
      this.binaryType = 'arraybuffer';
      this.onopen = null;
      this.onerror = null;
      this.onmessage = null;
      this.onclose = null;
      SyntheticTransport.latest = this;
    }
    send() {}
    close() { this.readyState = 3; }
    emitError(event) {
      rawEvents.push(classifyRawEvent('error', event));
      this.onerror?.(event);
    }
    emitClose(event) {
      rawEvents.push(classifyRawEvent('close', event));
      this.readyState = 3;
      this.onclose?.(event);
    }
  };
}
function normalizeRealtimeClass(module) {
  const candidate = module?.RealtimeClient ?? module?.default?.RealtimeClient ?? module?.default;
  if (typeof candidate !== 'function') throw new Error('api');
  return candidate;
}

function classifyLoggerEvent(kind, message, data) {
  if (kind !== 'transport') return null;
  if (message === 'close') return classifyRawEvent('close', data);
  return Object.freeze({ eventClass: 'error' });
}

export async function exerciseRealtime(RealtimeClient, loggerEnabled) {
  const rawEvents = [];
  const loggerEvents = [];
  const statuses = [];
  const Transport = createSyntheticTransport(rawEvents);
  const options = {
    params: { apikey: 'mcl-public-fixture' },
    transport: Transport,
    reconnectAfterMs: () => 60000,
  };
  if (loggerEnabled) {
    options.logger = (kind, message, data) => {
      const observed = classifyLoggerEvent(kind, message, data);
      if (observed) loggerEvents.push(observed);
    };
  }
  const client = new RealtimeClient('ws://fixture.invalid/realtime/v1', options);
  const channel = client.channel('observer-fixture', { config: {} });
  channel.subscribe((status, error) => {
    statuses.push({ status, message: String(error?.message ?? '') });
  }, 1000);
  const transport = Transport.latest;
  if (!transport || typeof transport.onerror !== 'function' || typeof transport.onclose !== 'function') throw new Error('api');
  let channelRejoinScheduled = 0;
  let socketReconnectScheduled = 0;
  if (channel.rejoinTimer && typeof channel.rejoinTimer.scheduleTimeout === 'function') {
    channel.rejoinTimer.scheduleTimeout = () => { channelRejoinScheduled += 1; };
  }
  if (client.reconnectTimer && typeof client.reconnectTimer.scheduleTimeout === 'function') {
    client.reconnectTimer.scheduleTimeout = () => { socketReconnectScheduled += 1; };
  }
  channel.state = 'joined';
  transport.emitError({ type: 'error', message: 'fixture-transport-error', error: new Error('fixture') });
  const stateAfterError = String(channel.state);
  transport.emitClose({
    type: 'close',
    code: FIXED_CLOSE_CODE,
    reason: FIXED_CLOSE_REASON,
    wasClean: false,
  });
  const stateAfterClose = String(channel.state);
  try { channel.rejoinTimer?.reset?.(); } catch {}
  try { client.reconnectTimer?.reset?.(); } catch {}
  try { client.disconnect?.(); } catch {}
  return {
    rawEvents,
    loggerEvents,
    statuses,
    stateAfterError,
    stateAfterClose,
    channelRejoinScheduled,
    socketReconnectScheduled,
  };
}
function outcomeSignature(run) {
  return JSON.stringify({
    statuses: run.statuses.map((item) => item.status),
    stateAfterError: run.stateAfterError,
    stateAfterClose: run.stateAfterClose,
    channelRejoinScheduled: run.channelRejoinScheduled,
    socketReconnectScheduled: run.socketReconnectScheduled,
  });
}

export function evaluateRuns(withLogger, withoutLogger) {
  const subscriptionError = withLogger.statuses.find((item) => item.status === 'CHANNEL_ERROR');
  const generic = !!subscriptionError && /transport failure/i.test(subscriptionError.message);
  const closeLeaked = withLogger.statuses.some((item) =>
    item.message.includes(String(FIXED_CLOSE_CODE)) || item.message.includes(FIXED_CLOSE_REASON));
  const rawOk = JSON.stringify(withLogger.rawEvents) === JSON.stringify([
    { eventClass: 'error' },
    { eventClass: 'close', code: FIXED_CLOSE_CODE, wasClean: false },
  ]);
  const loggerClose = withLogger.loggerEvents.some((item) =>
    item.eventClass === 'close' && item.code === FIXED_CLOSE_CODE && item.wasClean === false);
  const loggerDisabled = withoutLogger.loggerEvents.length === 0;
  const sameOutcome = outcomeSignature(withLogger) === outcomeSignature(withoutLogger);
  const errored = withLogger.stateAfterError === 'errored';
  return generic && !closeLeaked && rawOk && loggerClose && loggerDisabled && sameOutcome && errored
    ? 'pass'
    : 'fail';
}

export async function runAtRoot(root = FIXED_ROOT) {
  try {
    const identities = await resolveIdentities(root);
    const entry = await moduleEntry(identities.realtime);
    const module = await import(pathToFileURL(entry).href);
    const RealtimeClient = normalizeRealtimeClass(module);
    const withLogger = await exerciseRealtime(RealtimeClient, true);
    const withoutLogger = await exerciseRealtime(RealtimeClient, false);
    return evaluateRuns(withLogger, withoutLogger);
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.message === 'identity') return 'blocked';
    return 'unknown';
  }
}
async function main() {
  const result = await runAtRoot(FIXED_ROOT);
  process.stdout.write(receiptText(result));
  process.exitCode = result === 'pass' ? 0 : 1;
}

const directFileRun = process.argv[1]
  && process.argv[1] !== '-'
  && pathToFileURL(process.argv[1]).href === import.meta.url;
if (directFileRun || process.argv[1] === '-') {
  main().catch(() => {
    process.stdout.write(receiptText('unknown'));
    process.exitCode = 1;
  });
}
