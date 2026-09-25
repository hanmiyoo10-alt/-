#!/data/data/com.termux/files/usr/bin/node
'use strict';
// mcl-detached-owner-runtime-host:v1

const childProcess = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const PREFIX = '/data/data/com.termux/files/usr';
const HOME_DIR = '/data/data/com.termux/files/home';
const NODE = '/data/data/com.termux/files/usr/bin/node';
const PROOT_DISTRO = '/data/data/com.termux/files/usr/bin/proot-distro';
const HOST_LIB_DIR = '/data/data/com.termux/files/home/.local/lib/mcl-detached-owner-runtime';
const HOST_RUN_DIR = '/data/data/com.termux/files/home/.local/run/mcl-detached-owner-runtime';
const SOCKET_PATH = '/data/data/com.termux/files/home/.local/run/mcl-detached-owner-runtime/control.sock';
const RUNTIME_SOURCE = '/root/.local/lib/mcl-detached-owner-runtime/repository/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime.cjs';
const SERVICE_SOURCE = '/root/.local/lib/mcl-detached-owner-runtime/repository/products/chatgpt-mobile-coder-lab/device-ops/detached-owner-runtime/mcl-detached-owner-runtime-service.cjs';
const START_SCHEMA = 'mcl-detached-owner-runtime-start.v1';
const INSPECT_SCHEMA = 'mcl-detached-owner-runtime-inspect.v1';
const START_RESULT_SCHEMA = 'mcl-detached-owner-runtime-start-result.v1';
const PHASE = 'IMPLEMENTATION_PR';
const MAX_BYTES = 16 * 1024;
const RUN_ID_RE = /^run-[0-9a-f]{64}$/;
const PACKET_RE = /^#[1-9][0-9]*$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const START_FIELDS = new Set([
  'schema', 'operation', 'packetRef', 'phase', 'runId', 'activationDigest',
  'expectedParentManifestId', 'expectedLeaseId', 'attemptId',
]);
const INSPECT_FIELDS = new Set(['schema', 'operation', 'packetRef', 'runId']);
const PUBLIC_START_ARGS = new Set([
  'packet', 'parent-manifest-file', 'parent-handoff-file', 'request-file',
  'patch-file', 'validation-request-file', 'pr-request-file',
]);
const PUBLIC_INSPECT_ARGS = new Set(['packet', 'run-id']);
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

class HostError extends Error {
  constructor(kind, reasonCodes) {
    super((reasonCodes || [kind])[0] || kind);
    this.kind = kind;
    this.reasonCodes = [...new Set(reasonCodes || [kind])].sort();
  }
}
function fail(kind, ...codes) {
  throw new HostError(kind, codes.flat());
}
function errorResult(error) {
  const kind = error instanceof HostError ? error.kind : 'UNKNOWN';
  return {
    schema: START_RESULT_SCHEMA,
    status: kind,
    reasonCodes: error instanceof HostError ? error.reasonCodes : ['UNEXPECTED_ERROR'],
    authority: {...FALSE_AUTHORITY},
  };
}
function packetNumber(packetRef) {
  if (!PACKET_RE.test(String(packetRef || ''))) fail('UNKNOWN', 'PACKET_REF_INVALID');
  return Number(packetRef.slice(1));
}
function exactKeys(value, allowed, prefix) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('UNKNOWN', prefix + '_OBJECT_REQUIRED');
  }
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (extras.length || missing.length) {
    fail('UNKNOWN',
      ...extras.map((key) => prefix + '_UNKNOWN_FIELD:' + key),
      ...missing.map((key) => prefix + '_FIELD_REQUIRED:' + key));
  }
}
function parsePublicCli(argv) {
  const command = argv[0];
  if (!['start-fixed', 'inspect'].includes(command)) fail('UNKNOWN', 'COMMAND_UNSUPPORTED');
  const values = {};
  for (let i = 1; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) fail('UNKNOWN', 'ARGUMENT_INVALID');
    const name = key.slice(2);
    if (Object.hasOwn(values, name)) fail('UNKNOWN', 'ARGUMENT_DUPLICATE:' + name);
    values[name] = value;
  }
  const allowed = command === 'start-fixed' ? PUBLIC_START_ARGS : PUBLIC_INSPECT_ARGS;
  const extras = Object.keys(values).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !Object.hasOwn(values, key));
  if (extras.length || missing.length) {
    fail('UNKNOWN',
      ...extras.map((key) => 'ARGUMENT_UNSUPPORTED:' + key),
      ...missing.map((key) => 'ARGUMENT_REQUIRED:' + key));
  }
  packetNumber(values.packet);
  if (command === 'inspect' && !RUN_ID_RE.test(values['run-id'] || '')) {
    fail('UNKNOWN', 'RUN_ID_INVALID');
  }
  return {command, values};
}
function precheckSemanticRequest(value) {
  if (value?.operation === 'start-fixed') {
    exactKeys(value, START_FIELDS, 'START_REQUEST');
    if (value.schema !== START_SCHEMA || value.phase !== PHASE
        || !RUN_ID_RE.test(value.runId || '')
        || !SHA256_RE.test(value.activationDigest || '')
        || !SHA256_RE.test(value.expectedParentManifestId || '')
        || !SHA256_RE.test(value.expectedLeaseId || '')
        || value.attemptId !== 1) {
      fail('UNKNOWN', 'START_REQUEST_INVALID');
    }
    packetNumber(value.packetRef);
    return {...value};
  }
  if (value?.operation === 'inspect') {
    exactKeys(value, INSPECT_FIELDS, 'INSPECT_REQUEST');
    if (value.schema !== INSPECT_SCHEMA || !RUN_ID_RE.test(value.runId || '')) {
      fail('UNKNOWN', 'INSPECT_REQUEST_INVALID');
    }
    packetNumber(value.packetRef);
    return {...value};
  }
  fail('UNKNOWN', 'REQUEST_OPERATION_UNSUPPORTED');
}
function prepareArgs(argv) {
  return [
    'login', 'ubuntu', '--', '/usr/bin/env',
    'HOME=/root',
    'MCL_DETACHED_PREPARE_ONLY_V1=1',
    NODE,
    RUNTIME_SOURCE,
    ...argv,
  ];
}
function workerArgs() {
  return [
    'login', 'ubuntu', '--', '/usr/bin/env',
    'HOME=/root',
    'MCL_DETACHED_STDIO_WORKER_V1=1',
    NODE,
    SERVICE_SOURCE,
  ];
}
function parseOneJsonLine(bytes, field) {
  if (Buffer.byteLength(bytes, 'utf8') > MAX_BYTES) fail('UNKNOWN', field + '_TOO_LARGE');
  const lines = String(bytes).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) fail('UNKNOWN', field + '_ONE_LINE_REQUIRED');
  try { return JSON.parse(lines[0]); }
  catch (_) { fail('UNKNOWN', field + '_JSON_INVALID'); }
}
function prepareStart(argv, {spawnSyncImpl = childProcess.spawnSync} = {}) {
  const parsed = parsePublicCli(argv);
  if (parsed.command !== 'start-fixed') fail('UNKNOWN', 'PREPARE_START_ONLY');
  const out = spawnSyncImpl(PROOT_DISTRO, prepareArgs(argv), {
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: MAX_BYTES * 2,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (!out || out.status !== 0) fail('UNKNOWN', 'PROOT_PREPARE_FAILED');
  const request = precheckSemanticRequest(parseOneJsonLine(out.stdout || '', 'PREPARE_RESPONSE'));
  if (request.operation !== 'start-fixed') fail('CONFLICT', 'PREPARE_RESPONSE_OPERATION_CONFLICT');
  return request;
}
function socketRequest(payload, {
  socketPath = SOCKET_PATH,
  netImpl = net,
  timeoutMs = 10000,
} = {}) {
  const request = precheckSemanticRequest(payload);
  return new Promise((resolve, reject) => {
    const client = netImpl.createConnection({path: socketPath});
    let bytes = '';
    let settled = false;
    const done = (error, value) => {
      if (settled) return;
      settled = true;
      client.destroy();
      if (error) reject(error); else resolve(value);
    };
    client.setTimeout(timeoutMs, () => done(new HostError('UNKNOWN', ['RUNTIME_SOCKET_TIMEOUT'])));
    client.on('error', () => done(new HostError('UNKNOWN', ['RUNTIME_SOCKET_CONNECT_FAILED'])));
    client.on('connect', () => {
      client.write(JSON.stringify(request) + '\n');
      client.end();
    });
    client.on('data', (chunk) => {
      bytes += chunk.toString('utf8');
      if (Buffer.byteLength(bytes, 'utf8') > MAX_BYTES) {
        done(new HostError('UNKNOWN', ['RUNTIME_RESPONSE_TOO_LARGE']));
      }
    });
    client.on('end', () => {
      if (settled) return;
      try { done(null, parseOneJsonLine(bytes, 'RUNTIME_RESPONSE')); }
      catch (error) { done(error); }
    });
  });
}
async function runClient(argv = process.argv.slice(2), deps = {}) {
  const parsed = parsePublicCli(argv);
  let request;
  if (parsed.command === 'inspect') {
    request = {
      schema: INSPECT_SCHEMA,
      operation: 'inspect',
      packetRef: parsed.values.packet,
      runId: parsed.values['run-id'],
    };
  } else {
    request = prepareStart(argv, deps);
  }
  return (deps.socketRequest || socketRequest)(request, deps);
}

class PersistentWorker {
  constructor({
    spawnImpl = childProcess.spawn,
    command = PROOT_DISTRO,
    args = workerArgs(),
    timeoutMs = 15000,
  } = {}) {
    this.spawnImpl = spawnImpl;
    this.command = command;
    this.args = [...args];
    this.timeoutMs = timeoutMs;
    this.child = null;
    this.pending = null;
    this.buffer = '';
    this.failed = false;
    this.closing = false;
    this.spawnCount = 0;
    this.queue = Promise.resolve();
  }
  start() {
    if (this.child) return this.child;
    if (this.failed) fail('UNKNOWN', 'WORKER_UNAVAILABLE');
    const child = this.spawnImpl(this.command, this.args, {
      stdio: ['pipe', 'pipe', 'ignore'],
      env: process.env,
      detached: false,
    });
    this.spawnCount += 1;
    this.child = child;
    child.stdout.on('data', (chunk) => this.onData(chunk));
    const ended = () => this.onExit();
    child.once('exit', ended);
    child.once('error', ended);
    return child;
  }
  onData(chunk) {
    if (this.failed) return;
    this.buffer += chunk.toString('utf8');
    if (Buffer.byteLength(this.buffer, 'utf8') > MAX_BYTES * 2) {
      this.failPending(new HostError('UNKNOWN', ['WORKER_RESPONSE_TOO_LARGE']));
      return;
    }
    for (;;) {
      const idx = this.buffer.indexOf('\n');
      if (idx < 0) break;
      const line = this.buffer.slice(0, idx);
      this.buffer = this.buffer.slice(idx + 1);
      if (!line.trim()) continue;
      if (!this.pending) {
        this.failPending(new HostError('UNKNOWN', ['WORKER_UNSOLICITED_RESPONSE']));
        return;
      }
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      try {
        pending.resolve(parseOneJsonLine(line, 'WORKER_RESPONSE'));
      } catch (error) {
        pending.reject(error);
      }
    }
  }
  onExit() {
    this.child = null;
    if (this.closing) return;
    this.failed = true;
    this.failPending(new HostError('UNKNOWN', ['WORKER_EXITED']));
  }
  failPending(error) {
    if (this.pending) {
      const pending = this.pending;
      this.pending = null;
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  }
  request(value) {
    const request = precheckSemanticRequest(value);
    const execute = () => this._request(request);
    const result = this.queue.catch(() => {}).then(execute);
    this.queue = result.catch(() => {});
    return result;
  }
  _request(request) {
    if (this.failed) return Promise.reject(new HostError('UNKNOWN', ['WORKER_UNAVAILABLE']));
    const child = this.start();
    if (!child || !child.stdin || !child.stdout) {
      return Promise.reject(new HostError('UNKNOWN', ['WORKER_PIPE_UNAVAILABLE']));
    }
    if (this.pending) return Promise.reject(new HostError('CONFLICT', ['WORKER_REQUEST_CONCURRENCY_CONFLICT']));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.pending) return;
        this.pending = null;
        this.failed = true;
        reject(new HostError('UNKNOWN', ['WORKER_RESPONSE_TIMEOUT']));
      }, this.timeoutMs);
      this.pending = {resolve, reject, timer};
      child.stdin.write(JSON.stringify(request) + '\n', (error) => {
        if (!error) return;
        if (this.pending) {
          this.pending = null;
          clearTimeout(timer);
        }
        this.failed = true;
        reject(new HostError('UNKNOWN', ['WORKER_STDIN_WRITE_FAILED']));
      });
    });
  }
  close() {
    this.closing = true;
    this.failPending(new HostError('UNKNOWN', ['WORKER_CLOSING']));
    if (this.child && this.child.exitCode === null && !this.child.killed) {
      this.child.kill('SIGTERM');
    }
  }
}
function createHostServer({
  bridge = new PersistentWorker(),
  socketPath = SOCKET_PATH,
  netImpl = net,
} = {}) {
  const server = netImpl.createServer({allowHalfOpen: true}, (socket) => {
    let data = '';
    let replied = false;
    const reply = (value) => {
      if (replied) return;
      replied = true;
      socket.end(JSON.stringify(value) + '\n');
    };
    socket.on('data', (chunk) => {
      data += chunk.toString('utf8');
      if (Buffer.byteLength(data, 'utf8') > MAX_BYTES) {
        reply(errorResult(new HostError('UNKNOWN', ['REQUEST_TOO_LARGE'])));
      }
    });
    socket.on('end', () => {
      if (replied) return;
      let request;
      try {
        request = precheckSemanticRequest(parseOneJsonLine(data, 'REQUEST'));
      } catch (error) {
        reply(errorResult(error));
        return;
      }
      Promise.resolve(bridge.request(request)).then(reply).catch((error) => reply(errorResult(error)));
    });
    socket.on('error', () => {});
  });
  return {server, bridge, socketPath};
}
function serveHost({
  socketPath = SOCKET_PATH,
  bridge = new PersistentWorker(),
  fsImpl = fs,
  netImpl = net,
} = {}) {
  const dir = path.dirname(socketPath);
  fsImpl.mkdirSync(dir, {recursive: true, mode: 0o700});
  fsImpl.chmodSync(dir, 0o700);
  try {
    const stat = fsImpl.lstatSync(socketPath);
    if (!stat.isSocket()) fail('CONFLICT', 'CONTROL_PATH_NOT_SOCKET');
    fsImpl.unlinkSync(socketPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  bridge.start();
  const created = createHostServer({bridge, socketPath, netImpl});
  created.server.listen(socketPath, () => {
    fsImpl.chmodSync(socketPath, 0o600);
  });
  const close = () => {
    bridge.close();
    created.server.close(() => {
      try { fsImpl.unlinkSync(socketPath); } catch (_) {}
      process.exit(0);
    });
  };
  process.on('SIGTERM', close);
  process.on('SIGINT', close);
  return created;
}

if (require.main === module) {
  if (process.env.MCL_DETACHED_HOST_FRONT_V1 === '1') {
    if (process.argv.length !== 2) {
      process.stdout.write(JSON.stringify(errorResult(new HostError('UNKNOWN', ['HOST_FRONT_ARGUMENT_FORBIDDEN']))) + '\n');
      process.exitCode = 2;
    } else {
      try { serveHost(); }
      catch (error) {
        process.stdout.write(JSON.stringify(errorResult(error)) + '\n');
        process.exitCode = 2;
      }
    }
  } else {
    runClient().then((value) => {
      process.stdout.write(JSON.stringify(value, null, 2) + '\n');
      process.exitCode = value?.result === 'PASS'
        || ['RUN_ACCEPTED', 'ALREADY_FINISHED'].includes(value?.status) ? 0 : 2;
    }).catch((error) => {
      process.stdout.write(JSON.stringify(errorResult(error), null, 2) + '\n');
      process.exitCode = 2;
    });
  }
}

module.exports = {
  FALSE_AUTHORITY,
  HOST_LIB_DIR,
  HOST_RUN_DIR,
  INSPECT_SCHEMA,
  MAX_BYTES,
  NODE,
  PACKET_RE,
  PHASE,
  PROOT_DISTRO,
  PersistentWorker,
  RUNTIME_SOURCE,
  RUN_ID_RE,
  SERVICE_SOURCE,
  SOCKET_PATH,
  START_RESULT_SCHEMA,
  START_SCHEMA,
  createHostServer,
  errorResult,
  packetNumber,
  parsePublicCli,
  precheckSemanticRequest,
  prepareArgs,
  prepareStart,
  runClient,
  serveHost,
  socketRequest,
  workerArgs,
};
