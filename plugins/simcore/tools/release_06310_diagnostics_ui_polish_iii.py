from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.10 Diagnostics UI Polish III:\n// - UI-only mobile cleanup: empty EDIT/PREFIX chip states use a quiet dash instead of n/a\n// - Collapses Storage diagnostics into a default-closed summary using only the already-existing scan snapshot; opening the panel performs no extra storage scan or keys() call\n// - Converts Diagnostic Tools into a default-closed details card while preserving the existing manual two-turn diagnostic action and all probe semantics\n// - Adds no timer, polling, observer, request-path work, storage/API call, prompt line, state field, history scan, or output repair\n// - Keeps all 15 internal modules byte-identical to v0.63.9 and preserves runtime semantics, generation guidance, cache-prefix behavior, Recovery, Source Lock, Period Continuity, and diagnostics\n//\n"""

PROMPT_LABEL_OLD = """      const promptCacheLabel = !lastRuntimePromptCacheProbe\n        ? 'n/a'\n        : (lastRuntimePromptCacheProbe.baseline\n          ? 'BASELINE'\n          : `${Number(lastRuntimePromptCacheProbe.stablePrefixPercent || 0).toFixed(1)}% · ${lastRuntimePromptCacheProbe.reason || 'other'}`);\n"""
PROMPT_LABEL_NEW = PROMPT_LABEL_OLD.replace("? 'n/a'", "? '—'")

EDIT_OLD = """      const panelEditLabel = !lastPerf ? 'n/a' : (panelEditRebuilt ? 'REBUILT' : 'CLEAN');\n"""
EDIT_NEW = """      const panelEditLabel = !lastPerf ? '—' : (panelEditRebuilt ? 'REBUILT' : 'CLEAN');\n"""

HEADER_OLD = """<div><div class=\"title\">⚙️ SimCore v0.63.9</div><div class=\"subtitle\">Diagnostics UI Polish II · runtime semantics unchanged</div></div>\n"""
HEADER_NEW = """<div><div class=\"title\">⚙️ SimCore v0.63.10</div><div class=\"subtitle\">Diagnostics UI Polish III · runtime semantics unchanged</div></div>\n"""

STORAGE_OLD = """${storageDiag ? `<div class=\"card\"><div class=\"k\" style=\"margin-bottom:8px\">storage key scan (latest existing scan)</div><table>\n<tr><td>Operation</td><td>${escapeHtml(storageDiag.op || 'unknown')}</td></tr>\n<tr><td>Key scan</td><td>${Number(storageDiag.ms || 0).toFixed(1)} ms</td></tr>\n<tr><td>Total plugin-storage keys</td><td>${Number(storageDiag.totalKeys || 0).toLocaleString('en-US')}</td></tr>\n<tr><td>Current-chat SimCore keys</td><td>${storageDiag.currentChatKeys == null ? 'n/a' : Number(storageDiag.currentChatKeys || 0).toLocaleString('en-US')}</td></tr>\n<tr><td>Operation-matching keys</td><td>${storageDiag.matchingKeys == null ? 'n/a' : Number(storageDiag.matchingKeys || 0).toLocaleString('en-US')}</td></tr>\n</table><div class=\"muted\" style=\"margin-top:8px\">No extra keys() call is made for this panel; values come only from an existing cold/deferred scan.</div></div>` : `<div class=\"card muted\">Storage key scan: no scan observed in this live session yet (fast path only).</div>`}\n"""
STORAGE_NEW = """${storageDiag ? `<details class=\"card\"><summary>Storage diagnostics · ${escapeHtml(storageDiag.op || 'unknown')} · ${Number(storageDiag.ms || 0).toFixed(1)} ms · ${Number(storageDiag.totalKeys || 0).toLocaleString('en-US')} keys</summary><div class=\"detail-body\"><table>\n<tr><td>Operation</td><td>${escapeHtml(storageDiag.op || 'unknown')}</td></tr>\n<tr><td>Key scan</td><td>${Number(storageDiag.ms || 0).toFixed(1)} ms</td></tr>\n<tr><td>Total plugin-storage keys</td><td>${Number(storageDiag.totalKeys || 0).toLocaleString('en-US')}</td></tr>\n<tr><td>Current-chat SimCore keys</td><td>${storageDiag.currentChatKeys == null ? 'n/a' : Number(storageDiag.currentChatKeys || 0).toLocaleString('en-US')}</td></tr>\n<tr><td>Operation-matching keys</td><td>${storageDiag.matchingKeys == null ? 'n/a' : Number(storageDiag.matchingKeys || 0).toLocaleString('en-US')}</td></tr>\n</table><div class=\"muted\" style=\"margin-top:8px\">No extra keys() call is made for this panel; values come only from an existing cold/deferred scan.</div></div></details>` : `<details class=\"card\"><summary>Storage diagnostics · no scan yet</summary><div class=\"detail-body muted\">No scan observed in this live session yet (fast path only).</div></details>`}\n"""

TOOLS_OLD = """<div class=\"card muted\"><strong>Diagnostic Tools</strong> · frame continuity + recurrence-history match run only for manual diagnostic copy; runtime prompt/generation behavior unchanged</div>\n"""
TOOLS_NEW = """<details class=\"card\"><summary>Diagnostic Tools</summary><div class=\"detail-body muted\">Frame continuity + recurrence-history match run only for manual diagnostic copy; runtime prompt/generation behavior unchanged.</div></details>\n"""

DIM_OLD = """          const isStandby = value === 'n/a' || value === 'OFF' || value === 'NO REQUEST DATA' || value.startsWith('STANDBY');\n"""
DIM_NEW = """          const isStandby = value === 'n/a' || value === '—' || value === 'OFF' || value === 'NO REQUEST DATA' || value.startsWith('STANDBY');\n"""

for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.9' not in text:
        raise SystemExit(f'{path}: expected 0.63.9 baseline')
    if '// v0.63.10 Diagnostics UI Polish III:' in text:
        raise SystemExit(f'{path}: already patched')

    text = text.replace('//@version 0.63.9', '//@version 0.63.10', 1)
    anchor = '// v0.63.9 Diagnostics UI Polish II:\n'
    if text.count(anchor) != 1:
        raise SystemExit(f'{path}: changelog anchor drift')
    text = text.replace(anchor, CHANGELOG + anchor, 1)

    for old, new, label in [
        (PROMPT_LABEL_OLD, PROMPT_LABEL_NEW, 'prefix empty label'),
        (EDIT_OLD, EDIT_NEW, 'edit empty label'),
        (HEADER_OLD, HEADER_NEW, 'panel header'),
        (STORAGE_OLD, STORAGE_NEW, 'storage details'),
        (TOOLS_OLD, TOOLS_NEW, 'diagnostic tools details'),
        (DIM_OLD, DIM_NEW, 'standby dim classifier'),
    ]:
        if text.count(old) != 1:
            raise SystemExit(f'{path}: {label} anchor drift ({text.count(old)})')
        text = text.replace(old, new, 1)

    if text.count("'Version: 0.63.9'") != 1:
        raise SystemExit(f'{path}: diagnostic version anchor drift')
    text = text.replace("'Version: 0.63.9'", "'Version: 0.63.10'", 1)

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.10 latest.js/install.js (panel UI only)')
