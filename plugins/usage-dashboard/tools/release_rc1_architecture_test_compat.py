from pathlib import Path

TESTS = Path('plugins/usage-dashboard/tests')


def read(path): return path.read_text()
def write(path, text): path.write_text(text)
def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

manager_path = TESTS / 'p5-bridge-manager.cjs'
manager = read(manager_path)
manager = replace_once(
    manager,
    "else if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version)) assert.equal(manifest.components.bridge.state, 'managed-bundled');",
    "else if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0') assert.equal(manifest.components.bridge.state, 'managed-bundled');",
    'bridge manager bundled bridge state',
)
manager = replace_once(
    manager,
    "else if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version)) assert.equal(manifest.components.bridgeManager.state, 'bundled-engine-ready');",
    "else if (/^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0') assert.equal(manifest.components.bridgeManager.state, 'bundled-engine-ready');",
    'bridge manager bundled manager state',
)
write(manager_path, manager)

adoption_path = TESTS / 'p5-engine-adoption.cjs'
adoption = read(adoption_path)
adoption = replace_once(
    adoption,
    "const bundled = /^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version);",
    "const bundled = /^3\\.0\\.0-alpha\\.5\\.(?:[3-9]|\\d{2,})$/.test(version) || /^3\\.0\\.0-rc\\.\\d+$/.test(version) || version === '3.0.0';",
    'engine adoption bundled state',
)
write(adoption_path, adoption)

print('aligned RC architecture regressions with managed-bundled runtime')
