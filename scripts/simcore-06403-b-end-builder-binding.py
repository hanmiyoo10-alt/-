from pathlib import Path

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')

text = LATEST.read_text(encoding='utf-8')

expected = [
    '//@version 0.64.2',
    "const SIMCORE_RUNTIME_VERSION = '0.64.2';",
    '// v0.64.2 Diagnostic Copy Resilience:',
    "(async () => {\n  const coreRules = SimCore.require('session');",
    "? time.narrativeTimestampSequence(kernel.textOfMessage(messages[latestAssistantIndex]))",
]
for marker in expected:
    if marker not in text:
        raise SystemExit(f'missing expected v0.64.2 marker: {marker}')

if '// v0.64.3 B_END Diagnostic Builder Binding Repair:' in text:
    raise SystemExit('v0.64.3 release note already present')

release_note = """// v0.64.3 B_END Diagnostic Builder Binding Repair:
// - Repairs the confirmed v0.64.2 B_END-only diagnostic report construction failure where buildLastTurnDiagnosticReport referenced Time/Kernel through unbound outer-runtime identifiers
// - Binds the existing Kernel and Time modules once in the outer runtime scope; the diagnostic report-builder body and its B_END terminal-coverage expression remain byte-identical
// - Adds no new host/storage/network/timer call, persistent state, request/output hot-path work, Broadcast/Time semantic change, or clipboard transport behavior
// - Keeps COPIED / COPIED_FALLBACK / REPORT_BUILD_FAILED / CLIPBOARD_WRITE_FAILED unchanged and leaves M2-2 plus the frozen v0.65.0 M2-3 design untouched
//
"""

text = text.replace('//@version 0.64.2', '//@version 0.64.3', 1)
text = text.replace("const SIMCORE_RUNTIME_VERSION = '0.64.2';", "const SIMCORE_RUNTIME_VERSION = '0.64.3';", 1)
text = text.replace('// v0.64.2 Diagnostic Copy Resilience:', release_note + '// v0.64.2 Diagnostic Copy Resilience:', 1)

outer_anchor = "(async () => {\n  const coreRules = SimCore.require('session');"
outer_replacement = "(async () => {\n  const kernel = SimCore.require('kernel');\n  const time = SimCore.require('time');\n  const coreRules = SimCore.require('session');"
if text.count(outer_anchor) != 1:
    raise SystemExit(f'unexpected outer runtime anchor count: {text.count(outer_anchor)}')
text = text.replace(outer_anchor, outer_replacement, 1)

if text.count("const kernel = SimCore.require('kernel');") != 1:
    raise SystemExit('outer Kernel binding count is not exactly one')
if text.count("const time = SimCore.require('time');") != 1:
    raise SystemExit('outer Time binding count is not exactly one')
if text.count("? time.narrativeTimestampSequence(kernel.textOfMessage(messages[latestAssistantIndex]))") != 1:
    raise SystemExit('B_END report-builder expression changed unexpectedly')

LATEST.write_text(text, encoding='utf-8')
INSTALL.write_text(text, encoding='utf-8')
print('SimCore v0.64.3 scoped patch applied')
