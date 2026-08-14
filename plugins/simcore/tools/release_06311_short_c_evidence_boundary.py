from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
CONTRACT_1 = "short_community_event_claims=current_lineage_root_supported_only;omit_absent_current_event_details;do_not_fill_from_prior_similar_events=1"
CONTRACT_2 = "reaction_opinion_jokes_and_emphasis_are_free;broader_or_retrospective_event_facts_allowed_only_when_current_user_request_explicitly_asks=1"
CHANGELOG = """// v0.63.11 Short-C Evidence Boundary:\n// - Tightens eligible Short-C current-event reactions after live evidence showed correct lineage/root/source-lock metadata but prior similar-event details still leaked into the post body and comments\n// - Adds exactly two fixed source-lock-only Prompt contracts: current-event factual claims require support from the authoritative current lineage root, while reaction/opinion/jokes/emphasis remain free\n// - Broader or retrospective event facts remain allowed only when the current user request explicitly asks for broader/comparative/retrospective context\n// - Does not parse source semantics, copy source bodies, scan history, store event facts, repair output, or change Lineage/Handoff/Recurrence/Frame/Time/Recovery/Storage ownership\n// - A/B, ordinary long C, recurrence-owned C, and Short-C without an eligible source lock receive zero new runtime-prompt lines; v0.63.5-0.63.10 behavior/UI remains unchanged\n//\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.10' not in text:
        raise SystemExit(f'{path}: expected 0.63.10 baseline')
    if '// v0.63.11 Short-C Evidence Boundary:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.10', '//@version 0.63.11', 1)
    changelog_anchor = '// v0.63.10 Diagnostics UI Polish III:\n'
    if text.count(changelog_anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(changelog_anchor, CHANGELOG + changelog_anchor, 1)

    prompt_anchor = "    lines.push('source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1');\n"
    if text.count(prompt_anchor) != 1:
        raise SystemExit(f'{path}: Short-C source-facts anchor drift')
    prompt_add = prompt_anchor + f"    lines.push('{CONTRACT_1}');\n    lines.push('{CONTRACT_2}');\n"
    text = text.replace(prompt_anchor, prompt_add, 1)

    panel_anchor = '<div class=\\"title\\">⚙️ SimCore v0.63.10</div>'
    if text.count(panel_anchor) != 1:
        raise SystemExit(f'{path}: panel version anchor drift ({text.count(panel_anchor)})')
    text = text.replace(panel_anchor, '<div class=\\"title\\">⚙️ SimCore v0.63.11</div>', 1)

    diagnostic_anchor = "'Version: 0.63.10'"
    if text.count(diagnostic_anchor) != 1:
        raise SystemExit(f'{path}: diagnostic version anchor drift')
    text = text.replace(diagnostic_anchor, "'Version: 0.63.11'", 1)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.11 latest.js/install.js (Short-C evidence-boundary Prompt only)')
