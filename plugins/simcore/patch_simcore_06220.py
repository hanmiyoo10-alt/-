from pathlib import Path

p = Path('plugins/simcore/latest.js')
s = p.read_text()
assert '//@version 0.62.19' in s

s = s.replace('//@version 0.62.19', '//@version 0.62.20', 1)
s = s.replace('//@display-name SimCore v0.62.19 Narrative Clock Guard Phase 1', '//@display-name SimCore v0.62.20 Narrative Clock Diagnostics', 1)
old = '''// v0.62.19 Narrative Clock Guard Phase 1:\n// - Adds a conservative current-narrative timestamp anchor for non-broadcast modes\n// - Activates only when the user opens with a clear forward calendar/relative-time transition\n// - When active, the next current timestamp may not precede the previous non-broadcast timestamp\n// - Embedded preview/flashback/event time must not replace the current narrative timestamp\n// - No calendar guessing for ambiguous week/day phrases; no Broadcast/Community/Reaction behavior changes'''
new = '''// v0.62.20 Narrative Clock Diagnostics:\n// - Runtime diagnostics only; Narrative Clock Guard behavior from v0.62.19 is unchanged\n// - Records guard ON/OFF, trigger, previous anchor, output timestamp, and commit direction\n// - Records non-broadcast mode transitions so C -> A / A -> C clock continuity can be observed\n// - Backward movement with the guard OFF is reported as BACKWARD OBSERVED but is not blocked\n// - No new prompt tokens, persistent state fields, storage I/O, or Broadcast/Community/Reaction changes\n//\n// v0.62.19 Narrative Clock Guard Phase 1:\n// - Adds a conservative current-narrative timestamp anchor for non-broadcast modes\n// - Activates only when the user opens with a clear forward calendar/relative-time transition\n// - When active, the next current timestamp may not precede the previous non-broadcast timestamp\n// - Embedded preview/flashback/event time must not replace the current narrative timestamp\n// - No calendar guessing for ambiguous week/day phrases; no Broadcast/Community/Reaction behavior changes'''
assert old in s
s = s.replace(old, new, 1)

old = '''  time.applyWorldYear(state, time.timestampYear(finalText));\n  if (!/^B_/.test(String(p.mode || ''))) {\n    const narrativeCommit = time.commitNarrativeTimestamp(state, p, finalText);\n    if (narrativeCommit.reason === 'backward') {\n      state.lastNarrativeClockWarning = {\n        previous: narrativeCommit.previous || null,\n        rejected: narrativeCommit.timestamp || null,\n        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,\n        reason: p.narrativeProgressionReason || 'forward',\n      };\n    } else {\n      delete state.lastNarrativeClockWarning;\n    }\n  }\n  if (/^B_/.test(String(p.mode || ''))) {'''
new = '''  time.applyWorldYear(state, time.timestampYear(finalText));\n  let narrativeClockProbe = null;\n  if (!/^B_/.test(String(p.mode || ''))) {\n    const narrativeCommit = time.commitNarrativeTimestamp(state, p, finalText);\n    const previousNarrative = narrativeCommit.previous || p.narrativeTimestampPrevious || null;\n    const narrativeCmp = narrativeCommit.timestamp && previousNarrative\n      ? time.compareTimestamps(narrativeCommit.timestamp, previousNarrative)\n      : null;\n    let narrativeCommitStatus = 'UNKNOWN';\n    if (narrativeCommit.reason === 'backward') narrativeCommitStatus = 'REJECTED BACKWARD';\n    else if (narrativeCommit.reason === 'missing-or-invalid') narrativeCommitStatus = 'MISSING TIMESTAMP';\n    else if (narrativeCommit.reason === 'committed' && !previousNarrative) narrativeCommitStatus = 'SEEDED';\n    else if (narrativeCommit.reason === 'committed' && narrativeCmp != null && narrativeCmp < 0) narrativeCommitStatus = 'BACKWARD OBSERVED';\n    else if (narrativeCommit.reason === 'committed' && narrativeCmp === 0) narrativeCommitStatus = 'SAME';\n    else if (narrativeCommit.reason === 'committed' && narrativeCmp != null && narrativeCmp > 0) narrativeCommitStatus = 'ADVANCED';\n    else if (narrativeCommit.reason === 'committed') narrativeCommitStatus = narrativeCommit.changed ? 'COMMITTED' : 'SAME';\n    narrativeClockProbe = {\n      sendIndex: Number.isInteger(Number(p.sendIndex)) ? Number(p.sendIndex) : -1,\n      outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,\n      mode: p.mode || null,\n      guardActive: !!p.narrativeClockGuard,\n      trigger: p.narrativeProgressionReason || 'none',\n      previousAnchor: previousNarrative,\n      outputTimestamp: narrativeCommit.timestamp || null,\n      commitStatus: narrativeCommitStatus,\n      commitReason: narrativeCommit.reason || 'unknown',\n      at: Date.now(),\n    };\n    if (narrativeCommit.reason === 'backward') {\n      state.lastNarrativeClockWarning = {\n        previous: narrativeCommit.previous || null,\n        rejected: narrativeCommit.timestamp || null,\n        outIndex: Number.isInteger(Number(outIndex)) ? Number(outIndex) : -1,\n        reason: p.narrativeProgressionReason || 'forward',\n      };\n    } else {\n      delete state.lastNarrativeClockWarning;\n    }\n  }\n  if (/^B_/.test(String(p.mode || ''))) {'''
assert old in s
s = s.replace(old, new, 1)

old = '''    envelopeRepaired: !!envelope.repaired,\n    stateCommit: commit,\n  };'''
new = '''    envelopeRepaired: !!envelope.repaired,\n    stateCommit: commit,\n    narrativeClockProbe,\n  };'''
assert old in s
s = s.replace(old, new, 1)

old = '''    const base = existingPre || this.current || kernel.initialState();\n\n    t = sessionNow();'''
new = '''    const base = existingPre || this.current || kernel.initialState();\n    if (detail) detail.previousMode = base?.lastMode || null;\n\n    t = sessionNow();'''
assert old in s
s = s.replace(old, new, 1)

old = '''  let lastPerf = null;\n  let lastOutputPerf = null;\n  let lastHistoryRestore = null;'''
new = '''  let lastPerf = null;\n  let lastOutputPerf = null;\n  let lastHistoryRestore = null;\n  let lastNarrativeClockProbe = null;'''
assert old in s
s = s.replace(old, new, 1)

old = '''    if (result.active && result.promptBlock) {\n      messages.push({ role: 'system', content: result.promptBlock });\n      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };\n    } else {'''
new = '''    if (result.active && result.promptBlock) {\n      messages.push({ role: 'system', content: result.promptBlock });\n      const pendingProbe = result.state.pending || null;\n      if (pendingProbe && !/^B_/.test(String(pendingProbe.mode || ''))) {\n        lastNarrativeClockProbe = {\n          phase: 'pending',\n          sendIndex: Number.isInteger(Number(pendingProbe.sendIndex)) ? Number(pendingProbe.sendIndex) : -1,\n          outIndex: -1,\n          previousMode: snapshotDetail?.previousMode || null,\n          mode: pendingProbe.mode || null,\n          guardActive: !!pendingProbe.narrativeClockGuard,\n          trigger: pendingProbe.narrativeProgressionReason || 'none',\n          previousAnchor: pendingProbe.narrativeTimestampPrevious || null,\n          outputTimestamp: null,\n          commitStatus: 'PENDING',\n          commitReason: 'pending',\n          at: Date.now(),\n        };\n      }\n      lastCore = { active: true, mode: result.state.pending?.mode || null, issues: [], diagnostics: [] };\n    } else {'''
assert old in s
s = s.replace(old, new, 1)

old = '''    const normalizationIssues = ops.normalizationIssues(result.state);\n    if (normalizationIssues.length) console.log('[simcore/v0.62.19] reaction normalization:', normalizationIssues.join(' / '));\n    const quarantineIssues = result.stateCommit?.communitySafe === false ? [result.stateCommit.reason] : [];'''
new = '''    const normalizationIssues = ops.normalizationIssues(result.state);\n    if (normalizationIssues.length) console.log('[simcore/v0.62.20] reaction normalization:', normalizationIssues.join(' / '));\n    if (result.narrativeClockProbe) {\n      const priorProbe = lastNarrativeClockProbe && lastNarrativeClockProbe.sendIndex === result.narrativeClockProbe.sendIndex\n        ? lastNarrativeClockProbe\n        : null;\n      lastNarrativeClockProbe = {\n        ...result.narrativeClockProbe,\n        phase: 'output',\n        previousMode: priorProbe?.previousMode || null,\n      };\n    }\n    const quarantineIssues = result.stateCommit?.communitySafe === false ? [result.stateCommit.reason] : [];'''
assert old in s
s = s.replace(old, new, 1)

old = '''      const currentSnapshotPath = !snap\n        ? 'NO REQUEST DATA'\n        : (!snap.mustRestorePre\n          ? 'FORWARD · no restore'\n          : (snap.existingPre\n            ? `RESTORED · ${escapeHtml(snap.restoreReason || 'restore')}`\n            : `MISS · ${escapeHtml(snap.restoreReason || 'restore')}`));\n      document.body.innerHTML = `'''
new = '''      const currentSnapshotPath = !snap\n        ? 'NO REQUEST DATA'\n        : (!snap.mustRestorePre\n          ? 'FORWARD · no restore'\n          : (snap.existingPre\n            ? `RESTORED · ${escapeHtml(snap.restoreReason || 'restore')}`\n            : `MISS · ${escapeHtml(snap.restoreReason || 'restore')}`));\n      const narrativeProbe = lastNarrativeClockProbe;\n      const narrativeTransition = narrativeProbe\n        ? `${narrativeProbe.previousMode || '?'} → ${narrativeProbe.mode || '?'}`\n        : 'n/a';\n      const narrativeGuardLabel = narrativeProbe ? (narrativeProbe.guardActive ? 'ON' : 'OFF') : 'n/a';\n      document.body.innerHTML = `'''
assert old in s
s = s.replace(old, new, 1)

s = s.replace('<h1>⚙️ SimCore v0.62.19 <button id="close">닫기</button></h1>', '<h1>⚙️ SimCore v0.62.20 <button id="close">닫기</button></h1>', 1)
old = '''<div class="metric"><div class="k">Current snapshot path</div><div class="v">${currentSnapshotPath}</div></div>\n<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n<div class="metric"><div class="k">output</div><div class="v">${lastOutputPerf ? `${lastOutputPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n</div>'''
new = '''<div class="metric"><div class="k">Current snapshot path</div><div class="v">${currentSnapshotPath}</div></div>\n<div class="metric"><div class="k">Narrative guard</div><div class="v">${narrativeGuardLabel}</div></div>\n<div class="metric"><div class="k">Mode transition</div><div class="v">${escapeHtml(narrativeTransition)}</div></div>\n<div class="metric"><div class="k">beforeRequest</div><div class="v">${lastPerf ? `${lastPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n<div class="metric"><div class="k">output</div><div class="v">${lastOutputPerf ? `${lastOutputPerf.totalMs.toFixed(1)} ms` : 'n/a'}</div></div>\n</div>'''
assert old in s
s = s.replace(old, new, 1)

old = '''${(lastCore.diagnostics || []).length ? `<div class="card"><div class="k" style="margin-bottom:8px">Compatibility diagnostics</div><div>${lastCore.diagnostics.map((x) => `• ${escapeHtml(x)}`).join('<br>')}</div></div>` : ''}\n${s?.lastNarrativeClockWarning ?'''
new = '''${(lastCore.diagnostics || []).length ? `<div class="card"><div class="k" style="margin-bottom:8px">Compatibility diagnostics</div><div>${lastCore.diagnostics.map((x) => `• ${escapeHtml(x)}`).join('<br>')}</div></div>` : ''}\n${narrativeProbe ? `<div class="card"><div class="k" style="margin-bottom:8px">Narrative clock probe (runtime)</div><div>${escapeHtml(narrativeProbe.commitStatus || 'UNKNOWN')} · ${escapeHtml(narrativeTransition)} · guard ${narrativeProbe.guardActive ? 'ON' : 'OFF'}</div><div class="muted" style="margin-top:5px">trigger ${escapeHtml(narrativeProbe.trigger || 'none')} · previous ${escapeHtml(narrativeProbe.previousAnchor || 'unknown')} · output ${escapeHtml(narrativeProbe.outputTimestamp || 'pending')}</div></div>` : ''}\n${s?.lastNarrativeClockWarning ?'''
assert old in s
s = s.replace(old, new, 1)

s = s.replace('v0.62.19 Narrative Clock Guard Phase 1 · relational forward guard · no calendar guessing', 'v0.62.20 Narrative Clock Diagnostics · runtime probe only · behavior unchanged', 1)
s = s.replace("'SimCore v0.62.19'", "'SimCore v0.62.20'", 1)
s = s.replace('[simcore/v0.62.19]', '[simcore/v0.62.20]')
s = s.replace('SimCore v0.62.19', 'SimCore v0.62.20')

p.write_text(s)
Path('plugins/simcore/install.js').write_text(s)
