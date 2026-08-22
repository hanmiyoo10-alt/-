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

# Service-tier fidelity shipped during alpha but is a permanent product contract.
# Keep its semantic checks while deriving productVersion from the artifact under test.
tier_path = TESTS / 'p5-service-tier-fidelity.cjs'
tier = read(tier_path)
tier = replace_once(
    tier,
    "const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));\n",
    "const manifest = JSON.parse(fs.readFileSync(`${root}/runtime/product-manifest.json`, 'utf8'));\nconst version = (source.match(/^\\/\\/@version (.+)$/m) || [])[1] || '';\n",
    'service tier current version',
)
tier = replace_once(
    tier,
    "assert.ok(manager.includes(\"const PRODUCT_VERSION = '3.0.0-alpha.5.44';\"));",
    "assert.ok(manager.includes(`const PRODUCT_VERSION = '${version}';`));",
    'service tier manager product version',
)
tier = replace_once(
    tier,
    "assert.equal(manifest.productVersion, '3.0.0-alpha.5.44');\nassert.equal(manifest.components.plugin.version, '3.0.0-alpha.5.44');",
    "assert.equal(manifest.productVersion, version);\nassert.equal(manifest.components.plugin.version, version);",
    'service tier manifest product version',
)
tier = tier.replace(
    "console.log('usage-dashboard P5 per-request service tier fidelity: OK · 3.0.0-alpha.5.44');",
    "console.log(`usage-dashboard P5 per-request service tier fidelity: OK · ${version}`);",
)
write(tier_path, tier)

print('aligned RC architecture and permanent feature regressions with current product version')
