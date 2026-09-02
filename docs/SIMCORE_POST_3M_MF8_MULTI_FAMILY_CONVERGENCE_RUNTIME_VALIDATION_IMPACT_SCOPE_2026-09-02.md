# SimCore Post-3.0M MF-8 Multi-Family Convergence / Runtime Validation Impact Scope — 2026-09-02

Date: 2026-09-02 KST

Status: **MF-8 IMPACT SCOPE FROZEN · DESIGN-ONLY · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **SIMCORE · POST-3.0M · MULTI-FAMILY ORCHESTRATION · MF-8 · CONVERGENCE · REAL-VALIDATION PROTOCOL · IMPACT SCOPE**

## 0. Purpose

MF-8 is the terminal design checkpoint for the current Multi-Family Orchestration program. It adds no source family and opens no Candidate C capability. Its job is to converge MF-0..MF-7 into one acceptance model and freeze the evidence required before any later runtime implementation may be called qualified.

```text
MF DESIGN CONVERGENCE
!= RUNTIME IMPLEMENTATION
!= TARGET-HOST QUALIFICATION
!= PRODUCTION RELEASE AUTHORIZATION
```

## 1. Inputs consumed without reopening

```text
MF-0  Multi-Family Master Design
MF-1  Fanout Plan + Family Registry
MF-2  Shared Authority + Lane Isolation
MF-3  Aggregate Budget + Failure Matrix
MF-4  Presentation Stack + Mount Isolation
MF-5  SOCIAL_FEED Fanout Entry
MF-6  PUBLIC_KNOWLEDGE Fanout Entry
MF-7  Cross-Family Propagation Reassessment
3M-9  source-irrelevant zero-semantic-burden contract
3M-10 design/runtime/real-validation separation
Candidate C Durable Derived-Object Master Design
```

## 2. Final topology in scope

```text
trusted current authority E
  ├→ LIVE_REACTION(E)
  ├→ BOARD(E)
  ├→ SOCIAL_FEED(E)
  ├→ NEWS(E)
  └→ PUBLIC_KNOWLEDGE(E)
```

The current legal topology is current-root sibling fanout only. PUBLIC_KNOWLEDGE remains restricted to its certified direct-B current-root HANDOFF_EVIDENCE snapshot profile. Cross-family derived-to-derived propagation remains deferred and Candidate C C5 remains not activated.

## 3. Selected seam

```text
MULTI_FAMILY_MAJOR_ACCEPTANCE_GATE
```

MF-8 owns no new semantic authority. The gate consumes design artifacts and future implementation/target-host evidence to produce only a bounded acceptance verdict. It may not infer truth, settlement, maturity, exposure, or family eligibility from UI appearance or model self-report.

## 4. Evidence levels

```text
M0 DESIGN CONVERGENCE
M1 IMPLEMENTATION / INSTRUMENTATION QUALIFICATION
M2 TARGET-HOST REAL LONG-CHAT QUALIFICATION
```

`M0 PASS != M1 PASS != M2 PASS`.

M0 is proved by design contracts, review, and repository CI only. M1 requires an actual runtime candidate and machine-observable instrumentation. M2 requires real target-host execution over long-chat/reroll/edit/reload scenarios.

## 5. Future runtime preconditions

Before M1 can run, future implementation must separately prove or authorize at least:

```text
current source-job selector / fanout-plan producer
trusted family registry implementation
shared current authority bundle projection
family-lane authority isolation
structured sidecar producer / transport
family validators and receipts
finite family budget profiles
finite aggregate hard caps
presentation adapters for all selected families
active source presentation host mount authority
NEWS trusted maturity-context producer
PUBLIC_KNOWLEDGE trusted settlement-context producer
PUBLIC_KNOWLEDGE trusted document-target producer
bounded MF instrumentation
unowned host/plugin metadata preservation
```

MF-8 does not implement any of these.

## 6. Acceptance dimensions

The final protocol must cover at least:

```text
source-irrelevant dormancy
ACTIVE_SINGLE compatibility
ACTIVE_MULTI structural admission
same-root exact authority binding
lane isolation
aggregate budget admission
family-local semantic partial success
family-local presentation failure
common integrity fail-closed behavior
deterministic presentation ordering
collapse/view state remains non-semantic
source replacement/reroll invalidation
no structured source-history accumulation
no cross-family truth promotion
no sibling settlement substitution
no hidden Candidate C C5 behavior
bounded current-fanout-only cost scaling
no hidden persistence/network/background work
unowned metadata preservation
reload/stale-generation cleanup
```

## 7. Source-irrelevant negative control

Ordinary turns with no current authorized source job remain the primary negative control. Future instrumentation should prove conceptually:

```text
source-specific prompt bytes/tokens = 0
source-history scans = 0
source sidecar generation = 0
source validation = 0
source presentation build = 0
source DOM work = 0
source persistent reads/writes = 0
source network calls = 0
extra source model calls = 0
background source workers/polling = 0
```

A bounded local branch/check for current source-job existence is permitted. `ZERO CPU INSTRUCTIONS` is not claimed; `ZERO SOURCE SEMANTIC BURDEN` is required.

## 8. Future family matrix

Future validation must include single-family, representative pair/triple/four-family plans, and an all-five structural case on a compatible direct-B root when aggregate caps permit. Structural legality never implies MF-3 execution-budget admission.

## 9. Negative structural cases

Include at least:

```text
duplicate family key
unknown family key
disabled/review-required profile
multi-authority fanout attempt
PUBLIC_KNOWLEDGE on incompatible root
history-derived fanout activation
renderer-derived fanout activation
model-added family after admission
silent family dropping to satisfy budget
```

Expected behavior is fail-closed at the appropriate admission boundary.

## 10. Family-local policy matrix

Required partial-success scenarios include sibling ALLOW results beside NEWS maturity HOLD, PUBLIC_KNOWLEDGE settlement HOLD, BOARD parent dependency failure, and SOCIAL_FEED graph failure. Sibling success must remain intact unless common authority/control-plane integrity is invalid.

## 11. No truth laundering

```text
BOARD says X
!= NEWS truth proof
SOCIAL_FEED repeats X
!= NEWS truth proof
NEWS reports X
!= PUBLIC_KNOWLEDGE settlement
multiple siblings agree X
!= canonical truth
```

PUBLIC_KNOWLEDGE settlement remains PK-private and trusted.

## 12. C5 absence is an acceptance requirement

Because MF-7 kept Candidate C C5 closed, M1/M2 must prove runtime does not accidentally create derived-to-derived lineage. Forbidden hidden behaviors include sibling semantic payloads used as authority, fuzzy sibling matching to infer provenance, DOM adjacency/display order treated as lineage, and sibling repetition counted as confidence/truth.

## 13. Performance observability

Future M1 instrumentation should expose bounded measurements sufficient to determine at least:

```text
source-specific prompt bytes/tokens
family count requested/admitted/executed
per-family and aggregate semantic items/chars
validation receipt counts
presentation node counts
fanout-attributable model calls and input/output budget
source history scan count
persistent read/write count
network call count
background worker/poll count
family-local validation latency
aggregate orchestration latency
presentation build/mount latency
stale-generation rejection count
```

MF-8 invents no numeric thresholds. Concrete thresholds must be frozen against an actual implementation baseline before M1 qualification.

## 14. Long-chat scaling

```text
cost(turn N with fanout)
≈ cost(current fanout N)
```

not accumulated source history. Repeated fanout use must not create growing hidden history scans, revalidation, reinjection, DOM retention, or persistence work.

## 15. Reroll/edit/reload cases

M2 must cover source reroll/replacement, relevant edits, reload with old source cards visible, stale runtime generation, repeated collapse/expand, family renderer local failure, and stack disposal/remount. Old sibling projections must not silently retain support after authority replacement.

## 16. Acceptance authority

The model may generate drafts but may not self-declare MF acceptance. Machine validators/receipts prove only their owned structural/policy claims. Repository CI does not prove target-host user-visible correctness. M2 requires actual target-host observations and human evidence terminal convergence where required by the existing evidence model.

## 17. Runtime qualification blockers

```text
ordinary source-irrelevant regression
history residue activates fanout
unbounded source prompt/history growth
cross-family truth promotion
sibling output used as PK settlement
source mismatch fails to invalidate affected fanout
DENY/HOLD content reaches presentation
presentation failure mutates semantic authority
silent budget-driven family dropping
model/renderer changes admitted family set
unowned host/plugin metadata overwritten/deleted
hidden persistence/network/background work
stale runtime generation owns active source DOM
Candidate C behavior appears without explicit child design
```

## 18. Impact conclusion

MF-8 requires no new source family, core mode, truth class, renderer grammar, or Candidate C activation.

Expected final design conclusion if no contradiction is found:

```text
MULTI-FAMILY DESIGN PROGRAM = CONVERGED
RUNTIME IMPLEMENTATION = NOT AUTHORIZED BY MF-8
REAL VALIDATION = NOT RUN
CANDIDATE C C5 = NOT ACTIVATED
```
