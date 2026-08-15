from pathlib import Path
import hashlib
import json

OLD = '3.0.0-alpha.5.11'
NEW = '3.0.0-alpha.5.12'
ROOT = Path('plugins/usage-dashboard')

core_path = ROOT / 'src/00-runtime-core.part.js'
core = core_path.read_text()
if f'//@version {OLD}' not in core or f"const VERSION = '{OLD}';" not in core:
    raise SystemExit('5.11 core version anchors missing')
core = core.replace(f'//@version {OLD}', f'//@version {NEW}', 1)
core = core.replace(f"const VERSION = '{OLD}';", f"const VERSION = '{NEW}';", 1)
core_path.write_text(core)

manager_path = ROOT / 'runtime/bridge-manager.cjs'
manager = manager_path.read_text()
if f"const PRODUCT_VERSION = '{OLD}';" not in manager:
    raise SystemExit('5.11 manager product anchor missing')
manager = manager.replace(f"const PRODUCT_VERSION = '{OLD}';", f"const PRODUCT_VERSION = '{NEW}';", 1)
manager_path.write_text(manager)

manifest_path = ROOT / 'runtime/product-manifest.json'
manifest = json.loads(manifest_path.read_text())
if manifest.get('productVersion') != OLD:
    raise SystemExit(f"unexpected manifest productVersion: {manifest.get('productVersion')}")
manifest['productVersion'] = NEW
manifest['components']['plugin']['version'] = NEW
manifest['components']['bridgeManager']['productVersion'] = NEW
manifest['components']['bridgeManager']['sha256'] = hashlib.sha256(manager_path.read_bytes()).hexdigest()
manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')

print(f'patched {OLD} -> {NEW} hot-reload probe only')
