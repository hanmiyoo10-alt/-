from pathlib import Path
p = Path('plugins/usage-dashboard/tests/p5-bridge-manager.cjs')
s = p.read_text()
old = "assert.equal(manifest.components.bridgeManager.state, 'bootstrap-ready');"
new = "if (/^3\\.0\\.0-alpha\\.5\\.1$/.test(version)) assert.equal(manifest.components.bridgeManager.state, 'bootstrap-ready');\nelse assert.equal(manifest.components.bridgeManager.state, 'engine-adoption-ready');"
if s.count(old) != 1:
    raise SystemExit(f'bridge manager state assertion marker mismatch: {s.count(old)}')
p.write_text(s.replace(old, new, 1))
