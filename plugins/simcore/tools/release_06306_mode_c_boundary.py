from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
CONTRACT = "mode_c_after_frame=COMMUNITY_immediately;no_intent_analysis_narrative_action_or_dialogue_before_first_COMMUNITY=1"
CHANGELOG = """// v0.63.6 Mode C Output Boundary:\n// - Closes a live Mode C formatting gap where model-side intent/analysis/narrative text could appear between the required frame and the first <COMMUNITY> block\n// - Adds exactly one fixed Mode C-only Prompt contract requiring <COMMUNITY> to begin immediately after the frame, with no intent/analysis/narrative/action/dialogue body before it\n// - Keeps the existing Structure warning as judge-only telemetry and does not add output deletion/repair logic\n// - Keeps v0.63.5 Period Baseline Continuity, Recurrence, Lineage, Handoff, Time, Recovery, Reaction, Storage, Broadcast, diagnostics, and output handling unchanged\n// - A/B runtime prompts are byte-identical to v0.63.5; no state/schema/storage/history/content parsing is added\n//\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.5' not in text:
        raise SystemExit(f'{path}: expected 0.63.5 baseline')
    if '// v0.63.6 Mode C Output Boundary:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.5', '//@version 0.63.6', 1)
    anchor = '// v0.63.5 Period Baseline Continuity:\n'
    if text.count(anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(anchor, CHANGELOG + anchor, 1)

    prompt_anchor = "function compileConditionalGuidance(s, p, communityExpected) {\n  const lines = [];\n"
    if text.count(prompt_anchor) != 1:
        raise SystemExit(f'{path}: Prompt conditional anchor drift')
    prompt_replacement = prompt_anchor + f"  if (p.mode === 'C') lines.push('{CONTRACT}');\n"
    text = text.replace(prompt_anchor, prompt_replacement, 1)

    if '<h1>⚙️ SimCore v0.63.5 ' not in text:
        raise SystemExit(f'{path}: panel version anchor drift')
    text = text.replace('<h1>⚙️ SimCore v0.63.5 ', '<h1>⚙️ SimCore v0.63.6 ', 1)
    if "'Version: 0.63.5'" not in text:
        raise SystemExit(f'{path}: diagnostic version anchor drift')
    text = text.replace("'Version: 0.63.5'", "'Version: 0.63.6'", 1)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.6 latest.js/install.js (Mode C Prompt boundary only)')
