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
const MAX_COMMAND_LINE = 32767;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const COMMAND_TIMEOUT_MS = 5000;
const FIXED_POWERSHELL_SOURCE = [
  "$ErrorActionPreference='Stop'",
  "$utf8=New-Object System.Text.UTF8Encoding($false)",
  "[Console]::OutputEncoding=$utf8",
  "$OutputEncoding=$utf8",
  "$rows=@(Get-CimInstance Win32_Process | Where-Object {$_.ProcessId -gt 0} | ForEach-Object {$created=[DateTimeOffset]$_.CreationDate; [pscustomobject]@{ProcessId=$_.ProcessId;ParentProcessId=$_.ParentProcessId;Name=$_.Name;CommandLine=$_.CommandLine;CreationTimeMs=$created.ToUnixTimeMilliseconds()}})",
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
  let commandLine = '';
  let commandLineReadable = false;
  if (raw.CommandLine === null || raw.CommandLine === undefined || raw.CommandLine === '') {
    commandLine = '';
  } else if (typeof raw.CommandLine === 'string') {
    commandLine = raw.CommandLine;
    commandLineReadable = true;
  } else {
    throw new Error('PROCESS_ROW_INVALID');
  }
  const creationTimeMs = Number(raw.CreationTimeMs);
  if (!Number.isSafeInteger(pid) || pid <= 0
      || !Number.isSafeInteger(ppid) || ppid < 0
      || !Number.isSafeInteger(creationTimeMs) || creationTimeMs < 0
      || !name || name.length > 260
      || commandLine.length > MAX_COMMAND_LINE) {
    throw new Error('PROCESS_ROW_INVALID');
  }
  return {pid, ppid, name, commandLine, commandLineReadable, creationTimeMs};
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

function validParentLink(parent, child) {
  return Boolean(parent && child
    && child.ppid === parent.pid
    && Number.isSafeInteger(parent.creationTimeMs)
    && Number.isSafeInteger(child.creationTimeMs)
    && parent.creationTimeMs <= child.creationTimeMs);
}

function directChildrenForAgent(rows, agent) {
  const children = rows.filter((row) => row.ppid === agent.pid);
  if (children.some((row) => !validParentLink(agent, row))) {
    return {state: 'UNKNOWN', children: []};
  }
  return {state: 'EXACT', children};
}

function classifyAlternateAgents(rows, currentAgent) {
  if (!currentAgent.commandLineReadable || !hasAgentMarker(currentAgent)) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS');
  }
  if (rows.some((row) => row.pid !== currentAgent.pid
      && row.name === currentAgent.name
      && row.commandLineReadable === false)) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS');
  }

  const potentialAgents = rows.filter(hasAgentMarker);
  if (potentialAgents.filter((row) => row.pid === currentAgent.pid).length !== 1) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS');
  }
  const alternates = potentialAgents.filter((row) => row.pid !== currentAgent.pid);
  if (alternates.length === 0) {
    return topologyResult('ABSENT', 'SOLE_RDC_COMMAND_SESSION');
  }

  for (const alternate of alternates) {
    const direct = directChildrenForAgent(rows, alternate);
    if (direct.state !== 'EXACT' || direct.children.length === 0) continue;
    if (direct.children.some((child) => SHELL_NAMES.has(child.name))) {
      return topologyResult('PRESENT', 'OTHER_RDC_COMMAND_SESSION_PRESENT');
    }
  }

  return topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS');
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

  const self = byPid.get(selfPid);
  if (!self) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  const chain = [self];
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 1; depth < MAX_ANCESTOR_DEPTH && current.ppid > 0; depth += 1) {
    const parent = byPid.get(current.ppid);
    if (!parent) break;
    if (seen.has(parent.pid) || !validParentLink(parent, current)) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
    }
    seen.add(parent.pid);
    chain.push(parent);
    current = parent;
  }

  const candidates = [];
  for (let index = 1; index < chain.length; index += 1) {
    const agent = chain[index];
    const directChild = chain[index - 1];
    if (hasAgentMarker(agent) && SHELL_NAMES.has(directChild.name)
        && validParentLink(agent, directChild)) {
      candidates.push({agent, currentRoot: directChild});
    }
  }
  if (candidates.length !== 1) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }

  const {agent, currentRoot} = candidates[0];
  const currentDirect = directChildrenForAgent(rows, agent);
  if (currentDirect.state !== 'EXACT') {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  const directChildren = currentDirect.children;
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
  return classifyAlternateAgents(rows, agent);
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
  MAX_COMMAND_LINE,
  OWNER,
  POWERSHELL,
  SCHEMA,
  SHELL_NAMES,
  classifyAlternateAgents,
  classifyProcessTable,
  defaultRunner,
  directChildrenForAgent,
  hasAgentMarker,
  inspectLocal,
  normalizeProcessRow,
  parseArgs,
  parseProcessTable,
  receipt,
  runCli,
  topologyResult,
  validParentLink,
};
