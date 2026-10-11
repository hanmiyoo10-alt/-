#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const runtime = require('./mcl-detached-owner-runtime.cjs');

const REQUEST_MAX = runtime.MAX_SOCKET_BYTES;
const START_FIELDS = new Set([
  'schema', 'operation', 'packetRef', 'phase', 'runId', 'activationDigest',
  'expectedParentManifestId', 'expectedLeaseId', 'attemptId',
]);
const INSPECT_FIELDS = new Set(['schema', 'operation', 'packetRef', 'runId']);
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function exactKeys(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new runtime.RuntimeError('UNKNOWN', ['REQUEST_OBJECT_REQUIRED']);
  }
  const extras = Object.keys(value).filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !(key in value));
  if (extras.length || missing.length) {
    throw new runtime.RuntimeError('UNKNOWN', [
      ...extras.map((key) => 'REQUEST_UNKNOWN_FIELD:' + key),
      ...missing.map((key) => 'REQUEST_FIELD_REQUIRED:' + key),
    ]);
  }
}
function parseRequest(value) {
  if (value?.operation === 'start-fixed') {
    exactKeys(value, START_FIELDS);
    if (value.schema !== runtime.START_SCHEMA || value.phase !== runtime.PHASE
        || !runtime.RUN_ID_RE.test(value.runId || '')
        || !/^[0-9a-f]{64}$/.test(value.activationDigest || '')
        || !/^[0-9a-f]{64}$/.test(value.expectedParentManifestId || '')
        || !/^[0-9a-f]{64}$/.test(value.expectedLeaseId || '')
        || value.attemptId !== 1) {
      throw new runtime.RuntimeError('UNKNOWN', ['START_REQUEST_INVALID']);
    }
    runtime.packetNumber(value.packetRef);
    return {...value};
  }
  if (value?.operation === 'inspect') {
    exactKeys(value, INSPECT_FIELDS);
    if (value.schema !== runtime.INSPECT_SCHEMA || !runtime.RUN_ID_RE.test(value.runId || '')) {
      throw new runtime.RuntimeError('UNKNOWN', ['INSPECT_REQUEST_INVALID']);
    }
    runtime.packetNumber(value.packetRef);
    return {...value};
  }
  throw new runtime.RuntimeError('UNKNOWN', ['REQUEST_OPERATION_UNSUPPORTED']);
}
function startResult(status, request, {
  launchCountDelta = 0,
  attemptId = 1,
  executionLifecycle = 'UNKNOWN',
  reasonCodes = [],
  existing = false,
} = {}) {
  return {
    schema: runtime.START_RESULT_SCHEMA,
    status,
    packetRef: request.packetRef,
    phase: runtime.PHASE,
    runId: request.runId,
    attemptId,
    executionLifecycle,
    existing,
    launchCountDelta,
    reasonCodes: [...new Set(reasonCodes)].sort(),
    authority: {...FALSE_AUTHORITY},
  };
}
function safeError(error) {
  const kind = error instanceof runtime.RuntimeError ? error.kind : 'UNKNOWN';
  return {
    schema: runtime.START_RESULT_SCHEMA,
    status: kind,
    reasonCodes: error instanceof runtime.RuntimeError ? error.reasonCodes : ['UNEXPECTED_ERROR'],
    authority: {...FALSE_AUTHORITY},
  };
}
function liveChild(meta) {
  return Boolean(meta?.child && meta.child.exitCode === null && !meta.child.killed);
}

class RuntimeSupervisor {
  constructor({
    forkImpl = childProcess.fork,
    env = process.env,
    spawnSyncImpl = childProcess.spawnSync,
    worktreeResolver = runtime.fixedWorktree,
  } = {}) {
    this.forkImpl = forkImpl;
    this.env = env;
    this.spawnSyncImpl = spawnSyncImpl;
    this.worktreeResolver = worktreeResolver;
    this.children = new Map();
  }

  stored(request) {
    return runtime.readStoredActivation({
      packetRef: request.packetRef,
      runId: request.runId,
      worktree: this.worktreeResolver(request.packetRef),
      spawnSyncImpl: this.spawnSyncImpl,
    });
  }

  validateStartAgainstStored(request, stored) {
    const {activation, guards} = stored;
    if (activation.activationDigest !== request.activationDigest
        || activation.phase !== request.phase
        || guards.parentManifestId !== request.expectedParentManifestId
        || guards.leaseId !== request.expectedLeaseId
        || guards.attemptId !== request.attemptId) {
      throw new runtime.RuntimeError('CONFLICT', ['START_ACTIVATION_GUARD_CONFLICT']);
    }
  }

  findConflictingNonterminal(stored) {
    const root = path.dirname(stored.runRoot);
    const entries = fs.readdirSync(root, {withFileTypes: true})
      .filter((entry) => entry.isDirectory() && runtime.RUN_ID_RE.test(entry.name))
      .slice(0, runtime.MAX_RUNS_PER_WORKTREE + 1);
    if (entries.length > runtime.MAX_RUNS_PER_WORKTREE) {
      throw new runtime.RuntimeError('UNKNOWN', ['RUN_DISCOVERY_LIMIT_REACHED']);
    }
    for (const entry of entries) {
      if (entry.name === stored.activation.runId) continue;
      const candidateRoot = path.join(root, entry.name);
      try {
        const activation = JSON.parse(fs.readFileSync(
          path.join(candidateRoot, 'activation', 'activation.json'), 'utf8'));
        if (activation.packetRef !== stored.activation.packetRef
            || activation.phase !== stored.activation.phase) continue;
        const state = runtime.readState(candidateRoot);
        if (state && state.executionLifecycle !== 'FINISHED') {
          return {runId: entry.name};
        }
      } catch (_) {
        throw new runtime.RuntimeError('UNKNOWN', ['RUN_DISCOVERY_EVIDENCE_INVALID']);
      }
    }
    return null;
  }

  childArgs(stored) {
    const a = path.join(stored.runRoot, 'activation');
    const g = path.join(stored.runRoot, 'attempts', '1');
    return [
      '--packet', stored.activation.packetRef,
      '--parent-manifest-file', path.join(g, 'parent-manifest.md'),
      '--parent-handoff-file', path.join(g, 'parent-handoff.md'),
      '--request-file', path.join(a, 'request.json'),
      '--patch-file', path.join(a, 'patch.diff'),
      '--validation-request-file', path.join(a, 'validation-request.json'),
      '--pr-request-file', path.join(a, 'pr-request.json'),
      '--apply',
    ];
  }

  coordinatorPath(packetRef) {
    return path.join(
      this.worktreeResolver(packetRef),
      'products/chatgpt-mobile-coder-lab/coordination/repository-implementation/mcl-repository-implementation.cjs',
    );
  }

  persistWaiting(runRoot) {
    const current = runtime.readState(runRoot);
    if (!current || current.executionLifecycle === 'FINISHED'
        || current.executionLifecycle === 'WAITING') return current;
    return runtime.writeState(runRoot, current, runtime.nextState(current, {
      executionLifecycle: 'WAITING',
    }));
  }

  attachChild(runId, stored, child) {
    const meta = {child, exited: false, runRoot: stored.runRoot, attemptId: 1};
    this.children.set(runId, meta);
    child.on('message', async (message) => {
      if (!message || message.type !== 'checkpoint'
          || !Number.isSafeInteger(message.seq) || message.seq < 1
          || !message.event) return;
      try {
        runtime.persistCheckpoint(stored.runRoot, message.event);
        child.send({
          schema: runtime.CHECKPOINT_ACK_SCHEMA,
          seq: message.seq,
          status: 'PASS',
          reasonCodes: [],
        });
      } catch (error) {
        child.send({
          schema: runtime.CHECKPOINT_ACK_SCHEMA,
          seq: message.seq,
          status: 'BLOCKED',
          reasonCodes: error instanceof runtime.RuntimeError
            ? error.reasonCodes : ['CHECKPOINT_PERSIST_FAILED'],
        });
      }
    });
    const markExited = () => {
      if (meta.exited) return;
      meta.exited = true;
      meta.child = null;
      try { this.persistWaiting(stored.runRoot); } catch (_) {}
    };
    child.once('exit', markExited);
    child.once('error', markExited);
    return meta;
  }

  start(requestValue) {
    const request = parseRequest(requestValue);
    const stored = this.stored(request);
    this.validateStartAgainstStored(request, stored);
    const current = runtime.readState(stored.runRoot);
    const existingMeta = this.children.get(request.runId);

    if (current?.executionLifecycle === 'FINISHED') {
      const finalRef = runtime.readFinalReceiptRef(stored.runRoot);
      if (!finalRef || finalRef.digest !== current.finalReceiptDigest) {
        return startResult('UNKNOWN', request, {
          executionLifecycle: 'FINISHED',
          reasonCodes: ['FINAL_RECEIPT_EVIDENCE_UNRESOLVED'],
          existing: true,
        });
      }
      return startResult('ALREADY_FINISHED', request, {
        executionLifecycle: 'FINISHED', existing: true,
      });
    }
    if (current) {
      if (liveChild(existingMeta)) {
        return startResult('RUN_ACCEPTED', request, {
          executionLifecycle: current.executionLifecycle,
          existing: true,
          launchCountDelta: 0,
        });
      }
      return startResult('UNKNOWN', request, {
        executionLifecycle: current.executionLifecycle,
        existing: true,
        reasonCodes: ['EXISTING_NONTERMINAL_RUN_REQUIRES_INSPECT'],
      });
    }

    const conflict = this.findConflictingNonterminal(stored);
    if (conflict) {
      return startResult('CONFLICT', request, {
        reasonCodes: ['PACKET_PHASE_NONTERMINAL_ACTIVATION_CONFLICT'],
      });
    }

    const initial = runtime.writeState(stored.runRoot, null, runtime.initialState(request.runId));
    const running = runtime.writeState(stored.runRoot, initial, runtime.nextState(initial, {
      executionLifecycle: 'RUNNING',
      nextPrimitive: 'WORKSPACE_READY',
    }));
    let child;
    try {
      child = this.forkImpl(
        this.coordinatorPath(request.packetRef),
        this.childArgs(stored),
        {
          cwd: this.worktreeResolver(request.packetRef),
          env: {...this.env, MCL_DETACHED_FIXED_WORKER_V1: '1'},
          stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
          detached: false,
        },
      );
    } catch (_) {
      runtime.writeState(stored.runRoot, running, runtime.nextState(running, {
        executionLifecycle: 'WAITING',
      }));
      return startResult('UNKNOWN', request, {
        executionLifecycle: 'WAITING',
        reasonCodes: ['OWNER_CHILD_LAUNCH_FAILED'],
      });
    }
    this.attachChild(request.runId, stored, child);
    return startResult('RUN_ACCEPTED', request, {
      executionLifecycle: running.executionLifecycle,
      launchCountDelta: 1,
    });
  }

  inspect(requestValue, {
    connectionObservation = 'REATTACHED',
    journal = null,
    remoteEffect = null,
    continuationAuthority = null,
    nextPrimitive = null,
  } = {}) {
    const request = parseRequest(requestValue);
    const stored = this.stored(request);
    const state = runtime.readState(stored.runRoot);
    if (!state) {
      throw new runtime.RuntimeError('UNKNOWN', ['RUN_STATE_MISSING']);
    }
    const meta = this.children.get(request.runId);
    let ownerLiveness = 'UNKNOWN';
    if (liveChild(meta)) ownerLiveness = 'LIVE';
    else if (meta?.exited || state.executionLifecycle === 'FINISHED') ownerLiveness = 'ABSENT';
    const finalRef = runtime.readFinalReceiptRef(stored.runRoot);
    return runtime.projectInspect({
      activation: stored.activation,
      state,
      ownerLiveness,
      connectionObservation,
      finalRef,
      journal,
      remoteEffect,
      continuationAuthority,
      nextPrimitive,
    });
  }

  handle(value) {
    const parsed = parseRequest(value);
    return parsed.operation === 'start-fixed' ? this.start(parsed) : this.inspect(parsed);
  }
}

function serveStdio({
  supervisor = new RuntimeSupervisor(),
  input = process.stdin,
  output = process.stdout,
} = {}) {
  let buffer = '';
  let chain = Promise.resolve();
  let failed = false;

  const write = (value) => {
    const line = JSON.stringify(value) + '\n';
    if (Buffer.byteLength(line, 'utf8') > REQUEST_MAX) {
      output.write(JSON.stringify(safeError(new runtime.RuntimeError(
        'UNKNOWN', ['RESPONSE_TOO_LARGE']))) + '\n');
      return;
    }
    output.write(line);
  };
  const dispatch = (line) => {
    chain = chain.then(async () => {
      if (failed) return;
      let value;
      try {
        value = JSON.parse(line);
      } catch (_) {
        write(safeError(new runtime.RuntimeError('UNKNOWN', ['REQUEST_JSON_INVALID'])));
        return;
      }
      try {
        write(await supervisor.handle(value));
      } catch (error) {
        write(safeError(error));
      }
    });
  };
  const consume = () => {
    for (;;) {
      const idx = buffer.indexOf('\n');
      if (idx < 0) break;
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (!line.trim()) {
        write(safeError(new runtime.RuntimeError('UNKNOWN', ['ONE_REQUEST_REQUIRED'])));
        continue;
      }
      if (Buffer.byteLength(line, 'utf8') > REQUEST_MAX) {
        write(safeError(new runtime.RuntimeError('UNKNOWN', ['REQUEST_TOO_LARGE'])));
        continue;
      }
      dispatch(line);
    }
    if (Buffer.byteLength(buffer, 'utf8') > REQUEST_MAX) {
      failed = true;
      buffer = '';
      write(safeError(new runtime.RuntimeError('UNKNOWN', ['REQUEST_TOO_LARGE'])));
    }
  };

  input.on('data', (chunk) => {
    if (failed) return;
    buffer += chunk.toString('utf8');
    consume();
  });
  input.on('end', () => {
    if (failed) return;
    const line = buffer.trim();
    buffer = '';
    if (line) {
      if (Buffer.byteLength(line, 'utf8') > REQUEST_MAX) {
        write(safeError(new runtime.RuntimeError('UNKNOWN', ['REQUEST_TOO_LARGE'])));
      } else {
        dispatch(line);
      }
    }
  });
  input.on('error', () => {
    failed = true;
  });
  return {supervisor, drain: () => chain};
}

if (require.main === module) {
  if (process.env.MCL_DETACHED_STDIO_WORKER_V1 !== '1' || process.argv.length !== 2) {
    process.stdout.write(JSON.stringify(safeError(new runtime.RuntimeError(
      'UNKNOWN', ['INTERNAL_WORKER_MODE_REQUIRED']))) + '\n');
    process.exitCode = 2;
  } else {
    try {
      serveStdio();
    } catch (error) {
      process.stdout.write(JSON.stringify(safeError(error)) + '\n');
      process.exitCode = 2;
    }
  }
}

module.exports = {
  FALSE_AUTHORITY,
  INSPECT_FIELDS,
  RuntimeSupervisor,
  START_FIELDS,
  liveChild,
  parseRequest,
  safeError,
  serveStdio,
  startResult,
};
