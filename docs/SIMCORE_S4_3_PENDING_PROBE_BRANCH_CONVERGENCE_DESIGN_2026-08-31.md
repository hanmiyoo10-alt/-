# SimCore S4-3 Pending-Probe Branch Convergence Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · IMPLEMENTATION AFTER MAIN MERGE ONLY**
Classification: **POST-M2 SIMPLIFICATION / S4 / OUTER RUNTIME SHELL / POST-ONSEND BOOKKEEPING BRANCH CONVERGENCE**

## Authority

- `docs/SIMCORE_POST_M2_SIMPLIFICATION_EXECUTION_ARCHITECTURE_2026-08-31.md`
- `docs/SIMCORE_S3_DIAGNOSTICS_TELEMETRY_BOOKKEEPING_CLOSURE_2026-08-31.md`
- `docs/SIMCORE_S4_2_OUTPUT_FALLBACK_INDEX_PASSTHROUGH_CLOSURE_2026-08-31.md`
- current cumulative internal checkpoint = P10
- S4-2 closure main merge = `74c1193cd6cc1fd96b3189bfbf966395a6e731ba`

Production remains unchanged:

```text
version = 0.70.1
release-simcore commit = 861100f4771967aa5b8ab8811d06f11702c0d3ff
latest/install blob = 8f332cfceed316d35954e353c2eaca38c2f34d95
provider cache = UNVERIFIED
```

No release-simcore publication is authorized before S7 convergence. v0.70.2 Cache Observer Cold-Path Attribution remains parked and must not be repurposed.

## Source-grounded problem statement

Inside active post-onSend bookkeeping, the outer runtime shell establishes one stable local:

```js
const pendingProbe = result.state.pending || null;
```

After the separate Narrative pending-probe condition, three consecutive diagnostic projections independently repeat the same branch predicate:

```text
Template recurrence probe:
  if (pendingProbe) { build probe } else { clear probe }

Request lineage probe:
  if (pendingProbe) { build probe } else { clear probe }

Community source handoff probe:
  if (pendingProbe) { build probe } else { clear probe }
```

Source scan confirms:

```text
shared predicate local = pendingProbe
consecutive repeated binary branches = 3
true-path statement order = Template -> Lineage -> Community handoff
false-path clear order = Template -> Lineage -> Community handoff
async/await inside these three branches = 0
storage/chat/network/timer I/O inside these three branches = 0
semantic owner movement = NONE
```

The repeated predicate does not carry independent policy. It only gates three adjacent projections derived from the same already-resolved pending state.

## Important boundary: Narrative probe remains separate

Immediately before the three repeated binary branches, Narrative bookkeeping uses a different condition:

```js
if (pendingProbe && !/^B_/.test(String(pendingProbe.mode || ''))) {
  ...
}
```

This condition is not equivalent to `if (pendingProbe)` and has no symmetric clear branch in the current shape.

S4-3 MUST NOT merge, rewrite or clear Narrative bookkeeping.

## Proposed mechanical delta

Converge only the three identical adjacent `if (pendingProbe) ... else ...` shells into one branch while preserving every body statement byte-for-byte except indentation/bracing required by the convergence.

Before, structurally:

```js
if (pendingProbe) {
  // Template recurrence projection
} else {
  lastTemplateRecurrenceProbe = null;
}
if (pendingProbe) {
  // Request lineage projection
} else {
  lastRequestLineageProbe = null;
}
if (pendingProbe) {
  // Community source handoff projection
} else {
  lastCommunitySourceHandoffProbe = null;
}
```

After:

```js
if (pendingProbe) {
  // Template recurrence projection
  // Request lineage projection
  // Community source handoff projection
} else {
  lastTemplateRecurrenceProbe = null;
  lastRequestLineageProbe = null;
  lastCommunitySourceHandoffProbe = null;
}
```

No probe object field, default, normalization, timestamp expression, or assignment order changes.

## Why this is S4 rather than reopening S3

S3 is closed. Its residual review explicitly classified remaining generic telemetry packaging and Host-local result packaging as KEEP/DEFER_LOW_VALUE.

This mini does not reopen those S3 owners or create a new telemetry helper. The target is the outer runtime shell's post-onSend sequencing itself, which S4 authority explicitly names as in scope:

```text
post-onSend bookkeeping
one-shot branches that can be mechanically localized
same shell / fewer moving pieces
```

No reusable abstraction is introduced.

## Ownership before / after

```text
owner before = outer runtime shell post-onSend bookkeeping
owner after = outer runtime shell post-onSend bookkeeping
new helper = none
new module = none
new export = none
new require = none
```

This is branch-shell convergence only.

## Exact ordering invariants

True path must remain:

```text
1. assign lastTemplateRecurrenceProbe
   - Date.now() remains inside this object at the same relative statement position
2. derive `const l = result.state.requestLineage || {}`
3. assign lastRequestLineageProbe
   - Date.now() remains inside this object at the same relative statement position
4. assign lastCommunitySourceHandoffProbe
   - Date.now() remains inside this object at the same relative statement position
```

False path must remain:

```text
1. lastTemplateRecurrenceProbe = null
2. lastRequestLineageProbe = null
3. lastCommunitySourceHandoffProbe = null
```

There are no awaits between these statements before or after.

## Explicit KEEP decisions from this scan

### currentIndices -> guard -> getChat -> guard helper

Disposition remains:

```text
KEEP_FOR_NOW
```

Reason remains unchanged from S4-2:

```text
would hide awaits
would move perf attribution into another abstraction
would increase sequencing indirection
```

### requestHookAt / outputHookAt one-use timestamp locals

Disposition:

```text
KEEP
```

Reason:

```text
Date.now() sampling position is observability semantics
inlining can move or conditionally suppress the clock sample
line-count reduction is not sufficient proof
```

### repeated chat?.message snapshots

Examples include bootstrap history, alias migration, onSend, history stabilization and evidence inspection.

Disposition:

```text
KEEP
```

Reason:

```text
reads are separated by awaits and mutation-capable operations
coalescing them would widen snapshot lifetime
could change which chat state each operation observes
```

These candidates are not part of S4-3.

## Side-effect / async invariants

Require exact preservation of:

```text
await count/order = unchanged
host calls = unchanged
session calls = unchanged
storage/chat/network/timer calls = unchanged
Date.now() call count/order on pendingProbe=true = unchanged
Date.now() call count/order on pendingProbe=false = unchanged for these three projections (zero)
probe assignment order = unchanged
probe field values/defaults = unchanged
persistent state/schema = unchanged
prompt/Community semantics = unchanged
provider-cache posture = unchanged
```

## Cumulative checkpoint

Implementation becomes P11:

```text
P0  = exact production v0.70.1
P1  = S1-1
P2  = S2-1
P3  = S2-2
P4  = S2-3
P5  = S3-1
P6  = S3-2
P7  = S3-3
P8  = S3-4
P9  = S4-1 runtime current guard convergence
P10 = S4-2 output fallback-index pass-through retirement
P11 = S4-3 pending-probe branch convergence
```

P11 must build from and verify exact P10 before applying only this branch-shell delta.

## Static / differential proof contract

The P11 builder must fail closed unless:

```text
P0->P10 predecessor verification passes
P10->P11 expected reconstruction equals candidate byte-for-byte
module inventory unchanged
require surface unchanged
public exports unchanged
side-effect/protected marker counts unchanged
three old repeated pendingProbe binary branch shells exist at exact expected shapes in P10
one converged pendingProbe branch exists at exact expected shape in P11
Narrative pending condition remains unchanged
Template probe object body remains byte-equivalent
Lineage probe object body remains byte-equivalent
Community handoff probe object body remains byte-equivalent
true-path assignment order unchanged
false-path clear order unchanged
Date.now() expressions/counts in these bodies unchanged
no new await
latest.js == install.js
node --check passes
```

## Differential harness

Use a bounded pure harness with two cases:

```text
pendingProbe = null
pendingProbe = representative plain pending object
```

Instrument ordered assignment events and timestamp-call events.

Require old and new shapes to produce identical:

```text
assignment event sequence
clear event sequence
three projection values for representative fields
timestamp call count and relative order
```

No Proxy/getter behavior is introduced or relied upon.

## Live / release posture

```text
release-simcore mutation = forbidden before S7
real-long-chat broad regression = S7 convergence gate
v0.70.2 cache attribution = parked / preserved
provider cache = UNVERIFIED
```

If P11 qualification exposes an actual runtime anomaly, preserve it immediately as WATCH / DEFER / FIX / BLOCKER before continuing.

## Rollback / hard stop

Stop and classify BLOCK if the transformation requires any of:

```text
Narrative probe behavior change
probe field/default change
Date.now() relocation inside a probe object
assignment order change
new helper/extraction
new await or I/O
persistent-state change
prompt/Community semantic change
provider-cache inference
release-system change
```

## Disposition

```text
S4_3 = DESIGN FROZEN
TYPE = SIMPLIFY / ADJACENT IDENTICAL BRANCH CONVERGENCE
RISK = LOW-MEDIUM WITHIN S4
PARENT = P10 INTERNAL CHECKPOINT
NEXT = merge design authority to main -> implement cumulative self-contained P11 on separate work branch
```
