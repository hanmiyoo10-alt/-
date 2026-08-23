#!/usr/bin/env python3
"""Migrate current SimCore/Usage Dashboard main writers to repo-main-write.py.

This is repository infrastructure only. It performs exact bounded replacements and fails if
expected source shapes drift, so it cannot silently rewrite an unfamiliar workflow revision.
"""

from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"MIGRATION_SHAPE_MISMATCH {path}: expected 1 occurrence, got {count}: {old!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


SIMCORE_COMMIT_OLD = """            git commit -m \"docs: sync SimCore v${VERSION} production memory\"\n            git pull --rebase origin main\n            git push origin HEAD:main\n"""
SIMCORE_COMMIT_NEW = """            git commit -m \"docs: sync SimCore v${VERSION} production memory\"\n            PAYLOAD_COMMIT=\"$(git rev-parse HEAD)\"\n            python3 scripts/repo-main-write.py --commit \"$PAYLOAD_COMMIT\" \\\n              --allow product-manifest.json \\\n              --allow docs/CURRENT_DEVELOPMENT.md \\\n              --allow docs/SIMCORE_GUIDELINES.md\n"""

UD_RELEASE_COMMIT_OLD = """            git commit -m \"release: Local Usage Dashboard $UD_PRODUCT_VERSION $UD_RELEASE_TITLE\"\n            git pull --rebase origin main\n            git push origin HEAD:main\n"""
UD_RELEASE_COMMIT_NEW = """            git commit -m \"release: Local Usage Dashboard $UD_PRODUCT_VERSION $UD_RELEASE_TITLE\"\n            PAYLOAD_COMMIT=\"$(git rev-parse HEAD)\"\n            python3 scripts/repo-main-write.py --commit \"$PAYLOAD_COMMIT\" \\\n              --allow plugins/usage-dashboard/src/ \\\n              --allow plugins/usage-dashboard/latest.js \\\n              --allow plugins/usage-dashboard/runtime/ \\\n              --allow plugins/usage-dashboard/runtime-src/ \\\n              --allow docs/USAGE_DASHBOARD_GUIDELINES.md\n"""

UD_MEMORY_COMMIT_OLD = """          git commit -m 'docs: sync Usage Dashboard production memory'\n          git pull --rebase origin main\n          git push origin HEAD:main\n"""
UD_MEMORY_COMMIT_NEW = """          git commit -m 'docs: sync Usage Dashboard production memory'\n          PAYLOAD_COMMIT=\"$(git rev-parse HEAD)\"\n          python3 scripts/repo-main-write.py --commit \"$PAYLOAD_COMMIT\" \\\n            --allow docs/USAGE_DASHBOARD_GUIDELINES.md\n"""


def main() -> int:
    replace_once(
        ".github/workflows/simcore-release-state-sync.yml",
        "concurrency:\n  group: repo-main-write\n  cancel-in-progress: false\n",
        "concurrency:\n  group: simcore-main-state-sync\n  cancel-in-progress: false\n",
    )
    replace_once(
        ".github/workflows/simcore-release-state-sync.yml",
        SIMCORE_COMMIT_OLD,
        SIMCORE_COMMIT_NEW,
    )

    replace_once(
        ".github/workflows/simcore-release-command.yml",
        "    concurrency:\n      group: repo-main-write\n      cancel-in-progress: false\n",
        "    concurrency:\n      group: simcore-main-state-sync\n      cancel-in-progress: false\n",
    )
    replace_once(
        ".github/workflows/simcore-release-command.yml",
        SIMCORE_COMMIT_OLD,
        SIMCORE_COMMIT_NEW,
    )

    replace_once(
        ".github/workflows/reusable-usage-dashboard-release.yml",
        "concurrency:\n  group: repo-main-write\n  cancel-in-progress: false\n",
        "concurrency:\n  group: usage-dashboard-release\n  cancel-in-progress: false\n",
    )
    replace_once(
        ".github/workflows/reusable-usage-dashboard-release.yml",
        UD_RELEASE_COMMIT_OLD,
        UD_RELEASE_COMMIT_NEW,
    )

    replace_once(
        ".github/workflows/usage-dashboard-project-memory.yml",
        "permissions:\n  contents: write\n\njobs:\n",
        "permissions:\n  contents: write\n\nconcurrency:\n  group: usage-dashboard-project-memory\n  cancel-in-progress: false\n\njobs:\n",
    )
    replace_once(
        ".github/workflows/usage-dashboard-project-memory.yml",
        UD_MEMORY_COMMIT_OLD,
        UD_MEMORY_COMMIT_NEW,
    )

    print("current main writers migrated to retrying product-owned integration protocol")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
