from pathlib import Path

p = Path('plugins/simcore/latest.js')
s = p.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {n}')
    s = s.replace(old, new, 1)

replace_once('//@version 0.62.21', '//@version 0.62.22', 'version')
replace_once('//@display-name SimCore v0.62.21 Template Recurrence Guard', '//@display-name SimCore v0.62.22 Template Recurrence Guard ABC', 'display-name')
replace_once('// v0.62.21 Template Recurrence Guard:', '''// v0.62.22 Template Recurrence Guard ABC:\n// - Extends recurrence detection and guidance to Mode A, Mode B, and Mode C as one shared feature set\n// - Fingerprints are mode-family scoped (A/B/C) so different output contracts never contaminate each other\n// - Mode C keeps directive/checklist extraction; Mode B strips broadcast control tags; Mode A/B use conservative detailed-input matching\n// - v1 recurrence memory is rebuilt once from pre-update user history into the ABC registry; current input remains excluded\n// - Existing outputs are never rewritten; only new generations can receive the recurrence hint\n// - No auxiliary model, no new pluginStorage API calls, and no Broadcast/Community/Reaction/Narrative semantics changes\n//\n// v0.62.21 Template Recurrence Guard:''', 'release note')

start = s.index('SimCore.define("recurrence", function (require, module, exports) {')
end = s.index('SimCore.define("kernel", function (require, module, exports) {', start)
recurrence_module = r'''SimCore.define("recurrence", function (require, module, exports) {
const TEMPLATE_RECURRENCE_VERSION = 2;
const TEMPLATE_REGISTRY_LIMIT = 384;
const COMMUNITY_MARKER = '[커뮤니티]';
const TEMPLATE_MAX_CHARS = 4096;
const TEMPLATE_MIN_CHARS_C = 32;
const TEMPLATE_MIN_CHARS_AB = 48;

function modeFamily(mode) {
  const m = String(mode || 'A');
  if (/^B_/.test(m)) return 'B';
  return m === 'C' ? 'C' : 'A';
}

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

function stripBroadcastTags(text) {
  return String(text || '')
    .replace(/\[방송\s*(?:시작|중|종료)\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function templateSource(userText, mode) {
  const family = modeFamily(mode);
  const raw = String(userText || '');
  const communityIndex = raw.indexOf(COMMUNITY_MARKER);
  let source = '';

  // C is an explicit request mode. In B, an embedded community directive is also the strongest
  // reusable request schema; otherwise B uses the broadcast request after removing control tags.
  if (family === 'C' || (family === 'B' && communityIndex >= 0)) {
    if (communityIndex < 0) return '';
    source = raw.slice(communityIndex + COMMUNITY_MARKER.length);
  } else {
    source = stripBroadcastTags(raw);
  }
  return source.slice(0, TEMPLATE_MAX_CHARS);
}

function normalizeTemplate(userText, mode) {
  const family = modeFamily(mode);
  let source = templateSource(userText, mode);
  if (!source) return '';
  try { source = source.normalize('NFKC'); } catch { /* older JS runtime */ }

  // A long parenthetical checklist is the most stable reusable schema across changed events.
  // This keeps the requested fields while ignoring the event/title that naturally changes over time.
  const open = source.indexOf('(');
  const close = source.lastIndexOf(')');
  if (open >= 0 && close > open && (close - open) >= TEMPLATE_MIN_CHARS_C) source = source.slice(open);

  const normalized = source
    .replace(/https?:\/\/\S+/gi, '<url>')
    .replace(/\d+(?:[.,]\d+)*/g, '#')
    .replace(/[“”‘’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  // A/B lack C's explicit directive boundary, so require a little more substance unless a
  // detailed parenthetical request schema was extracted. This avoids flagging short scene beats.
  const minChars = family === 'C' ? TEMPLATE_MIN_CHARS_C : TEMPLATE_MIN_CHARS_AB;
  return normalized.length >= minChars ? normalized : '';
}

function hashTemplate(normalized, mode) {
  const text = String(normalized || '');
  if (!text) return null;
  const family = modeFamily(mode);
  let h = 2166136261 >>> 0;
  const seed = `${family}:${text.length}:`;
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

function templateFingerprint(userText, mode) {
  const family = modeFamily(mode);
  const normalized = normalizeTemplate(userText, mode);
  const hash = hashTemplate(normalized, mode);
  return {
    eligible: hash != null,
    hash,
    normalizedChars: normalized.length,
    modeFamily: family,
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

function observe(state, userText, mode) {
  const fp = templateFingerprint(userText, mode);
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

function classifyHistoricalMode(runtime, input) {
  const text = String(input || '');
  const hasContinue = /\[방송\s*중\]/.test(text);
  const hasEnd = /\[방송\s*종료\]/.test(text);
  const hasStart = /\[방송\s*시작\]/.test(text);
  const hasCommunity = text.includes(COMMUNITY_MARKER);
  let mode;

  if (runtime.broadcastLocked) {
    mode = hasContinue ? 'B_CONTINUE' : (hasEnd ? 'B_END' : 'B_CONTINUE');
  } else if (hasStart && hasEnd) {
    mode = 'B_END';
  } else if (hasStart) {
    mode = 'B_START';
  } else if (hasCommunity) {
    mode = 'C';
  } else {
    mode = 'A';
  }

  if (mode === 'B_START') runtime.broadcastLocked = true;
  else if (mode === 'B_END') runtime.broadcastLocked = false;
  return mode;
}

function bootstrapState(state, messages, stopExclusive, getText) {
  const rows = Array.isArray(messages) ? messages : [];
  const stop = Number.isInteger(Number(stopExclusive))
    ? Math.max(0, Math.min(Number(stopExclusive), rows.length))
    : rows.length;

  // v1 hashes were C-only and unsalted. Rebuild from history once so the registry becomes
  // mode-family scoped and cannot cross-contaminate A/B/C.
  let registry = Number(state?.templateRecurrenceVersion || 0) >= TEMPLATE_RECURRENCE_VERSION
    ? normalizeRegistry(state.templateRegistry)
    : [];
  const runtime = { broadcastLocked: false };
  let visited = 0;
  let userMessages = 0;
  let eligibleTemplates = 0;
  let repeatedTemplates = 0;
  let normalizedChars = 0;
  const modeInputs = { A: 0, B: 0, C: 0 };
  const modeEligible = { A: 0, B: 0, C: 0 };

  for (let i = 0; i < stop; i++) {
    visited += 1;
    const row = rows[i] || {};
    if (row.role !== 'user') continue;
    userMessages += 1;
    const text = typeof getText === 'function'
      ? getText(row)
      : String(row.data ?? row.content ?? row.text ?? '');
    const mode = classifyHistoricalMode(runtime, text);
    const family = modeFamily(mode);
    modeInputs[family] += 1;
    const fp = templateFingerprint(text, mode);
    normalizedChars += fp.normalizedChars || 0;
    if (!fp.eligible) continue;
    eligibleTemplates += 1;
    modeEligible[family] += 1;
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
    eligibleTemplates,
    repeatedTemplates,
    registrySize: registry.length,
    normalizedChars,
    modeInputs,
    modeEligible,
  };
  return { state, stats };
}

module.exports = {
  TEMPLATE_RECURRENCE_VERSION,
  TEMPLATE_REGISTRY_LIMIT,
  modeFamily,
  normalizeRegistry,
  normalizeTemplate,
  templateFingerprint,
  observe,
  needsBootstrap,
  bootstrapState,
};
});

'''
s = s[:start] + recurrence_module + s[end:]

replace_once("  const templateRecurrence = c.mode === 'C'\n    ? recurrence.observe(state, input)\n    : { eligible: false, repeated: false, hash: null, normalizedChars: 0, registrySize: Array.isArray(state.templateRegistry) ? state.templateRegistry.length : 0 };",
             "  const templateRecurrence = recurrence.observe(state, input, c.mode);", 'lifecycle ABC observe')
replace_once('    templateRecurrenceHash: templateRecurrence.hash == null ? null : Number(templateRecurrence.hash),\n    templateRecurrenceChars: Number(templateRecurrence.normalizedChars || 0),',
             '    templateRecurrenceHash: templateRecurrence.hash == null ? null : Number(templateRecurrence.hash),\n    templateRecurrenceModeFamily: templateRecurrence.modeFamily || recurrence.modeFamily(c.mode),\n    templateRecurrenceChars: Number(templateRecurrence.normalizedChars || 0),', 'pending mode family')

old_hint = '''  if (communityExpected > 0) {\n    if (p.mode === 'C' && p.templateRecurrenceRepeated) {\n      lines.push('request_template_recurs_from_prior_history=1');\n      lines.push('prior_answer_is_not_a_content_template=1');\n      lines.push('preserve_requested_fields_and_output_contract=1');\n      lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');\n      lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');\n    }\n    lines.push('platform_groups_required=3_distinct');'''
new_hint = '''  if (p.templateRecurrenceRepeated) {\n    lines.push('request_template_recurs_from_prior_history=1');\n    lines.push(`request_template_mode_family=${p.templateRecurrenceModeFamily || recurrence.modeFamily(p.mode)}`);\n    lines.push('prior_answer_is_not_a_content_template=1');\n    lines.push('preserve_requested_fields_and_output_contract=1');\n    lines.push('reevaluate_current_event_and_current_context_before_choosing_emphasis_reactions_and_wording=1');\n    lines.push('do_not_mechanically_reuse_prior_answer_composition_or_wording=1');\n  }\n  if (communityExpected > 0) {\n    lines.push('platform_groups_required=3_distinct');'''
replace_once(old_hint, new_hint, 'runtime ABC hint')

old_probe = '''      if (pendingProbe?.mode === 'C') {\n        lastTemplateRecurrenceProbe = {\n          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,\n          eligible: !!pendingProbe.templateRecurrenceEligible,\n          repeated: !!pendingProbe.templateRecurrenceRepeated,\n          normalizedChars: Number(pendingProbe.templateRecurrenceChars || 0),\n          registrySize: Number(pendingProbe.templateRegistrySize || 0),\n          bootstrap: snapshotDetail?.templateBootstrap || null,\n          at: Date.now(),\n        };\n      } else {\n        lastTemplateRecurrenceProbe = null;\n      }'''
new_probe = '''      if (pendingProbe) {\n        lastTemplateRecurrenceProbe = {\n          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,\n          mode: pendingProbe.mode || null,\n          modeFamily: pendingProbe.templateRecurrenceModeFamily || null,\n          eligible: !!pendingProbe.templateRecurrenceEligible,\n          repeated: !!pendingProbe.templateRecurrenceRepeated,\n          normalizedChars: Number(pendingProbe.templateRecurrenceChars || 0),\n          registrySize: Number(pendingProbe.templateRegistrySize || 0),\n          bootstrap: snapshotDetail?.templateBootstrap || null,\n          at: Date.now(),\n        };\n      } else {\n        lastTemplateRecurrenceProbe = null;\n      }'''
replace_once(old_probe, new_probe, 'runtime ABC probe')

replace_once('<h1>⚙️ SimCore v0.62.21 <button id="close">닫기</button></h1>', '<h1>⚙️ SimCore v0.62.22 <button id="close">닫기</button></h1>', 'panel version')
replace_once("${lastTemplateRecurrenceProbe ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Template recurrence guard (runtime)</div><div>${escapeHtml(recurrenceLabel)} · registry ${Number(lastTemplateRecurrenceProbe.registrySize || 0)}</div><div class=\"muted\" style=\"margin-top:5px\">template chars ${Number(lastTemplateRecurrenceProbe.normalizedChars || 0)} · ${lastTemplateRecurrenceProbe.repeated ? 'delta/variation hint injected' : 'no recurrence hint'}</div></div>` : ''}",
             "${lastTemplateRecurrenceProbe ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Template recurrence guard (runtime)</div><div>${escapeHtml(recurrenceLabel)} · mode ${escapeHtml(lastTemplateRecurrenceProbe.modeFamily || '?')} · registry ${Number(lastTemplateRecurrenceProbe.registrySize || 0)}</div><div class=\"muted\" style=\"margin-top:5px\">template chars ${Number(lastTemplateRecurrenceProbe.normalizedChars || 0)} · ${lastTemplateRecurrenceProbe.repeated ? 'delta/variation hint injected' : 'no recurrence hint'}</div></div>` : ''}", 'panel recurrence mode')
replace_once("${recurrenceDiag ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Template history bootstrap</div><div>DONE · ${Number(recurrenceDiag.registrySize || 0)} templates retained</div><div class=\"muted\" style=\"margin-top:5px\">${Number(recurrenceDiag.userMessages || 0)} user msgs · ${Number(recurrenceDiag.communityInputs || 0)} community inputs · ${Number(recurrenceDiag.repeatedTemplates || 0)} historical repeats</div></div>` : ''}",
             "${recurrenceDiag ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">Template history bootstrap</div><div>DONE · ${Number(recurrenceDiag.registrySize || 0)} templates retained</div><div class=\"muted\" style=\"margin-top:5px\">${Number(recurrenceDiag.userMessages || 0)} user msgs · eligible A/B/C ${Number(recurrenceDiag.modeEligible?.A || 0)}/${Number(recurrenceDiag.modeEligible?.B || 0)}/${Number(recurrenceDiag.modeEligible?.C || 0)} · ${Number(recurrenceDiag.repeatedTemplates || 0)} historical repeats</div></div>` : ''}", 'panel bootstrap modes')

s = s.replace('[simcore/v0.62.21]', '[simcore/v0.62.22]')

for target in ('plugins/simcore/latest.js', 'plugins/simcore/install.js'):
    Path(target).write_text(s, encoding='utf-8')

print('patched v0.62.22', len(s.encode('utf-8')))
