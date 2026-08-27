from pathlib import Path

path = Path('docs/CURRENT_DEVELOPMENT.md')
text = path.read_text(encoding='utf-8')

old = '''# 1. Current Operational State

## Production verdict

`v0.64.7` is the current production release: **Cross-Reload Cache Observer Continuity** at release commit `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`, with identical latest/install release blob `676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0`. Release System v2 published and reobserved this identity successfully; the durable release record is `LIVE_PENDING`, while `product-manifest.json` correctly declares `PENDING_REAL_LONG_CHAT`. The validated parent remains v0.64.6 Post-B_END C Clock Handoff Authority.

The runtime is frozen at v0.64.7 while the required real long-chat scenario `06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT` is pending. Do not begin another runtime release or M2-3 implementation before this live gate is classified and closed. R2.1 delegated operation is implemented, permanent-CI qualified, and active as policy, but remains `ACTIVE · AWAITING GENUINE RELEASE PROOF`; that operational proof belongs to the next genuine runtime release after the current v0.64.7 live gate, and does not block the present validation.

'''
new = '''# 1. Current Operational State

## How to read current operational state

The machine-managed blocks above are authoritative for current production identity, validation status, and the active live gate. Human-authored sections below record interpretation, historical evidence, constraints, and follow-up decisions; they do not override those blocks.

Runtime changes remain frozen while the active product live gate is pending. M2-3 remains blocked until the active product gate closes. Provider cache remains `UNVERIFIED` unless direct evidence changes it. R2.1 delegated operation is the proven pre-live release operating mode; R2.2 changes only state-expression and blocker-incident closure semantics and does not replace the required product live evidence.

'''
if text.count(old) != 1:
    raise SystemExit(f'expected exactly one active Production verdict block, found {text.count(old)}')
text = text.replace(old, new, 1)

replacements = {
    'does not override the current snapshot or production verdict.': 'does not override the machine-managed current-state blocks above.',
    'They do not override the machine-managed production snapshot or the current operational verdict above.': 'They do not override the machine-managed current-state blocks above.',
}
for old_text, new_text in replacements.items():
    if text.count(old_text) != 1:
        raise SystemExit(f'expected exactly one phrase: {old_text!r}, found {text.count(old_text)}')
    text = text.replace(old_text, new_text, 1)

path.write_text(text, encoding='utf-8')
Path('.github/workflows/_simcore-r2-2-branch-patch.yml').unlink()
Path('products/simcore/tooling/_r2_2_branch_patch.py').unlink()
