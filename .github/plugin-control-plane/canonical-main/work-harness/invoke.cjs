'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { planHandoff } = require('./handoff.cjs');

function bounded(value, max = 4096) {
  const text = String(value || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  return text.length <= max ? text : `${text.slice(0, max)}…[truncated]`;
}
function resultBase(handoff) {
  return {
    schemaVersion: 1,
    mode: 'EXECUTOR_RESULT',
    workId: handoff?.workId || null,
    handoffHash: handoff?.handoffHash || null,
    adapterId: handoff?.adapterId || null,
    status: 'NOT_EXECUTED',
    executed: false,
    exitCode: null,
    signal: null,
    reasonCodes: [],
    stdout: '',
    stderr: '',
  };
}
function safeLocalTarget(root, relativePath) {
  const absoluteRoot = path.resolve(root);
  const absoluteTarget = path.resolve(absoluteRoot, relativePath);
  if (absoluteTarget === absoluteRoot || !absoluteTarget.startsWith(`${absoluteRoot}${path.sep}`)) {
    return { ok: false, reason: 'EXECUTOR_TARGET_OUTSIDE_REPOSITORY', absoluteTarget };
  }
  if (!fs.existsSync(absoluteTarget) || !fs.statSync(absoluteTarget).isFile()) {
    return { ok: false, reason: 'EXECUTOR_TARGET_MISSING', absoluteTarget };
  }
  return { ok: true, absoluteTarget };
}

function invokeBoundedReadOnly(workRecord, preflight, adapterRegistry, projectRegistry, options = {}) {
  const root = options.root || process.cwd();
  const spawn = options.spawnSyncImpl || spawnSync;
  const handoff = planHandoff(workRecord, preflight, adapterRegistry, projectRegistry);

  if (!handoff.executionAuthorized) {
    return {
      handoff,
      result: {
        ...resultBase(handoff),
        reasonCodes: ['HANDOFF_NOT_EXECUTION_AUTHORIZED', ...(handoff.reasonCodes || [])].sort(),
      },
    };
  }

  const route = handoff.route;
  if (!route || route.invokePolicy !== 'READ_ONLY_LOCAL' || route.targetKind !== 'LOCAL_NODE'
    || route.executionClass !== 'READ_ONLY' || route.mutationClass !== null) {
    return { handoff, result: { ...resultBase(handoff), reasonCodes: ['EXECUTION_ROUTE_POLICY_VIOLATION'] } };
  }

  const target = safeLocalTarget(root, route.target);
  if (!target.ok) {
    return { handoff, result: { ...resultBase(handoff), status: 'INFRA_ERROR', reasonCodes: [target.reason] } };
  }

  let run;
  try {
    run = spawn(process.execPath, [target.absoluteTarget, ...route.fixedArgs], {
      cwd: path.resolve(root),
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      shell: false,
    });
  } catch (error) {
    return {
      handoff,
      result: {
        ...resultBase(handoff),
        status: 'INFRA_ERROR',
        reasonCodes: ['EXECUTOR_SPAWN_THROW'],
        stderr: bounded(error?.message || error),
      },
    };
  }

  if (run.error || run.status === null || run.signal) {
    return {
      handoff,
      result: {
        ...resultBase(handoff),
        status: 'INFRA_ERROR',
        executed: true,
        exitCode: run.status,
        signal: run.signal || null,
        reasonCodes: ['EXECUTOR_INFRA_ERROR'],
        stdout: bounded(run.stdout),
        stderr: bounded(run.stderr || run.error?.message),
      },
    };
  }

  return {
    handoff,
    result: {
      ...resultBase(handoff),
      status: run.status === 0 ? 'PASS' : 'FAIL',
      executed: true,
      exitCode: run.status,
      signal: null,
      reasonCodes: run.status === 0 ? ['EXECUTOR_READ_ONLY_PASS'] : ['EXECUTOR_READ_ONLY_FAIL'],
      stdout: bounded(run.stdout),
      stderr: bounded(run.stderr),
    },
  };
}

module.exports = { bounded, invokeBoundedReadOnly, safeLocalTarget };
