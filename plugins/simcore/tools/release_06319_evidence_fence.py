from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.19 Evidence Fence:\n// - Promotes the v0.63.16-v0.63.18 provenance probes into a request-only concrete-evidence boundary for eligible Short-C source locks\n// - Locates the authoritative source assistant in the final beforeRequest array and wraps only that existing request message when root/source identity is unique, S/M/E anchors survive, outer gaps are zero, and normalized length drift is small\n// - Preserves the host-transformed request body verbatim inside <CURRENT_SOURCE_EVIDENCE>; it does not replace it with raw chat text, summarize it, scan semantics, persist source bodies, or mutate visible chat history\n// - Fails open on ambiguous/merged/unsafe boundaries and records APPLIED/SKIPPED diagnostics; Frame, Time, Recurrence, Lineage, Handoff, output handling, state schema, storage and host/API call sites remain frozen\n// - Adds the dedicated Evidence module and only retargets the two existing Short-C provenance prompt lines to the fence when present\n//\n"""

EVIDENCE_MODULE = r'''SimCore.define("evidence", function (require, module, exports) {
const FENCE_OPEN = '<CURRENT_SOURCE_EVIDENCE>';
const FENCE_CLOSE = '</CURRENT_SOURCE_EVIDENCE>';
const MAX_SOURCE_NORM_DELTA = 64;
const MAX_SOURCE_NORM_DELTA_RATIO = 0.02;

function assistantRole(m) {
  return m?.role === 'char' || m?.role === 'assistant';
}

function textOf(m, getText) {
  if (!m) return '';
  if (typeof getText === 'function') return String(getText(m) || '');
  const v = m.content ?? m.data ?? m.text ?? '';
  return typeof v === 'string' ? v : String(v || '');
}

function normalize(text) {
  return String(text || '').replace(/\r\n?/g, '\n').replace(/\s+/g, ' ').trim();
}

function sourceAssistantIndex(chatMessages, rootIndex, sendIndex) {
  const rows = Array.isArray(chatMessages) ? chatMessages : [];
  const start = Number.isInteger(Number(rootIndex)) ? Number(rootIndex) + 1 : 0;
  const stopRaw = Number.isInteger(Number(sendIndex)) ? Number(sendIndex) : rows.length;
  const stop = Math.min(Math.max(start, stopRaw), rows.length);
  for (let i = start; i < stop; i++) if (assistantRole(rows[i])) return i;
  return -1;
}

function pick(rows, predicate, stage) {
  let count = 0;
  let picked = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!predicate(rows[i])) continue;
    count += 1;
    if (!picked) picked = { ...rows[i], requestIndex: i };
    if (count >= 2) break;
  }
  return {
    stage: count === 0 ? 'ABSENT' : (count === 1 ? stage : 'AMBIGUOUS'),
    count,
    requestIndex: picked?.requestIndex ?? -1,
    role: picked?.role || null,
    requestChars: picked?.text?.length || 0,
    requestNormChars: picked?.norm?.length || 0,
    requestNorm: picked?.norm || '',
  };
}

function anchorChunks(target) {
  const text = String(target || '');
  if (text.length < 48) return [];
  const size = Math.min(64, Math.max(24, Math.floor(text.length / 8)));
  const middleStart = Math.max(0, Math.floor((text.length - size) / 2));
  return [
    { key: 'S', text: text.slice(0, size) },
    { key: 'M', text: text.slice(middleStart, middleStart + size) },
    { key: 'E', text: text.slice(Math.max(0, text.length - size)) },
  ].filter((x, i, a) => x.text && a.findIndex((y) => y.text === x.text) === i);
}

function boundary(targetNorm, requestNorm) {
  const anchors = anchorChunks(targetNorm);
  const found = [];
  for (const anchor of anchors) {
    const pos = requestNorm.indexOf(anchor.text);
    if (pos >= 0) found.push({ key: anchor.key, pos, len: anchor.text.length });
  }
  found.sort((a, b) => a.pos - b.pos);
  const first = found[0] || null;
  const last = found[found.length - 1] || null;
  return {
    anchorMask: found.map((x) => x.key).join('') || 'NONE',
    anchorCount: found.length,
    leadingGap: first ? first.pos : -1,
    trailingGap: last ? Math.max(0, requestNorm.length - (last.pos + last.len)) : -1,
  };
}

function targetShape(requestMessages, targetText, getText) {
  const target = String(targetText || '');
  const targetNorm = normalize(target);
  if (!target || !targetNorm) {
    return { stage: 'ABSENT', count: 0, requestIndex: -1, role: null, requestChars: 0, requestNormChars: 0, targetNormChars: targetNorm.length, anchorMask: 'NONE', anchorCount: 0, leadingGap: -1, trailingGap: -1 };
  }
  const rows = (Array.isArray(requestMessages) ? requestMessages : []).map((m) => {
    const text = textOf(m, getText);
    return { role: m?.role || null, text, norm: normalize(text) };
  });
  let r = pick(rows, (x) => x.text === target, 'EXACT');
  if (!r.count) r = pick(rows, (x) => x.norm === targetNorm, 'NORMALIZED');
  if (!r.count && targetNorm.length >= 24) r = pick(rows, (x) => x.norm.length >= targetNorm.length && x.norm.includes(targetNorm), 'EMBEDDED');
  if (!r.count) {
    const anchors = anchorChunks(targetNorm);
    if (anchors.length >= 2) {
      const required = Math.min(2, anchors.length);
      r = pick(rows, (x) => anchors.reduce((n, a) => n + (x.norm.includes(a.text) ? 1 : 0), 0) >= required, 'TRANSFORMED');
    }
  }
  const b = r.requestIndex >= 0 ? boundary(targetNorm, r.requestNorm) : { anchorMask: 'NONE', anchorCount: 0, leadingGap: -1, trailingGap: -1 };
  return {
    stage: r.stage,
    count: r.count,
    requestIndex: r.requestIndex,
    role: r.role,
    requestChars: r.requestChars,
    requestNormChars: r.requestNormChars,
    targetNormChars: targetNorm.length,
    ...b,
  };
}

function combinedStatus(rootShape, assistantShape) {
  const stages = [rootShape?.stage || 'ABSENT', assistantShape?.stage || 'ABSENT'];
  if (stages.includes('AMBIGUOUS')) return 'AMBIGUOUS';
  if (stages.includes('ABSENT')) return 'ABSENT';
  const rank = { EXACT: 0, NORMALIZED: 1, EMBEDDED: 2, TRANSFORMED: 3 };
  return stages.sort((a, b) => (rank[b] ?? 99) - (rank[a] ?? 99))[0] || 'ABSENT';
}

function mappingProbe(requestMessages, chatMessages, pending, sendIndex, getText) {
  const p = pending && typeof pending === 'object' ? pending : null;
  const rootIndex = Number(p?.requestLineageRootIndex);
  const sourceLocked = !!p?.active && String(p?.mode || '') === 'C'
    && Number.isInteger(rootIndex) && rootIndex >= 0
    && String(p?.requestLineageSourceKind || '') !== 'UNSEEDED';
  if (!sourceLocked) return null;
  const chatRows = Array.isArray(chatMessages) ? chatMessages : [];
  const rootUser = chatRows[rootIndex];
  const rootUserText = rootUser?.role === 'user' ? textOf(rootUser, getText) : '';
  const rawAssistantIndex = sourceAssistantIndex(chatRows, rootIndex, sendIndex);
  const sourceAssistant = rawAssistantIndex >= 0 ? chatRows[rawAssistantIndex] : null;
  const sourceAssistantText = sourceAssistant ? textOf(sourceAssistant, getText) : '';
  const rootShape = targetShape(requestMessages, rootUserText, getText);
  const assistantShape = targetShape(requestMessages, sourceAssistantText, getText);
  return {
    status: combinedStatus(rootShape, assistantShape),
    rootUserShape: rootShape.stage,
    rootUserRawIndex: rootIndex,
    rootUserRequestIndex: rootShape.requestIndex,
    rootUserRequestRole: rootShape.role,
    rootUserMatches: rootShape.count,
    rootUserChars: rootUserText.length,
    rootUserRequestChars: rootShape.requestChars,
    rootUserNormChars: rootShape.targetNormChars,
    rootUserRequestNormChars: rootShape.requestNormChars,
    rootUserAnchorMask: rootShape.anchorMask,
    rootUserLeadingGap: rootShape.leadingGap,
    rootUserTrailingGap: rootShape.trailingGap,
    sourceAssistantShape: assistantShape.stage,
    sourceAssistantRawIndex: rawAssistantIndex,
    sourceAssistantRequestIndex: assistantShape.requestIndex,
    sourceAssistantRequestRole: assistantShape.role,
    sourceAssistantMatches: assistantShape.count,
    sourceAssistantChars: sourceAssistantText.length,
    sourceAssistantRequestChars: assistantShape.requestChars,
    sourceAssistantNormChars: assistantShape.targetNormChars,
    sourceAssistantRequestNormChars: assistantShape.requestNormChars,
    sourceAssistantAnchorMask: assistantShape.anchorMask,
    sourceAssistantLeadingGap: assistantShape.leadingGap,
    sourceAssistantTrailingGap: assistantShape.trailingGap,
    requestMessages: Array.isArray(requestMessages) ? requestMessages.length : 0,
  };
}

function smallDelta(shape, absoluteCap = MAX_SOURCE_NORM_DELTA) {
  const target = Math.max(0, Number(shape?.targetNormChars || 0));
  const request = Math.max(0, Number(shape?.requestNormChars || 0));
  const delta = Math.abs(request - target);
  const ratioCap = Math.max(12, Math.ceil(target * MAX_SOURCE_NORM_DELTA_RATIO));
  return { delta, safe: delta <= Math.min(absoluteCap, ratioCap) };
}

function rootBoundarySafe(shape) {
  if (!shape || shape.count !== 1 || shape.requestIndex < 0 || shape.role !== 'user') return false;
  if (!['EXACT', 'NORMALIZED'].includes(shape.stage)) return false;
  if (shape.targetNormChars >= 48 && (shape.anchorMask !== 'SME' || shape.leadingGap !== 0 || shape.trailingGap !== 0)) return false;
  return smallDelta(shape, 16).safe;
}

function sourceBoundarySafe(shape) {
  if (!shape || shape.count !== 1 || shape.requestIndex < 0 || shape.role !== 'assistant') return false;
  if (!['EXACT', 'NORMALIZED', 'TRANSFORMED'].includes(shape.stage)) return false;
  if (shape.targetNormChars < 48 || shape.anchorMask !== 'SME' || shape.leadingGap !== 0 || shape.trailingGap !== 0) return false;
  return smallDelta(shape).safe;
}

function stringSlot(message) {
  if (!message || typeof message !== 'object') return null;
  for (const key of ['content', 'data', 'text']) if (typeof message[key] === 'string') return key;
  return null;
}

function inspectAndFence(requestMessages, chatMessages, pending, sendIndex, getText) {
  const mapping = mappingProbe(requestMessages, chatMessages, pending, sendIndex, getText);
  if (!mapping) return { mapping: null, fence: { status: 'INELIGIBLE', reason: 'source-lock-off', requestIndex: -1, role: null, sourceShape: null, normDelta: null } };
  const rootShape = {
    stage: mapping.rootUserShape, count: mapping.rootUserMatches, requestIndex: mapping.rootUserRequestIndex,
    role: mapping.rootUserRequestRole, targetNormChars: mapping.rootUserNormChars, requestNormChars: mapping.rootUserRequestNormChars,
    anchorMask: mapping.rootUserAnchorMask, leadingGap: mapping.rootUserLeadingGap, trailingGap: mapping.rootUserTrailingGap,
  };
  const sourceShape = {
    stage: mapping.sourceAssistantShape, count: mapping.sourceAssistantMatches, requestIndex: mapping.sourceAssistantRequestIndex,
    role: mapping.sourceAssistantRequestRole, targetNormChars: mapping.sourceAssistantNormChars, requestNormChars: mapping.sourceAssistantRequestNormChars,
    anchorMask: mapping.sourceAssistantAnchorMask, leadingGap: mapping.sourceAssistantLeadingGap, trailingGap: mapping.sourceAssistantTrailingGap,
  };
  const normDelta = smallDelta(sourceShape).delta;
  if (!rootBoundarySafe(rootShape)) return { mapping, fence: { status: 'SKIPPED', reason: 'unsafe-root-boundary', requestIndex: sourceShape.requestIndex, role: sourceShape.role, sourceShape: sourceShape.stage, normDelta } };
  if (!sourceBoundarySafe(sourceShape)) return { mapping, fence: { status: 'SKIPPED', reason: 'unsafe-source-boundary', requestIndex: sourceShape.requestIndex, role: sourceShape.role, sourceShape: sourceShape.stage, normDelta } };
  const rows = Array.isArray(requestMessages) ? requestMessages : [];
  const message = rows[sourceShape.requestIndex];
  const slot = stringSlot(message);
  if (!slot) return { mapping, fence: { status: 'SKIPPED', reason: 'non-string-source-slot', requestIndex: sourceShape.requestIndex, role: sourceShape.role, sourceShape: sourceShape.stage, normDelta } };
  const current = message[slot];
  if (current.includes(FENCE_OPEN) || current.includes(FENCE_CLOSE)) return { mapping, fence: { status: 'SKIPPED', reason: 'already-fenced', requestIndex: sourceShape.requestIndex, role: sourceShape.role, sourceShape: sourceShape.stage, normDelta } };
  rows[sourceShape.requestIndex] = { ...message, [slot]: `${FENCE_OPEN}\n${current}\n${FENCE_CLOSE}` };
  return { mapping, fence: { status: 'APPLIED', reason: 'safe-whole-message', requestIndex: sourceShape.requestIndex, role: sourceShape.role, sourceShape: sourceShape.stage, normDelta } };
}

module.exports = { FENCE_OPEN, FENCE_CLOSE, normalize, mappingProbe, inspectAndFence };
});

'''


def replace_once(text, old, new, label, path):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label} anchor drift ({count})')
    return text.replace(old, new, 1)

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.18' not in text:
        raise SystemExit(f'{path}: expected 0.63.18 baseline')
    if '// v0.63.19 Evidence Fence:' in text:
        raise SystemExit(f'{path}: already patched')

    text = replace_once(text, '//@version 0.63.18', '//@version 0.63.19', 'version', path)
    text = replace_once(text, '// v0.63.18 Evidence Boundary Probe:\n', CHANGELOG + '// v0.63.18 Evidence Boundary Probe:\n', 'changelog', path)
    text = replace_once(text, '// - Handoff: short-C source/parent-shift detection/state only\n', '// - Handoff: short-C source/parent-shift detection/state only\n// - Evidence: authoritative request-message resolution + safe request-only source fencing\n', 'module list', path)
    text = replace_once(text,
        "  handoff: Object.freeze({ owns: 'short-C source/parent-shift detection and bounded registry', excludes: 'semantic source selection or reaction content' }),\n",
        "  handoff: Object.freeze({ owns: 'short-C source/parent-shift detection and bounded registry', excludes: 'semantic source selection or reaction content' }),\n  evidence: Object.freeze({ owns: 'authoritative request-message resolution and safe request-only source fencing', excludes: 'semantic interpretation, summarization, history search, storage, output repair, creative generation' }),\n",
        'evidence contract', path)

    kernel_marker = 'SimCore.define("kernel", function (require, module, exports) {'
    text = replace_once(text, kernel_marker, EVIDENCE_MODULE + kernel_marker, 'evidence module insertion', path)

    text = replace_once(text,
        "    lines.push('source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1');",
        "    lines.push('source_event_identity_and_facts=current_lineage_root+CURRENT_SOURCE_EVIDENCE_when_present;do_not_import_prior_similar_event_details=1');",
        'source identity prompt', path)
    text = replace_once(text,
        "    lines.push('specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support=1;outside_root_specifics_omit=1');",
        "    lines.push('specific_event_example_scene_action_item_quote_or_outcome_requires_CURRENT_SOURCE_EVIDENCE_support_when_present_else_current_root_support=1;outside_root_specifics_omit=1');",
        'specific evidence prompt', path)

    text = replace_once(text,
        "  const recurrenceRules = SimCore.require('recurrence');\n  const ops = SimCore.require('ops');",
        "  const recurrenceRules = SimCore.require('recurrence');\n  const evidenceRules = SimCore.require('evidence');\n  const ops = SimCore.require('ops');",
        'evidence require', path)
    text = replace_once(text,
        '  let lastEvidenceMappingProbe = null;\n  let lastNarrativeClockProbe = null;',
        '  let lastEvidenceMappingProbe = null;\n  let lastEvidenceFenceProbe = null;\n  let lastNarrativeClockProbe = null;',
        'fence probe state', path)

    old_mapping = "      lastEvidenceMappingProbe = lastRuntimePromptBudget.sourceAnchor\n        ? buildEvidenceMappingProbe(messages, chat?.message || [], result.state.pending, sendIndex, textMessageContent)\n        : null;"
    new_mapping = "      const evidenceResult = lastRuntimePromptBudget.sourceAnchor\n        ? evidenceRules.inspectAndFence(messages, chat?.message || [], result.state.pending, sendIndex, textMessageContent)\n        : null;\n      lastEvidenceMappingProbe = evidenceResult?.mapping || null;\n      lastEvidenceFenceProbe = evidenceResult?.fence || null;"
    text = replace_once(text, old_mapping, new_mapping, 'runtime evidence application', path)

    begin = text.find('  // EVIDENCE_MAPPING_PROBE_BEGIN\n')
    end_marker = '  // EVIDENCE_MAPPING_PROBE_END\n'
    end = text.find(end_marker, begin)
    if begin < 0 or end < 0:
        raise SystemExit(f'{path}: old evidence probe markers missing')
    end += len(end_marker)
    text = text[:begin] + text[end:]

    text = replace_once(text,
        '    const evidenceMap = lastEvidenceMappingProbe || null;\n    const narrative = lastNarrativeClockProbe || null;',
        '    const evidenceMap = lastEvidenceMappingProbe || null;\n    const evidenceFence = lastEvidenceFenceProbe || null;\n    const narrative = lastNarrativeClockProbe || null;',
        'diagnostic fence local', path)
    boundary_line = "      `Evidence boundary: ${evidenceMap ? `root anchors ${evidenceMap.rootUserAnchorMask} · norm ${evidenceMap.rootUserNormChars}→${evidenceMap.rootUserRequestNormChars} · gaps ${evidenceMap.rootUserLeadingGap}/${evidenceMap.rootUserTrailingGap} · assistant anchors ${evidenceMap.sourceAssistantAnchorMask} · norm ${evidenceMap.sourceAssistantNormChars}→${evidenceMap.sourceAssistantRequestNormChars} · gaps ${evidenceMap.sourceAssistantLeadingGap}/${evidenceMap.sourceAssistantTrailingGap}` : 'n/a'}`,\n"
    fence_line = "      `Evidence fence: ${evidenceFence ? `${evidenceFence.status} · request @${evidenceFence.requestIndex >= 0 ? evidenceFence.requestIndex : 'n/a'} role ${evidenceFence.role || 'n/a'} · source ${evidenceFence.sourceShape || 'n/a'} · delta ${evidenceFence.normDelta == null ? 'n/a' : evidenceFence.normDelta} · ${evidenceFence.reason || 'n/a'}` : 'n/a'}`,\n"
    text = replace_once(text, boundary_line, boundary_line + fence_line, 'diagnostic fence line', path)

    text = replace_once(text, "'Version: 0.63.18'", "'Version: 0.63.19'", 'diagnostic version', path)
    text = replace_once(text, '⚙️ SimCore v0.63.18', '⚙️ SimCore v0.63.19', 'panel version', path)
    text = replace_once(text, 'Diagnostics UI Polish III · runtime semantics unchanged', 'Evidence Fence · request-only source boundary', 'panel subtitle', path)
    text = replace_once(text,
        '<details class="card"><summary>Diagnostic Tools</summary><div class="detail-body muted">Frame continuity + recurrence-history match run only for manual diagnostic copy; runtime prompt/generation behavior unchanged.</div></details>',
        '<details class="card"><summary>Diagnostic Tools</summary><div class="detail-body muted">Frame continuity + recurrence-history match run only for manual diagnostic copy; Evidence Fence status reports request-only source-boundary behavior.</div></details>',
        'diagnostic tools note', path)

    text = replace_once(text,
        "      previousRuntimePromptKey = null;\n      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };",
        "      previousRuntimePromptKey = null;\n      lastEvidenceMappingProbe = null;\n      lastEvidenceFenceProbe = null;\n      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };",
        'inactive evidence clear', path)
    text = replace_once(text,
        '    previousRuntimePromptKey = null;\n  });',
        '    previousRuntimePromptKey = null;\n    lastEvidenceMappingProbe = null;\n    lastEvidenceFenceProbe = null;\n  });',
        'unload evidence clear', path)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.19 latest.js/install.js (Evidence Fence; fail-open request-only source boundary)')
