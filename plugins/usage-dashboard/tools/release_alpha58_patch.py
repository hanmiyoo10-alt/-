from pathlib import Path
import hashlib
import json

VERSION_OLD = '3.0.0-alpha.5.7'
VERSION_NEW = '3.0.0-alpha.5.8'
MANAGER_OLD = '1.2.2'
MANAGER_NEW = '1.2.3'


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, got {count}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1))


replace_once(
    'plugins/usage-dashboard/src/00-runtime-core.part.js',
    '//@version 3.0.0-alpha.5.7',
    '//@version 3.0.0-alpha.5.8',
)
replace_once(
    'plugins/usage-dashboard/src/00-runtime-core.part.js',
    "const VERSION = '3.0.0-alpha.5.7';",
    "const VERSION = '3.0.0-alpha.5.8';",
)

# Recovery orchestration: manager + engine reconciliation must run before the
# heavy snapshot fetch, otherwise a broken engine can prevent its own repair.
refresh_path = Path('plugins/usage-dashboard/src/30-refresh-runtime.part.js')
refresh = refresh_path.read_text()
old_order = """      try {
        state.data = applyObservedToday(await fetchSnapshot());
        collectRecentRequestLedger(state.data);
        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');
        const managerSynced = await syncBridgeManagerIfNeeded(managerStatus);
        const managerAdopted = await adoptBridgeEngineIfNeeded(managerSynced);
        state.bridgeManagerRuntime = await syncBridgeEngineBundleIfNeeded(managerAdopted);
        state.bridgeStatus = 'connected';
"""
new_order = """      try {
        const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');
        const managerSynced = await syncBridgeManagerIfNeeded(managerStatus);
        const managerAdopted = await adoptBridgeEngineIfNeeded(managerSynced);
        state.bridgeManagerRuntime = await syncBridgeEngineBundleIfNeeded(managerAdopted);
        state.data = applyObservedToday(await fetchSnapshot());
        collectRecentRequestLedger(state.data);
        state.bridgeStatus = 'connected';
"""
if refresh.count(old_order) != 1:
    raise SystemExit('refresh runtime: recovery-order block mismatch')
refresh_path.write_text(refresh.replace(old_order, new_order, 1))

manager_path = Path('plugins/usage-dashboard/runtime/bridge-manager.cjs')
manager = manager_path.read_text()
if manager.count("const MANAGER_VERSION = '1.2.2';") != 1:
    raise SystemExit('bridge-manager: manager version anchor mismatch')
if manager.count("const PRODUCT_VERSION = '3.0.0-alpha.5.7';") != 1:
    raise SystemExit('bridge-manager: product version anchor mismatch')
manager = manager.replace("const MANAGER_VERSION = '1.2.2';", "const MANAGER_VERSION = '1.2.3';", 1)
manager = manager.replace("const PRODUCT_VERSION = '3.0.0-alpha.5.7';", "const PRODUCT_VERSION = '3.0.0-alpha.5.8';", 1)
manager_path.write_text(manager)

# Regression locks for the manager version and recovery ordering.
p = Path('plugins/usage-dashboard/tests/p5-bridge-manager.cjs')
t = p.read_text()
t = t.replace('Bridge Manager 1.2.2', 'Bridge Manager 1.2.3')
t = t.replace("const MANAGER_VERSION = '1.2.2';", "const MANAGER_VERSION = '1.2.3';")
marker = "assert.ok(source.includes('for (const waitMs of [200, 350, 600, 900])'), 'manager restart re-probe loop missing');\n"
extra = marker + "const refreshManagerIndex = source.indexOf(\"const managerStatus = await fetchBridgeManagerStatus(reason !== 'timer');\");\nconst refreshSnapshotIndex = source.indexOf('state.data = applyObservedToday(await fetchSnapshot());');\nassert.ok(refreshManagerIndex >= 0 && refreshSnapshotIndex >= 0 && refreshManagerIndex < refreshSnapshotIndex, 'manager/engine recovery must run before snapshot fetch');\n"
if t.count(marker) != 1:
    raise SystemExit('p5-bridge-manager recovery marker mismatch')
t = t.replace(marker, extra, 1)
p.write_text(t)

p = Path('plugins/usage-dashboard/tests/p5-bundled-engine.cjs')
t = p.read_text()
t = t.replace("const MANAGER_VERSION = '1.2.2';", "const MANAGER_VERSION = '1.2.3';")
t = t.replace("manifest.components.bridgeManager.version,'1.2.2'", "manifest.components.bridgeManager.version,'1.2.3'")
p.write_text(t)

manifest_path = Path('plugins/usage-dashboard/runtime/product-manifest.json')
manifest = json.loads(manifest_path.read_text())
if manifest.get('productVersion') != VERSION_OLD:
    raise SystemExit(f'product manifest version mismatch: {manifest.get("productVersion")}')
manifest['productVersion'] = VERSION_NEW
manifest['components']['plugin']['version'] = VERSION_NEW
manifest['components']['bridgeManager']['version'] = MANAGER_NEW
manifest['components']['bridgeManager']['productVersion'] = VERSION_NEW
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

print(f'Local Usage patch staged: {VERSION_NEW} / manager {MANAGER_NEW}')
