from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')

s = LATEST.read_text()

if '//@version 0.62.35' not in s:
    raise SystemExit('expected SimCore 0.62.35 baseline')
if 'SimCore.define("prompt"' not in s or 'SimCore.define("session"' not in s:
    raise SystemExit('expected 0.62.35 module boundary baseline')

# Preserve the exact pre-patch runtime for parity validation in CI.
Path('/tmp/simcore-06235.js').write_text(s)

s = s.replace('//@version 0.62.35', '//@version 0.62.36', 1)

changelog_anchor = '// v0.62.35 Module Boundary Freeze:\n'
changelog = '''// v0.62.36 Prompt Cache Probe:\n// - Diagnostics only: compares the current SimCore runtime prompt block with the previous live request for the same chat\n// - Measures exact common-prefix chars/lines, first changed line, changed line slots, and a coarse change-reason category\n// - Keeps only one prior runtime prompt in memory; no pluginStorage, snapshot, state-schema, history-scan, or persistent cache is added\n// - Reports SimCore runtime-block stability only; it does not claim or infer provider/PocketRisu cache hit or miss\n// - renderRuntimePrompt output remains byte-identical to v0.62.35; generation guidance and all Core/Community contracts are unchanged\n//\n'''
if changelog_anchor not in s:
    raise SystemExit('changelog anchor missing')
s = s.replace(changelog_anchor, changelog + changelog_anchor, 1)

vars_anchor = '''  let lastCommunitySourceHandoffProbe = null;\n  let lastRuntimePromptBudget = null;\n  let lastTimestampCanonicalization = null;\n'''
vars_replacement = '''  let lastCommunitySourceHandoffProbe = null;\n  let lastRuntimePromptBudget = null;\n  let lastRuntimePromptCacheProbe = null;\n  let previousRuntimePromptText = null;\n  let previousRuntimePromptKey = null;\n  let lastTimestampCanonicalization = null;\n'''
if vars_anchor not in s:
    raise SystemExit('runtime probe variable anchor missing')
s = s.replace(vars_anchor, vars_replacement, 1)

helper_anchor = '''  function textMessageContent(m) {\n    if (!m) return '';\n    const v = m.content ?? m.data ?? m.text ?? '';\n    return typeof v === 'string' ? v : String(v || '');\n  }\n\n'''
helper = r'''  function promptChangeReason(previousLine, currentLine) {
    const text = `${String(previousLine || '')}\n${String(currentLine || '')}`;
    if (/^reaction_max=/m.test(text)) return 'reaction_max';
    if (/broadcast_airtime_|broadcast_locked=|mode_b_/m.test(text)) return 'broadcast-time';
    if (/narrative_|timestamp_semantics=/m.test(text)) return 'narrative-time';
    if (/^(?:mode=|episode_no=)/m.test(text)) return 'mode/lifecycle';
    if (/community_blocks_expected=|platform_groups_required=|b_end_|final_required_blocks=/m.test(text)) return 'community';
    if (/request_template_|prior_answer_|reevaluate_current_event|do_not_mechanically_reuse/m.test(text)) return 'recurrence';
    if (/short_community_|derive_reaction_from_current_source/m.test(text)) return 'handoff/lineage';
    if (/korean_age_offset=|current_korean_age=|world_year=/m.test(text)) return 'age/world-year';
    return 'other';
  }

  function buildRuntimePromptCacheProbe(previousText, currentText) {
    const current = String(currentText || '');
    const previous = previousText == null ? null : String(previousText);
    const currentLines = current ? current.split('\n') : [];
    if (previous == null) {
      return {
        baseline: true,
        stable: false,
        previousChars: 0,
        currentChars: current.length,
        stablePrefixChars: 0,
        stablePrefixPercent: null,
        stablePrefixLines: 0,
        firstChangedLine: null,
        changedLineSlots: 0,
        reason: 'baseline',
      };
    }

    let prefixChars = 0;
    const charLimit = Math.min(previous.length, current.length);
    while (prefixChars < charLimit && previous.charCodeAt(prefixChars) === current.charCodeAt(prefixChars)) prefixChars += 1;

    const previousLines = previous ? previous.split('\n') : [];
    let prefixLines = 0;
    const lineLimit = Math.min(previousLines.length, currentLines.length);
    while (prefixLines < lineLimit && previousLines[prefixLines] === currentLines[prefixLines]) prefixLines += 1;

    const stable = previous === current;
    const denominator = Math.max(previous.length, current.length, 1);
    const firstChangedLine = stable ? null : prefixLines + 1;
    const changedLineSlots = stable ? 0 : Math.max(previousLines.length, currentLines.length) - prefixLines;
    const previousChangedLine = stable ? '' : (previousLines[prefixLines] || '');
    const currentChangedLine = stable ? '' : (currentLines[prefixLines] || '');

    return {
      baseline: false,
      stable,
      previousChars: previous.length,
      currentChars: current.length,
      stablePrefixChars: prefixChars,
      stablePrefixPercent: stable ? 100 : (prefixChars / denominator) * 100,
      stablePrefixLines: prefixLines,
      firstChangedLine,
      changedLineSlots,
      reason: stable ? 'stable' : promptChangeReason(previousChangedLine, currentChangedLine),
    };
  }

'''
if helper_anchor not in s:
    raise SystemExit('textMessageContent helper anchor missing')
s = s.replace(helper_anchor, helper_anchor + helper, 1)

budget_tail_anchor = '''        lineageAnchor: runtimeBudgetLines.some((line) => line === 'short_community_request_context_is_current_lineage=1'),\n        at: Date.now(),\n      };\n      messages.push({ role: 'system', content: result.promptBlock });\n'''
budget_tail_replacement = '''        lineageAnchor: runtimeBudgetLines.some((line) => line === 'short_community_request_context_is_current_lineage=1'),\n        at: Date.now(),\n      };\n      const runtimePromptKey = String(coreKey || coreLocationKey || '');\n      const priorRuntimePrompt = previousRuntimePromptKey === runtimePromptKey ? previousRuntimePromptText : null;\n      lastRuntimePromptCacheProbe = {\n        ...buildRuntimePromptCacheProbe(priorRuntimePrompt, runtimeBudgetText),\n        sendIndex: Number.isInteger(Number(result.state.pending?.sendIndex)) ? Number(result.state.pending.sendIndex) : -1,\n        mode: runtimeBudgetMode,\n        at: Date.now(),\n      };\n      previousRuntimePromptText = runtimeBudgetText;\n      previousRuntimePromptKey = runtimePromptKey;\n      messages.push({ role: 'system', content: result.promptBlock });\n'''
if budget_tail_anchor not in s:
    raise SystemExit('runtime budget tail anchor missing')
s = s.replace(budget_tail_anchor, budget_tail_replacement, 1)

inactive_anchor = '''    } else {\n      lastRuntimePromptBudget = null;\n      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };\n    }\n'''
inactive_replacement = '''    } else {\n      lastRuntimePromptBudget = null;\n      lastRuntimePromptCacheProbe = null;\n      previousRuntimePromptText = null;\n      previousRuntimePromptKey = null;\n      lastCore = { active: false, mode: null, issues: [], diagnostics: [] };\n    }\n'''
if inactive_anchor not in s:
    raise SystemExit('inactive runtime anchor missing')
s = s.replace(inactive_anchor, inactive_replacement, 1)

panel_label_anchor = '''      const parentShiftLabel = lastCommunitySourceHandoffProbe\n        ? (lastCommunitySourceHandoffProbe.newSource\n          ? 'NEW ROOT'\n          : (!lastCommunitySourceHandoffProbe.eligible\n            ? 'INELIGIBLE'\n            : (!lastCommunitySourceHandoffProbe.seen\n              ? 'FIRST'\n              : (lastCommunitySourceHandoffProbe.parentShift\n                ? 'NEW PARENT'\n                : (lastCommunitySourceHandoffProbe.parentComparable ? 'SAME PARENT' : 'BASELINE')))))\n        : 'n/a';\n'''
panel_label_replacement = panel_label_anchor + '''      const promptCacheLabel = !lastRuntimePromptCacheProbe\n        ? 'n/a'\n        : (lastRuntimePromptCacheProbe.baseline\n          ? 'BASELINE'\n          : `${Number(lastRuntimePromptCacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${lastRuntimePromptCacheProbe.reason || 'other'}`);\n'''
if panel_label_anchor not in s:
    raise SystemExit('panel label anchor missing')
s = s.replace(panel_label_anchor, panel_label_replacement, 1)

metric_anchor = '''<div class="metric"><div class="k">Runtime prompt</div><div class="v">${lastRuntimePromptBudget ? `${Number(lastRuntimePromptBudget.chars || 0).toLocaleString('en-US')} chars · ${Number(lastRuntimePromptBudget.lines || 0)} lines` : 'n/a'}</div></div>\n<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n'''
metric_replacement = '''<div class="metric"><div class="k">Runtime prompt</div><div class="v">${lastRuntimePromptBudget ? `${Number(lastRuntimePromptBudget.chars || 0).toLocaleString('en-US')} chars · ${Number(lastRuntimePromptBudget.lines || 0)} lines` : 'n/a'}</div></div>\n<div class="metric"><div class="k">Prompt prefix</div><div class="v">${escapeHtml(promptCacheLabel)}</div></div>\n<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n'''
if metric_anchor not in s:
    raise SystemExit('panel metric anchor missing')
s = s.replace(metric_anchor, metric_replacement, 1)

card_anchor = '''${lastRuntimePromptBudget ? `<div class="card"><div class="k" style="margin-bottom:8px">Runtime prompt budget (current request)</div><div>${Number(lastRuntimePromptBudget.chars || 0).toLocaleString('en-US')} chars · ${Number(lastRuntimePromptBudget.lines || 0)} lines · mode ${escapeHtml(lastRuntimePromptBudget.mode || '?')}</div><div class="muted" style="margin-top:5px">reaction_max line ${Number(lastRuntimePromptBudget.reactionMaxChars || 0).toLocaleString('en-US')} chars · reference ${Number(lastRuntimePromptBudget.referenceLines || 0)} lines</div><div class="muted" style="margin-top:5px">active flags: ${escapeHtml([lastRuntimePromptBudget.broadcast ? 'broadcast' : '', lastRuntimePromptBudget.community ? 'community' : '', lastRuntimePromptBudget.narrativeProgression ? 'narrative' : '', lastRuntimePromptBudget.recurrence ? 'recurrence' : '', lastRuntimePromptBudget.handoff ? 'handoff' : '', lastRuntimePromptBudget.ageAnchor ? 'age-anchor' : '', lastRuntimePromptBudget.lineageAnchor ? 'lineage-anchor' : ''].filter(Boolean).join(' · ') || 'base-only')} · diagnostics only · prompt unchanged</div></div>` : ''}\n'''
cache_card = '''${lastRuntimePromptCacheProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Prompt cache probe (SimCore runtime block)</div><div>${lastRuntimePromptCacheProbe.baseline ? 'BASELINE · no previous same-chat runtime block' : `${Number(lastRuntimePromptCacheProbe.stablePrefixPercent || 0).toFixed(1)}% stable prefix · ${escapeHtml(lastRuntimePromptCacheProbe.reason || 'other')}`}</div><div class="muted" style="margin-top:5px">current ${Number(lastRuntimePromptCacheProbe.currentChars || 0).toLocaleString('en-US')} chars · previous ${Number(lastRuntimePromptCacheProbe.previousChars || 0).toLocaleString('en-US')} · stable prefix ${Number(lastRuntimePromptCacheProbe.stablePrefixChars || 0).toLocaleString('en-US')} chars / ${Number(lastRuntimePromptCacheProbe.stablePrefixLines || 0)} full lines</div><div class="muted" style="margin-top:5px">${lastRuntimePromptCacheProbe.firstChangedLine == null ? 'first change: none' : `first change: line ${Number(lastRuntimePromptCacheProbe.firstChangedLine)} · changed line slots ${Number(lastRuntimePromptCacheProbe.changedLineSlots || 0)}`} · memory-only previous block</div><div class="muted" style="margin-top:5px">SimCore runtime block only · does not observe or infer PocketRisu/provider cache hit/miss</div></div>` : ''}\n'''
if card_anchor not in s:
    raise SystemExit('runtime budget card anchor missing')
s = s.replace(card_anchor, card_anchor + cache_card, 1)

unload_anchor = '''  await Risuai.onUnload(() => {\n    coreSession = null;\n    coreKey = null;\n    coreLocationKey = null;\n  });\n'''
unload_replacement = '''  await Risuai.onUnload(() => {\n    coreSession = null;\n    coreKey = null;\n    coreLocationKey = null;\n    lastRuntimePromptCacheProbe = null;\n    previousRuntimePromptText = null;\n    previousRuntimePromptKey = null;\n  });\n'''
if unload_anchor not in s:
    raise SystemExit('unload anchor missing')
s = s.replace(unload_anchor, unload_replacement, 1)

s = s.replace('[simcore/v0.62.35]', '[simcore/v0.62.36]')
s = s.replace('<h1>⚙️ SimCore v0.62.35 ', '<h1>⚙️ SimCore v0.62.36 ', 1)

LATEST.write_text(s)
INSTALL.write_text(s)
print('SimCore 0.62.36 Prompt Cache Probe patch applied')
