from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.62.28 Runtime Prompt Budget Probe:\n// - Diagnostics only: measures the exact SimCore runtime prompt already injected on each active A/B/C request\n// - Records total prompt characters/lines plus the dynamic reaction_max line size and active conditional feature flags\n// - Adds panel-only runtime budget telemetry for the future prompt compiler baseline\n// - renderRuntimePrompt output is byte-identical to v0.62.27; no generation guidance, state schema, history scan, or storage I/O change\n// - Existing Reference Anchor/Broadcast/Community/Reaction/Narrative/Recurrence/Lineage/Handoff/Parent-Shift behavior is unchanged\n//\n'''

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.27' not in text:
        raise SystemExit(f'{path}: expected v0.62.27 base')

    text = text.replace('//@version 0.62.27', '//@version 0.62.28', 1)
    text = text.replace(
        '//@display-name SimCore v0.62.27 Reference Attention Anchor',
        '//@display-name SimCore v0.62.28 Runtime Prompt Budget Probe',
        1,
    )
    marker = '// v0.62.27 Reference Attention Anchor:\n'
    if marker not in text:
        raise SystemExit(f'{path}: changelog insertion marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    probe_decl = '  let lastCommunitySourceHandoffProbe = null;\n'
    probe_decl_new = probe_decl + '  let lastRuntimePromptBudget = null;\n'
    if text.count(probe_decl) != 1:
        raise SystemExit(f'{path}: probe declaration marker count {text.count(probe_decl)}')
    text = text.replace(probe_decl, probe_decl_new, 1)

    active_marker = '''    if (result.active && result.promptBlock) {\n      messages.push({ role: 'system', content: result.promptBlock });\n      const pendingProbe = result.state.pending || null;\n'''
    active_new = '''    if (result.active && result.promptBlock) {\n      const runtimeBudgetText = String(result.promptBlock || '');\n      const runtimeBudgetLines = runtimeBudgetText ? runtimeBudgetText.split('\\n') : [];\n      const runtimeBudgetReactionLine = runtimeBudgetLines.find((line) => line.startsWith('reaction_max=')) || '';\n      const runtimeBudgetMode = result.state.pending?.mode || null;\n      lastRuntimePromptBudget = {\n        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,\n        mode: runtimeBudgetMode,\n        chars: runtimeBudgetText.length,\n        lines: runtimeBudgetLines.length,\n        reactionMaxChars: runtimeBudgetReactionLine.length,\n        referenceLines: runtimeBudgetLines.filter((line) => line === 'reference_sources=character_card+currently_exposed_lore_if_present' || line === 'character_world_facts_use_reference_sources=1').length,\n        broadcast: /^B_/.test(String(runtimeBudgetMode || '')),\n        community: runtimeBudgetLines.some((line) => line.startsWith('platform_groups_required=')),\n        narrativeProgression: runtimeBudgetLines.some((line) => line === 'timestamp_semantics=current_narrative_time'),\n        recurrence: runtimeBudgetLines.some((line) => line === 'request_template_recurs_from_prior_history=1'),\n        handoff: runtimeBudgetLines.some((line) => line.startsWith('short_community_request_reused_with_new_source=')),\n        at: Date.now(),\n      };\n      messages.push({ role: 'system', content: result.promptBlock });\n      const pendingProbe = result.state.pending || null;\n'''
    if text.count(active_marker) != 1:
        raise SystemExit(f'{path}: active prompt injection marker count {text.count(active_marker)}')
    text = text.replace(active_marker, active_new, 1)

    inactive_marker = '''    } else {\n      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };\n'''
    inactive_new = '''    } else {\n      lastRuntimePromptBudget = null;\n      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };\n'''
    if text.count(inactive_marker) != 1:
        raise SystemExit(f'{path}: inactive prompt marker count {text.count(inactive_marker)}')
    text = text.replace(inactive_marker, inactive_new, 1)

    metric = '<div class="metric"><div class="k">Reference anchor</div><div class="v">ON · +2 lines</div></div>\n'
    metric_new = metric + '<div class="metric"><div class="k">Runtime prompt</div><div class="v">${lastRuntimePromptBudget ? `${Number(lastRuntimePromptBudget.chars || 0).toLocaleString(\'en-US\')} chars · ${Number(lastRuntimePromptBudget.lines || 0)} lines` : \'n/a\'}</div></div>\n'
    if text.count(metric) != 1:
        raise SystemExit(f'{path}: reference metric marker count {text.count(metric)}')
    text = text.replace(metric, metric_new, 1)

    cards_marker = '''${(lastCore.diagnostics || []).length ? `<div class="card"><div class="k" style="margin-bottom:8px">Compatibility diagnostics</div><div>${lastCore.diagnostics.map((x) => `• ${escapeHtml(x)}`).join('<br>')}</div></div>` : ''}\n'''
    cards_new = cards_marker + '''${lastRuntimePromptBudget ? `<div class="card"><div class="k" style="margin-bottom:8px">Runtime prompt budget (current request)</div><div>${Number(lastRuntimePromptBudget.chars || 0).toLocaleString('en-US')} chars · ${Number(lastRuntimePromptBudget.lines || 0)} lines · mode ${escapeHtml(lastRuntimePromptBudget.mode || '?')}</div><div class="muted" style="margin-top:5px">reaction_max line ${Number(lastRuntimePromptBudget.reactionMaxChars || 0).toLocaleString('en-US')} chars · reference ${Number(lastRuntimePromptBudget.referenceLines || 0)} lines</div><div class="muted" style="margin-top:5px">active flags: ${escapeHtml([lastRuntimePromptBudget.broadcast ? 'broadcast' : '', lastRuntimePromptBudget.community ? 'community' : '', lastRuntimePromptBudget.narrativeProgression ? 'narrative' : '', lastRuntimePromptBudget.recurrence ? 'recurrence' : '', lastRuntimePromptBudget.handoff ? 'handoff' : ''].filter(Boolean).join(' · ') || 'base-only')} · diagnostics only · prompt unchanged</div></div>` : ''}\n'''
    if text.count(cards_marker) != 1:
        raise SystemExit(f'{path}: diagnostics card marker count {text.count(cards_marker)}')
    text = text.replace(cards_marker, cards_new, 1)

    if 'SimCore v0.62.27 <button' not in text:
        raise SystemExit(f'{path}: panel version marker missing')
    text = text.replace('SimCore v0.62.27 <button', 'SimCore v0.62.28 <button', 1)

    footer = 'v0.62.27 Reference Attention Anchor · character card + currently exposed lore pointer · +2 fixed prompt lines'
    if footer not in text:
        raise SystemExit(f'{path}: footer marker missing')
    text = text.replace(
        footer,
        'v0.62.28 Runtime Prompt Budget Probe · diagnostics only · runtime prompt byte-identical to v0.62.27',
        1,
    )
    text = text.replace('[simcore/v0.62.27]', '[simcore/v0.62.28]')

    path.write_text(text, encoding='utf-8')
