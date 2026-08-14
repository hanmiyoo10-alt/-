from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
OLD_1 = "short_community_scope=current_root_by_default;expand_only_if_user_explicitly_requests_overall_history_comparison_or_retrospective=1"
OLD_2 = "reaction_freedom=opinion_joke_tone_emphasis_only;all_factual_premises_obey_scope=1"
OLD_3 = "current_event_fact_boundary=title_body_comments_descriptions_Knowledge;outside_root_background_never_as_current_event_action=1"
NEW_1 = "short_community_default_scope=current_root_event;stable_character_world_background_allowed_as_background_only=1;outside_root_event_details_forbidden=1"
NEW_2 = "expand_event_scope_only_if_current_user_explicitly_requests_overall_history_comparison_retrospective_or_prior_events=1;otherwise_no_series_wide_recap_compilation_or_prior_event_examples=1"
NEW_3 = "reaction_freedom=opinion_joke_tone_emphasis_only;event_fact_premises_in_title_body_comments_descriptions_Knowledge_obey_event_scope=1"
CHANGELOG = """// v0.63.13 Short-C Event Scope Lock:\n// - Refines the v0.63.12 Short-C scope contract after live testing showed that outside-root events were correctly labeled as past but the model still widened a plain current-scene reaction into a series-wide recap\n// - Replaces the three v0.63.12 scope lines with three sharper lines that separate stable character/world background from concrete outside-root event details\n// - Stable background remains available as background only; concrete prior-event details are forbidden unless the current user explicitly requests overall/history/comparison/retrospective/prior-event scope\n// - Without explicit scope expansion, the model must not reframe the current-root reaction as a series-wide recap, compilation, history, or prior-event example set\n// - Keeps Frame handling deliberately frozen despite the separately observed chapter/chatindex regression so the next live test can determine whether that regression persists independently; all non-Prompt modules and v0.63.10 diagnostics UI remain unchanged\n//\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.12' not in text:
        raise SystemExit(f'{path}: expected 0.63.12 baseline')
    if '// v0.63.13 Short-C Event Scope Lock:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.12', '//@version 0.63.13', 1)

    changelog_anchor = '// v0.63.12 Short-C Scope Boundary:\n'
    if text.count(changelog_anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(changelog_anchor, CHANGELOG + changelog_anchor, 1)

    old_block = (
        f"    lines.push('{OLD_1}');\n"
        f"    lines.push('{OLD_2}');\n"
        f"    lines.push('{OLD_3}');\n"
    )
    if text.count(old_block) != 1:
        raise SystemExit(f'{path}: 0.63.12 scope block drift ({text.count(old_block)})')
    new_block = (
        f"    lines.push('{NEW_1}');\n"
        f"    lines.push('{NEW_2}');\n"
        f"    lines.push('{NEW_3}');\n"
    )
    text = text.replace(old_block, new_block, 1)

    panel_anchor = '⚙️ SimCore v0.63.12'
    if text.count(panel_anchor) != 1:
        raise SystemExit(f'{path}: panel version anchor drift ({text.count(panel_anchor)})')
    text = text.replace(panel_anchor, '⚙️ SimCore v0.63.13', 1)

    diagnostic_anchor = "'Version: 0.63.12'"
    if text.count(diagnostic_anchor) != 1:
        raise SystemExit(f'{path}: diagnostic version anchor drift ({text.count(diagnostic_anchor)})')
    text = text.replace(diagnostic_anchor, "'Version: 0.63.13'", 1)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.13 latest.js/install.js (Short-C event-scope Prompt refinement only; Frame frozen)')
