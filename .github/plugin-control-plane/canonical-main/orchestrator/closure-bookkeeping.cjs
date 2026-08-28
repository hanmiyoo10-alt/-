'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {nextActionForBlock, isRepositoryNextAction} = require('../domains/next-action.cjs');

const QUEUE_ISSUE = 465;
const MEMORY_ISSUE = 462;
const AUDIT_ISSUE = 293;
const PROOF_MODE = 'CANONICAL_MAIN_PROOF_BUNDLE';
const WORK_PACKET_MARKER = '<!-- canonical-main-work-packet:v1 -->';
const AUTO_CLOSE_OPT_IN = '<!-- canonical-main-a1-standard-auto-close:v1 -->';
const QUEUE_START = '<!-- canonical-main-auto-closure:start -->';
const QUEUE_END = '<!-- canonical-main-auto-closure:end -->';
const EVIDENCE_START = '<!-- canonical-main-auto-closure-evidence:start -->';
const EVIDENCE_END = '<!-- canonical-main-auto-closure-evidence:end -->';

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function uniqueMarker(body, label) {
  const pattern = new RegExp(`^${label}:\\s*#([1-9]\\d*)\\s*$`, 'gmi');
  const rows = [...String(body || '').matchAll(pattern)];
  if (rows.length !== 1) return null;
  return Number(rows[0][1]);
}

function parsePrIdentity(body) {
  const packet = uniqueMarker(body, 'Canonical-Main-Packet');
  const design = uniqueMarker(body, 'Canonical-Main-Design');
  if (!packet || !design) return null;
  return Object.freeze({packet, design});
}

function packetId(body) {
  return String(body || '').match(/## Packet ID\s*\n([^\n]+)/)?.[1]?.trim() || null;
}

function replaceGeneratedBlock(body, start, end, nextBlock) {
  const text = String(body || '');
  const first = text.indexOf(start);
  const last = text.indexOf(end);
  if (first >= 0 && last >= first) {
    return `${text.slice(0, first)}${nextBlock}${text.slice(last + end.length)}`;
  }
  return `${text.trimEnd()}\n\n${nextBlock}\n`;
}

function parseQueue(body) {
  const text = String(body || '');
  const start = text.indexOf(QUEUE_START);
  const end = text.indexOf(QUEUE_END);
  if (start < 0 || end < start) return {valid: false};
  const block = text.slice(start, end + QUEUE_END.length);
  const state = text.match(/\*\*Queue state:\s*(ACTIVE|IDLE)\s*\/\s*CANONICAL-MAIN-V1\.2\*\*/)?.[1] || null;
  const activePacket = block.match(/Active writable packet:\s*\*\*[^\n#]*#([1-9]\d*)/)?.[1];
  const latestPacket = block.match(/Latest completed packet:\s*\*\*[^\n#]*#([1-9]\d*)/)?.[1];
  const design = block.match(/Design authority:\s*\*\*#([1-9]\d*)/)?.[1];
  const activeNone = /Active writable packet:\s*\*\*NONE\*\*/.test(block);
  return {
    valid: Boolean(state),
    state,
    activePacket: activePacket ? Number(activePacket) : null,
    latestPacket: latestPacket ? Number(latestPacket) : null,
    design: design ? Number(design) : null,
    activeNone,
  };
}

function blocked(reasonCode, detail = null) {
  const next = nextActionForBlock({reasonCode});
  if (!isRepositoryNextAction(next)) throw new Error(`non-repository NEXT for ${reasonCode}`);
  return Object.freeze({state: 'BLOCKED', reasonCode, next, detail});
}

function classifyBundle(bundle, targetSha) {
  if (!bundle || bundle.mode !== PROOF_MODE) return blocked('EVIDENCE_UNKNOWN', 'PROOF_BUNDLE_MODE_UNKNOWN');
  if (String(bundle.targetSha || '') !== String(targetSha || '')) return blocked('CONVERGENCE_STALE', 'PROOF_TARGET_MISMATCH');
  if (bundle.state !== 'COMPLETE' || !Array.isArray(bundle.missing) || bundle.missing.length > 0) {
    return blocked('EVIDENCE_UNKNOWN', Array.isArray(bundle.missing) ? bundle.missing.join(',') || 'PARTIAL' : 'PARTIAL');
  }
  const failures = Array.isArray(bundle.failures) ? bundle.failures : [];
  if (bundle.acceptanceReady !== true || failures.length > 0) {
    if (failures.some((row) => /REQUIRED|PLUGIN_CI|SIMCORE_CI|SIMCORE_VERIFY/.test(String(row)))) {
      return blocked('REQUIRED_CHECK_FAILED', failures.join(','));
    }
    if (failures.some((row) => /PRODUCTION_AUTHORITY/.test(String(row)))) {
      return blocked('PRODUCTION_AUTHORITY_MISMATCH', failures.join(','));
    }
    if (failures.some((row) => /TARGET_MISMATCH|OPS_NOT_STABLE/.test(String(row)))) {
      return blocked('CONVERGENCE_STALE', failures.join(','));
    }
    return blocked('EVIDENCE_UNKNOWN', failures.join(',') || 'ACCEPTANCE_NOT_READY');
  }
  return Object.freeze({state: 'READY', reasonCode: 'NONE', next: 'NONE', detail: null});
}

function ensurePacketEligible(issue) {
  const body = String(issue?.body || '');
  if (!body.includes(WORK_PACKET_MARKER)) return blocked('EVIDENCE_UNKNOWN', 'WORK_PACKET_MARKER_MISSING');
  if (!body.includes(AUTO_CLOSE_OPT_IN)) return blocked('EVIDENCE_UNKNOWN', 'AUTO_CLOSE_OPT_IN_MISSING');
  const state = body.match(/\*\*State:\s*([A-Z_]+)\*\*/)?.[1] || null;
  if (!state) return blocked('EVIDENCE_UNKNOWN', 'PACKET_STATE_UNKNOWN');
  if (!['ACTIVE', 'IN_PROGRESS', 'REVIEW', 'DONE'].includes(state)) return blocked('EVIDENCE_UNKNOWN', `PACKET_STATE_${state}`);
  return Object.freeze({state: 'READY', packetState: state, packetId: packetId(body)});
}

function renderEvidence(bundle, {packetNumber, designNumber, proofRunId}) {
  const head = bundle.evidence?.prHead || {};
  const merged = bundle.evidence?.mergedMain || {};
  const ops = bundle.evidence?.ops || {};
  const protection = bundle.evidence?.protection || {};
  const incidents = bundle.evidence?.incidents || {};
  return [
    EVIDENCE_START,
    '## Automatic closure evidence',
    '',
    `- packet: #${packetNumber}`,
    `- design: #${designNumber}`,
    `- target main: \`${bundle.targetSha}\``,
    `- merged PR: #${bundle.pr?.number || 'UNKNOWN'}`,
    `- final PR head: \`${bundle.pr?.headSha || 'UNKNOWN'}\``,
    `- proof workflow run: \`${proofRunId}\``,
    `- PR-head Plugin CI: run \`${head.plugin?.runId || 'UNKNOWN'}\` / \`${head.plugin?.conclusion || 'UNKNOWN'}\``,
    `- PR-head SimCore: run \`${head.simcore?.runId || 'UNKNOWN'}\` / Verify \`${head.simcore?.verify || 'UNKNOWN'}\` / Required \`${head.simcore?.required || 'UNKNOWN'}\``,
    `- merged-main SimCore: run \`${merged.runId || 'UNKNOWN'}\` / Required \`${merged.required || 'UNKNOWN'}\``,
    `- #485: SHA \`${ops.observedSha || 'UNKNOWN'}\` / STATE \`${ops.state || 'UNKNOWN'}\` / convergence \`${ops.convergence || 'UNKNOWN'}\` / Required \`${ops.requiredPass === true ? 'PASS' : 'NOT_PASS'}\` / Production \`${ops.productionMatch === true ? 'MATCH' : 'NOT_MATCH'}\` / UNKNOWN \`${ops.requiredUnknownNone === true ? 'NONE' : 'PRESENT'}\``,
    `- native protection direct read-back: protected \`${String(protection.protected)}\` / enforcement \`${protection.enforcementLevel || 'unknown'}\``,
    `- active P0/P1: \`${incidents.activeP0P1Known === true ? incidents.activeP0P1Count : 'UNKNOWN'}\``,
    `- attention P2: \`${incidents.attentionKnown === true ? incidents.attentionCount : 'UNKNOWN'}\``,
    '- bundle missing: `NONE`',
    '- bundle failures: `NONE`',
    '- proof taxonomy: `IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN / DONE`',
    '',
    '> Generated issue-only bookkeeping. Git/CI/release/production/native-protection authorities remain authoritative.',
    EVIDENCE_END,
  ].join('\n');
}

function renderPacketDone(body, bundle, context) {
  let next = String(body || '');
  if (!next.includes(WORK_PACKET_MARKER) || !next.includes(AUTO_CLOSE_OPT_IN)) throw new Error('packet not eligible for automatic closure');
  const stateMatch = next.match(/\*\*State:\s*([A-Z_]+)\*\*/);
  if (!stateMatch) throw new Error('packet state missing');
  if (stateMatch[1] !== 'DONE') next = next.replace(stateMatch[0], '**State: DONE**');
  return replaceGeneratedBlock(next, EVIDENCE_START, EVIDENCE_END, renderEvidence(bundle, context));
}

function appendCompletedSlice(body, id) {
  if (!id || !/^V12-[A-Z0-9]+$/.test(id)) return body;
  return String(body || '').replace(/(- Completed v1\.2 slices:\s*)([^\n]+)/, (all, prefix, list) => {
    const clean = list.trim().replace(/\.$/, '');
    if (clean.split(/,\s*/).includes(id)) return `${prefix}${clean}.`;
    return `${prefix}${clean}, ${id}.`;
  });
}

function renderQueueIdle(body, {packetNumber, designNumber, packetIdValue, bundle, proofRunId}) {
  const parsed = parseQueue(body);
  if (!parsed.valid) throw new Error('queue auto-closure block missing');
  if (parsed.state === 'ACTIVE') {
    if (parsed.activePacket !== packetNumber || parsed.design !== designNumber) throw new Error('queue active target mismatch');
  } else if (parsed.state === 'IDLE') {
    if (parsed.latestPacket !== packetNumber) throw new Error('queue idle target mismatch');
  }
  const block = [
    QUEUE_START,
    '- Active writable packet: **NONE**.',
    `- Latest completed packet: **${packetIdValue ? `${packetIdValue} ` : ''}#${packetNumber} — DONE / IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN**.`,
    `- Design authority: **#${designNumber}**.`,
    `- Last auto-closure proof: target \`${bundle.targetSha}\` / proof run \`${proofRunId}\`.`,
    QUEUE_END,
  ].join('\n');
  let next = replaceGeneratedBlock(body, QUEUE_START, QUEUE_END, block);
  next = next.replace(/\*\*Queue state:\s*(?:ACTIVE|IDLE)\s*\/\s*CANONICAL-MAIN-V1\.2\*\*/, '**Queue state: IDLE / CANONICAL-MAIN-V1.2**');
  next = next.replace(/- active packet:\s*#[1-9]\d*/i, '- active packet: none');
  next = next.replace(/- latest completed packet:\s*(?:#[1-9]\d*|none)/i, `- latest completed packet: #${packetNumber}`);
  next = appendCompletedSlice(next, packetIdValue);
  return next;
}

function provenanceMarker(surface, packetNumber) {
  return `<!-- canonical-main-auto-closure:v1 surface=${surface} packet=${packetNumber} -->`;
}

function renderProvenance(surface, bundle, {packetNumber, designNumber, proofRunId, packetIdValue}) {
  const marker = provenanceMarker(surface, packetNumber);
  const title = surface === 'design' ? 'V12 automatic closure progress' : surface === 'memory' ? 'Canonical-main durable memory — automatic closure' : 'Canonical-main audit — automatic closure';
  return [
    marker,
    `## ${title}`,
    '',
    `- packet: ${packetIdValue ? `\`${packetIdValue}\` ` : ''}#${packetNumber}`,
    `- design: #${designNumber}`,
    `- target: \`${bundle.targetSha}\``,
    `- merged PR: #${bundle.pr?.number || 'UNKNOWN'}`,
    `- final PR head: \`${bundle.pr?.headSha || 'UNKNOWN'}\``,
    `- proof run: \`${proofRunId}\``,
    '- A1 proof: `COMPLETE / acceptanceReady=true / missing NONE / failures NONE`',
    '- bookkeeping: packet completion + #465 ACTIVE→IDLE + design/memory/audit provenance',
    '- mutation boundary: issues only; no main/release/native-protection mutation',
    '- taxonomy: `IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN / DONE`',
  ].join('\n');
}

function blockedMarker(packetNumber) {
  return `<!-- canonical-main-auto-closure-blocked:v1 packet=${packetNumber} -->`;
}

function renderBlocked(packetNumber, targetSha, proofRunId, decision) {
  return [
    blockedMarker(packetNumber),
    '## Automatic closure bookkeeping blocked',
    '',
    `- reasonCode: \`${decision.reasonCode}\``,
    `- NEXT: \`${decision.next}\``,
    `- target: \`${targetSha || 'UNKNOWN'}\``,
    `- proof run: \`${proofRunId || 'UNKNOWN'}\``,
    `- evidence: \`${String(decision.detail || 'NONE').slice(0, 500)}\``,
    '',
    '> Packet and queue remain incomplete. No main/release/native-protection mutation was attempted.',
  ].join('\n');
}

function ghRaw(args, options = {}) {
  return execFileSync('gh', ['api', ...args], {
    encoding: options.binary ? null : 'utf8',
    maxBuffer: options.maxBuffer || 16 * 1024 * 1024,
    env: process.env,
  });
}

function ghJson(args) {
  const raw = ghRaw(args);
  const text = String(raw || '').trim();
  return text ? JSON.parse(text) : null;
}

function getIssue(repo, number) {
  return ghJson([`repos/${repo}/issues/${number}`]);
}

function patchIssue(repo, number, fields) {
  const args = ['--method', 'PATCH', `repos/${repo}/issues/${number}`];
  for (const [key, value] of Object.entries(fields)) {
    args.push('-f', `${key}=${value}`);
  }
  return ghJson(args);
}

function listComments(repo, issueNumber) {
  const rows = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = ghJson([`repos/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`]) || [];
    rows.push(...batch);
    if (!Array.isArray(batch) || batch.length < 100) break;
  }
  return rows;
}

function upsertComment(repo, issueNumber, marker, body) {
  const existing = listComments(repo, issueNumber).find((row) => String(row.body || '').includes(marker));
  if (existing) {
    if (String(existing.body || '') === body) return {changed: false, id: existing.id};
    const updated = ghJson(['--method', 'PATCH', `repos/${repo}/issues/comments/${existing.id}`, '-f', `body=${body}`]);
    return {changed: true, id: updated?.id || existing.id};
  }
  const created = ghJson(['--method', 'POST', `repos/${repo}/issues/${issueNumber}/comments`, '-f', `body=${body}`]);
  return {changed: true, id: created?.id || null};
}

function associatedMergedPr(repo, targetSha) {
  const rows = ghJson(['-H', 'Accept: application/vnd.github+json', `repos/${repo}/commits/${targetSha}/pulls?per_page=100`]) || [];
  if (!Array.isArray(rows)) return null;
  const exact = rows.find((row) => row.merged_at && row.merge_commit_sha === targetSha && row.base?.ref === 'main');
  return exact || null;
}

function artifactBundle(repo, proofRunId, targetSha) {
  const payload = ghJson([`repos/${repo}/actions/runs/${proofRunId}/artifacts?per_page=100`]) || {};
  const expected = `canonical-main-proof-bundle-${targetSha}`;
  const rows = (payload.artifacts || []).filter((row) => row.name === expected && row.expired !== true);
  if (rows.length !== 1) return {bundle: null, error: `PROOF_ARTIFACT_COUNT_${rows.length}`};
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'canonical-main-closure-'));
  try {
    const zip = path.join(dir, 'proof.zip');
    fs.writeFileSync(zip, ghRaw([`repos/${repo}/actions/artifacts/${rows[0].id}/zip`], {binary: true, maxBuffer: 32 * 1024 * 1024}));
    const json = execFileSync('unzip', ['-p', zip, 'canonical-main-proof-bundle.json'], {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024});
    return {bundle: JSON.parse(json), artifactId: rows[0].id, error: null};
  } catch (error) {
    return {bundle: null, error: `PROOF_ARTIFACT_READ_FAILED:${error.message}`};
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

function queueDisposition(queue, identity) {
  if (!queue.valid) return blocked('EVIDENCE_UNKNOWN', 'QUEUE_MARKER_UNKNOWN');
  if (queue.state === 'ACTIVE') {
    if (queue.activePacket !== identity.packet || queue.design !== identity.design) return blocked('PACKET_SCOPE_OVERLAP', 'QUEUE_ACTIVE_TARGET_MISMATCH');
    return {state: 'READY'};
  }
  if (queue.state === 'IDLE' && queue.latestPacket === identity.packet && queue.design === identity.design) return {state: 'IDEMPOTENT'};
  return blocked('PACKET_SCOPE_OVERLAP', 'QUEUE_NOT_OWNED_BY_PACKET');
}

function appendSummary(line) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

function run() {
  const repo = String(process.env.GITHUB_REPOSITORY || '').trim();
  const targetSha = String(process.env.PROOF_TARGET_SHA || '').trim();
  const proofRunId = integer(process.env.PROOF_RUN_ID);
  const proofConclusion = String(process.env.PROOF_RUN_CONCLUSION || '').trim();
  if (!repo || !targetSha || !proofRunId || !process.env.GH_TOKEN) throw new Error('closure-bookkeeping missing required environment');

  const queueIssue = getIssue(repo, QUEUE_ISSUE);
  const queue = parseQueue(queueIssue?.body);
  if (queue.valid && queue.state === 'IDLE' && queue.activeNone) {
    console.log('CANONICAL_MAIN_AUTO_CLOSURE:NO_ACTIVE_PACKET');
    appendSummary('AUTO_CLOSURE=NO_ACTIVE_PACKET');
    return;
  }

  const pr = associatedMergedPr(repo, targetSha);
  if (!pr) {
    console.log('CANONICAL_MAIN_AUTO_CLOSURE:IGNORED_NO_ASSOCIATED_PR');
    appendSummary('AUTO_CLOSURE=IGNORED_NO_ASSOCIATED_PR');
    return;
  }
  const identity = parsePrIdentity(pr.body);
  if (!identity) {
    console.log(`CANONICAL_MAIN_AUTO_CLOSURE:IGNORED_PR_WITHOUT_EXPLICIT_MARKERS:#${pr.number}`);
    appendSummary(`AUTO_CLOSURE=IGNORED_PR_WITHOUT_EXPLICIT_MARKERS pr=${pr.number}`);
    return;
  }

  const qDecision = queueDisposition(queue, identity);
  if (qDecision.state === 'BLOCKED') {
    const targetPacket = queue.activePacket || identity.packet;
    upsertComment(repo, targetPacket, blockedMarker(targetPacket), renderBlocked(targetPacket, targetSha, proofRunId, qDecision));
    console.log(`CANONICAL_MAIN_AUTO_CLOSURE:BLOCKED:${qDecision.reasonCode}:next=${qDecision.next}`);
    appendSummary(`AUTO_CLOSURE=BLOCKED reason=${qDecision.reasonCode} next=${qDecision.next}`);
    return;
  }

  if (proofConclusion !== 'success') {
    const decision = blocked('EVIDENCE_UNKNOWN', `PROOF_WORKFLOW_${proofConclusion || 'UNKNOWN'}`);
    upsertComment(repo, identity.packet, blockedMarker(identity.packet), renderBlocked(identity.packet, targetSha, proofRunId, decision));
    console.log(`CANONICAL_MAIN_AUTO_CLOSURE:BLOCKED:${decision.reasonCode}:next=${decision.next}`);
    appendSummary(`AUTO_CLOSURE=BLOCKED reason=${decision.reasonCode} next=${decision.next}`);
    return;
  }

  const loaded = artifactBundle(repo, proofRunId, targetSha);
  if (!loaded.bundle) {
    const decision = blocked('EVIDENCE_UNKNOWN', loaded.error);
    upsertComment(repo, identity.packet, blockedMarker(identity.packet), renderBlocked(identity.packet, targetSha, proofRunId, decision));
    console.log(`CANONICAL_MAIN_AUTO_CLOSURE:BLOCKED:${decision.reasonCode}:next=${decision.next}`);
    appendSummary(`AUTO_CLOSURE=BLOCKED reason=${decision.reasonCode} next=${decision.next}`);
    return;
  }

  const proofDecision = classifyBundle(loaded.bundle, targetSha);
  if (proofDecision.state !== 'READY') {
    upsertComment(repo, identity.packet, blockedMarker(identity.packet), renderBlocked(identity.packet, targetSha, proofRunId, proofDecision));
    console.log(`CANONICAL_MAIN_AUTO_CLOSURE:BLOCKED:${proofDecision.reasonCode}:next=${proofDecision.next}`);
    appendSummary(`AUTO_CLOSURE=BLOCKED reason=${proofDecision.reasonCode} next=${proofDecision.next}`);
    return;
  }

  const packet = getIssue(repo, identity.packet);
  const eligible = ensurePacketEligible(packet);
  if (eligible.state !== 'READY') {
    upsertComment(repo, identity.packet, blockedMarker(identity.packet), renderBlocked(identity.packet, targetSha, proofRunId, eligible));
    console.log(`CANONICAL_MAIN_AUTO_CLOSURE:BLOCKED:${eligible.reasonCode}:next=${eligible.next}`);
    appendSummary(`AUTO_CLOSURE=BLOCKED reason=${eligible.reasonCode} next=${eligible.next}`);
    return;
  }

  const context = {
    packetNumber: identity.packet,
    designNumber: identity.design,
    proofRunId,
    packetIdValue: eligible.packetId,
  };
  const nextPacketBody = renderPacketDone(packet.body, loaded.bundle, context);
  const freshQueue = getIssue(repo, QUEUE_ISSUE);
  if (String(freshQueue?.updated_at || '') !== String(queueIssue?.updated_at || '')) {
    const decision = blocked('PACKET_SCOPE_OVERLAP', 'QUEUE_CHANGED_DURING_PREFLIGHT');
    upsertComment(repo, identity.packet, blockedMarker(identity.packet), renderBlocked(identity.packet, targetSha, proofRunId, decision));
    console.log(`CANONICAL_MAIN_AUTO_CLOSURE:BLOCKED:${decision.reasonCode}:next=${decision.next}`);
    appendSummary(`AUTO_CLOSURE=BLOCKED reason=${decision.reasonCode} next=${decision.next}`);
    return;
  }
  const nextQueueBody = renderQueueIdle(freshQueue.body, {...context, bundle: loaded.bundle});

  const packetAlreadyDone = eligible.packetState === 'DONE' && packet.state === 'closed' && String(packet.body || '').includes(EVIDENCE_START);
  const queueAlreadyIdle = parseQueue(freshQueue.body).state === 'IDLE' && parseQueue(freshQueue.body).latestPacket === identity.packet;

  let packetMutated = false;
  try {
    if (!packetAlreadyDone) {
      patchIssue(repo, identity.packet, {body: nextPacketBody, state: 'closed', state_reason: 'completed'});
      packetMutated = true;
    }
    if (!queueAlreadyIdle && nextQueueBody !== freshQueue.body) {
      patchIssue(repo, QUEUE_ISSUE, {body: nextQueueBody});
    }
  } catch (error) {
    if (packetMutated) {
      try {
        patchIssue(repo, identity.packet, {body: packet.body, state: packet.state === 'closed' ? 'closed' : 'open', state_reason: packet.state === 'closed' ? 'completed' : 'reopened'});
      } catch (rollbackError) {
        console.error(`closure rollback failed: ${rollbackError.message}`);
      }
    }
    throw error;
  }

  upsertComment(repo, identity.design, provenanceMarker('design', identity.packet), renderProvenance('design', loaded.bundle, context));
  upsertComment(repo, MEMORY_ISSUE, provenanceMarker('memory', identity.packet), renderProvenance('memory', loaded.bundle, context));
  upsertComment(repo, AUDIT_ISSUE, provenanceMarker('audit', identity.packet), renderProvenance('audit', loaded.bundle, context));

  console.log(`CANONICAL_MAIN_AUTO_CLOSURE:DONE:packet=${identity.packet}:target=${targetSha}:artifact=${loaded.artifactId}`);
  appendSummary(`AUTO_CLOSURE=DONE packet=${identity.packet} target=${targetSha} proofRun=${proofRunId} artifact=${loaded.artifactId}`);
}

if (require.main === module) run();

module.exports = {
  AUDIT_ISSUE,
  AUTO_CLOSE_OPT_IN,
  EVIDENCE_END,
  EVIDENCE_START,
  MEMORY_ISSUE,
  PROOF_MODE,
  QUEUE_END,
  QUEUE_ISSUE,
  QUEUE_START,
  WORK_PACKET_MARKER,
  appendCompletedSlice,
  blocked,
  classifyBundle,
  ensurePacketEligible,
  packetId,
  parsePrIdentity,
  parseQueue,
  provenanceMarker,
  queueDisposition,
  renderBlocked,
  renderEvidence,
  renderPacketDone,
  renderProvenance,
  renderQueueIdle,
  replaceGeneratedBlock,
};
