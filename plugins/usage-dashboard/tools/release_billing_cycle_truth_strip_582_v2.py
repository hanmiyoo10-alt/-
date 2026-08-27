#!/usr/bin/env python3
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path('plugins/usage-dashboard')
TOOLS = ROOT / 'tools'
RUNTIME = ROOT / 'runtime'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
MANIFEST = RUNTIME / 'product-manifest.json'
TARGET_ENGINE = '1.6.23'


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


subprocess.run(['python3', str(TOOLS / 'release_billing_cycle_truth_strip_582.py')], check=True)

engine_sha = sha256(ENGINE)
manager_text = MANAGER.read_text(encoding='utf-8')
manager_text, version_count = re.subn(
    r"const BUNDLED_ENGINE_VERSION = '[^']+';",
    f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';",
    manager_text,
    count=1,
)
manager_text, sha_count = re.subn(
    r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';",
    f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
    manager_text,
    count=1,
)
if version_count != 1 or sha_count != 1:
    raise SystemExit('5.82 Manager bundled Engine identity markers missing')
MANAGER.write_text(manager_text, encoding='utf-8')

manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
manifest['components']['bridge']['sha256'] = engine_sha
manifest['components']['bridgeManager']['sha256'] = sha256(MANAGER)
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

subprocess.run(['node', '--check', str(MANAGER)], check=True)
if f"const BUNDLED_ENGINE_VERSION = '{TARGET_ENGINE}';" not in manager_text:
    raise SystemExit('5.82 Manager bundled Engine version mismatch')
if f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';" not in manager_text:
    raise SystemExit('5.82 Manager bundled Engine hash mismatch')
print(f'5.82 Manager bundled Engine identity synchronized · {TARGET_ENGINE} · {engine_sha}')
