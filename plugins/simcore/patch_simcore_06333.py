from pathlib import Path

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]

RELEASE_NOTE = """// v0.63.33 Output Commit Breakdown Diagnostics:\n// - Exposes the output timing measurements already collected by the existing output pipeline so core commit, mirror write and diagnostic overhead can be attributed instead of inferred from the single committed delta\n// - Reports output handler phases, processOutput state source and subphases, chat mirror subphases, plus one largest leaf hotspot; MEMORY_FAST versus STORAGE_FALLBACK is surfaced without changing the existing state-selection logic\n// - Adds no new timer, storage/API call, encoding pass, history scan or output work; the output handler, processCoreOutput, mirrorCoreState and all 17 internal SimCore modules remain byte-identical to v0.63.32\n// - Keeps Request/Handshake v0.63.31, Snapshot Write v0.63.32, Recovery/Thoughts, Time, Structure, Frame, Evidence, Prompt, reload safety and storage schema fully frozen\n//\n"""

HELPER = r'''  function diagnosticOutputBreakdown(perf) {
    if (!perf) return null;
    const n = (v) => Math.max(0, Number(v) || 0);
    const total = n(perf.totalMs);
    const detail = perf.outputDetail || {};
    const mirror = perf.mirrorDetail || {};

    const processTotal = n(perf.sessionProcessMs);
    const processKnown = n(detail.stateLoadMs) + n(detail.prepareMs) + n(detail.validateMs)
      + n(detail.finalizeMs) + n(detail.outSerializeMs) + n(detail.outSetMs) + n(detail.outPruneMs);
    const processOther = Math.max(0, processTotal - processKnown);

    const mirrorTotal = n(perf.mirrorMs);
    const mirrorKnown = n(mirror.chatLoadMs) + n(mirror.prepareMs) + n(mirror.setChatMs);
    const mirrorOther = Math.max(0, mirrorTotal - mirrorKnown);

    const outerKnown = n(perf.indicesMs) + n(perf.chatLoadMs) + n(perf.sessionLoadMs)
      + processTotal + mirrorTotal + n(perf.diagnosticsMs);
    const handlerOther = Math.max(0, total - outerKnown);
    const stateSource = String(detail.stateLoadSource || 'unknown').toUpperCase().replace(/[^A-Z0-9]+/g, '_');

    const candidates = [
      ['OUTPUT_INDICES', n(perf.indicesMs)], ['OUTPUT_CHAT_LOAD', n(perf.chatLoadMs)], ['OUTPUT_SESSION_LOAD', n(perf.sessionLoadMs)],
      ['OUTPUT_STATE_LOAD', n(detail.stateLoadMs)], ['RECOVERY_PREPARE', n(detail.prepareMs)], ['STRUCTURE_VALIDATE', n(detail.validateMs)],
      ['OUTPUT_FINALIZE', n(detail.finalizeMs)], ['OUT_SERIALIZE', n(detail.outSerializeMs)], ['OUT_STORAGE', n(detail.outSetMs)],
      ['OUTPUT_PROCESS_OTHER', processOther], ['MIRROR_CHAT_LOAD', n(mirror.chatLoadMs)], ['MIRROR_PREPARE', n(mirror.prepareMs)],
      ['CHAT_MIRROR_WRITE', n(mirror.setChatMs)], ['MIRROR_OTHER', mirrorOther], ['OUTPUT_DIAGNOSTICS', n(perf.diagnosticsMs)],
      ['OUTPUT_HANDLER_OTHER', handlerOther],
    ];
    candidates.sort((a, b) => b[1] - a[1]);
    const hotspot = candidates[0] || ['n/a', 0];

    return {
      total, handlerOther, processTotal, processOther, mirrorTotal, mirrorOther, stateSource,
      hotspot: hotspot[0], hotspotMs: hotspot[1], hotspotPercent: total > 0 ? (hotspot[1] / total) * 100 : 0,
      indicesMs: n(perf.indicesMs), chatLoadMs: n(perf.chatLoadMs), sessionLoadMs: n(perf.sessionLoadMs), diagnosticsMs: n(perf.diagnosticsMs),
      stateLoadMs: n(detail.stateLoadMs), prepareMs: n(detail.prepareMs), validateMs: n(detail.validateMs), finalizeMs: n(detail.finalizeMs),
      outSerializeMs: n(detail.outSerializeMs), outSetMs: n(detail.outSetMs), outPruneMs: n(detail.outPruneMs), pruneDeferred: !!detail.pruneDeferred,
      mirrorChatLoadMs: n(mirror.chatLoadMs), mirrorPrepareMs: n(mirror.prepareMs), mirrorSetChatMs: n(mirror.setChatMs),
    };
  }

'''


def replace_once(src: str, old: str, new: str, label: str) -> str:
    count = src.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one anchor, got {count}')
    return src.replace(old, new, 1)


def patch(src: str) -> str:
    src = replace_once(src, '//@version 0.63.32', '//@version 0.63.33', 'metadata version')
    src = replace_once(src, '// v0.63.32 Snapshot Write Cost Attribution:\n', RELEASE_NOTE + '// v0.63.32 Snapshot Write Cost Attribution:\n', 'release note')
    src = replace_once(src, "      'Version: 0.63.32',", "      'Version: 0.63.33',", 'diagnostic version')
    src = replace_once(src, '⚙️ SimCore v0.63.32', '⚙️ SimCore v0.63.33', 'panel version')

    build_anchor = '  function buildLastTurnDiagnosticReport(chat, state) {\n'
    src = replace_once(src, build_anchor, HELPER + build_anchor, 'output breakdown helper')

    request_breakdown_anchor = "    const requestBreakdown = requestPerf ? diagnosticRequestBreakdown(requestProbe, requestPerf) : null;\n"
    output_binding = request_breakdown_anchor + "    const outputBreakdown = outputFresh && lastOutputPerf ? diagnosticOutputBreakdown(lastOutputPerf) : null;\n"
    src = replace_once(src, request_breakdown_anchor, output_binding, 'output breakdown binding')

    output_timing_anchor = "      `Output timing: ${probeFresh && requestProbe?.outputSeenAt ? `seen ${diagnosticTimingIso(requestProbe.outputSeenAt)} · request→output gap ${diagnosticTimingDelta(requestProbe?.requestDoneAt, requestProbe?.outputSeenAt)} · committed +${diagnosticTimingDelta(requestProbe?.outputSeenAt, requestProbe?.outputAt)}` : 'n/a'}`,\n"
    output_lines = output_timing_anchor + (
        "      `Output handler breakdown: ${outputBreakdown ? `indices ${diagnosticFormatMs(outputBreakdown.indicesMs)} · chat ${diagnosticFormatMs(outputBreakdown.chatLoadMs)} · session ${diagnosticFormatMs(outputBreakdown.sessionLoadMs)} · process ${diagnosticFormatMs(outputBreakdown.processTotal)} · mirror ${diagnosticFormatMs(outputBreakdown.mirrorTotal)} · diagnostics ${diagnosticFormatMs(outputBreakdown.diagnosticsMs)} · other ${diagnosticFormatMs(outputBreakdown.handlerOther)} · total ${diagnosticFormatMs(outputBreakdown.total)}` : 'n/a'}`,\n"
        "      `Output process: ${outputBreakdown ? `state ${outputBreakdown.stateSource} · load ${diagnosticFormatMs(outputBreakdown.stateLoadMs)} · recovery ${diagnosticFormatMs(outputBreakdown.prepareMs)} · validate ${diagnosticFormatMs(outputBreakdown.validateMs)} · finalize ${diagnosticFormatMs(outputBreakdown.finalizeMs)} · serialize ${diagnosticFormatMs(outputBreakdown.outSerializeMs)} · storage ${diagnosticFormatMs(outputBreakdown.outSetMs)} · other ${diagnosticFormatMs(outputBreakdown.processOther)} · total ${diagnosticFormatMs(outputBreakdown.processTotal)}` : 'n/a'}`,\n"
        "      `Output mirror: ${outputBreakdown ? `chat ${diagnosticFormatMs(outputBreakdown.mirrorChatLoadMs)} · prepare ${diagnosticFormatMs(outputBreakdown.mirrorPrepareMs)} · setChat ${diagnosticFormatMs(outputBreakdown.mirrorSetChatMs)} · other ${diagnosticFormatMs(outputBreakdown.mirrorOther)} · total ${diagnosticFormatMs(outputBreakdown.mirrorTotal)}` : 'n/a'}`,\n"
        "      `Output hotspot: ${outputBreakdown ? `${outputBreakdown.hotspot} · ${diagnosticFormatMs(outputBreakdown.hotspotMs)} · ${Number(outputBreakdown.hotspotPercent || 0).toFixed(1)}%` : 'n/a'}`,\n"
    )
    src = replace_once(src, output_timing_anchor, output_lines, 'output diagnostic lines')
    return src


baseline = None
for path in FILES:
    src = path.read_text(encoding='utf-8')
    patched = patch(src)
    if baseline is None:
        baseline = patched
    elif patched != baseline:
        raise RuntimeError('latest/install patched artifacts diverged')
    path.write_text(patched, encoding='utf-8')

print('patched SimCore 0.63.33 Output Commit Breakdown Diagnostics')
