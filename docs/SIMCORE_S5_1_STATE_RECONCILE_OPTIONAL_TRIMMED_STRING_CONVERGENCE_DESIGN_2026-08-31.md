# SimCore S5-1 State Reconcile Optional Trimmed-String Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN FOR REVIEW · SOURCE-GROUNDED MECHANICAL MINI · NO PUBLICATION BEFORE S7**
Classification: **POST-M2 SIMPLIFICATION / S5 / STATE RECONCILE LOCAL NORMALIZATION DEDUPE**

## Authority

- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S4_OUTER_RUNTIME_SHELL_CLOSURE_2026-08-31.md`
- production authority = `release-simcore` v0.70.1
- source inspected = `plugins/simcore/latest.js` at release commit `861100f4771967aa5b8ab8811d06f11702c0d3ff`

Current production identity remains:

```text
version = 0.70.1
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
latest/install blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
provider cache = UNVERIFIED
```

S5 does not reopen M2-6 ownership. State Reconcile remains the Domain integration owner for portable-state assembly/reconciliation; Session remains the per-chat application holder/orchestrator.

## Source review

Exact current owner:

```text
SimCore.define("state-reconcile", ...)
```

`reconcileState(raw)` contains three identical optional trimmed-string normalization expressions:

```js
s.broadcastAirtime = typeof s.broadcastAirtime === 'string' && s.broadcastAirtime.trim() ? s.broadcastAirtime.trim() : null;
s.broadcastAirtimeStart = typeof s.broadcastAirtimeStart === 'string' && s.broadcastAirtimeStart.trim() ? s.broadcastAirtimeStart.trim() : null;
...
s.narrativeTimestamp = typeof s.narrativeTimestamp === 'string' && s.narrativeTimestamp.trim() ? s.narrativeTimestamp.trim() : null;
```

These expressions have the same:

```text
input domain = any JS value
accepted type = primitive string only
normalization = String.prototype.trim
empty/whitespace-only disposition = null
non-string disposition = null
output = trimmed primitive string or null
```

They are local portable-state normalization policy already owned by State Reconcile.

## Candidate selection

Selected S5-1 transformation:

```text
DEDUPE three exact optional trimmed-string expressions
→ one private State Reconcile helper
```

Proposed helper:

```js
function optionalTrimmedString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
```

Proposed uses:

```js
s.broadcastAirtime = optionalTrimmedString(s.broadcastAirtime);
s.broadcastAirtimeStart = optionalTrimmedString(s.broadcastAirtimeStart);
s.narrativeTimestamp = optionalTrimmedString(s.narrativeTimestamp);
```

The helper deliberately retains the current condition-plus-return expression rather than caching the trimmed result. Therefore an accepted non-empty string still evaluates `.trim()` twice, exactly as the current expression does. This keeps the transformation structural rather than changing the local evaluation-count contract.

## Why this qualifies

S5 authority permits:

```text
duplicate provably-identical local normalization calls
narrow internal helpers
```

This candidate is confined to one existing semantic owner and reduces three copies of one normalization rule to one private rule.

It does not:

```text
move state policy into Session
move State Reconcile back into Kernel
change persistent schema
add a new module/export/require edge
change state field order
change deletion/migration policy
change prompt/Community/Representation/Edit Reconcile behavior
change async/I/O
```

The rule already exists three times; the helper only names that exact rule once.

## Explicit non-candidates from S5 scan

### `const source ...; const s = source;`

Disposition: **DEFER_LOW_VALUE**

Reason:

```text
one local alias only
removing one identifier has negligible reasoning benefit
should not be bundled merely to increase diff size
```

### Session clone + reconcile pairs

Disposition: **KEEP**

Examples include portable-state serialization and persisted-state migration paths.

Reason:

```text
reconcileState mutates its input
clone boundaries preserve raw/pre-normalized evidence or protect current state
removing clone is not a pass-through cleanup
```

### Snapshot / mirror init branches

Disposition: **KEEP**

Reason:

```text
branches encode reload provenance, legacy-version detection, trusted fingerprint eligibility and migration sequencing
similar assignment shapes are not equivalent policy
```

### Community classifier `before` / `{ ...before }` copy

Disposition: **KEEP**

Reason:

```text
`before` is the comparison baseline
state.community.platformMax is mutated during backfill
sharing the same object would corrupt changed-family comparison authority
```

## Exact owner before / after

Before:

```text
State Reconcile owns all three field normalizations directly in reconcileState
```

After:

```text
State Reconcile still owns all three field normalizations
private helper exists only inside the same module
```

Owner movement:

```text
NONE
```

## Callers

No external caller changes.

Internal changed call sites:

```text
reconcileState.broadcastAirtime normalization
reconcileState.broadcastAirtimeStart normalization
reconcileState.narrativeTimestamp normalization
```

No new caller outside `state-reconcile` is authorized.

## Side effects / async / persistence

Before and after:

```text
await/yield = unchanged
storage I/O = unchanged
chat I/O = unchanged
network I/O = unchanged
timer/callback = unchanged
object mutation targets = same three state fields
field assignment order = unchanged
persistent field set = unchanged
STATE_VERSION = 5
CORE_STATE_VERSION = 10
Community classifier = 3
```

## Protected semantic invariants

The implementation must preserve exactly:

```text
non-string -> null
'' -> null
whitespace-only string -> null
leading/trailing whitespace -> trimmed string
internal whitespace -> unchanged
already-trimmed string -> same string value
field assignment order
legacy narrativeYear migration/deletion order
community.globalReactionMax deletion
currentEpisodeSegments / lastCompletedEpisode / exposed deletion
community.recent / community.commenters deletion
recurrence.normalizeRegistry call count/order
lineage.normalizeLineage call count/order
handoff.normalizeRegistry call count/order
normalizePlatformMaxMap call count/order
```

## Static proof contract

A cumulative P12 builder must start from exact production v0.70.1 and reconstruct/verify P0→P11 before applying P11→P12.

P11→P12 must fail closed unless:

```text
state-reconcile module exists exactly once
old three expressions exist exactly once each in P11
private helper does not exist in P11
P12 contains helper exactly once
P12 contains exactly three helper calls plus declaration occurrence
old expressions are absent
expected string replacement equals P12 byte-for-byte
module inventory unchanged
require surface unchanged
all modules except state-reconcile byte-identical P11→P12
state-reconcile export surface unchanged
STATE_VERSION / CORE_STATE_VERSION unchanged
protected migration/deletion markers unchanged
side-effect marker counts unchanged
latest.js == install.js
node --check passes
```

## Differential proof

A bounded Node harness must compare old and helper forms over at least:

```text
undefined
null
false
0
plain object
empty string
spaces/tabs/newlines only
already-trimmed ASCII
leading/trailing ASCII whitespace
Unicode/Korean text with surrounding whitespace
embedded internal spaces/newlines
```

For each value require:

```text
Object.is(old(value), helper(value))
```

A second state-level harness should apply the old/new normalization to the three selected fields in representative state objects and require deep equality and property-order equality.

## Rollback / blocker conditions

Classify BLOCKER and stop if:

```text
helper requires cross-module exposure
any field output differs
state field assignment order changes
persistent schema/version changes
any migration/deletion marker moves or changes
new async/I/O appears
P0→P11 predecessor verification cannot be reproduced
latest/install diverge
```

Any packaging/CI anomaly is preserved before repair as WATCH / DEFER / FIX / BLOCKER.

## Release posture

This mini extends the cumulative internal simplification checkpoint only:

```text
P11 = S4-3
P12 = S5-1 optional trimmed-string convergence
```

No `release-simcore` publication occurs before S7 program convergence under the currently frozen program authority.

Temporary PR-dry identity, if still unused when implementation begins:

```text
intent = simcore-v0.70.3-intent-11
release = simcore-v0.70.3-new-11
purpose = GATE_PR1_DRY only
candidate persistence = forbidden
```

The identity must be rechecked against current main immediately before use.

## Live validation posture

No standalone live release is created for S5-1. S7 cumulative live regression must include State Reconcile/Session sentinels:

```text
fresh state
persisted snapshot reload
mirror reload
reroll/rewind
manual edit positive control
Community state preservation
Narrative/Broadcast clock preservation
portableState equivalence
```

## Current disposition

```text
S5_1_CANDIDATE = SELECTED
CLASS = DEDUPE / LOCAL NORMALIZATION
OWNER BEFORE = STATE RECONCILE
OWNER AFTER = STATE RECONCILE
SEMANTIC CHANGE = NONE INTENDED
SCHEMA CHANGE = NONE
ASYNC/I/O CHANGE = NONE
PUBLICATION = NONE BEFORE S7
NEXT = DESIGN CI -> MAIN -> P12 IMPLEMENTATION
```
