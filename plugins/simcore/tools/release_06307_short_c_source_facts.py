from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
CONTRACT = "source_event_identity_and_facts=current_lineage_root_only;do_not_import_prior_similar_event_details=1"
CHANGELOG = """// v0.63.7 Short-C Source Facts Reinforcement:\n// - Strengthens the existing Short-C Source Lock after live long-chat drift where lineage/root metadata was correct but the model substituted facts from an older similar event\n// - Adds exactly one fixed source-lock-only Prompt contract binding source-event identity and facts to the authoritative current lineage root and forbidding imported details from prior similar events\n// - Does not change lineage/handoff classification, inspect source semantics, copy source bodies, scan history, store event facts, or add output repair\n// - Keeps v0.63.6 Mode C Output Boundary and v0.63.5 Period Baseline Continuity unchanged; Recurrence, Time, Recovery, Structure, Reaction, Storage, Broadcast, diagnostics, and frame handling remain frozen\n// - A/B, ordinary long C, recurrence-owned C, and Short-C without an eligible source lock receive zero new runtime-prompt lines\n//\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.6' not in text:
        raise SystemExit(f'{path}: expected 0.63.6 baseline')
    if '// v0.63.7 Short-C Source Facts Reinforcement:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.6', '//@version 0.63.7', 1)
    changelog_anchor = '// v0.63.6 Mode C Output Boundary:\n'
    if text.count(changelog_anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(changelog_anchor, CHANGELOG + changelog_anchor, 1)

    prompt_anchor = "    lines.push('do_not_substitute_prior_similar_source_or_prior_community_answer=1');\n"
    if text.count(prompt_anchor) != 1:
        raise SystemExit(f'{path}: Short-C source-lock anchor drift')
    text = text.replace(prompt_anchor, prompt_anchor + f"    lines.push('{CONTRACT}');\n", 1)

    if '<h1>⚙️ SimCore v0.63.6 ' not in text:
        raise SystemExit(f'{path}: panel version anchor drift')
    text = text.replace('<h1>⚙️ SimCore v0.63.6 ', '<h1>⚙️ SimCore v0.63.7 ', 1)
    if "'Version: 0.63.6'" not in text:
        raise SystemExit(f'{path}: diagnostic version anchor drift')
    text = text.replace("'Version: 0.63.6'", "'Version: 0.63.7'", 1)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.7 latest.js/install.js (Short-C source-facts Prompt reinforcement only)')
