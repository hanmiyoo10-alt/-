#!/usr/bin/env python3
import json
import re
from pathlib import Path

VERSION = '0.63.55'
NEXT_PRIORITY = '2M_MAJOR_M2_MECHANICAL_BOUNDARY_REFACTOR'
RUNTIME = 'mt1g8kbx-3qd6s0'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: expected text not found')
    return text.replace(old, new, 1)


# ---- manifest -------------------------------------------------------------
manifest_path = Path('product-manifest.json')
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
if manifest.get('production_version') != VERSION:
    raise SystemExit(f'expected production {VERSION}, got {manifest.get("production_version")}')
manifest['current_priority'] = NEXT_PRIORITY
manifest['validation_status'] = 'VALIDATED_REAL_LONG_CHAT'
manifest['major_update_milestone'] = '2.0M'
manifest['major_update_phase'] = 'M2'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


# ---- machine architecture contract ---------------------------------------
contract_path = Path('config/simcore-architecture-v2.json')
contract = json.loads(contract_path.read_text(encoding='utf-8'))
if contract.get('production_baseline', {}).get('version') != VERSION:
    raise SystemExit('Contracts v2 production baseline mismatch')
major = contract['major_update']
major['phase'] = 'M2'
major['status'] = 'AUTHORIZED_AFTER_0_63_55_LIVE_VALIDATION'
major['runtime_refactor_authorized'] = True
major['authorization_evidence'] = {
    'date': '2026-08-20',
    'runtime_generation': RUNTIME,
    'previous_output': '@1871',
    'next_request': '@1872',
    'prior_representation': 'OUTPUT_MISMATCH',
    'current_match': 'FRESH_CHAT',
    'edit_origin': 'REPRESENTATION_DRIFT_CORRELATED',
    'edit_reconcile': 'REPRESENTATION_FAST_RECONCILED',
    'reconcile_cost_ms': 0.0,
    'snapshot': 'UNCHANGED',
    'shape': 'FRESH_EXACT_CARRYOVER',
    'canonical_chars': 3715,
    'fresh_chars': 3714,
    'delta_chars': -1,
}
for name, status in {
    'representation': 'm2_authorized',
    'edit-reconcile': 'm2_authorized',
    'output-compat': 'm2_authorized_mechanical_split',
    'bootstrap-migration': 'm2_authorized_mechanical_split',
}.items():
    contract['modules'][name]['status'] = status
contract['transition_policy']['m2_order'] = [
    'add planned module shells/adapters without changing behavior',
    'split recovery output-compat vs bootstrap-migration mechanically',
    'extract representation classification and edit-reconcile with validated v0.63.55 behavior frozen as regression target',
    'shrink session/runtime-mirror ownership only after regression equality',
    'remove transition exceptions only when actual source edges disappear',
]
contract_path.write_text(json.dumps(contract, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


# ---- Contracts v2 narrative ----------------------------------------------
contracts_path = Path('docs/SIMCORE_CONTRACTS_V2.md')
contracts = contracts_path.read_text(encoding='utf-8')
contracts = replace_once(
    contracts,
    '> M2 runtime refactor authorization: **BLOCKED until v0.63.55 real long-chat Representation Fast Reconcile is observed successfully.**',
    '> M2 runtime refactor authorization: **AUTHORIZED — v0.63.55 live gate satisfied on 2026-08-20.**',
    'contracts header gate',
)
contracts = replace_once(
    contracts,
    'M1 deliberately blocks physical runtime refactoring until live v0.63.55 evidence exists.',
    'M1 originally blocked physical runtime refactoring until live v0.63.55 evidence existed. The gate was satisfied on 2026-08-20 in runtime `mt1g8kbx-3qd6s0`; M2 mechanical refactoring is now authorized.',
    'contracts M2 gate intro',
)
contracts = replace_once(
    contracts,
    'Until the fast-path gate succeeds, `runtime_refactor_authorized` stays `false` in the machine-readable contract and planned M2 modules are forbidden from appearing physically in plugin source.',
    'The fast-path gate has succeeded, so `runtime_refactor_authorized` is now `true` in the machine-readable contract. Planned M2 modules may appear only through the staged mechanical order below; validated behavior remains frozen as the regression target.',
    'contracts machine gate',
)
if '## 14. Live M2 Authorization Evidence — 2026-08-20' not in contracts:
    contracts += '''\n\n---\n\n## 14. Live M2 Authorization Evidence — 2026-08-20\n\nRuntime `mt1g8kbx-3qd6s0` exercised the exact v0.63.55 target naturally with no reload between the compared turns.\n\n```text\n@1871 output\nDeferred mirror: OUTPUT_MISMATCH\nCANONICAL 3715:2983182f\nFRESH_CHAT 3714:5329a62f\nΔchars -1\n\n@1872 next request\nEdit reconcile: REPRESENTATION_FAST_RECONCILED · 0.0 ms\nsnapshot UNCHANGED\nrepresentation fresh-exact-carryover\nPrior representation: OUTPUT_MISMATCH\nEdit origin: REPRESENTATION_DRIFT_CORRELATED\ncurrent 3714:5329a62f · match FRESH_CHAT\nvs canonical -1 · vs fresh +0\nshape FRESH_EXACT_CARRYOVER\n```\n\nThis is the required live proof that a confirmed Fresh carryover can bypass the former 4–6 second false manual-edit rebuild without mutating canonical CoreSession state. The output immediately returned to exact canonical/Fresh identity, and the following natural requests remained `SAME_FAST` at 0–2 ms with `snapshot UNCHANGED`.\n\nThe genuine-user-edit positive control was not re-exercised in this same runtime. Existing verified E1 remains the control, and every M2 mechanical checkpoint must re-run/preserve:\n\n```text\nPrior EXACT\ncurrent != canonical\ncurrent != Fresh\n→ USER_EDIT_CANDIDATE\n→ MANUAL_EDIT_REBUILT\n```\n'''
contracts_path.write_text(contracts, encoding='utf-8')


# ---- current development memory ------------------------------------------
dev_path = Path('docs/CURRENT_DEVELOPMENT.md')
dev = dev_path.read_text(encoding='utf-8')
dev = replace_once(dev, '- Validation status: `PENDING_REAL_LONG_CHAT`', '- Validation status: `VALIDATED_REAL_LONG_CHAT`', 'dev snapshot validation')
dev = replace_once(dev, '- Primary optimization target: `REPRESENTATION_FAST_RECONCILE_VALIDATION`', f'- Primary optimization target: `{NEXT_PRIORITY}`', 'dev snapshot priority')
dev = replace_once(
    dev,
    '`v0.63.55` is the current production release. Static release gates passed; real long-chat validation of the new request-side fast path is pending.',
    '`v0.63.55` is the current production release. Static release gates passed and the request-side Representation Fast Reconcile has now passed real long-chat validation.',
    'dev production verdict',
)
dev = replace_once(dev, 'Status: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**', 'Status: **PRODUCTION · VALIDATED REAL LONG-CHAT**', 'dev release status')
dev = replace_once(
    dev,
    'v0.63.55 now targets this **next-turn false manual-edit rebuild** directly. The next task is to validate that confirmed Fresh carryover takes the fast path while genuine user edits still rebuild.',
    'v0.63.55 has now validated this **next-turn false manual-edit rebuild** fix in natural long chat. The next task is the 2.0M Major M2 mechanical boundary refactor, with the validated fast path and genuine-user-edit behavior frozen as regression controls.',
    'dev current problem conclusion',
)
dev = replace_once(
    dev,
    '- **A1 / v0.63.55:** Representation Fast Reconcile — deployed; real long-chat validation pending.',
    '- **A1 / v0.63.55:** Representation Fast Reconcile — deployed and real long-chat validated in runtime `mt1g8kbx-3qd6s0`.',
    'dev roadmap A1',
)
dev = dev.replace('**Current phase. Highest priority.**', '**Exact Fresh-carryover exit condition satisfied; behavior is now frozen as an M2 regression control.**', 1)

ledger_marker = '# 6. Verified Evidence Ledger\n'
if '## E-LIVE-055 — Representation Fast Reconcile validated' not in dev:
    evidence = '''# 6. Verified Evidence Ledger\n\n## E-LIVE-055 — Representation Fast Reconcile validated\n\nRuntime `mt1g8kbx-3qd6s0`, same boot/generation throughout:\n\n```text\n@1870→1871 output:\nDeferred mirror OUTPUT_MISMATCH\nCANONICAL 3715:2983182f\nFRESH_CHAT 3714:5329a62f\nΔchars -1\n\n@1872 request:\nEdit reconcile REPRESENTATION_FAST_RECONCILED · 0.0 ms\nsnapshot UNCHANGED\nrepresentation fresh-exact-carryover\nPrior representation OUTPUT_MISMATCH\nEdit origin REPRESENTATION_DRIFT_CORRELATED\ncurrent == prior FRESH_CHAT EXACT\nvs canonical -1 · vs fresh +0\n```\n\nResult: the former `4–6 s` false `MANUAL_EDIT_REBUILT` class was avoided exactly as designed. Output @1873 returned to `CANONICAL == FRESH_CHAT`, and subsequent requests @1874/@1876/@1878/@1880/@1882/@1884/@1886 remained `SAME_FAST` at 0–2 ms with `snapshot UNCHANGED`.\n\nThe same run also strengthens the later storage-latency target without changing current M2 scope:\n\n```text\nTurn storage observed: 286–616 ms\nOutput storage observed: 305 ms–1.007 s\nrequest hotspot: TURN_STORAGE ~81–90%\noutput hotspot: OUT_STORAGE ~93–95%\n```\n\nThis storage evidence belongs to later latency work; do not mix it into the M2 mechanical modularization. Provider cache remains `UNVERIFIED`.\n\n'''
    if ledger_marker not in dev:
        raise SystemExit('dev evidence ledger marker missing')
    dev = dev.replace(ledger_marker, evidence, 1)

# Update common quick-resume wording if still present.
dev = dev.replace('Validate v0.63.55 — Representation Fast Reconcile in natural long chat', '2.0M Major M2 — Mechanical Boundary Refactor', 1)
dev_path.write_text(dev, encoding='utf-8')


# ---- durable sync script: prevent future rollback -------------------------
sync_path = Path('scripts/simcore-sync-memory.py')
sync = sync_path.read_text(encoding='utf-8')
sync = replace_once(
    sync,
    "    '0.63.55': 'REPRESENTATION_FAST_RECONCILE_VALIDATION',",
    f"    '0.63.55': '{NEXT_PRIORITY}',",
    'sync priority 0.63.55',
)
old_snapshot_line = "- Validation status: `PENDING_REAL_LONG_CHAT`"
new_code = "- Validation status: `{validation_status}`"
if new_code not in sync:
    sync = replace_once(
        sync,
        "snapshot = f'''{begin}\n## Current Production Snapshot\n",
        "validation_status_by_version = {\n    '0.63.55': 'VALIDATED_REAL_LONG_CHAT',\n}\nvalidation_status = validation_status_by_version.get(version, 'PENDING_REAL_LONG_CHAT')\n\nsnapshot = f'''{begin}\n## Current Production Snapshot\n",
        'sync validation map',
    )
    sync = replace_once(sync, old_snapshot_line, new_code, 'sync snapshot validation line')
sync_path.write_text(sync, encoding='utf-8')

print('SimCore v0.63.55 validation finalized; M2 authorized.')
