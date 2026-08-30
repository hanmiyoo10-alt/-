#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = REPO_ROOT / 'plugins/usage-dashboard/runtime/product-manifest.json'
GUIDELINES_PATH = REPO_ROOT / 'docs/USAGE_DASHBOARD_GUIDELINES.md'
START = '<!-- USAGE_DASHBOARD_RELEASE_STATE_START -->'
END = '<!-- USAGE_DASHBOARD_RELEASE_STATE_END -->'


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


def main() -> None:
    parser = argparse.ArgumentParser(description='Synchronize Local Usage Dashboard project memory with the product manifest.')
    parser.add_argument('--check', action='store_true', help='fail instead of writing when the snapshot is stale')
    args = parser.parse_args()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding='utf-8'))
    current = GUIDELINES_PATH.read_text(encoding='utf-8')
    expected = synchronized_text(current, release_state_block(manifest))

    if expected == current:
        print('usage-dashboard project memory: synchronized')
        return

    if args.check:
        raise SystemExit('usage-dashboard project memory is stale; run sync_project_guidelines.py')

    GUIDELINES_PATH.write_text(expected, encoding='utf-8')
    print(f'usage-dashboard project memory: updated for {manifest.get("productVersion")}')


if __name__ == '__main__':
    main()
