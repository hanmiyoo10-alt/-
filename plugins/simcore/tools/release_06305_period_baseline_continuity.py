from pathlib import Path

FILES = [
    Path('plugins/simcore/latest.js'),
    Path('plugins/simcore/install.js'),
]

CHANGELOG = """// v0.63.5 Period Baseline Continuity:
// - Adds one compact mode-independent continuity contract for successive period comparisons: the completed terminal state of the previous period becomes the next period baseline
// - Forbids replaying an already-completed prior-period baseline-to-terminal transition as the current period transition
// - Uses no year/number/platform parsing, content extraction, history scan, response copy, state-schema field, or pluginStorage/API call; the main model still interprets exposed history/content
// - Keeps Recurrence, Lineage, Handoff, Time, Recovery, Reaction, Storage, Broadcast, diagnostics, and output handling unchanged
// - Adds exactly two fixed Stable Contract lines on active prompts; compiler tier order and all existing dynamic prompt serialization stay unchanged
//
"""

OLD_STABLE = """    'response_envelope=exactly_one_no_restart',
    'reference_sources=character_card+currently_exposed_lore_if_present',"""
NEW_STABLE = """    'response_envelope=exactly_one_no_restart',
    'period_continuity=when_comparing_successive_periods_previous_terminal_state_is_next_baseline',
    'do_not_replay_completed_prior_period_transition_as_current_period_transition=1',
    'reference_sources=character_card+currently_exposed_lore_if_present',"""


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


for path in FILES:
    text = path.read_text(encoding='utf-8')
    text = replace_once(text, '//@version 0.63.4', '//@version 0.63.5', f'{path}: metadata version')
    text = replace_once(text, '// v0.63.4 Long-Chat Regression Probe:', CHANGELOG + '// v0.63.4 Long-Chat Regression Probe:', f'{path}: changelog anchor')
    text = replace_once(text, OLD_STABLE, NEW_STABLE, f'{path}: stable contract anchor')
    text = replace_once(text, 'SimCore v0.63.4', 'SimCore v0.63.5', f'{path}: panel version')
    text = replace_once(text, "'Version: 0.63.4'", "'Version: 0.63.5'", f'{path}: diagnostic version')
    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.5 latest.js/install.js (Prompt stable contract only)')
