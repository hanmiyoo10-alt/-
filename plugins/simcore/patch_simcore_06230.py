from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.62.30 Current Age Anchor:\n// - Fixes a repeated live age-drift failure where a past event/candidacy age was reused as the current narrative age after the story year had advanced\n// - Keeps the proven korean_age_offset state untouched and adds one compact current-age formula only when the offset is greater than zero\n// - Current age is resolved as character-reference age plus SimCore's deterministic Korean-age offset; past-event age mentions must not override the current value\n// - Applies uniformly to active A/B/C turns; no exact age is hardcoded and no character/lore content is fetched or copied\n// - No state schema change, history scan, auxiliary model, output rewrite, or new pluginStorage/API call site\n//\n'''

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.29' not in text:
        raise SystemExit(f'{path}: expected v0.62.29 base')

    text = text.replace('//@version 0.62.29', '//@version 0.62.30', 1)
    text = text.replace(
        '//@display-name SimCore v0.62.29 Short Community Lineage Anchor',
        '//@display-name SimCore v0.62.30 Current Age Anchor',
        1,
    )
    marker = '// v0.62.29 Short Community Lineage Anchor:\n'
    if marker not in text:
        raise SystemExit(f'{path}: changelog insertion marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    prompt_marker = "    `korean_age_offset=+${s.koreanAgeOffset}`,\n    `world_year=${s.worldYear ?? 'unknown'}`,\n"
    prompt_new = "    `korean_age_offset=+${s.koreanAgeOffset}`,\n    ...(Number(s.koreanAgeOffset || 0) > 0 ? [`current_korean_age=character_reference_age+${s.koreanAgeOffset};past_event_age_not_current=1`] : []),\n    `world_year=${s.worldYear ?? 'unknown'}`,\n"
    if prompt_marker not in text:
        raise SystemExit(f'{path}: age prompt marker missing')
    text = text.replace(prompt_marker, prompt_new, 1)

    budget_flag_marker = "        referenceLines: runtimeBudgetLines.filter((line) => line === 'reference_sources=character_card+currently_exposed_lore_if_present' || line === 'character_world_facts_use_reference_sources=1').length,\n"
    budget_flag_new = budget_flag_marker + "        ageAnchor: runtimeBudgetLines.some((line) => line.startsWith('current_korean_age=')),\n"
    if budget_flag_marker not in text:
        raise SystemExit(f'{path}: runtime budget marker missing')
    text = text.replace(budget_flag_marker, budget_flag_new, 1)

    active_flags_old = "lastRuntimePromptBudget.handoff ? 'handoff' : ''"
    active_flags_new = "lastRuntimePromptBudget.handoff ? 'handoff' : '', lastRuntimePromptBudget.ageAnchor ? 'age-anchor' : ''"
    if active_flags_old not in text:
        raise SystemExit(f'{path}: active flags marker missing')
    text = text.replace(active_flags_old, active_flags_new, 1)

    ref_metric = '<div class="metric"><div class="k">Reference anchor</div><div class="v">ON · +2 lines</div></div>\n'
    age_metric = ref_metric + '<div class="metric"><div class="k">Current age anchor</div><div class="v">${Number(s?.koreanAgeOffset || 0) > 0 ? `ON · +1 line · offset +${Number(s?.koreanAgeOffset || 0)}` : `STANDBY · offset +0`}</div></div>\n'
    if ref_metric not in text:
        raise SystemExit(f'{path}: reference metric marker missing')
    text = text.replace(ref_metric, age_metric, 1)

    text = text.replace('SimCore v0.62.29 <button', 'SimCore v0.62.30 <button', 1)
    text = text.replace(
        'v0.62.29 Short Community Lineage Anchor · seeded short-C current-lineage hint · conditional +1 line',
        'v0.62.30 Current Age Anchor · offset-aware current-age formula · conditional +1 line',
        1,
    )
    text = text.replace('[simcore/v0.62.29]', '[simcore/v0.62.30]')

    path.write_text(text, encoding='utf-8')
