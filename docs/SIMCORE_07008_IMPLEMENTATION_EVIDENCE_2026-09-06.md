# SimCore v0.70.8 Repeat-Send Representation Rewind Guard — Implementation Evidence

Date: 2026-09-06 KST
Status: **IMPLEMENTED · FIRST QUALIFICATION PASS · FINAL EVIDENCE-INCLUSIVE HEAD REQUALIFICATION REQUIRED**
Classification: **RUNTIME CORRECTNESS REPAIR · REPRESENTATION / EDIT-RECONCILE · #1544 ONLY**

## 1. Authority

Frozen design:

- `docs/SIMCORE_07008_REPEAT_SEND_REPRESENTATION_REWIND_GUARD_DESIGN_2026-09-06.md`
- design merge `c9fcffed8da5936f1abac8d5d641f9f4b16f07a1`

Root-cause evidence:

- `docs/SIMCORE_07008_REPEAT_SEND_REPRESENTATION_REWIND_ROOT_CAUSE_EVIDENCE_2026-09-06.md`
- tracking `#1544`

Implementation authorization:

- `docs/SIMCORE_07008_IMPLEMENTATION_AUTHORIZATION_2026-09-06.md`
- authorization PR `#1575`
- authorization merge `de57b5423f955a46f216a72b17244be0f04d6a77`

Implementation PR:

- `#1576 fix(simcore): implement v0.70.8 repeat-send representation rewind guard`
- branch `impl/simcore-v07008-repeat-send-representation-rewind-guard`
- implementation entry main `de57b5423f955a46f216a72b17244be0f04d6a77`

## 2. Production boundary at implementation qualification

Fresh direct readback at first qualification:

```text
main = de57b5423f955a46f216a72b17244be0f04d6a77
production version = 0.70.7
production release = Output Snapshot Set Cost Attribution
release-simcore = 434df54760bc997b1bcd9223eeaff428aeee66d3
production blob = 6f7cae5b5a8ade66e20beaaf253e365ba035cc18
```

No candidate, approval, or publication has occurred in this implementation transaction.

## 3. Exact implementation scope

The implementation adds exactly one bounded correctness authority adjacent to the existing same-slot Fresh representation fast path.

The existing common Fresh alias evidence is factored without semantic widening:

```text
prior provenance exists
prior representation = OUTPUT_MISMATCH
current match = FRESH_CHAT
prior canonical and Fresh fingerprints exist and differ
visible fingerprint = prior Fresh fingerprint
```

The existing same-slot authority remains:

```text
currentOutputIndex = lastAssistant
current output fingerprint = prior canonical
trusted output fingerprint = prior canonical
```

The new repeat-send rewind authority is conjunctive:

```text
sendIndex exact integer >= 0
lastPreparedSendIndex = sendIndex
currentOutputIndex = sendIndex + 1
lastAssistant = sendIndex - 1
prior provenance outIndex = lastAssistant
location provenance matches current Core location when current location is present
```

Only when common Fresh facts and either the frozen existing same-slot authority or this exact rewind authority are true may Edit Reconcile choose the representation fast path.

Target result:

```text
path = representation-fast-reconciled
snapshot = UNCHANGED
compatibilitySource = fresh-exact-repeat-send-rewind
editOrigin = REPRESENTATION_DRIFT_CORRELATED
manual rebuild delegate = NOT CALLED
```

The already-known request `sendIndex` is passed into Edit Reconcile as bounded ephemeral context. No new Host read or persistent field is introduced.

## 4. Implementation files

Source/test implementation is bounded to:

```text
products/simcore/tooling/build-07008-repeat-send-representation-rewind-guard.py
products/simcore/tests/suites/builder-v07008.test.mjs
products/simcore/tests/fixtures/builder-v07008/basic.json
products/simcore/releases/validation-profiles/0.70.8.json
products/simcore/tests/registry.mjs
```

Implementation anomaly evidence is separately preserved in:

```text
docs/SIMCORE_07008_IMPLEMENTATION_REGRESSION_FAILURE_01_DIAGNOSTIC_MARKER_CARDINALITY_2026-09-06.md
docs/SIMCORE_07008_IMPLEMENTATION_REGRESSION_FAILURE_02_DIRECT_OWNER_RETURN_CONTRACT_2026-09-06.md
```

No R2.11 inventory source, R2.9 identity census, workflow, publisher, release-state schema, or production branch code is changed.

## 5. Validation profile and R2.11 successor behavior

The exact new profile is:

```text
products/simcore/releases/validation-profiles/0.70.8.json
```

Its stable inherited authorities remain aligned with the known-good predecessor:

```text
reload-cache-continuity      -> INHERIT_BEHAVIOR / 0.69.2
operator-release-card        -> CURRENT_IDENTITY_INHERIT_BEHAVIOR / 0.69.2
bounded-telemetry-capsule    -> INHERIT_BEHAVIOR / 0.69.2
host-local-telemetry         -> EXACT_CURRENT_IDENTITY / 0.70.8 / reject 0.70.7
```

The implementation does not add a manual current-version identity row to the R2.9 regression. R2.11 profile-driven inventory is therefore reused as designed.

## 6. Direct-owner executable matrix

`builder-v07008.test.mjs` loads the transformed `edit-reconcile` owner directly and proves behavior through its existing public observable contract: `perfDetail` plus reconcile delegate count.

### Existing same-slot Fresh positive control

Required/observed:

```text
delegate count = 0
path = representation-fast-reconciled
compatibilitySource = fresh-exact-carryover
editOrigin = REPRESENTATION_DRIFT_CORRELATED
```

This proves the predecessor same-slot authority remains intact.

### Target repeat-send rewind positive control

Required/observed:

```text
priorRepresentation = OUTPUT_MISMATCH
currentMatch = FRESH_CHAT
visible = exact prior Fresh
sendIndex = 1
lastPreparedSendIndex = 1
currentOutputIndex = 2
lastAssistant = 0
prior provenance outIndex = 0
location = exact current location
delegate count = 0
path = representation-fast-reconciled
compatibilitySource = fresh-exact-repeat-send-rewind
editOrigin = REPRESENTATION_DRIFT_CORRELATED
```

### Independent fail-closed geometry controls

The regression breaks each bounded rewind requirement independently and requires the new exception not to fire:

```text
lastPreparedSendIndex mismatch -> delegate existing reconcile
currentOutputIndex mismatch    -> delegate existing reconcile
visible lastAssistant mismatch -> delegate existing reconcile
provenance outIndex mismatch   -> delegate existing reconcile
provenance location mismatch   -> delegate existing reconcile
```

Each negative control must omit `fresh-exact-repeat-send-rewind` provenance.

### Genuine edit control

A third representation with prior `EXACT` remains:

```text
delegate existing reconcile = YES
path = manual-edit-rebuilt
editOrigin = USER_EDIT_CANDIDATE
new rewind provenance = ABSENT
```

### Clean reroll / prior EXACT control

An exact prior representation remains outside the new `OUTPUT_MISMATCH` exception:

```text
delegate existing reconcile = YES
path = same-snapshot
editOrigin = NONE
new rewind provenance = ABSENT
```

## 7. Frozen side-effect and schema surface

Builder and permanent regression preserve predecessor counts/ownership for:

```text
module inventory/order
require graph
JSON.stringify(state)
awaited backend set
pluginStorage surface
chat writes
fetch / XMLHttpRequest
setTimeout / setInterval
history.splice / messages.splice
PROMPT_COMPILER_VERSION = 4
COMMUNITY_CLASSIFIER_VERSION = 3
STATE_VERSION = 5
CORE_STATE_VERSION = 10
OUT_STORAGE = outSetMs
```

No new Host read, storage/network operation, timer, retry, polling, raw-body retention, persistent schema, or background worker is introduced.

## 8. Implementation regression Failure 01

First implementation head:

```text
head = 8ac9eb738b409c4827ab6d2eaa24ff61bae1f279
SimCore CI run = 33976428027
Verify job = 101333824142
result = FAIL / PERMANENT_REGRESSION_FAIL
```

Exact failure:

```text
07008_BUILD_BLOCK rewind diagnostic provenance cardinality unexpected
```

Root cause was not runtime behavior. The exact runtime diagnostic literal `fresh-exact-repeat-send-rewind` appeared once in executable code and once in release-note prose, making the builder's exact-cardinality guard observe two textual occurrences.

Disposition:

```text
FIX / BLOCKER / IMPLEMENTATION BUILDER MARKER CARDINALITY / NON_RUNTIME / PRODUCTION UNCHANGED
```

Repair:

- preserve exact runtime marker cardinality assertion;
- reword release-note prose only;
- do not weaken guard semantics.

Failure evidence:

- `docs/SIMCORE_07008_IMPLEMENTATION_REGRESSION_FAILURE_01_DIAGNOSTIC_MARKER_CARDINALITY_2026-09-06.md`

## 9. Implementation regression Failure 02

Second implementation head:

```text
head = c0820fa14cfc3ebdda23fb193941d777a166ba62
SimCore CI run = 33976569017
Verify job = 101334201274
result = FAIL / PERMANENT_REGRESSION_FAIL
```

Exact failure:

```text
Cannot read properties of undefined (reading 'changed')
```

Direct source inspection proved `edit-reconcile.reconcileVisiblePreviousAssistant()` does not return its internal reconcile result object. The regression had incorrectly treated its public return as that internal object.

Disposition:

```text
FIX / BLOCKER / IMPLEMENTATION REGRESSION HARNESS CONTRACT / NON_RUNTIME / PRODUCTION UNCHANGED
```

Repair:

- preserve runtime owner contract unchanged;
- do not add a test-only runtime return;
- assert through existing public observables `perfDetail` and delegate count.

Failure evidence:

- `docs/SIMCORE_07008_IMPLEMENTATION_REGRESSION_FAILURE_02_DIRECT_OWNER_RETURN_CONTRACT_2026-09-06.md`

## 10. First complete qualification

After both bounded repairs:

```text
qualified head = 7bb7d8cd20b168e59a45388f200738224ddfe154
SimCore CI run = 33976715873
Verify job = 101334591872 / SUCCESS
Required job = 101334688844 / SUCCESS
overall workflow = SUCCESS
```

The proposed permanent verifier completed successfully under the trusted self-change lane and the final bounded conclusion was enforced successfully.

This proves the implementation source, direct-owner regression matrix, validation profile, R2.11 inventory integration, builder/fixture closure, static contracts, and protected side-effect parity together on one exact head.

## 11. Final-head requirement

This evidence document advances the PR head beyond `7bb7d8cd20b168e59a45388f200738224ddfe154`.

Therefore merge remains blocked until the new exact evidence-inclusive head independently receives:

```text
Verify = SUCCESS
Required = SUCCESS
```

Only that final qualified head may merge.

## 12. Current disposition

```text
V07008 IMPLEMENTATION = COMPLETE ON BRANCH
TARGET #1544 DIRECT-OWNER REGRESSION = PASS
FAILURE_01 = CLOSED ON QUALIFIED HEAD
FAILURE_02 = CLOSED ON QUALIFIED HEAD
FIRST STATIC/PERMANENT QUALIFICATION = PASS
FINAL EVIDENCE-INCLUSIVE QUALIFICATION = PENDING
R2_11 SOURCE MUTATION = NONE
release-simcore MUTATION = NONE
PRODUCTION = v0.70.7 UNCHANGED
MERGE = BLOCKED UNTIL FINAL HEAD PASS
```
