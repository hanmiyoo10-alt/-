from pathlib import Path
import hashlib

BASE = Path('/tmp/simcore-06309-baseline.js')
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

old_prompt = module_block(old, 'prompt')
new_prompt = module_block(new, 'prompt')
if old_prompt != new_prompt:
    raise SystemExit('Prompt must be byte-identical')
prompt_sha = hashlib.sha256(new_prompt.encode()).hexdigest()

# Request/storage/scheduler/API surfaces must remain identical.
for token in [
    'Risuai.pluginStorage.',
    "addRisuReplacer('beforeRequest'",
    "addRisuScriptHandler('output'",
    'setInterval(',
    'setTimeout(',
    'MutationObserver',
    'requestAnimationFrame(',
    'Risuai.getChatFromIndex(',
    'Risuai.setChatToIndex(',
]:
    if old.count(token) != new.count(token):
        raise SystemExit(f'call-site count changed: {token}: {old.count(token)} -> {new.count(token)}')

required = [
    '//@version 0.63.9',
    '// v0.63.9 Diagnostics UI Polish II:',
    'Diagnostics UI Polish II · runtime semantics unchanged',
    'panelHealthLabel',
    '● ${panelHealthLabel}',
    'EDIT ${escapeHtml(panelEditLabel)}',
    "panelEditPath === 'manual-edit-rebuilt'",
    "panelSourceLabel = panelSourceLock ? 'LOCK'",
    "return '↑ ADVANCED'",
    "return '━ SAME'",
    "return '↓ REGRESSED'",
    "return '↻ RESET'",
    'Advanced diagnostics <span class="advanced-count" id="advanced-count"></span>',
    "metric.classList.add('dim')",
    'Diagnostic Tools</strong>',
    "'Version: 0.63.9'",
]
for token in required:
    if token not in new:
        raise SystemExit(f'missing 0.63.9 UI token: {token}')

for forbidden in [
    'SOURCE STANDBY',
    '<div class="card muted">Long-Chat Regression Probe ·',
    'setInterval(() =>',
    'new MutationObserver',
]:
    if forbidden in new:
        raise SystemExit(f'forbidden UI residue/addition: {forbidden}')

# New UI work must live in/open after openPanel; nothing should be injected into request preparation.
open_pos = new.find('async function openPanel()')
if open_pos < 0:
    raise SystemExit('openPanel missing')
for token in ['panelHealthLabel', 'panelFrameStepUi', "document.getElementById('advanced-grid')"]:
    pos = new.find(token)
    if pos < open_pos:
        raise SystemExit(f'UI token escaped panel-open path: {token}')

# Default-closed Advanced diagnostics: details exists but no `open` attribute.
if '<details class="card" id="advanced-diagnostics" open>' in new:
    raise SystemExit('Advanced diagnostics must default closed')

# Diagnostic copy should change only its visible version label, not its behavior tokens.
for token in ['Diagnostic format: raw-lineage-v2', 'Recurrence history match:', 'Frame continuity:', 'Frame regression:', '최근 2턴 진단 복사']:
    if old.count(token) != new.count(token):
        raise SystemExit(f'diagnostic behavior token drift: {token}')

# Previously fixed runtime contracts must remain present with identical counts.
protected = [
    'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
    'mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1',
    'source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1',
    'short_community_source_is_authoritative=1',
    'do_not_substitute_prior_similar_source_or_prior_community_answer=1',
    'function canonicalizeResponseEnvelope',
    'function isKnownThoughtsPreamble',
    'function isThoughtsCompatibilityPreamble',
]
for token in protected:
    if old.count(token) != new.count(token):
        raise SystemExit(f'protected behavior drift: {token}')

print('0.63.9 UI-only gates OK')
print(f'all 15 internal modules byte-identical; Prompt SHA256 {prompt_sha}')
print('request/storage/API/scheduler call-site counts unchanged; Advanced diagnostics panel-open only')
