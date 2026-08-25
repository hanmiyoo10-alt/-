# SimCore M2-4E — Recovery Facade Call-Site Audit

Status: `DESIGN FROZEN PROVISIONALLY · CONDITIONAL FACADE RETIREMENT SELECTED · MUST REBASE AGAINST POST-M2-3 SOURCE · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Production authority while this audit is recorded: `release-simcore` v0.64.7.

Parent design:
- `docs/SIMCORE_M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`
- `docs/SIMCORE_M2_4C_RUNTIME_MIRROR_OBSERVATION_RECEIPT_CONTRACT.md`
- `docs/SIMCORE_M2_4D_OUTPUT_FINALIZATION_OWNERSHIP_DECISION.md`

Primary references:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- current `release-simcore` v0.64.7 runtime source
- M2-1 Recovery Boundary Split release history

## 1. Purpose

Audit the transitional `recovery` compatibility facade introduced in M2-1 and decide whether any post-M2-3/M2-4 caller still needs a mixed Recovery API rather than calling the physical owner directly.

M2-1 intentionally preserved the v0.63.55 Recovery API while moving implementation ownership into:

```text
output-compat
bootstrap-migration
```

The current M2 question is therefore:

```text
Does `recovery` still represent a real cohesive service,
or is it now only a transitional alias surface whose callers can be migrated to physical owners?
```

## 2. Current facade shape

Current v0.64.7 `recovery` contains no independent algorithm or state.

It imports:

```text
output-compat
bootstrap-migration
```

and re-exports aliases only.

Current facade surface:

```text
OUTPUT-COMPAT aliases
- classifyPreamble
- buildSafeEnvelopeBoundaryConfirmation
- canonicalizeResponseEnvelope
- normalizeTailPlacement
- prepareOutput

BOOTSTRAP-MIGRATION aliases
- bootstrapFromHistory
- repairLegacyAgeClock
- repairLegacyClockState
- repairLatestGlobalFloorContamination
```

Canonical classification:

```text
RECOVERY_FACADE
= ZERO OWN POLICY
= ZERO OWN STATE
= ZERO OWN I/O
= TRANSITIONAL API ALIAS
```

This is not a defect. It is the intended M2-1 transition shape.

## 3. Current direct consumer inventory

Repository/runtime search at the current pre-M2-3 shape finds the actual `require('./recovery')` runtime dependency in the SimCore plugin artifact, with the Session module as the substantive direct consumer.

No separate runtime module was identified as requiring Recovery for a genuinely mixed cross-owner transaction.

Therefore the current architectural shape is effectively:

```text
Session
  ↓
Recovery facade
  ├─ output-compat
  └─ bootstrap-migration
```

The facade is not currently hiding a coordination algorithm. Session is the coordinator and Recovery forwards calls.

## 4. Call-site disposition matrix

| Recovery facade export | Physical owner | Current runtime use through facade | M2-4E target |
|---|---|---|---|
| `classifyPreamble` | output-compat | no direct runtime facade caller identified | retire facade alias after compatibility proof |
| `canonicalizeResponseEnvelope` | output-compat | no direct runtime facade caller identified | retire facade alias after compatibility proof |
| `normalizeTailPlacement` | output-compat | no direct runtime facade caller identified | retire facade alias after compatibility proof |
| `prepareOutput` | output-compat | Session normal output + compatibility/edit replay paths | migrate each surviving caller to output-compat |
| `buildSafeEnvelopeBoundaryConfirmation` | output-compat | Session post-finalization safe-boundary candidate construction | migrate to output-compat; align with M2-4C candidate-plan ownership |
| `bootstrapFromHistory` | bootstrap-migration | Session history bootstrap sequencing | Session calls bootstrap-migration directly |
| `repairLegacyAgeClock` | bootstrap-migration | no direct facade caller identified; used by bootstrap-migration implementation | retire facade alias; keep physical helper as required internally |
| `repairLegacyClockState` | bootstrap-migration | multiple Session reconcile/legacy repair paths | migrate surviving post-M2-3 caller(s) to bootstrap-migration |
| `repairLatestGlobalFloorContamination` | bootstrap-migration | Session load/init legacy contamination repair | Session calls bootstrap-migration directly |

## 5. Output-compat family disposition

### 5.1 `prepareOutput`

Current Session uses `recovery.prepareOutput(...)` in multiple distinct sequencing contexts:

```text
ordinary output processing
compatibility replay against stored send state
manual-edit / reconcile rebuild path
```

All three calls are semantically output-envelope compatibility work.

They do not need a Recovery abstraction once physical ownership is stable.

Target:

```text
caller
→ output-compat.prepareOutput(...)
```

Post-M2-3 rebase rule:

```text
if an existing Session edit/reconcile call moves into edit-reconcile,
that moved call should normally become:
edit-reconcile → output-compat
```

Do not keep Recovery merely to avoid updating an Application dependency that now has a clear physical owner.

### 5.2 `buildSafeEnvelopeBoundaryConfirmation`

The current normal output path calls the facade after deterministic output finalization and Structure judgement.

M2-4C already assigns compatibility candidate meaning to Output Compat rather than Runtime Mirror.

M2-4D also leaves post-finalization compatibility candidate-plan construction outside `output-finalize`.

Therefore this call has a strong direct-owner destination:

```text
Session/application wiring
→ output-compat.buildSafeEnvelopeBoundaryConfirmation(...)
```

or its post-M2-4C replacement observation-plan API if that API is introduced during implementation.

The facade adds no useful ownership boundary here.

### 5.3 Unused facade-only output compatibility aliases

No direct runtime facade caller was identified for:

```text
classifyPreamble
canonicalizeResponseEnvelope
normalizeTailPlacement
```

These functions may remain exported by `output-compat` where its implementation/API needs them.

But duplicating them through Recovery is not a reason to preserve Recovery after all callers migrate.

Classification:

```text
UNUSED_RECOVERY_ALIAS
= RETIRE_WITH_FACADE
= DO NOT DELETE PHYSICAL OWNER FUNCTION AUTOMATICALLY
```

## 6. Bootstrap-migration family disposition

### 6.1 `bootstrapFromHistory`

Session legitimately decides WHEN a per-chat bootstrap is needed and owns application sequencing around its current state.

Bootstrap Migration owns HOW history bootstrap reconstructs/migrates semantic state.

Target:

```text
Session
→ bootstrap-migration.bootstrapFromHistory(...)
```

This is consistent with M2-4B:

```text
Session may hold bounded bootstrap lifecycle state/receipt
!= Session owns bootstrap policy
```

### 6.2 `repairLegacyClockState`

Current pre-M2-3 Session calls this function across several reconcile/compatibility paths.

The function performs legacy migration/repair coordination and may access Store-owned anchor mechanics through the passed Store boundary.

It is therefore not ordinary output compatibility.

Target after M2-3 rebase:

```text
surviving legacy-repair coordinator
→ bootstrap-migration.repairLegacyClockState(...)
```

Expected ownership may split by call site:

```text
Session init/load compatibility path
→ bootstrap-migration

Edit Reconcile path moved by M2-3
→ edit-reconcile → bootstrap-migration
```

Exact post-M2-3 call ownership must be re-read before implementation.

### 6.3 `repairLatestGlobalFloorContamination`

This is Session load/init migration work and has a direct physical owner.

Target:

```text
Session
→ bootstrap-migration.repairLatestGlobalFloorContamination(...)
```

No Recovery indirection is required.

### 6.4 `repairLegacyAgeClock`

No direct facade consumer was identified in the current runtime call-site inventory.

The physical Bootstrap Migration implementation uses it as a helper for `repairLegacyClockState`.

Therefore:

```text
Recovery alias: retire with facade
Bootstrap Migration helper: retain if still internally required
```

## 7. Is any mixed Recovery service still justified?

Current answer:

```text
NO EVIDENCE OF A REAL MIXED RECOVERY SERVICE
```

A facade would remain architecturally justified only if a surviving caller required one cohesive operation that intrinsically spans both:

```text
output compatibility
AND
bootstrap/legacy migration
```

and that cross-owner sequence itself had stable semantics worth owning as a service.

No such independent transaction is identified in the current v0.64.7 facade.

Instead, current mixed usage occurs because Session historically imported one compatibility surface before M2-1 split the physical owners.

That is transition history, not current domain cohesion.

## 8. M2-4E decision

Select conditional retirement of the `recovery` physical facade.

Classification:

```text
RECOVERY_FACADE_RETIREMENT
= SELECTED CONDITIONALLY
= POST-M2-3 / POST-CALL-SITE-MIGRATION
= MECHANICAL ARCHITECTURE CLEANUP
= NOT AUTHORIZED PRE-M2-3
```

The word `conditionally` is important.

The facade must not be deleted until the post-M2-3 source proves:

```text
1. all runtime callers are enumerated
2. each call maps unambiguously to output-compat or bootstrap-migration
3. no external/permanent test depends on Recovery as the required public seam
4. no staged migration script requires the facade in the target release
5. direct-owner imports satisfy Contracts v2 dependency direction
6. differential behavior is unchanged
```

If an actual mixed service appears after M2-3, this decision must be revisited rather than forcing direct calls for aesthetic purity.

## 9. Target post-retirement dependency shape

Preferred post-M2-4 shape:

```text
Session
├─ output-compat       (ordinary output compatibility sequencing)
├─ bootstrap-migration (bootstrap/init migration sequencing)
└─ output-finalize     (deterministic finalization transaction)

edit-reconcile
├─ representation
├─ output-compat
├─ bootstrap-migration
└─ output-finalize     (only if deterministic replay remains required)
```

with:

```text
recovery facade = absent
```

or, if temporary compatibility evidence requires one-release retention:

```text
recovery facade = unreferenced deprecated shim
```

The second shape must have an explicit deletion gate and must not regain policy.

## 10. Do not replace Recovery with another facade

M2-4E explicitly forbids replacing `recovery` with a renamed catch-all such as:

```text
compat
output-services
state-recovery
turn-utils
application-utils
```

A renamed mixed barrel module would preserve the same ownership ambiguity.

Call the physical owner directly when the owner is known.

## 11. Contracts/config consequence if implemented

If the facade is physically retired, implementation must update architecture metadata in the same architectural change set so the repository does not claim a required module that no longer exists.

Expected documentation/config updates include the authoritative equivalents of:

```text
SIMCORE_CONTRACTS_V2 recovery module status
config/simcore-architecture-v2.json recovery entry
module inventory / architecture checks
M2 checkpoint evidence
```

This is architecture synchronization, not a release-system redesign.

Do not change release-system machinery merely because a module disappears.

## 12. Static proof requirements

Before facade deletion, static evidence must prove at minimum:

```text
ZERO `require('./recovery')` in production runtime
ZERO `recovery.` runtime call sites
all moved output calls resolve to output-compat
all moved bootstrap/legacy calls resolve to bootstrap-migration
no dependency cycle introduced
module loader resolves all new direct imports
latest.js == install.js
architecture inventory matches physical modules
```

Also prove facade aliases were exact forwarding aliases before removal; do not silently change function semantics while migrating call sites.

## 13. Differential regression requirements

Output-compat migration controls:

```text
ordinary prepareOutput
Thoughts compatibility path
boundary-normalized envelope compatibility
safe-envelope boundary candidate construction
manual/genuine-edit compatibility replay
representation-fast control
```

Bootstrap-migration migration controls:

```text
fresh history bootstrap
existing snapshot load
legacy clock repair
legacy/global reaction-floor contamination repair
no-op on already-current state
```

M2-3 genuine-edit positive control remains mandatory before M2-4 closes.

## 14. Suggested implementation sequencing after M2-3

Do not combine every M2-4 ownership move blindly.

Preferred mechanical sequence after mandatory rebase:

```text
A. re-inventory post-M2-3 Session/edit-reconcile call sites
B. add direct owner dependencies
C. migrate output-compat Recovery calls
D. run differential/static proof
E. migrate bootstrap-migration Recovery calls
F. run differential/static proof
G. prove Recovery import/call count = 0
H. delete or deprecate facade according to compatibility evidence
I. update Contracts/config/module inventory
```

`output-finalize` extraction and Runtime Mirror receipt refactor may have their own implementation slices; do not force all M2-4 changes into one giant mechanical patch if independent proof is safer.

## 15. Post-M2-3 rebase checklist

Before freezing implementation, answer:

```text
1. Which current Recovery call sites moved into edit-reconcile during M2-3?
2. Does Session still import Recovery?
3. Does any new module import Recovery?
4. Does any test/tool rely on Recovery as an intentional seam?
5. Are output-compat and bootstrap-migration direct dependencies legal from each caller?
6. Did M2-3 create a genuinely mixed recovery transaction?
7. Can Recovery be deleted with zero semantic code movement?
```

If #6 becomes YES, document the mixed service before deciding whether the facade survives.

## 16. M2-4E verdict

```text
RECOVERY
= TRANSITIONAL M2-1 COMPATIBILITY FACADE
= NO OWN POLICY
= NO OWN STATE
= NO OWN I/O

CURRENT CALLERS
= EFFECTIVELY SESSION-CENTRIC

OUTPUT COMPATIBILITY CALLS
→ MOVE TO output-compat

BOOTSTRAP / LEGACY MIGRATION CALLS
→ MOVE TO bootstrap-migration

FACADE RETIREMENT
= CONDITIONALLY SELECTED
= ONLY AFTER POST-M2-3 CALL-SITE REBASE + ZERO-CALLER PROOF

IMPLEMENTATION NOW
= NONE

RUNTIME CHANGE NOW
= NONE
```

## 17. M2-4 predesign closure state

With M2-4E recorded, the pre-M2-3 design map now contains:

```text
M2-4 Target Map                         RECORDED
M2-4B Session State Holder Contract    PROVISIONALLY FROZEN
M2-4C Runtime Mirror Receipt Contract  PROVISIONALLY FROZEN
M2-4D Output Finalization Decision     EXTRACTION SELECTED PROVISIONALLY
M2-4E Recovery Facade Audit            CONDITIONAL RETIREMENT SELECTED
```

This does NOT authorize M2-4 implementation before M2-3.

Next mandatory architecture action for M2-4 is not more speculative extraction design. It is:

```text
M2-3 lands and stabilizes
→ M2-4A actual post-M2-3 responsibility inventory
→ rebase B/C/D/E against source reality
→ freeze implementation plan
```
