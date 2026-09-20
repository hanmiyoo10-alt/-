#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

from validate_release_candidate import LEGACY_ROOT, normalize_root

GUIDELINES = Path('docs/USAGE_DASHBOARD_GUIDELINES.md')
CURRENT_RELEASE_RE = re.compile(r'^Current release implementation: `[^`]+`.$', re.MULTILINE)
MANAGER_ENGINE_SHA_RE = re.compile(r"const BUNDLED_ENGINE_SHA256 = '[0-9a-f]{64}';")

ROOT = Path(LEGACY_ROOT)
TOOLS = ROOT / 'tools'
SRC = ROOT / 'src'
RUNTIME = ROOT / 'runtime'
RUNTIME_SRC = ROOT / 'runtime-src'
TESTS = ROOT / 'tests'
ENGINE = RUNTIME / 'bridge-engine.mjs'
MANAGER = RUNTIME / 'bridge-manager.cjs'
BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
MANIFEST = RUNTIME / 'product-manifest.json'
LATEST = ROOT / 'latest.js'
TRACKED_ROOTS = [SRC, RUNTIME, RUNTIME_SRC]
TRACKED_FILES = [LATEST, GUIDELINES]
E19_STRUCTURAL_TESTS = [
    TESTS / 'current-release-contract.cjs',
    TESTS / 'p5-module-layout.cjs',
    TESTS / 'p49-release-notes-diagnostic-guidance.cjs',
]
E27_FOCUSED_PREFLIGHT = TOOLS / 'release_focused_preflight_e27.cjs'


def fail(code: str, detail: str = '') -> None:
    raise SystemExit(f'{code}:{detail}' if detail else code)


def configure_root(value: str) -> str:
    global ROOT, TOOLS, SRC, RUNTIME, RUNTIME_SRC, TESTS
    global ENGINE, MANAGER, BOOTSTRAP, MANIFEST, LATEST
    global TRACKED_ROOTS, TRACKED_FILES, E19_STRUCTURAL_TESTS, E27_FOCUSED_PREFLIGHT
    try:
        normalized = normalize_root(value)
    except ValueError as exc:
        fail('RECONCILE_SOURCE_ROOT_REJECTED', str(exc))

    ROOT = Path(normalized)
    TOOLS = ROOT / 'tools'
    SRC = ROOT / 'src'
    RUNTIME = ROOT / 'runtime'
    RUNTIME_SRC = ROOT / 'runtime-src'
    TESTS = ROOT / 'tests'
    ENGINE = RUNTIME / 'bridge-engine.mjs'
    MANAGER = RUNTIME / 'bridge-manager.cjs'
    BOOTSTRAP = RUNTIME / 'bootstrap-bridge-manager.sh'
    MANIFEST = RUNTIME / 'product-manifest.json'
    LATEST = ROOT / 'latest.js'
    TRACKED_ROOTS = [SRC, RUNTIME, RUNTIME_SRC]
    TRACKED_FILES = [LATEST, GUIDELINES]
    E19_STRUCTURAL_TESTS = [
        TESTS / 'current-release-contract.cjs',
        TESTS / 'p5-module-layout.cjs',
        TESTS / 'p49-release-notes-diagnostic-guidance.cjs',
    ]
    E27_FOCUSED_PREFLIGHT = TOOLS / 'release_focused_preflight_e27.cjs'
    return normalized


def run(*args: str) -> None:
    subprocess.run(list(args), check=True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_spec(path: Path) -> dict:
    try:
        spec = json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        fail('RECONCILE_SPEC_INVALID', str(exc))
    required = ['releaseTitle', 'productVersion', 'engineVersion', 'managerVersion', 'snapshotContract', 'recentRequestContract', 'materializer']
    missing = [key for key in required if key not in spec]
    if missing:
        fail('RECONCILE_SPEC_MISSING', ','.join(missing))
    return spec


def sync_manager_engine_hash() -> None:
    engine_sha = sha256(ENGINE)
    text = MANAGER.read_text(encoding='utf-8')
    next_text, count = MANAGER_ENGINE_SHA_RE.subn(
        f"const BUNDLED_ENGINE_SHA256 = '{engine_sha}';",
        text,
        count=1,
    )
    if count != 1:
        fail('RECONCILE_MANAGER_ENGINE_HASH_AUTHORITY')
    if next_text != text:
        MANAGER.write_text(next_text, encoding='utf-8')


def sync_manifest_hashes() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    components = manifest.get('components') or {}
    bridge = components.get('bridge') or {}
    manager = components.get('bridgeManager') or {}
    if not isinstance(bridge, dict) or not isinstance(manager, dict):
        fail('RECONCILE_MANIFEST_COMPONENTS_INVALID')
    bridge['sha256'] = sha256(ENGINE)
    manager['sha256'] = sha256(MANAGER)
    manager['bootstrapSha256'] = sha256(BOOTSTRAP)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


def sync_release_memory(spec: dict) -> None:
    target = f"Current release implementation: `{spec['productVersion']} — {spec['releaseTitle']}`."
    text = GUIDELINES.read_text(encoding='utf-8')
    matches = CURRENT_RELEASE_RE.findall(text)
    if len(matches) != 1:
        fail('RECONCILE_RELEASE_MEMORY_AUTHORITY', str(len(matches)))
    next_text = CURRENT_RELEASE_RE.sub(target, text, count=1)
    if next_text != text:
        GUIDELINES.write_text(next_text, encoding='utf-8')


def validate_identity(spec: dict) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    components = manifest.get('components') or {}
    plugin = components.get('plugin') or {}
    bridge = components.get('bridge') or {}
    manager = components.get('bridgeManager') or {}
    expected_contracts = {
        'snapshot': int(spec['snapshotContract']),
        'recentRequest': int(spec['recentRequestContract']),
    }
    checks = [
        (manifest.get('productVersion') == spec['productVersion'], 'RECONCILE_PRODUCT_VERSION_MISMATCH'),
        (plugin.get('version') == spec['productVersion'], 'RECONCILE_PLUGIN_VERSION_MISMATCH'),
        (bridge.get('requiredVersion') == spec['engineVersion'], 'RECONCILE_ENGINE_VERSION_MISMATCH'),
        (manager.get('version') == spec['managerVersion'], 'RECONCILE_MANAGER_VERSION_MISMATCH'),
        (manager.get('productVersion') == spec['productVersion'], 'RECONCILE_MANAGER_PRODUCT_VERSION_MISMATCH'),
        (manifest.get('contracts') == expected_contracts, 'RECONCILE_CONTRACT_MISMATCH'),
        (bridge.get('sha256') == sha256(ENGINE), 'RECONCILE_ENGINE_HASH_MISMATCH'),
        (manager.get('sha256') == sha256(MANAGER), 'RECONCILE_MANAGER_HASH_MISMATCH'),
        (manager.get('bootstrapSha256') == sha256(BOOTSTRAP), 'RECONCILE_BOOTSTRAP_HASH_MISMATCH'),
    ]
    for ok, code in checks:
        if not ok:
            fail(code)
    manager_text = MANAGER.read_text(encoding='utf-8')
    if f"const BUNDLED_ENGINE_SHA256 = '{sha256(ENGINE)}';" not in manager_text:
        fail('RECONCILE_MANAGER_EMBEDDED_ENGINE_HASH_MISMATCH')


def selected_env() -> dict[str, str]:
    env = os.environ.copy()
    env['UD_SOURCE_ROOT'] = ROOT.as_posix()
    return env


def validate_release_memory_contract(spec_path: Path) -> None:
    env = selected_env()
    env['UD_RELEASE_SPEC'] = spec_path.as_posix()
    result = subprocess.run(
        ['node', str(TESTS / 'current-release-contract.cjs')],
        env=env,
        check=False,
    )
    if result.returncode != 0:
        fail('RELEASE_MEMORY_CONTRACT_REJECTED', spec_path.as_posix())
    print(f'RELEASE_MEMORY_CONTRACT_GREEN:{spec_path.as_posix()}')


def reconcile_once(spec_path: Path, spec: dict) -> None:
    root = ROOT.as_posix()
    run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--write', '--root', root)
    run('node', str(TOOLS / 'build_bridge_engine.cjs'), '--check', '--root', root)
    sync_manager_engine_hash()
    sync_manifest_hashes()
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write', '--root', root)
    run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check', '--root', root)
    sync_release_memory(spec)
    run('python3', str(TOOLS / 'sync_project_guidelines.py'), '--root', root)
    validate_identity(spec)
    run('python3', str(TOOLS / 'validate_release_candidate.py'), '--spec', str(spec_path), '--root', root)
    validate_release_memory_contract(spec_path)


def tree_state() -> dict[str, str]:
    state: dict[str, str] = {}
    for root in TRACKED_ROOTS:
        if not root.exists():
            fail('RECONCILE_TRACKED_ROOT_MISSING', str(root))
        for path in sorted(p for p in root.rglob('*') if p.is_file()):
            state[path.as_posix()] = sha256(path)
    for path in TRACKED_FILES:
        if not path.is_file():
            fail('RECONCILE_TRACKED_FILE_MISSING', str(path))
        state[path.as_posix()] = sha256(path)
    return state


def candidate_tree_sha() -> str:
    subprocess.run(['git', 'add', '-A'], check=True)
    try:
        return subprocess.check_output(['git', 'write-tree'], text=True).strip()
    finally:
        subprocess.run(['git', 'reset', '--mixed', 'HEAD'], check=True, stdout=subprocess.DEVNULL)


def materializer_pattern() -> re.Pattern[str]:
    root = re.escape(ROOT.as_posix())
    return re.compile(rf'^{root}/tools/[A-Za-z0-9_.-]+\.py$')


def assert_declared_materializer_second_pass(spec: dict) -> None:
    materializer_text = str(spec.get('materializer') or '')
    if not materializer_pattern().fullmatch(materializer_text):
        fail('E19_MATERIALIZER_PATH_DENIED', materializer_text or '<missing>')
    materializer = Path(materializer_text)
    if not materializer.is_file():
        fail('E19_MATERIALIZER_MISSING', materializer_text)

    before_tree = candidate_tree_sha()
    before_critical = {
        'latest': sha256(LATEST),
        'engine': sha256(ENGINE),
        'manager': sha256(MANAGER),
        'manifest': sha256(MANIFEST),
    }
    run('python3', materializer_text)
    after_tree = candidate_tree_sha()
    after_critical = {
        'latest': sha256(LATEST),
        'engine': sha256(ENGINE),
        'manager': sha256(MANAGER),
        'manifest': sha256(MANIFEST),
    }
    if before_tree != after_tree:
        fail('E19_MATERIALIZER_NOT_IDEMPOTENT', f'{before_tree}!={after_tree}')
    if before_critical != after_critical:
        fail('E19_MATERIALIZER_CRITICAL_HASH_DRIFT')
    print(f"E19_MATERIALIZER_SECOND_PASS_GREEN:{spec['productVersion']}:{after_tree}")


def run_shift_left_structural_gates(spec_path: Path) -> None:
    env = selected_env()
    env['UD_RELEASE_SPEC'] = spec_path.as_posix()
    passed = []
    for test in E19_STRUCTURAL_TESTS:
        result = subprocess.run(['node', str(test)], env=env, check=False)
        if result.returncode != 0:
            fail('E19_STRUCTURAL_GATE_REJECTED', str(test))
        passed.append(test.name)
    print(f"E19_STRUCTURAL_GATES_GREEN:{','.join(passed)}")


def run_e27_focused_preflight(spec_path: Path) -> None:
    if not E27_FOCUSED_PREFLIGHT.is_file():
        fail('E27_FOCUSED_PREFLIGHT_MISSING')
    result = subprocess.run(
        ['node', str(E27_FOCUSED_PREFLIGHT), '--spec', spec_path.as_posix(), '--root', ROOT.as_posix()],
        env=selected_env(),
        check=False,
    )
    if result.returncode != 0:
        fail('E27_FOCUSED_PREFLIGHT_REJECTED', spec_path.as_posix())
    print(f'E27_FOCUSED_PREFLIGHT_GREEN:{spec_path.as_posix()}')


def main() -> None:
    parser = argparse.ArgumentParser(description='Reconcile generated Local Usage Dashboard release candidate state.')
    parser.add_argument('--spec', required=True, help='release spec path under .github/usage-dashboard/releases')
    parser.add_argument('--root', default=LEGACY_ROOT, help='candidate source root')
    parser.add_argument('--two-pass', action='store_true', help='prove declared materializer + reconciliation are idempotent and run E19/E27 shift-left gates')
    args = parser.parse_args()

    configure_root(args.root)

    spec_path = Path(args.spec)
    if not re.fullmatch(r'\.github/usage-dashboard/releases/[A-Za-z0-9._-]+\.json', spec_path.as_posix()):
        fail('RECONCILE_SPEC_PATH_DENIED', spec_path.as_posix())
    if not spec_path.is_file():
        fail('RECONCILE_SPEC_MISSING_FILE', spec_path.as_posix())
    spec = load_spec(spec_path)

    if args.two_pass:
        assert_declared_materializer_second_pass(spec)

    reconcile_once(spec_path, spec)
    if not args.two_pass:
        print(f"RECONCILED:{spec['productVersion']}")
        return

    first = tree_state()
    critical_first = {
        'latest': sha256(LATEST),
        'engine': sha256(ENGINE),
        'manager': sha256(MANAGER),
        'manifest': sha256(MANIFEST),
    }
    reconcile_once(spec_path, spec)
    second = tree_state()
    critical_second = {
        'latest': sha256(LATEST),
        'engine': sha256(ENGINE),
        'manager': sha256(MANAGER),
        'manifest': sha256(MANIFEST),
    }
    if first != second:
        changed = sorted(set(first) | set(second))
        drift = [path for path in changed if first.get(path) != second.get(path)]
        fail('MATERIALIZER_NOT_IDEMPOTENT', ','.join(drift[:20]))
    if critical_first != critical_second:
        fail('MATERIALIZER_CRITICAL_HASH_DRIFT')
    print(f"MATERIALIZER_IDEMPOTENT:{spec['productVersion']}")

    run_shift_left_structural_gates(spec_path)
    run_e27_focused_preflight(spec_path)


if __name__ == '__main__':
    main()
