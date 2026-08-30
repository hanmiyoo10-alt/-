#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = REPO_ROOT / 'plugins/usage-dashboard/runtime/product-manifest.json'
GUIDELINES_PATH = REPO_ROOT / 'docs/USAGE_DASHBOARD_GUIDELINES.md'
RELEASES_DIR = REPO_ROOT / '.github/usage-dashboard/releases'
START = '<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->'
END = '<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->'
BASELINE_RE = re.compile(r'^Last verified real-device baseline: `[^`]+`\.?$', re.M)


def release_state_block(manifest: dict) -> str:
    product = str(manifest.get('productVersion') or '')
    release_branch = str(manifest.get('releaseBranch') or '')
    components = manifest.get('components') or {}
    bridge = components.get('bridge') or {}
    manager = components.get('bridgeManager') or {}
    engine_version = str(bridge.get('requiredVersion') or '')
    manager_version = str(manager.get('version') or '')
    if not all([product, release_branch, engine_version, manager_version]):
        raise SystemExit('product manifest is missing release-state fields')
    return '\n'.join([
        START,
        f'- Product: `{product}`',
        f'- Bridge Engine: `{engine_version}`',
        f'- Bridge Manager: `{manager_version}`',
        f'- Release branch: `{release_branch}`',
        '- Source: `plugins/usage-dashboard/runtime/product-manifest.json`',
        END,
    ])


def synchronized_text(current: str, block: str) -> str:
    if current.count(START) != 1 or current.count(END) != 1:
        raise SystemExit('guidelines release-state markers must each appear exactly once')
    start = current.index(START)
    end = current.index(END, start) + len(END)
    return current[:start] + block + current[end:]


def release_spec_for_manifest(manifest: dict) -> dict | None:
    product = str(manifest.get('productVersion') or '')
    match = re.fullmatch(r'3\.0\.0-alpha\.(\d+\.\d+)', product)
    if not match:
        return None
    path = RELEASES_DIR / f'{match.group(1)}.json'
    if not path.exists():
        return None
    spec = json.loads(path.read_text(encoding='utf-8'))
    if str(spec.get('productVersion') or '') != product:
        raise SystemExit(f'release spec product mismatch for {product}')
    return spec


def synchronized_verified_baseline(current: str, manifest: dict) -> str:
    spec = release_spec_for_manifest(manifest)
    if spec is None:
        return current
    baseline = str(spec.get('verifiedBaseline') or '').strip()
    if not baseline.startswith('Last verified real-device baseline: `') or not baseline.endswith('`'):
        raise SystemExit('release spec verifiedBaseline is missing or malformed')
    matches = list(BASELINE_RE.finditer(current))
    if len(matches) != 1:
        raise SystemExit(f'guidelines verified-baseline marker must appear exactly once, found {len(matches)}')
    start, end = matches[0].span()
    return current[:start] + baseline + '.' + current[end:]


def main() -> None:
    parser = argparse.ArgumentParser(description='Synchronize Local Usage Dashboard project memory with the product manifest and release spec.')
    parser.add_argument('--check', action='store_true', help='fail instead of writing when the snapshot is stale')
    args = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    current = GUIDELINES_PATH.read_text(encoding='utf-8')
    expected = synchronized_text(current, release_state_block(manifest))
    expected = synchronized_verified_baseline(expected, manifest)

    if expected == current:
        print('usage-dashboard project memory: synchronized')
        return

    if args.check:
        raise SystemExit('usage-dashboard project memory is stale; run sync_project_guidelines.py')

    GUIDELINES_PATH.write_text(expected, encoding='utf-8')
    print(f'usage-dashboard project memory: updated for {manifest.get("productVersion")}')


if __name__ == '__main__':
    main()
