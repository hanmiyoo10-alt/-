from pathlib import Path

paths=[Path('plugins/simcore/latest.js'),Path('plugins/simcore/install.js')]
lineage_module=r'''SimCore.define("lineage", function (require, module, exports) {
const LINEAGE_VERSION = 1;
const COMMUNITY_MARKER = '[커뮤니티]';
const RECENT_SOURCE_LIMIT = 4;

function intIndex(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

function modeFamily(mode) {
  const m = String(mode || 'A');
  if (/^B_/.test(m)) return 'B';
  if (m === 'C') return 'C';
  return 'A';
}

function normalizeRecent(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of src) {
    const mode = row?.mode === 'B' ? 'B' : 'A';
    const index = intIndex(row?.index);
    if (index < 0) continue;
    if (out.length && out[out.length - 1].mode === mode && out[out.length - 1].index === index) continue;
    out.push({ mode, index });
  }
  return out.slice(-RECENT_SOURCE_LIMIT);
}

function normalizeLineage(raw) {
  const x = raw && typeof raw === 'object' ? raw : {};
  const rootMode = ['A', 'B', 'INLINE_C'].includes(x.rootMode) ? x.rootMode : null;
  const rootIndex = intIndex(x.rootIndex);
  const parentMode = ['A', 'B', 'C'].includes(x.parentMode) ? x.parentMode : null;
  const parentIndex = intIndex(x.parentIndex);
  const lastRequestMode = ['A', 'B', 'C'].includes(x.lastRequestMode) ? x.lastRequestMode : null;
  const lastRequestIndex = intIndex(x.lastRequestIndex);
  return {
    version: LINEAGE_VERSION,
    rootMode: rootMode && rootIndex >= 0 ? rootMode : null,
    rootIndex: rootMode && rootIndex >= 0 ? rootIndex : -1,
    parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
    parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
    depth: Math.max(0, Math.round(Number(x.depth) || 0)),
    inlineSource: !!x.inlineSource,
    sourceKind: ['ROOT', 'CHAIN', 'INLINE', 'UNSEEDED'].includes(x.sourceKind) ? x.sourceKind : 'UNSEEDED',
    lastRequestMode: lastRequestMode && lastRequestIndex >= 0 ? lastRequestMode : null,
    lastRequestIndex: lastRequestMode && lastRequestIndex >= 0 ? lastRequestIndex : -1,
    transitionFrom: ['A', 'B', 'C'].includes(x.transitionFrom) ? x.transitionFrom : null,
    recentSources: normalizeRecent(x.recentSources),
  };
}

function inlineSourceInfo(userText) {
  const text = String(userText || '');
  const marker = text.indexOf(COMMUNITY_MARKER);
  if (marker < 0) return { active: false, prefixChars: 0 };
  const prefix = text.slice(0, marker)
    .replace(/\[방송\s*(?:시작|중|종료)\]/g, '')
    .trim();
  const compact = prefix.replace(/\s+/g, '');
  return { active: compact.length >= 8, prefixChars: prefix.length };
}

function pushRecent(list, mode, index) {
  const out = normalizeRecent(list);
  const row = { mode, index };
  if (!out.length || out[out.length - 1].mode !== mode || out[out.length - 1].index !== index) out.push(row);
  return out.slice(-RECENT_SOURCE_LIMIT);
}

function observe(state, userText, mode, sendIndex) {
  const prev = normalizeLineage(state?.requestLineage);
  const family = modeFamily(mode);
  const index = intIndex(sendIndex);
  const next = { ...prev, transitionFrom: prev.lastRequestMode };
  const inline = family === 'C' ? inlineSourceInfo(userText) : { active: false, prefixChars: 0 };

  if (family === 'A') {
    next.rootMode = 'A';
    next.rootIndex = index;
    next.parentMode = 'A';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = false;
    next.sourceKind = 'ROOT';
    next.recentSources = pushRecent(prev.recentSources, 'A', index);
  } else if (family === 'B') {
    const sameEpisode = String(mode || '') !== 'B_START' && prev.rootMode === 'B' && prev.rootIndex >= 0;
    next.rootMode = sameEpisode ? prev.rootMode : 'B';
    next.rootIndex = sameEpisode ? prev.rootIndex : index;
    next.parentMode = 'B';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = false;
    next.sourceKind = 'ROOT';
    next.recentSources = sameEpisode ? prev.recentSources : pushRecent(prev.recentSources, 'B', index);
  } else if (inline.active) {
    next.rootMode = 'INLINE_C';
    next.rootIndex = index;
    next.parentMode = 'C';
    next.parentIndex = index;
    next.depth = 0;
    next.inlineSource = true;
    next.sourceKind = 'INLINE';
  } else {
    next.parentMode = prev.lastRequestMode;
    next.parentIndex = prev.lastRequestIndex;
    next.depth = prev.lastRequestMode === 'C' ? prev.depth + 1 : 1;
    next.inlineSource = false;
    next.sourceKind = prev.rootMode && prev.rootIndex >= 0 ? 'CHAIN' : 'UNSEEDED';
  }

  next.lastRequestMode = family;
  next.lastRequestIndex = index;
  next.version = LINEAGE_VERSION;
  state.requestLineageVersion = LINEAGE_VERSION;
  state.requestLineage = normalizeLineage(next);
  return {
    ...state.requestLineage,
    currentMode: family,
    inlinePrefixChars: inline.prefixChars || 0,
  };
}

module.exports = {
  LINEAGE_VERSION,
  RECENT_SOURCE_LIMIT,
  modeFamily,
  normalizeLineage,
  inlineSourceInfo,
  observe,
};
});

'''

for p in paths:
    s=p.read_text(encoding='utf-8')
    assert '//@version 0.62.22' in s
    s=s.replace('//@version 0.62.22','//@version 0.62.23',1)
    s=s.replace('//@display-name SimCore v0.62.22 Template Recurrence Guard ABC','//@display-name SimCore v0.62.23 Request Lineage Probe',1)
    marker='// v0.62.22 Template Recurrence Guard ABC:\n'
    intro=('// v0.62.23 Request Lineage Probe:\n'
           '// - Diagnostics/state only: observes A/B/C request lineage without changing generation guidance\n'
           '// - Tracks root source, direct parent, C-chain depth, inline current-input source, and a tiny recent A/B source window\n'
           '// - Mode B episode segments share one B root until a new B_START; Mode C can chain from A, B, C, or inline source\n'
           '// - No history rescan/bootstrap, no auxiliary model, no new pluginStorage API calls, and zero new runtime-prompt tokens\n'
           '// - Snapshot-aware and rewind-safe; existing Broadcast/Community/Reaction/Narrative/Recurrence semantics are unchanged\n'
           '//\n')
    s=s.replace(marker,intro+marker,1)
    kernel_marker='SimCore.define("kernel", function (require, module, exports) {'
    assert kernel_marker in s and 'SimCore.define("lineage"' not in s
    s=s.replace(kernel_marker,lineage_module+kernel_marker,1)

    s=s.replace("const recurrence = require('./recurrence');\n\nconst STATE_VERSION", "const recurrence = require('./recurrence');\nconst lineage = require('./lineage');\n\nconst STATE_VERSION",1)
    s=s.replace("    templateRegistry: [],\n    broadcastLocked:", "    templateRegistry: [],\n    requestLineageVersion: 1,\n    requestLineage: lineage.normalizeLineage(null),\n    broadcastLocked:",1)
    s=s.replace("  s.templateRegistry = recurrence.normalizeRegistry(s.templateRegistry);\n  s.broadcastLocked", "  s.templateRegistry = recurrence.normalizeRegistry(s.templateRegistry);\n  s.requestLineageVersion = Math.max(1, Math.round(Number(s.requestLineageVersion) || 0));\n  s.requestLineage = lineage.normalizeLineage(s.requestLineage);\n  s.broadcastLocked",1)

    s=s.replace("const recurrence = require('./recurrence');\n\nfunction classifyMode", "const recurrence = require('./recurrence');\nconst lineage = require('./lineage');\n\nfunction classifyMode",1)
    s=s.replace("  const templateRecurrence = recurrence.observe(state, input, c.mode);\n\n  // Explicit user dates", "  const templateRecurrence = recurrence.observe(state, input, c.mode);\n  const requestLineage = lineage.observe(state, input, c.mode, sendIndex);\n\n  // Explicit user dates",1)
    s=s.replace("    templateRegistrySize: Number(templateRecurrence.registrySize || 0),\n  };", "    templateRegistrySize: Number(templateRecurrence.registrySize || 0),\n    requestLineageSourceKind: requestLineage.sourceKind || 'UNSEEDED',\n    requestLineageRootMode: requestLineage.rootMode || null,\n    requestLineageRootIndex: Number(requestLineage.rootIndex ?? -1),\n    requestLineageParentMode: requestLineage.parentMode || null,\n    requestLineageParentIndex: Number(requestLineage.parentIndex ?? -1),\n    requestLineageDepth: Number(requestLineage.depth || 0),\n    requestLineageInlineSource: !!requestLineage.inlineSource,\n  };",1)

    s=s.replace("  let lastTemplateRecurrenceProbe = null;\n", "  let lastTemplateRecurrenceProbe = null;\n  let lastRequestLineageProbe = null;\n",1)
    old="""      } else {
        lastTemplateRecurrenceProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };
"""
    new="""      } else {
        lastTemplateRecurrenceProbe = null;
      }
      if (pendingProbe) {
        const l = result.state.requestLineage || {};
        lastRequestLineageProbe = {
          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,
          currentMode: pendingProbe.mode || null,
          transitionFrom: l.transitionFrom || null,
          sourceKind: l.sourceKind || 'UNSEEDED',
          rootMode: l.rootMode || null,
          rootIndex: Number(l.rootIndex ?? -1),
          parentMode: l.parentMode || null,
          parentIndex: Number(l.parentIndex ?? -1),
          depth: Number(l.depth || 0),
          inlineSource: !!l.inlineSource,
          recentSources: Array.isArray(l.recentSources) ? l.recentSources.slice(-4) : [],
          at: Date.now(),
        };
      } else {
        lastRequestLineageProbe = null;
      }
      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };
"""
    assert old in s
    s=s.replace(old,new,1)

    s=s.replace("      const recurrenceLabel = lastTemplateRecurrenceProbe\n        ? (lastTemplateRecurrenceProbe.eligible ? (lastTemplateRecurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE')\n        : 'n/a';\n", "      const recurrenceLabel = lastTemplateRecurrenceProbe\n        ? (lastTemplateRecurrenceProbe.eligible ? (lastTemplateRecurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE')\n        : 'n/a';\n      const lineageLabel = lastRequestLineageProbe\n        ? (lastRequestLineageProbe.sourceKind === 'INLINE'\n          ? 'INLINE SOURCE'\n          : (lastRequestLineageProbe.sourceKind === 'UNSEEDED'\n            ? 'UNSEEDED'\n            : `${lastRequestLineageProbe.rootMode || '?'} → ${String(lastRequestLineageProbe.currentMode || '?').replace(/^B_.*/, 'B')} · depth ${Number(lastRequestLineageProbe.depth || 0)}`))\n        : 'n/a';\n",1)
    s=s.replace('<h1>⚙️ SimCore v0.62.22 <button id="close">닫기</button></h1>','<h1>⚙️ SimCore v0.62.23 <button id="close">닫기</button></h1>',1)
    s=s.replace('<div class="metric"><div class="k">Template recurrence</div><div class="v">${recurrenceLabel}</div></div>','<div class="metric"><div class="k">Template recurrence</div><div class="v">${recurrenceLabel}</div></div>\n<div class="metric"><div class="k">Request lineage</div><div class="v">${escapeHtml(lineageLabel)}</div></div>',1)
    panel_anchor='${lastTemplateRecurrenceProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Template recurrence guard (runtime)</div><div>${escapeHtml(recurrenceLabel)} · mode ${escapeHtml(lastTemplateRecurrenceProbe.modeFamily || \'?\')} · registry ${Number(lastTemplateRecurrenceProbe.registrySize || 0)}</div><div class="muted" style="margin-top:5px">template chars ${Number(lastTemplateRecurrenceProbe.normalizedChars || 0)} · ${lastTemplateRecurrenceProbe.repeated ? \'delta/variation hint injected\' : \'no recurrence hint\'}</div></div>` : \'\'}\n'
    assert panel_anchor in s
    lineage_card='${lastRequestLineageProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Request lineage probe (runtime)</div><div>${escapeHtml(lineageLabel)}</div><div class="muted" style="margin-top:5px">root ${escapeHtml(lastRequestLineageProbe.rootMode || \'none\')}@${Number(lastRequestLineageProbe.rootIndex)} · parent ${escapeHtml(lastRequestLineageProbe.parentMode || \'none\')}@${Number(lastRequestLineageProbe.parentIndex)} · transition ${escapeHtml(lastRequestLineageProbe.transitionFrom || \'?\')} → ${escapeHtml(String(lastRequestLineageProbe.currentMode || \'?\').replace(/^B_.*/, \'B\'))}</div><div class="muted" style="margin-top:5px">recent A/B ${escapeHtml((lastRequestLineageProbe.recentSources || []).map((x) => `${x.mode}@${x.index}`).join(\' · \') || \'none\')} · diagnostics only · prompt +0</div></div>` : \'\'}\n'
    s=s.replace(panel_anchor,panel_anchor+lineage_card,1)

    s=s.replace('[simcore/v0.62.22]', '[simcore/v0.62.23]')
    p.write_text(s,encoding='utf-8')
print('patched v0.62.23', paths[0].stat().st_size)
