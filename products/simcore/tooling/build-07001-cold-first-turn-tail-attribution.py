#!/usr/bin/env python3
from pathlib import Path
import re

FILES = [Path('plugins/simcore/latest.js'), Path('plugins/simcore/install.js')]
FROM_VERSION = '0.70.0'
TARGET_VERSION = '0.70.1'

RELEASE_NOTE = '''// v0.70.1 Cold First-Turn Tail Attribution:\n// - Splits the existing post-onSend residual into bounded current-request timing segments for history stabilization, prompt accounting, cache topology, cache candidate work and conservative unattributed remainder\n// - Keeps the previous post-onSend total authoritative and reports BOUNDED only when named non-negative segments close within rounding tolerance; checkpoint failure degrades diagnostics to UNRESOLVED\n// - Adds monotonic timestamp reads and pure OPS accounting only; no await, yield, callback, timer, storage/network/chat I/O, prompt/state/output semantic or persistent telemetry schema change\n// - Preserves v0.70.0 Current Task Primacy Guard, v0.69.2 MamsHolic aliases, COMMUNITY_CLASSIFIER_VERSION 3 and the M2-6 architecture graph\n//\n'''

OPS_OLD = '''function perfNow() {\n  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();\n}\nfunction perfMs(start) { return Math.max(0, perfNow() - start); }\nfunction normalizationIssues(state) {'''
OPS_NEW = '''function perfNow() {\n  return (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();\n}\nfunction perfMs(start) { return Math.max(0, perfNow() - start); }\nfunction timingCheckpoint(nowFn = perfNow) {\n  try {\n    const value = Number(nowFn());\n    return Number.isFinite(value) ? value : null;\n  } catch (_) {\n    return null;\n  }\n}\nfunction timingSpan(start, end) {\n  if (start == null || end == null) return null;\n  const value = Number(end) - Number(start);\n  return Number.isFinite(value) && value >= 0 ? value : null;\n}\nfunction postOnSendAttribution(totalMs, segments, toleranceMs = 0.5) {\n  const total = Number(totalMs);\n  const tolerance = Math.max(0, Number(toleranceMs) || 0);\n  const values = Array.isArray(segments) ? segments.map((value) => value == null ? null : Number(value)) : [];\n  const invalid = !Number.isFinite(total) || total < 0 || !values.length || values.some((value) => value == null || !Number.isFinite(value) || value < 0);\n  if (invalid) {\n    return { totalMs: Number.isFinite(total) && total >= 0 ? total : null, namedMs: null, unattributedMs: null, confidence: 'UNRESOLVED', checkpointFailure: true };\n  }\n  const named = values.reduce((sum, value) => sum + value, 0);\n  const remainder = total - named;\n  if (!Number.isFinite(named) || !Number.isFinite(remainder) || remainder < -tolerance) {\n    return { totalMs: total, namedMs: null, unattributedMs: null, confidence: 'UNRESOLVED', checkpointFailure: true };\n  }\n  return { totalMs: total, namedMs: named, unattributedMs: Math.max(0, remainder), confidence: 'BOUNDED', checkpointFailure: false };\n}\nfunction normalizationIssues(state) {'''


def fail(code, detail=''):
    raise SystemExit(f"{code}{(': ' + detail) if detail else ''}")


def one(text, old, new, label):
    count = text.count(old)
    if count != 1:
        fail('07001_PATCH_ANCHOR_INVALID', f'{label} count={count}')
    return text.replace(old, new, 1)


def module_bounds(text, name):
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    starts = [m.start() for m in re.finditer(re.escape(token), text)]
    if len(starts) != 1:
        fail('07001_MODULE_BOUNDARY_INVALID', f'{name} count={len(starts)}')
    start = starts[0]
    next_start = text.find('\nSimCore.define("', start + len(token))
    return start, next_start if next_start >= 0 else len(text)


def module_text(text, name):
    s, e = module_bounds(text, name)
    return text[s:e]


def patch(text):
    text = one(text, f'//@version {FROM_VERSION}', f'//@version {TARGET_VERSION}', 'metadata-version')
    text = one(text, "const SIMCORE_RUNTIME_VERSION = '0.70.0';", "const SIMCORE_RUNTIME_VERSION = '0.70.1';", 'runtime-version')
    text = one(text, "const HOST_COMPAT_VERSION = '0.70.0';", "const HOST_COMPAT_VERSION = '0.70.1';", 'host-version')
    text = one(text, '// v0.70.0 Current Task Primacy Guard:', RELEASE_NOTE + '// v0.70.0 Current Task Primacy Guard:', 'release-note')

    text = one(text, OPS_OLD, OPS_NEW, 'ops-timing-helpers')
    text = one(
        text,
        'module.exports = { perfNow, perfMs, normalizationIssues };',
        'module.exports = { perfNow, perfMs, timingCheckpoint, timingSpan, postOnSendAttribution, normalizationIssues };',
        'ops-exports',
    )
    text = one(
        text,
        '  const { perfNow, perfMs } = ops;',
        '  const { perfNow, perfMs, timingCheckpoint, timingSpan, postOnSendAttribution } = ops;',
        'outer-ops-destructure',
    )
    text = one(
        text,
        '      bootstrapMs: 0, editReconcileMs: 0, editDetail: null, aliasRepairMs: 0, aliasRepair: null, onSendMs: 0, snapshotDetail: null, postOnSendMs: 0,',
        '      bootstrapMs: 0, editReconcileMs: 0, editDetail: null, aliasRepairMs: 0, aliasRepair: null, onSendMs: 0, snapshotDetail: null, postOnSendMs: 0, postOnSendHistoryStabilizationMs: null, postOnSendPromptAccountingMs: null, cacheCandidateMs: null, postOnSendAttribution: null,',
        'request-perf-record',
    )
    text = one(
        text,
        '      lastHistoryStabilizationProbe = stabilizeHistoryProjection(messages, chat?.message || [], sendIndex);',
        "      const postOnSendHistoryStarted = timingCheckpoint();\n      lastHistoryStabilizationProbe = stabilizeHistoryProjection(messages, chat?.message || [], sendIndex);\n      if (perf) perf.postOnSendHistoryStabilizationMs = timingSpan(postOnSendHistoryStarted, timingCheckpoint());",
        'history-stabilization-checkpoint',
    )
    text = one(
        text,
        "      const runtimeBudgetText = String(result.promptBlock || '');",
        "      const postOnSendPromptAccountingStarted = timingCheckpoint();\n      const runtimeBudgetText = String(result.promptBlock || '');",
        'prompt-accounting-start',
    )
    text = one(
        text,
        "      messages.push({ role: 'system', content: result.promptBlock });",
        "      messages.push({ role: 'system', content: result.promptBlock });\n      if (perf) perf.postOnSendPromptAccountingMs = timingSpan(postOnSendPromptAccountingStarted, timingCheckpoint());",
        'prompt-accounting-end',
    )
    text = one(
        text,
        '      lastCacheCandidateCostMs = perfMs(candidateStarted);',
        '      lastCacheCandidateCostMs = perfMs(candidateStarted);\n      if (perf) perf.cacheCandidateMs = lastCacheCandidateCostMs;',
        'cache-candidate-segment',
    )
    text = one(
        text,
        '    if (perf) perf.postOnSendMs = perfMs(postOnSendStart);',
        "    if (perf) {\n      perf.postOnSendMs = perfMs(postOnSendStart);\n      const tail = postOnSendAttribution(perf.postOnSendMs, [\n        perf.postOnSendHistoryStabilizationMs,\n        perf.postOnSendPromptAccountingMs,\n        perf.cacheTopologyMs,\n        perf.cacheCandidateMs,\n      ]);\n      perf.postOnSendAttribution = {\n        ...tail,\n        historyStabilizationMs: perf.postOnSendHistoryStabilizationMs,\n        promptAccountingMs: perf.postOnSendPromptAccountingMs,\n        cacheTopologyMs: Number.isFinite(Number(perf.cacheTopologyMs)) ? Number(perf.cacheTopologyMs) : null,\n        cacheCandidateMs: Number.isFinite(Number(perf.cacheCandidateMs)) ? Number(perf.cacheCandidateMs) : null,\n      };\n    }",
        'post-onsend-attribution-finalize',
    )

    text = one(
        text,
        '    const edit = perf.editDetail || {};\n    const sessionKnown = n(session.chatFallbackMs) + n(session.characterLoadMs) + n(session.initScanMs) + n(session.initMs);',
        "    const edit = perf.editDetail || {};\n    const tail = perf.postOnSendAttribution || {};\n    const tailNumber = (value) => value == null || !Number.isFinite(Number(value)) || Number(value) < 0 ? null : Number(value);\n    const sessionKnown = n(session.chatFallbackMs) + n(session.characterLoadMs) + n(session.initScanMs) + n(session.initMs);",
        'diagnostic-tail-read',
    )
    text = one(
        text,
        '      bootstrapMs: n(perf.bootstrapMs), editReconcileMs: n(perf.editReconcileMs), aliasRepairMs: n(perf.aliasRepairMs), onSendMs: n(perf.onSendMs), postOnSendMs: n(perf.postOnSendMs), cacheTopologyMs: n(perf.cacheTopologyMs),',
        "      bootstrapMs: n(perf.bootstrapMs), editReconcileMs: n(perf.editReconcileMs), aliasRepairMs: n(perf.aliasRepairMs), onSendMs: n(perf.onSendMs), postOnSendMs: n(perf.postOnSendMs), cacheTopologyMs: n(perf.cacheTopologyMs),\n      postOnSendNamedMs: tailNumber(tail.namedMs), postOnSendUnattributedMs: tailNumber(tail.unattributedMs),\n      postOnSendHistoryStabilizationMs: tailNumber(tail.historyStabilizationMs), postOnSendPromptAccountingMs: tailNumber(tail.promptAccountingMs), postOnSendCacheCandidateMs: tailNumber(tail.cacheCandidateMs),\n      postOnSendAttributionConfidence: String(tail.confidence || 'UNRESOLVED'), postOnSendAttributionCheckpointFailure: !!tail.checkpointFailure,",
        'diagnostic-tail-fields',
    )
    diagnostic_anchor = "      `Cache topology cost: ${requestBreakdown ? diagnosticFormatMs(requestBreakdown.cacheTopologyMs) : 'n/a'} · candidate ${lastCacheCandidateCostMs == null ? 'n/a' : diagnosticFormatMs(lastCacheCandidateCostMs)} · provider cache UNVERIFIED`,"
    diagnostic_line = "      `Post-onSend attribution: ${requestBreakdown ? `named ${requestBreakdown.postOnSendNamedMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.postOnSendNamedMs)} · history ${requestBreakdown.postOnSendHistoryStabilizationMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.postOnSendHistoryStabilizationMs)} · prompt ${requestBreakdown.postOnSendPromptAccountingMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.postOnSendPromptAccountingMs)} · topology ${diagnosticFormatMs(requestBreakdown.cacheTopologyMs)} · candidate ${requestBreakdown.postOnSendCacheCandidateMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.postOnSendCacheCandidateMs)} · unattributed ${requestBreakdown.postOnSendUnattributedMs == null ? 'n/a' : diagnosticFormatMs(requestBreakdown.postOnSendUnattributedMs)} · first-request ${requestBreakdown.sessionPath || 'n/a'} · confidence ${requestBreakdown.postOnSendAttributionConfidence || 'UNRESOLVED'}${requestBreakdown.postOnSendAttributionCheckpointFailure ? ' · checkpoint FAIL_CLOSED' : ''}` : 'n/a'}`,\n" + diagnostic_anchor
    text = one(text, diagnostic_anchor, diagnostic_line, 'diagnostic-tail-line')

    text = one(
        text,
        "    version: '0.70.0',\n    name: 'Current Task Primacy Guard',",
        "    version: '0.70.1',\n    name: 'Cold First-Turn Tail Attribution',",
        'operator-card-identity',
    )
    return text


def verify(before, after):
    identities = [
        re.search(r'^//@version\s+([^\s]+)\s*$', after, re.M),
        re.search(r"const SIMCORE_RUNTIME_VERSION = '([^']+)';", after),
        re.search(r"const HOST_COMPAT_VERSION = '([^']+)';", after),
    ]
    values = [m.group(1) if m else None for m in identities]
    if values != [TARGET_VERSION, TARGET_VERSION, TARGET_VERSION]:
        fail('07001_RUNTIME_IDENTITY_SPLIT', repr(values))

    for module in ('prompt', 'community', 'runtime-session', 'store', 'lifecycle', 'representation', 'edit-reconcile', 'output-finalize', 'runtime-mirror'):
        if module_text(after, module) != module_text(before, module):
            fail('07001_FROZEN_MODULE_CHANGED', module)

    required_once = (
        'function timingCheckpoint(nowFn = perfNow)',
        'function timingSpan(start, end)',
        'function postOnSendAttribution(totalMs, segments, toleranceMs = 0.5)',
        'postOnSendHistoryStabilizationMs',
        'postOnSendPromptAccountingMs',
        'postOnSendAttributionConfidence',
        'Post-onSend attribution:',
    )
    for marker in required_once:
        if after.count(marker) < 1:
            fail('07001_REQUIRED_MARKER_MISSING', marker)

    frozen_markers = (
        'const PROMPT_COMPILER_VERSION = 4;',
        'current_input_task=primary_generation_authority',
        'prior_assistant_output=continuity_reference_context_not_current_task_authority',
        'do_not_replay_completed_prior_response_frame_or_task_unless_current_input_explicitly_requests_continuation_recap_comparison_or_reuse=1',
        'const COMMUNITY_CLASSIFIER_VERSION = 3;',
        'const STATE_VERSION = 5;',
        'const CORE_STATE_VERSION = 10;',
        'SimCore.define("state-reconcile"',
    )
    for marker in frozen_markers:
        if after.count(marker) != before.count(marker):
            fail('07001_FROZEN_MARKER_CHANGED', marker)

    side_effect_markers = (
        'await ', 'setTimeout(', 'setInterval(', 'pluginStorage', 'setChat(', 'fetch(', 'XMLHttpRequest',
        'history.splice(', 'messages.splice(',
    )
    for marker in side_effect_markers:
        if after.count(marker) != before.count(marker):
            fail('07001_SIDE_EFFECT_SURFACE_CHANGED', f'{marker}: {before.count(marker)} -> {after.count(marker)}')

    if after.count("messages.push({ role: 'system', content: result.promptBlock });") != before.count("messages.push({ role: 'system', content: result.promptBlock });"):
        fail('07001_REQUEST_MESSAGE_ORDER_MARKER_CHANGED')


def main():
    originals = []
    for path in FILES:
        if not path.exists():
            fail('07001_SOURCE_MISSING', str(path))
        originals.append(path.read_text(encoding='utf-8'))
    if originals[0] != originals[1]:
        fail('07001_PARENT_LATEST_INSTALL_DIVERGED')
    if f'//@version {FROM_VERSION}' not in originals[0]:
        fail('07001_PARENT_VERSION_MISMATCH')

    candidate = patch(originals[0])
    verify(originals[0], candidate)
    for path in FILES:
        path.write_text(candidate, encoding='utf-8')
    if FILES[0].read_bytes() != FILES[1].read_bytes():
        fail('07001_OUTPUT_LATEST_INSTALL_DIVERGED')
    print('07001_BUILD_PASS')


if __name__ == '__main__':
    main()
