from pathlib import Path
import hashlib
import json
import subprocess


ROOT = Path('plugins/usage-dashboard')
RUNTIME = ROOT / 'runtime'
PATCH = ROOT / 'tools' / 'release_managed_direct_cli_runtime_566.patch'
BASE_VERSION = '3.0.0-alpha.5.65'
TARGET_VERSION = '3.0.0-alpha.5.66'
TARGET_ENGINE = '1.6.19'
TARGET_MANAGER = '1.3.0'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


manifest_path = RUNTIME / 'product-manifest.json'
manifest = json.loads(manifest_path.read_text())
current = str(manifest.get('productVersion') or '')
if current == TARGET_VERSION:
    print(f'{TARGET_VERSION} already materialized')
    raise SystemExit(0)
if current != BASE_VERSION:
    raise SystemExit(f'expected {BASE_VERSION} baseline, got {current or "missing"}')
if not PATCH.is_file():
    raise SystemExit('5.66 deterministic patch is missing')

subprocess.run(['git', 'apply', '--check', str(PATCH)], check=True)
subprocess.run(['git', 'apply', str(PATCH)], check=True)
subprocess.run(['node', str(ROOT / 'tools' / 'build_usage_dashboard.cjs'), '--check'], check=True)
subprocess.run(['node', '--check', str(RUNTIME / 'bridge-engine.mjs')], check=True)
subprocess.run(['node', '--check', str(RUNTIME / 'bridge-manager.cjs')], check=True)

manifest = json.loads(manifest_path.read_text())
components = manifest.get('components') or {}
if manifest.get('productVersion') != TARGET_VERSION:
    raise SystemExit('materialized product version mismatch')
if (components.get('bridge') or {}).get('requiredVersion') != TARGET_ENGINE:
    raise SystemExit('materialized Engine version mismatch')
if (components.get('bridgeManager') or {}).get('version') != TARGET_MANAGER:
    raise SystemExit('materialized Manager version mismatch')
if (components.get('bridge') or {}).get('sha256') != sha256(RUNTIME / 'bridge-engine.mjs'):
    raise SystemExit('materialized Engine hash mismatch')
if (components.get('bridgeManager') or {}).get('sha256') != sha256(RUNTIME / 'bridge-manager.cjs'):
    raise SystemExit('materialized Manager hash mismatch')
if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
    raise SystemExit('snapshot/recent-request contracts changed')

print(f'prepared Local Usage Dashboard {TARGET_VERSION} (engine {TARGET_ENGINE}, manager {TARGET_MANAGER}) Managed Direct CLI Runtime')
