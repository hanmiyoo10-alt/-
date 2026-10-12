#!/usr/bin/env node
'use strict';

const childProcess = require('node:child_process');
const sessionEvidence = require('../l-rdc-session-evidence/mcl-l-rdc-session-evidence.cjs');

const SCHEMA = 'mcl-l-rdc-peer-session-cleanup.v1';
const OWNER = 'mcl-l-rdc-peer-session-cleanup';
const TASKKILL = 'C:\\Windows\\System32\\taskkill.exe';
const CONFIRM_FLAG = '--confirm-no-other-intentional-l-rdc-work';
const MAX_ANCESTOR_DEPTH = 16;
const EFFECT_TIMEOUT_MS = 5000;
const EFFECT_MAX_BUFFER = 128 * 1024;
const FALSE_AUTHORITY = Object.freeze({
  repositoryMutationAuthorized: false,
  deviceMutationAuthorized: false,
  mergeAuthorized: false,
  releaseAuthorized: false,
  productionAuthorized: false,
});

function publicReceipt({
  status = 'UNKNOWN',
  operation = 'inspect',
  effectEligibility = 'UNKNOWN',
  effectDisposition = 'NOT_RUN',
  peerShellCount = 0,
  cleanupCandidateCount = 0,
  blockedCandidateCount = 0,
  effectCount = 0,
  remainingPeerShellCount = 0,
  reasonCode = 'RDC_PEER_CLEANUP_TOPOLOGY_UNKNOWN',
} = {}) {
  return {
    schema: SCHEMA,
    status,
    executor: 'L',
    operation,
    effectEligibility,
    effectDisposition,
    peerShellCount,
    cleanupCandidateCount,
    blockedCandidateCount,
    effectCount,
    remainingPeerShellCount,
    reasonCode,
    owner: OWNER,
    details: 'withheld',
    authority: {...FALSE_AUTHORITY},
  };
}

function unknown(reasonCode, counts = {}) {
  return {
    status: 'UNKNOWN',
    effectEligibility: 'UNKNOWN',
    reasonCode,
    peerShellCount: counts.peerShellCount || 0,
    cleanupCandidateCount: counts.cleanupCandidateCount || 0,
    blockedCandidateCount: counts.blockedCandidateCount || 0,
    context: null,
  };
}

function blocked(reasonCode, counts = {}) {
  return {
    status: 'BLOCKED',
    effectEligibility: 'BLOCKED',
    reasonCode,
    peerShellCount: counts.peerShellCount || 0,
    cleanupCandidateCount: counts.cleanupCandidateCount || 0,
    blockedCandidateCount: counts.blockedCandidateCount || 0,
    context: null,
  };
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

function buildCurrentContext(rows, selfPid) {
  if (!Array.isArray(rows) || !Number.isSafeInteger(selfPid) || selfPid <= 0) {
    return {error: 'CURRENT_CONTEXT_INVALID'};
  }
  const byPid = new Map();
  for (const row of rows) {
    if (!row || !Number.isSafeInteger(row.pid) || byPid.has(row.pid)) {
      return {error: 'CURRENT_CONTEXT_INVALID'};
    }
    byPid.set(row.pid, row);
  }
  const self = byPid.get(selfPid);
  if (!self || hasAmbiguousAncestorStructure(byPid, self)) {
    return {error: 'CURRENT_CONTEXT_AMBIGUOUS'};
  }

  const chain = [self];
  const seen = new Set([self.pid]);
  let current = self;
  for (let depth = 1; depth < MAX_ANCESTOR_DEPTH && current.ppid > 0; depth += 1) {
    const parent = byPid.get(current.ppid);
    if (!parent) break;
    if (seen.has(parent.pid)) return {error: 'CURRENT_CONTEXT_AMBIGUOUS'};
    if (!sessionEvidence.validParentLink(parent, current)) break;
    seen.add(parent.pid);
    chain.push(parent);
    current = parent;
  }

  const candidates = [];
  for (let index = 1; index < chain.length; index += 1) {
    const agent = chain[index];
    const directChild = chain[index - 1];
    if (sessionEvidence.hasAgentMarker(agent)
        && sessionEvidence.SHELL_NAMES.has(directChild.name)
        && sessionEvidence.validParentLink(agent, directChild)) {
      candidates.push({agent, currentRoot: directChild});
    }
  }
  if (candidates.length !== 1) return {error: 'CURRENT_AGENT_AMBIGUOUS'};
  return {
    error: null,
    byPid,
    chain,
    chainPids: new Set(chain.map((row) => row.pid)),
    agent: candidates[0].agent,
    currentRoot: candidates[0].currentRoot,
  };
}

function sameLineageAgentPids(rows, chain, currentAgent) {
  const currentIndex = chain.findIndex((row) => row.pid === currentAgent.pid);
  if (currentIndex < 0) return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};

  const agentPids = new Set([currentAgent.pid]);
  let expectedChild = currentAgent;
  for (let index = currentIndex + 1; index < chain.length; index += 1) {
    const ancestor = chain[index];
    if (!sessionEvidence.hasAgentMarker(ancestor)) break;
    if (!sessionEvidence.validParentLink(ancestor, expectedChild)) {
      return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};
    }
    const direct = sessionEvidence.directChildrenForAgent(rows, ancestor);
    if (direct.state !== 'EXACT'
        || direct.children.filter((child) => child.pid === expectedChild.pid).length !== 1) {
      return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};
    }
    for (const child of direct.children) {
      if (child.pid === expectedChild.pid) continue;
      if (sessionEvidence.SHELL_NAMES.has(child.name)) {
        return {state: 'BLOCKED', reasonCode: 'WRAPPER_PEER_SESSION_PRESENT'};
      }
      if (sessionEvidence.BENIGN_DIRECT_CHILDREN.has(child.name)) continue;
      return {state: 'UNKNOWN', reasonCode: 'CURRENT_LINEAGE_AMBIGUOUS'};
    }
    agentPids.add(ancestor.pid);
    expectedChild = ancestor;
  }
  return {state: 'PASS', agentPids};
}

function descendantRows(rows, rootPid) {
  const childrenByParent = new Map();
  for (const row of rows) {
    if (!childrenByParent.has(row.ppid)) childrenByParent.set(row.ppid, []);
    childrenByParent.get(row.ppid).push(row);
  }
  const seen = new Set([rootPid]);
  const queue = [rootPid];
  const out = [];
  while (queue.length) {
    const pid = queue.shift();
    for (const child of childrenByParent.get(pid) || []) {
      if (seen.has(child.pid)) return {state: 'UNKNOWN', rows: []};
      seen.add(child.pid);
      out.push(child);
      queue.push(child.pid);
    }
  }
  return {state: 'EXACT', rows: out};
}

function candidateShape(rows, agent, chainPids, peer) {
  if (!sessionEvidence.SHELL_NAMES.has(peer.name)
      || !sessionEvidence.validParentLink(agent, peer)
      || chainPids.has(peer.pid)) {
    return {eligible: false, reasonCode: 'PEER_TARGET_RELATION_BLOCKED'};
  }

  const direct = rows.filter((row) => row.ppid === peer.pid);
  if (direct.some((row) => !sessionEvidence.validParentLink(peer, row))) {
    return {eligible: false, reasonCode: 'PEER_CHILD_RELATION_BLOCKED'};
  }
  const names = direct.map((row) => row.name).sort();
  if (names.length !== 2 || names[0] !== 'conhost.exe' || names[1] !== 'wsl.exe') {
    return {eligible: false, reasonCode: 'PEER_TREE_SHAPE_BLOCKED'};
  }

  const descendants = descendantRows(rows, peer.pid);
  if (descendants.state !== 'EXACT') {
    return {eligible: false, reasonCode: 'PEER_DESCENDANT_TOPOLOGY_AMBIGUOUS'};
  }
  const markerDescendant = descendants.rows.some((row) => sessionEvidence.hasAgentMarker(row));
  const unreadableAgentLike = descendants.rows.some((row) => (
    row.name === agent.name && row.commandLineReadable === false
  ));
  if (markerDescendant || unreadableAgentLike) {
    return {eligible: false, reasonCode: 'PEER_DESCENDANT_AGENT_AMBIGUOUS'};
  }
  return {eligible: true, reasonCode: 'PEER_ELIGIBLE'};
}

function guardFor(row) {
  return Object.freeze({
    pid: row.pid,
    ppid: row.ppid,
    name: row.name,
    creationTimeMs: row.creationTimeMs,
  });
}

function sameGuard(row, guard) {
  return Boolean(row
    && row.pid === guard.pid
    && row.ppid === guard.ppid
    && row.name === guard.name
    && row.creationTimeMs === guard.creationTimeMs);
}

function guardKey(guard) {
  return [guard.pid, guard.ppid, guard.name, guard.creationTimeMs].join(':');
}

function sameGuardSet(rows, guards) {
  const left = rows.map(guardFor).map(guardKey).sort();
  const right = guards.map(guardKey).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function classifyCleanupRows(rows, selfPid) {
  const sessionTopology = sessionEvidence.classifyProcessTable(rows, selfPid);
  if (sessionTopology.sessionState === 'UNKNOWN') {
    return unknown(sessionTopology.reasonCode || 'RDC_SESSION_EVIDENCE_UNKNOWN');
  }

  const current = buildCurrentContext(rows, selfPid);
  if (current.error) return unknown(current.error);

  const direct = sessionEvidence.directChildrenForAgent(rows, current.agent);
  if (direct.state !== 'EXACT'
      || direct.children.filter((row) => row.pid === current.currentRoot.pid).length !== 1) {
    return unknown('CURRENT_AGENT_DIRECT_TOPOLOGY_AMBIGUOUS');
  }

  const peers = [];
  for (const child of direct.children) {
    if (child.pid === current.currentRoot.pid) continue;
    if (sessionEvidence.SHELL_NAMES.has(child.name)) {
      peers.push(child);
      continue;
    }
    if (sessionEvidence.BENIGN_DIRECT_CHILDREN.has(child.name)) continue;
    return unknown('CURRENT_AGENT_DIRECT_TOPOLOGY_AMBIGUOUS');
  }

  const lineage = sameLineageAgentPids(rows, current.chain, current.agent);
  if (lineage.state === 'UNKNOWN') return unknown(lineage.reasonCode, {peerShellCount: peers.length});
  if (lineage.state === 'BLOCKED') return blocked(lineage.reasonCode, {peerShellCount: peers.length});

  const alternate = sessionEvidence.classifyAlternateAgents(rows, current.agent, lineage.agentPids);
  if (alternate.sessionState === 'UNKNOWN') {
    return unknown(alternate.reasonCode || 'ALTERNATE_AGENT_AMBIGUOUS', {peerShellCount: peers.length});
  }
  if (alternate.sessionState === 'PRESENT') {
    return blocked('ALTERNATE_RDC_SESSION_PRESENT', {peerShellCount: peers.length});
  }

  if (peers.length === 0) {
    if (sessionTopology.sessionState !== 'ABSENT'
        || sessionTopology.reasonCode !== 'SOLE_RDC_COMMAND_SESSION') {
      return unknown('SESSION_EVIDENCE_CLEAN_CONTRADICTION');
    }
    return {
      status: 'PASS',
      effectEligibility: 'ALREADY_CLEAN',
      reasonCode: 'SOLE_RDC_COMMAND_SESSION',
      peerShellCount: 0,
      cleanupCandidateCount: 0,
      blockedCandidateCount: 0,
      context: {
        rows,
        agent: current.agent,
        currentRoot: current.currentRoot,
        candidates: [],
      },
    };
  }

  if (sessionTopology.sessionState !== 'PRESENT'
      || sessionTopology.reasonCode !== 'OTHER_RDC_COMMAND_SESSION_PRESENT') {
    return unknown('SESSION_EVIDENCE_PRESENT_CONTRADICTION', {peerShellCount: peers.length});
  }

  const eligible = [];
  let blockedCount = 0;
  let firstBlockedReason = null;
  for (const peer of peers) {
    const shape = candidateShape(rows, current.agent, current.chainPids, peer);
    if (shape.eligible) {
      eligible.push(peer);
    } else {
      blockedCount += 1;
      if (!firstBlockedReason) firstBlockedReason = shape.reasonCode;
    }
  }
  if (blockedCount > 0) {
    return blocked(firstBlockedReason || 'PEER_TREE_SHAPE_BLOCKED', {
      peerShellCount: peers.length,
      cleanupCandidateCount: eligible.length,
      blockedCandidateCount: blockedCount,
    });
  }

  return {
    status: 'PASS',
    effectEligibility: 'ELIGIBLE',
    reasonCode: 'DIRECT_PEER_SHELLS_ELIGIBLE',
    peerShellCount: peers.length,
    cleanupCandidateCount: eligible.length,
    blockedCandidateCount: 0,
    context: {
      rows,
      agent: current.agent,
      currentRoot: current.currentRoot,
      candidates: eligible.sort((a, b) => a.pid - b.pid),
    },
  };
}

function observe({platform, arch, selfPid, runner}) {
  if (platform !== 'win32' || arch !== 'x64') {
    return {...unknown('EXECUTION_PROFILE_UNKNOWN'), rows: []};
  }
  let result;
  try {
    result = runner();
  } catch {
    return {...unknown('RDC_PROCESS_READ_FAILED'), rows: []};
  }
  if (!result || result.error || result.signal || result.code !== 0) {
    return {...unknown('RDC_PROCESS_READ_FAILED'), rows: []};
  }
  try {
    const rows = sessionEvidence.parseProcessTable(result.stdout);
    return {...classifyCleanupRows(rows, selfPid), rows};
  } catch {
    return {...unknown('RDC_PEER_CLEANUP_TOPOLOGY_UNKNOWN'), rows: []};
  }
}

function inspectLocal({
  platform = process.platform,
  arch = process.arch,
  selfPid = process.pid,
  runner = sessionEvidence.defaultRunner,
} = {}) {
  const observed = observe({platform, arch, selfPid, runner});
  return publicReceipt({
    status: observed.status,
    operation: 'inspect',
    effectEligibility: observed.effectEligibility,
    effectDisposition: 'NOT_RUN',
    peerShellCount: observed.peerShellCount,
    cleanupCandidateCount: observed.cleanupCandidateCount,
    blockedCandidateCount: observed.blockedCandidateCount,
    remainingPeerShellCount: observed.peerShellCount,
    reasonCode: observed.reasonCode,
  });
}

function defaultEffectRunner(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return {code: 127, stdout: '', stderr: '', signal: null, error: new Error('PID_INVALID')};
  }
  const result = childProcess.spawnSync(TASKKILL, ['/PID', String(pid), '/T'], {
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: EFFECT_TIMEOUT_MS,
    maxBuffer: EFFECT_MAX_BUFFER,
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

function currentIdentityMatches(observed, agentGuard, rootGuard) {
  return Boolean(observed.context
    && sameGuard(observed.context.agent, agentGuard)
    && sameGuard(observed.context.currentRoot, rootGuard));
}

function cleanupLocal({
  confirm = false,
  platform = process.platform,
  arch = process.arch,
  selfPid = process.pid,
  runner = sessionEvidence.defaultRunner,
  effectRunner = defaultEffectRunner,
} = {}) {
  if (!confirm) {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'BLOCKED',
      reasonCode: 'OPERATOR_IDLE_CONFIRMATION_REQUIRED',
    });
  }

  const initial = observe({platform, arch, selfPid, runner});
  if (initial.effectEligibility === 'ALREADY_CLEAN') {
    return publicReceipt({
      status: 'PASS',
      operation: 'cleanup',
      effectEligibility: 'ALREADY_CLEAN',
      effectDisposition: 'NO_EFFECT',
      reasonCode: 'SOLE_RDC_COMMAND_SESSION',
    });
  }
  if (initial.effectEligibility !== 'ELIGIBLE' || !initial.context) {
    return publicReceipt({
      status: initial.status,
      operation: 'cleanup',
      effectEligibility: initial.effectEligibility,
      effectDisposition: initial.status === 'UNKNOWN' ? 'UNKNOWN' : 'BLOCKED',
      peerShellCount: initial.peerShellCount,
      cleanupCandidateCount: initial.cleanupCandidateCount,
      blockedCandidateCount: initial.blockedCandidateCount,
      remainingPeerShellCount: initial.peerShellCount,
      reasonCode: initial.reasonCode,
    });
  }

  const initialPeerCount = initial.peerShellCount;
  const initialCandidateCount = initial.cleanupCandidateCount;
  const agentGuard = guardFor(initial.context.agent);
  const rootGuard = guardFor(initial.context.currentRoot);
  const candidateGuards = initial.context.candidates.map(guardFor);
  let effectCount = 0;

  for (let index = 0; index < candidateGuards.length; index += 1) {
    const guard = candidateGuards[index];
    const expectedBefore = candidateGuards.slice(index);
    const pre = observe({platform, arch, selfPid, runner});
    if (pre.effectEligibility !== 'ELIGIBLE' || !pre.context
        || !currentIdentityMatches(pre, agentGuard, rootGuard)
        || !sameGuardSet(pre.context.candidates, expectedBefore)) {
      return publicReceipt({
        status: 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: effectCount > 0 ? 'PARTIAL' : 'BLOCKED',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: pre.peerShellCount,
        reasonCode: 'TARGET_GUARD_DRIFT_BEFORE_EFFECT',
      });
    }
    const target = pre.context.candidates.find((row) => sameGuard(row, guard));
    if (!target) {
      return publicReceipt({
        status: 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: effectCount > 0 ? 'PARTIAL' : 'BLOCKED',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: pre.peerShellCount,
        reasonCode: 'TARGET_GUARD_DRIFT_BEFORE_EFFECT',
      });
    }

    let effectResult;
    try {
      effectResult = effectRunner(target.pid);
    } catch (error) {
      effectResult = {code: 127, error, signal: null};
    }

    const post = observe({platform, arch, selfPid, runner});
    const targetStillPresent = post.rows.some((row) => sameGuard(row, guard));
    if (targetStillPresent) {
      return publicReceipt({
        status: 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: effectCount > 0 ? 'PARTIAL' : 'BLOCKED',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: post.peerShellCount,
        reasonCode: (effectResult?.error || effectResult?.signal || effectResult?.code !== 0)
          ? 'TARGET_TERMINATION_UNCONFIRMED'
          : 'TARGET_STILL_PRESENT_AFTER_EFFECT',
      });
    }

    effectCount += 1;
    const expectedAfter = candidateGuards.slice(index + 1);
    if (expectedAfter.length === 0) {
      if (post.effectEligibility !== 'ALREADY_CLEAN' || !post.context
          || !currentIdentityMatches(post, agentGuard, rootGuard)) {
        return publicReceipt({
          status: 'BLOCKED',
          operation: 'cleanup',
          effectEligibility: 'BLOCKED',
          effectDisposition: 'PARTIAL',
          peerShellCount: initialPeerCount,
          cleanupCandidateCount: initialCandidateCount,
          effectCount,
          remainingPeerShellCount: post.peerShellCount,
          reasonCode: 'FINAL_SESSION_EVIDENCE_NOT_ABSENT',
        });
      }
    } else if (post.effectEligibility !== 'ELIGIBLE' || !post.context
        || !currentIdentityMatches(post, agentGuard, rootGuard)
        || !sameGuardSet(post.context.candidates, expectedAfter)) {
      return publicReceipt({
        status: 'BLOCKED',
        operation: 'cleanup',
        effectEligibility: 'BLOCKED',
        effectDisposition: 'PARTIAL',
        peerShellCount: initialPeerCount,
        cleanupCandidateCount: initialCandidateCount,
        effectCount,
        remainingPeerShellCount: post.peerShellCount,
        reasonCode: 'TOPOLOGY_DRIFT_AFTER_EFFECT',
      });
    }
  }

  const final = observe({platform, arch, selfPid, runner});
  if (final.effectEligibility !== 'ALREADY_CLEAN' || !final.context
      || !currentIdentityMatches(final, agentGuard, rootGuard)) {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'PARTIAL',
      peerShellCount: initialPeerCount,
      cleanupCandidateCount: initialCandidateCount,
      effectCount,
      remainingPeerShellCount: final.peerShellCount,
      reasonCode: 'FINAL_SESSION_EVIDENCE_NOT_ABSENT',
    });
  }

  const finalSession = sessionEvidence.classifyProcessTable(final.rows, selfPid);
  if (finalSession.sessionState !== 'ABSENT'
      || finalSession.reasonCode !== 'SOLE_RDC_COMMAND_SESSION') {
    return publicReceipt({
      status: 'BLOCKED',
      operation: 'cleanup',
      effectEligibility: 'BLOCKED',
      effectDisposition: 'PARTIAL',
      peerShellCount: initialPeerCount,
      cleanupCandidateCount: initialCandidateCount,
      effectCount,
      remainingPeerShellCount: final.peerShellCount,
      reasonCode: 'FINAL_SESSION_EVIDENCE_NOT_ABSENT',
    });
  }

  return publicReceipt({
    status: 'PASS',
    operation: 'cleanup',
    effectEligibility: 'ELIGIBLE',
    effectDisposition: 'COMPLETE',
    peerShellCount: initialPeerCount,
    cleanupCandidateCount: initialCandidateCount,
    effectCount,
    remainingPeerShellCount: 0,
    reasonCode: 'PEER_SESSION_CLEANUP_COMPLETE',
  });
}

function parseArgs(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === 'inspect') {
    return {operation: 'inspect', confirm: false};
  }
  if (argv.length === 1 && argv[0] === 'cleanup') {
    return {operation: 'cleanup', confirm: false};
  }
  if (argv.length === 2 && argv[0] === 'cleanup' && argv[1] === CONFIRM_FLAG) {
    return {operation: 'cleanup', confirm: true};
  }
  throw new Error('ARGUMENT_UNSUPPORTED');
}

function runCli(argv = process.argv.slice(2), options = {}) {
  const parsed = parseArgs(argv);
  const value = parsed.operation === 'inspect'
    ? inspectLocal(options)
    : cleanupLocal({...options, confirm: parsed.confirm});
  process.stdout.write(JSON.stringify(value) + '\n');
  if (value.status === 'PASS') return 0;
  if (value.status === 'BLOCKED') return 2;
  return 3;
}

if (require.main === module) {
  try {
    process.exitCode = runCli();
  } catch {
    process.stdout.write(JSON.stringify(publicReceipt({
      status: 'UNKNOWN',
      operation: 'UNKNOWN',
      effectEligibility: 'UNKNOWN',
      effectDisposition: 'UNKNOWN',
      reasonCode: 'ARGUMENT_UNSUPPORTED',
    })) + '\n');
    process.exitCode = 64;
  }
}

module.exports = {
  CONFIRM_FLAG,
  FALSE_AUTHORITY,
  OWNER,
  SCHEMA,
  TASKKILL,
  buildCurrentContext,
  candidateShape,
  classifyCleanupRows,
  cleanupLocal,
  defaultEffectRunner,
  descendantRows,
  guardFor,
  inspectLocal,
  parseArgs,
  publicReceipt,
  runCli,
  sameGuard,
  sameGuardSet,
  sameLineageAgentPids,
};
