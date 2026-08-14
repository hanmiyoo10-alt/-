from pathlib import Path
import json
import re

ROOT = Path('plugins/usage-dashboard')
core = ROOT / 'src/00-runtime-core.part.js'
diag = ROOT / 'src/40-diagnostics.part.js'


def replace_once(text, old, new, label):
    if text.count(old) != 1:
        raise SystemExit(f'{label} marker mismatch: {text.count(old)}')
    return text.replace(old, new, 1)

s = core.read_text()
s = replace_once(s, '//@version 3.0.0-alpha.4.9', '//@version 3.0.0-alpha.5.0', 'meta version')
s = replace_once(s, "const VERSION = '3.0.0-alpha.4.9';", "const VERSION = '3.0.0-alpha.5.0';", 'runtime version')
s = replace_once(
    s,
    "  const RECENT_REQUEST_SCHEMA_VERSION = 1;\n",
    "  const RECENT_REQUEST_SCHEMA_VERSION = 1;\n  const PRODUCT_RUNTIME_SCHEMA_VERSION = 1;\n  const BRIDGE_MANAGER_PROTOCOL = 'bridge-manager-v1';\n  const RUNTIME_MANIFEST_URL = 'https://raw.githubusercontent.com/hanmiyoo10-alt/-/release-usage-dashboard/plugins/usage-dashboard/runtime/product-manifest.json';\n",
    'runtime constants'
)

old_meta = """    const diagnostics = raw.diagnostics && typeof raw.diagnostics === 'object' ? raw.diagnostics : null;\n    const protocolVersion = num(raw.protocolVersion) ? Number(raw.protocolVersion) : null;\n    const fetchedAt = bridgeTimestamp(raw.fetchedAt) || Date.now();\n    if (!version && !compatibility && !modules && !diagnostics && raw.__bridgeSnapshot !== true) return null;\n    return {\n      version,\n      protocolVersion,\n      compatibility,\n      compatible: bridgeCompatibleVersion(version, compatibility),\n      modules,\n      diagnostics,\n      fetchedAt\n    };"""
new_meta = """    const diagnostics = raw.diagnostics && typeof raw.diagnostics === 'object' ? raw.diagnostics : null;\n    const capabilitiesRaw = raw.bridgeCapabilities ?? raw.capabilities?.bridge ?? raw.capabilities;\n    const capabilities = capabilitiesRaw && typeof capabilitiesRaw === 'object' ? capabilitiesRaw : null;\n    const managerRaw = raw.bridgeManager ?? raw.manager ?? raw.updateManager;\n    const manager = managerRaw && typeof managerRaw === 'object' ? managerRaw : null;\n    const protocolVersion = num(raw.protocolVersion) ? Number(raw.protocolVersion) : null;\n    const fetchedAt = bridgeTimestamp(raw.fetchedAt) || Date.now();\n    if (!version && !compatibility && !modules && !diagnostics && !capabilities && !manager && raw.__bridgeSnapshot !== true) return null;\n    return {\n      version,\n      protocolVersion,\n      compatibility,\n      compatible: bridgeCompatibleVersion(version, compatibility),\n      modules,\n      diagnostics,\n      capabilities,\n      manager,\n      fetchedAt\n    };"""
s = replace_once(s, old_meta, new_meta, 'bridge metadata capabilities')

marker = "\n\n  function bridgeModuleFreshnessText(details) {"
helper = """

  function bridgeRuntimeSnapshot() {
    const bridge = state?.data?.bridge || null;
    const capabilities = bridge?.capabilities && typeof bridge.capabilities === 'object' ? bridge.capabilities : null;
    const manager = bridge?.manager && typeof bridge.manager === 'object' ? bridge.manager : null;
    const truthy = value => value === true || value === 1 || String(value || '').toLowerCase() === 'true';
    const selfUpdate = truthy(manager?.selfUpdate ?? manager?.self_update ?? capabilities?.selfUpdate ?? capabilities?.self_update);
    const managed = truthy(manager?.managed ?? capabilities?.managed) || selfUpdate;
    const managerProtocol = String(manager?.protocol || manager?.managementProtocol || manager?.management_protocol || capabilities?.managementProtocol || capabilities?.management_protocol || capabilities?.managerProtocol || 'none');
    return {
      mode: managed ? 'managed-sidecar' : 'legacy-external',
      managed,
      selfUpdate,
      managerProtocol,
      bridgeVersion:String(bridge?.version || '')
    };
  }
"""
if s.count(marker) != 1:
    raise SystemExit('bridge runtime helper marker mismatch')
s = s.replace(marker, helper + marker, 1)
core.write_text(s)

d = diag.read_text()
d = replace_once(
    d,
    "    const bridgeDiag = bridgeStabilitySnapshot();\n",
    "    const bridgeDiag = bridgeStabilitySnapshot();\n    const runtimeBridge = bridgeRuntimeSnapshot();\n",
    'diagnostic runtime snapshot'
)
d = replace_once(
    d,
    "      `Local Usage Dashboard v${VERSION}`,\n      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,",
    "      `Local Usage Dashboard v${VERSION}`,\n      `Unified runtime: schema v${PRODUCT_RUNTIME_SCHEMA_VERSION} · product ${VERSION} · plugin bundled · bridge ${runtimeBridge.mode}`,\n      `Bridge manager: protocol ${runtimeBridge.managerProtocol} · managed ${runtimeBridge.managed ? 'yes' : 'no'} · self-update ${runtimeBridge.selfUpdate ? 'yes' : 'no'} · target ${BRIDGE_MANAGER_PROTOCOL}`,\n      `Runtime manifest: ${RUNTIME_MANIFEST_URL}`,\n      `Bridge: ${state.bridgeStatus} · ${state.bridgeBase}`,",
    'diagnostic unified runtime lines'
)
diag.write_text(d)

runtime_dir = ROOT / 'runtime'
runtime_dir.mkdir(parents=True, exist_ok=True)
manifest = {
    'format': 1,
    'product': 'Local Usage Dashboard',
    'productVersion': '3.0.0-alpha.5.0',
    'releaseBranch': 'release-usage-dashboard',
    'architecture': 'single-product-modular-sidecar',
    'components': {
        'plugin': {
            'mode': 'bundled',
            'version': '3.0.0-alpha.5.0',
            'artifact': 'plugins/usage-dashboard/latest.js'
        },
        'bridge': {
            'mode': 'sidecar',
            'state': 'legacy-external',
            'requiredVersion': '1.6.1',
            'managementProtocol': 'bridge-manager-v1',
            'managed': False,
            'selfUpdate': False,
            'artifact': None
        }
    },
    'contracts': {
        'snapshot': 1,
        'recentRequest': 1
    }
}
(runtime_dir / 'product-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

# Season transitions must not silently disable earlier regression suites.
p1 = ROOT / 'tests/p1-contract.cjs'
p1_text = p1.read_text()
p1_text = replace_once(
    p1_text,
    "assert.match(source, /^\\/\\/@version 3\\.0\\.0-alpha\\.4\\./m);",
    "assert.match(source, /^\\/\\/@version (?:3\\.0\\.0-alpha\\.\\d+\\.\\d+|3\\.0\\.0-beta\\.\\d+|3\\.0\\.0)$/m);",
    'P1 version-forward guard'
)
p1.write_text(p1_text)

for test_path in sorted((ROOT / 'tests').glob('p*.cjs')):
    text = test_path.read_text()
    old_decl = "const alpha4 = version.match(/^3\\.0\\.0-alpha\\.4\\.(\\d+)$/);"
    if old_decl not in text:
        continue
    text = text.replace(old_decl, "const alpha = version.match(/^3\\.0\\.0-alpha\\.(\\d+)\\.(\\d+)$/);", 1)
    text, count = re.subn(
        r"alpha4 \? Number\(alpha4\[1\]\) >= (\d+) : ",
        r"alpha ? (Number(alpha[1]) > 4 || (Number(alpha[1]) === 4 && Number(alpha[2]) >= \1)) : ",
        text,
        count=1
    )
    if count != 1:
        raise SystemExit(f'{test_path.name} alpha season guard mismatch')
    test_path.write_text(text)

(ROOT / 'tests/p5-unified-runtime.cjs').write_text(r"""const fs = require('node:fs');
const assert = require('node:assert/strict');

const source = fs.readFileSync('plugins/usage-dashboard/latest.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('plugins/usage-dashboard/runtime/product-manifest.json', 'utf8'));
const version = (source.match(/^\/\/@version (.+)$/m) || [])[1] || '';
const enabled = /^3\.0\.0-alpha\.5\./.test(version) || /^3\.0\.0-beta\./.test(version) || version === '3.0.0';
if (!enabled) {
  console.log(`usage-dashboard P5 unified runtime regression: skipped · ${version}`);
  process.exit(0);
}

for (const marker of [
  'const PRODUCT_RUNTIME_SCHEMA_VERSION = 1;',
  "const BRIDGE_MANAGER_PROTOCOL = 'bridge-manager-v1';",
  'function bridgeRuntimeSnapshot()',
  'raw.bridgeCapabilities ?? raw.capabilities?.bridge ?? raw.capabilities',
  'raw.bridgeManager ?? raw.manager ?? raw.updateManager',
  'Unified runtime: schema v${PRODUCT_RUNTIME_SCHEMA_VERSION}',
  'Bridge manager: protocol ${runtimeBridge.managerProtocol}',
  'Runtime manifest: ${RUNTIME_MANIFEST_URL}',
]) assert.ok(source.includes(marker), `missing unified runtime marker: ${marker}`);

assert.equal(manifest.format, 1);
assert.equal(manifest.productVersion, version);
assert.equal(manifest.architecture, 'single-product-modular-sidecar');
assert.equal(manifest.components.plugin.version, version);
assert.equal(manifest.components.plugin.mode, 'bundled');
assert.equal(manifest.components.bridge.mode, 'sidecar');
assert.equal(manifest.components.bridge.state, 'legacy-external');
assert.equal(manifest.components.bridge.managementProtocol, 'bridge-manager-v1');
assert.equal(manifest.components.bridge.selfUpdate, false);
assert.equal(manifest.components.bridge.artifact, null);
assert.equal(manifest.contracts.snapshot, 1);
assert.equal(manifest.contracts.recentRequest, 1);

console.log(`usage-dashboard P5 unified runtime regression: OK · ${version}`);
""")
