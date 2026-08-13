from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

HANDOFF_MODULE = r'''SimCore.define("handoff", function (require, module, exports) {
const COMMUNITY_SOURCE_HANDOFF_VERSION = 2;
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

function parentFamily(parentMode) {
  const m = String(parentMode || '');
  if (/^B_/.test(m) || m === 'B') return 'B';
  if (m === 'C') return 'C';
  if (m === 'A') return 'A';
  return null;
}

function normalizedDepth(v, fallback = -1) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback;
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
    const parentMode = parentFamily(row?.parentMode);
    const parentIndex = intIndex(row?.parentIndex);
    const depth = normalizedDepth(row?.depth, -1);
    const prior = out.findIndex((x) => x.hash === h);
    if (prior >= 0) out.splice(prior, 1);
    out.push({
      hash: h,
      rootMode,
      rootIndex,
      parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
      parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
      depth,
    });
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
  const parentMode = parentFamily(requestLineage?.parentMode);
  const parentIndex = intIndex(requestLineage?.parentIndex);
  const depth = normalizedDepth(requestLineage?.depth, 0);
  const base = {
    eligible: false,
    seen: false,
    newSource: false,
    parentComparable: false,
    parentShift: false,
    hash: null,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    parentMode,
    parentIndex,
    depth,
    priorRootMode: null,
    priorRootIndex: -1,
    priorParentMode: null,
    priorParentIndex: -1,
    priorDepth: -1,
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
  const sameRoot = !!prior && !newSource;
  const priorParentMode = parentFamily(prior?.parentMode);
  const priorParentIndex = intIndex(prior?.parentIndex);
  const priorDepth = normalizedDepth(prior?.depth, -1);
  // v1 registry rows did not carry parent/depth. Treat the first v2 observation as a baseline
  // rather than inventing a shift; the next recurrence can then be compared deterministically.
  const parentComparable = !!(
    sameRoot
    && priorParentMode && priorParentIndex >= 0 && priorDepth >= 0
    && parentMode && parentIndex >= 0
  );
  const parentShift = !!(
    parentComparable
    && (priorParentMode !== parentMode || priorParentIndex !== parentIndex || priorDepth !== depth)
  );

  if (idx >= 0) registry.splice(idx, 1);
  registry.push({
    hash,
    rootMode,
    rootIndex,
    parentMode: parentMode && parentIndex >= 0 ? parentMode : null,
    parentIndex: parentMode && parentIndex >= 0 ? parentIndex : -1,
    depth,
  });
  if (registry.length > HANDOFF_REGISTRY_LIMIT) registry.splice(0, registry.length - HANDOFF_REGISTRY_LIMIT);
  state.communitySourceRegistry = registry;

  return {
    eligible: true,
    seen,
    newSource,
    parentComparable,
    parentShift,
    hash,
    normalizedChars: normalized.length,
    rootMode,
    rootIndex,
    parentMode,
    parentIndex,
    depth,
    priorRootMode: prior?.rootMode || null,
    priorRootIndex: prior ? intIndex(prior.rootIndex) : -1,
    priorParentMode,
    priorParentIndex,
    priorDepth,
    registrySize: registry.length,
    reason: newSource
      ? 'same-short-request-new-source'
      : (parentShift
        ? 'same-root-new-parent'
        : (seen
          ? (parentComparable ? 'same-source-same-parent' : 'same-root-parent-baseline')
          : 'first')),
  };
}

module.exports = {
  COMMUNITY_SOURCE_HANDOFF_VERSION,
  HANDOFF_REGISTRY_LIMIT,
  sourceFamily,
  parentFamily,
  normalizeRegistry,
  normalizeShortRequest,
  hashRequest,
  observe,
};
});
'''

CHANGELOG = r'''// v0.62.26 Community Parent-Shift Probe:
// - Diagnostics/state only: observes repeated short Community requests that stay on the same A/B/C lineage root while their direct parent/depth changes
// - Extends the bounded short-request registry with parent mode/index/depth only; no source/content body is stored
// - Existing v1 registry rows establish a v2 parent baseline on first observation instead of guessing a shift
// - NEW SOURCE behavior from v0.62.25 is unchanged; parent-shift observations inject no generation guidance
// - No history bootstrap/rescan, no auxiliary model, no new pluginStorage API call sites, and zero new runtime-prompt tokens
//
'''

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.25' not in text:
        raise SystemExit(f'{path}: expected v0.62.25 base')

    text = text.replace('//@version 0.62.25', '//@version 0.62.26', 1)
    text = text.replace(
        '//@display-name SimCore v0.62.25 Community New-Source Guard ABC',
        '//@display-name SimCore v0.62.26 Community Parent-Shift Probe',
        1,
    )
    marker = '// v0.62.25 Community New-Source Guard ABC:\n'
    if CHANGELOG not in text:
        text = text.replace(marker, CHANGELOG + marker, 1)

    start = text.index('SimCore.define("handoff", function (require, module, exports) {')
    end = text.index('\n\nSimCore.define("kernel", function (require, module, exports) {', start)
    text = text[:start] + HANDOFF_MODULE.rstrip() + text[end:]

    text = text.replace('    communitySourceHandoffVersion: 1,', '    communitySourceHandoffVersion: 2,', 1)

    old_pending = '''    communitySourceHandoffEligible: !!communitySourceHandoff.eligible,\n    communitySourceHandoffSeen: !!communitySourceHandoff.seen,\n    communitySourceHandoffNewSource: !!communitySourceHandoff.newSource,\n    communitySourceHandoffHash: communitySourceHandoff.hash == null ? null : Number(communitySourceHandoff.hash),\n    communitySourceHandoffChars: Number(communitySourceHandoff.normalizedChars || 0),\n    communitySourceHandoffRootMode: communitySourceHandoff.rootMode || null,\n    communitySourceHandoffRootIndex: Number(communitySourceHandoff.rootIndex ?? -1),\n    communitySourceHandoffPriorRootMode: communitySourceHandoff.priorRootMode || null,\n    communitySourceHandoffPriorRootIndex: Number(communitySourceHandoff.priorRootIndex ?? -1),\n    communitySourceHandoffRegistrySize: Number(communitySourceHandoff.registrySize || 0),\n    communitySourceHandoffReason: communitySourceHandoff.reason || 'ineligible',\n'''
    new_pending = '''    communitySourceHandoffEligible: !!communitySourceHandoff.eligible,\n    communitySourceHandoffSeen: !!communitySourceHandoff.seen,\n    communitySourceHandoffNewSource: !!communitySourceHandoff.newSource,\n    communitySourceHandoffParentComparable: !!communitySourceHandoff.parentComparable,\n    communitySourceHandoffParentShift: !!communitySourceHandoff.parentShift,\n    communitySourceHandoffHash: communitySourceHandoff.hash == null ? null : Number(communitySourceHandoff.hash),\n    communitySourceHandoffChars: Number(communitySourceHandoff.normalizedChars || 0),\n    communitySourceHandoffRootMode: communitySourceHandoff.rootMode || null,\n    communitySourceHandoffRootIndex: Number(communitySourceHandoff.rootIndex ?? -1),\n    communitySourceHandoffParentMode: communitySourceHandoff.parentMode || null,\n    communitySourceHandoffParentIndex: Number(communitySourceHandoff.parentIndex ?? -1),\n    communitySourceHandoffDepth: Number(communitySourceHandoff.depth ?? -1),\n    communitySourceHandoffPriorRootMode: communitySourceHandoff.priorRootMode || null,\n    communitySourceHandoffPriorRootIndex: Number(communitySourceHandoff.priorRootIndex ?? -1),\n    communitySourceHandoffPriorParentMode: communitySourceHandoff.priorParentMode || null,\n    communitySourceHandoffPriorParentIndex: Number(communitySourceHandoff.priorParentIndex ?? -1),\n    communitySourceHandoffPriorDepth: Number(communitySourceHandoff.priorDepth ?? -1),\n    communitySourceHandoffRegistrySize: Number(communitySourceHandoff.registrySize || 0),\n    communitySourceHandoffReason: communitySourceHandoff.reason || 'ineligible',\n'''
    if old_pending not in text:
        raise SystemExit(f'{path}: pending handoff block not found')
    text = text.replace(old_pending, new_pending, 1)

    old_probe = '''          eligible: !!pendingProbe.communitySourceHandoffEligible,\n          seen: !!pendingProbe.communitySourceHandoffSeen,\n          newSource: !!pendingProbe.communitySourceHandoffNewSource,\n          normalizedChars: Number(pendingProbe.communitySourceHandoffChars || 0),\n          rootMode: pendingProbe.communitySourceHandoffRootMode || null,\n          rootIndex: Number(pendingProbe.communitySourceHandoffRootIndex ?? -1),\n          priorRootMode: pendingProbe.communitySourceHandoffPriorRootMode || null,\n          priorRootIndex: Number(pendingProbe.communitySourceHandoffPriorRootIndex ?? -1),\n          registrySize: Number(pendingProbe.communitySourceHandoffRegistrySize || 0),\n          reason: pendingProbe.communitySourceHandoffReason || 'ineligible',\n'''
    new_probe = '''          eligible: !!pendingProbe.communitySourceHandoffEligible,\n          seen: !!pendingProbe.communitySourceHandoffSeen,\n          newSource: !!pendingProbe.communitySourceHandoffNewSource,\n          parentComparable: !!pendingProbe.communitySourceHandoffParentComparable,\n          parentShift: !!pendingProbe.communitySourceHandoffParentShift,\n          normalizedChars: Number(pendingProbe.communitySourceHandoffChars || 0),\n          rootMode: pendingProbe.communitySourceHandoffRootMode || null,\n          rootIndex: Number(pendingProbe.communitySourceHandoffRootIndex ?? -1),\n          parentMode: pendingProbe.communitySourceHandoffParentMode || null,\n          parentIndex: Number(pendingProbe.communitySourceHandoffParentIndex ?? -1),\n          depth: Number(pendingProbe.communitySourceHandoffDepth ?? -1),\n          priorRootMode: pendingProbe.communitySourceHandoffPriorRootMode || null,\n          priorRootIndex: Number(pendingProbe.communitySourceHandoffPriorRootIndex ?? -1),\n          priorParentMode: pendingProbe.communitySourceHandoffPriorParentMode || null,\n          priorParentIndex: Number(pendingProbe.communitySourceHandoffPriorParentIndex ?? -1),\n          priorDepth: Number(pendingProbe.communitySourceHandoffPriorDepth ?? -1),\n          registrySize: Number(pendingProbe.communitySourceHandoffRegistrySize || 0),\n          reason: pendingProbe.communitySourceHandoffReason || 'ineligible',\n'''
    if old_probe not in text:
        raise SystemExit(f'{path}: runtime handoff probe block not found')
    text = text.replace(old_probe, new_probe, 1)

    old_label = '''      const handoffLabel = lastCommunitySourceHandoffProbe\n        ? (lastCommunitySourceHandoffProbe.newSource\n          ? 'NEW SOURCE'\n          : (lastCommunitySourceHandoffProbe.eligible\n            ? (lastCommunitySourceHandoffProbe.seen ? 'SAME SOURCE' : 'FIRST')\n            : 'INELIGIBLE'))\n        : 'n/a';\n'''
    new_label = old_label + '''      const parentShiftLabel = lastCommunitySourceHandoffProbe\n        ? (lastCommunitySourceHandoffProbe.newSource\n          ? 'NEW ROOT'\n          : (!lastCommunitySourceHandoffProbe.eligible\n            ? 'INELIGIBLE'\n            : (!lastCommunitySourceHandoffProbe.seen\n              ? 'FIRST'\n              : (lastCommunitySourceHandoffProbe.parentShift\n                ? 'NEW PARENT'\n                : (lastCommunitySourceHandoffProbe.parentComparable ? 'SAME PARENT' : 'BASELINE')))))\n        : 'n/a';\n'''
    if old_label not in text:
        raise SystemExit(f'{path}: handoff label block not found')
    text = text.replace(old_label, new_label, 1)

    metric = '<div class=\\"metric\\"><div class=\\"k\\">Source handoff</div><div class=\\"v\\">${escapeHtml(handoffLabel)}</div></div>\n'
    metric_new = metric + '<div class=\\"metric\\"><div class=\\"k\\">Parent shift</div><div class=\\"v\\">${escapeHtml(parentShiftLabel)}</div></div>\n'
    if metric not in text:
        raise SystemExit(f'{path}: source handoff metric not found')
    text = text.replace(metric, metric_new, 1)

    handoff_card = '''${lastCommunitySourceHandoffProbe ? `<div class=\\"card\\"><div class=\\"k\\" style=\\"margin-bottom:8px\\">Community source handoff (runtime)</div><div>${escapeHtml(handoffLabel)} · registry ${Number(lastCommunitySourceHandoffProbe.registrySize || 0)}</div><div class=\\"muted\\" style=\\"margin-top:5px\\">current ${escapeHtml(lastCommunitySourceHandoffProbe.rootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.rootIndex)} · prior ${escapeHtml(lastCommunitySourceHandoffProbe.priorRootMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.priorRootIndex)} · request chars ${Number(lastCommunitySourceHandoffProbe.normalizedChars || 0)}</div><div class=\\"muted\\" style=\\"margin-top:5px\\">${lastCommunitySourceHandoffProbe.newSource ? '2-line current-source hint injected' : 'prompt +0'} · ${escapeHtml(lastCommunitySourceHandoffProbe.reason || 'ineligible')}</div></div>` : ''}\n'''
    parent_card = '''${lastCommunitySourceHandoffProbe ? `<div class=\\"card\\"><div class=\\"k\\" style=\\"margin-bottom:8px\\">Community parent-shift probe (runtime)</div><div>${escapeHtml(parentShiftLabel)} · same-root follow-up diagnostics</div><div class=\\"muted\\" style=\\"margin-top:5px\\">current parent ${escapeHtml(lastCommunitySourceHandoffProbe.parentMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.parentIndex)} depth ${Number(lastCommunitySourceHandoffProbe.depth)} · prior parent ${escapeHtml(lastCommunitySourceHandoffProbe.priorParentMode || 'none')}@${Number(lastCommunitySourceHandoffProbe.priorParentIndex)} depth ${Number(lastCommunitySourceHandoffProbe.priorDepth)}</div><div class=\\"muted\\" style=\\"margin-top:5px\\">diagnostics/state only · prompt +0 · no semantic decision</div></div>` : ''}\n'''
    if handoff_card not in text:
        raise SystemExit(f'{path}: handoff detail card not found')
    text = text.replace(handoff_card, handoff_card + parent_card, 1)

    text = text.replace('<h1>⚙️ SimCore v0.62.25 <button', '<h1>⚙️ SimCore v0.62.26 <button', 1)
    text = text.replace('[simcore/v0.62.25]', '[simcore/v0.62.26]')
    text = text.replace(
        '<div class=\\"card muted\\">v0.62.24 Narrative Current-Time Floor · A/C current timestamp monotonic · B airtime unchanged</div>',
        '<div class=\\"card muted\\">v0.62.26 Parent-Shift Probe · diagnostics/state only · prompt +0 · v0.62.24 current-time floor retained</div>',
        1,
    )

    path.write_text(text, encoding='utf-8')

if paths[0].read_bytes() != paths[1].read_bytes():
    raise SystemExit('latest.js and install.js diverged after patch')
print('patched v0.62.26')
