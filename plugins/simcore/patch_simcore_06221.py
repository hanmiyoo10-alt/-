from pathlib import Path

p = Path('plugins/simcore/latest.js')
s = p.read_text(encoding='utf-8')
orig = s

def replace_once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {n}')
    s = s.replace(old, new, 1)

replace_once('//@version 0.62.20', '//@version 0.62.21', 'version')
replace_once('//@display-name SimCore v0.62.20 Narrative Clock Diagnostics', '//@display-name SimCore v0.62.21 Template Recurrence Guard', 'display-name')
replace_once('// v0.62.20 Narrative Clock Diagnostics:', '''// v0.62.21 Template Recurrence Guard:\n// - Detects recurring detailed [커뮤니티] request templates without auxiliary-model calls\n// - One-time migration bootstrap scans pre-update user history only; current input is excluded\n// - Repeated templates keep the requested fields/format but prompt the model to reevaluate current-event delta, emphasis, reactions, and wording\n// - Existing outputs are never rewritten; recurrence guidance affects only new generations\n// - Registry is compact, bounded, snapshot-aware, and rewind-safe; no new storage API calls\n//\n// v0.62.20 Narrative Clock Diagnostics:''', 'release note')

recurrence_module = r'''SimCore.define("recurrence", function (require, module, exports) {
const TEMPLATE_RECURRENCE_VERSION = 1;
const TEMPLATE_REGISTRY_LIMIT = 384;
const COMMUNITY_MARKER = '[커뮤니티]';
const TEMPLATE_MAX_CHARS = 4096;
const TEMPLATE_MIN_CHARS = 32;

function normalizeRegistry(raw) {
  const src = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const value of src) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    const h = n >>> 0;
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(h);
  }
  return out.slice(-TEMPLATE_REGISTRY_LIMIT);
}

function communityDirective(userText) {
  const text = String(userText || '');
  const idx = text.indexOf(COMMUNITY_MARKER);
  if (idx < 0) return '';
  return text.slice(idx + COMMUNITY_MARKER.length, idx + COMMUNITY_MARKER.length + TEMPLATE_MAX_CHARS);
}

function normalizeTemplate(userText) {
  let directive = communityDirective(userText);
  if (!directive) return '';
  try { directive = directive.normalize('NFKC'); } catch { /* older JS runtime */ }

  // When a long parenthetical checklist exists, it is the reusable request schema; the event/title
  // before it is current-turn content and should not prevent recurrence detection across years/events.
  const open = directive.indexOf('(');
  const close = directive.lastIndexOf(')');
  if (open >= 0 && close > open && (close - open) >= TEMPLATE_MIN_CHARS) directive = directive.slice(open);

  return directive
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[“”‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hashTemplate(normalized) {
  const text = String(normalized || '');
  if (text.length < TEMPLATE_MIN_CHARS) return null;
  let h = 2166136261 >>> 0;
  const seed = `${text.length}:`;
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

function templateFingerprint(userText) {
  const normalized = normalizeTemplate(userText);
  const hash = hashTemplate(normalized);
  return {
    eligible: hash != null,
    hash,
    normalizedChars: normalized.length,
  };
}

function touchRegistry(registry, hash) {
  const list = normalizeRegistry(registry);
  const h = Number(hash) >>> 0;
  const idx = list.indexOf(h);
  const repeated = idx >= 0;
  if (idx >= 0) list.splice(idx, 1);
  list.push(h);
  if (list.length > TEMPLATE_REGISTRY_LIMIT) list.splice(0, list.length - TEMPLATE_REGISTRY_LIMIT);
  return { list, repeated };
}

function observe(state, userText) {
  const fp = templateFingerprint(userText);
  state.templateRegistry = normalizeRegistry(state.templateRegistry);
  state.templateRecurrenceVersion = TEMPLATE_RECURRENCE_VERSION;
  if (!fp.eligible) {
    return { ...fp, repeated: false, registrySize: state.templateRegistry.length };
  }
  const touched = touchRegistry(state.templateRegistry, fp.hash);
  state.templateRegistry = touched.list;
  return { ...fp, repeated: touched.repeated, registrySize: state.templateRegistry.length };
}

function needsBootstrap(state) {
  return Math.max(0, Number(state?.templateRecurrenceVersion || 0)) < TEMPLATE_RECURRENCE_VERSION;
}

function bootstrapState(state, messages, stopExclusive, getText) {
  const rows = Array.isArray(messages) ? messages : [];
  const stop = Number.isInteger(Number(stopExclusive))
    ? Math.max(0, Math.min(Number(stopExclusive), rows.length))
    : rows.length;
  let registry = normalizeRegistry(state.templateRegistry);
  let visited = 0;
  let userMessages = 0;
  let communityInputs = 0;
  let eligibleTemplates = 0;
  let repeatedTemplates = 0;
  let normalizedChars = 0;

  for (let i = 0; i < stop; i++) {
    visited += 1;
    const row = rows[i] || {};
    if (row.role !== 'user') continue;
    userMessages += 1;
    const text = typeof getText === 'function'
      ? getText(row)
      : String(row.data ?? row.content ?? row.text ?? '');
    if (!String(text || '').includes(COMMUNITY_MARKER)) continue;
    communityInputs += 1;
    const fp = templateFingerprint(text);
    normalizedChars += fp.normalizedChars || 0;
    if (!fp.eligible) continue;
    eligibleTemplates += 1;
    const touched = touchRegistry(registry, fp.hash);
    registry = touched.list;
    if (touched.repeated) repeatedTemplates += 1;
  }

  state.templateRegistry = registry;
  state.templateRecurrenceVersion = TEMPLATE_RECURRENCE_VERSION;
  const stats = {
    version: TEMPLATE_RECURRENCE_VERSION,
    scannedThroughExclusive: stop,
    visited,
    userMessages,
    communityInputs,
    eligibleTemplates,
    repeatedTemplates,
    registrySize: registry.length,
    normalizedChars,
  };
  return { state, stats };
}

module.exports = {
  TEMPLATE_RECURRENCE_VERSION,
  TEMPLATE_REGISTRY_LIMIT,
  normalizeRegistry,
  normalizeTemplate,
  templateFingerprint,
  observe,
  needsBootstrap,
  bootstrapState,
};
});

'''
replace_once('SimCore.define("kernel", function (require, module, exports) {', recurrence_module + 'SimCore.define("kernel", function (require, module, exports) {', 'recurrence module insert')

replace_once("const { normalizePlatformMaxMap } = require('./community');\n\nconst STATE_VERSION = 5;\nconst CORE_STATE_VERSION = 9;",
             "const { normalizePlatformMaxMap } = require('./community');\nconst recurrence = require('./recurrence');\n\nconst STATE_VERSION = 5;\nconst CORE_STATE_VERSION = 10;", 'kernel imports/version')
replace_once('    historyBootstrapStats: null,\n    broadcastLocked: false,',
             '    historyBootstrapStats: null,\n    templateRecurrenceVersion: recurrence.TEMPLATE_RECURRENCE_VERSION,\n    templateRegistry: [],\n    broadcastLocked: false,', 'initial recurrence state')
replace_once('  const legacyYear = s.worldYear ?? s.narrativeYear;\n\n  s.stateVersion = STATE_VERSION;',
             "  const legacyYear = s.worldYear ?? s.narrativeYear;\n  const hadTemplateRecurrenceVersion = Object.prototype.hasOwnProperty.call(s, 'templateRecurrenceVersion');\n\n  s.stateVersion = STATE_VERSION;", 'reconcile migration marker')
replace_once("  s.historyBootstrapStats = s.historyBootstrapStats && typeof s.historyBootstrapStats === 'object' ? s.historyBootstrapStats : null;\n  s.broadcastLocked = !!s.broadcastLocked;",
             "  s.historyBootstrapStats = s.historyBootstrapStats && typeof s.historyBootstrapStats === 'object' ? s.historyBootstrapStats : null;\n  s.templateRecurrenceVersion = hadTemplateRecurrenceVersion ? Math.max(0, Math.round(Number(s.templateRecurrenceVersion) || 0)) : 0;\n  s.templateRegistry = recurrence.normalizeRegistry(s.templateRegistry);\n  s.broadcastLocked = !!s.broadcastLocked;", 'reconcile recurrence state')

replace_once("const time = require('./time');\n\nfunction classifyMode", "const time = require('./time');\nconst recurrence = require('./recurrence');\n\nfunction classifyMode", 'lifecycle recurrence import')
replace_once('  const narrativeClockGuard = !!(narrativeProgression.active && narrativeTimestampPrevious);\n\n  // Explicit user dates can advance world year before generation in every mode.',
             "  const narrativeClockGuard = !!(narrativeProgression.active && narrativeTimestampPrevious);\n  const templateRecurrence = c.mode === 'C'\n    ? recurrence.observe(state, input)\n    : { eligible: false, repeated: false, hash: null, normalizedChars: 0, registrySize: Array.isArray(state.templateRegistry) ? state.templateRegistry.length : 0 };\n\n  // Explicit user dates can advance world year before generation in every mode.", 'lifecycle recurrence observe')
replace_once('    narrativeTimestampPrevious,\n    narrativeClockGuard,\n  };',
             '    narrativeTimestampPrevious,\n    narrativeClockGuard,\n    templateRecurrenceEligible: !!templateRecurrence.eligible,\n    templateRecurrenceRepeated: !!templateRecurrence.repeated,\n    templateRecurrenceHash: templateRecurrence.hash == null ? null : Number(templateRecurrence.hash),\n    templateRecurrenceChars: Number(templateRecurrence.normalizedChars || 0),\n    templateRegistrySize: Number(templateRecurrence.registrySize || 0),\n  };', 'pending recurrence fields')

replace_once("const recovery = require('./recovery');\n\nfunction sessionNow", "const recovery = require('./recovery');\nconst recurrence = require('./recurrence');\n\nfunction sessionNow", 'session recurrence import')
replace_once("  if (communityExpected > 0) {\n    lines.push('platform_groups_required=3_distinct');",
             "  if (communityExpected > 0) {\n    if (p.mode === 'C' && p.templateRecurrenceRepeated) {\n      lines.push('request_template_recurs_from_prior_history=1');\n      lines.push('prior_answer_is_not_a_content_template=1');\n      lines.push('preserve_requested_fields_and_output_contract=1');\n      lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');\n      lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');\n    }\n    lines.push('platform_groups_required=3_distinct');", 'runtime recurrence prompt')
replace_once('    this.communityAliasRepairStats = null;\n  }', '    this.communityAliasRepairStats = null;\n    this.templateRecurrenceBootstrapStats = null;\n  }', 'session recurrence diagnostics field')
replace_once('  async onSend(sendIndex, userText, promptProbe, perfDetail = null) {', '  async onSend(sendIndex, userText, promptProbe, perfDetail = null, historyMessages = null) {', 'onSend signature')
replace_once("      detail.restoreReason = 'forward';\n    }", "      detail.restoreReason = 'forward';\n      detail.templateBootstrapMs = 0;\n      detail.templateBootstrap = null;\n      detail.templateRecurrenceEligible = false;\n      detail.templateRecurrenceRepeated = false;\n      detail.templateRegistrySize = 0;\n    }", 'onSend perf init')
replace_once('    const base = existingPre || this.current || kernel.initialState();\n    if (detail) detail.previousMode = base?.lastMode || null;\n\n    t = sessionNow();\n    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex);\n    if (detail) detail.lifecycleMs = sessionElapsed(t);',
             "    const base = existingPre || this.current || kernel.initialState();\n    if (detail) detail.previousMode = base?.lastMode || null;\n\n    if (promptProbe?.active && recurrence.needsBootstrap(base)) {\n      t = sessionNow();\n      const boot = recurrence.bootstrapState(base, historyMessages, sendIndex, kernel.textOfMessage);\n      this.templateRecurrenceBootstrapStats = boot.stats;\n      if (detail) {\n        detail.templateBootstrapMs = sessionElapsed(t);\n        detail.templateBootstrap = boot.stats;\n      }\n    }\n\n    t = sessionNow();\n    const state = lifecycle.prepareTurn(base, userText, promptProbe, sendIndex);\n    if (detail) {\n      detail.lifecycleMs = sessionElapsed(t);\n      detail.templateRecurrenceEligible = !!state.pending?.templateRecurrenceEligible;\n      detail.templateRecurrenceRepeated = !!state.pending?.templateRecurrenceRepeated;\n      detail.templateRegistrySize = Number(state.pending?.templateRegistrySize || 0);\n    }", 'onSend bootstrap/observe')
replace_once('  communityAliasDiagnostics() { return this.communityAliasRepairStats; }\n  portableState()',
             '  communityAliasDiagnostics() { return this.communityAliasRepairStats; }\n  templateRecurrenceDiagnostics() { return this.templateRecurrenceBootstrapStats; }\n  portableState()', 'recurrence diagnostics method')

replace_once('  let lastNarrativeClockProbe = null;\n', '  let lastNarrativeClockProbe = null;\n  let lastTemplateRecurrenceProbe = null;\n', 'runtime recurrence probe variable')
replace_once('    const result = await cs.onSend(sendIndex, userText, promptProbe, snapshotDetail);',
             '    const result = await cs.onSend(sendIndex, userText, promptProbe, snapshotDetail, chat?.message || []);', 'onSend history argument')
replace_once("      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };",
             "      if (pendingProbe?.mode === 'C') {\n        lastTemplateRecurrenceProbe = {\n          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,\n          eligible: !!pendingProbe.templateRecurrenceEligible,\n          repeated: !!pendingProbe.templateRecurrenceRepeated,\n          normalizedChars: Number(pendingProbe.templateRecurrenceChars || 0),\n          registrySize: Number(pendingProbe.templateRegistrySize || 0),\n          bootstrap: snapshotDetail?.templateBootstrap || null,\n          at: Date.now(),\n        };\n      } else {\n        lastTemplateRecurrenceProbe = null;\n      }\n      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };", 'runtime recurrence capture')

s = s.replace('[simcore/v0.62.20]', '[simcore/v0.62.21]')
replace_once('      const aliasDiag = coreSession?.communityAliasDiagnostics?.() || null;\n',
             '      const aliasDiag = coreSession?.communityAliasDiagnostics?.() || null;\n      const recurrenceDiag = coreSession?.templateRecurrenceDiagnostics?.() || null;\n', 'panel recurrence diagnostics read')
replace_once("      const narrativeGuardLabel = narrativeProbe ? (narrativeProbe.guardActive ? 'ON' : 'OFF') : 'n/a';\n",
             "      const narrativeGuardLabel = narrativeProbe ? (narrativeProbe.guardActive ? 'ON' : 'OFF') : 'n/a';\n      const recurrenceLabel = lastTemplateRecurrenceProbe\n        ? (lastTemplateRecurrenceProbe.eligible ? (lastTemplateRecurrenceProbe.repeated ? 'REPEATED' : 'FIRST') : 'INELIGIBLE')\n        : 'n/a';\n", 'panel recurrence label')
replace_once('<h1>⚙️ SimCore v0.62.20 <button id="close">닫기</button></h1>', '<h1>⚙️ SimCore v0.62.21 <button id="close">닫기</button></h1>', 'panel version')
replace_once('<div class="metric"><div class="k">Mode transition</div><div class="v">${escapeHtml(narrativeTransition)}</div></div>\n<div class="metric"><div class="k">beforeRequest</div>',
             '<div class="metric"><div class="k">Mode transition</div><div class="v">${escapeHtml(narrativeTransition)}</div></div>\n<div class="metric"><div class="k">Template recurrence</div><div class="v">${recurrenceLabel}</div></div>\n<div class="metric"><div class="k">beforeRequest</div>', 'panel recurrence metric')
replace_once("${narrativeProbe ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Narrative clock probe (runtime)</div>",
             "${lastTemplateRecurrenceProbe ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Template recurrence guard (runtime)</div><div>${escapeHtml(recurrenceLabel)} · registry ${Number(lastTemplateRecurrenceProbe.registrySize || 0)}</div><div class=\"muted\" style=\"margin-top:5px\">template chars ${Number(lastTemplateRecurrenceProbe.normalizedChars || 0)} · ${lastTemplateRecurrenceProbe.repeated ? 'delta/variation hint injected' : 'no recurrence hint'}</div></div>` : ''}\n${recurrenceDiag ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Template history bootstrap</div><div>DONE · ${Number(recurrenceDiag.registrySize || 0)} templates retained</div><div class=\"muted\" style=\"margin-top:5px\">${Number(recurrenceDiag.userMessages || 0)} user msgs · ${Number(recurrenceDiag.communityInputs || 0)} community inputs · ${Number(recurrenceDiag.repeatedTemplates || 0)} historical repeats</div></div>` : ''}\n${narrativeProbe ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Narrative clock probe (runtime)</div>", 'panel recurrence cards')
replace_once('<tr><td>&nbsp;&nbsp;Lifecycle prepare</td><td>${Number(lastPerf.snapshotDetail.lifecycleMs || 0).toFixed(1)} ms</td></tr>',
             '<tr><td>&nbsp;&nbsp;Template bootstrap</td><td>${Number(lastPerf.snapshotDetail.templateBootstrapMs || 0).toFixed(1)} ms${lastPerf.snapshotDetail.templateBootstrap ? ` (${Number(lastPerf.snapshotDetail.templateBootstrap.userMessages || 0)} user, ${Number(lastPerf.snapshotDetail.templateBootstrap.communityInputs || 0)} community, ${Number(lastPerf.snapshotDetail.templateBootstrap.registrySize || 0)} retained)` : \' (skip)\'}</td></tr>\n<tr><td>&nbsp;&nbsp;Lifecycle prepare</td><td>${Number(lastPerf.snapshotDetail.lifecycleMs || 0).toFixed(1)} ms</td></tr>', 'panel bootstrap perf')

if s == orig:
    raise SystemExit('patch made no changes')
if '//@version 0.62.21' not in s:
    raise SystemExit('version patch missing')
if 'request_template_recurs_from_prior_history=1' not in s:
    raise SystemExit('runtime guard missing')
if 'TEMPLATE_REGISTRY_LIMIT = 384' not in s:
    raise SystemExit('registry module missing')
if s.count('SimCore.define("recurrence"') != 1:
    raise SystemExit('recurrence module count invalid')

p.write_text(s, encoding='utf-8')
Path('plugins/simcore/install.js').write_text(s, encoding='utf-8')
