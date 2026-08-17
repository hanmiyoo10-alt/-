from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

RELEASE_NOTES = """// v0.63.35 Runtime Stability Consolidation:\n// - Promotes the proven v0.63.34 runtime into the 0.63 golden baseline: generation/state semantics stay frozen while CI now executes behavioral regression fixtures across lifecycle modes, Frame, Time, Recovery, Evidence, persistence, manual-edit repair, repeat-send/rewind and deferred-mirror ordering\n// - Exposes the already-collected manual-edit reconcile path in the two-turn diagnostic so SAME_FAST, snapshot recovery and MANUAL_EDIT_REBUILT costs are distinguishable without inferring from elapsed time alone\n// - Adds a compact runtime Stability summary derived only from existing in-memory turn binding, authoritative output commit, deferred-mirror status, stale-drop count and named-hook lifecycle telemetry\n// - Adds no host/storage/API call, timer, polling, history scan, prompt/state field or output work; all 17 internal modules, request/output handlers, authoritative snapshot sequencing and Deferred Chat Mirror behavior remain byte-identical to v0.63.34\n//\n"""


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)

for path in FILES:
    src = path.read_text(encoding='utf-8')
    if src.count('//@version 0.63.34') != 1:
        raise SystemExit(f'{path}: wrong baseline version')

    src = src.replace('//@version 0.63.34', '//@version 0.63.35', 1)
    src = replace_once(
        src,
        '// v0.63.34 Deferred Chat Mirror:\n',
        RELEASE_NOTES + '// v0.63.34 Deferred Chat Mirror:\n',
        'release notes',
    )

    src = replace_once(
        src,
        "    const session = perf.sessionDetail || {};\n",
        "    const session = perf.sessionDetail || {};\n    const edit = perf.editDetail || {};\n",
        'request edit detail binding',
    )

    src = replace_once(
        src,
        "      restoreReason: String(send.restoreReason || 'n/a'), preRead: !!send.mustRestorePre, preHit: !!send.existingPre,\n",
        "      restoreReason: String(send.restoreReason || 'n/a'), preRead: !!send.mustRestorePre, preHit: !!send.existingPre,\n      editPath: String(edit.path || 'n/a'), editDidSave: !!edit.didSave,\n",
        'request edit detail return',
    )

    old_binding = """    const deferredMirror = outputFresh && lastDeferredMirrorProbe\n      && Number(lastDeferredMirrorProbe.outIndex) === Number(latestAssistantIndex)\n      && String(lastDeferredMirrorProbe.locationKey || '') === String(requestProbe?.locationKey || '')\n      ? lastDeferredMirrorProbe : null;\n    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;\n"""
    new_binding = """    const deferredMirror = outputFresh && lastDeferredMirrorProbe\n      && Number(lastDeferredMirrorProbe.outIndex) === Number(latestAssistantIndex)\n      && String(lastDeferredMirrorProbe.locationKey || '') === String(requestProbe?.locationKey || '')\n      ? lastDeferredMirrorProbe : null;\n    const editPathRaw = requestBreakdown ? String(requestBreakdown.editPath || 'n/a') : 'n/a';\n    const editPathLabel = editPathRaw === 'n/a'\n      ? 'n/a'\n      : editPathRaw.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');\n    const mirrorStatus = deferredMirror?.status || (outputFresh ? 'PENDING' : 'NOT_EXERCISED');\n    const bindingStatus = outputFresh ? 'BOUND' : (probeFresh ? 'REQUEST_ONLY' : 'NOT_EXERCISED');\n    const stabilityStatus = runtimeDisposed || requestProbe?.status === 'ERROR' || requestProbe?.outputStatus === 'ERROR'\n      ? 'FAIL'\n      : (outputFresh && mirrorStatus === 'COMMITTED' && staleRuntimeDrops === 0\n        ? 'PASS'\n        : (probeFresh ? 'OBSERVED' : 'NOT_EXERCISED'));\n    const cacheProbe = runtimeActive ? (lastRuntimePromptCacheProbe || null) : null;\n"""
    src = replace_once(src, old_binding, new_binding, 'stability diagnostic binding')

    old_turn = """      `Turn binding: request user @${probeFresh ? Number(requestProbe?.sendIndex) : 'n/a'} · output assistant @${outputFresh ? Number(requestProbe?.outIndex) : 'n/a'}`,\n      `Request timing: ${probeFresh ? `hook ${diagnosticTimingIso(requestProbe?.at)} · handshake +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.handshakeAt)} · prepared +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.preparedAt)} · done +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.requestDoneAt)}` : 'n/a'}`,\n"""
    new_turn = """      `Turn binding: request user @${probeFresh ? Number(requestProbe?.sendIndex) : 'n/a'} · output assistant @${outputFresh ? Number(requestProbe?.outIndex) : 'n/a'}`,\n      `Stability: ${stabilityStatus} · binding ${bindingStatus} · out ${outputFresh ? 'COMMITTED' : (probeFresh ? String(requestProbe?.outputStatus || 'n/a') : 'NOT_EXERCISED')} · mirror ${mirrorStatus} · stale ${staleRuntimeDrops} · hooks NAMED`,\n      `Request timing: ${probeFresh ? `hook ${diagnosticTimingIso(requestProbe?.at)} · handshake +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.handshakeAt)} · prepared +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.preparedAt)} · done +${diagnosticTimingDelta(requestProbe?.at, requestProbe?.requestDoneAt)}` : 'n/a'}`,\n"""
    src = replace_once(src, old_turn, new_turn, 'stability diagnostic line')

    old_post = """      `Post-handshake breakdown: ${requestBreakdown ? `bootstrap ${diagnosticFormatMs(requestBreakdown.bootstrapMs)} · edit ${diagnosticFormatMs(requestBreakdown.editReconcileMs)} · alias ${diagnosticFormatMs(requestBreakdown.aliasRepairMs)} · onSend ${diagnosticFormatMs(requestBreakdown.onSendMs)} · post-onSend ${diagnosticFormatMs(requestBreakdown.postOnSendMs)} · other ${diagnosticFormatMs(requestBreakdown.postHandshakeOther)} · total ${diagnosticFormatMs(requestBreakdown.postHandshakeTotal)}` : 'n/a'}`,\n      `onSend breakdown: ${requestBreakdown ? `pre-load ${diagnosticFormatMs(requestBreakdown.preLoadMs)} · template bootstrap ${diagnosticFormatMs(requestBreakdown.templateBootstrapMs)} · lifecycle ${diagnosticFormatMs(requestBreakdown.lifecycleMs)} · serialize ${diagnosticFormatMs(requestBreakdown.turnSerializeMs)} · storage ${diagnosticFormatMs(requestBreakdown.turnSetMs)} · prompt render ${diagnosticFormatMs(requestBreakdown.runtimeRenderMs)} · other ${diagnosticFormatMs(requestBreakdown.onSendOther)} · total ${diagnosticFormatMs(requestBreakdown.onSendMs)}` : 'n/a'}`,\n"""
    new_post = """      `Post-handshake breakdown: ${requestBreakdown ? `bootstrap ${diagnosticFormatMs(requestBreakdown.bootstrapMs)} · edit ${diagnosticFormatMs(requestBreakdown.editReconcileMs)} · alias ${diagnosticFormatMs(requestBreakdown.aliasRepairMs)} · onSend ${diagnosticFormatMs(requestBreakdown.onSendMs)} · post-onSend ${diagnosticFormatMs(requestBreakdown.postOnSendMs)} · other ${diagnosticFormatMs(requestBreakdown.postHandshakeOther)} · total ${diagnosticFormatMs(requestBreakdown.postHandshakeTotal)}` : 'n/a'}`,\n      `Edit reconcile: ${requestBreakdown ? `${editPathLabel} · ${diagnosticFormatMs(requestBreakdown.editReconcileMs)} · snapshot ${requestBreakdown.editDidSave ? 'UPDATED' : 'UNCHANGED'}` : 'n/a'}`,\n      `onSend breakdown: ${requestBreakdown ? `pre-load ${diagnosticFormatMs(requestBreakdown.preLoadMs)} · template bootstrap ${diagnosticFormatMs(requestBreakdown.templateBootstrapMs)} · lifecycle ${diagnosticFormatMs(requestBreakdown.lifecycleMs)} · serialize ${diagnosticFormatMs(requestBreakdown.turnSerializeMs)} · storage ${diagnosticFormatMs(requestBreakdown.turnSetMs)} · prompt render ${diagnosticFormatMs(requestBreakdown.runtimeRenderMs)} · other ${diagnosticFormatMs(requestBreakdown.onSendOther)} · total ${diagnosticFormatMs(requestBreakdown.onSendMs)}` : 'n/a'}`,\n"""
    src = replace_once(src, old_post, new_post, 'edit diagnostic line')

    src = replace_once(src, "'Version: 0.63.34'", "'Version: 0.63.35'", 'diagnostic version')
    src = replace_once(src, '⚙️ SimCore v0.63.34', '⚙️ SimCore v0.63.35', 'panel version')
    path.write_text(src, encoding='utf-8')

print('patched SimCore 0.63.35 Runtime Stability Consolidation')
