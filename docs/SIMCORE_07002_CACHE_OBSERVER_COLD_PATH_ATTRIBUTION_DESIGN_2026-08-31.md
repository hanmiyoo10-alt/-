# SimCore v0.70.2 Cache Observer Cold-Path Attribution Design

Date: 2026-08-31 KST
Status: **DESIGN FROZEN · CACHE/COST PROGRAM STEP 1 · IMPLEMENTATION NOT YET AUTHORIZED**
Classification: **CACHE/COST OBSERVABILITY MINI · FIRST-REQUEST PROMPT-ACCOUNTING SUBSPAN ATTRIBUTION · NO CACHE SEMANTIC CHANGE**

## 1. Proposed release identity

```text
Version: 0.70.2
Release: Cache Observer Cold-Path Attribution
Parent production: v0.70.1 Cold First-Turn Tail Attribution
Release authority when/if published: release-simcore
Design/evidence authority: main
```

This is the selected next narrow design after v0.70.1 bounded the recurrent cold first-request tail to the exact current `PROMPT_ACCOUNTING` span.

It is also the first selected runtime design under the pre-3M **CACHE / COST PROGRAM**.

The goal is not yet to improve provider cache hits or billed token cost. The goal is to ensure the local cache-observer / telemetry machinery itself has a bounded and attributable cold-path cost before monetary cache work is allowed to trust those measurements.

## 2. Authority / prerequisite boundary

Current v0.70.1 live evidence is acceptance-ready and has a bounded attribution verdict:

```text
FORMAL_STAGE_A = ACCEPTED
FORMAL_STAGE_B = ACCEPTED
FORMAL_STAGE_C = ACCEPTED
ATTRIBUTION    = SIMCORE_NAMED_TAIL
OWNER          = PROMPT_ACCOUNTING
BLOCKER        = NONE OBSERVED
```

However:

```text
HUMAN_LIVE_PASS = NOT YET CREATED
```

Therefore this document freezes **design only**.

Implementation remains blocked until the existing v0.70.1 human-authority transition is explicitly closed and a separate implementation authorization is granted.

Canonical gate:

```text
v0.70.1 explicit HUMAN LIVE_PASS
+ v0.70.2 implementation authorization
= implementation may begin
```

This design must not be interpreted as implicit LIVE_PASS for v0.70.1.

## 3. Why v0.70.2 exists

v0.70.1 proved the following formal matrix:

```text
Fresh #1 · Stage A
PROMPT_ACCOUNTING 372 ms
post-onSend       374 ms
unattributed        0 ms

Warm #1 · Stage B
PROMPT_ACCOUNTING   1 ms
post-onSend         3 ms
unattributed        0 ms

Fresh #2 · Stage C
PROMPT_ACCOUNTING 8.445 s
post-onSend       8.451 s
unattributed        0 ms

Warm #2 · optional same-generation control
PROMPT_ACCOUNTING   0 ms
post-onSend         4 ms
unattributed        0 ms
```

The result is strong enough to identify the broad SimCore owner but not strong enough to authorize a rewrite inside that owner.

The next question is:

```text
Which exact operation inside PROMPT_ACCOUNTING owns the cold-only delay?
```

## 4. Exact deployed-source audit

The deployed v0.70.1 `PROMPT_ACCOUNTING` timing envelope begins immediately before:

```js
const runtimeBudgetText = String(result.promptBlock || '');
```

and ends immediately after:

```js
messages.push({ role: 'system', content: result.promptBlock });
```

The exact source region currently contains these operation families, in order:

```text
A. runtime prompt budget / line accounting
B. optional Evidence inspect-and-fence diagnostics
C. first-generation telemetry adoption gate
D. awaited Host-local telemetry claim
E. telemetry capsule validate/import/continuity bookkeeping
F. runtime prompt-cache observer
G. runtime prompt message append
```

The current first-generation-only source shape includes:

```js
if (!telemetryAdoptionAttempted) {
  telemetryAdoptionAttempted = true;
  const hostLocalClaim = await runtimeTelemetryRules.claimHostLocalOnce(...);
  const adoption = runtimeTelemetryRules.validate(...);
  ... importHandoffState(...)
}
```

The same broad `PROMPT_ACCOUNTING` region also performs the normal:

```js
lastRuntimePromptCacheProbe = runtimePromptCache.observe(...);
messages.push({ role: 'system', content: result.promptBlock });
```

Important inference boundary:

```text
source contains a first-generation-only await
+ fresh/warm timing collapses
!= proof that the await is the dominant cost
```

The correlation is strong enough to justify exact subspan measurement, not strong enough to justify moving/removing the telemetry claim yet.

## 5. Relationship to the cache/cost program

The pre-3M roadmap requires cache/cost work to close before the 3M major program begins.

The cache program explicitly requires:

```text
cache diagnostics/topology work remains bounded
and does not become the latency hotspot
```

v0.70.1 has now shown that the broad prompt-accounting/cache-observer region can become a multi-second cold hotspot.

Therefore cache program step 1 is:

```text
make the observer's own first-request cost exactly attributable
before changing request-prefix semantics
```

This release does not claim:

```text
provider prompt cache hit/miss
billed cached tokens
lower input price
improved cache reuse
```

Provider cache remains `UNVERIFIED`.

## 6. Design goal

Split the existing authoritative `PROMPT_ACCOUNTING` total into bounded exact subspans while keeping the existing v0.70.1 total authoritative.

Proposed subspans:

```text
PROMPT_BUDGET_SCAN
EVIDENCE_FENCE
TELEMETRY_HOST_LOCAL_CLAIM
TELEMETRY_RESTORE_IMPORT
RUNTIME_CACHE_OBSERVE
MESSAGE_APPEND
PROMPT_ACCOUNTING_UNATTRIBUTED
```

The intended diagnostic model is:

```text
PROMPT_ACCOUNTING total
=
  PROMPT_BUDGET_SCAN
+ EVIDENCE_FENCE
+ TELEMETRY_HOST_LOCAL_CLAIM
+ TELEMETRY_RESTORE_IMPORT
+ RUNTIME_CACHE_OBSERVE
+ MESSAGE_APPEND
+ bounded unattributed remainder
```

No segment may be invented from wall-clock gaps outside its exact source enclosure.

## 7. Proposed exact span boundaries

### 7.1 `PROMPT_BUDGET_SCAN`

Own only the pure local prompt-budget accounting before Evidence / telemetry adoption:

```text
String(result.promptBlock)
split into lines
reaction line lookup
mode extraction
lastRuntimePromptBudget object construction
line filter / some checks
Date.now metadata stamp
```

This span must not include Evidence, Host-local I/O, cache observe, or message append.

### 7.2 `EVIDENCE_FENCE`

Own only:

```js
lastRuntimePromptBudget.sourceAnchor
  ? evidenceRules.inspectAndFence(...)
  : null
```

Record zero or near-zero cost when ineligible; do not force Evidence work merely for measurement.

### 7.3 `TELEMETRY_HOST_LOCAL_CLAIM`

Own only the exact awaited call:

```js
await runtimeTelemetryRules.claimHostLocalOnce(...)
```

When `telemetryAdoptionAttempted` is already true, the segment should report an explicit not-exercised/zero disposition rather than pretending a Host claim occurred.

This span measures the whole existing claim contract only. v0.70.2 does **not** yet split Host store acquisition vs item read vs consume/clear unless implementation audit proves that can be added without expanding the release beyond the frozen minimal envelope.

### 7.4 `TELEMETRY_RESTORE_IMPORT`

Own only the local work after the claim returns:

```text
runtimeTelemetryRules.validate(...)
runtimePromptCache.importHandoffState(...)
requestTopology.importHandoffState(...)
cacheCandidates.importState(...)
lastTelemetryContinuityProbe construction
pendingTelemetryHandoff = null
```

No Host I/O belongs to this segment.

### 7.5 `RUNTIME_CACHE_OBSERVE`

Own only:

```js
runtimePromptCache.observe(...)
```

This identifies the normal local runtime-prefix observer cost independently from one-shot telemetry restoration.

### 7.6 `MESSAGE_APPEND`

Own only:

```js
messages.push({ role: 'system', content: result.promptBlock });
```

This segment is expected to be tiny but is kept explicit so the accounting envelope closes without silently assigning append cost elsewhere.

## 8. Accounting contract

The existing v0.70.1 field remains authoritative:

```text
postOnSendPromptAccountingMs
```

v0.70.2 adds a nested bounded accounting result whose sum must close within the same conservative rounding tolerance.

Proposed rules:

```text
all exact subspans finite + non-negative
and named sum <= PROMPT_ACCOUNTING + tolerance
→ confidence BOUNDED

missing checkpoint
negative span
named sum > total + tolerance
→ confidence UNRESOLVED
→ request behavior unaffected
```

The implementation must fail open for diagnostics and fail closed for attribution claims.

No timing failure may throw through the request path.

## 9. Proposed diagnostic line

Add one bounded line directly adjacent to the existing v0.70.1 post-onSend attribution line:

```text
Prompt-accounting attribution:
budget <ms> · evidence <ms> · telemetry-claim <ms|n/a> · restore <ms|n/a> · cache-observe <ms> · append <ms> · unattributed <ms> · confidence <BOUNDED|UNRESOLVED>
```

Optional concise disposition field:

```text
telemetry-claim exercised FIRST_REQUEST | SKIPPED_ALREADY_ATTEMPTED | UNAVAILABLE
```

Do not add raw prompt text, raw telemetry capsule contents, storage values, or exception messages.

## 10. Frozen semantics

v0.70.2 is observability only.

The following remain byte/behavior frozen:

```text
Prompt compiler output bytes
PROMPT_COMPILER_VERSION 4
runtime prompt ordering
TAIL_AFTER_CURRENT_USER placement
messages.push ordering
Current Task Primacy Guard
Community classifier / Reaction / Structure
Evidence fence behavior
telemetryAdoptionAttempted semantics
claimHostLocalOnce call count and order
MEMORY -> SESSION -> HOST_LOCAL priority
Host-local one-shot mailbox semantics
capsule schema / TTL / size / location rules
runtimePromptCache.observe behavior
requestTopology / cacheCandidates behavior
Deferred Mirror
Representation / Edit Reconcile
persistent state schemas
provider cache UNVERIFIED policy
```

No new:

```text
await
yield
timer
polling
network call
storage key
chat write
history mutation
provider request
```

is authorized.

The existing awaited Host-local claim remains exactly where it is for v0.70.2. This release measures it; it does not move it.

## 11. Module / implementation boundary

Preferred minimal implementation surface:

```text
OPS
  existing pure timing helpers reused
  optional pure nested-attribution helper only if needed

outer request shell
  exact monotonic checkpoints around the frozen operations
  bounded request-scoped perf fields
  one diagnostic line
```

Preferred frozen modules:

```text
prompt
community
runtime-session
runtime-telemetry semantics
store
lifecycle
representation
edit-reconcile
output-finalize
runtime-mirror
state-reconcile
```

If exact implementation requires changing `runtime-telemetry` semantics rather than merely observing the outer awaited call, stop and revise the design instead of silently broadening scope.

## 12. Static validation contract

Implementation CI must prove at minimum:

```text
latest.js == install.js
metadata/runtime/host version == 0.70.2
parent source identity == exact v0.70.1 production blob
syntax PASS
Contracts v2 PASS
PROMPT_COMPILER_VERSION 4 unchanged
prompt module byte-identical
telemetry handoff semantic markers unchanged
Current Task markers unchanged
Community classifier unchanged
persistent schema versions unchanged
```

Protected side-effect counts must remain candidate-equal to v0.70.1 for:

```text
await
setTimeout
setInterval
pluginStorage
getLocalPluginStorage
setChat
fetch
XMLHttpRequest
history.splice
messages.splice
```

The existing `messages.push({ role: 'system', content: result.promptBlock })` occurrence/order must remain unchanged.

## 13. Attribution fixture contract

Pure fixture tests should cover:

```text
valid total with all subspans -> BOUNDED exact remainder
first-request telemetry claim present -> included once
warm telemetry claim skipped -> explicit skipped/zero disposition
missing checkpoint -> UNRESOLVED
negative checkpoint -> UNRESOLVED
named sum exceeds total -> UNRESOLVED
zero-duration local spans remain valid
```

Instrumentation failure must not affect request correctness.

## 14. Real long-chat validation protocol

After publication, use the same conservative fresh/warm pattern proven by v0.70.1.

### Stage A — fresh runtime #1

Create a true fresh runtime generation and send one ordinary long-chat request.

Capture:

```text
runtime boot + generation
Session load / first-request path
PROMPT_ACCOUNTING total
new subspan attribution line
Host-local transport disposition
warnings / compatibility
binding / continuity / frame
```

Prefer a refresh after a normal committed output so a legitimate Host-local telemetry mailbox exists naturally. Do not manufacture storage state.

### Stage B — same-generation warm

Without refresh, send the next ordinary request.

Required comparison:

```text
same generation
telemetryAdoptionAttempted path naturally skipped
same correctness invariants PASS
new subspan attribution present
```

### Stage C — independent fresh runtime #2

Create a second new generation and repeat one ordinary request.

A second same-generation warm sample is optional but useful.

## 15. Terminal sub-owner verdicts

### `TELEMETRY_CLAIM_DOMINANT`

Use only when both independent fresh samples show the dominant `PROMPT_ACCOUNTING` cost enclosed by `TELEMETRY_HOST_LOCAL_CLAIM`, and the same span disappears/collapses on warm control.

Result:

```text
next optimization design MAY target the one-shot telemetry claim critical-path relationship
```

This verdict still does not prove whether the expensive time is Host store acquisition, Host read, consume/clear, or another operation inside the existing claim function.

### `LOCAL_PROMPT_ACCOUNTING_DOMINANT`

Use when a repeatable non-Host local subspan dominates, such as:

```text
PROMPT_BUDGET_SCAN
EVIDENCE_FENCE
TELEMETRY_RESTORE_IMPORT
RUNTIME_CACHE_OBSERVE
MESSAGE_APPEND
```

Result:

```text
next optimization design MAY target that exact local owner
```

### `MIXED_OR_UNRESOLVED`

Use when fresh samples disagree, accounting cannot close, or multiple segments contribute without one repeatable dominant owner.

Result:

```text
WATCH / further attribution
no speculative optimization
```

## 16. Why not optimize the Host-local claim immediately

The source shape makes it an obvious suspect:

```text
first-generation gate
+ exact await
+ fresh/warm collapse
```

But SimCore deliberately preserves cross-reload cache-observer continuity through the Host-local one-shot mailbox.

Moving, skipping, racing, or deferring the claim could change:

```text
first-post-refresh runtime-prefix baseline
request-topology restoration
cache trajectory restoration
consume-before-adopt semantics
mailbox replay behavior
```

Those are previously validated contracts.

Therefore:

```text
v0.70.2 = measure exact sub-owner
not = remove/move/parallelize claim
```

## 17. Relationship to monetary cache work

After v0.70.2 closes the observer critical-path owner, the cache program proceeds to the monetary/prefix question:

```text
Where is the earliest avoidable request-prefix break,
and who owns it?
```

Current live evidence repeatedly reports examples such as:

```text
Cache break: PRE_SIMCORE · CHAT_HISTORY
SimCore contribution: NOT_FIRST_BREAK
provider cache: UNVERIFIED
```

Those observations remain separate from v0.70.2.

The next cache release after v0.70.2 should be selected from fresh evidence:

```text
if telemetry observer cost is SimCore-optimizable
→ bounded observer/claim optimization first

if observer cost is external / not actionable
→ record terminal boundary
→ move directly to PRE_SIMCORE / CHAT_HISTORY first-break ownership
```

No prefix rewrite is authorized by this design.

## 18. Separate WATCH lanes

Keep these separate:

```text
WATCH · REPEATED_OUT_STORAGE_LATENCY
provider cache UNVERIFIED
PRE_SIMCORE / CHAT_HISTORY prefix break investigation
Community/HunterNet-like idea parking
3M major candidate selection
```

Do not fold output storage, Community quality, 3M feature work, or release-system work into v0.70.2.

## 19. Release / repository boundary

This design document changes only main documentation authority.

It does not change:

```text
release-simcore
latest.js
install.js
production runtime
persistent schema
deployment state
R2.x release system
provider/cache behavior
```

When implementation is later authorized, follow the normal SimCore workflow:

```text
main design/evidence
→ dedicated working branch implementation
→ exact static/permanent CI
→ merge implementation evidence to main
→ release-simcore publication
→ real long-chat A/B/C validation
→ explicit human LIVE_PASS
→ terminal convergence / main sync
```

## 20. Frozen disposition

```text
NEXT_VERSION_DESIGN = v0.70.2 Cache Observer Cold-Path Attribution
PROGRAM = PRE-3M CACHE / COST
ROLE = OBSERVABILITY / SUB-OWNER ATTRIBUTION

V07001_ATTRIBUTION = SIMCORE_NAMED_TAIL
V07001_OWNER = PROMPT_ACCOUNTING
V07001_HUMAN_LIVE_PASS = PENDING EXPLICIT HUMAN AUTHORITY

V07002_PRIMARY_QUESTION = WHICH EXACT PROMPT_ACCOUNTING SUBSPAN OWNS COLD COST?
V07002_PROVIDER_CACHE_CLAIM = NONE
V07002_SPEED_CLAIM = NONE
V07002_PREFIX_SEMANTIC_CHANGE = NONE
V07002_IMPLEMENTATION_AUTHORITY = NOT GRANTED

EXPECTED_NEXT_DECISION =
  TELEMETRY_CLAIM_DOMINANT
  OR LOCAL_PROMPT_ACCOUNTING_DOMINANT
  OR MIXED_OR_UNRESOLVED
```
