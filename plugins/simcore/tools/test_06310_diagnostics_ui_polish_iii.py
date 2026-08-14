from pathlib import Path
import hashlib

BASE = Path('/tmp/simcore-06310-baseline.js')
NEW = Path('plugins/simcore/latest.js')
old = BASE.read_text(encoding='utf-8')
new = NEW.read_text(encoding='utf-8')


def module_block(text, name):
    marker = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(marker)
    if start < 0:
        raise SystemExit(f'module missing: {name}')
    nxt = text.find('\nSimCore.define("', start + len(marker))
    if nxt < 0:
        nxt = text.find('\n(async () => {', start + len(marker))
    if nxt < 0:
        raise SystemExit(f'module end missing: {name}')
    return text[start:nxt]

modules = [
    'contracts', 'store', 'community', 'recurrence', 'lineage', 'handoff',
    'kernel', 'time', 'lifecycle', 'reaction', 'structure', 'recovery',
    'prompt', 'session', 'ops',
]
for name in modules:
    if module_block(old, name) != module_block(new, name):
        raise SystemExit(f'UI-only boundary regression: module changed: {name}')

prompt_sha = hashlib.sha256(module_block(new, 'prompt').encode()).hexdigest()

for token in [
    'Risuai.pluginStorage.',
    "addRisuReplacer('beforeRequest'",
    "addRisuScriptHandler('output'",
    'setInterval(', 'setTimeout(', 'MutationObserver', 'requestAnimationFrame(',
    'Risuai.getChatFromIndex(', 'Risuai.setChatToIndex(',
]:
    if old.count(token) != new.count(token):
        raise SystemExit(f'call-site count changed: {token}: {old.count(token)} -> {new.count(token)}')

required = [
    '//@version 0.63.10',
    '// v0.63.10 Diagnostics UI Polish III:',
    'Diagnostics UI Polish III · runtime semantics unchanged',
    "const panelEditLabel = !lastPerf ? '—'",
    "const promptCacheLabel = !lastRuntimePromptCacheProbe\n        ? '—'",
    'Storage diagnostics · ${escapeHtml(storageDiag.op || \'unknown\')}',
    'Storage diagnostics · no scan yet',
    '<details class="card"><summary>Diagnostic Tools</summary>',
    "value === '—'",
    "'Version: 0.63.10'",
]
for token in required:
    if token not in new:
        raise SystemExit(f'missing 0.63.10 UI token: {token}')

for forbidden in [
    'Diagnostics UI Polish II · runtime semantics unchanged',
    '<div class="card muted"><strong>Diagnostic Tools</strong>',
    '<div class="card"><div class="k" style="margin-bottom:8px">storage key scan (latest existing scan)</div>',
    'setInterval(() =>', 'new MutationObserver',
]:
    if forbidden in new:
        raise SystemExit(f'forbidden UI residue/addition: {forbidden}')

# New UI work stays panel-only. No default-open details for low-priority sections.
open_pos = new.find('async function openPanel()')
if open_pos < 0:
    raise SystemExit('openPanel missing')
for token in ["const panelEditLabel = !lastPerf ? '—'", 'Storage diagnostics ·', '<summary>Diagnostic Tools</summary>']:
    pos = new.find(token)
    if pos < open_pos:
        raise SystemExit(f'UI token escaped panel-open path: {token}')
for token in ['<details class="card" open><summary>Diagnostic Tools', '<details class="card" open><summary>Storage diagnostics']:
    if token in new:
        raise SystemExit('low-priority diagnostic card must default closed')

# Existing UI/runtime protections remain intact.
for token in [
    '● ${panelHealthLabel}', 'EDIT ${escapeHtml(panelEditLabel)}', 'FRAME REGRESSION:',
    'Advanced diagnostics <span class="advanced-count" id="advanced-count"></span>',
    'Diagnostic format: raw-lineage-v2', 'Recurrence history match:', 'Frame continuity:', 'Frame regression:',
    'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
    'mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1',
    'source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1',
    'short_community_source_is_authoritative=1',
    'do_not_substitute_prior_similar_source_or_prior_community_answer=1',
    'function canonicalizeResponseEnvelope', 'function isKnownThoughtsPreamble', 'function isThoughtsCompatibilityPreamble',
]:
    if old.count(token) != new.count(token):
        raise SystemExit(f'protected behavior/UI drift: {token}')

print('0.63.10 UI-only gates OK')
print(f'all 15 internal modules byte-identical; Prompt SHA256 {prompt_sha}')
print('request/storage/API/scheduler call-site counts unchanged; Storage/Diagnostic Tools remain default-closed panel UI')
