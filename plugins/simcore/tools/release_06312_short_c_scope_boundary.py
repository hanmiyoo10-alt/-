from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
OLD_1 = "current_event_fact_claims=current_root_supported_only;omit_absent_details;no_prior_similar_event_fill=1"
OLD_2 = "reaction_opinion_jokes_emphasis_are_free=1;broader_retrospective_event_facts_only_if_user_explicitly_asks=1"
NEW_1 = "short_community_scope=current_root_by_default;expand_only_if_user_explicitly_requests_overall_history_comparison_or_retrospective=1"
NEW_2 = "reaction_freedom=opinion_joke_tone_emphasis_only;all_factual_premises_obey_scope=1"
NEW_3 = "current_event_fact_boundary=title_body_comments_descriptions_Knowledge;outside_root_background_never_as_current_event_action=1"
CHANGELOG = """// v0.63.12 Short-C Scope Boundary:\n// - Refines the eligible Short-C source contract after v0.63.11 live testing showed that prior event details could still be presented as if they occurred in the current source event\n// - Replaces the two v0.63.11 evidence lines with three compact scope lines: current lineage root is the default event scope, reaction style remains free, and every factual premise must obey that scope\n// - Scope may expand only when the current user explicitly requests overall/history/comparison/retrospective context; outside-root background may remain background but must never be presented as an action from the current event\n// - Applies the current-event fact boundary across title/body/comments/descriptions/Knowledge without parsing source semantics, copying source bodies, scanning history, or repairing output\n// - Keeps Lineage, Handoff, Recurrence, Frame, Time, Recovery, Store, Community, Reaction, Session, OPS, and v0.63.10 diagnostics UI frozen; A/B/ordinary long-C/recurrence-owned C/non-source-lock Short-C prompts remain byte-identical\n//\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.11' not in text:
        raise SystemExit(f'{path}: expected 0.63.11 baseline')
    if '// v0.63.12 Short-C Scope Boundary:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.11', '//@version 0.63.12', 1)

    changelog_anchor = '// v0.63.11 Short-C Evidence Boundary:\n'
    if text.count(changelog_anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(changelog_anchor, CHANGELOG + changelog_anchor, 1)

    old_block = (
        f"    lines.push('{OLD_1}');\n"
        f"    lines.push('{OLD_2}');\n"
    )
    if text.count(old_block) != 1:
        raise SystemExit(f'{path}: 0.63.11 evidence block drift ({text.count(old_block)})')
    new_block = (
        f"    lines.push('{NEW_1}');\n"
        f"    lines.push('{NEW_2}');\n"
        f"    lines.push('{NEW_3}');\n"
    )
    text = text.replace(old_block, new_block, 1)

    panel_anchor = '⚙️ SimCore v0.63.11'
    if text.count(panel_anchor) != 1:
        raise SystemExit(f'{path}: panel version anchor drift ({text.count(panel_anchor)})')
    text = text.replace(panel_anchor, '⚙️ SimCore v0.63.12', 1)

    diagnostic_anchor = "'Version: 0.63.11'"
    if text.count(diagnostic_anchor) != 1:
        raise SystemExit(f'{path}: diagnostic version anchor drift ({text.count(diagnostic_anchor)})')
    text = text.replace(diagnostic_anchor, "'Version: 0.63.12'", 1)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.12 latest.js/install.js (Short-C scope-boundary Prompt refinement only)')
