from pathlib import Path

paths = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = '''// v0.62.31 Timestamp Canonicalization Guard:\n// - Fixes a live regression where a model-emitted 00:xx AM/PM timestamp looked structurally valid but failed semantic timestamp parsing, bypassing the narrative current-time floor\n// - Canonicalizes unambiguous zero-hour 12-hour-clock tokens (00:xx AM/PM -> 12:xx AM/PM) before A/B/C time semantics run\n// - Timestamp syntax normalization is shared across A/B/C, while existing A/C narrative-time and Mode B broadcast-airtime semantics remain unchanged\n// - Adds output-only diagnostics for whether canonicalization occurred; no runtime prompt tokens, state schema change, history scan, auxiliary model, or new pluginStorage/API call site\n//\n'''

for path in paths:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.62.30' not in text:
        raise SystemExit(f'{path}: expected v0.62.30 base')

    text = text.replace('//@version 0.62.30', '//@version 0.62.31', 1)
    text = text.replace(
        '//@display-name SimCore v0.62.30 Current Age Anchor',
        '//@display-name SimCore v0.62.31 Timestamp Canonicalization Guard',
        1,
    )
    marker = '// v0.62.30 Current Age Anchor:\n'
    if marker not in text:
        raise SystemExit(f'{path}: changelog insertion marker missing')
    text = text.replace(marker, CHANGELOG + marker, 1)

    time_marker = "const BROADCAST_TIMESTAMP_RE = /⏱️\\[((?:19|20|21)\\d{2})-(\\d{2})-(\\d{2})\\s+\\(([^)]+)\\)\\s+(\\d{1,2}):(\\d{2})\\s+(AM|PM)\\]/i;\n\nfunction parseTimestamp(content) {"
    time_new = """const BROADCAST_TIMESTAMP_RE = /⏱️\\[((?:19|20|21)\\d{2})-(\\d{2})-(\\d{2})\\s+\\(([^)]+)\\)\\s+(\\d{1,2}):(\\d{2})\\s+(AM|PM)\\]/i;\nconst ZERO_HOUR_TIMESTAMP_RE = /(⏱️\\[(?:19|20|21)\\d{2}-\\d{2}-\\d{2}\\s+\\([^)]+\\)\\s+)00:(\\d{2})\\s+(AM|PM)\\]/gi;\n\nfunction canonicalizeTimestampSyntax(content) {\n  const text = String(content || '');\n  let count = 0;\n  const normalized = text.replace(ZERO_HOUR_TIMESTAMP_RE, (_m, prefix, minute, ampm) => {\n    count += 1;\n    return `${prefix}12:${minute} ${String(ampm || '').toUpperCase()}]`;\n  });\n  return { content: normalized, changed: count > 0, count };\n}\n\nfunction parseTimestamp(content) {"""
    if time_marker not in text:
        raise SystemExit(f'{path}: timestamp parser marker missing')
    text = text.replace(time_marker, time_new, 1)

    export_marker = "  BROADCAST_TIMESTAMP_RE,\n  explicitWorldYear,"
    export_new = "  BROADCAST_TIMESTAMP_RE,\n  ZERO_HOUR_TIMESTAMP_RE,\n  canonicalizeTimestampSyntax,\n  explicitWorldYear,"
    if export_marker not in text:
        raise SystemExit(f'{path}: time export marker missing')
    text = text.replace(export_marker, export_new, 1)

    finalize_marker = "  let finalText = String(prepared?.content || '');\n  const envelope = prepared?.envelope || { resolved: true, issues: [], diagnostics: [], repaired: false };"
    finalize_new = "  let finalText = String(prepared?.content || '');\n  const timestampCanonicalization = time.canonicalizeTimestampSyntax(finalText);\n  finalText = timestampCanonicalization.content;\n  const envelope = prepared?.envelope || { resolved: true, issues: [], diagnostics: [], repaired: false };"
    if finalize_marker not in text:
        raise SystemExit(f'{path}: finalize marker missing')
    text = text.replace(finalize_marker, finalize_new, 1)

    return_marker = "    stateCommit: commit,\n    narrativeClockProbe,\n  };"
    return_new = "    stateCommit: commit,\n    narrativeClockProbe,\n    timestampCanonicalization,\n  };"
    if return_marker not in text:
        raise SystemExit(f'{path}: finalize return marker missing')
    text = text.replace(return_marker, return_new, 1)

    runtime_var = '  let lastRuntimePromptBudget = null;\n'
    if runtime_var not in text:
        raise SystemExit(f'{path}: runtime diagnostic marker missing')
    text = text.replace(runtime_var, runtime_var + '  let lastTimestampCanonicalization = null;\n', 1)

    diagnostics_marker = "    if (diagnostics.length) console.log('[simcore/v0.62.30] compatibility diagnostics:', diagnostics.join(' / '));\n\n    const mirrorDetail = perf ? {} : null;"
    diagnostics_new = "    if (diagnostics.length) console.log('[simcore/v0.62.31] compatibility diagnostics:', diagnostics.join(' / '));\n    lastTimestampCanonicalization = result.timestampCanonicalization || null;\n\n    const mirrorDetail = perf ? {} : null;"
    if diagnostics_marker not in text:
        raise SystemExit(f'{path}: output diagnostic assignment marker missing')
    text = text.replace(diagnostics_marker, diagnostics_new, 1)

    age_metric = '<div class="metric"><div class="k">Current age anchor</div><div class="v">${Number(s?.koreanAgeOffset || 0) > 0 ? `ON · +1 line · offset +${Number(s?.koreanAgeOffset || 0)}` : `STANDBY · offset +0`}</div></div>\n'
    syntax_metric = age_metric + '<div class="metric"><div class="k">Timestamp syntax</div><div class="v">${lastTimestampCanonicalization ? (lastTimestampCanonicalization.changed ? `CANONICALIZED · ${Number(lastTimestampCanonicalization.count || 0)}` : `OK`) : `n/a`}</div></div>\n'
    if age_metric not in text:
        raise SystemExit(f'{path}: panel metric marker missing')
    text = text.replace(age_metric, syntax_metric, 1)

    text = text.replace('SimCore v0.62.30 <button', 'SimCore v0.62.31 <button', 1)
    text = text.replace(
        'v0.62.30 Current Age Anchor · offset-aware current-age formula · conditional +1 line',
        'v0.62.31 Timestamp Canonicalization Guard · 00-hour repair before A/B/C time semantics · prompt +0',
        1,
    )
    text = text.replace('[simcore/v0.62.30]', '[simcore/v0.62.31]')

    path.write_text(text, encoding='utf-8')
