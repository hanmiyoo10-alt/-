from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

CHANGELOG = """// v0.63.21 Diagnostic Turn Binding:\n// - Binds manual/panel runtime diagnostics to the exact current user turn and chat location instead of treating any same-chat in-memory probe as current\n// - Records memory-only beforeRequest route telemetry (hook seen, Core handshake found/not found, active/inactive/error, send index) without retaining request/story content or adding storage\n// - Separates current runtime mode from persisted last mode so a stale/inactive request can never display an older mode as if it were the current request classification\n// - Gates request/output-derived probes by turn freshness; RAW Frame continuity remains independently computed from the two visible completed turns\n// - Generation behavior, runtime prompt text, Frame/Evidence/Time/Lineage/Handoff/Recurrence semantics, state schema, storage and host/API call sites remain frozen\n//\n"""


def replace_once(text, old, new, label, path):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: {label} anchor drift ({count})')
    return text.replace(old, new, 1)


for path in FILES:
    text = path.read_text(encoding='utf-8')
    if '//@version 0.63.20' not in text:
        raise SystemExit(f'{path}: expected 0.63.20 baseline')
    if '// v0.63.21 Diagnostic Turn Binding:' in text:
        raise SystemExit(f'{path}: already patched')

    text = replace_once(text, '//@version 0.63.20', '//@version 0.63.21', 'version', path)
    text = replace_once(text, '// v0.63.20 Same-Title Chapter Hold:\n', CHANGELOG + '// v0.63.20 Same-Title Chapter Hold:\n', 'changelog', path)

    text = replace_once(
        text,
        '  let lastTimestampCanonicalization = null;\n',
        '  let lastTimestampCanonicalization = null;\n  let lastDiagnosticRequestProbe = null;\n',
        'diagnostic request probe state', path,
    )

    old_text_helper = """  function textMessageContent(m) {\n    if (!m) return '';\n    const v = m.content ?? m.data ?? m.text ?? '';\n    return typeof v === 'string' ? v : String(v || '');\n  }\n"""
    new_text_helper = old_text_helper + """\n  function diagnosticLocationKey(chaIdx, chatIdx, chat) {\n    return `${chaIdx}:${chatIdx}:${chat?.id ?? ''}`;\n  }\n\n  function diagnosticRequestProbeFresh(probe, currentKey, currentUserIndex) {\n    const index = Number(currentUserIndex);\n    return !!probe\n      && !!String(currentKey || '')\n      && Number.isInteger(index) && index >= 0\n      && String(probe.locationKey || '') === String(currentKey || '')\n      && Number(probe.sendIndex) === index;\n  }\n\n  function diagnosticRuntimeMode(probeFresh, probe) {\n    return probeFresh && probe?.status === 'ACTIVE' && probe?.mode ? String(probe.mode) : null;\n  }\n\n  function markDiagnosticRequestProbe(sendIndex, patch) {\n    if (!lastDiagnosticRequestProbe) return;\n    const expected = Number(sendIndex);\n    if (Number.isInteger(expected) && expected >= 0\n        && Number(lastDiagnosticRequestProbe.sendIndex) !== expected) return;\n    Object.assign(lastDiagnosticRequestProbe, patch || {});\n  }\n"""
    text = replace_once(text, old_text_helper, new_text_helper, 'diagnostic helper insertion', path)

    old_cs = """    const cs = await loadCoreForChat(chaIdx, chatIdx, chat);\n    if (perf) perf.sessionLoadMs = perfMs(t);\n    if (!cs) return { active: false };\n\n    t = perfNow();\n    const promptProbe = coreRules.inspectPromptMessages(messages, textMessageContent);\n"""
    new_cs = """    const cs = await loadCoreForChat(chaIdx, chatIdx, chat);\n    if (perf) perf.sessionLoadMs = perfMs(t);\n    if (!cs) {\n      markDiagnosticRequestProbe(sendIndex, { status: 'UNAVAILABLE', active: false, mode: null, errorStage: 'session-load' });\n      return { active: false };\n    }\n\n    t = perfNow();\n    const promptProbe = coreRules.inspectPromptMessages(messages, textMessageContent);\n    markDiagnosticRequestProbe(sendIndex, {\n      locationKey: String(coreLocationKey || diagnosticLocationKey(chaIdx, chatIdx, chat)),\n      handshake: promptProbe.active ? 'FOUND' : 'NOT FOUND',\n      promptProbeActive: !!promptProbe.active,\n      status: 'INSPECTED',\n    });\n"""
    text = replace_once(text, old_cs, new_cs, 'request handshake telemetry', path)

    old_after_send = """    const result = await cs.onSend(sendIndex, userText, promptProbe, snapshotDetail, chat?.message || []);\n    if (perf) {\n      perf.onSendMs = perfMs(t);\n      perf.snapshotDetail = snapshotDetail;\n    }\n"""
    new_after_send = """    const result = await cs.onSend(sendIndex, userText, promptProbe, snapshotDetail, chat?.message || []);\n    markDiagnosticRequestProbe(sendIndex, {\n      status: result.active ? 'ACTIVE' : 'INACTIVE',\n      active: !!result.active,\n      mode: result.active ? (result.state?.pending?.mode || null) : null,\n      preparedAt: Date.now(),\n    });\n    if (perf) {\n      perf.onSendMs = perfMs(t);\n      perf.snapshotDetail = snapshotDetail;\n    }\n"""
    text = replace_once(text, old_after_send, new_after_send, 'request active telemetry', path)

    old_before = """  await Risuai.addRisuReplacer('beforeRequest', async (messages, type) => {\n    if (type !== 'model') return messages;\n    const totalStart = perfNow();\n    const perf = {\n"""
    new_before = """  await Risuai.addRisuReplacer('beforeRequest', async (messages, type) => {\n    if (type !== 'model') return messages;\n    lastDiagnosticRequestProbe = {\n      locationKey: '', sendIndex: -1, requestType: String(type || ''), hookSeen: true,\n      handshake: 'UNKNOWN', promptProbeActive: null, status: 'SEEN', active: null, mode: null,\n      outIndex: -1, outputStatus: 'PENDING', errorStage: null, at: Date.now(),\n    };\n    let requestSendIndex = -1;\n    const totalStart = perfNow();\n    const perf = {\n"""
    text = replace_once(text, old_before, new_before, 'beforeRequest probe start', path)

    old_request_body = """      const detectedUserIndex = coreRules.latestUserIndex(chat);\n      const sendIndex = detectedUserIndex >= 0\n        ? detectedUserIndex\n        : Math.max(0, (chat?.message?.length ?? 1) - 1);\n      await prepareCoreRequest(messages, chaIdx, chatIdx, chat, sendIndex, perf);\n    } catch (e) {\n      console.log('[simcore/v0.63.4] beforeRequest error:', e.message);\n"""
    new_request_body = """      const detectedUserIndex = coreRules.latestUserIndex(chat);\n      const sendIndex = detectedUserIndex >= 0\n        ? detectedUserIndex\n        : Math.max(0, (chat?.message?.length ?? 1) - 1);\n      requestSendIndex = sendIndex;\n      Object.assign(lastDiagnosticRequestProbe, {\n        locationKey: diagnosticLocationKey(chaIdx, chatIdx, chat),\n        sendIndex,\n      });\n      await prepareCoreRequest(messages, chaIdx, chatIdx, chat, sendIndex, perf);\n    } catch (e) {\n      markDiagnosticRequestProbe(requestSendIndex, { status: 'ERROR', active: false, mode: null, errorStage: 'beforeRequest', errorName: e?.name || 'Error' });\n      console.log('[simcore/v0.63.4] beforeRequest error:', e.message);\n"""
    text = replace_once(text, old_request_body, new_request_body, 'beforeRequest binding/error', path)

    old_process_inactive = """    const result = await cs.processOutput(outIndex, content, outputDetail);\n    if (perf) {\n      perf.sessionProcessMs = perfMs(t);\n      perf.outputDetail = outputDetail;\n    }\n    if (!result.active) return content;\n"""
    new_process_inactive = """    const result = await cs.processOutput(outIndex, content, outputDetail);\n    if (perf) {\n      perf.sessionProcessMs = perfMs(t);\n      perf.outputDetail = outputDetail;\n    }\n    if (!result.active) {\n      markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'BYPASSED', outputAt: Date.now() });\n      return content;\n    }\n    markDiagnosticRequestProbe(outIndex - 1, { outIndex, outputStatus: 'COMMITTED', outputAt: Date.now() });\n"""
    text = replace_once(text, old_process_inactive, new_process_inactive, 'output binding', path)

    old_output_catch = """    } catch (e) {\n      console.log('[simcore/v0.63.4] output error:', e.message);\n      return content;\n"""
    new_output_catch = """    } catch (e) {\n      if (lastDiagnosticRequestProbe) Object.assign(lastDiagnosticRequestProbe, { outputStatus: 'ERROR', outputErrorStage: 'output', outputErrorName: e?.name || 'Error' });\n      console.log('[simcore/v0.63.4] output error:', e.message);\n      return content;\n"""
    text = replace_once(text, old_output_catch, new_output_catch, 'output error telemetry', path)

    old_fresh = """  function diagnosticProbeFresh() {\n    const currentKey = String(coreKey || coreLocationKey || '');\n    return !!currentKey && previousRuntimePromptKey === currentKey;\n  }\n"""
    new_fresh = """  function diagnosticProbeFresh(currentUserIndex) {\n    const currentKey = String(coreLocationKey || '');\n    return diagnosticRequestProbeFresh(lastDiagnosticRequestProbe, currentKey, currentUserIndex);\n  }\n"""
    text = replace_once(text, old_fresh, new_fresh, 'turn freshness function', path)

    old_report_vars = """    const lineage = lastRequestLineageProbe || null;\n    const handoff = lastCommunitySourceHandoffProbe || null;\n    const recurrenceProbe = lastTemplateRecurrenceProbe || null;\n    const frameGuard = lastFrameGuardProbe || null;\n    const evidenceMap = lastEvidenceMappingProbe || null;\n    const evidenceFence = lastEvidenceFenceProbe || null;\n    const narrative = lastNarrativeClockProbe || null;\n    const cacheProbe = lastRuntimePromptCacheProbe || null;\n    const budget = lastRuntimePromptBudget || null;\n    const probeFresh = diagnosticProbeFresh();\n"""
    new_report_vars = """    const requestProbe = lastDiagnosticRequestProbe || null;\n    const probeFresh = diagnosticProbeFresh(currentUserIndex);\n    const runtimeMode = diagnosticRuntimeMode(probeFresh, requestProbe);\n    const runtimeActive = !!runtimeMode;\n    const outputFresh = !!(runtimeActive\n      && requestProbe?.outputStatus === 'COMMITTED'\n      && Number(requestProbe?.outIndex) === Number(latestAssistantIndex));\n    const lineage = runtimeActive ? (lastRequestLineageProbe || null) : null;\n    const handoff = runtimeActive ? (lastCommunitySourceHandoffProbe || null) : null;\n    const recurrenceProbe = runtimeActive ? (lastTemplateRecurrenceProbe || null) : null;\n    const frameGuard = outputFresh ? (lastFrameGuardProbe || null) : null;\n    const evidenceMap = runtimeActive ? (lastEvidenceMappingProbe || null) : null;\n    const evidenceFence = runtimeActive ? (lastEvidenceFenceProbe || null) : null;\n    const narrative = outputFresh ? (lastNarrativeClockProbe || null) : null;\n    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;\n    const budget = runtimeActive ? (lastRuntimePromptBudget || null) : null;\n"""
    text = replace_once(text, old_report_vars, new_report_vars, 'report freshness gates', path)

    old_warnings = """    const warnings = Array.isArray(lastCore?.issues) ? lastCore.issues : [];\n    const compatibility = Array.isArray(lastCore?.diagnostics) ? lastCore.diagnostics : [];\n"""
    new_warnings = """    const warnings = outputFresh && Array.isArray(lastCore?.issues) ? lastCore.issues : [];\n    const compatibility = outputFresh && Array.isArray(lastCore?.diagnostics) ? lastCore.diagnostics : [];\n"""
    text = replace_once(text, old_warnings, new_warnings, 'report output telemetry gate', path)

    old_lines_head = """      'Version: 0.63.20',\n      `Captured: ${new Date().toISOString()}`,\n      `Probe context: ${probeFresh ? 'CURRENT CHAT' : 'STALE/UNAVAILABLE'}`,\n      `Mode: ${lastCore?.mode || state?.lastMode || 'n/a'}`,\n      `Warnings: ${warnings.length}`,\n      `Compatibility diagnostics: ${compatibility.length}`,\n"""
    new_lines_head = """      'Version: 0.63.21',\n      `Captured: ${new Date().toISOString()}`,\n      `Probe context: ${probeFresh ? 'CURRENT TURN' : (requestProbe?.sendIndex >= 0 ? `STALE · probe user @${Number(requestProbe.sendIndex)} · current user @${currentUserIndex >= 0 ? currentUserIndex : 'n/a'}` : 'UNAVAILABLE')}`,\n      `Request hook: ${probeFresh ? (requestProbe?.hookSeen ? 'SEEN' : 'n/a') : 'n/a'}`,\n      `Core handshake: ${probeFresh ? (requestProbe?.handshake || 'UNKNOWN') : 'n/a'}`,\n      `Runtime status: ${probeFresh ? (requestProbe?.status || 'UNKNOWN') : 'n/a'} · output ${probeFresh ? (requestProbe?.outputStatus || 'n/a') : 'n/a'}`,\n      `Mode: ${runtimeMode || 'n/a'}`,\n      `Stored last mode: ${state?.lastMode || 'n/a'}`,\n      `Turn binding: request user @${probeFresh ? Number(requestProbe?.sendIndex) : 'n/a'} · output assistant @${outputFresh ? Number(requestProbe?.outIndex) : 'n/a'}`,\n      `Warnings: ${outputFresh ? warnings.length : 'n/a'}`,\n      `Compatibility diagnostics: ${outputFresh ? compatibility.length : 'n/a'}`,\n"""
    text = replace_once(text, old_lines_head, new_lines_head, 'report provenance header', path)

    text = replace_once(
        text,
        "      `Short-C source lock: ${probeFresh && budget?.sourceAnchor ? 'ON' : 'OFF'}`,\n",
        "      `Short-C source lock: ${runtimeActive ? (budget?.sourceAnchor ? 'ON' : 'OFF') : 'n/a'}`,\n",
        'source-lock gate', path,
    )

    text = replace_once(
        text,
        "      `Frame continuity: ${frameProbe.label}`,\n      `Frame regression: ${frameProbe.regression}`,\n",
        "      `RAW frame continuity: ${frameProbe.label}`,\n      `RAW frame regression: ${frameProbe.regression}`,\n",
        'raw frame provenance labels', path,
    )

    text = replace_once(
        text,
        "      `Broadcast: ${state?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'} · airtime ${state?.broadcastAirtime || 'n/a'} · start ${state?.broadcastAirtimeStart || 'n/a'}`,\n",
        "      `Stored broadcast: ${state?.broadcastLocked ? 'LOCKED' : 'UNLOCKED'} · airtime ${state?.broadcastAirtime || 'n/a'} · start ${state?.broadcastAirtimeStart || 'n/a'}`,\n",
        'stored broadcast provenance label', path,
    )

    text = replace_once(
        text,
        "      [`Current mode: ${lastCore?.mode || state?.lastMode || 'n/a'}`],\n",
        "      [`Runtime mode: ${runtimeMode || 'n/a'} · stored last mode: ${state?.lastMode || 'n/a'}`],\n",
        'recent section mode provenance', path,
    )

    old_panel_mode = """      const panelModeLabel = lastCore.mode || s?.lastMode || 'A';\n      const panelWarningCount = Array.isArray(lastCore.issues) ? lastCore.issues.length : 0;\n"""
    new_panel_mode = """      const panelProbeFresh = diagnosticProbeFresh(panelCurrentUserIndex);\n      const panelModeLabel = diagnosticRuntimeMode(panelProbeFresh, lastDiagnosticRequestProbe) || 'n/a';\n      const panelRuntimeStatus = panelProbeFresh ? (lastDiagnosticRequestProbe?.status || 'UNKNOWN') : 'STALE';\n      const panelOutputFresh = !!(panelProbeFresh && panelModeLabel !== 'n/a'\n        && lastDiagnosticRequestProbe?.outputStatus === 'COMMITTED'\n        && Number(lastDiagnosticRequestProbe?.outIndex) === Number(panelLatestAssistantIndex));\n      const panelWarningCount = panelOutputFresh && Array.isArray(lastCore.issues) ? lastCore.issues.length : 0;\n"""
    text = replace_once(text, old_panel_mode, new_panel_mode, 'panel turn binding', path)

    text = replace_once(
        text,
        '<span class="chip neutral">MODE ${escapeHtml(panelModeLabel)}</span>\n',
        '<span class="chip neutral">MODE ${escapeHtml(panelModeLabel)}</span>\n<span class="chip ${panelRuntimeStatus === \'ACTIVE\' ? \'good\' : (panelRuntimeStatus === \'ERROR\' ? \'bad\' : \'neutral\')}">RUNTIME ${escapeHtml(panelRuntimeStatus)}</span>\n',
        'panel runtime status chip', path,
    )

    text = replace_once(
        text,
        '<div><div class="k">Mode</div><div class="v">${escapeHtml(lastCore.mode || s?.lastMode || \'A\')}</div></div>\n',
        '<div><div class="k">Runtime mode</div><div class="v">${escapeHtml(panelModeLabel)}</div></div>\n<div><div class="k">Stored last mode</div><div class="v">${escapeHtml(s?.lastMode || \'A\')}</div></div>\n',
        'panel mode provenance grid', path,
    )

    text = replace_once(text, '⚙️ SimCore v0.63.20', '⚙️ SimCore v0.63.21', 'panel version', path)

    text = replace_once(
        text,
        "    lastEvidenceFenceProbe = null;\n  });\n",
        "    lastEvidenceFenceProbe = null;\n    lastDiagnosticRequestProbe = null;\n  });\n",
        'unload diagnostic reset', path,
    )

    path.write_text(text, encoding='utf-8')

print('patched SimCore 0.63.21 latest.js/install.js (diagnostic turn binding + request handshake telemetry only)')
