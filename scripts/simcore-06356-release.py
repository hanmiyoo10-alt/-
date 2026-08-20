#!/usr/bin/env python3
from pathlib import Path

OLD_VERSION = '0.63.55'
NEW_VERSION = '0.63.56'
RELEASE_NAME = 'M2-1 Recovery Boundary Split'

LATEST = Path('plugins/simcore/latest.js')
INSTALL = Path('plugins/simcore/install.js')

RECOVERY_START = 'SimCore.define("recovery", function (require, module, exports) {'
PROMPT_START = 'SimCore.define("prompt", function (require, module, exports) {'
BOOTSTRAP_MARKER = 'function bootstrapFromHistory('
EXPORTS_MARKER = 'module.exports = {'

OUTPUT_EXPORTS = [
    'classifyPreamble',
    'buildSafeEnvelopeBoundaryConfirmation',
    'canonicalizeResponseEnvelope',
    'normalizeTailPlacement',
    'prepareOutput',
]
BOOTSTRAP_EXPORTS = [
    'bootstrapFromHistory',
    'repairLegacyAgeClock',
    'repairLegacyClockState',
    'repairLatestGlobalFloorContamination',
]
ALL_EXPORTS = OUTPUT_EXPORTS + BOOTSTRAP_EXPORTS


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if text.count(old) != 1:
        raise SystemExit(f'{label}: expected exactly one occurrence, found {text.count(old)}')
    return text.replace(old, new, 1)


def export_block(names):
    return 'module.exports = {\n' + ''.join(f'  {name},\n' for name in names) + '};\n});\n\n'


def transform(source: str) -> str:
    if f'//@version {OLD_VERSION}' not in source:
        raise SystemExit(f'expected //@version {OLD_VERSION}')
    if f"const SIMCORE_RUNTIME_VERSION = '{OLD_VERSION}';" not in source:
        raise SystemExit('runtime version marker missing')
    if 'SimCore.define("output-compat"' in source or 'SimCore.define("bootstrap-migration"' in source:
        raise SystemExit('M2-1 modules already present unexpectedly')

    start = source.index(RECOVERY_START)
    end = source.index(PROMPT_START, start)
    old_block = source[start:end]
    bootstrap_at = old_block.index(BOOTSTRAP_MARKER)
    exports_at = old_block.rindex(EXPORTS_MARKER)

    output_prefix = old_block[:bootstrap_at]
    bootstrap_functions = old_block[bootstrap_at:exports_at]

    # The output-compat implementation is the original Recovery prefix verbatim;
    # only the module identity changes. This preserves function bodies byte-for-byte.
    output_module = output_prefix.replace(
        RECOVERY_START,
        'SimCore.define("output-compat", function (require, module, exports) {',
        1,
    ) + export_block(OUTPUT_EXPORTS)

    bootstrap_module = '''SimCore.define("bootstrap-migration", function (require, module, exports) {\nconst kernel = require('./kernel');\nconst lifecycle = require('./lifecycle');\nconst time = require('./time');\nconst community = require('./community');\nconst reaction = require('./reaction');\nconst outputCompat = require('./output-compat');\nconst prepareOutput = outputCompat.prepareOutput;\n\n''' + bootstrap_functions + export_block(BOOTSTRAP_EXPORTS)

    facade_lines = [
        'SimCore.define("recovery", function (require, module, exports) {',
        "const outputCompat = require('./output-compat');",
        "const bootstrapMigration = require('./bootstrap-migration');",
        '',
        'module.exports = {',
    ]
    for name in OUTPUT_EXPORTS:
        facade_lines.append(f'  {name}: outputCompat.{name},')
    for name in BOOTSTRAP_EXPORTS:
        facade_lines.append(f'  {name}: bootstrapMigration.{name},')
    facade_lines += ['};', '});', '', '']
    facade_module = '\n'.join(facade_lines)

    new_recovery_region = output_module + bootstrap_module + facade_module
    out = source[:start] + new_recovery_region + source[end:]

    # M2-1 internal ownership metadata. Runtime policy is unchanged.
    out = replace_once(out, 'const MODULE_CONTRACT_VERSION = 1;', 'const MODULE_CONTRACT_VERSION = 2;', 'module contract version')
    old_contract = "  recovery: Object.freeze({ owns: 'cold-path deterministic repair/bootstrap/legacy recovery', excludes: 'normal hot-path policy ownership' }),"
    new_contract = "  'output-compat': Object.freeze({ owns: 'output envelope compatibility/canonicalization and Fresh-confirmation candidate metadata', excludes: 'history bootstrap, manual edit attribution, persistent raw body' }),\n  'bootstrap-migration': Object.freeze({ owns: 'history bootstrap and legacy migration/repair coordination', excludes: 'ordinary output compatibility or manual edit attribution' }),\n  recovery: Object.freeze({ owns: 'M2 compatibility facade over output-compat + bootstrap-migration', excludes: 'new policy ownership; facade may shrink after callers migrate' }),"
    out = replace_once(out, old_contract, new_contract, 'internal module contracts')

    old_header = '// - Recovery: cold-path envelope/output/edit/bootstrap/legacy repair\n'
    new_header = "// - Output Compat: output envelope compatibility/canonicalization + bounded Fresh-confirmation metadata\n// - Bootstrap Migration: history bootstrap + legacy migration/repair coordination\n// - Recovery: M2 compatibility facade preserving the v0.63.55 public recovery API\n"
    out = replace_once(out, old_header, new_header, 'internal module header')

    release_note = f'''// v{NEW_VERSION} {RELEASE_NAME}:\n// - Begins the 2.0M Major M2 mechanical boundary refactor after v0.63.55 Representation Fast Reconcile passed real long-chat validation\n// - Splits the former Recovery implementation into output-compat (envelope/tail/Fresh-confirmation candidate logic) and bootstrap-migration (history bootstrap + legacy repair) while preserving every moved function body verbatim\n// - Keeps Recovery as a compatibility facade with the exact v0.63.55 exported API, so Session/runtime call sites and request/output sequencing remain unchanged in M2-1\n// - No representation/edit-reconcile algorithm is moved yet; v0.63.55 REPRESENTATION_FAST_RECONCILED and genuine USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT behavior remain frozen regression controls\n// - No state schema, storage key/call, host API, network/timer, request-history mutation, provider-cache claim, prompt placement, generation semantic, Structure/COMMUNITY, Broadcast/Frame/Continuity/Evidence/Lineage/Handoff/Recurrence behavior change\n//\n'''
    out = replace_once(out, f'// v{OLD_VERSION} Representation Fast Reconcile:\n', release_note + f'// v{OLD_VERSION} Representation Fast Reconcile:\n', 'release note insertion')

    out = replace_once(out, f'//@version {OLD_VERSION}', f'//@version {NEW_VERSION}', 'plugin version')
    out = replace_once(out, f"const SIMCORE_RUNTIME_VERSION = '{OLD_VERSION}';", f"const SIMCORE_RUNTIME_VERSION = '{NEW_VERSION}';", 'runtime version')

    # Mechanical parity gates: all original named function definitions must survive byte-for-byte.
    for name in ALL_EXPORTS:
        marker = f'function {name}('
        if marker not in old_block or marker not in out:
            raise SystemExit(f'moved function missing: {name}')
    if out.count('SimCore.define("output-compat"') != 1:
        raise SystemExit('output-compat definition count mismatch')
    if out.count('SimCore.define("bootstrap-migration"') != 1:
        raise SystemExit('bootstrap-migration definition count mismatch')
    if out.count(RECOVERY_START) != 1:
        raise SystemExit('recovery facade definition count mismatch')
    for name in ALL_EXPORTS:
        if f'  {name}:' not in facade_module:
            raise SystemExit(f'recovery facade export missing: {name}')

    # Frozen behavior sentinels must still exist after the split.
    sentinels = [
        'REPRESENTATION_FAST_RECONCILED',
        'REPRESENTATION_DRIFT_CORRELATED',
        'USER_EDIT_CANDIDATE',
        'MANUAL_EDIT_REBUILT',
        'SAFE_BOUNDARY_CONFIRMED',
        'FRESH_CONFIRMED_SUFFIX',
        "return stabilizationResult('OBSERVE_ONLY'",
        "source: 'REQUEST_SIGNATURE_OBSERVER'",
        'provider UNVERIFIED',
        "persistentMutation: 'NONE'",
    ]
    for sentinel in sentinels:
        if sentinel not in out:
            raise SystemExit(f'frozen sentinel missing: {sentinel}')

    return out


def main():
    latest_before = LATEST.read_text(encoding='utf-8')
    install_before = INSTALL.read_text(encoding='utf-8')
    if latest_before != install_before:
        raise SystemExit('latest/install diverged before M2-1 patch')

    patched = transform(latest_before)
    LATEST.write_text(patched, encoding='utf-8')
    INSTALL.write_text(patched, encoding='utf-8')
    print(f'SimCore v{NEW_VERSION} {RELEASE_NAME} patched.')


if __name__ == '__main__':
    main()
