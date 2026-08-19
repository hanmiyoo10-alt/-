from pathlib import Path

LATEST = Path("plugins/simcore/latest.js")
INSTALL = Path("plugins/simcore/install.js")

s = LATEST.read_text(encoding="utf-8")

def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label} anchor count={count}")
    s = s.replace(old, new, 1)

replace_once("//@version 0.63.46", "//@version 0.63.47", "metadata version")
replace_once(
    "// v0.63.46 Prompt Prefix Stabilization:",
    '''// v0.63.47 History Alignment Stabilization:
// - Replaces v0.63.46's exact current-user body gate with a bounded conversation-spine alignment over the final request and authoritative raw-chat tail, because real long-chat validation showed CURRENT_USER_MISMATCH across C/B_START/B_CONTINUE/B_END while request-only repair stayed safely inactive
// - Requires one unique tail alignment, matching user/assistant role order and at least two exact substantial historical assistant calibrators; user text equality is telemetry only, so host-side user projection differences no longer block entry by themselves
// - Keeps the repair target intentionally unchanged at the repeatedly verified compact assistant signature `assistant/text 21:4a852496`; mapped raw assistants are reduced to their canonical `# 응답` envelope before request-only replacement, and ambiguous/insufficient/unsafe mappings fail open
// - Adds explicit History alignment telemetry (RESOLVED_UNIQUE / NOT_NEEDED / SKIPPED reason, bounded spine sizes, candidate count, exact-user anchors, assistant calibrators and spine offset) while retaining History stabilization APPLIED/NOOP/SKIPPED telemetry
// - Repair boundary only: no visible/persistent chat write, no raw-body persistence, no network/timer/storage schema change, and Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence/Structure/Recovery/Deferred Mirror/compiler tiers/TAIL_AFTER_CURRENT_USER/provider-cache policy remain frozen
//
// v0.63.46 Prompt Prefix Stabilization:''',
    "release notes",
)
replace_once(
    "const SIMCORE_RUNTIME_VERSION = '0.63.46';",
    "const SIMCORE_RUNTIME_VERSION = '0.63.47';",
    "runtime version",
)

replace_once(
    '''  const HISTORY_STABILIZATION_MAX_SLOTS = 12;
  const HISTORY_STABILIZATION_MIN_RAW_CHARS = 128;
  const HISTORY_STABILIZATION_MAX_RAW_CHARS = 100000;''',
    '''  const HISTORY_STABILIZATION_MAX_SLOTS = 12;
  const HISTORY_STABILIZATION_MIN_RAW_CHARS = 128;
  const HISTORY_STABILIZATION_MAX_RAW_CHARS = 100000;
  const HISTORY_ALIGNMENT_REQUEST_SPINE_LIMIT = 48;
  const HISTORY_ALIGNMENT_RAW_SPINE_LIMIT = 64;
  const HISTORY_ALIGNMENT_MIN_CALIBRATORS = 2;''',
    "alignment constants",
)

old_result = '''      userAnchors: Number(d.userAnchors || 0),
      assistantCalibrators: Number(d.assistantCalibrators || 0),
      addedChars: Number(d.addedChars || 0),
      persistentMutation: 'NONE','''
new_result = '''      userAnchors: Number(d.userAnchors || 0),
      assistantCalibrators: Number(d.assistantCalibrators || 0),
      alignmentStatus: String(d.alignmentStatus || 'n/a'),
      requestSpine: Number(d.requestSpine || 0),
      hostSpine: Number(d.hostSpine || 0),
      alignmentCandidates: Number(d.alignmentCandidates || 0),
      spineOffset: Number.isInteger(Number(d.spineOffset)) ? Number(d.spineOffset) : null,
      addedChars: Number(d.addedChars || 0),
      persistentMutation: 'NONE','''
replace_once(old_result, new_result, "stabilization result fields")

start = s.find("  function stabilizeHistoryProjection(messages, rawMessages, sendIndex) {")
end = s.find("  function correlateHistoryMutation(topologyProbe, ledger) {", start)
if start < 0 or end < 0 or end <= start:
    raise SystemExit("stabilizeHistoryProjection function boundary missing")

new_func = r'''  function stabilizationCanonicalAssistantText(message) {
    const rawText = String(textMessageContent(message) || '').replace(/\r\n/g, '\n').trim();
    if (!rawText) return '';
    const match = /(?:^|\n)# 응답(?:\n|$)/.exec(rawText);
    if (!match) return '';
    const start = Number(match.index || 0) + (match[0].startsWith('\n') ? 1 : 0);
    return rawText.slice(start).trim();
  }

  function buildStabilizationSpine(messages, endIndex, limit) {
    const source = Array.isArray(messages) ? messages : [];
    const out = [];
    const end = Math.min(Number(endIndex), source.length - 1);
    for (let i = end; i >= 0 && out.length < Math.max(1, Number(limit) || 1); i -= 1) {
      const role = stabilizationConversationRole(source[i]);
      if (!role) continue;
      const rawComparable = role === 'assistant' ? stabilizationCanonicalAssistantText(source[i]) : '';
      out.push(Object.freeze({
        index: i,
        role,
        text: stabilizationComparableText(source[i]),
        assistantComparable: rawComparable || stabilizationComparableText(source[i]),
        compact: role === 'assistant' && isKnownCompactAssistant(source[i]),
      }));
    }
    return out.reverse();
  }

  function stabilizeHistoryProjection(messages, rawMessages, sendIndex) {
    const started = perfNow();
    const request = Array.isArray(messages) ? messages : [];
    const raw = Array.isArray(rawMessages) ? rawMessages : [];
    const rawUserIndex = Number(sendIndex);
    if (!request.length || !raw.length || !Number.isInteger(rawUserIndex) || rawUserIndex < 0 || rawUserIndex >= raw.length) {
      return stabilizationResult('SKIPPED_NO_CONTEXT', { alignmentStatus: 'NO_CONTEXT' }, started);
    }

    let currentRequestUser = -1;
    for (let i = request.length - 1; i >= 0; i -= 1) {
      if (stabilizationConversationRole(request[i]) === 'user') { currentRequestUser = i; break; }
    }
    if (currentRequestUser < 0 || stabilizationConversationRole(raw[rawUserIndex]) !== 'user') {
      return stabilizationResult('SKIPPED_CURRENT_USER', { alignmentStatus: 'NO_CURRENT_USER' }, started);
    }

    const requestSpine = buildStabilizationSpine(request, currentRequestUser, HISTORY_ALIGNMENT_REQUEST_SPINE_LIMIT);
    const rawSpine = buildStabilizationSpine(raw, rawUserIndex, HISTORY_ALIGNMENT_RAW_SPINE_LIMIT);
    const commonDetail = {
      requestSpine: requestSpine.length,
      hostSpine: rawSpine.length,
    };

    const targetPositions = [];
    for (let i = 0; i < requestSpine.length; i += 1) {
      if (requestSpine[i].compact) targetPositions.push(i);
    }
    if (!targetPositions.length) {
      return stabilizationResult('NOOP_NO_KNOWN_COMPACT', {
        ...commonDetail,
        alignmentStatus: 'NOT_NEEDED',
      }, started);
    }
    if (targetPositions.length > HISTORY_STABILIZATION_MAX_SLOTS) {
      return stabilizationResult('SKIPPED_TOO_MANY_COMPACT', {
        ...commonDetail,
        alignmentStatus: 'TOO_MANY_TARGETS',
        candidates: targetPositions.length,
      }, started);
    }

    const rawByAssistant = new Map();
    for (let i = 0; i < rawSpine.length; i += 1) {
      const item = rawSpine[i];
      if (item.role !== 'assistant') continue;
      const text = String(item.assistantComparable || '');
      if (text.length < HISTORY_STABILIZATION_MIN_RAW_CHARS) continue;
      if (!rawByAssistant.has(text)) rawByAssistant.set(text, []);
      rawByAssistant.get(text).push(i);
    }

    const candidateOffsets = new Set();
    for (let i = 0; i < requestSpine.length; i += 1) {
      const item = requestSpine[i];
      if (item.role !== 'assistant' || item.compact) continue;
      const text = String(item.text || '');
      if (text.length < HISTORY_STABILIZATION_MIN_RAW_CHARS) continue;
      const matches = rawByAssistant.get(text) || [];
      for (const rawPos of matches) {
        const offset = rawPos - i;
        if ((requestSpine.length - 1 + offset) === (rawSpine.length - 1)) candidateOffsets.add(offset);
      }
    }

    if (!candidateOffsets.size) {
      return stabilizationResult('SKIPPED_INSUFFICIENT_CALIBRATORS', {
        ...commonDetail,
        alignmentStatus: 'NO_CANDIDATE',
        candidates: targetPositions.length,
        alignmentCandidates: 0,
      }, started);
    }

    const oldestTarget = targetPositions[0];
    const valid = [];
    for (const offset of candidateOffsets) {
      let roleMismatch = false;
      let userAnchors = 0;
      let assistantCalibrators = 0;
      const mapped = new Map();

      for (let requestPos = oldestTarget; requestPos < requestSpine.length; requestPos += 1) {
        const rawPos = requestPos + offset;
        if (rawPos < 0 || rawPos >= rawSpine.length) { roleMismatch = true; break; }
        const reqItem = requestSpine[requestPos];
        const rawItem = rawSpine[rawPos];
        if (reqItem.role !== rawItem.role) { roleMismatch = true; break; }

        if (reqItem.role === 'user') {
          if (String(reqItem.text || '') === String(rawItem.text || '')) userAnchors += 1;
        } else if (reqItem.compact) {
          mapped.set(requestPos, rawPos);
        } else {
          const requestText = String(reqItem.text || '');
          const rawText = String(rawItem.assistantComparable || '');
          if (requestText.length >= HISTORY_STABILIZATION_MIN_RAW_CHARS && requestText === rawText) assistantCalibrators += 1;
        }
      }

      if (roleMismatch) continue;
      if (mapped.size !== targetPositions.length) continue;
      if (assistantCalibrators < HISTORY_ALIGNMENT_MIN_CALIBRATORS) continue;
      valid.push(Object.freeze({ offset, userAnchors, assistantCalibrators, mapped }));
    }

    if (!valid.length) {
      return stabilizationResult('SKIPPED_INSUFFICIENT_CALIBRATORS', {
        ...commonDetail,
        alignmentStatus: 'UNVERIFIED',
        candidates: targetPositions.length,
        alignmentCandidates: candidateOffsets.size,
      }, started);
    }
    if (valid.length !== 1) {
      return stabilizationResult('SKIPPED_AMBIGUOUS_ALIGNMENT', {
        ...commonDetail,
        alignmentStatus: 'AMBIGUOUS',
        candidates: targetPositions.length,
        alignmentCandidates: valid.length,
      }, started);
    }

    const alignment = valid[0];
    const replacements = [];
    for (const requestPos of targetPositions) {
      const requestSlot = requestSpine[requestPos].index;
      const rawPos = alignment.mapped.get(requestPos);
      const rawSlot = rawSpine[rawPos]?.index;
      if (!Number.isInteger(rawSlot)) {
        return stabilizationResult('SKIPPED_INCOMPLETE_ALIGNMENT', {
          ...commonDetail,
          alignmentStatus: 'INCOMPLETE',
          candidates: targetPositions.length,
          alignmentCandidates: 1,
          userAnchors: alignment.userAnchors,
          assistantCalibrators: alignment.assistantCalibrators,
          spineOffset: alignment.offset,
        }, started);
      }
      const canonicalRaw = stabilizationCanonicalAssistantText(raw[rawSlot]);
      if (canonicalRaw.length < HISTORY_STABILIZATION_MIN_RAW_CHARS
          || canonicalRaw.length > HISTORY_STABILIZATION_MAX_RAW_CHARS
          || !canonicalRaw.startsWith('# 응답')) {
        return stabilizationResult('SKIPPED_UNSAFE_RAW_CANDIDATE', {
          ...commonDetail,
          alignmentStatus: 'RESOLVED_UNIQUE',
          candidates: targetPositions.length,
          alignmentCandidates: 1,
          userAnchors: alignment.userAnchors,
          assistantCalibrators: alignment.assistantCalibrators,
          spineOffset: alignment.offset,
        }, started);
      }
      const slot = request[requestSlot];
      if (!slot || typeof slot.content !== 'string') {
        return stabilizationResult('SKIPPED_NONSTRING_SLOT', {
          ...commonDetail,
          alignmentStatus: 'RESOLVED_UNIQUE',
          candidates: targetPositions.length,
          alignmentCandidates: 1,
          userAnchors: alignment.userAnchors,
          assistantCalibrators: alignment.assistantCalibrators,
          spineOffset: alignment.offset,
        }, started);
      }
      replacements.push({ requestSlot, canonicalRaw, beforeChars: String(slot.content || '').length });
    }

    let addedChars = 0;
    for (const replacement of replacements) {
      const slot = request[replacement.requestSlot];
      slot.content = replacement.canonicalRaw;
      addedChars += replacement.canonicalRaw.length - replacement.beforeChars;
    }

    return stabilizationResult('APPLIED', {
      ...commonDetail,
      source: 'HOST_RAW_CANONICAL_ENVELOPE',
      alignmentStatus: 'RESOLVED_UNIQUE',
      candidates: targetPositions.length,
      applied: replacements.length,
      firstIndex: replacements[0]?.requestSlot,
      lastIndex: replacements[replacements.length - 1]?.requestSlot,
      userAnchors: alignment.userAnchors,
      assistantCalibrators: alignment.assistantCalibrators,
      alignmentCandidates: 1,
      spineOffset: alignment.offset,
      addedChars,
    }, started);
  }

'''
s = s[:start] + new_func + s[end:]

fmt_start = s.find("function historyStabilization(probe) {")
fmt_end = s.find("function representationCorrelation(probe) {", fmt_start)
if fmt_start < 0 or fmt_end < 0 or fmt_end <= fmt_start:
    raise SystemExit("historyStabilization formatter boundary missing")
new_fmt = r'''function historyAlignment(probe) {
  if (!probe) return 'n/a';
  const offset = probe.spineOffset == null ? 'n/a' : `${Number(probe.spineOffset) >= 0 ? '+' : ''}${Number(probe.spineOffset)}`;
  return `${probe.alignmentStatus || 'n/a'} · request spine ${Number(probe.requestSpine || 0)} · host spine ${Number(probe.hostSpine || 0)} · candidates ${Number(probe.alignmentCandidates || 0)} · anchors ${Number(probe.userAnchors || 0)} · calibrators ${Number(probe.assistantCalibrators || 0)} · offset ${offset}`;
}
function historyStabilization(probe) {
  if (!probe) return 'n/a';
  const range = probe.firstIndex == null ? 'n/a' : (probe.firstIndex === probe.lastIndex ? `@${Number(probe.firstIndex)}` : `@${Number(probe.firstIndex)}..@${Number(probe.lastIndex)}`);
  const delta = Number(probe.addedChars || 0);
  return `${probe.status || 'n/a'} · slots ${Number(probe.applied || 0)}/${Number(probe.candidates || 0)} · range ${range} · source ${probe.source || 'n/a'} · anchors ${Number(probe.userAnchors || 0)} · calibrators ${Number(probe.assistantCalibrators || 0)} · Δchars ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} · persistent ${probe.persistentMutation || 'NONE'} · cost ${Number(probe.costMs || 0).toFixed(1)} ms`;
}
'''
s = s[:fmt_start] + new_fmt + s[fmt_end:]

replace_once(
    "module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, historyMutation, historyStabilization, representationCorrelation, mutationAttribution, reconcileFrontier, rebuildAttribution, repeatedBreak, frontierMovement, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };",
    "module.exports = { cachePosture, cadence, topology, cacheIntegrity, breakInfo, historyMutation, historyAlignment, historyStabilization, representationCorrelation, mutationAttribution, reconcileFrontier, rebuildAttribution, repeatedBreak, frontierMovement, exposure, runtimeIdentity, simcoreContribution, trajectory, continuity, representation };",
    "probe export",
)

replace_once(
    "      `History mutation: ${probeFresh ? runtimeProbeRules.historyMutation(topologyProbe) : 'n/a'}`,\n      `History stabilization: ${probeFresh ? runtimeProbeRules.historyStabilization(lastHistoryStabilizationProbe) : 'n/a'}` ,".replace("}` ,", "}`,"),
    "      `History mutation: ${probeFresh ? runtimeProbeRules.historyMutation(topologyProbe) : 'n/a'}`,\n      `History alignment: ${probeFresh ? runtimeProbeRules.historyAlignment(lastHistoryStabilizationProbe) : 'n/a'}`,\n      `History stabilization: ${probeFresh ? runtimeProbeRules.historyStabilization(lastHistoryStabilizationProbe) : 'n/a'}` ,".replace("}` ,", "}`,"),
    "diagnostic alignment line",
)

if "SKIPPED_CURRENT_USER_MISMATCH" in s:
    raise SystemExit("obsolete current-user exact-match gate still present")
if "History alignment:" not in s:
    raise SystemExit("History alignment diagnostic missing")
if "HISTORY_ALIGNMENT_MIN_CALIBRATORS = 2" not in s:
    raise SystemExit("alignment calibrator gate missing")
if "HOST_RAW_CANONICAL_ENVELOPE" not in s:
    raise SystemExit("canonical envelope source missing")

LATEST.write_text(s, encoding="utf-8")
INSTALL.write_text(s, encoding="utf-8")
