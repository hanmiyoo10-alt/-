#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');

const SCHEMA = 'mcl-l-rdc-session-evidence.v1';
const OWNER = 'mcl-l-rdc-session-evidence';
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const AGENT_PACKAGE_MARKER = '@wonderwhy-er/desktop-commander';
const AGENT_ENTRY_MARKER = '/dist/index.js';
const SHELL_NAMES = new Set(['cmd.exe', 'powershell.exe', 'pwsh.exe']);
const BENIGN_DIRECT_CHILDREN = new Set(['conhost.exe']);
const MAX_ANCESTOR_DEPTH = 16;
const MAX_PROCESS_ROWS = 8192;
const MAX_COMMAND_LINE = 16384;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 5000;
const FIXED_POWERSHELL_SOURCE = [
  "$ErrorActionPreference='Stop'",
  "$rows=@(Get-CimInstance Win32_Process | Where-Object {$_.ProcessId -gt 0} | Select-Object ProcessId,ParentProcessId,Name,CommandLine)",
  "$rows | ConvertTo-Json -Compress -Depth 3",
].join(';');
const FIXED_POWERSHELL_ENCODED =
  Buffer.from(FIXED_POWERSHELL_SOURCE, 'utf16le').toString('base64');
const FIXED_POWERSHELL_ARGS = Object.freeze([
  '-NoLogo',
  '-NoProfile',
  '-NonInteractive',
  '-EncodedCommand',
  FIXED_POWERSHELL_ENCODED,
]);

const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function topologyResult(sessionState, reasonCode) {
  return {sessionState, reasonCode};
}

function receipt(topology) {
  const state = topology?.sessionState || 'UNKNOWN';
  const reasonCode = topology?.reasonCode || 'RDC_AGENT_TOPOLOGY_AMBIGUOUS';
  return {
    schema: SCHEMA,
    status: state === 'UNKNOWN' ? 'UNKNOWN' : 'PASS',
    executor: 'L',
    sessionState: state,
    reasonCode,
    owner: OWNER,
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };
}

function defaultRunner() {
  const result = childProcess.spawnSync(POWERSHELL, FIXED_POWERSHELL_ARGS, {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_OUTPUT_BYTES,
    env: {},
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 127,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    signal: result.signal || null,
    error: result.error || null,
  };
}

function normalizeProcessRow(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('PROCESS_ROW_INVALID');
  }
  const pid = Number(raw.ProcessId);
  const ppid = Number(raw.ParentProcessId);
  const name = typeof raw.Name === 'string' ? raw.Name.trim().toLowerCase() : '';
  const commandLine = raw.CommandLine === null || raw.CommandLine === undefined
    ? ''
    : String(raw.CommandLine);
  if (!Number.isSafeInteger(pid) || pid <= 0
      || !Number.isSafeInteger(ppid) || ppid < 0
      || !name || name.length > 260
      || commandLine.length > MAX_COMMAND_LINE) {
    throw new Error('PROCESS_ROW_INVALID');
  }
  return {pid, ppid, name, commandLine};
}

function parseProcessTable(text) {
  const body = String(text || '').replace(/^\uFEFF/, '').trim();
  if (!body) throw new Error('PROCESS_TABLE_EMPTY');
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('PROCESS_TABLE_JSON_INVALID');
  }
  const rawRows = Array.isArray(parsed) ? parsed : [parsed];
  if (!rawRows.length || rawRows.length > MAX_PROCESS_ROWS) {
    throw new Error('PROCESS_TABLE_SIZE_INVALID');
  }
  const rows = rawRows.map(normalizeProcessRow);
  if (new Set(rows.map((row) => row.pid)).size !== rows.length) {
    throw new Error('PROCESS_TABLE_PID_DUPLICATE');
  }
  return rows;
}

function normalizedCommandLine(row) {
  return String(row?.commandLine || '').trim().toLowerCase().replace(/\\/g, '/');
}

function hasAgentMarker(row) {
  const value = normalizedCommandLine(row);
  return value.includes(AGENT_PACKAGE_MARKER) && value.includes(AGENT_ENTRY_MARKER);
}

function classifyProcessTable(rows, selfPid) {
  if (!Array.isArray(rows) || !Number.isSafeInteger(selfPid) || selfPid <= 0) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  const byPid = new Map();
  for (const row of rows) {
    if (!row || !Number.isSafeInteger(row.pid) || byPid.has(row.pid)) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
    }
    byPid.set(row.pid, row);
  }

  const chain = [];
  let pid = selfPid;
  const seen = new Set();
  for (let depth = 0; depth < MAX_ANCESTOR_DEPTH && pid > 0; depth += 1) {
    if (seen.has(pid)) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
    }
    seen.add(pid);
    const row = byPid.get(pid);
    if (!row) {
      if (chain.length === 0) {
        return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
      }
      break;
    }
    chain.push(row);
    if (row.ppid === 0) break;
    pid = row.ppid;
  }

  const candidates = [];
  for (let index = 1; index < chain.length; index += 1) {
    const agent = chain[index];
    const directChild = chain[index - 1];
    if (hasAgentMarker(agent) && SHELL_NAMES.has(directChild.name)
        && directChild.ppid === agent.pid) {
      candidates.push({agent, currentRoot: directChild});
    }
  }
  if (candidates.length !== 1) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }

  const {agent, currentRoot} = candidates[0];
  const directChildren = rows.filter((row) => row.ppid === agent.pid);
  if (directChildren.filter((row) => row.pid === currentRoot.pid).length !== 1) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }

  let peerShells = 0;
  let unexpected = 0;
  for (const child of directChildren) {
    if (child.pid === currentRoot.pid) continue;
    if (SHELL_NAMES.has(child.name)) {
      peerShells += 1;
      continue;
    }
    if (BENIGN_DIRECT_CHILDREN.has(child.name)) continue;
    unexpected += 1;
  }
  if (unexpected > 0) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_CHILD_TOPOLOGY_AMBIGUOUS');
  }
  if (peerShells > 0) {
    return topologyResult('PRESENT', 'OTHER_RDC_COMMAND_SESSION_PRESENT');
  }
  return topologyResult('ABSENT', 'SOLE_RDC_COMMAND_SESSION');
}

function inspectLocal({
  platform = process.platform,
  arch = process.arch,
  selfPid = process.pid,
  runner = defaultRunner,
} = {}) {
  if (platform !== 'win32' || arch !== 'x64') {
    return receipt(topologyResult('UNKNOWN', 'EXECUTION_PROFILE_UNKNOWN'));
  }
  let result;
  try {
    result = runner();
  } catch {
    return receipt(topologyResult('UNKNOWN', 'RDC_PROCESS_READ_FAILED'));
  }
  if (!result || result.error || result.signal || result.code !== 0) {
    return receipt(topologyResult('UNKNOWN', 'RDC_PROCESS_READ_FAILED'));
  }
  try {
    const rows = parseProcessTable(result.stdout);
    return receipt(classifyProcessTable(rows, selfPid));
  } catch {
    return receipt(topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS'));
  }
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length !== 1 || argv[0] !== 'inspect') {
    throw new Error('ARGUMENT_UNSUPPORTED');
  }
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
    process.stdout.write(JSON.stringify(
      receipt(topologyResult('UNKNOWN', 'ARGUMENT_UNSUPPORTED')),
    ) + '\n');
    process.exitCode = 64;
  }
}

module.exports = {
  AGENT_ENTRY_MARKER,
  AGENT_PACKAGE_MARKER,
  BENIGN_DIRECT_CHILDREN,
  FALSE_AUTHORITY,
  FIXED_POWERSHELL_ARGS,
  FIXED_POWERSHELL_SOURCE,
  OWNER,
  POWERSHELL,
  SCHEMA,
  SHELL_NAMES,
  classifyProcessTable,
  defaultRunner,
  hasAgentMarker,
  inspectLocal,
  normalizeProcessRow,
  parseArgs,
  parseProcessTable,
  receipt,
  runCli,
  topologyResult,
};
