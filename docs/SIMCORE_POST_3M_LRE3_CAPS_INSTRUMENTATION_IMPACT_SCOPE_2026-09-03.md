# SimCore Post-3.0M LRE-3 Caps / Instrumentation Impact Scope — 2026-09-03

Date: 2026-09-03 KST

Status: **IMPACT SCOPE FROZEN · DESIGN-ONLY · LIVE_REACTION FIRST FAMILY CAP CLOSURE · COMMON G8 EVIDENCE SHAPE · NO RUNTIME AUTHORITY · PRODUCTION UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-3 · G6 / G8 · IMPACT SCOPE**

## 0. Purpose

This document maps the narrowest semantic/effect surface for LRE-3 before detailed design.

LRE-3 owns two different concerns:

```text
G6 · explicit current-projection safety caps
G8 · bounded integration evidence / instrumentation
```

It must not become a Source database, semantic history, renderer, transport re-design, or runtime implementation transaction.

## 1. Authority chain

Consumes:

```text
SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01
SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03
SIMCORE_POST_3M_LRE2_SEMANTIC_CONTROL_DESIGN_2026-09-03
SIMCORE_LRE2_TRANSIENT_CARRIER_HOST_FINGERPRINT_BOUNDARY_FIX_2026-09-03
SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01
SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01
SIMCORE_3M_10_MAJOR_CONVERGENCE_REAL_VALIDATION_DESIGN_2026-09-01
SIMCORE_06411_BOUNDED_TELEMETRY_CAPSULE_COMPACTION_ACTIVATION
```

Production authority remains `release-simcore` and must be freshly re-preflighted before implementation.

## 2. Scope decision

LRE-3 must **not** guess one permanent numeric profile for every future family.

Selected staged policy:

```text
LIVE_REACTION
→ concrete first-runtime cap profile frozen in LRE-3

BOARD
→ cap categories / evidence schema compatible now
→ concrete numeric cap profile closes before BOARD activation in LRE-9

NEWS
→ cap categories / evidence schema compatible now
→ concrete numeric cap profile closes before NEWS activation in LRE-9
```

Reason:

```text
family readiness is staged
family semantics differ
current runtime-enabling producer/transport is frozen only for LIVE_REACTION
```

Therefore:

```text
G6_LIVE_REACTION_DESIGN may close in LRE-3
G6_BOARD / G6_NEWS remain family-stage pending
```

This does not weaken the 3M-10 requirement that each family have concrete caps before activation.

## 3. Cap ownership surface

LRE-2 already requires bounded values for:

```text
proposal assertion count
assertion content chars
support quote chars
aggregate semantic chars
aggregate packet chars
transport protocol-zone chars
validation receipt rows
```

LRE-3 also needs bounded current-source inspection so support proof cannot become an accidental large-current-message cost path.

Required additional category:

```text
trusted current source-region scan chars
```

No cap is a simulated population fact.

All are engineering safety/performance ceilings.

## 4. Prompt-cost cap surface

3M-9 requires source-specific prompt contribution to remain zero on DORMANT turns and bounded on ACTIVE turns.

Therefore LRE-3 owns a cap for:

```text
conditional Source producer-contract chars
```

This cap covers only newly added Source-specific instruction bytes.

It does not relabel pre-existing current source/event provenance as new Source producer cost.

## 5. Cap enforcement points

The narrow future enforcement seams are:

```text
request preparation
→ Source producer-contract char cap

raw output before visible-output grammar
→ protocol-zone / packet cap

packet schema validation
→ assertion count / ordinal / content / support-quote caps

support proof
→ trusted current source-region scan cap

3M-3 receipt construction
→ receipt-row cap
```

Cap failure is judge-only.

No truncation/repair of semantic content is permitted by default.

## 6. No silent truncation

Forbidden:

```text
oversize assertion
→ cut text to cap
→ validate shortened claim
```

or:

```text
oversize support quote
→ truncate until it matches source
```

or:

```text
over-cap packet
→ keep first N assertions and trust the rest as absent
```

Required direction:

```text
cap violation
→ explicit bounded failure status
→ no partially trusted proposal from that packet
```

## 7. Instrumentation owner

LRE-3 should not create a new semantic state owner.

Selected evidence concept:

```text
SourceTurnEvidenceV1
```

Properties:

```text
request/turn-local diagnostic evidence
latest-sample boundedness
no semantic assertion text
no support quote body
no raw source body
no source-history array
no persistent Source database
```

The exact runtime module/function owner remains implementation-preflight detail.

A future implementation should prefer the existing diagnostics / runtime-telemetry control plane over a new unrelated telemetry subsystem, but must preserve its existing ownership and serialized-budget contracts.

## 8. Evidence dimensions

The common LRE-3 evidence schema must represent at least:

```text
semantic authority stage
selector status / reason / family
source-specific prompt chars
transport expected/status
raw / clean / protocol / packet char counts
packet assertion count
support-proof status counts
validator overall state
allowed / denied / held counts
validated semantic item / char counts
source-region scan chars
current source reads
history scan count
persistent Source reads / writes
structured re-entry chars
legacy bridge / new legacy-context growth chars
network calls
extra model calls
background/timer work
bounded local source-path latency segments
```

Exact field spellings are detailed-design ownership.

## 9. DORMANT evidence contract

For an ordinary source-irrelevant request, future instrumentation must be able to prove:

```text
selector = DORMANT
source producer prompt chars = 0
transport parsing work = 0 semantic work
support-region extraction = 0
validator invocation = 0
source history scan = 0
source persistent read/write = 0
structured re-entry chars = 0
network = 0
extra model = 0
background/timer = 0
```

A bounded O(1) selector branch is allowed.

DORMANT must not add a new await, host/storage read, JSON parse over the response, or source-body scan merely to prove dormancy.

## 10. ACTIVE evidence contract

For a first-slice ACTIVE/SHADOW request, evidence must distinguish the stages rather than collapse them into one failure bit:

```text
selector
producer-prompt contribution
transport
support proof
validator
validated sidecar
legacy compatibility/current-context growth
```

This preserves LRE-2 failure-domain separation.

## 11. Latency evidence boundary

LRE-3 should record local source-processing spans such as:

```text
selector
transport extraction
support-region extraction/proof
policy-context building
validator
source-local total
```

It should not claim a device-independent millisecond acceptance threshold from repository design alone.

Deterministic acceptance is instead built from:

```text
zero forbidden calls/bytes/work on DORMANT
bounded collection sizes on ACTIVE
no history-proportional cost
```

Actual latency regression thresholds belong to same-host implementation/real-validation evidence.

## 12. Existing telemetry compatibility

Prior SimCore telemetry work established a critical pattern:

```text
rich in-generation observation
!=
durable handoff payload
```

and preserved a bounded serialized telemetry capsule.

LRE-3 therefore forbids adding unbounded Source arrays/content to telemetry handoff merely for convenience.

If a future implementation exports Source evidence through existing telemetry handoff:

```text
latest bounded digest only
no semantic text
no support quote
no raw packet
no per-turn history array
must remain inside existing telemetry serialized-budget authority
```

LRE-3 does not authorize such a persisted digest by itself.

## 13. Legacy migration evidence

Because LRE-3 is part of Legacy / Runtime-enabling, G8 must be able to distinguish:

```text
legacy Community blocks/chars produced this turn
new legacy context chars retained this turn
structured Source re-entry chars
legacy compatibility serializer activity later in LC2
```

At LC1/SHADOW the expected legacy behavior remains unchanged.

At later migration stages these dimensions prove prospective legacy-context retirement rather than historical transcript deletion.

## 14. Protected non-impact boundaries

LRE-3 detailed design must not change:

```text
SourceJobSelector semantics
TRANSIENT_TAIL_CARRIER_V1 grammar
Exposure policy logic
3M-3 ALLOW/DENY/HOLD logic
cleanContent fingerprint FIX
presentation / DOM / CSS
legacy semantic-owner cutover
legacy context retirement
Candidate C durability
BOARD / NEWS activation
prompt bytes in production
runtime code
latest.js / install.js
release-simcore
```

## 15. Candidate change surface if later implemented

Potential future code surfaces are limited to:

```text
Source cap constants / validators
bounded Source evidence counters
narrow timing checkpoints
conditional prompt-char accounting
transport / support / validator count reporting
existing diagnostics exposure
```

No new persistent Source schema is required.

## 16. BLOCKER candidates

```text
BLOCKER · CAP_FAILURE_TRUNCATES_AND_TRUSTS_SEMANTIC_CONTENT
BLOCKER · TELEMETRY_STORES_RAW_ASSERTION_OR_SUPPORT_TEXT
BLOCKER · G8_BECOMES_PERSISTENT_SOURCE_HISTORY
BLOCKER · DORMANT_TURN_SCANS_OUTPUT_OR_HISTORY_FOR_SOURCE_MARKERS
BLOCKER · DORMANT_TURN_ADDS_HOST_STORAGE_OR_NETWORK_IO
BLOCKER · SOURCE_REGION_PROOF_SCANS_UNBOUNDED_CURRENT_CONTENT
BLOCKER · BOARD_NEWS_NUMERIC_CAPS_GUESSED_AND_TREATED_AS_ACTIVATION_AUTHORITY
BLOCKER · INSTRUMENTATION_CHANGES_SELECTOR_OR_POLICY_RESULT
```

## 17. WATCH / DEFER

```text
WATCH · DEVICE_DEPENDENT_LATENCY_THRESHOLD_REQUIRES_RUNTIME_BASELINE
WATCH · EXISTING_TELEMETRY_CAPSULE_BUDGET_MUST_BE_RECHECKED_BEFORE_ANY_SOURCE_DIGEST_EXPORT

DEFER · BOARD_CONCRETE_CAP_PROFILE_TO_LRE9
DEFER · NEWS_CONCRETE_CAP_PROFILE_TO_LRE9
DEFER · SOURCE_TELEMETRY_DURABLE_HANDOFF_UNLESS_REAL_VALIDATION_REQUIRES_IT
DEFER · SOURCE_HISTORY_ANALYTICS
DEFER · LONGITUDINAL_PER_ASSERTION_TELEMETRY
```

## 18. Impact conclusion

The narrowest LRE-3 design is:

```text
LIVE_REACTION concrete cap profile
+
common bounded SourceTurnEvidenceV1 schema
+
DORMANT zero-work proof contract
+
ACTIVE stage-count/byte/latency evidence
+
legacy-context growth dimensions
```

No new semantic owner and no persistent subsystem are required.

## 19. Handoff to detailed design

The detailed LRE-3 design may now freeze:

```text
exact LIVE_REACTION constants
cap-failure reason classes
SourceTurnEvidenceV1 exact bounded field set
DORMANT deterministic acceptance
ACTIVE evidence accounting rules
G6/G8 staged gate disposition
LRE-4 readiness inputs
```
