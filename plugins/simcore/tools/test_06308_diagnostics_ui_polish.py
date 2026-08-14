from pathlib import Path
import hashlib

old = Path('/tmp/simcore-06308-baseline.js').read_text(encoding='utf-8')
new = Path('plugins/simcore/latest.js').read_text(encoding='utf-8')

MODULES = [
    'contracts', 'store', 'community', 'recurrence', 'lineage', 'handoff',
    'kernel', 'time', 'lifecycle', 'reaction', 'structure', 'recovery',
    'prompt', 'session', 'ops',
]

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

for name in MODULES:
    a = module_block(old, name)
    b = module_block(new, name)
    if a != b:
        raise SystemExit(f'UI-only boundary regression: internal module changed: {name}')

old_prompt = module_block(old, 'prompt')
new_prompt = module_block(new, 'prompt')
old_prompt_sha = hashlib.sha256(old_prompt.encode()).hexdigest()
new_prompt_sha = hashlib.sha256(new_prompt.encode()).hexdigest()
if old_prompt_sha != new_prompt_sha:
    raise SystemExit('Prompt hash changed')

# Hot-path/API/storage call-site counts must stay exactly unchanged.
protected_counts = [
    'Risuai.pluginStorage.',
    "addRisuReplacer('beforeRequest'",
    "addRisuScriptHandler('output'",
    'Risuai.getChatFromIndex(',
    'Risuai.setChatToIndex(',
    'setInterval(',
    'setTimeout(',
    'MutationObserver',
    'requestAnimationFrame(',
    'manual-edit-rebuilt',
    'source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1',
    'mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1',
    'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
]
for token in protected_counts:
    if old.count(token) != new.count(token):
        raise SystemExit(f'protected count drift: {token}: {old.count(token)} -> {new.count(token)}')

required = [
    '//@version 0.63.8',
    '// v0.63.8 Diagnostics UI Polish:',
    'Diagnostics UI Polish · runtime semantics unchanged',
    'Continuity at a glance',
    'FRAME REGRESSION:',
    'Slowest step',
    'position:sticky',
    'panelFrameProbe = diagnosticFrameContinuity',
    "'Version: 0.63.8'",
]
for token in required:
    if token not in new:
        raise SystemExit(f'missing 0.63.8 UI token: {token}')

for old_token in [
    '//@version 0.63.7',
    '<h1>⚙️ SimCore v0.63.7 ',
    "'Version: 0.63.7'",
]:
    if old_token in new:
        raise SystemExit(f'stale 0.63.7 visible/version token remains: {old_token}')

# New panel logic must stay open-panel-only: no new persistent or scheduler primitives.
for forbidden in [
    'localStorage.setItem', 'sessionStorage.setItem', 'indexedDB.open',
    'new Worker(', 'WebSocket(', 'EventSource(',
]:
    if new.count(forbidden) != old.count(forbidden):
        raise SystemExit(f'UI patch introduced forbidden runtime primitive: {forbidden}')

# Diagnostics UI uses the already-loaded chat object; it must not add a second panel chat fetch.
if new.count('const chat = await Risuai.getChatFromIndex(chaIdx, chatIdx);') != old.count('const chat = await Risuai.getChatFromIndex(chaIdx, chatIdx);'):
    raise SystemExit('panel chat-load call count changed')

print('0.63.8 UI-only gates OK')
print('all 15 internal modules byte-identical; Prompt SHA256', new_prompt_sha)
print('request/storage/API/scheduler call-site counts unchanged')
