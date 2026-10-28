#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCHEMA = 'mcl-l-rdc-session-evidence.v2';
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
const L_WSL_ROOTS = Object.freeze([
  '/home/alsl0/nyang-repo',
  '/home/alsl0/nyang-worktrees',
]);
const WSL_NPX_SCRIPT_RE =
  /^\/home\/alsl0\/\.npm\/_npx\/([^/]+)\/node_modules\/@wonderwhy-er\/desktop-commander\/dist\/index\.js$/;
const WSL_BENIGN_PYTHON_NAMES = new Set(['python', 'python3']);
const WSL_PLAUSIBLE_AGENT_NAMES = new Set(['node', 'mainthread']);
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

function hasAmbiguousAncestorStructure(byPid, self) {
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 0; depth < MAX_ANCESTOR_DEPTH; depth += 1) {
    if (current.ppid <= 0) return false;
    const parent = byPid.get(current.ppid);
    if (!parent) return false;
    if (seen.has(parent.pid)) return true;
    seen.add(parent.pid);
    current = parent;
  }
  return current.ppid > 0 && byPid.has(current.ppid);
}

function directChildrenForAgent(rows, agent) {
  const children = rows.filter((row) => row.ppid === agent.pid);
  if (children.some((row) => !validParentLink(agent, row))) {
    return {state: 'UNKNOWN', children: []};
  }
  return {state: 'EXACT', children};
}

function classifySameLineageAgents(rows, chain, currentAgent) {
  const currentIndex = chain.findIndex((row) => row.pid === currentAgent.pid);
  if (currentIndex < 0) {
    return {
      result: topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS'),
      agentPids: null,
    };
  }

  const agentPids = new Set([currentAgent.pid]);
  let expectedChild = currentAgent;
  for (let index = currentIndex + 1; index < chain.length; index += 1) {
    const ancestor = chain[index];
    if (!hasAgentMarker(ancestor)) break;
    if (!validParentLink(ancestor, expectedChild)) {
      return {
        result: topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS'),
        agentPids: null,
      };
    }

    const direct = directChildrenForAgent(rows, ancestor);
    if (direct.state !== 'EXACT'
        || direct.children.filter((child) => child.pid === expectedChild.pid).length !== 1) {
      return {
        result: topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS'),
        agentPids: null,
      };
    }

    for (const child of direct.children) {
      if (child.pid === expectedChild.pid) continue;
      if (SHELL_NAMES.has(child.name)) {
        return {
          result: topologyResult('PRESENT', 'OTHER_RDC_COMMAND_SESSION_PRESENT'),
          agentPids: null,
        };
      }
      if (BENIGN_DIRECT_CHILDREN.has(child.name)) continue;
      return {
        result: topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS'),
        agentPids: null,
      };
    }

    agentPids.add(ancestor.pid);
    expectedChild = ancestor;
  }
  return {result: null, agentPids};
}

function classifyAlternateAgents(rows, currentAgent, sameLineageAgentPids = new Set([currentAgent.pid])) {
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
  const alternates = potentialAgents.filter((row) => !sameLineageAgentPids.has(row.pid));
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
  if (hasAmbiguousAncestorStructure(byPid, self)) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  const chain = [self];
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 1; depth < MAX_ANCESTOR_DEPTH && current.ppid > 0; depth += 1) {
    const parent = byPid.get(current.ppid);
    if (!parent) break;
    if (seen.has(parent.pid)) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
    }
    if (!validParentLink(parent, current)) break;
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
  const lineage = classifySameLineageAgents(rows, chain, agent);
  if (lineage.result) return lineage.result;
  return classifyAlternateAgents(rows, agent, lineage.agentPids);
}


function insideRoot(root, value) {
  return value === root || value.startsWith(root + path.sep);
}

function isLWorkspaceCwd(cwd) {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd)) return false;
  const resolved = path.resolve(cwd);
  return L_WSL_ROOTS.some((root) => insideRoot(root, resolved));
}

function isWslRelease(value) {
  return typeof value === 'string' && /microsoft/i.test(value);
}

function normalizeWslArgv(argv) {
  if (!Array.isArray(argv) || argv.length > 128) throw new Error('WSL_ARGV_INVALID');
  return argv.map((value) => {
    if (typeof value !== 'string' || value.length > MAX_COMMAND_LINE) {
      throw new Error('WSL_ARGV_INVALID');
    }
    return value;
  });
}

function normalizeWslRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('WSL_RECORD_INVALID');
  }
  const pid = Number(raw.pid);
  const ppid = Number(raw.ppid);
  const name = typeof raw.name === 'string' ? raw.name.trim().toLowerCase() : '';
  const argv = normalizeWslArgv(raw.argv);
  if (!Number.isSafeInteger(pid) || pid <= 0
      || !Number.isSafeInteger(ppid) || ppid < 0
      || !name || name.length > 260) {
    throw new Error('WSL_RECORD_INVALID');
  }
  return {pid, ppid, name, argv, argvReadable: argv.length > 0};
}

function parseProcStatPpid(text) {
  const value = String(text || '');
  const end = value.lastIndexOf(')');
  if (end < 0) throw new Error('WSL_PROC_STAT_INVALID');
  const fields = value.slice(end + 2).trim().split(/\s+/);
  const ppid = Number(fields[1]);
  if (!Number.isSafeInteger(ppid) || ppid < 0) throw new Error('WSL_PROC_PPID_INVALID');
  return ppid;
}

function readWslProcRecord(procRoot, pid) {
  const dir = path.join(procRoot, String(pid));
  const ppid = parseProcStatPpid(fs.readFileSync(path.join(dir, 'stat'), 'utf8'));
  const name = fs.readFileSync(path.join(dir, 'comm'), 'utf8').trim();
  const bytes = fs.readFileSync(path.join(dir, 'cmdline'));
  const argv = bytes.toString('utf8').split('\0').filter(Boolean);
  return normalizeWslRecord({pid, ppid, name, argv});
}

function defaultWslReader(procRoot = '/proc') {
  const rows = [];
  for (const name of fs.readdirSync(procRoot)) {
    if (!/^[1-9][0-9]*$/.test(name)) continue;
    const pid = Number(name);
    try {
      rows.push(readWslProcRecord(procRoot, pid));
    } catch (error) {
      if (error && (error.code === 'ENOENT' || error.code === 'ESRCH')) continue;
      throw error;
    }
  }
  if (!rows.length || rows.length > MAX_PROCESS_ROWS) throw new Error('WSL_PROCESS_TABLE_SIZE_INVALID');
  if (new Set(rows.map((row) => row.pid)).size !== rows.length) {
    throw new Error('WSL_PROCESS_TABLE_PID_DUPLICATE');
  }
  return rows;
}

function normalizeWslScriptPath(value) {
  return String(value || '').replace(/\\/g, '/').toLowerCase();
}

function wslAgentIdentity(record, byPid) {
  if (!record || !record.argvReadable || record.argv.length !== 2) return null;
  if (path.posix.basename(normalizeWslScriptPath(record.argv[0])) !== 'node') return null;
  const script = normalizeWslScriptPath(record.argv[1]);
  const match = WSL_NPX_SCRIPT_RE.exec(script);
  if (!match) return null;
  const parent = byPid.get(record.ppid);
  if (!parent || !parent.argvReadable || parent.argv.length !== 3) return null;
  if (path.posix.basename(normalizeWslScriptPath(parent.argv[0])) !== 'node') return null;
  const cacheRoot = '/home/alsl0/.npm/_npx/' + match[1] + '/';
  const launcher = normalizeWslScriptPath(parent.argv[1]);
  const expectedLauncher = cacheRoot + 'node_modules/.bin/desktop-commander';
  if (launcher !== expectedLauncher) return null;
  if (String(parent.argv[2]).toLowerCase() !== 'remote') return null;
  return {cacheIdentity: match[1], parentPid: parent.pid, script};
}

function isWslBenignDirectChild(record) {
  if (!record || !record.argvReadable || record.argv.length !== 2) return false;
  if (!WSL_BENIGN_PYTHON_NAMES.has(record.name)) return false;
  const executable = path.posix.basename(normalizeWslScriptPath(record.argv[0]));
  return WSL_BENIGN_PYTHON_NAMES.has(executable) && record.argv[1] === '--version';
}

function classifyWslProcessTable(inputRows, selfPid) {
  if (!Array.isArray(inputRows) || !Number.isSafeInteger(selfPid) || selfPid <= 0) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  let rows;
  try {
    rows = inputRows.map(normalizeWslRecord);
  } catch {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  const byPid = new Map();
  for (const record of rows) {
    if (byPid.has(record.pid)) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
    }
    byPid.set(record.pid, record);
  }
  const self = byPid.get(selfPid);
  if (!self) return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');

  const chain = [self];
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 1; depth < MAX_ANCESTOR_DEPTH && current.ppid > 0; depth += 1) {
    const parent = byPid.get(current.ppid);
    if (!parent) break;
    if (seen.has(parent.pid)) return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
    seen.add(parent.pid);
    chain.push(parent);
    current = parent;
  }

  const candidates = [];
  for (let index = 1; index < chain.length; index += 1) {
    const identity = wslAgentIdentity(chain[index], byPid);
    if (identity) candidates.push({agent: chain[index], currentRoot: chain[index - 1], identity});
  }
  if (candidates.length !== 1) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }
  const {agent, currentRoot} = candidates[0];
  if (currentRoot.ppid !== agent.pid || !currentRoot.argvReadable) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }

  const globalAgents = rows.filter((record) => Boolean(wslAgentIdentity(record, byPid)));
  if (globalAgents.length !== 1 || globalAgents[0].pid !== agent.pid) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS');
  }
  if (rows.some((record) => record.pid !== agent.pid
      && WSL_PLAUSIBLE_AGENT_NAMES.has(record.name)
      && record.argvReadable === false)) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_GLOBAL_TOPOLOGY_AMBIGUOUS');
  }

  const directChildren = rows.filter((record) => record.ppid === agent.pid);
  if (directChildren.filter((record) => record.pid === currentRoot.pid).length !== 1) {
    return topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS');
  }

  for (const child of directChildren) {
    if (child.pid === currentRoot.pid) continue;
    if (!child.argvReadable) {
      return topologyResult('UNKNOWN', 'RDC_AGENT_CHILD_TOPOLOGY_AMBIGUOUS');
    }
    if (isWslBenignDirectChild(child)) continue;
    return topologyResult('PRESENT', 'OTHER_RDC_COMMAND_SESSION_PRESENT');
  }
  return topologyResult('ABSENT', 'SOLE_RDC_COMMAND_SESSION');
}

function inspectLocal({
  platform = process.platform,
  arch = process.arch,
  selfPid = process.pid,
  runner = defaultRunner,
  cwd = process.cwd(),
  osRelease = os.release(),
  procRoot = '/proc',
  wslReader = defaultWslReader,
} = {}) {
  if (platform === 'win32' && arch === 'x64') {
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
  if (platform === 'linux' && arch === 'x64' && isLWorkspaceCwd(cwd) && isWslRelease(osRelease)) {
    try {
      const rows = wslReader(procRoot);
      return receipt(classifyWslProcessTable(rows, selfPid));
    } catch {
      return receipt(topologyResult('UNKNOWN', 'RDC_AGENT_TOPOLOGY_AMBIGUOUS'));
    }
  }
  return receipt(topologyResult('UNKNOWN', 'EXECUTION_PROFILE_UNKNOWN'));
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
  L_WSL_ROOTS,
  WSL_NPX_SCRIPT_RE,
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
  classifyWslProcessTable,
  defaultRunner,
  defaultWslReader,
  directChildrenForAgent,
  hasAgentMarker,
  isLWorkspaceCwd,
  isWslBenignDirectChild,
  isWslRelease,
  inspectLocal,
  normalizeProcessRow,
  normalizeWslRecord,
  parseArgs,
  parseProcessTable,
  parseProcStatPpid,
  readWslProcRecord,
  receipt,
  runCli,
  topologyResult,
  validParentLink,
  wslAgentIdentity,
};
