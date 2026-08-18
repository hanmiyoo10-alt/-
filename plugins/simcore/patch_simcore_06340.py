from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    assert count == 1, f'{label}: expected 1 anchor, got {count}'
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label):
    out, count = re.subn(pattern, lambda _m: replacement, text, count=1, flags=re.S)
    assert count == 1, f'{label}: expected 1 regex match, got {count}'
    return out


evidence_module = r'''SimCore.define("evidence", function (require, module, exports) {
const ROOT_FENCE_OPEN = '<CURRENT_ROOT_EVIDENCE>';
const ROOT_FENCE_CLOSE = '</CURRENT_ROOT_EVIDENCE>';
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

function fenceProbe(status, reason, shape, normDelta) {
  return {
    status,
    reason,
    requestIndex: Number(shape?.requestIndex ?? -1),
    role: shape?.role || null,
    shape: shape?.stage || null,
    normDelta: normDelta == null ? null : Number(normDelta),
  };
}

function applyWholeMessageFence(rows, shape, openTag, closeTag, normDelta) {
  const message = rows[shape.requestIndex];
  const slot = stringSlot(message);
  if (!slot) return fenceProbe('SKIPPED', 'non-string-slot', shape, normDelta);
  const current = message[slot];
  if (current.includes(openTag) || current.includes(closeTag)) return fenceProbe('SKIPPED', 'already-fenced', shape, normDelta);
  rows[shape.requestIndex] = { ...message, [slot]: `${openTag}\n${current}\n${closeTag}` };
  return fenceProbe('APPLIED', 'safe-whole-message', shape, normDelta);
}

function inspectAndFence(requestMessages, chatMessages, pending, sendIndex, getText) {
  const mapping = mappingProbe(requestMessages, chatMessages, pending, sendIndex, getText);
  if (!mapping) {
    const none = fenceProbe('INELIGIBLE', 'source-lock-off', null, null);
    return { mapping: null, mode: 'INELIGIBLE', rootFence: none, sourceFence: none, fence: none };
  }
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
  const rootDelta = smallDelta(rootShape, 16).delta;
  const sourceDelta = smallDelta(sourceShape).delta;
  const rows = Array.isArray(requestMessages) ? requestMessages : [];

  if (!rootBoundarySafe(rootShape)) {
    const rootFence = fenceProbe('SKIPPED', 'unsafe-root-boundary', rootShape, rootDelta);
    const sourceFence = fenceProbe('SKIPPED', 'root-boundary-required', sourceShape, sourceDelta);
    return { mapping, mode: 'UNFENCED', rootFence, sourceFence, fence: rootFence };
  }

  const rootFence = applyWholeMessageFence(rows, rootShape, ROOT_FENCE_OPEN, ROOT_FENCE_CLOSE, rootDelta);
  if (rootFence.status !== 'APPLIED') {
    const sourceFence = fenceProbe('SKIPPED', 'root-fence-required', sourceShape, sourceDelta);
    return { mapping, mode: 'UNFENCED', rootFence, sourceFence, fence: rootFence };
  }

  if (!sourceBoundarySafe(sourceShape)) {
    const sourceFence = fenceProbe('SKIPPED', 'unsafe-source-boundary', sourceShape, sourceDelta);
    return { mapping, mode: 'ROOT_ONLY', rootFence, sourceFence, fence: rootFence };
  }

  const sourceFence = applyWholeMessageFence(rows, sourceShape, FENCE_OPEN, FENCE_CLOSE, sourceDelta);
  const mode = sourceFence.status === 'APPLIED' ? 'DUAL' : 'ROOT_ONLY';
  return { mapping, mode, rootFence, sourceFence, fence: sourceFence.status === 'APPLIED' ? sourceFence : rootFence };
}

module.exports = {
  ROOT_FENCE_OPEN, ROOT_FENCE_CLOSE, FENCE_OPEN, FENCE_CLOSE,
  normalize, mappingProbe, inspectAndFence,
};
});'''

for path in FILES:
    text = path.read_text(encoding='utf-8')

    text = replace_once(text, '//@version 0.63.39', '//@version 0.63.40', f'{path}: metadata version')

    release_note = '''// v0.63.40 Current Source Integrity & Runtime Surface Consolidation:\n// - Adds a root-first current-event authority contract so explicit facts in the current user event outrank conflicting prior versions without parsing or storing event semantics\n// - Splits Short-C request fencing into CURRENT_ROOT_EVIDENCE plus the existing CURRENT_SOURCE_EVIDENCE: safe roots remain concretely fenced even when a host-transformed assistant source fails the existing strict source-boundary gate\n// - Preserves the v0.63.39 source acceptance criteria; unsafe source boundaries are never relaxed, and root-unsafe requests remain unfenced rather than promoting source-only evidence\n// - Consolidates runtime-facing version strings through one runtime constant for panel, copied diagnostics, telemetry source version and console prefixes; plugin metadata is CI-checked against the same value\n// - Keeps trajectory/retry/EMA behavior, request order, runtime tail placement, provider-cache policy, edit/mirror acceptance, storage/API/timer/network surface, Frame/Time/Recovery and all non-Evidence/non-Prompt Core modules frozen\n//\n'''
    text = replace_once(text, '// v0.63.39 Cache Trajectory Identity & Representation Diagnostics:\n', release_note + '// v0.63.39 Cache Trajectory Identity & Representation Diagnostics:\n', f'{path}: release note')

    text = replace_once(
        text,
        'const SimCore = (() => {',
        "const SIMCORE_RUNTIME_VERSION = '0.63.40';\nconst SIMCORE_LOG_PREFIX = `[simcore/v${SIMCORE_RUNTIME_VERSION}]`;\n\nconst SimCore = (() => {",
        f'{path}: runtime version constants',
    )

    text = sub_once(
        text,
        r'SimCore\.define\("evidence", function \(require, module, exports\) \{.*?\n\}\);\n\nSimCore\.define\("kernel"',
        evidence_module + '\n\nSimCore.define("kernel"',
        f'{path}: evidence module',
    )

    text = replace_once(
        text,
        "    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',\n    'reference_sources=character_card+currently_exposed_lore_if_present',",
        "    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',\n    'current_input_explicit_current_event_facts=authoritative_over_conflicting_prior_event_versions',\n    'reference_sources=character_card+currently_exposed_lore_if_present',",
        f'{path}: current-input authority',
    )

    old_source_contract = """    lines.push('short_community_source_is_authoritative=1');
    lines.push('do_not_substitute_prior_similar_source_or_prior_community_answer=1');
    lines.push('source_event_identity_and_facts=current_lineage_root+CURRENT_SOURCE_EVIDENCE_when_present;do_not_import_prior_similar_event_details=1');
    lines.push('abstract_generalization_from_current_root_allowed=1;stable_character_world_background_allowed_as_context_not_event_evidence=1;reaction_opinion_joke_tone_emphasis_free=1');
    lines.push('specific_event_example_scene_action_item_quote_or_outcome_requires_CURRENT_SOURCE_EVIDENCE_support_when_present_else_current_root_support=1;outside_root_specifics_omit=1');
    lines.push('outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1');"""
    new_source_contract = """    lines.push('short_community_source_is_authoritative=1');
    lines.push('current_root_evidence=CURRENT_ROOT_EVIDENCE_when_present;root_explicit_facts_highest_authority=1');
    lines.push('current_source_evidence=CURRENT_SOURCE_EVIDENCE_when_present;rendered_context_only_when_conflicting_with_root=1');
    lines.push('event_fact_precedence=CURRENT_ROOT_EVIDENCE>current_lineage_root>CURRENT_SOURCE_EVIDENCE>prior_similar_history');
    lines.push('do_not_substitute_prior_similar_source_or_prior_community_answer=1');
    lines.push('source_event_identity_and_facts=current_root_first;do_not_import_prior_similar_event_details=1');
    lines.push('abstract_generalization_from_current_root_allowed=1;stable_character_world_background_allowed_as_context_not_event_evidence=1;reaction_opinion_joke_tone_emphasis_free=1');
    lines.push('specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support;CURRENT_SOURCE_EVIDENCE_may_support_only_nonconflicting_rendered_details=1;outside_root_specifics_omit=1');
    lines.push('outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1');"""
    text = replace_once(text, old_source_contract, new_source_contract, f'{path}: root-first source contract')

    text = replace_once(text, "      'Version: 0.63.39',", "      `Version: ${SIMCORE_RUNTIME_VERSION}`,", f'{path}: diagnostic version')
    text = replace_once(text, "sourceVersion: '0.63.39',", "sourceVersion: SIMCORE_RUNTIME_VERSION,", f'{path}: telemetry version')

    panel_old = '<div><div class="title">⚙️ SimCore v0.63.36</div><div class="subtitle">Evidence Fence · request-only source boundary</div></div>'
    panel_new = '<div><div class="title">⚙️ SimCore v${escapeHtml(SIMCORE_RUNTIME_VERSION)}</div><div class="subtitle">Runtime & Integrity Diagnostics</div></div>'
    text = replace_once(text, panel_old, panel_new, f'{path}: panel surface')

    log_count = text.count("'[simcore/v0.63.4] ")
    assert log_count >= 1, f'{path}: expected stale log prefixes'
    text = text.replace("'[simcore/v0.63.4] ", "SIMCORE_LOG_PREFIX + ' ")

    text = replace_once(
        text,
        '      lastEvidenceFenceProbe = evidenceResult?.fence || null;',
        '      lastEvidenceFenceProbe = evidenceResult || null;',
        f'{path}: evidence runtime result',
    )

    old_diag = """      `Evidence fence: ${evidenceFence ? `${evidenceFence.status} · request @${evidenceFence.requestIndex >= 0 ? evidenceFence.requestIndex : 'n/a'} role ${evidenceFence.role || 'n/a'} · source ${evidenceFence.sourceShape || 'n/a'} · delta ${evidenceFence.normDelta == null ? 'n/a' : evidenceFence.normDelta} · ${evidenceFence.reason || 'n/a'}` : 'n/a'}`,"""
    new_diag = """      `Evidence mode: ${evidenceFence?.mode || 'n/a'}`,
      `Evidence root fence: ${evidenceFence?.rootFence ? `${evidenceFence.rootFence.status} · request @${evidenceFence.rootFence.requestIndex >= 0 ? evidenceFence.rootFence.requestIndex : 'n/a'} role ${evidenceFence.rootFence.role || 'n/a'} · shape ${evidenceFence.rootFence.shape || 'n/a'} · delta ${evidenceFence.rootFence.normDelta == null ? 'n/a' : evidenceFence.rootFence.normDelta} · ${evidenceFence.rootFence.reason || 'n/a'}` : 'n/a'}`,
      `Evidence source fence: ${evidenceFence?.sourceFence ? `${evidenceFence.sourceFence.status} · request @${evidenceFence.sourceFence.requestIndex >= 0 ? evidenceFence.sourceFence.requestIndex : 'n/a'} role ${evidenceFence.sourceFence.role || 'n/a'} · shape ${evidenceFence.sourceFence.shape || 'n/a'} · delta ${evidenceFence.sourceFence.normDelta == null ? 'n/a' : evidenceFence.sourceFence.normDelta} · ${evidenceFence.sourceFence.reason || 'n/a'}` : 'n/a'}`,"""
    text = replace_once(text, old_diag, new_diag, f'{path}: evidence diagnostics')

    assert "[simcore/v0.63.4]" not in text, f'{path}: stale console prefix remains'
    assert 'SimCore v0.63.36' not in text, f'{path}: stale panel version remains'
    assert "sourceVersion: '0.63.39'" not in text, f'{path}: stale telemetry version remains'

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.40 Current Source Integrity & Runtime Surface Consolidation')
