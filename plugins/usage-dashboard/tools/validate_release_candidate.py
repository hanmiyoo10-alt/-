#!/usr/bin/env python3
"""Validate a materialized Usage Dashboard candidate against one release spec."""

import argparse
import hashlib
import json
import re
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require_text(path: Path, needle: str) -> None:
    if needle not in path.read_text():
        raise SystemExit(f'{path}: missing release marker: {needle}')


parser = argparse.ArgumentParser()
parser.add_argument('--spec', required=True)
parser.add_argument('--root', default='plugins/usage-dashboard')
args = parser.parse_args()

spec = json.loads(Path(args.spec).read_text())
required = {
    'productVersion', 'engineVersion', 'managerVersion', 'snapshotContract',
    'recentRequestContract', 'releaseTitle', 'materializer', 'callerWorkflow',
    'sharedWorkflow',
}
missing = sorted(required - spec.keys())
if missing:
    raise SystemExit(f'release spec missing: {", ".join(missing)}')

for key in ('materializer', 'callerWorkflow', 'sharedWorkflow'):
    if not Path(str(spec[key])).is_file():
        raise SystemExit(f'release spec {key} does not exist: {spec[key]}')

root = Path(args.root)
runtime = root / 'runtime'
manifest = json.loads((runtime / 'product-manifest.json').read_text())
source_manifest = json.loads((root / 'src/manifest.json').read_text())
product = str(spec['productVersion'])
engine = str(spec['engineVersion'])
manager = str(spec['managerVersion'])

checks = {
    'product version': manifest.get('productVersion') == product,
    'plugin version': manifest.get('components', {}).get('plugin', {}).get('version') == product,
    'engine version': manifest.get('components', {}).get('bridge', {}).get('requiredVersion') == engine,
    'manager version': manifest.get('components', {}).get('bridgeManager', {}).get('version') == manager,
    'manager product': manifest.get('components', {}).get('bridgeManager', {}).get('productVersion') == product,
    'snapshot contract': manifest.get('contracts', {}).get('snapshot') == spec['snapshotContract'],
    'recent request contract': manifest.get('contracts', {}).get('recentRequest') == spec['recentRequestContract'],
    'source manifest version': source_manifest.get('version') == product,
}
failed = [name for name, ok in checks.items() if not ok]
if failed:
    raise SystemExit('release candidate mismatch: ' + ', '.join(failed))

for component, filename in [('bridge', 'bridge-engine.mjs'), ('bridgeManager', 'bridge-manager.cjs')]:
    actual = sha256(runtime / filename)
    expected = manifest['components'][component]['sha256']
    if actual != expected:
        raise SystemExit(f'{component} sha256 mismatch: {actual} != {expected}')

bootstrap = runtime / 'bootstrap-bridge-manager.sh'
if sha256(bootstrap) != manifest['components']['bridgeManager']['bootstrapSha256']:
    raise SystemExit('bridge manager bootstrap sha256 mismatch')
if sha256(root / 'latest.js') != source_manifest['artifactSha256']:
    raise SystemExit('latest.js sha256 mismatch against source manifest')

require_text(root / 'latest.js', f'//@version {product}')
require_text(root / 'latest.js', f"const VERSION = '{product}';")
require_text(root / 'latest.js', f"const REQUIRED_BRIDGE_VERSION = '{engine}';")
require_text(runtime / 'bridge-engine.mjs', f"const VERSION = '{engine}';")
require_text(runtime / 'bridge-manager.cjs', f"const MANAGER_VERSION = '{manager}';")
require_text(runtime / 'bridge-manager.cjs', f"const PRODUCT_VERSION = '{product}';")
require_text(runtime / 'bridge-manager.cjs', f"const BUNDLED_ENGINE_VERSION = '{engine}';")

if not re.fullmatch(r'3\.0\.0-alpha\.\d+\.\d+', product):
    raise SystemExit(f'unexpected product version format: {product}')

print(f'validated {product} / Engine {engine} / Manager {manager} / contracts {spec["snapshotContract"]}/{spec["recentRequestContract"]}')
