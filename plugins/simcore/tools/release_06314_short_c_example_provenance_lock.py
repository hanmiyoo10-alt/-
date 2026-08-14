from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
OLD = [
    "short_community_default_scope=current_root_event;stable_character_world_background_allowed_as_background_only=1;outside_root_event_details_forbidden=1",
    "expand_event_scope_only_if_current_user_explicitly_requests_overall_history_comparison_retrospective_or_prior_events=1;otherwise_no_series_wide_recap_compilation_or_prior_event_examples=1",
    "reaction_freedom=opinion_joke_tone_emphasis_only;event_fact_premises_in_title_body_comments_descriptions_Knowledge_obey_event_scope=1",
]
NEW = [
    "abstract_generalization_from_current_root_allowed=1;stable_character_world_background_allowed_as_context_not_event_evidence=1;reaction_opinion_joke_tone_emphasis_free=1",
    "specific_event_example_scene_action_item_quote_or_outcome_requires_current_root_support=1;outside_root_specifics_omit=1",
    "outside_root_specific_event_evidence_only_if_current_user_explicitly_requests_prior_events_history_comparison_or_retrospective=1;boundary_applies_title_body_comments_descriptions_Knowledge=1",
]
CHANGELOG = """// v0.63.14 Short-C Example Provenance Lock:\n// - Refines the eligible Short-C evidence contract after v0.63.13 live testing showed that broad character-pattern generalization was legitimate but unsupported concrete prior-event examples still leaked into posts/comments\n// - Replaces the three v0.63.13 scope lines with three provenance-focused lines: abstract generalization and stable background remain available, while every concrete event example/scene/action/item/quote/outcome requires support from the authoritative current root\n// - Outside-root specific event evidence is omitted unless the current user explicitly requests prior-event/history/comparison/retrospective context; the boundary applies across title/body/comments/descriptions/Knowledge\n// - Preserves reaction/opinion/joke/tone/emphasis freedom and does not parse source semantics, copy source bodies, scan history, store event facts, or repair output\n// - Keeps Frame/Chapter/Chatindex handling deliberately frozen for independent live validation; all non-Prompt modules, state/storage paths, compiler structure, and v0.63.10 diagnostics UI remain unchanged\n//\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.13' not in text:
        raise SystemExit(f'{path}: expected 0.63.13 baseline')
    if '// v0.63.14 Short-C Example Provenance Lock:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.13', '//@version 0.63.14', 1)

    changelog_anchor = '// v0.63.13 Short-C Event Scope Lock:\n'
    if text.count(changelog_anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(changelog_anchor, CHANGELOG + changelog_anchor, 1)

    old_block = ''.join(f"    lines.push('{line}');\n" for line in OLD)
    if text.count(old_block) != 1:
        raise SystemExit(f'{path}: 0.63.13 scope block drift ({text.count(old_block)})')
    new_block = ''.join(f"    lines.push('{line}');\n" for line in NEW)
    text = text.replace(old_block, new_block, 1)

    panel_anchor = '⚙️ SimCore v0.63.13'
    if text.count(panel_anchor) != 1:
        raise SystemExit(f'{path}: panel version anchor drift ({text.count(panel_anchor)})')
    text = text.replace(panel_anchor, '⚙️ SimCore v0.63.14', 1)

    diagnostic_anchor = "'Version: 0.63.13'"
    if text.count(diagnostic_anchor) != 1:
        raise SystemExit(f'{path}: diagnostic version anchor drift ({text.count(diagnostic_anchor)})')
    text = text.replace(diagnostic_anchor, "'Version: 0.63.14'", 1)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.14 latest.js/install.js (Short-C example-provenance Prompt refinement only; Frame frozen)')
