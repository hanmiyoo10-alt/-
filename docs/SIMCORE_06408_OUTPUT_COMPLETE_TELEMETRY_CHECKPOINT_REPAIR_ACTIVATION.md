# SimCore v0.64.8 — Output-Complete Telemetry Checkpoint Repair Activation

Date: 2026-08-27
Status: **DESIGN ACTIVATED · CONFIRMED-BLOCKING REPAIR · IMPLEMENTATION NOT STARTED**
Parent production: `v0.64.7 — Cross-Reload Cache Observer Continuity`
Parent release commit: `a7ce8ce33a97797630f885c6753415e4b2ccc7fc`
Parent release blob: `676b7e2ca3d55a6676b7a5d3bfaf95be5ee6e9b0`
Major milestone/checkpoint: `2.0M / M2-2` unchanged
Required live scenario after release: `06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT`

## 1. Activation decision

The v0.64.7 real-long-chat gate is closed as `FAIL / CONFIRMED_BLOCKING`.

Natural same-tab refresh evidence established:

```text
pre-refresh generation  mtbgdju1-fwtefm
→ same-tab page refresh
→ post-refresh generation mtbjm1kl-1lbkiq

first post-refresh request
Telemetry continuity: FRESH · no-compatible-handoff
Cache topology / identity / trajectory: BASELINE

second post-refresh request
Telemetry continuity: FRESH · no-compatible-handoff
Cache trajectory: OBSERVING · distinct 2 · attempts 2
```

Source review then established the narrow implementation omission:

```text
frozen v0.64.7 design
= OUTPUT-COMPLETE CHECKPOINT + ONUNLOAD LAST-CHANCE CHECKPOINT

released v0.64.7
= ONUNLOAD PUBLISH ONLY

confirmed defect
= OUTPUT_CHECKPOINT_CALLSITE_OMITTED
```

Therefore the next runtime release is activated as:

```text
Version: 0.64.8
Name: Output-Complete Telemetry Checkpoint Repair
Class: narrow correctness/observability repair mini
Axis: runtime-telemetry transport + outer output-complete checkpoint callsite + diagnostic surface
Parent: immutable v0.64.7
M2-3: FROZEN
```

`0.64.8` has no competing runtime-release reservation in current repository authority.

---

## 2. Repair objective

The repair must guarantee that a compatible same-tab session sidecar exists **before** a browser refresh has to rely on unload behavior.

Required sequence:

```text
natural active request
→ request observers record current request
→ generation completes
→ SimCore output processing finalizes normally
→ authoritative `out` snapshot saves successfully
→ live Core session/current fingerprints advance
→ bounded telemetry checkpoint is written
→ output remains COMMITTED regardless of checkpoint success/failure
```

`Risuai.onUnload(...)` remains a second, last-chance refresh of the same bounded capsule. It is redundancy, not the only durability edge.

The repair does not attempt to prove or control provider prompt-cache retention.

---

## 3. Exact checkpoint anchor

Current v0.64.7 sequencing already gives a clean commit boundary.

Inside `CoreRulesetSession.processOutput(...)`:

```text
finalizePreparedOutput(...)
→ await store.save('out', outIndex, result.state, ...)
→ this.current = result.state
→ currentOutputIndex / trusted fingerprints updated
→ return active result
```

The outer output handler then performs:

```text
result = committed session output result
→ if !result.active: BYPASSED / return
→ mark outputStatus COMMITTED
→ diagnostics / deferred mirror scheduling
```

The v0.64.8 checkpoint belongs at the outer boundary **after a successful active authoritative output commit has returned and before/with the outer COMMITTED bookkeeping**.

Eligibility contract:

```text
runtime generation still current
AND result.active == true
AND authoritative out save completed successfully
AND location key is known
→ OUTPUT_COMMIT telemetry checkpoint eligible
```

Forbidden checkpoint cases:

```text
inactive / handshake-bypassed output
stale-runtime drop
superseded output
failed authoritative out persistence
missing location key
pre-generation/request path
```

This avoids overwriting the last valid sidecar with an inactive or uncommitted observation.

---

## 4. Capsule ownership and transport

Keep the existing `runtime-telemetry` capsule schema and tracker exports unchanged.

Capsule remains:

```text
schema 1
sourceVersion
locationKey
capturedAt
runtimePromptCache exportState()
requestTopology exportState()
cacheCandidates exportState()
```

Transport remains:

```text
Tier 1: globalThis memory
Tier 2: same-tab window.sessionStorage
SESSION_KEY: __SIMCORE_TELEMETRY_HANDOFF_SESSION_V1__
MAX_SESSION_CHARS: 16384
MAX_AGE_MS: 10 minutes
```

The implementation may reuse the current memory+session `publish(...)` helper or introduce a narrowly named checkpoint wrapper, but there must be one canonical capsule-capture path shared by OUTPUT_COMMIT and UNLOAD. Do not fork two slightly different telemetry schemas.

Priority on next runtime boot remains:

```text
valid memory capsule first
→ valid session capsule fallback
→ FRESH if neither valid
```

Claim remains single-consumption.

---

## 5. Failure isolation

The checkpoint is best-effort observer transport and may never downgrade an already committed Core output.

Required failure behavior:

```text
sessionStorage unavailable
security exception
quota failure
JSON failure
oversize > 16384 chars
memory transport failure
→ bounded checkpoint probe records result
→ output remains COMMITTED
→ Core state remains the already committed state
→ no throw enters generation/output control flow
```

If session write fails but memory succeeds, hot/plugin reload may still use memory. A true page refresh may then start FRESH, and diagnostics must report that honestly.

Do not truncate an oversized capsule.

---

## 6. Diagnostic surface

The missing v0.64.7 checkpoint diagnostic is promoted into this repair because the failed live gate proved it is needed to verify the transport edge directly.

Add one bounded Last Turn Diagnostic line for the most recent eligible checkpoint, for example:

```text
Telemetry checkpoint: SESSION · WRITTEN · 1842 chars · 0.4 ms · trigger OUTPUT_COMMIT
```

Fail-closed examples:

```text
Telemetry checkpoint: SESSION · OVERSIZE · 17022 chars · 0.3 ms · trigger OUTPUT_COMMIT
Telemetry checkpoint: SESSION · UNAVAILABLE · 0 chars · 0.0 ms · trigger OUTPUT_COMMIT
Telemetry checkpoint: SESSION · FAILED · 1842 chars · 0.4 ms · trigger OUTPUT_COMMIT
```

The exact bounded status vocabulary may reuse the existing internal write-probe names, but the copied report must expose at least:

```text
session write disposition
serialized char count when known
checkpoint elapsed cost
trigger = OUTPUT_COMMIT or UNLOAD
```

Never include exception messages or raw payload content.

`Telemetry continuity` remains separate and keeps transport/adoption meaning:

```text
Telemetry continuity: ADOPTED · via session ...
Telemetry continuity: FRESH · <reason>
```

A checkpoint `WRITTEN` does not mean a later claim was accepted. An `ADOPTED` continuity result does not prove provider cache reuse.

Provider wording remains exactly:

```text
provider cache UNVERIFIED
```

---

## 7. Performance boundary

The new work is explicitly outside the request→provider critical path.

It occurs only after authoritative output persistence completes.

Measure checkpoint cost independently; do not hide it inside unrelated output storage timing.

Design expectation:

```text
Output process storage
→ existing authoritative cost
Telemetry checkpoint
→ separate bounded browser-local cost
Deferred mirror
→ unchanged
```

No network I/O, pluginStorage write, Core SnapshotStore write, timer loop, or host chat write may be introduced by the checkpoint.

The existing storage-dominated Core timings are a separate non-goal and must not be optimized in this repair.

---

## 8. Privacy / retained-data boundary

The v0.64.7 privacy contract remains frozen:

```text
NO raw user body
NO raw assistant body
NO raw Fresh body
NO raw system prompt
NO raw runtime prompt
NO COMMUNITY/comment text
NO generated output text
NO full chat history
NO Core semantic snapshot
```

Only the existing bounded tracker exports may cross the reload boundary.

The diagnostic must continue to state/derive that raw bodies are not retained.

---

## 9. Frozen semantic owners

No semantic behavior may move as part of v0.64.8.

Frozen:

```text
Core Store schema / keys / retention
Lifecycle / mode / broadcast semantics
Time / Narrative / post-B_END floor
Frame / continuity semantics
Representation / Edit Reconcile
Runtime Mirror / Deferred Mirror ownership
Recovery / Output Compat / Bootstrap Migration
Evidence / Lineage / Handoff / Recurrence
Summary Scope
Structure / Community / Reaction
Prompt semantics / placement / compiler tiers
request-history mutation behavior
provider cache policy/claim
M2-3 Edit Reconcile extraction
```

Normal generated text must remain byte-semantically governed by the same pre-v0.64.8 contracts. This repair only moves observer metadata durability and diagnostics.

---

## 10. Permanent verification requirements

The existing `reload-cache-continuity` suite remains the semantic fixture owner, but v0.64.8 must add callsite-level proof so the v0.64.7 omission cannot pass again.

Required fixtures/static controls:

```text
1. OUTPUT_COMMIT callsite exists in the outer output-success path
2. ONUNLOAD callsite remains present as redundancy
3. active committed output -> session checkpoint WRITTEN
4. active committed output -> memory checkpoint WRITTEN when global transport available
5. inactive/BYPASSED output -> no new checkpoint overwrite
6. stale runtime output -> no checkpoint
7. authoritative out-save failure -> no checkpoint
8. sessionStorage unavailable -> output still COMMITTED
9. malformed/stale/location-mismatch/session-oversize claim controls remain PASS
10. memory-first claim priority remains PASS
11. claim consumes session capsule once
12. one tracker incompatible -> partial restore remains visible
13. no raw-body/prompt keys in serialized capsule
14. capsule schema remains 1
15. 10-minute bound unchanged
16. 16,384-char bound unchanged
17. provider cache remains UNVERIFIED
18. no new SnapshotStore/pluginStorage/network/chat-write/timer surface
19. latest.js == install.js
20. v0.64.7/v0.64.6 frozen Broadcast/Time/COMMUNITY/Representation/genuine-edit controls remain PASS
```

Critical regression assertion:

```text
helper can write sessionStorage
!= output-complete checkpoint is wired
```

The suite must inspect or execute the actual committed-output integration path, not only unit-test `runtime-telemetry.publish(...)` in isolation.

---

## 11. Natural live close gate

The repaired release must repeat the failed same-tab scenario rather than substituting a synthetic proof.

Pre-refresh phase:

```text
A. run natural long chat until cache trajectory is healthy/established
B. on the last pre-refresh natural output require:
   Telemetry checkpoint: SESSION · WRITTEN · ... · trigger OUTPUT_COMMIT
C. preserve generation ID and trajectory/topology identity
```

Boundary:

```text
D. ordinary same-tab full page refresh
E. confirm a genuinely new runtime generation
```

First natural request after refresh:

```text
Telemetry continuity: ADOPTED · via session
same location/schema/age accepted
runtime-prefix tracker restored where compatible
request-topology tracker restored where compatible
trajectory tracker restored where compatible
current request immediately compares against restored pre-refresh state
provider cache UNVERIFIED
normal Core request/output semantics unchanged
```

For this full-page-refresh scenario, `via session` is the positive target. `via memory` remains valid for plugin/runtime replacement shapes where the JS global survives, but it does not substitute for the page-refresh session proof.

A real host/prefix mutation is allowed to remain visible. In particular, the preserved `REFRESH_HOST_PREFIX_SHAPE_CHANGE` WATCH means the first post-refresh request may truthfully report a PRE_SIMCORE change or trajectory-family transition. That does **not** fail v0.64.8 if the previous observer state was demonstrably restored and used for comparison.

Second natural request after refresh:

```text
no repeated adoption of the consumed pre-refresh capsule
trajectory continues from the restored+first-post-refresh state
new OUTPUT_COMMIT checkpoint is WRITTEN
no artificial second reset to BASELINE caused by telemetry handoff
```

Gate result:

```text
all required conditions satisfied -> 06408 LIVE PASS
checkpoint written but first request FRESH -> FAIL
first request ADOPTED but second request resets/re-adopts incorrectly -> FAIL
semantic/runtime regression -> FAIL / separate attribution as evidence supports
```

---

## 12. R2.1 genuine-release operational proof

v0.64.8 is the next genuine runtime release after R2.1 delegated operator policy became permanently CI-qualified.

Therefore the release transaction should also produce the already-required operational evidence for:

```text
R_V2_1_SIMPLIFIED_STABLE_TRANSACTIONS
status before release:
DELEGATED_OPERATOR_POLICY_ACTIVE_AWAITING_GENUINE_RELEASE_PROOF
```

This is a release-operation proof, not part of the runtime patch semantics.

Use the permanent delegated path:

```text
explicit v0.64.8 release work item
→ PR1 product + release intent
→ generic candidate + machine receipt
→ PR2 delegated exact approval package
→ verify required PASS
→ delegated publication / LIVE_PENDING convergence
→ user installs + performs real long-chat gate
→ PR3 live-pass closure only after human live PASS
```

Do not reintroduce one-shot v0.64.7 release workflows or manual pre-live GitHub Actions steps.

If R2.1 operational proof finds a release-system defect, preserve it on the R track; do not broaden the runtime checkpoint patch to fix unrelated release governance.

---

## 13. Release ordering

Canonical runtime sequence is now:

```text
v0.64.7 Cross-Reload Cache Observer Continuity
→ real-long-chat FAIL / OUTPUT_CHECKPOINT_CALLSITE_OMITTED

v0.64.8 Output-Complete Telemetry Checkpoint Repair
→ design
→ implementation/candidate/static+CI
→ genuine R2.1 delegated release operation
→ release-simcore publication
→ 06408_OUTPUT_CHECKPOINT_RELOAD_CONTINUITY_REAL_LONG_CHAT
→ live PASS closure

then
v0.65.0 M2-3 Edit Reconcile Ownership Extraction
```

M2-3 implementation remains blocked until v0.64.8 live PASS closes the failed continuity contract.

No unrelated runtime release may jump ahead of v0.64.8.

---

## 14. Implementation handoff

The implementation work item should begin from exact immutable production parent:

```text
P = a7ce8ce33a97797630f885c6753415e4b2ccc7fc
version = 0.64.7
latest == install
```

Expected narrow product diff:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
products/simcore reload-cache-continuity fixture/tooling surfaces as required
release intent/spec/evidence surfaces required by permanent R2.1 flow
```

Runtime code intent:

```text
capture current observer exports once
→ publish/checkpoint after active authoritative output commit
→ retain unload publish
→ expose bounded checkpoint diagnostic
```

Do not implement from this design commit implicitly. A separate explicit implementation transaction is required.

---

## 15. Final activation verdict

```text
next runtime release: v0.64.8
name: Output-Complete Telemetry Checkpoint Repair
status: DESIGN ACTIVATED
implementation: NOT STARTED
parent production: immutable v0.64.7
repair axis: output-complete telemetry checkpoint + bounded diagnostic
capsule schema: FROZEN / 1
Core Store schema: FROZEN
Prompt semantics: FROZEN
provider cache claim: NONE / UNVERIFIED
M2-3: BLOCKED UNTIL 0.64.8 LIVE PASS
R2.1: use this genuine release for operational proof
```

Cross references:

- `docs/SIMCORE_06407_OUTPUT_CHECKPOINT_LIVE_FAILURE_2026-08-27.md`
- `docs/SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`
- `docs/SIMCORE_06407_TELEMETRY_CHECKPOINT_DIAGNOSTIC_GAP_2026-08-27.md`
- `docs/SIMCORE_06407_IMPLEMENTATION_EVIDENCE.md`
- `docs/SIMCORE_REFRESH_HOST_PREFIX_SHAPE_WATCH_2026-08-27.md`
- `docs/SIMCORE_DIAGNOSTIC_REVIEW_STANDARD.md`
- `products/simcore/releases/R_V2_1_SIMPLIFIED_STABLE_TRANSACTIONS_STATUS.json`
- `products/simcore/tooling/build-06407-reload-cache-continuity.py`
- `release-simcore/plugins/simcore/latest.js`
