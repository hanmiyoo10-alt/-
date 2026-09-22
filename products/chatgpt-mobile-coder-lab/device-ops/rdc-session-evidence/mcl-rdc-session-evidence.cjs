#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SHELL_COMMS = new Set(['sh', 'bash', 'dash', 'zsh', 'ksh']);
const COMMAND_AGENT_MARKER =
  'desktop-commander-remote/node_modules/@wonderwhy-er/desktop-commander/dist/index.js';

const EXECUTION_PROFILES = Object.freeze({
  S: Object.freeze([
    '/root/nyang-repo',
    '/root/nyang-worktrees',
  ]),
  M: Object.freeze([
    '/data/data/com.termux/files/home/nyang-repo',
    '/data/data/com.termux/files/home/nyang-worktrees',
  ]),
});

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function inside(root, value) {
  return value === root || value.startsWith(root + path.sep);
}

function inferExecutor(cwd = process.cwd()) {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) return 'unknown';
  const normalized = path.resolve(cwd);
  for (const [executor, roots] of Object.entries(EXECUTION_PROFILES)) {
    if (roots.some((root) => inside(root, normalized))) return executor;
  }
  return 'unknown';
}

function readProcRecord(procRoot, pid) {
  const statText = fs.readFileSync(path.join(procRoot, String(pid), 'stat'), 'utf8');
  const end = statText.lastIndexOf(')');
  if (end < 0) throw new Error('PROC_STAT_INVALID');
  const fields = statText.slice(end + 2).trim().split(/\s+/);
  const ppid = Number(fields[1]);
  if (!Number.isSafeInteger(ppid) || ppid < 0) throw new Error('PROC_PPID_INVALID');
  const comm = fs.readFileSync(path.join(procRoot, String(pid), 'comm'), 'utf8').trim();
  const cmdline = fs.readFileSync(path.join(procRoot, String(pid), 'cmdline'))
    .toString('utf8').replace(/\0/g, ' ').trim();
  return {pid, ppid, comm, cmdline};
}

function isCommandAgent(record) {
  if (!record || !String(record.cmdline || '').includes(COMMAND_AGENT_MARKER)) return false;
  const tokens = String(record.cmdline).split(/\s+/).filter(Boolean);
  return tokens[tokens.length - 1] !== 'remote';
}

function topologyResult(sessionState, reasonCode, compatibilityReason) {
  return {sessionState, reasonCode, compatibilityReason};
}

function scanSession({procRoot = '/proc', selfPid = process.pid} = {}) {
  try {
    const chain = [];
    let pid = selfPid;
    for (let index = 0; index < 16 && pid > 1; index += 1) {
      const record = readProcRecord(procRoot, pid);
      chain.push(record);
      if (isCommandAgent(record)) break;
      pid = record.ppid;
    }
    const agentIndex = chain.findIndex(isCommandAgent);
    if (agentIndex <= 0) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS', 'SESSION_TOPOLOGY_UNRESOLVED');
    }

    const agent = chain[agentIndex];
    const currentRoot = chain[agentIndex - 1];
    if (currentRoot.ppid !== agent.pid || !SHELL_COMMS.has(currentRoot.comm)) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS', 'SESSION_TOPOLOGY_UNRESOLVED');
    }

    let otherShellCount = 0;
    let unexpectedChildCount = 0;
    for (const name of fs.readdirSync(procRoot)) {
      if (!/^[0-9]+$/.test(name)) continue;
      const childPid = Number(name);
      let child;
      try {
        child = readProcRecord(procRoot, childPid);
      } catch (error) {
        if (error && (error.code === 'ENOENT' || error.code === 'ESRCH')) continue;
        return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS', 'SESSION_TOPOLOGY_UNRESOLVED');
      }
      if (child.ppid !== agent.pid || child.pid === currentRoot.pid) continue;
      if (SHELL_COMMS.has(child.comm)) {
        otherShellCount += 1;
        continue;
      }
      const benignProbe = child.comm.startsWith('python')
        && /python(?:3)?\s+--version\s*$/.test(child.cmdline);
      if (!benignProbe) unexpectedChildCount += 1;
    }

    if (otherShellCount > 0) {
      return topologyResult(
        'PRESENT',
        'OTHER_RDC_COMMAND_SESSION_PRESENT',
        'OTHER_RDC_COMMAND_SESSION_PRESENT',
      );
    }
    if (unexpectedChildCount > 0) {
      return topologyResult(
        'UNKNOWN',
        'RDC_AGENT_TOPOLOGY_AMBIGUOUS',
        'RDC_AGENT_CHILD_TOPOLOGY_AMBIGUOUS',
      );
    }
    return topologyResult('ABSENT', 'SOLE_RDC_COMMAND_SESSION', 'SOLE_RDC_COMMAND_SESSION');
  } catch {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS', 'SESSION_TOPOLOGY_UNRESOLVED');
  }
}

function receipt(executor, topology) {
  const state = topology?.sessionState || 'UNKNOWN';
  const reasonCode = topology?.reasonCode || 'RDC_AGENT_TOPOLOGY_AMBIGUOUS';
  return {
    schema: 'mcl-rdc-session-evidence.v1',
    status: state === 'UNKNOWN' ? 'UNKNOWN' : 'PASS',
    executor,
    sessionState: state,
    reasonCode,
    owner: 'mcl-rdc-session-evidence',
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };
}

function inspectLocal({
  cwd = process.cwd(),
  procRoot = '/proc',
  selfPid = process.pid,
} = {}) {
  const executor = inferExecutor(cwd);
  if (executor === 'unknown') {
    return receipt('unknown', topologyResult(
      'UNKNOWN',
      'EXECUTION_PROFILE_UNKNOWN',
      'EXECUTION_PROFILE_UNKNOWN',
    ));
  }
  return receipt(executor, scanSession({procRoot, selfPid}));
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || argv[0] !== 'inspect') throw new Error('ARGUMENT_UNSUPPORTED');
  return {operation: 'inspect'};
}

function runCli(argv = process.argv.slice(2), options = {}) {
  parseArgs(argv);
  const value = inspectLocal(options);
  process.stdout.write(JSON.stringify(value) + '\n');
  return value.status === 'PASS' ? 0 : 3;
}

if (require.main === module) {
  try {
    process.exitCode = runCli();
  } catch {
    process.stdout.write(JSON.stringify(receipt('unknown', topologyResult(
      'UNKNOWN',
      'EXECUTION_PROFILE_UNKNOWN',
      'EXECUTION_PROFILE_UNKNOWN',
    ))) + '\n');
    process.exitCode = 2;
  }
}

module.exports = {
  COMMAND_AGENT_MARKER,
  EXECUTION_PROFILES,
  FALSE_AUTHORITY,
  inferExecutor,
  inspectLocal,
  isCommandAgent,
  parseArgs,
  readProcRecord,
  receipt,
  runCli,
  scanSession,
};
