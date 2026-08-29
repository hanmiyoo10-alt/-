# SimCore v0.67.0 — M2-5 Recovery Transition Debt Retirement Design

Date: 2026-08-29

Status: **DESIGN SELECTED · CONDITIONALLY FROZEN · IMPLEMENTATION BLOCKED BY POST-v0.66 ARCH-CONTRACT CONVERGENCE + EXACT SOURCE RE-AUDIT · NO RUNTIME CHANGE**

Planned version:

```text
0.67.0
```

Planned release name:

```text
M2-5 Recovery Transition Debt Retirement
```

Production parent:

```text
v0.66.0 — M2-4 Session / Runtime Mirror Boundary Completion
release-simcore commit 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
release blob f0da13d4c47fd98e9065d7dbf253a3296151ee16
validation LIVE_PASS
checkpoint M2-4
```

Primary review authority:

- `docs/SIMCORE_06600_M2_4_SESSION_RUNTIME_MIRROR_BOUNDARY_COMPLETION_ACTIVATION.md`
- `docs/SIMCORE_M2_4E_RECOVERY_FACADE_CALL_SITE_AUDIT.md`
- `docs/SIMCORE_06600_M2_4_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_LIVE_06600_RELEASE_CLOSE_2026-08-29.md`
- `docs/SIMCORE_POST_06600_ARCH_CONTRACT_DRIFT_PRE_M2_5_BLOCKER_2026-08-29.md`
- `docs/SIMCORE_POST_06600_DEFERRED_WATCH_TRIAGE_2026-08-29.md`

---

## 1. Selection decision

The next structural SimCore version is selected as:

```text
v0.67.0
M2-5
Recovery Transition Debt Retirement
```

This is a mechanical architecture cleanup checkpoint.

It is **not** a feature release and is intentionally narrower than the full historical M2-5+ candidate pool.

Selected runtime target:

```text
remove the now-unreferenced physical Recovery compatibility facade
```

Selected architecture cleanup:

```text
remove only stale transition declarations whose corresponding v0.66 source edge/artifact is proven absent
```

Everything else requires its own owner/evidence decision.

---

## 2. Why Recovery is the correct next target

M2-1 introduced the staged shape:

```text
recovery compatibility facade
├─ output-compat
└─ bootstrap-migration
```

M2-4 completed the runtime call-site migration target:

```text
Session/Edit Reconcile runtime calls
→ physical owners directly

runtime Recovery caller count
→ 0 target

Recovery facade
→ retained intentionally for one later debt-retirement checkpoint
```

v0.66 release FIX01/FIX03 additionally had to prove Session contained no remaining `require('./recovery')` or `recovery.*` calls while preserving the standalone facade.

Therefore Recovery is no longer selected because it merely “looks unused”. Its staged retirement was part of the architecture plan and M2-4 supplied the prerequisite caller migration/equivalence evidence.

Target post-v0.67 shape:

```text
Session
├─ output-compat
├─ bootstrap-migration
├─ output-finalize
├─ edit-reconcile
└─ Store / existing domain services

edit-reconcile
├─ representation
├─ output-compat
├─ bootstrap-migration
└─ output-finalize

recovery physical module
= ABSENT
```

---

## 3. Implementation authorization gate

Design may freeze conditionally now. Runtime implementation may not begin yet.

Required preconditions:

```text
A. POST_06600_ARCH_CONTRACT_DRIFT repaired in a separate non-runtime transaction
+
B. Contracts v2 / architecture config rebased to exact v0.66.0 LIVE_PASS source truth
+
C. exact release-simcore v0.66 source re-audit proves zero runtime Recovery callers
+
D. repository-wide seam audit proves no required external/permanent consumer needs Recovery as a public compatibility API
+
E. no newly promoted FIX/BLOCKER from current deferred investigations requires changing the same v0.66 ownership surface first
→ v0.67 implementation may be authorized
```

Current state:

```text
06700_DESIGN_SELECTED             = YES
06700_DESIGN_CONDITIONALLY_FROZEN = YES
06700_IMPLEMENTATION_AUTHORIZED   = NO
```

The current durable product priority remains `M2_5_POST_06600_TRANSITION_DEBT_REVIEW` until those gates are consumed by normal repository state handling.

---

## 4. Slice A — exact v0.66 Recovery consumer/seam re-audit

Before code movement, re-read exact production source rather than relying only on M2-4 design memory.

Mandatory searches/counts:

```text
production runtime:
- SimCore require('./recovery')
- recovery.* call sites
- recovery export/property references
- dynamic module lookup by literal "recovery"

repository validation/tooling:
- permanent tests expecting Recovery physical presence
- compatibility adapters importing/querying Recovery
- architecture inventory declarations
- builder assertions requiring Recovery facade presence
- diagnostic tooling referring to Recovery as current physical owner
```

Required result for physical deletion:

```text
runtime semantic consumers = 0
runtime facade-only references = 0 outside the module definition itself
repository required external/public consumer = 0
```

A historical test that merely verifies the old transition shape is not a reason to keep production Recovery. Such a test should be updated to verify the new retired shape and preserve historical evidence in docs.

If an actual live consumer exists, stop and re-design. Do not delete the facade by assumption.

---

## 5. Slice B — physical Recovery facade retirement

### 5.1 Remove

The v0.67 runtime builder may remove the exact standalone physical Recovery compatibility module only after Slice A passes.

Conceptually remove:

```text
SimCore.define("recovery", ...)
```

and its pure forwarding aliases.

### 5.2 Preserve physical owners

No corresponding physical-owner implementation may be deleted merely because its Recovery alias disappears.

Preserve as required by current source:

```text
output-compat
bootstrap-migration
output-finalize
edit-reconcile
representation
```

### 5.3 No replacement barrel

Forbidden:

```text
compat
state-recovery
output-services
turn-utils
application-utils
```

if the new module merely recreates the old mixed facade under a different name.

Known owner → direct dependency remains the rule.

---

## 6. Slice C — architecture declaration retirement

In the same M2-5 architecture change set, update living architecture authority to match the new physical graph.

Required consequences after Recovery deletion include the authoritative equivalents of:

```text
Recovery physical requirement removed/retired
Session allowed dependency on Recovery removed if absent in source
Edit Reconcile Recovery dependency absent
M2-5 checkpoint recorded as the retirement stage
M2-4 marked completed/current parent
output-finalize represented as current physical module
Runtime Mirror / Output Compat / Representation post-M2-4 roles represented as current truth
```

### 6.1 Transition-exception rule

M2-5 is allowed to shrink other transition exceptions only when exact current source proves the corresponding edge is gone.

```text
actual edge gone
+ stale exception remains
→ remove stale exception

actual edge remains
→ exception remains
```

Do not force Kernel/community/recurrence/lineage/handoff inversion cleanup merely to make M2-5 appear larger.

### 6.2 Historical docs

Historical architecture/audit documents remain historical evidence. Do not rewrite old evidence to pretend Recovery never existed.

Living Contracts/config/current development pointers should express current truth; historical M0/M1/M2-1 evidence keeps the staged history.

---

## 7. Explicitly excluded from v0.67

Do not mix the following into the Recovery retirement checkpoint:

```text
PARTIAL_PREVIOUS_TURN_REPLAY repair
COMMUNITY platform-family taxonomy/diversity repair
genuine-edit rebuild latency optimization
B_START closure-expression warning tuning
provider-cache engineering
PRE_SIMCORE cache/history mutation work
v0.63.53/.54 compatibility broadening
SILENT_COMPAT normalization
Kernel foundation inversion
State physical module extraction
Request/Turn Pipeline extraction
runtime-topology fingerprint primitive dedupe
broad Session receipt relocation
release-system / repository-system redesign
persistent schema changes
new host/network/timer surfaces
```

If a separately investigated item becomes a real blocker before v0.67 implementation starts, re-evaluate ordering. Otherwise keep it separate.

---

## 8. Remaining Session receipt debt

M2-4 intentionally allowed several migration/diagnostic receipts to remain in Session when a clean destination was not proven:

```text
loadedFromLegacySnapshot
communityAliasRepairStats
templateRecurrenceBootstrapStats
narrativeClockMigrationStats
```

Default v0.67 decision:

```text
DO NOT MOVE
```

Exception:

An exact v0.66 source audit may propose a design amendment only if all are true:

```text
one physical producer is unambiguous
bounded receipt already exists or can be exposed without new semantics
no dependency cycle/upward edge appears
no diagnostic meaning changes
no new state/persistence behavior
independent differential proof is possible
```

Such an amendment must be recorded before implementation. It is not auto-authorized by this design.

---

## 9. Frozen behavior contract

v0.67 must be behavior-equivalent to v0.66 for all runtime paths.

Frozen controls include:

```text
ordinary exact carryover
→ SAME_FAST
→ Edit origin NONE
→ snapshot UNCHANGED

prior OUTPUT_MISMATCH + current exact prior Fresh
→ REPRESENTATION_DRIFT_CORRELATED
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

prior EXACT + genuine visible user edit
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
→ snapshot UPDATED

Deferred Mirror
→ same identity/location/staleness/fingerprint fail-closed gates

Output Compat
→ same candidate families / same acceptance semantics

Bootstrap Migration
→ same cold/history/legacy repair behavior

Output Finalize
→ same deterministic state/content transaction

Store housekeeping
→ same cadence/dedupe/failure isolation
```

Also frozen:

```text
Broadcast lifecycle
Frame / Time / Continuity
Evidence / Lineage / Handoff / Recurrence
Summary Scope
Community taxonomy/Structure judgement
Reaction semantics
Prompt placement / compiler tiers
TAIL_AFTER_CURRENT_USER
History stabilization OBSERVE_ONLY
provider cache UNVERIFIED
raw-body non-retention
persistent Core schema
network/timer/provider routing
```

---

## 10. Builder / runtime-diff contract

The v0.67 builder must start from exact deployed v0.66 production bytes.

Expected runtime mutation envelope should be as close as possible to:

```text
1. version identity 0.66.0 -> 0.67.0
2. exact Recovery facade module block removed
3. only syntactic/module-registration adjacency bytes strictly required by that removal
```

No other runtime behavior change is authorized by default.

The builder should fail closed if:

```text
production parent identity != exact v0.66 production
latest != install
Recovery module boundary is not unique
runtime Recovery consumer count != 0
unexpected runtime byte regions change
version surfaces diverge
```

Preserve exact failed-candidate history through append-only release transactions. Do not rewrite failed builders/specs.

---

## 11. Static / differential acceptance matrix

### 11.1 Identity / artifact

```text
metadata version     = 0.67.0
SIMCORE_RUNTIME_VERSION = 0.67.0
HOST_COMPAT_VERSION  = 0.67.0
latest.js == install.js
node syntax PASS
no persistent schema delta
no new host/network/timer surface
```

### 11.2 Recovery retirement proof

```text
physical Recovery module count = 0
runtime require('./recovery') count = 0
runtime recovery.* call count = 0
runtime recovery export/property residue = 0
no dynamic literal Recovery module lookup
output-compat physical module present
bootstrap-migration physical module present
```

### 11.3 Direct-owner equivalence

Permanent differential fixtures must preserve v0.66 results for:

```text
ordinary prepareOutput
THOUGHTS compatibility
boundary-normalized compatibility
safe-envelope candidate planning/interpretation
fresh history bootstrap
existing snapshot load
legacy clock repair
legacy contamination repair
ordinary Output Finalize paths
manual/genuine-edit compatibility replay
representation fast reconcile
```

### 11.4 Architecture

```text
Contracts/config match exact physical module inventory
dependency checker PASS
no stale required Recovery declaration
no stale Session->Recovery edge
no new upward dependency
only source-proven transition exceptions removed
```

### 11.5 Compatibility tests

Any permanent test that previously asserted “Recovery facade present” must be split conceptually into:

```text
historical evidence
→ old transition shape existed and was equivalent

current v0.67 regression
→ direct owners expose the same required behavior
→ no runtime module requires Recovery
```

Do not weaken semantic fixtures merely to permit module deletion.

---

## 12. Real long-chat acceptance plan

Static equivalence is primary because the removed facade should have zero runtime callers. Real long-chat validation is still mandatory to prove the published artifact boots and ordinary/current physical-owner paths remain healthy.

### Stage A — ordinary warm continuity

At least two natural ordinary requests across useful A/C coverage:

```text
Version 0.67.0
request hook SEEN
binding BOUND
output COMMITTED
stale drops 0
SAME_FAST on eligible carryover
Prior representation EXACT
Edit origin NONE
mirror COMMITTED when exact/safe
Warnings no new M2-5-specific fault
```

### Stage B — bootstrap/reload regression

Because Recovery historically fronted Bootstrap Migration, exercise one ordinary same-tab reload/continuation sequence when operationally safe:

```text
bounded Host-local checkpoint
same-tab refresh
compatible adoption or truthful safe cold/fail-closed result
next same-generation request continues normally
no missing-module / bootstrap initialization failure
```

The exact adoption outcome follows the existing bounded TTL/identity rules; do not fake eligibility.

### Stage C — M2 positive-control sampling

Required static fixtures retain full M2 controls.

During live validation, if an ordinary natural representation mismatch/Fresh carryover or genuine user edit occurs, preserve it as high-value regression evidence. Do not manufacture malformed output solely to exercise rare compatibility families.

A deliberate one-character genuine-edit control may be performed only if the operator chooses to retain the existing M2 checkpoint style; it is useful but not the semantic purpose of Recovery deletion.

### Stage D — domain coverage when naturally available

Natural B/COMMUNITY/THOUGHTS specimens are welcome cross-domain regressions but are not mandatory if absent in a bounded validation window. Existing static fixtures remain authority for rare branches.

---

## 13. Stop conditions

Stop v0.67 advancement and preserve evidence if any of these appear:

```text
any runtime Recovery consumer discovered
external/permanent seam truly requires Recovery semantics
module deletion changes output/state fingerprints outside expected version/module-range delta
bootstrap/load/reload path fails after deletion
Output Compat path changes meaning
Edit Reconcile positive controls regress
new stale/unsafe mirror apply appears
architecture checker requires weakening to pass
persistent schema changes unexpectedly
new host/network/timer surface appears
new quality anomaly plausibly tied to the deleted seam
```

A pre-existing unrelated WATCH remains separate unless new evidence creates actual v0.67 attribution.

---

## 14. Deferred/WATCH attention during v0.67 work

The following must remain visible during implementation/live review even though they are excluded from runtime scope:

```text
PARTIAL_PREVIOUS_TURN_REPLAY
→ HIGH investigation priority; >=3 natural specimens; root cause unproven

COMMUNITY_PLATFORM_FAMILY_DIVERSITY_RECURRENCE
→ active narrow investigation; recurrence proven; owner unresolved

06600_GENUINE_EDIT_REBUILD_LATENCY_40_224S
→ high-severity performance WATCH; next comparable recurrence promotes FIX investigation

B_START_OPEN_SCENE_CLOSURE_EXPRESSION_RECURRENCE
→ WATCH; lifecycle state remained safe

PRE_SIMCORE cache/history movement
→ WATCH; no SimCore first-break evidence; provider cache UNVERIFIED
```

Any recurrence seen during v0.67 validation is recorded immediately and compared against the pre-v0.67 baseline before attributing it.

---

## 15. Workflow

After implementation is formally authorized:

```text
main design/evidence authority
→ dedicated v0.67 runtime work branch
→ exact v0.66 production-source builder
→ Slice A source/seam audit
→ Slice B Recovery deletion
→ Slice C architecture declaration retirement
→ static/differential proof
→ product PR permanent CI
→ normal append-only release transaction
→ release-simcore publication
→ real long-chat validation
→ final main docs / durable state sync
```

`latest.js` and `install.js` remain byte-identical at every candidate/publication boundary.

Do not combine release/repository-system redesign with the runtime checkpoint.

---

## 16. Design verdict

```text
NEXT_PLANNED_VERSION
= 0.67.0

CHECKPOINT
= M2-5

RELEASE
= Recovery Transition Debt Retirement

PRIMARY_RUNTIME_CHANGE
= delete zero-caller Recovery compatibility facade after exact source/seam proof

ARCHITECTURE_CLEANUP
= retire only stale declarations/exceptions backed by absent source edges

FEATURE_SEMANTICS
= NONE

BEHAVIOR_TARGET
= v0.66 EQUIVALENT

IMPLEMENTATION_NOW
= BLOCKED

BLOCKING PRECONDITION
= POST_06600_ARCH_CONTRACT_DRIFT convergence + permanent CI + exact v0.66 source re-audit
```

This is the selected next-version design. It becomes implementation-authorizing only after the preconditions above are durably closed; until then no v0.67 runtime builder, candidate, or `release-simcore` mutation is authorized.
