from pathlib import Path

path = Path('plugins/usage-dashboard/src/parts.cjs')
text = path.read_text()
old = "{file:'40-diagnostics.part.js', marker:'\\n  function diagText() {', label:'diagnostics'}"
new = "{file:'40-diagnostics.part.js', marker:'\\n  function refreshPhaseTimingText(phases = performanceRuntime.lastRefreshPhases) {', label:'diagnostics + release hardening'}"
if text.count(old) != 1:
    raise SystemExit(f'40-diagnostics boundary drifted: expected 1 old marker, got {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('registered 5.46 diagnostics helper as the modular boundary')
