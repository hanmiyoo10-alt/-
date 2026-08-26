# SYS-19 — Live-Gate Handoff Packet — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-19
Idea          = Live-Gate Handoff Packet
Size          = SMALL
Importance    = 5 / VERY HIGH
Difficulty    = 1 / VERY EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_IDEA_SIZE_CLASSIFICATION_MASTER_2026-08-26.md`
- `docs/SIMCORE_IDEA_PRIORITY_DIFFICULTY_MATRIX_2026-08-26.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`

Current live-gate authority used to validate the design:
- `product-manifest.json`
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`

Related but non-overlapping evidence-review artifact:
- `docs/SIMCORE_LIVE_EVIDENCE_REVIEW_CLASSIFICATION_HANDOFF_TEMPLATE.md`

---

## 1. Problem

SimCore already has authoritative live-gate contracts, but the human handoff can still require reconstructing the actionable experiment from multiple repository documents.

That creates avoidable failure modes:

```text
wrong production/version tested
wrong scenario tested
a historical gate mistaken for the current gate
extra speculative tests added by the operator
required first/second control omitted
provider/cache claims inferred from local telemetry
user returns too little evidence to classify the gate
user returns excessive raw chat content when bounded diagnostics were sufficient
```

SYS-19 provides one compact **current live-gate handoff packet** that tells the human exactly what bounded experiment to perform and exactly what evidence to return.

It is a navigation/operator artifact. It does not create runtime truth and does not replace the underlying gate authority.

---

## 2. Ownership and authority

Canonical ownership split:

```text
product-manifest.json
+ CURRENT_DEVELOPMENT.md
= current production identity + current live-gate selection

release/design/evidence document named by the current gate
= semantic experiment/pass-condition authority

SYS-19 handoff packet
= bounded human-action projection only

assistant/repository forensic review
= final PASS / WATCH / FIX / BLOCKER classification
```

The packet must never become the semantic authority for the release or gate.

If the packet conflicts with an authoritative source, the packet is stale and must be corrected before use.

---

## 3. Distinction from S-04

SYS-19 and S-04 exist on opposite sides of the human validation boundary.

```text
SYS-19
BEFORE live validation
→ what to do
→ what to observe
→ what evidence to return

S-04 / repository review template
AFTER evidence exists
→ inspect evidence
→ preserve qualifiers/unknowns
→ classify WATCH / DEFER / FIX / BLOCKER as appropriate
```

SYS-19 must not absorb S-04 forensic classification fields or act as an evidence packet builder.
S-04 must not become the user-facing experiment instruction authority.

---

## 4. v1 artifact form

The useful v1 implementation is one living repository document, conceptually:

```text
docs/SIMCORE_CURRENT_LIVE_GATE_HANDOFF.md
```

It is intentionally document-only.

No Node/Python generator is required for v1.
No runtime UI, plugin button, workflow, GitHub Action, or background automation is part of this design.

The living artifact is updated when the current production/live gate changes. Historical release/design/evidence documents remain preserved and authoritative for their point-in-time meaning.

---

## 5. Packet schema

A live-gate handoff packet contains exactly these sections.

### 5.1 Gate identity

```text
Product
Production version
Release name
Current priority / scenario ID
Validation status
Major checkpoint
Primary gate authority path(s)
```

Rules:
- values must come from current living/release authorities;
- no stale historical release may be presented as current;
- unresolved identity means `HANDOFF_BLOCKED`, not a best guess.

### 5.2 Why this gate exists

Maximum: 3 bounded bullets.

Purpose:
- explain what contract is being closed;
- state the main non-goal;
- state the next work unlocked by a successful close when already authoritative.

Do not reproduce long design rationale.

### 5.3 Human experiment

One bounded experiment, written as an ordered sequence.

The packet may contain several steps when the gate itself requires a sequence, but it must describe **one experiment unit**, not a menu of optional tests.

Required vocabulary:

```text
PRECONDITION
ACTION
OBSERVE
CONTINUE
RETURN
```

Do not invent additional stress tests or unrelated controls.

### 5.4 Evidence to return

The packet names the minimum evidence needed to classify the gate.

Allowed evidence categories:

```text
bounded diagnostic copy
specific diagnostic lines/sections
runtime generation / turn identity
boundary type used (refresh / plugin runtime update / other authoritative option)
nearest required first/second control
short operator observation when machine evidence cannot encode the physical action
RAW/neighbor context only when the gate or anomaly actually requires it
```

Default rule:

```text
minimum sufficient evidence
> maximal raw transcript
```

Do not request unbounded chat history by default.

### 5.5 Expected positive observations

List only pass-condition observations already defined by the gate authority.

These are **expected observations**, not an automatic PASS declaration.

### 5.6 Failure / uncertainty routing

The packet may route obvious evidence shapes to review categories such as:

```text
EXPECTED PATH OBSERVED
UNEXPECTED RUNTIME RESULT
INSUFFICIENT EVIDENCE
ANOMALY OBSERVED
```

It must not auto-assign final `PASS / WATCH / FIX / BLOCKER`.
Final classification remains repository review work.

### 5.7 After-return handoff

One line:

```text
Return the listed evidence to the SimCore work chat; repository review will classify the live gate and synchronize current authorities.
```

No additional GitHub action is required from the user unless a separate current authority explicitly says otherwise.

---

## 6. Current v0.64.7 specialization contract

The current production state is:

```text
SimCore v0.64.7 — Cross-Reload Cache Observer Continuity
current priority = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
validation = PENDING_REAL_LONG_CHAT
checkpoint = M2-2
```

The current gate authority defines one same-chat experiment:

```text
A. establish healthy cache trajectory in v0.64.7
B. confirm session telemetry checkpoint WRITTEN
C. refresh the page or perform a plugin runtime update
D. make the first natural request in the new runtime generation
E. make the second natural request
```

A future SYS-19 materialized packet for this gate must preserve that sequence without adding provider-cache tests or unrelated M2 controls.

Minimum return evidence for the v0.64.7 handoff should be sufficient to establish, as applicable:

```text
pre-boundary checkpoint was WRITTEN
new runtime generation/boundary occurred
first post-boundary Telemetry continuity result + transport
same-location acceptance / tracker restoration results
first-break/frontier availability on first post-boundary request
provider cache remains UNVERIFIED
second request continues the restored trajectory
same capsule was not repeatedly re-adopted
normal Core request/output behavior did not visibly regress
```

If a PRE_SIMCORE/history prefix difference is still observed, it must be preserved as evidence rather than hidden by the handoff packet.

---

## 7. Freshness / invalidation rules

A materialized handoff is current only while all identity selectors still match:

```text
production version
release identity
current priority/scenario ID
validation status still requires human live evidence
```

Invalidate/review the living packet when any of these changes.

Examples:

```text
PENDING_REAL_LONG_CHAT → PASS
production version changes
current_priority changes
release is rolled back
new gate authority supersedes the prior experiment
```

A stale packet must never remain advertised as the current user action.

This is a direct trigger for the existing real-time close-step document/gate/next-operation synchronization routine.

---

## 8. Failure model

### HANDOFF_BLOCKED

Use when:

```text
current production identity is ambiguous
current gate cannot be resolved uniquely
a required gate authority is missing/conflicting
the gate requires information not yet frozen in an authority document
```

Behavior:
- do not guess the experiment;
- repair/resolve current authority first.

### HANDOFF_READY

Use when:

```text
current identity resolves
one current live gate resolves
experiment sequence and minimum evidence are directly supported
```

This state means the instruction packet is ready to use, **not** that the live gate passed.

### HANDOFF_STALE

Use when a previously materialized packet no longer matches current identity/gate selectors.

---

## 9. Hard boundaries

SYS-19 must never become:

```text
runtime/plugin feature
live diagnostic builder
S-04 evidence packet builder
forensic auto-classifier
LIVE_PASS auto-promoter
provider/cache inference engine
raw-chat archive
release publication trigger
GitHub/repository writer
background reminder/polling system
second current-production authority
second live-gate semantic authority
```

It may quote compact expected diagnostic labels from the actual gate authority, but it cannot invent semantic facts.

---

## 10. Verification plan for later document application

When SYS-19 is materialized as the living handoff document, verify:

```text
1. current production identity matches product-manifest.json
2. current priority matches CURRENT_DEVELOPMENT.md current operational state
3. primary gate authority exists
4. experiment steps are a bounded projection of that authority
5. minimum evidence list is sufficient for the gate's required first/second controls
6. no provider/cache/root-cause overclaim exists
7. no unrelated test scenario is added
8. user action is singular as one bounded experiment unit
9. after-return route points to repository review, not automatic classification
10. no plugin/runtime/release/CI/repo-writer change occurs
```

For v0.64.7 specifically, the materialized packet must preserve the A→E same-chat experiment and both first-request and second-request close conditions from `SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`.

---

## 11. Unified classification freeze verdict

Source/design inspection confirms the provisional classification.

```text
SIZE          = SMALL
IMPORTANCE    = 5
DIFFICULTY    = 1
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- the useful implementation is a living human-facing repository document;
- no executable generator is required for v1;
- no CI/release/repository-writer authority changes are needed;
- no plugin/runtime semantics are touched.

A future desire to generate the packet mechanically would be a separate NON_RUNTIME executable idea or a revision explicitly reviewed against the existing authority boundaries. It is not implicit in SYS-19 v1.

---

## 12. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
IMPLEMENTATION/APPLICATION = NOT STARTED
```

Per the SimCore design-first policy, stop here. Any materialization of `SIMCORE_CURRENT_LIVE_GATE_HANDOFF.md` is a separate bounded NR application transaction.

Production remains unchanged:

```text
SimCore v0.64.7
release-simcore = unchanged
plugin bytes/version = unchanged
live gate = PENDING_REAL_LONG_CHAT
```
