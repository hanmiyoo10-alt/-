from pathlib import Path
import re

LATEST = Path("plugins/simcore/latest.js")
INSTALL = Path("plugins/simcore/install.js")

s = LATEST.read_text(encoding="utf-8")

def replace_once(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, got {count}")
    s = s.replace(old, new, 1)

replace_once("//@version 0.63.47", "//@version 0.63.48", "metadata version")
replace_once("const SIMCORE_RUNTIME_VERSION = '0.63.47';", "const SIMCORE_RUNTIME_VERSION = '0.63.48';", "runtime version")

anchor = "// v0.63.47 History Alignment Stabilization:\n"
release_notes = """// v0.63.48 History Turn-Ordinal Alignment:\n// - Replaces v0.63.47's body/calibrator-derived alignment candidate search after real long-chat validation produced NO_CANDIDATE with zero assistant calibrators across C/B_START/B_CONTINUE/B_END while the compact assistant frontier still advanced @16→@18→@20\n// - Anchors the request conversation spine to the authoritative raw-chat current user already identified by sendIndex, then maps the bounded suffix backward by conversation ordinal; current-user and historical assistant body equality are explicitly not required for alignment\n// - Requires the endpoint-aligned user/assistant role sequence to match across the entire bounded request spine; any missing/inserted conversational role, short raw suffix, unmappable compact target, or unsafe raw assistant fails open without request mutation\n// - Keeps the repair target frozen at assistant/text 21:4a852496 and still replaces only with a bounded canonical # 응답 envelope from the mapped raw assistant; no visible/persistent chat write or raw-body persistence is added\n// - Adds turn-ordinal alignment telemetry (SEND_INDEX endpoint, role matches, mapped targets, fixed suffix offset, body equality NOT_REQUIRED) while keeping provider-cache status UNVERIFIED and all non-alignment runtime semantics frozen\n//\n"""
replace_once(anchor, release_notes + anchor, "release notes anchor")

replace_once(
    "  const HISTORY_ALIGNMENT_MIN_CALIBRATORS = 2;\n",
    "  const HISTORY_ALIGNMENT_ENDPOINT = 'SEND_INDEX';\n",
    "alignment constant",
)

old_probe = """function historyAlignment(probe) {\n  if (!probe) return 'n/a';\n  const offset = probe.spineOffset == null ? 'n/a' : `${Number(probe.spineOffset) >= 0 ? '+' : ''}${Number(probe.spineOffset)}`;\n  return `${probe.alignmentStatus || 'n/a'} · request spine ${Number(probe.requestSpine || 0)} · host spine ${Number(probe.hostSpine || 0)} · candidates ${Number(probe.alignmentCandidates || 0)} · anchors ${Number(probe.userAnchors || 0)} · calibrators ${Number(probe.assistantCalibrators || 0)} · offset ${offset}`;\n}\nfunction historyStabilization(probe) {\n  if (!probe) return 'n/a';\n  const range = probe.firstIndex == null ? 'n/a' : (probe.firstIndex === probe.lastIndex ? `@${Number(probe.firstIndex)}` : `@${Number(probe.firstIndex)}..@${Number(probe.lastIndex)}`);\n  const delta = Number(probe.addedChars || 0);\n  return `${probe.status || 'n/a'} · slots ${Number(probe.applied || 0)}/${Number(probe.candidates || 0)} · range ${range} · source ${probe.source || 'n/a'} · anchors ${Number(probe.userAnchors || 0)} · calibrators ${Number(probe.assistantCalibrators || 0)} · Δchars ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} · persistent ${probe.persistentMutation || 'NONE'} · cost ${Number(probe.costMs || 0).toFixed(1)} ms`;\n}\n"""
new_probe = """function historyAlignment(probe) {\n  if (!probe) return 'n/a';\n  const offset = probe.spineOffset == null ? 'n/a' : `${Number(probe.spineOffset) >= 0 ? '+' : ''}${Number(probe.spineOffset)}`;\n  const roleMatches = `${Number(probe.roleMatches || 0)}/${Number(probe.roleExpected || 0)}`;\n  return `${probe.alignmentStatus || 'n/a'} · request spine ${Number(probe.requestSpine || 0)} · host spine ${Number(probe.hostSpine || 0)} · endpoint ${probe.endpointSource || 'n/a'} · role matches ${roleMatches} · targets ${Number(probe.mappedTargets || 0)}/${Number(probe.candidates || 0)} · offset ${offset} · body equality ${probe.bodyEquality || 'n/a'}`;\n}\nfunction historyStabilization(probe) {\n  if (!probe) return 'n/a';\n  const range = probe.firstIndex == null ? 'n/a' : (probe.firstIndex === probe.lastIndex ? `@${Number(probe.firstIndex)}` : `@${Number(probe.firstIndex)}..@${Number(probe.lastIndex)}`);\n  const delta = Number(probe.addedChars || 0);\n  return `${probe.status || 'n/a'} · slots ${Number(probe.applied || 0)}/${Number(probe.candidates || 0)} · range ${range} · source ${probe.source || 'n/a'} · mapped ${Number(probe.mappedTargets || 0)}/${Number(probe.candidates || 0)} · Δchars ${delta >= 0 ? '+' : ''}${delta.toLocaleString('en-US')} · persistent ${probe.persistentMutation || 'NONE'} · cost ${Number(probe.costMs || 0).toFixed(1)} ms`;\n}\n"""
replace_once(old_probe, new_probe, "runtime probe formatter")

old_result = """  function stabilizationResult(status, detail = null, started = null) {\n    const d = detail && typeof detail === 'object' ? detail : {};\n    return Object.freeze({\n      status: String(status || 'n/a'),\n      source: String(d.source || 'HOST_RAW_ALIGNED_SUFFIX'),\n      candidates: Number(d.candidates || 0),\n      applied: Number(d.applied || 0),\n      firstIndex: Number.isInteger(Number(d.firstIndex)) ? Number(d.firstIndex) : null,\n      lastIndex: Number.isInteger(Number(d.lastIndex)) ? Number(d.lastIndex) : null,\n      userAnchors: Number(d.userAnchors || 0),\n      assistantCalibrators: Number(d.assistantCalibrators || 0),\n      alignmentStatus: String(d.alignmentStatus || 'n/a'),\n      requestSpine: Number(d.requestSpine || 0),\n      hostSpine: Number(d.hostSpine || 0),\n      alignmentCandidates: Number(d.alignmentCandidates || 0),\n      spineOffset: Number.isInteger(Number(d.spineOffset)) ? Number(d.spineOffset) : null,\n      addedChars: Number(d.addedChars || 0),\n      persistentMutation: 'NONE',\n      costMs: started == null ? Number(d.costMs || 0) : perfMs(started),\n    });\n  }\n"""
new_result = """  function stabilizationResult(status, detail = null, started = null) {\n    const d = detail && typeof detail === 'object' ? detail : {};\n    return Object.freeze({\n      status: String(status || 'n/a'),\n      source: String(d.source || 'HOST_RAW_ALIGNED_SUFFIX'),\n      candidates: Number(d.candidates || 0),\n      applied: Number(d.applied || 0),\n      firstIndex: Number.isInteger(Number(d.firstIndex)) ? Number(d.firstIndex) : null,\n      lastIndex: Number.isInteger(Number(d.lastIndex)) ? Number(d.lastIndex) : null,\n      alignmentStatus: String(d.alignmentStatus || 'n/a'),\n      requestSpine: Number(d.requestSpine || 0),\n      hostSpine: Number(d.hostSpine || 0),\n      endpointSource: String(d.endpointSource || 'n/a'),\n      roleMatches: Number(d.roleMatches || 0),\n      roleExpected: Number(d.roleExpected || 0),\n      mappedTargets: Number(d.mappedTargets || 0),\n      bodyEquality: String(d.bodyEquality || 'NOT_REQUIRED'),\n      spineOffset: Number.isInteger(Number(d.spineOffset)) ? Number(d.spineOffset) : null,\n      addedChars: Number(d.addedChars || 0),\n      persistentMutation: 'NONE',\n      costMs: started == null ? Number(d.costMs || 0) : perfMs(started),\n    });\n  }\n"""
replace_once(old_result, new_result, "stabilization result")

new_function = r'''  function stabilizeHistoryProjection(messages, rawMessages, sendIndex) {
    const started = perfNow();
    const request = Array.isArray(messages) ? messages : [];
    const raw = Array.isArray(rawMessages) ? rawMessages : [];
    const rawUserIndex = Number(sendIndex);
    if (!request.length || !raw.length || !Number.isInteger(rawUserIndex) || rawUserIndex < 0 || rawUserIndex >= raw.length) {
      return stabilizationResult('SKIPPED_NO_CONTEXT', { alignmentStatus: 'NO_CONTEXT', endpointSource: HISTORY_ALIGNMENT_ENDPOINT }, started);
    }

    let currentRequestUser = -1;
    for (let i = request.length - 1; i >= 0; i -= 1) {
      if (stabilizationConversationRole(request[i]) === 'user') { currentRequestUser = i; break; }
    }
    if (currentRequestUser < 0 || stabilizationConversationRole(raw[rawUserIndex]) !== 'user') {
      return stabilizationResult('SKIPPED_ENDPOINT_ROLE', { alignmentStatus: 'ENDPOINT_ROLE_MISMATCH', endpointSource: HISTORY_ALIGNMENT_ENDPOINT }, started);
    }

    const requestSpine = buildStabilizationSpine(request, currentRequestUser, HISTORY_ALIGNMENT_REQUEST_SPINE_LIMIT);
    const rawSpine = buildStabilizationSpine(raw, rawUserIndex, HISTORY_ALIGNMENT_RAW_SPINE_LIMIT);
    const commonDetail = {
      requestSpine: requestSpine.length,
      hostSpine: rawSpine.length,
      endpointSource: HISTORY_ALIGNMENT_ENDPOINT,
      bodyEquality: 'NOT_REQUIRED',
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
    if (!requestSpine.length || requestSpine.length > rawSpine.length) {
      return stabilizationResult('SKIPPED_HOST_SUFFIX_SHORT', {
        ...commonDetail,
        alignmentStatus: 'HOST_SUFFIX_SHORT',
        candidates: targetPositions.length,
        roleExpected: requestSpine.length,
      }, started);
    }

    const spineOffset = rawSpine.length - requestSpine.length;
    let roleMatches = 0;
    for (let requestPos = 0; requestPos < requestSpine.length; requestPos += 1) {
      const rawPos = requestPos + spineOffset;
      const reqItem = requestSpine[requestPos];
      const rawItem = rawSpine[rawPos];
      if (!rawItem || reqItem.role !== rawItem.role) {
        return stabilizationResult('SKIPPED_ROLE_DRIFT', {
          ...commonDetail,
          alignmentStatus: 'ROLE_DRIFT',
          candidates: targetPositions.length,
          roleMatches,
          roleExpected: requestSpine.length,
          spineOffset,
        }, started);
      }
      roleMatches += 1;
    }

    const requestEndpoint = requestSpine[requestSpine.length - 1];
    const rawEndpoint = rawSpine[rawSpine.length - 1];
    if (requestEndpoint?.role !== 'user' || rawEndpoint?.role !== 'user') {
      return stabilizationResult('SKIPPED_ENDPOINT_ROLE', {
        ...commonDetail,
        alignmentStatus: 'ENDPOINT_ROLE_MISMATCH',
        candidates: targetPositions.length,
        roleMatches,
        roleExpected: requestSpine.length,
        spineOffset,
      }, started);
    }

    const replacements = [];
    let mappedTargets = 0;
    for (const requestPos of targetPositions) {
      const requestSlot = requestSpine[requestPos]?.index;
      const rawPos = requestPos + spineOffset;
      const rawItem = rawSpine[rawPos];
      const rawSlot = rawItem?.index;
      if (!Number.isInteger(requestSlot) || rawItem?.role !== 'assistant' || !Number.isInteger(rawSlot)) {
        return stabilizationResult('SKIPPED_TARGET_NOT_MAPPABLE', {
          ...commonDetail,
          alignmentStatus: 'TARGET_NOT_MAPPABLE',
          candidates: targetPositions.length,
          roleMatches,
          roleExpected: requestSpine.length,
          mappedTargets,
          spineOffset,
        }, started);
      }

      const canonicalRaw = stabilizationCanonicalAssistantText(raw[rawSlot]);
      if (canonicalRaw.length < HISTORY_STABILIZATION_MIN_RAW_CHARS
          || canonicalRaw.length > HISTORY_STABILIZATION_MAX_RAW_CHARS
          || !canonicalRaw.startsWith('# 응답')) {
        return stabilizationResult('SKIPPED_UNSAFE_RAW_CANDIDATE', {
          ...commonDetail,
          alignmentStatus: 'RESOLVED_TURN_ORDINAL',
          candidates: targetPositions.length,
          roleMatches,
          roleExpected: requestSpine.length,
          mappedTargets,
          spineOffset,
        }, started);
      }

      const slot = request[requestSlot];
      if (!slot || typeof slot.content !== 'string') {
        return stabilizationResult('SKIPPED_NONSTRING_SLOT', {
          ...commonDetail,
          alignmentStatus: 'RESOLVED_TURN_ORDINAL',
          candidates: targetPositions.length,
          roleMatches,
          roleExpected: requestSpine.length,
          mappedTargets,
          spineOffset,
        }, started);
      }
      replacements.push({ requestSlot, canonicalRaw, beforeChars: String(slot.content || '').length });
      mappedTargets += 1;
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
      alignmentStatus: 'RESOLVED_TURN_ORDINAL',
      candidates: targetPositions.length,
      applied: replacements.length,
      firstIndex: replacements[0]?.requestSlot,
      lastIndex: replacements[replacements.length - 1]?.requestSlot,
      roleMatches,
      roleExpected: requestSpine.length,
      mappedTargets,
      spineOffset,
      addedChars,
    }, started);
  }
'''
pattern = re.compile(r"  function stabilizeHistoryProjection\(messages, rawMessages, sendIndex\) \{.*?\n  \}\n\n  function correlateHistoryMutation", re.S)
match = pattern.search(s)
if not match:
    raise SystemExit("stabilizeHistoryProjection: function block not found")
s = s[:match.start()] + new_function + "\n  function correlateHistoryMutation" + s[match.end():]

LATEST.write_text(s, encoding="utf-8")
INSTALL.write_text(s, encoding="utf-8")
