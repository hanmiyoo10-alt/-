#!/usr/bin/env python3
from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UD = ROOT / 'plugins' / 'usage-dashboard'
TOOLS = UD / 'tools'
LEDGER = UD / 'src' / '14-request-ledger.part.js'
PROVENANCE = UD / 'src' / '15-request-provenance.part.js'
LATEST = UD / 'latest.js'
LEGACY_SOURCE_SHA = 'ae10f6f04a24daef5a82a1e67eada16509cbbf13'
MATERIALIZER_PATH = 'plugins/usage-dashboard/tools/release_model_category_595.py'
TARGET_VERSION = '3.0.0-alpha.5.95'
LEDGER_MAX_BYTES = 37 * 1024


def run(*args: str, capture: bool = False) -> str:
    result = subprocess.run(
        args,
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
    )
    return result.stdout if capture else ''


def run_legacy_materializer() -> None:
    legacy = run('git', 'show', f'{LEGACY_SOURCE_SHA}:{MATERIALIZER_PATH}', capture=True)
    if 'MATERIALIZER_IDEMPOTENT' not in legacy or TARGET_VERSION not in legacy:
        raise SystemExit('5.95 repair materializer legacy authority mismatch')
    temp = TOOLS / '.release_model_category_595_legacy.py'
    try:
        temp.write_text(legacy, encoding='utf-8')
        run('python3', str(temp))
    finally:
        temp.unlink(missing_ok=True)


CATEGORY_PAIR_HELPERS = r'''

  function categoryPair(row) {
    const modelCategory = requestModelCategoryValue(recentRequestValue(row, ['modelCategory','model_category'], 'unknown'));
    return {modelCategory,modelCategorySource:requestModelCategorySourceValue(recentRequestValue(row, ['modelCategorySource','model_category_source'], 'unknown'), modelCategory)};
  }

  function mergeCategory(row, current) {
    return preferKnownModelCategory(row?.modelCategory, row?.modelCategorySource, current?.modelCategory, current?.modelCategorySource);
  }
'''


def replace_once_or_target(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'5.95 ledger repair anchor mismatch: {label}:{count}')
    return text.replace(old, new, 1)


def compact_plugin_category_binding() -> None:
    provenance = PROVENANCE.read_text(encoding='utf-8')
    if 'function categoryPair(row)' not in provenance:
        if 'function preferKnownModelCategory' not in provenance:
            raise SystemExit('5.95 provenance category helper authority missing')
        provenance = provenance.rstrip() + CATEGORY_PAIR_HELPERS
        PROVENANCE.write_text(provenance, encoding='utf-8')

    ledger = LEDGER.read_text(encoding='utf-8')
    ledger = replace_once_or_target(
        ledger,
        "      const modelCategory = requestModelCategoryValue(recentRequestValue(row, ['modelCategory','model_category'], 'unknown'));\n      const modelCategorySource = requestModelCategorySourceValue(recentRequestValue(row, ['modelCategorySource','model_category_source'], 'unknown'), modelCategory);",
        "      const cat=categoryPair(row);",
        'normalized-category-pair',
    )
    ledger = replace_once_or_target(
        ledger,
        "        model,\n        modelCategory,\n        modelCategorySource,\n        cost:num(costRaw) ? Number(costRaw) : null,",
        "        model,modelCategory:cat.modelCategory,modelCategorySource:cat.modelCategorySource,\n        cost:num(costRaw)?Number(costRaw):null,",
        'normalized-category-fields',
    )
    ledger = replace_once_or_target(
        ledger,
        "        const modelCategoryTruth = preferKnownModelCategory(row?.modelCategory, row?.modelCategorySource, current?.modelCategory, current?.modelCategorySource);",
        "        const modelCategoryTruth=mergeCategory(row,current);",
        'merged-category-pair',
    )
    LEDGER.write_text(ledger, encoding='utf-8')


def validate_compacted_target() -> None:
    ledger = LEDGER.read_text(encoding='utf-8')
    provenance = PROVENANCE.read_text(encoding='utf-8')
    for marker in [
        'const cat=categoryPair(row);',
        'const modelCategoryTruth=mergeCategory(row,current);',
        'modelCategory:modelCategoryTruth.modelCategory',
        'modelCategorySource:modelCategoryTruth.modelCategorySource',
        'requestModelCategoryText(row)',
    ]:
        if marker not in ledger:
            raise SystemExit(f'5.95 compacted ledger marker missing: {marker}')
    for marker in ['function categoryPair(row)', 'function mergeCategory(row, current)', 'function preferKnownModelCategory']:
        if marker not in provenance:
            raise SystemExit(f'5.95 compacted provenance marker missing: {marker}')
    size = LEDGER.stat().st_size
    if size > LEDGER_MAX_BYTES:
        raise SystemExit(f'5.95 ledger budget exceeded after compaction: {size}>{LEDGER_MAX_BYTES}')
    print(f'5.95 ledger category binding compacted: {size} bytes <= {LEDGER_MAX_BYTES}')


run_legacy_materializer()
compact_plugin_category_binding()
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--write')
run('node', str(TOOLS / 'build_usage_dashboard.cjs'), '--check')
run('node', '--check', str(LATEST))
validate_compacted_target()
print(f'MATERIALIZER_IDEMPOTENT:{TARGET_VERSION}')
