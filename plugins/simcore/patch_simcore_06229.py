from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.62.29 Short Community Lineage Anchor:\n// - Fixes a live short-C gap observed when Request Lineage correctly knew the current source but Source Handoff was FIRST/SAME SOURCE and therefore injected no source guidance\n// - For eligible short Mode C requests with a seeded A/B/C lineage and no NEW SOURCE transition, injects exactly one compact current-lineage anchor line\n// - Existing v0.62.25 NEW SOURCE behavior remains authoritative and unchanged; its two-line current-source hint is never duplicated by this anchor\n// - A/B requests, long/detailed C requests, recurrence-owned C requests, and unseeded short C requests add zero new prompt lines\n// - No semantic source selection, content copying, history scan, state schema change, auxiliary model, or new pluginStorage API call site\n//\n'''

ANCHOR_BLOCK = '''  else if (p.mode === 'C' && p.communitySourceHandoffEligible) {\n    lines.push('short_community_request_context_is_current_lineage=1');\n  }\n'''

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.28' not in text:
        raise SystemExit(f'{path}: expected v0.62.28 base')

    text = text.replace('//@version 0.62.28', '//@version 0.62.29', 1)
    text = text.replace(
        '//@display-name SimCore v0.62.28 Runtime Prompt Budget Probe',
        '//@display-name SimCore v0.62.29 Short Community Lineage Anchor',
        1,
    )

    marker = '// v0.62.28 Runtime Prompt Budget Probe:\n'
    if marker not in text:
        raise SystemExit(f'{path}: changelog marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    render_marker = '''  if (p.communitySourceHandoffNewSource) {\n    lines.push(`short_community_request_reused_with_new_source=${p.communitySourceHandoffRootMode || 'unknown'}`);\n    lines.push('derive_reaction_from_current_source_not_prior_answer=1');\n  }\n  if (communityExpected > 0) {\n'''
    render_new = '''  if (p.communitySourceHandoffNewSource) {\n    lines.push(`short_community_request_reused_with_new_source=${p.communitySourceHandoffRootMode || 'unknown'}`);\n    lines.push('derive_reaction_from_current_source_not_prior_answer=1');\n  }\n''' + ANCHOR_BLOCK + '''  if (communityExpected > 0) {\n'''
    if render_marker not in text:
        raise SystemExit(f'{path}: render handoff marker missing')
    text = text.replace(render_marker, render_new, 1)

    budget_marker = '''        handoff: runtimeBudgetLines.some((line) => line.startsWith('short_community_request_reused_with_new_source=')),\n        at: Date.now(),\n'''
    budget_new = '''        handoff: runtimeBudgetLines.some((line) => line.startsWith('short_community_request_reused_with_new_source=')),\n        lineageAnchor: runtimeBudgetLines.some((line) => line === 'short_community_request_context_is_current_lineage=1'),\n        at: Date.now(),\n'''
    if budget_marker not in text:
        raise SystemExit(f'{path}: runtime budget flag marker missing')
    text = text.replace(budget_marker, budget_new, 1)

    metric_marker = '<div class="metric"><div class="k">Reference anchor</div><div class="v">ON · +2 lines</div></div>\n'
    metric_new = metric_marker + '<div class="metric"><div class="k">Short-C lineage</div><div class="v">${lastRuntimePromptBudget?.lineageAnchor ? \'CURRENT LINEAGE\' : \'OFF\'}</div></div>\n'
    if metric_marker not in text:
        raise SystemExit(f'{path}: panel metric marker missing')
    text = text.replace(metric_marker, metric_new, 1)

    flags_old = "lastRuntimePromptBudget.handoff ? 'handoff' : ''"
    flags_new = "lastRuntimePromptBudget.handoff ? 'handoff' : '', lastRuntimePromptBudget.lineageAnchor ? 'lineage-anchor' : ''"
    if flags_old not in text:
        raise SystemExit(f'{path}: runtime budget active flags marker missing')
    text = text.replace(flags_old, flags_new, 1)

    source_old = "${lastCommunitySourceHandoffProbe.newSource ? '2-line current-source hint injected' : 'prompt +0'} · ${escapeHtml(lastCommunitySourceHandoffProbe.reason || 'ineligible')}"
    source_new = "${lastCommunitySourceHandoffProbe.newSource ? '2-line current-source hint injected' : (lastRuntimePromptBudget?.lineageAnchor ? '1-line current-lineage hint injected' : 'prompt +0')} · ${escapeHtml(lastCommunitySourceHandoffProbe.reason || 'ineligible')}"
    if source_old not in text:
        raise SystemExit(f'{path}: source handoff panel marker missing')
    text = text.replace(source_old, source_new, 1)

    text = text.replace('SimCore v0.62.28 <button', 'SimCore v0.62.29 <button', 1)
    text = text.replace(
        'v0.62.28 Runtime Prompt Budget Probe · diagnostics only · runtime prompt byte-identical to v0.62.27',
        'v0.62.29 Short Community Lineage Anchor · FIRST/SAME SOURCE seeded short-C gets one current-lineage hint',
        1,
    )
    text = text.replace('[simcore/v0.62.28]', '[simcore/v0.62.29]')

    path.write_text(text, encoding='utf-8')
