from pathlib import Path
import json

root = Path('.').resolve()

# product-manifest.json
manifest_path = root / 'product-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
manifest['production_version'] = '0.63.57'
manifest['release_name'] = 'Current Timeline Authority Guard'
manifest['release_commit'] = 'fb8b7a1ac67d470dfd338e698de952ff71910e85'
manifest['release_blob'] = '43d54d2cb77c36eb72f9f009d4d97981fd17fc3f'
manifest['current_priority'] = '06357_CURRENT_TIMELINE_AUTHORITY_LIVE_VALIDATION'
manifest['validation_status'] = 'PENDING_REAL_LONG_CHAT'
manifest['major_update_milestone'] = '2.0M'
manifest['major_update_phase'] = 'M2'
manifest['major_update_checkpoint'] = 'M2-1'
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

# CURRENT_DEVELOPMENT.md
current_path = root / 'docs/CURRENT_DEVELOPMENT.md'
text = current_path.read_text(encoding='utf-8')
repls = {
    '- Version: `0.63.56`': '- Version: `0.63.57`',
    '- Release: `M2-1 Recovery Boundary Split`': '- Release: `Current Timeline Authority Guard`',
    '- Release commit: `222d6bd0c589c9dd4c469979daa42cefbd512a3e`': '- Release commit: `fb8b7a1ac67d470dfd338e698de952ff71910e85`',
    '- Release blob: `6c828d5dadeb8a49f256afe1e54674cf5bd81803`': '- Release blob: `43d54d2cb77c36eb72f9f009d4d97981fd17fc3f`',
    '- Primary optimization target: `2M_MAJOR_M2_1_LIVE_VALIDATION`': '- Primary optimization target: `06357_CURRENT_TIMELINE_AUTHORITY_LIVE_VALIDATION`',
    '`v0.63.56` is the current production release. Static M2-1 release gates passed; real long-chat validation of the mechanical Recovery boundary split is pending. `v0.63.55` Representation Fast Reconcile remains the validated behavioral regression baseline.': '`v0.63.57` is the current production release. It is a narrow pre-M2-2 chronology guard inserted after direct long-chat evidence showed that persisted 2030 state could remain protected while the visible response silently regressed scene timestamps and character-era state to 2017. M2-1 Recovery boundaries remain unchanged, and `v0.63.55` Representation Fast Reconcile remains a frozen behavioral regression baseline.',
    'v0.63.55 validated this **next-turn false manual-edit rebuild** fix in natural long chat. M2-1 is now deployed as `v0.63.56`; the current task is to validate that the Recovery boundary split preserves the validated fast path, genuine-user-edit behavior, and ordinary A/B/C operation.': 'v0.63.55 validated this **next-turn false manual-edit rebuild** fix in natural long chat. M2-1 remains the active architectural baseline under `v0.63.57`; the current task is to validate the chronology guard while continuing to preserve the validated fast path, genuine-user-edit behavior, and ordinary A/B/C operation.'
}
for old, new in repls.items():
    if old not in text:
        raise SystemExit(f'CURRENT_DEVELOPMENT anchor missing: {old}')
    text = text.replace(old, new, 1)
section_anchor = '## M2-1 — Recovery Boundary Split\n'
if section_anchor not in text:
    raise SystemExit('CURRENT_DEVELOPMENT M2-1 section anchor missing')
mini_section = '''## v0.63.57 — Current Timeline Authority Guard\n\nStatus: **PRODUCTION · PENDING REAL LONG-CHAT VALIDATION**\n\nThis mini update was inserted before further M2 ownership movement because a natural Mode-A turn exposed a continuity coverage gap: the canonical narrative clock remained in 2030, but the visible response emitted unrequested 2017 scene timestamps and also reverted current character age/state to the historical era.\n\nThe patch is intentionally narrow:\n\n```text\npre-generation:\nknown non-broadcast narrative timestamp\n→ inject current_timeline_anchor\n→ current timeline is authoritative\n→ historical context is reference-only unless the user explicitly requests a past scene / flashback\n→ current character age/status follows the current timeline\n\npost-generation diagnostics:\nnon-monotonic visible timestamp sequence\n→ existing persisted-state floor remains protected\n→ visible chronology is reported explicitly\n→ generated body is not semantically/date-rewritten by SimCore\n```\n\nFrozen in this mini release:\n\n- M2-1 `output-compat` / `bootstrap-migration` / Recovery facade boundaries;\n- Representation Fast Reconcile and genuine-user-edit semantics;\n- Deferred Mirror mismatch safety;\n- Broadcast lifecycle and end authority;\n- Frame sequencing;\n- Evidence / Lineage / Handoff / Recurrence / Structure / COMMUNITY;\n- cache/history behavior, storage/API/network/timer surfaces, and persistent schema.\n\nReal long-chat validation should confirm three cases before M2 advances:\n\n1. ordinary current-timeline A/C output stays in the current era;\n2. an explicit user-requested historical scene/flashback remains possible;\n3. if another non-monotonic visible sequence occurs, diagnostics report `Visible chronology: NON_MONOTONIC_VISIBLE_SEQUENCE` while the persisted narrative floor remains protected.\n\n'''
if '## v0.63.57 — Current Timeline Authority Guard' not in text:
    text = text.replace(section_anchor, mini_section + section_anchor, 1)
current_path.write_text(text, encoding='utf-8')

# SIMCORE_M2_LIVE_EVIDENCE.md
ledger_path = root / 'docs/SIMCORE_M2_LIVE_EVIDENCE.md'
ledger = ledger_path.read_text(encoding='utf-8')
ledger_anchor = '## M2-1 — v0.63.56 Recovery Boundary Split\n'
if ledger_anchor not in ledger:
    raise SystemExit('M2 ledger anchor missing')
ledger_section = '''## Pre-M2-2 mini patch — v0.63.57 Current Timeline Authority Guard\n\nProduction baseline:\n\n```text\nVersion: 0.63.57\nRelease: Current Timeline Authority Guard\nRelease commit: fb8b7a1ac67d470dfd338e698de952ff71910e85\nRelease blob: 43d54d2cb77c36eb72f9f009d4d97981fd17fc3f\n```\n\nTriggering direct evidence came from runtime `mt2cejv0-fcumha`, request `@1920` → output `@1921`. The persisted narrative/frame state remained at `2030-08-07`, while the visible body emitted two explicit 2017 scene timestamps and also used historical character age/state under the current-era frame. Diagnostics simultaneously reported:\n\n```text\nContinuity summary: REPAIRED\nNarrative clock: FLOOR CLAMPED\nprevious:  2030-08-07 06:00 PM\nframe:     2030-08-07 06:00 PM\ncommitted: 2030-08-07 06:00 PM\nscenes: 2\ntail: SKIPPED_NON_MONOTONIC\nFrame sequence: PASS\nFrame guard: PASS\nWarnings: 0\n```\n\nInterpretation: persisted-state safety worked, but visible chronology was not protected. This is a real coverage gap and is distinct from M2-1 Recovery/Representation behavior.\n\nThe mini patch adds a non-broadcast current-timeline authority anchor whenever a prior narrative timestamp is known and adds an explicit `Visible chronology` diagnostic. It intentionally does **not** rewrite generated dates/prose, infer scene semantics, change state schema, or alter M2 ownership boundaries.\n\nValidation target:\n\n```text\ncurrent-era ordinary turn                 PASS without era rollback\nexplicit user-requested past scene        still allowed\nnon-monotonic visible sequence recurrence explicitly diagnosed\npersisted narrative floor                 remains protected\nM2-1 representation/recovery controls     unchanged\n```\n\nUntil real long-chat evidence arrives, status remains `PENDING_REAL_LONG_CHAT`.\n\n'''
if '## Pre-M2-2 mini patch — v0.63.57 Current Timeline Authority Guard' not in ledger:
    ledger = ledger.replace(ledger_anchor, ledger_section + ledger_anchor, 1)
ledger_path.write_text(ledger, encoding='utf-8')

# SIMCORE_ANOMALY_WATCH.md
anom_path = root / 'docs/SIMCORE_ANOMALY_WATCH.md'
anom = anom_path.read_text(encoding='utf-8')
trigger_anchor = '### Correlation / promotion trigger\n'
if trigger_anchor not in anom:
    raise SystemExit('anomaly watch chronology trigger anchor missing')
mitigation = '''### Mitigation release\n\n`v0.63.57 — Current Timeline Authority Guard` was released as a narrow pre-M2-2 mitigation. It adds current-timeline authority guidance before generation and makes non-monotonic visible scene-time sequences explicit in copied diagnostics.\n\nStatus after release:\n\n```text\nissue evidence: DIRECT / HIGH\nproduction mitigation: DEPLOYED\nreal long-chat validation: PENDING\nM2-1 attribution: still UNPROVEN\n```\n\nThe mitigation does not claim to semantically rewrite a malformed visible response. Success means preventing the unrequested era rollback in ordinary current-timeline generation while preserving explicit user-requested historical scenes, and retaining the existing persisted-state floor if generation still misbehaves.\n\n'''
if '### Mitigation release' not in anom:
    anom = anom.replace(trigger_anchor, mitigation + trigger_anchor, 1)
anom_path.write_text(anom, encoding='utf-8')

# SIMCORE_GUIDELINES.md durable principle
rules_path = root / 'docs/SIMCORE_GUIDELINES.md'
rules = rules_path.read_text(encoding='utf-8')
rule_anchor = '## 25. Frame Integrity\n'
if rule_anchor not in rules:
    raise SystemExit('guidelines Frame Integrity anchor missing')
rule_section = '''## 24A. Continuity State Safety vs Visible Output\n\nTreat persisted-state continuity and user-visible chronology as separate guarantees. A diagnostic such as `FLOOR CLAMPED`, `SKIPPED_NON_MONOTONIC`, or `Continuity summary: REPAIRED` may prove that canonical state was protected without proving that already-generated scene timestamps or era-specific character state were repaired in the visible body.\n\nWhen investigating chronology faults, inspect both:\n\n```text\npersisted narrative/frame state\nvisible scene timestamps + current-era character state\n```\n\nDo not claim complete continuity repair from state protection alone. Avoid broad semantic/date rewrites unless a deterministic repair is proven; prefer authoritative pre-generation constraints plus explicit post-generation diagnostics.\n\n'''
if '## 24A. Continuity State Safety vs Visible Output' not in rules:
    rules = rules.replace(rule_anchor, rule_section + rule_anchor, 1)
rules_path.write_text(rules, encoding='utf-8')

print('SimCore v0.63.57 memory sync prepared')
