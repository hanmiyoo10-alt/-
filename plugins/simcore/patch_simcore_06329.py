from pathlib import Path

targets = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

def patch_one(path):
    s = path.read_text(encoding='utf-8')

    def repl(old, new, label):
        nonlocal s
        n = s.count(old)
        if n != 1:
            raise SystemExit(f'{path}: {label}: expected 1 anchor, found {n}')
        s = s.replace(old, new, 1)

    repl('//@version 0.63.28', '//@version 0.63.29', 'version')

    repl(
'''// v0.63.28 Multi-scene Narrative Clock Commit:\n''',
'''// v0.63.29 Preamble Provenance Diagnostics:\n// - Adds memory-only classification for text before the canonical # 응답 envelope: NONE, WHITESPACE_ONLY, THOUGHTS_COMPAT, DUPLICATE_ENVELOPE, UNKNOWN_TEXT or UNRESOLVED\n// - Records only kind, character/line counts, action, selected envelope offset and candidate count; preamble text itself is never retained in diagnostic provenance\n// - Preserves existing Recovery selection/removal/warning/compatibility behavior and state-commit semantics; this update observes provenance rather than changing repair policy\n// - Keeps Time v0.63.28, Structure v0.63.27, Frame, Evidence, Prompt, Lineage/Handoff, Recurrence, Reaction, reload safety, storage schema and host/API call sites frozen; only Recovery metadata plus minimal Session/runtime diagnostic wiring changes\n//\n// v0.63.28 Multi-scene Narrative Clock Commit:\n''', 'release note')

    repl(
'''function preambleDiagnostic(action) {\n  return `Thoughts 호환 preamble ${action}`;\n}\n\n// Whole-response restart recovery. Structure judges candidate integrity; Recovery chooses/moves content.\n''',
'''function preambleDiagnostic(action) {\n  return `Thoughts 호환 preamble ${action}`;\n}\n\nfunction buildPreambleProvenance(raw, matches, selectedIndex = -1, resolved = false) {\n  const text = String(raw || '');\n  const candidates = Array.isArray(matches) ? matches : [];\n  const firstOffset = candidates.length && Number.isInteger(candidates[0]?.index) ? Number(candidates[0].index) : -1;\n  const selectedOffset = selectedIndex >= 0 && Number.isInteger(candidates[selectedIndex]?.index)\n    ? Number(candidates[selectedIndex].index)\n    : firstOffset;\n  const rawPrefix = firstOffset >= 0 ? text.slice(0, firstOffset) : text;\n  const trimmed = rawPrefix.trim();\n  let kind = 'NONE';\n  let action = 'NONE';\n\n  if (!candidates.length) {\n    kind = 'UNRESOLVED';\n    action = 'UNRESOLVED';\n  } else if (candidates.length > 1) {\n    kind = 'DUPLICATE_ENVELOPE';\n    action = resolved ? 'SELECTED' : 'UNRESOLVED';\n  } else if (!rawPrefix.length) {\n    kind = 'NONE';\n    action = 'NONE';\n  } else if (!trimmed) {\n    kind = 'WHITESPACE_ONLY';\n    action = 'IGNORED';\n  } else if (isThoughtsCompatibilityPreamble(trimmed) || isKnownThoughtsPreamble(trimmed)) {\n    kind = 'THOUGHTS_COMPAT';\n    action = resolved ? 'STRIPPED' : 'UNRESOLVED';\n  } else {\n    kind = 'UNKNOWN_TEXT';\n    action = resolved ? 'STRIPPED' : 'UNRESOLVED';\n  }\n\n  return {\n    kind,\n    chars: rawPrefix.length,\n    lines: rawPrefix.length ? rawPrefix.split(/\\r?\\n/).length : 0,\n    action,\n    envelopeOffset: selectedOffset >= 0 ? selectedOffset : null,\n    candidateCount: candidates.length,\n    selectedCandidate: selectedIndex >= 0 ? selectedIndex + 1 : null,\n  };\n}\n\n// Whole-response restart recovery. Structure judges candidate integrity; Recovery chooses/moves content.\n''', 'provenance classifier')

    repl(
'''  if (!pending?.active) return { content: raw, repaired: false, issues: [], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: true };\n''',
'''  if (!pending?.active) return { content: raw, repaired: false, issues: [], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: true, preambleProvenance: null };\n''', 'inactive provenance')

    repl(
'''  if (!matches.length) {\n    return { content: raw.trim(), repaired: false, issues: ['응답 envelope: # 응답 시작점 없음'], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: false };\n  }\n''',
'''  if (!matches.length) {\n    const preambleProvenance = buildPreambleProvenance(raw, [], -1, false);\n    return { content: raw.trim(), repaired: false, issues: ['응답 envelope: # 응답 시작점 없음'], diagnostics: [], candidateCount: 0, selectedIndex: -1, resolved: false, preambleProvenance };\n  }\n''', 'missing response provenance')

    repl(
'''    if (matches.length > 1) issues.push(`응답 envelope 중복 ${matches.length}개 - 안전한 후보를 확정하지 못해 자동 병합하지 않음`);\n    if (prefix && !knownThoughtsPrefix) issues.push(preambleIssue('감지'));\n    return { content: raw.trim(), repaired: false, issues, diagnostics, candidateCount: matches.length, selectedIndex: -1, resolved: matches.length === 1 && !prefix };\n  }\n''',
'''    if (matches.length > 1) issues.push(`응답 envelope 중복 ${matches.length}개 - 안전한 후보를 확정하지 못해 자동 병합하지 않음`);\n    if (prefix && !knownThoughtsPrefix) issues.push(preambleIssue('감지'));\n    const resolved = matches.length === 1 && !prefix;\n    const preambleProvenance = buildPreambleProvenance(raw, matches, -1, resolved);\n    return { content: raw.trim(), repaired: false, issues, diagnostics, candidateCount: matches.length, selectedIndex: -1, resolved, preambleProvenance };\n  }\n''', 'unresolved candidate provenance')

    repl(
'''  if (prefix && !knownThoughtsPrefix) {\n    if (isThoughtsCompatibilityPreamble(prefix)) diagnostics.push(preambleDiagnostic('제거'));\n    else issues.push(preambleIssue('제거'));\n  }\n  return { content: selected.text, repaired, issues, diagnostics, candidateCount: matches.length, selectedIndex: selected.index, resolved: true };\n}\n''',
'''  if (prefix && !knownThoughtsPrefix) {\n    if (isThoughtsCompatibilityPreamble(prefix)) diagnostics.push(preambleDiagnostic('제거'));\n    else issues.push(preambleIssue('제거'));\n  }\n  const preambleProvenance = buildPreambleProvenance(raw, matches, selected.index, true);\n  return { content: selected.text, repaired, issues, diagnostics, candidateCount: matches.length, selectedIndex: selected.index, resolved: true, preambleProvenance };\n}\n''', 'resolved provenance')

    repl(
'''    result.issues = issues;\n    result.envelopeDiagnostics = prepared.envelope.diagnostics || [];\n    return result;\n''',
'''    result.issues = issues;\n    result.envelopeDiagnostics = prepared.envelope.diagnostics || [];\n    result.preambleProvenance = prepared.envelope.preambleProvenance || null;\n    return result;\n''', 'session provenance bridge')

    repl(
'''  let lastTimestampCanonicalization = null;\n  let lastDiagnosticRequestProbe = null;\n''',
'''  let lastTimestampCanonicalization = null;\n  let lastPreambleProvenance = null;\n  let lastDiagnosticRequestProbe = null;\n''', 'runtime provenance slot')

    repl(
'''    lastTimestampCanonicalization = result.timestampCanonicalization || null;\n\n    const mirrorDetail = perf ? {} : null;\n''',
'''    lastTimestampCanonicalization = result.timestampCanonicalization || null;\n    lastPreambleProvenance = result.preambleProvenance || null;\n\n    const mirrorDetail = perf ? {} : null;\n''', 'runtime provenance capture')

    repl(
'''    const narrative = outputFresh ? (lastNarrativeClockProbe || null) : null;\n    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;\n''',
'''    const narrative = outputFresh ? (lastNarrativeClockProbe || null) : null;\n    const preamble = outputFresh ? (lastPreambleProvenance || null) : null;\n    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;\n''', 'diagnostic provenance bind')

    repl("'Version: 0.63.28',", "'Version: 0.63.29',", 'diagnostic version')

    repl(
'''      `Compatibility diagnostics: ${outputFresh ? compatibility.length : 'n/a'}`,\n      `Prompt prefix: ${prefixLabel}`,\n''',
'''      `Compatibility diagnostics: ${outputFresh ? compatibility.length : 'n/a'}`,\n      `Preamble provenance: ${preamble ? `${preamble.kind || 'UNKNOWN'} · chars ${Number(preamble.chars || 0)} · lines ${Number(preamble.lines || 0)} · action ${preamble.action || 'n/a'} · envelope offset ${preamble.envelopeOffset == null ? 'n/a' : Number(preamble.envelopeOffset)} · candidates ${Number(preamble.candidateCount || 0)}${preamble.selectedCandidate == null ? '' : ` · selected ${Number(preamble.selectedCandidate)}`}` : 'n/a'}`,\n      `Prompt prefix: ${prefixLabel}`,\n''', 'diagnostic provenance line')

    repl('⚙️ SimCore v0.63.28', '⚙️ SimCore v0.63.29', 'panel version')

    path.write_text(s, encoding='utf-8')

for target in targets:
    patch_one(target)

if targets[0].read_bytes() != targets[1].read_bytes():
    raise SystemExit('artifact parity failed after patch')
print('patched SimCore 0.63.29 Preamble Provenance Diagnostics')
