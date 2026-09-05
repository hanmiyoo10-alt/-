#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path.cwd()
LATEST = ROOT / 'plugins' / 'simcore' / 'latest.js'
INSTALL = ROOT / 'plugins' / 'simcore' / 'install.js'

RELEASE_NOTE = """// v0.70.10 Host-Local Telemetry Set Cost Attribution:
// - Splits the already-awaited Host-local telemetry checkpoint total into Host-store acquire/reuse-resolution and actual setItem timing without adding Host I/O
// - Preserves hostElapsedMs as the enclosing total and reuses the existing serialized capsule character count for pure set ms/1K attribution
// - Adds one bounded Telemetry host cost diagnostic line with residual/confidence accounting and exact RISUAI_LOCAL_PLUGIN_STORAGE_SET_ITEM ownership
// - Keeps OUTPUT_COMMIT awaited, MEMORY -> SESSION -> HOST_LOCAL ordering, mailbox semantics, persistent schemas, retry/polling/timer/network behavior and provider-cache policy unchanged
//
"""

OLD_PUBLISH_PROBE = "lastWriteProbe = Object.freeze({ ...base, hostLocal: 'UNOBSERVED', hostElapsedMs: 0, retainedBodies: false });"
NEW_PUBLISH_PROBE = "lastWriteProbe = Object.freeze({ ...base, hostLocal: 'UNOBSERVED', hostElapsedMs: 0, hostAcquireMs: 0, hostSetMs: 0, retainedBodies: false });"

OLD_HOST_VARS = """  let hostLocal = 'UNAVAILABLE';
  let hostElapsedMs = 0;"""
NEW_HOST_VARS = """  let hostLocal = 'UNAVAILABLE';
  let hostElapsedMs = 0;
  let hostAcquireMs = 0;
  let hostSetMs = 0;"""

OLD_HOST_BLOCK = """  } else if (prepared.status === 'OK') {
    const startedAt = Date.now();
    const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
    if (acquired.status === 'USABLE') {
      try {
        await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);
        hostLocal = 'WRITTEN';
      } catch (_) { hostLocal = 'FAILED'; }
    } else {
      hostLocal = 'UNAVAILABLE';
    }
    hostElapsedMs = Math.max(0, Date.now() - startedAt);
  }"""
NEW_HOST_BLOCK = """  } else if (prepared.status === 'OK') {
    const startedAt = Date.now();
    const acquireStartedAt = Date.now();
    const acquired = await getHostLocalTelemetryStoreOnce(hostApi);
    hostAcquireMs = Math.max(0, Date.now() - acquireStartedAt);
    if (acquired.status === 'USABLE') {
      const setStartedAt = Date.now();
      try {
        await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);
        hostLocal = 'WRITTEN';
      } catch (_) { hostLocal = 'FAILED'; }
      finally { hostSetMs = Math.max(0, Date.now() - setStartedAt); }
    } else {
      hostLocal = 'UNAVAILABLE';
    }
    hostElapsedMs = Math.max(0, Date.now() - startedAt);
  }"""

OLD_WRITE_FIELDS = """    hostLocal,
    hostElapsedMs,
    host: lastHostProbe,"""
NEW_WRITE_FIELDS = """    hostLocal,
    hostElapsedMs,
    hostAcquireMs,
    hostSetMs,
    host: lastHostProbe,"""

OLD_CHECKPOINT_FIELDS = """        hostLocal: write?.hostLocal || 'UNAVAILABLE',
        hostElapsedMs: Number(write?.hostElapsedMs || 0),
        host: runtimeTelemetryRules.diagnostics().host || null,"""
NEW_CHECKPOINT_FIELDS = """        hostLocal: write?.hostLocal || 'UNAVAILABLE',
        hostElapsedMs: Number(write?.hostElapsedMs || 0),
        hostAcquireMs: Number(write?.hostAcquireMs || 0),
        hostSetMs: Number(write?.hostSetMs || 0),
        host: runtimeTelemetryRules.diagnostics().host || null,"""

OLD_FORMAT_HELPER = """  function diagnosticFormatMs(value) {
    const ms = Number(value);
    if (!Number.isFinite(ms) || ms < 0) return 'n/a';
    return ms >= 1000 ? `${(ms / 1000).toFixed(3)} s` : `${ms.toFixed(1)} ms`;
  }
"""
NEW_FORMAT_HELPER = OLD_FORMAT_HELPER + """
  function diagnosticTelemetryHostCost(probe) {
    if (!probe) return 'n/a';
    const chars = Number(probe.serializedChars);
    const acquireMs = Number(probe.hostAcquireMs);
    const setMs = Number(probe.hostSetMs);
    const totalMs = Number(probe.hostElapsedMs);
    const validAcquire = Number.isFinite(acquireMs) && acquireMs >= 0;
    const validSet = Number.isFinite(setMs) && setMs >= 0;
    const validTotal = Number.isFinite(totalMs) && totalMs >= 0;
    const sumMs = validAcquire && validSet ? acquireMs + setMs : null;
    const residualMs = validTotal && sumMs != null ? Math.max(0, totalMs - sumMs) : null;
    const confidence = validTotal && sumMs != null && totalMs >= sumMs ? 'EXACT' : 'BOUNDED';
    const realSetAttempt = probe.hostLocal === 'WRITTEN' || probe.hostLocal === 'FAILED';
    const setMsPer1kChars = realSetAttempt
      && Number.isFinite(chars) && chars > 0
      && validSet
      ? setMs / (chars / 1000)
      : null;
    const charsLabel = Number.isInteger(chars) && chars > 0
      ? `${chars.toLocaleString('en-US')} chars`
      : 'n/a';
    return `${charsLabel} · acquire ${validAcquire ? diagnosticFormatMs(acquireMs) : 'n/a'} · set ${validSet ? diagnosticFormatMs(setMs) : 'n/a'} · total ${validTotal ? diagnosticFormatMs(totalMs) : 'n/a'} · residual ${residualMs == null ? 'n/a' : diagnosticFormatMs(residualMs)} · ${setMsPer1kChars == null ? 'n/a' : `${setMsPer1kChars.toFixed(2)} ms/1K chars`} · API RISUAI_LOCAL_PLUGIN_STORAGE_SET_ITEM · confidence ${confidence}`;
  }
"""

TELEMETRY_CHECKPOINT_PREFIX = "      `Telemetry checkpoint: ${lastTelemetryCheckpointProbe ? `MEMORY ${lastTelemetryCheckpointProbe.memory || 'UNAVAILABLE'}"
TELEMETRY_HOST_COST_LINE = "      `Telemetry host cost: ${diagnosticTelemetryHostCost(lastTelemetryCheckpointProbe)}`,"


def one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'07010_BUILD_BLOCK {label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def module_names(text: str):
    return re.findall(r'SimCore\.define\("([^"]+)"\s*,\s*function', text)


def module_text(text: str, name: str) -> str:
    token = f'SimCore.define("{name}", function (require, module, exports) {{'
    start = text.find(token)
    if start < 0:
        raise SystemExit(f'07010_BUILD_BLOCK module missing: {name}')
    nxt = text.find('\nSimCore.define("', start + len(token))
    return text[start:nxt if nxt >= 0 else len(text)]


def require_lines(text: str, name: str):
    return re.findall(r"^const [^\n=]+ = require\('[^']+'\);$", module_text(text, name), re.M)


def marker_count(text: str, marker: str) -> int:
    return text.count(marker)


source = LATEST.read_text(encoding='utf-8')
install_source = INSTALL.read_text(encoding='utf-8')
if source != install_source:
    raise SystemExit('07010_BUILD_BLOCK predecessor latest/install differ')
if not re.search(r'^//@version\s+0\.70\.9\s*$', source, re.M):
    raise SystemExit('07010_BUILD_BLOCK predecessor metadata is not 0.70.9')
if "const SIMCORE_RUNTIME_VERSION = '0.70.9';" not in source:
    raise SystemExit('07010_BUILD_BLOCK predecessor runtime identity missing')
if "const HOST_COMPAT_VERSION = '0.70.9';" not in source:
    raise SystemExit('07010_BUILD_BLOCK predecessor host identity missing')
if "version: '0.70.9',\n    name: 'Inline Planning Marker Hygiene Guard'," not in source:
    raise SystemExit('07010_BUILD_BLOCK predecessor release-card identity missing')
if source.count('// v0.70.9 Inline Planning Marker Hygiene Guard:') != 1:
    raise SystemExit('07010_BUILD_BLOCK predecessor release-note identity missing')

for label, anchor in [
    ('publish non-host probe', OLD_PUBLISH_PROBE),
    ('host vars', OLD_HOST_VARS),
    ('host timing block', OLD_HOST_BLOCK),
    ('write fields', OLD_WRITE_FIELDS),
    ('checkpoint fields', OLD_CHECKPOINT_FIELDS),
    ('diagnostic format helper', OLD_FORMAT_HELPER),
]:
    if source.count(anchor) != 1:
        raise SystemExit(f'07010_BUILD_BLOCK {label}: expected one source anchor, found {source.count(anchor)}')
if source.count(TELEMETRY_CHECKPOINT_PREFIX) != 1:
    raise SystemExit('07010_BUILD_BLOCK telemetry checkpoint diagnostic anchor missing or ambiguous')

before_modules = module_names(source)
before_requires = {name: require_lines(source, name) for name in before_modules}
protected_markers = [
    'getLocalPluginStorage',
    'setItem(',
    'getItem(',
    'removeItem(',
    'pluginStorage.setItem(',
    'pluginStorage.getItem(',
    'pluginStorage.removeItem(',
    'pluginStorage.keys(',
    'setChatToIndex',
    'getChatFromIndex',
    'setTimeout(',
    'setInterval(',
    'fetch(',
    'XMLHttpRequest',
    'history.splice(',
    'messages.splice(',
    'const PROMPT_COMPILER_VERSION = 4;',
    'const COMMUNITY_CLASSIFIER_VERSION = 3;',
    'const STATE_VERSION = 5;',
    'const CORE_STATE_VERSION = 10;',
    '__SIMCORE_TELEMETRY_HANDOFF_HOST_LOCAL_V1__',
    '10 * 60 * 1000',
    '16 * 1024',
    "await acquired.store.setItem(HOST_LOCAL_KEY, prepared.encoded);",
    "await checkpointRuntimeTelemetry('OUTPUT_COMMIT');",
]
before_counts = {marker: marker_count(source, marker) for marker in protected_markers}

out = source
out = one(out, '//@version 0.70.9', '//@version 0.70.10', 'metadata version')
out = one(out, "const SIMCORE_RUNTIME_VERSION = '0.70.9';", "const SIMCORE_RUNTIME_VERSION = '0.70.10';", 'runtime version')
out = one(out, "const HOST_COMPAT_VERSION = '0.70.9';", "const HOST_COMPAT_VERSION = '0.70.10';", 'host compatibility version')
out = one(
    out,
    '// v0.70.9 Inline Planning Marker Hygiene Guard:\n',
    RELEASE_NOTE + '// v0.70.9 Inline Planning Marker Hygiene Guard:\n',
    'release-note source identity',
)
out = one(
    out,
    "version: '0.70.9',\n    name: 'Inline Planning Marker Hygiene Guard',",
    "version: '0.70.10',\n    name: 'Host-Local Telemetry Set Cost Attribution',",
    'operator release-card identity',
)
out = one(out, OLD_PUBLISH_PROBE, NEW_PUBLISH_PROBE, 'publish non-host zero metrics')
out = one(out, OLD_HOST_VARS, NEW_HOST_VARS, 'host timing fields')
out = one(out, OLD_HOST_BLOCK, NEW_HOST_BLOCK, 'Host-local acquire/set decomposition')
out = one(out, OLD_WRITE_FIELDS, NEW_WRITE_FIELDS, 'runtime telemetry write metric propagation')
out = one(out, OLD_CHECKPOINT_FIELDS, NEW_CHECKPOINT_FIELDS, 'outer checkpoint metric propagation')
out = one(out, OLD_FORMAT_HELPER, NEW_FORMAT_HELPER, 'bounded Host cost diagnostic helper')
checkpoint_index = out.find(TELEMETRY_CHECKPOINT_PREFIX)
checkpoint_end = out.find('\n', checkpoint_index)
if checkpoint_index < 0 or checkpoint_end < 0:
    raise SystemExit('07010_BUILD_BLOCK telemetry checkpoint diagnostic line boundary missing')
out = out[:checkpoint_end + 1] + TELEMETRY_HOST_COST_LINE + '\n' + out[checkpoint_end + 1:]

if module_names(out) != before_modules:
    raise SystemExit('07010_BUILD_BLOCK module inventory/order changed')
for name in before_modules:
    if require_lines(out, name) != before_requires[name]:
        raise SystemExit(f'07010_BUILD_BLOCK require graph changed: {name}')
for marker, expected in before_counts.items():
    actual = marker_count(out, marker)
    if actual != expected:
        raise SystemExit(f'07010_BUILD_BLOCK protected side-effect/schema marker changed {marker}: {expected} -> {actual}')

required = {
    '// v0.70.10 Host-Local Telemetry Set Cost Attribution:': 1,
    'let hostAcquireMs = 0;': 1,
    'let hostSetMs = 0;': 1,
    'const acquireStartedAt = Date.now();': 1,
    'hostAcquireMs = Math.max(0, Date.now() - acquireStartedAt);': 1,
    'const setStartedAt = Date.now();': 1,
    'finally { hostSetMs = Math.max(0, Date.now() - setStartedAt); }': 1,
    'function diagnosticTelemetryHostCost(probe)': 1,
    'Telemetry host cost:': 1,
    'API RISUAI_LOCAL_PLUGIN_STORAGE_SET_ITEM': 1,
    "probe.hostLocal === 'WRITTEN' || probe.hostLocal === 'FAILED'": 1,
    "confidence ${confidence}": 1,
}
for marker, expected in required.items():
    actual = marker_count(out, marker)
    if actual != expected:
        raise SystemExit(f'07010_BUILD_BLOCK required marker cardinality {marker}: expected {expected}, found {actual}')

if out.count("hostAcquireMs: 0, hostSetMs: 0") != 1:
    raise SystemExit('07010_BUILD_BLOCK non-host publish zero timing contract missing')
if out.count('hostAcquireMs: Number(write?.hostAcquireMs || 0)') != 1:
    raise SystemExit('07010_BUILD_BLOCK checkpoint acquire propagation missing')
if out.count('hostSetMs: Number(write?.hostSetMs || 0)') != 1:
    raise SystemExit('07010_BUILD_BLOCK checkpoint set propagation missing')
if out.count('Math.max(0, totalMs - sumMs)') != 1:
    raise SystemExit('07010_BUILD_BLOCK bounded residual accounting missing')
if out.count("setMs / (chars / 1000)") != 1:
    raise SystemExit('07010_BUILD_BLOCK normalized Host set cost derivation missing')
if out.count("await checkpointRuntimeTelemetry('OUTPUT_COMMIT');") != before_counts["await checkpointRuntimeTelemetry('OUTPUT_COMMIT');"]:
    raise SystemExit('07010_BUILD_BLOCK OUTPUT_COMMIT await moved')

LATEST.write_text(out, encoding='utf-8')
INSTALL.write_text(out, encoding='utf-8')
print('07010_BUILD_PASS')
