#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
SPEC = ROOT / '.github' / 'usage-dashboard' / 'releases' / '5.95.json'
MANIFEST = UD / 'runtime' / 'product-manifest.json'
ENGINE = UD / 'runtime' / 'bridge-engine.mjs'
MANAGER = UD / 'runtime' / 'bridge-manager.cjs'
BOOTSTRAP = UD / 'runtime' / 'bootstrap-bridge-manager.sh'
IMPLEMENTATION = UD / 'tools' / 'release_model_category_595.py'

BASE_VERSION = '3.0.0-alpha.5.94'
TARGET_VERSION = '3.0.0-alpha.5.95'
TARGET_ENGINE = '1.6.31'
TARGET_MANAGER = '1.3.5'
TARGET_ENGINE_SHA = 'b46f307494514eefdb2a237e54b18ba04c1582f2eb7766a0a6828d28604470d4'
TARGET_MANAGER_SHA = '396b906a37257ff8e41f176d394d13c38715c2887fc8d95ed7c0ac3203d9ec63'
TARGET_BOOTSTRAP_SHA = '4ec4f67b7ff07ef46ee75a46146fbf49700a7a438611e626f9c00af5dbb6026c'
WRAPPER_PATH = 'plugins/usage-dashboard/tools/release_model_category_595_idempotent.py'
IMPLEMENTATION_PATH = 'plugins/usage-dashboard/tools/release_model_category_595.py'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_manifest() -> dict:
    return json.loads(MANIFEST.read_text(encoding='utf-8'))


def verify_target() -> None:
    manifest = load_manifest()
    if manifest.get('productVersion') != TARGET_VERSION:
        raise SystemExit(f'5.95 target Product mismatch: {manifest.get("productVersion")}')
    if manifest.get('components', {}).get('bridge', {}).get('requiredVersion') != TARGET_ENGINE:
        raise SystemExit('5.95 target Engine semantic mismatch')
    manager = manifest.get('components', {}).get('bridgeManager', {})
    if manager.get('version') != TARGET_MANAGER or manager.get('productVersion') != TARGET_VERSION:
        raise SystemExit('5.95 target Manager semantic mismatch')
    if manifest.get('contracts') != {'snapshot': 1, 'recentRequest': 1}:
        raise SystemExit('5.95 target contracts mismatch')
    if sha256(ENGINE) != TARGET_ENGINE_SHA:
        raise SystemExit('5.95 target Engine bytes mismatch')
    if sha256(MANAGER) != TARGET_MANAGER_SHA:
        raise SystemExit('5.95 target Manager bytes mismatch')
    if sha256(BOOTSTRAP) != TARGET_BOOTSTRAP_SHA:
        raise SystemExit('5.95 target bootstrap bytes mismatch')


def run_baseline_materializer() -> None:
    source = IMPLEMENTATION.read_text(encoding='utf-8')
    old = f"'materializer': '{IMPLEMENTATION_PATH}',"
    new = f"'materializer': '{WRAPPER_PATH}',"
    if source.count(old) != 1:
        raise SystemExit(f'5.95 wrapper materializer authority anchor mismatch: {source.count(old)}')
    scope = {
        '__name__': '__main__',
        '__file__': str(IMPLEMENTATION),
        '__package__': None,
    }
    exec(compile(source.replace(old, new, 1), str(IMPLEMENTATION), 'exec'), scope, scope)


spec = json.loads(SPEC.read_text(encoding='utf-8'))
if spec.get('materializer') != WRAPPER_PATH:
    raise SystemExit(f'5.95 wrapper release spec mismatch: {spec.get("materializer")!r}')
product = load_manifest().get('productVersion')
if product == TARGET_VERSION:
    verify_target()
    print(f'5.95 materializer idempotent: {TARGET_VERSION} exact target already materialized')
elif product == BASE_VERSION:
    run_baseline_materializer()
    verify_target()
else:
    raise SystemExit(f'5.95 materializer baseline/target mismatch: {product}')
