from pathlib import Path

PATHS = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def repl_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)

HANDOFF_MODULE = r'''

SimCore.define("handoff", function (require, module, exports) {
const COMMUNITY_SOURCE_HANDOFF_VERSION = 1;
const HANDOFF_REGISTRY_LIMIT = 128;
const COMMUNITY_MARKER = '[커뮤니티]';
const SHORT_REQUEST_MIN_CHARS = 4;
const SHORT_REQUEST_MAX_CHARS = 31;
const SHORT_REQUEST_SCAN_CHARS = 512;

function intIndex(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function sourceFamily(rootMode) {
  const m = String(rootMode || '');
  if (m === 'INLINE_C' || m === 'C') return 'C';
  if (m === 'B') return 'B';
  if (m === 'A') return 'A';
  return null;
}

function normalizeRegistry(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of src) {
    const hash = Number(row?.hash);
    const rootMode = sourceFamily(row?.rootMode);
    const rootIndex = intIndex(row?.rootIndex);
    if (!Number.isFinite(hash) || !rootMode || rootIndex < 0) continue;
    const h = hash >>> 0;
    const prior = out.findIndex((x) => x.hash === h);
    if (prior >= 0) out.splice(prior, 1);
    out.push({ hash: h, rootMode, rootIndex });
  }
  return out.slice(-HANDOFF_REGISTRY_LIMIT);
}

function normalizeShortRequest(userText, mode) {
  if (String(mode || '') !== 'C') return '';
  const raw = String(userText || '');
  const marker = raw.indexOf(COMMUNITY_MARKER);
  if (marker < 0) return '';
  let source = raw.slice(marker + COMMUNITY_MARKER.length, marker + COMMUNITY_MARKER.length + SHORT_REQUEST_SCAN_CHARS);
  try { source = source.normalize('NFKC'); } catch { /* older JS runtime */ }
  const normalized = source
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[“”‘’`]/g, "'")
    .replace(/^[\s:：\-–—]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized.length >= SHORT_REQUEST_MIN_CHARS && normalized.length <= SHORT_REQUEST_MAX_CHARS
    ? normalized
    : '';
}

function hashRequest(normalized) {
  const text = String(normalized || '');
  if (!text) return null;
  let h = 2166136261 >>> 0;
  const seed = `C-short:${text.length}:`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function observe(state, userText, mode, requestLineage, templateRecurrence) {
  state.communitySourceRegistry = normalizeRegistry(state.communitySourceRegistry);
  state.communitySourceHandoffVersion = COMMUNITY_SOURCE_HANDOFF_VERSION;
  const normalized = normalizeShortRequest(userText, mode);
  const rootMode = sourceFamily(requestLineage?.rootMode);
  const rootIndex = intIndex(requestLineage?.rootIndex);
  const base = {
    eligible: false,
    seen: false,
    newSource: false,
    hash: null,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    priorRootMode: null,
    priorRootIndex: -1,
    registrySize: state.communitySourceRegistry.length,
    reason: 'ineligible',
  };

  // Long/detailed C requests already have Template Recurrence Guard. Keep this guard for the
  // short follow-up gap only so prompts never receive duplicate anti-reuse guidance.
  if (String(mode || '') !== 'C') return { ...base, reason: 'not-community' };
  if (templateRecurrence?.eligible) return { ...base, reason: 'template-recurrence-owned' };
  if (!normalized) return { ...base, reason: 'not-short-request' };
  if (!rootMode || rootIndex < 0 || requestLineage?.sourceKind === 'UNSEEDED') {
    return { ...base, reason: 'unseeded-source' };
  }

  const hash = hashRequest(normalized);
  const registry = state.communitySourceRegistry;
  const idx = registry.findIndex((x) => x.hash === hash);
  const prior = idx >= 0 ? registry[idx] : null;
  const seen = !!prior;
  const newSource = !!prior && (prior.rootMode !== rootMode || prior.rootIndex !== rootIndex);
  if (idx >= 0) registry.splice(idx, 1);
  registry.push({ hash, rootMode, rootIndex });
  if (registry.length > HANDOFF_REGISTRY_LIMIT) registry.splice(0, registry.length - HANDOFF_REGISTRY_LIMIT);
  state.communitySourceRegistry = registry;

  return {
    eligible: true,
    seen,
    newSource,
    hash,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    priorRootMode: prior?.rootMode || null,
    priorRootIndex: prior ? intIndex(prior.rootIndex) : -1,
    registrySize: registry.length,
    reason: newSource ? 'same-short-request-new-source' : (seen ? 'same-source' : 'first'),
  };
}

module.exports = {
  COMMUNITY_SOURCE_HANDOFF_VERSION,
  HANDOFF_REGISTRY_LIMIT,
  sourceFamily,
  normalizeRegistry,
  normalizeShortRequest,
  hashRequest,
  observe,
};
});
'''

for path in PATHS:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.25' in text:
        print(f'{path}: already patched')
        continue

    text = repl_once(
        text,
        '//@version 0.62.24\n//@display-name SimCore v0.62.24 Narrative Current-Time Floor\n',
        '//@version 0.62.25\n//@display-name SimCore v0.62.25 Community New-Source Guard ABC\n',
        'header',
    )

    release_anchor = '// - OPS: performance helpers/diagnostic formatting\n//\n// v0.62.24 Narrative Current-Time Floor:'
    release_new = '''// - OPS: performance helpers/diagnostic formatting
//
// v0.62.25 Community New-Source Guard ABC:
// - Closes the short Community follow-up gap left intentionally outside the detailed Template Recurrence Guard
// - Remembers a bounded short-request fingerprint together with its latest A/B/C lineage root; no content body is stored
// - When the same short Community request recurs under a different source root, injects only two compact lines telling the model to derive from the current source instead of the prior answer
// - Same request + same source gets no hint; first occurrence gets no hint; long/detailed recurrence remains owned by v0.62.22
// - Source roots are ABC-wide: A scenes, B episodes, and inline-C sources all participate without cross-contract template contamination
// - No history bootstrap/rescan, no auxiliary model, no new pluginStorage API call sites, and normal requests add zero prompt tokens
//
// v0.62.24 Narrative Current-Time Floor:'''
    text = repl_once(text, release_anchor, release_new, 'release notes')

    lineage_anchor = '''module.exports = {
  LINEAGE_VERSION,
  RECENT_SOURCE_LIMIT,
  modeFamily,
  normalizeLineage,
  inlineSourceInfo,
  observe,
};
});

SimCore.define("kernel", function (require, module, exports) {'''
    lineage_new = '''module.exports = {
  LINEAGE_VERSION,
  RECENT_SOURCE_LIMIT,
  modeFamily,
  normalizeLineage,
  inlineSourceInfo,
  observe,
};
});''' + HANDOFF_MODULE + '''

SimCore.define("kernel", function (require, module, exports) {'''
    text = repl_once(text, lineage_anchor, lineage_new, 'handoff module insert')

    text = repl_once(
        text,
        "const lineage = require('./lineage');\n\nconst STATE_VERSION = 5;",
        "const lineage = require('./lineage');\nconst handoff = require('./handoff');\n\nconst STATE_VERSION = 5;",
        'kernel require',
    )

    text = repl_once(
        text,
        '''    requestLineageVersion: 1,
    requestLineage: lineage.normalizeLineage(null),
    broadcastLocked: false,''',
        '''    requestLineageVersion: 1,
    requestLineage: lineage.normalizeLineage(null),
    communitySourceHandoffVersion: 1,
    communitySourceRegistry: [],
    broadcastLocked: false,''',
        'initial handoff state',
    )

    text = repl_once(
        text,
        '''  s.requestLineageVersion = Math.max(1, Math.round(Number(s.requestLineageVersion) || 0));
  s.requestLineage = lineage.normalizeLineage(s.requestLineage);
  s.broadcastLocked = !!s.broadcastLocked;''',
        '''  s.requestLineageVersion = Math.max(1, Math.round(Number(s.requestLineageVersion) || 0));
  s.requestLineage = lineage.normalizeLineage(s.requestLineage);
  s.communitySourceHandoffVersion = Math.max(0, Math.round(Number(s.communitySourceHandoffVersion) || 0));
  s.communitySourceRegistry = handoff.normalizeRegistry(s.communitySourceRegistry);
  s.broadcastLocked = !!s.broadcastLocked;''',
        'reconcile handoff state',
    )

    text = repl_once(
        text,
        "const recurrence = require('./recurrence');\nconst lineage = require('./lineage');\n\nfunction classifyMode",
        "const recurrence = require('./recurrence');\nconst lineage = require('./lineage');\nconst handoff = require('./handoff');\n\nfunction classifyMode",
        'lifecycle require',
    )

    text = repl_once(
        text,
        '''  const templateRecurrence = recurrence.observe(state, input, c.mode);
  const requestLineage = lineage.observe(state, input, c.mode, sendIndex);

  // Explicit user dates can advance world year before generation in every mode.''',
        '''  const templateRecurrence = recurrence.observe(state, input, c.mode);
  const requestLineage = lineage.observe(state, input, c.mode, sendIndex);
  const communitySourceHandoff = handoff.observe(state, input, c.mode, requestLineage, templateRecurrence);

  // Explicit user dates can advance world year before generation in every mode.''',
        'observe handoff',
    )

    text = repl_once(
        text,
        '''    requestLineageDepth: Number(requestLineage.depth || 0),
    requestLineageInlineSource: !!requestLineage.inlineSource,
  };''',
        '''    requestLineageDepth: Number(requestLineage.depth || 0),
    requestLineageInlineSource: !!requestLineage.inlineSource,
    communitySourceHandoffEligible: !!communitySourceHandoff.eligible,
    communitySourceHandoffSeen: !!communitySourceHandoff.seen,
    communitySourceHandoffNewSource: !!communitySourceHandoff.newSource,
    communitySourceHandoffHash: communitySourceHandoff.hash == null ? null : Number(communitySourceHandoff.hash),
    communitySourceHandoffChars: Number(communitySourceHandoff.normalizedChars || 0),
    communitySourceHandoffRootMode: communitySourceHandoff.rootMode || null,
    communitySourceHandoffRootIndex: Number(communitySourceHandoff.rootIndex ?? -1),
    communitySourceHandoffPriorRootMode: communitySourceHandoff.priorRootMode || null,
    communitySourceHandoffPriorRootIndex: Number(communitySourceHandoff.priorRootIndex ?? -1),
    communitySourceHandoffRegistrySize: Number(communitySourceHandoff.registrySize || 0),
    communitySourceHandoffReason: communitySourceHandoff.reason || 'ineligible',
  };''',
        'pending handoff state',
    )

    prompt_anchor = '''  if (p.templateRecurrenceRepeated) {
    lines.push('request_template_recurs_from_prior_history=1');
    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || recurrence.modeFamily(p.mode)}`);
    lines.push('prior_answer_is_not_a_content_template=1');
    lines.push('preserve_requested_fields_and_output_contract=1');
    lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');
    lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');
  }
  if (communityExpected > 0) {'''
    prompt_new = '''  if (p.templateRecurrenceRepeated) {
    lines.push('request_template_recurs_from_prior_history=1');
    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || recurrence.modeFamily(p.mode)}`);
    lines.push('prior_answer_is_not_a_content_template=1');
    lines.push('preserve_requested_fields_and_output_contract=1');
    lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');
    lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');
  }
  if (p.communitySourceHandoffNewSource) {
    lines.push(`short_community_request_reused_with_new_source=${p.communitySourceHandoffRootMode || 'unknown'}`);
    lines.push('derive_reaction_from_current_source_not_prior_answer=1');
  }
  if (communityExpected > 0) {'''
    text = repl_once(text, prompt_anchor, prompt_new, 'conditional prompt hint')

    text = repl_once(
        text,
        '''  let lastTemplateRecurrenceProbe = null;
  let lastRequestLineageProbe = null;

  const { perfNow, perfMs } = ops;''',
        '''  let lastTemplateRecurrenceProbe = null;
  let lastRequestLineageProbe = null;
  let lastCommunitySourceHandoffProbe = null;

  const { perfNow, perfMs } = ops;''',
        'runtime probe var',
    )

    probe_anchor = '''      } else {
        lastRequestLineageProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };'''
    probe_new = '''      } else {
        lastRequestLineageProbe = null;
      }
      if (pendingProbe) {
        lastCommunitySourceHandoffProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          eligible: !!pendingProbe.communitySourceHandoffEligible,
          seen: !!pendingProbe.communitySourceHandoffSeen,
          newSource: !!pendingProbe.communitySourceHandoffNewSource,
          normalizedChars: Number(pendingProbe.communitySourceHandoffChars || 0),
          rootMode: pendingProbe.communitySourceHandoffRootMode || null,
          rootIndex: Number(pendingProbe.communitySourceHandoffRootIndex ?? -1),
          priorRootMode: pendingProbe.communitySourceHandoffPriorRootMode || null,
          priorRootIndex: Number(pendingProbe.communitySourceHandoffPriorRootIndex ?? -1),
          registrySize: Number(pendingProbe.communitySourceHandoffRegistrySize || 0),
          reason: pendingProbe.communitySourceHandoffReason || 'ineligible',
          at: Date.now(),
        };
      } else {
        lastCommunitySourceHandoffProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };'''
    text = repl_once(text, probe_anchor, probe_new, 'runtime handoff probe')

    label_anchor = '''      const lineageLabel = lastRequestLineageProbe
        ? (lastRequestLineageProbe.sourceKind === 'INLINE'
          ? 'INLINE SOURCE'
          : (lastRequestLineageProbe.sourceKind === 'UNSEEDED'
            ? 'UNSEEDED'
            : `${lastRequestLineageProbe.rootMode || '?'} → ${String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B')} · depth ${Number(lastRequestLineageProbe.depth || 0)}`))
        : 'n/a';
      document.body.innerHTML = `'''
    label_new = '''      const lineageLabel = lastRequestLineageProbe
        ? (lastRequestLineageProbe.sourceKind === 'INLINE'
          ? 'INLINE SOURCE'
          : (lastRequestLineageProbe.sourceKind === 'UNSEEDED'
            ? 'UNSEEDED'
            : `${lastRequestLineageProbe.rootMode || '?'} → ${String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B')} · depth ${Number(lastRequestLineageProbe.depth || 0)}`))
        : 'n/a';
      const handoffLabel = lastCommunitySourceHandoffProbe
        ? (lastCommunitySourceHandoffProbe.newSource
          ? 'NEW SOURCE'
          : (lastCommunitySourceHandoffProbe.eligible
            ? (lastCommunitySourceHandoffProbe.seen ? 'SAME SOURCE' : 'FIRST')
            : 'INELIGIBLE'))
        : 'n/a';
      document.body.innerHTML = `'''
    text = repl_once(text, label_anchor, label_new, 'handoff panel label')

    text = repl_once(
        text,
        '<h1>⚙️ SimCore v0.62.24 <button id="close">닫기</button></h1>',
        '<h1>⚙️ SimCore v0.62.25 <button id="close">닫기</button></h1>',
        'panel version',
    )

    text = repl_once(
        text,
        '''<div class="metric"><div class="k">Request lineage</div><div class="v">${escapeHtml(lineageLabel)}</div></div>
<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>''',
        '''<div class="metric"><div class="k">Request lineage</div><div class="v">${escapeHtml(lineageLabel)}</div></div>
<div class="metric"><div class="k">Source handoff</div><div class="v">${escapeHtml(handoffLabel)}</div></div>
<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>''',
        'handoff metric',
    )

    text = repl_once(
        text,
        '''${lastRequestLineageProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Request lineage probe (runtime)</div><div>${escapeHtml(lineageLabel)}</div><div class="muted" style="margin-top:5px">root ${escapeHtml(lastRequestLineageProbe.rootMode || 'none')}@${Number(lastRequestLineageProbe.rootIndex)} · parent ${escapeHtml(lastRequestLineageProbe.parentMode || 'none')}@${Number(lastRequestLineageProbe.parentIndex)} · transition ${escapeHtml(lastRequestLineageProbe.transitionFrom || '?')} → ${escapeHtml(String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B'))}</div><div class="muted" style="margin-top:5px">recent A/B ${escapeHtml((lastRequestLineageProbe.recentSources || []).map((x) => `${x.mode}@${x.index}`).join(' · ') || 'none')} · diagnostics only · prompt +0</div></div>` : ''}
${recurrenceDiag ?''',
        '''${lastRequestLineageProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Request lineage probe (runtime)</div><div>${escapeHtml(lineageLabel)}</div><div class="muted" style="margin-top:5px">root ${escapeHtml(lastRequestLineageProbe.rootMode || 'none')}@${Number(lastRequestLineageProbe.rootIndex)} · parent ${escapeHtml(lastRequestLineageProbe.parentMode || 'none')}@${Number(lastRequestLineageProbe.parentIndex)} · transition ${escapeHtml(lastRequestLineageProbe.transitionFrom || '?')} → ${escapeHtml(String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B'))}</div><div class="muted" style="margin-top:5px">recent A/B ${escapeHtml((lastRequestLineageProbe.recentSources || []).map((x) => `${x.mode}@${x.index}`).join(' · ') || 'none')} · diagnostics only · prompt +0</div></div>` : ''}
${lastCommunitySourceHandoffProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Community source handoff (runtime)</div><div>${escapeHtml(handoffLabel)} · registry ${Number(lastCommunitySourceHandoffProbe.registrySize || 0)}</div><div class="muted" style="margin-top:5px">current ${escapeHtml(lastCommunitySourceHandoffProbe.rootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.rootIndex)} · prior ${escapeHtml(lastCommunitySourceHandoffProbe.priorRootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.priorRootIndex)} · request chars ${Number(lastCommunitySourceHandoffProbe.normalizedChars || 0)}</div><div class="muted" style="margin-top:5px">${lastCommunitySourceHandoffProbe.newSource ? '2-line current-source hint injected' : 'prompt +0'} · ${escapeHtml(lastCommunitySourceHandoffProbe.reason || 'ineligible')}</div></div>` : ''}
${recurrenceDiag ?''',
        'handoff panel card',
    )

    text = text.replace('[simcore/v0.62.24]', '[simcore/v0.62.25]')

    path.write_text(text, encoding='utf-8')
    print(f'{path}: patched {len(text)} bytes')
