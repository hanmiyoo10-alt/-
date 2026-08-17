from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 anchor, found {count}')
    return text.replace(old, new, 1)


def patch(text):
    text = replace_once(
        text,
        '//@version 0.63.31',
        '//@version 0.63.32',
        'metadata version',
    )

    notes_anchor = '// v0.63.31 Request / Handshake Breakdown Diagnostics:\n'
    notes = (
        '// v0.63.32 Snapshot Write Cost Attribution:\n'
        '// - Extends the existing request telemetry with the already-serialized bundled turn snapshot character length so pluginStorage set latency can be compared against payload size without another storage call or encoding pass\n'
        '// - Reports whether the pre snapshot recovery read was skipped/read-hit/read-miss, the restore reason, turn payload characters, serialize time, set time and set milliseconds per 1K serialized characters\n'
        '// - Uses payload string length rather than UTF-8 byte measurement deliberately: no TextEncoder/Blob/second stringify scan is added to the request-critical path\n'
        '// - Keeps snapshot keys, bundled {pre,send} payload shape, durability/await ordering, storage schema, host/API call counts and all generation/output semantics frozen; only Store/Session metric plumbing plus runtime diagnostic formatting changes\n'
        '//\n'
    )
    text = replace_once(text, notes_anchor, notes + notes_anchor, 'release notes anchor')

    text = replace_once(
        text,
        "    const payload = JSON.stringify({ snapshotVersion: 1, pre: preState, send: sendState });\n"
        "    if (metric) metric.serializeMs = Math.max(0, storeNow() - t);\n"
        "    t = storeNow();",
        "    const payload = JSON.stringify({ snapshotVersion: 1, pre: preState, send: sendState });\n"
        "    if (metric) {\n"
        "      metric.serializeMs = Math.max(0, storeNow() - t);\n"
        "      metric.payloadChars = payload.length;\n"
        "    }\n"
        "    t = storeNow();",
        'saveTurn payload metric',
    )

    text = replace_once(
        text,
        "      detail.turnSerializeMs = 0;\n"
        "      detail.turnSetMs = 0;\n"
        "      detail.lifecycleMs = 0;",
        "      detail.turnSerializeMs = 0;\n"
        "      detail.turnSetMs = 0;\n"
        "      detail.turnPayloadChars = 0;\n"
        "      detail.lifecycleMs = 0;",
        'session metric defaults',
    )

    text = replace_once(
        text,
        "      detail.turnSerializeMs = Number(turnMetric.serializeMs || 0);\n"
        "      detail.turnSetMs = Number(turnMetric.setMs || 0);",
        "      detail.turnSerializeMs = Number(turnMetric.serializeMs || 0);\n"
        "      detail.turnSetMs = Number(turnMetric.setMs || 0);\n"
        "      detail.turnPayloadChars = Number(turnMetric.payloadChars || 0);",
        'session metric copy',
    )

    text = replace_once(
        text,
        "    const onSendOther = Math.max(0, n(perf.onSendMs) - onSendKnown);\n\n"
        "    const candidates = [",
        "    const onSendOther = Math.max(0, n(perf.onSendMs) - onSendKnown);\n"
        "    const turnPayloadChars = n(send.turnPayloadChars);\n"
        "    const turnSetPerKChars = turnPayloadChars > 0\n"
        "      ? n(send.turnSetMs) / (turnPayloadChars / 1000)\n"
        "      : null;\n\n"
        "    const candidates = [",
        'request breakdown storage attribution',
    )

    text = replace_once(
        text,
        "      turnSerializeMs: n(send.turnSerializeMs), turnSetMs: n(send.turnSetMs), runtimeRenderMs: n(send.runtimeRenderMs),\n"
        "    };",
        "      turnSerializeMs: n(send.turnSerializeMs), turnSetMs: n(send.turnSetMs), turnPayloadChars, turnSetPerKChars, runtimeRenderMs: n(send.runtimeRenderMs),\n"
        "      restoreReason: String(send.restoreReason || 'n/a'), preRead: !!send.mustRestorePre, preHit: !!send.existingPre,\n"
        "    };",
        'request breakdown result fields',
    )

    text = replace_once(
        text,
        "      `onSend breakdown: ${requestBreakdown ? `pre-load ${diagnosticFormatMs(requestBreakdown.preLoadMs)} · template bootstrap ${diagnosticFormatMs(requestBreakdown.templateBootstrapMs)} · lifecycle ${diagnosticFormatMs(requestBreakdown.lifecycleMs)} · serialize ${diagnosticFormatMs(requestBreakdown.turnSerializeMs)} · storage ${diagnosticFormatMs(requestBreakdown.turnSetMs)} · prompt render ${diagnosticFormatMs(requestBreakdown.runtimeRenderMs)} · other ${diagnosticFormatMs(requestBreakdown.onSendOther)} · total ${diagnosticFormatMs(requestBreakdown.onSendMs)}` : 'n/a'}`,\n"
        "      `Request hotspot: ${requestBreakdown ? `${requestBreakdown.hotspot} · ${diagnosticFormatMs(requestBreakdown.hotspotMs)} · ${Number(requestBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,",
        "      `onSend breakdown: ${requestBreakdown ? `pre-load ${diagnosticFormatMs(requestBreakdown.preLoadMs)} · template bootstrap ${diagnosticFormatMs(requestBreakdown.templateBootstrapMs)} · lifecycle ${diagnosticFormatMs(requestBreakdown.lifecycleMs)} · serialize ${diagnosticFormatMs(requestBreakdown.turnSerializeMs)} · storage ${diagnosticFormatMs(requestBreakdown.turnSetMs)} · prompt render ${diagnosticFormatMs(requestBreakdown.runtimeRenderMs)} · other ${diagnosticFormatMs(requestBreakdown.onSendOther)} · total ${diagnosticFormatMs(requestBreakdown.onSendMs)}` : 'n/a'}`,\n"
        "      `Pre snapshot: ${requestBreakdown ? `${String(requestBreakdown.restoreReason || 'n/a').toUpperCase()} · ${requestBreakdown.preRead ? `READ ${requestBreakdown.preHit ? 'HIT' : 'MISS'}` : 'SKIPPED'} · ${diagnosticFormatMs(requestBreakdown.preLoadMs)}` : 'n/a'}`,\n"
        "      `Turn storage: ${requestBreakdown ? `payload ${Math.round(Number(requestBreakdown.turnPayloadChars || 0)).toLocaleString('en-US')} chars · serialize ${diagnosticFormatMs(requestBreakdown.turnSerializeMs)} · set ${diagnosticFormatMs(requestBreakdown.turnSetMs)} · set/1K ${requestBreakdown.turnSetPerKChars == null ? 'n/a' : `${Number(requestBreakdown.turnSetPerKChars).toFixed(2)} ms`}` : 'n/a'}`,\n"
        "      `Request hotspot: ${requestBreakdown ? `${requestBreakdown.hotspot} · ${diagnosticFormatMs(requestBreakdown.hotspotMs)} · ${Number(requestBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,",
        'diagnostic storage lines',
    )

    text = replace_once(text, "      'Version: 0.63.31',", "      'Version: 0.63.32',", 'diagnostic version')
    text = replace_once(text, '⚙️ SimCore v0.63.31', '⚙️ SimCore v0.63.32', 'panel version')
    return text


for path in FILES:
    original = path.read_text(encoding='utf-8')
    updated = patch(original)
    path.write_text(updated, encoding='utf-8')

if FILES[0].read_bytes() != FILES[1].read_bytes():
    raise SystemExit('latest/install parity failed after patch')

print('patched SimCore 0.63.32 Snapshot Write Cost Attribution')
