from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f'{path}: postpatch anchor missing: {old[:100]!r}')
    p.write_text(s.replace(old, new, 1))

# 5.3 changes the bridge from adopted external source to an exact bundled source.
p = Path('plugins/usage-dashboard/tests/p5-engine-adoption.cjs')
s = p.read_text()
s = s.replace("assert.equal(manifest.components.bridge.state, 'managed-adoption');", "const bundled = version === '3.0.0-alpha.5.3';\nassert.equal(manifest.components.bridge.state, bundled ? 'managed-bundled' : 'managed-adoption');")
s = s.replace("assert.equal(manifest.components.bridge.sourceBundled, false);", "assert.equal(manifest.components.bridge.sourceBundled, bundled);")
s = s.replace("assert.ok(/^1\\.1\\.(?:[1-9]|\\d{2,})$/.test(String(manifest.components.bridgeManager.version || '')), 'managed engine requires Bridge Manager >=1.1.1');", "{ const parts=String(manifest.components.bridgeManager.version||'').split('.').map(Number); assert.ok(parts[0] > 1 || (parts[0] === 1 && (parts[1] > 1 || (parts[1] === 1 && parts[2] >= 1))), 'managed engine requires Bridge Manager >=1.1.1'); }")
p.write_text(s)

p = Path('plugins/usage-dashboard/tests/p5-bridge-manager.cjs')
s = p.read_text()
s = s.replace("if (/^3\\.0\\.0-alpha\\.5\\.1$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');\nelse assert.equal(manifest.components.bridge.state, 'managed-adoption');", "if (/^3\\.0\\.0-alpha\\.5\\.1$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');\nelse if (version === '3.0.0-alpha.5.3') assert.equal(manifest.components.bridge.state, 'managed-bundled');\nelse assert.equal(manifest.components.bridge.state, 'managed-adoption');")
s = s.replace("if (/^3\\.0\\.0-alpha\\.5\\.1$/.test(version)) assert.equal(manifest.components.bridgeManager.state, 'bootstrap-ready');\nelse assert.equal(manifest.components.bridgeManager.state, 'engine-adoption-ready');", "if (/^3\\.0\\.0-alpha\\.5\\.1$/.test(version)) assert.equal(manifest.components.bridgeManager.state, 'bootstrap-ready');\nelse if (version === '3.0.0-alpha.5.3') assert.equal(manifest.components.bridgeManager.state, 'bundled-engine-ready');\nelse assert.equal(manifest.components.bridgeManager.state, 'engine-adoption-ready');")
p.write_text(s)

p = Path('plugins/usage-dashboard/tests/p5-unified-runtime.cjs')
s = p.read_text()
s = s.replace("if (/^3\\.0\\.0-alpha\\.5\\.[01]$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');\nelse assert.equal(manifest.components.bridge.state, 'managed-adoption');", "if (/^3\\.0\\.0-alpha\\.5\\.[01]$/.test(version)) assert.equal(manifest.components.bridge.state, 'legacy-external');\nelse if (version === '3.0.0-alpha.5.3') assert.equal(manifest.components.bridge.state, 'managed-bundled');\nelse assert.equal(manifest.components.bridge.state, 'managed-adoption');")
s = s.replace("assert.equal(manifest.components.bridge.artifact, null);", "if (version === '3.0.0-alpha.5.3') {\n  assert.ok(String(manifest.components.bridge.artifact || '').endsWith('/runtime/bridge-engine.mjs'));\n  assert.equal(manifest.components.bridge.sourceBundled, true);\n} else assert.equal(manifest.components.bridge.artifact, null);")
p.write_text(s)

# The authoritative release validation now expects the 5.3 manifest state.
p = Path('.github/workflows/release-local-usage-dashboard.yml')
s = p.read_text()
s = s.replace("          grep -q 'managed-adoption' plugins/usage-dashboard/runtime/product-manifest.json", "          grep -q 'managed-bundled' plugins/usage-dashboard/runtime/product-manifest.json")
s = s.replace("          grep -q 'engine-adoption-ready' plugins/usage-dashboard/runtime/product-manifest.json", "          grep -q 'bundled-engine-ready' plugins/usage-dashboard/runtime/product-manifest.json")
p.write_text(s)

print('Local Usage 5.3 regression expectations updated')
