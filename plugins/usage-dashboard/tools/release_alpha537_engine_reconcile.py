from pathlib import Path
import hashlib
import json

ROOT = Path('plugins/usage-dashboard')
OLD = '3.0.0-alpha.5.36'
NEW = '3.0.0-alpha.5.37'
ENGINE_VERSION = '1.6.4'
MANAGER_OLD = '1.2.5'
MANAGER_NEW = '1.2.6'


def replace_once(path, old, new, label):
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    path.write_text(text.replace(old, new, 1))


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

# Product version bump so the already-synced 5.36 manager is forced to reconcile again.
core = ROOT / 'src/00-runtime-core.part.js'
replace_once(core, f'//@version {OLD}', f'//@version {NEW}', 'metadata version')
replace_once(core, f"const VERSION = '{OLD}';", f"const VERSION = '{NEW}';", 'runtime version')

# Plugin must not equate "bundle file is current" with "running engine is current".
bridge_io = ROOT / 'src/20-bridge-io.part.js'
replace_once(
    bridge_io,
    "  if (status.engineBundled === true) {\n    state.bridgeEngineBundleSyncAttemptedVersion = VERSION;\n    return status;\n  }\n",
    "  const runningEngineVersion = String(status.engineVersion || '');\n  const bundledEngineVersion = String(status.engineBundleVersion || '');\n  if (status.engineBundled === true && bundledEngineVersion && runningEngineVersion === bundledEngineVersion) {\n    state.bridgeEngineBundleSyncAttemptedVersion = VERSION;\n    return status;\n  }\n",
    'plugin running-engine reconciliation gate',
)

# Manager 1.2.6 knows the actual bundled engine 1.6.4 and restarts a stale running service
# even when the on-disk bundled file is already current.
manager = ROOT / 'runtime/bridge-manager.cjs'
engine = ROOT / 'runtime/bridge-engine.mjs'
engine_hash = sha256(engine)
replace_once(manager, f"const MANAGER_VERSION = '{MANAGER_OLD}';", f"const MANAGER_VERSION = '{MANAGER_NEW}';", 'manager version')
replace_once(manager, f"const PRODUCT_VERSION = '{OLD}';", f"const PRODUCT_VERSION = '{NEW}';", 'manager product version')
replace_once(manager, "const BUNDLED_ENGINE_VERSION = '1.6.3';", f"const BUNDLED_ENGINE_VERSION = '{ENGINE_VERSION}';", 'manager bundled engine version')
old_hash_line = next((line for line in manager.read_text().splitlines() if line.startswith('const BUNDLED_ENGINE_SHA256 = ')), None)
if not old_hash_line:
    raise SystemExit('manager bundled engine hash line missing')
replace_once(manager, old_hash_line, f"const BUNDLED_ENGINE_SHA256 = '{engine_hash}';", 'manager bundled engine hash')
replace_once(
    manager,
    "  if (current.engineBundled) return {ok:true,synced:false,state:'current',...current};\n",
    "  if (current.engineBundled && String(current.engineVersion || '') === BUNDLED_ENGINE_VERSION) return {ok:true,synced:false,state:'current',...current};\n",
    'manager running-engine reconciliation gate',
)

# Regression tests lock the exact failure we observed on-device: manager bundle 1.6.3 while plugin requires 1.6.4.
p5_manager = ROOT / 'tests/p5-bridge-manager.cjs'
text = p5_manager.read_text().replace('Bridge Manager 1.2.5', 'Bridge Manager 1.2.6')
text = text.replace("const MANAGER_VERSION = '1.2.5';", "const MANAGER_VERSION = '1.2.6';")
p5_manager.write_text(text)

p5_bundle = ROOT / 'tests/p5-bundled-engine.cjs'
replace_once(p5_bundle, "const MANAGER_VERSION = '1.2.5';", "const MANAGER_VERSION = '1.2.6';", 'p5 manager version')
replace_once(
    p5_bundle,
    "assert.ok(manager.includes(\"url.pathname === '/engine/sync'\"));\n",
    "assert.ok(manager.includes(\"url.pathname === '/engine/sync'\"));\nassert.ok(manager.includes(\"const BUNDLED_ENGINE_VERSION = '1.6.4';\"));\nassert.ok(manager.includes(\"current.engineBundled && String(current.engineVersion || '') === BUNDLED_ENGINE_VERSION\"));\nassert.ok(source.includes(\"runningEngineVersion === bundledEngineVersion\"));\n",
    'stale running engine regression locks',
)
replace_once(p5_bundle, "assert.equal(manifest.components.bridgeManager.version,'1.2.5');", "assert.equal(manifest.components.bridgeManager.version,'1.2.6');", 'manifest manager version assertion')

# Manifest is the manager's source of truth during self-update.
manifest_path = ROOT / 'runtime/product-manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['productVersion'] = NEW
manifest['components']['plugin']['version'] = NEW
manifest['components']['bridge']['requiredVersion'] = ENGINE_VERSION
manifest['components']['bridge']['sha256'] = engine_hash
manifest['components']['bridgeManager']['version'] = MANAGER_NEW
manifest['components']['bridgeManager']['productVersion'] = NEW
manifest['components']['bridgeManager']['sha256'] = sha256(manager)
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
