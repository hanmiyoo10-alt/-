#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
LATEST = ROOT / 'plugins' / 'simcore' / 'latest.js'
INSTALL = ROOT / 'plugins' / 'simcore' / 'install.js'


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'07007_BUILD_BLOCK {label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def module_names(text: str):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text: str, name: str) -> str:
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        raise SystemExit(f'07007_BUILD_BLOCK module missing: {name}')
    nxt = text.find('\nSimCore.define("', start + len(token))
    return text[start:nxt if nxt >= 0 else len(text)]


def require_lines(text: str, name: str):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", module_text(text, name), re.M)


def count(text: str, marker: str) -> int:
    return text.count(marker)


source = LATEST.read_text(encoding='utf-8')
install_source = INSTALL.read_text(encoding='utf-8')
if source != install_source:
    raise SystemExit('07007_BUILD_BLOCK predecessor latest/install differ')
if not re.search(r'^//@version\s+0\.70\.6\s*$', source, re.M):
    raise SystemExit('07007_BUILD_BLOCK predecessor metadata is not 0.70.6')
if "const SIMCORE_RUNTIME_VERSION = '0.70.6';" not in source:
    raise SystemExit('07007_BUILD_BLOCK predecessor runtime identity missing')
if "const HOST_COMPAT_VERSION = '0.70.6';" not in source:
    raise SystemExit('07007_BUILD_BLOCK predecessor host identity missing')
if "version: '0.70.6',\n    name: 'Manual Edit Redundant Prune Elision'," not in source:
    raise SystemExit('07007_BUILD_BLOCK predecessor release-card identity missing')

before_modules = module_names(source)
before_requires = {name: require_lines(source, name) for name in before_modules}
before_markers = {
    marker: count(source, marker)
    for marker in [
        'JSON.stringify(state)',
        'await this.b.set(',
        'setTimeout(',
        'setInterval(',
        'pluginStorage',
        'setChat(',
        'fetch(',
        'XMLHttpRequest',
        'history.splice(',
        'messages.splice(',
        'const PROMPT_COMPILER_VERSION = 4;',
        'const COMMUNITY_CLASSIFIER_VERSION = 3;',
        'const STATE_VERSION = 5;',
        'const CORE_STATE_VERSION = 10;',
        "['OUT_STORAGE', n(detail.outSetMs)]",
        "await this.store.save('out', outIndex, result.state, { metric: outMetric, prune: false });",
    ]
}

out = source
out = one(out, '//@version 0.70.6', '//@version 0.70.7', 'metadata version')
out = one(out, "const SIMCORE_RUNTIME_VERSION = '0.70.6';", "const SIMCORE_RUNTIME_VERSION = '0.70.7';", 'runtime version')
out = one(out, "const HOST_COMPAT_VERSION = '0.70.6';", "const HOST_COMPAT_VERSION = '0.70.7';", 'host compatibility version')
out = one(
    out,
    "version: '0.70.6',\n    name: 'Manual Edit Redundant Prune Elision',",
    "version: '0.70.7',\n    name: 'Output Snapshot Set Cost Attribution',",
    'operator release-card identity',
)

out = one(
    out,
    "  const payload = JSON.stringify(state);\n  if (metric) metric.serializeMs = Math.max(0, storeNow() - t);\n  t = storeNow();\n  await this.b.set(this._k(phase, index), payload);",
    "  const payload = JSON.stringify(state);\n  if (metric) {\n    metric.serializeMs = Math.max(0, storeNow() - t);\n    metric.payloadChars = payload.length;\n  }\n  t = storeNow();\n  await this.b.set(this._k(phase, index), payload);",
    'ordinary snapshot payload metric',
)

ordinary_detail_anchor = "detail.outSerializeMs = 0;\ndetail.outSetMs = 0;\ndetail.outPruneMs = 0;\ndetail.stateLoadSource = 'NONE';\ndetail.diagnosticFormatMs = 0;\ndetail.hotspotPhase = 'NONE';\ndetail.retentionDisposition = 'INLINE_DISABLED';"
out = one(
    out,
    ordinary_detail_anchor,
    "detail.outSerializeMs = 0;\ndetail.outSetMs = 0;\ndetail.outPruneMs = 0;\ndetail.outPayloadChars = null;\ndetail.stateLoadSource = 'NONE';\ndetail.diagnosticFormatMs = 0;\ndetail.hotspotPhase = 'NONE';\ndetail.retentionDisposition = 'INLINE_DISABLED';",
    'ordinary output detail payload field',
)

out = one(
    out,
    "if (detail && outMetric) {\n  detail.outSerializeMs = outMetric.serializeMs;\n  detail.outSetMs = outMetric.setMs;\n  detail.outPruneMs = 0;\n}",
    "if (detail && outMetric) {\n  detail.outSerializeMs = outMetric.serializeMs;\n  detail.outSetMs = outMetric.setMs;\n  detail.outPruneMs = 0;\n  detail.outPayloadChars =\n    Number.isInteger(outMetric.payloadChars) && outMetric.payloadChars > 0\n      ? outMetric.payloadChars\n      : null;\n}",
    'ordinary output payload propagation',
)

breakdown_anchor = "function buildOutputBreakdown(perf, outputTotalMs) {\n  const detail = perf.outputDetail || {};"
out = one(
    out,
    breakdown_anchor,
    "function diagnosticOutputSetCostPer1k(payloadChars, setMs) {\n  const chars = Number(payloadChars);\n  const ms = Number(setMs);\n  if (!Number.isFinite(chars) || chars <= 0 || !Number.isFinite(ms) || ms < 0) return null;\n  return ms / (chars / 1000);\n}\n\nfunction buildOutputBreakdown(perf, outputTotalMs) {\n  const detail = perf.outputDetail || {};",
    'output set normalized-cost helper',
)

out = one(
    out,
    "  const stateSource = typeof detail.stateLoadSource === 'string' ? detail.stateLoadSource : 'NONE';\n\n  const candidates = [",
    "  const stateSource = typeof detail.stateLoadSource === 'string' ? detail.stateLoadSource : 'NONE';\n  const rawOutPayloadChars = Number(detail.outPayloadChars);\n  const outPayloadChars = Number.isInteger(rawOutPayloadChars) && rawOutPayloadChars > 0\n    ? rawOutPayloadChars\n    : null;\n  const outSetMsPer1kChars = diagnosticOutputSetCostPer1k(outPayloadChars, detail.outSetMs);\n\n  const candidates = [",
    'output breakdown payload attribution',
)

out = one(
    out,
    "    outSerializeMs: n(detail.outSerializeMs),\n    outSetMs: n(detail.outSetMs),\n    outPruneMs: n(detail.outPruneMs),",
    "    outSerializeMs: n(detail.outSerializeMs),\n    outSetMs: n(detail.outSetMs),\n    outPruneMs: n(detail.outPruneMs),\n    outPayloadChars,\n    outSetMsPer1kChars,",
    'output breakdown return payload fields',
)

render_anchor = "lines.push(`Output process: ${diagnosticFormatMs(outputBreakdown.processTotalMs)} · handler ${diagnosticFormatMs(outputBreakdown.handlerTotalMs)} · residual ${diagnosticFormatMs(outputBreakdown.handlerResidualMs)} · sum ${diagnosticFormatMs(outputBreakdown.processPlusResidualMs)} (${outputBreakdown.consistency})`);\nlines.push(`Output state load: ${outputBreakdown.stateLoadSource} · load ${diagnosticFormatMs(outputBreakdown.stateLoadMs)} · rebuild ${diagnosticFormatMs(outputBreakdown.stateRebuildMs)}`);"
out = one(
    out,
    render_anchor,
    "lines.push(`Output process: ${diagnosticFormatMs(outputBreakdown.processTotalMs)} · handler ${diagnosticFormatMs(outputBreakdown.handlerTotalMs)} · residual ${diagnosticFormatMs(outputBreakdown.handlerResidualMs)} · sum ${diagnosticFormatMs(outputBreakdown.processPlusResidualMs)} (${outputBreakdown.consistency})`);\nconst outputSetNormalized = outputBreakdown.outSetMsPer1kChars == null\n  ? 'n/a'\n  : `${outputBreakdown.outSetMsPer1kChars.toFixed(2)} ms/1K chars`;\nconst outputPayloadLabel = outputBreakdown.outPayloadChars == null\n  ? 'n/a'\n  : `${outputBreakdown.outPayloadChars} chars`;\nlines.push(`Output snapshot set: ${outputPayloadLabel} · serialize ${diagnosticFormatMs(outputBreakdown.outSerializeMs)} · set ${diagnosticFormatMs(outputBreakdown.outSetMs)} · ${outputSetNormalized} · API PLUGIN_STORAGE_SET_ITEM · prune INLINE_DISABLED · confidence EXACT`);\nlines.push(`Output state load: ${outputBreakdown.stateLoadSource} · load ${diagnosticFormatMs(outputBreakdown.stateLoadMs)} · rebuild ${diagnosticFormatMs(outputBreakdown.stateRebuildMs)}`);",
    'output snapshot set diagnostic',
)

if module_names(out) != before_modules:
    raise SystemExit('07007_BUILD_BLOCK module inventory/order changed')
for name in before_modules:
    if require_lines(out, name) != before_requires[name]:
        raise SystemExit(f'07007_BUILD_BLOCK require graph changed: {name}')

for marker, expected in before_markers.items():
    actual = count(out, marker)
    if actual != expected:
        raise SystemExit(f'07007_BUILD_BLOCK marker count changed {marker}: {expected} -> {actual}')

if count(out, 'metric.payloadChars = payload.length;') != count(source, 'metric.payloadChars = payload.length;') + 1:
    raise SystemExit('07007_BUILD_BLOCK ordinary payloadChars metric not added exactly once')
if count(out, 'diagnosticOutputSetCostPer1k(') != 2:
    raise SystemExit('07007_BUILD_BLOCK normalized-cost helper/call cardinality unexpected')
if count(out, 'Output snapshot set:') != count(source, 'Output snapshot set:') + 1:
    raise SystemExit('07007_BUILD_BLOCK diagnostic line cardinality unexpected')
if "['OUT_STORAGE', n(detail.outSetMs)]" not in out:
    raise SystemExit('07007_BUILD_BLOCK OUT_STORAGE attribution moved')
if "await this.store.save('out', outIndex, result.state, { metric: outMetric, prune: false });" not in out:
    raise SystemExit('07007_BUILD_BLOCK ordinary out save contract moved')
if 'API PLUGIN_STORAGE_SET_ITEM · prune INLINE_DISABLED · confidence EXACT' not in out:
    raise SystemExit('07007_BUILD_BLOCK diagnostic provenance tokens missing')

LATEST.write_text(out, encoding='utf-8')
INSTALL.write_text(out, encoding='utf-8')
print('07007_BUILD_PASS')
