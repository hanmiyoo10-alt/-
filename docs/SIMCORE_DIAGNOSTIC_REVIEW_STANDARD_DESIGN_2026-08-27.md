# SimCore Diagnostic Review Standard — Design

Date: 2026-08-27
Status: `FROZEN OPERATIONAL STANDARD DESIGN · NON_RUNTIME · NR_DOC_ONLY · NO RUNTIME CHANGE`

Purpose: define how one or more copied SimCore diagnostics must be reviewed so that visible semantic anomalies, cross-turn effects, retry/reroll controls, edit/reload boundaries, scoped subsystem states, and attribution evidence are not lost merely because individual diagnostic lines look healthy.

This standard is evidence-review procedure only. It does not replace runtime diagnostics, anomaly-family authority, recurrence classification, forensic disposition authority, live-gate authority, or release authority.

Direct authorities consumed:
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_SYS20_NATURAL_EVIDENCE_INTAKE_CHECKLIST_GENERATOR_DESIGN.md`
- `docs/SIMCORE_SYS16_ANOMALY_RECURRENCE_CORRELATOR_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_LIVE_06407_VALIDATION_2026-08-27.md`
- `docs/SIMCORE_PARTIAL_PREVIOUS_TURN_REPLAY_RECURRENCE_2026-08-27.md`

---

## 1. Problem

A SimCore Last Turn Diagnostic contains many scoped signals such as:

```text
Warnings: 0
Stability: PASS
Continuity summary: PASS
Frame sequence: PASS
Cache topology: STABLE
Cache break: NONE
SimCore contribution: NO_BREAK
Runtime status: ACTIVE
output COMMITTED
```

Those signals are valuable, but none of them is a global statement that the visible assistant response semantically satisfied the current user input.

A real 2026-08-27 long-chat specimen demonstrated why multi-log review is required:

```text
new user input focused on dawn-cam attendance / relationship values / future planning / chemistry
→ first generation reused the preceding turn's broad final-statistics summary frame
→ same-input retry removed that response-frame replay
→ retry diagnostic showed history mutation NONE, cache topology STABLE 100%, runtime identities SAME, SimCore contribution NO_BREAK
```

A latest-log-only or diagnostic-status-only review could miss this anomaly entirely.

Therefore diagnostic review must treat the **evidence sequence** rather than one copied packet as the primary review object whenever multiple related packets exist.

---

## 2. Core invariant

```text
RAW user intent
+ visible assistant output
+ exact diagnostic binding
+ neighboring turns / retry / reroll / edit / reload actions when available
+ what changed
+ what did NOT change
→ bounded evidence review

scoped PASS/STABLE/COMMITTED
!= global semantic correctness

same-input reroll/retry
!= second natural recurrence

one diagnostic packet
!= complete sequence truth when related packets exist
```

Canonical review question:

> Given the exact user intent, visible output, runtime facts, and neighboring controls, what can we actually say happened — and what cannot yet be attributed?

---

## 3. Review unit — Diagnostic Review Episode

The primary review object is a `Diagnostic Review Episode`.

One episode contains all available packets that belong to one bounded operational sequence, for example:

```text
ordinary request → output
request → output → next turn
request → anomalous first generation → same-input retry
prior output → genuine manual edit → next request
pre-reload request → reload → first new-generation request → second new-generation request
B_END → direct post-B_END C
```

Rules:
- do not discard repeated diagnostics merely because turn indices repeat;
- do not count repeated diagnostics as independent natural specimens automatically;
- do not mix unrelated runtime generations or chats into one episode merely because version/mode match;
- preserve physical/operator actions such as manual edit, retry, reroll, refresh, plugin reload, or intentional validation action;
- when only one packet exists, review it as a single-packet episode and explicitly mark sequence claims unavailable.

---

## 4. Three evidence truths

Every review keeps three truth surfaces distinct.

### 4.1 Visible truth

What the user actually asked and what the assistant visibly returned.

Owned by:
- RAW user input;
- RAW/visible assistant output;
- exact operator clarification when a physical action occurred.

Visible truth can establish semantic or structural symptoms that diagnostics do not encode.

Examples:
- requested source-only scope was abandoned;
- previous-turn response frame was replayed;
- a visible timestamp regressed;
- a manual edit changed one visible fact;
- output structure violated a required format.

### 4.2 Runtime truth

What SimCore locally observed and classified.

Examples:
- request/output binding;
- edit reconcile path;
- representation fingerprints;
- cache topology;
- history mutation observer;
- runtime prompt identity;
- lifecycle/chronology state;
- telemetry continuity;
- timing/hotspot information.

Runtime truth must not be promoted into semantic-output truth unless the diagnostic contract actually covers that semantic claim.

### 4.3 Sequence truth

What becomes visible only by comparing neighboring observations.

Examples:
- same-input retry clears an anomaly;
- next turn inherits or does not inherit suspect state;
- runtime generation changes across reload;
- cache family continues or resets;
- manual edit causes the expected rebuild path;
- a first-generation replay disappears without history/runtime mutation.

No one truth surface globally overrides the others. Review requires cross-checking all applicable surfaces.

---

## 5. Mandatory review order

The frozen review order is intentionally **RAW-first** to reduce anchoring on reassuring diagnostic status lines.

### Pass 1 — Bind the evidence

For every supplied packet record:

```text
capture time
SimCore version
runtime boot / generation
probe context
user index → assistant index
mode / stored mode
request/output binding
whether packet is first generation, retry/reroll, edited-state send, post-reload request, or ordinary continuation
```

If the physical action is known only from the operator, record it explicitly as operator evidence rather than pretending the diagnostic inferred it.

### Pass 2 — Read the user input semantically

Before interpreting diagnostic PASS/WARNING fields, summarize the current user's bounded semantic intent.

Capture only what is needed to judge the response, for example:

```text
current-turn community reaction to named themes
source-only scene request
ordinary continuation
explicit B_END
comparison request
current-timeline continuation
```

Do not replace the actual input with the previous turn's topic.

### Pass 3 — Read the visible output semantically

Summarize the response's actual semantic frame and major content categories.

Ask:
- does it answer the current input?
- does it begin in the current request's frame or replay a prior frame?
- does unrelated prior-turn material dominate the prefix?
- does it eventually recover into the current request?
- does it violate requested scope, chronology, structure, or mode semantics?

A diagnostic with `Warnings: 0` does not waive this pass.

### Pass 4 — Compare neighboring packets

Compare each adjacent pair on explicit axes rather than eyeballing whole logs.

Frozen axes:

```text
A. turn / request identity
B. operator action
C. user-intent summary
D. output semantic-frame summary
E. runtime generation / epoch
F. edit / representation state
G. history mutation / stabilization
H. cache topology / break / trajectory
I. runtime prompt identity tiers
J. lifecycle / frame / chronology
K. telemetry handoff state
L. warnings / compatibility diagnostics
M. timing / hotspot changes
```

For every material comparison record both:

```text
CHANGED
UNCHANGED
UNRESOLVED
NOT_APPLICABLE
```

**UNCHANGED facts are first-class attribution evidence.**

Example:

```text
same input
+ same request hash
+ History mutation NONE
+ cache topology 100% STABLE
+ full runtime identity SAME
+ SimCore contribution NO_BREAK
+ output semantic frame changes on retry
→ correction is not explained by a SimCore state/history/prompt change in that interval
```

This narrows attribution without claiming the provider/model root cause.

### Pass 5 — Interpret diagnostic subsystem states

Only after RAW/sequence review, inspect scoped diagnostic states.

For every PASS/STABLE/COMMITTED-like state ask:

> What exact subsystem and claim does this line cover?

Never promote:

```text
Warnings: 0
→ no anomaly

Continuity summary: PASS
→ visible semantic correctness

Cache topology: STABLE
→ model output should be semantically identical

SimCore contribution: NO_BREAK
→ provider/model behavior is healthy

output COMMITTED
→ output content is correct
```

Likewise, one mismatch or degraded state is not automatically a global defect.

### Pass 6 — Build controls and attribution boundary

Classify available controls:

```text
same-input retry/reroll
neighbor healthy turn
next-turn inheritance
manual-edit positive control
pre/post reload boundary
same-runtime invariant comparison
cross-runtime comparison
```

Then explicitly separate:

```text
observable symptom
from
attribution maturity
```

Default attribution remains `UNPROVEN` unless source evidence supports something stronger.

### Pass 7 — Recurrence / classification / gate handoff

After the episode is understood:
- SYS-16 owns whether another event is an independent same-family recurrence;
- SYS-21 owns whether the current WATCH/FIX/BLOCKER classification remains evidence-consistent;
- the owning live-gate authority owns PASS/PENDING/FAIL effect;
- Deferred Ledger / Anomaly Watch own durable preservation as applicable.

The review standard itself does not auto-promote severity or authorize runtime repair.

---

## 6. No-latest-log shortcut

When a user supplies multiple related diagnostics, the reviewer must not inspect only the final packet and summarize the rest by assumption.

Frozen rule:

```text
all packets in the bounded episode
→ identity row for every packet
→ RAW semantic review for every distinct input/output generation
→ adjacent delta review
→ then final classification
```

Efficiency is allowed through **delta review**, not packet omission.

For very long sequences:
- fully parse the first packet's field groups;
- for later packets, still inspect RAW input/output and all field groups, but record unchanged groups compactly;
- expand timing detail only when a hotspot/outlier is material;
- never skip a packet because its top-level status resembles the previous one.

---

## 7. Same-turn / same-index repeated packets

Repeated user/assistant indices require special care.

Possible meanings include:

```text
same-input retry/regeneration
repeat-send using same host snapshot
same visible output observed again
post-edit send on the same logical turn
later diagnostic capture of a mutated visible representation
```

Therefore:

```text
same indices
!= duplicate packet
!= same visible generation
!= independent natural recurrence
```

Use fingerprints, operator action, `Pre snapshot`, edit reconcile, output provenance, runtime identity, and visible RAW content to determine what actually changed.

The 2026-08-27 specimen is canonical:
- same `@2160→@2161` identity;
- retry reported `REPEAT-SEND · READ HIT`;
- output semantic frame changed materially;
- history/runtime/cache invariants stayed stable.

---

## 8. Manual-edit rule

A diagnostic can report ambiguous representation change because it cannot know the human action by itself.

Operator clarification is valid evidence for the physical action.

Frozen rule:

```text
diagnostic says AMBIGUOUS_CHANGE / NEW_VISIBLE_REPRESENTATION
+ operator confirms intentional manual edit
+ fingerprints/path are compatible with genuine edit
→ treat the physical action as confirmed user edit
```

Do not preserve `AMBIGUOUS_CHANGE` as an unresolved anomaly after the user action is source-confirmed.

But operator clarification must not override contradictory machine facts about what SimCore actually did after the edit.

---

## 9. Retry / reroll rule

A retry/reroll is a **control observation**, not an independent natural recurrence by itself.

Frozen interpretation:

```text
first natural generation anomalous
+ same-input retry clears
→ symptom-clearance control

first natural generation anomalous
+ same-input retry reproduces
→ controlled reproduction evidence

neither case alone
→ second independent natural recurrence
```

When retry clears while state/history/runtime invariants remain unchanged, record those invariants because they narrow attribution.

Do not conclude `model randomness` or another provider mechanism unless independently observed; use bounded wording such as:

```text
generation/result variability under the same preserved request/runtime state
```

---

## 10. Reload / runtime-boundary rule

Cross-reload claims require actual cross-runtime evidence.

Frozen minimum:

```text
pre-boundary packet
+ explicit refresh/runtime reload action
+ changed runtime boot/generation
+ first natural post-boundary request
+ second natural post-boundary request when contract requires continuation proof
```

Same-generation stability before a reload is useful baseline evidence but cannot establish cross-reload continuity.

Likewise, `Telemetry continuity: FRESH · no-compatible-handoff` is not proof of failed handoff unless the necessary compatible pre-boundary checkpoint/reload preconditions are established.

---

## 11. Semantic-prefix replay review rule

When the current output appears suspiciously similar to the previous turn, compare **semantic frame**, not only byte identity.

Review:

```text
previous user intent
previous output opening frame / major categories
current user intent
current first-generation output opening frame / major categories
same-input retry output frame when available
```

A replay family may exist even when the text is not verbatim.

Canonical observable shape for `PARTIAL_PREVIOUS_TURN_REPLAY`:

```text
new user turn
→ first generation reuses a large prior-turn response frame / semantic prefix
→ output eventually incorporates current requested material
→ same-input retry may clear the replay
```

Exact recurrence classification remains with SYS-16 / the owning anomaly family.

---

## 12. Timing and performance review

Timing data must be inspected, but not every slow number is a correctness defect.

For each packet identify:
- request hotspot;
- output hotspot;
- unusual reconcile/storage/load cost;
- whether timing coincides with a semantic/state anomaly;
- whether the timing is already an explicit non-goal or known host/storage behavior.

Rules:

```text
slow
!= wrong

fast
!= correct

hotspot correlation
!= causality
```

A performance observation becomes a correctness finding only when source evidence establishes a correctness consequence or an owning contract defines the threshold as blocking.

---

## 13. Review trigger catalogue

The following are **review triggers**, not automatic anomaly classifications:

```text
RAW input/output semantic mismatch despite healthy diagnostics
previous-turn semantic frame appearing in a new response
same-input retry materially changing semantics
same indices with different visible fingerprints/content
manual edit followed by unexpected reconcile path
runtime generation changed but expected handoff absent
same generation but telemetry claimed as cross-reload proof
visible chronology contradiction despite state-protection PASS
scoped PASS line contradicting a stronger RAW-visible symptom
History mutation NONE while output behavior changes materially
runtime identity SAME while output behavior changes materially
cache STABLE/NO_BREAK while semantic output anomaly appears
new independent natural specimen resembling a preserved family
required diagnostic surface missing for a named live-gate step
```

Any trigger requires preservation/review before unrelated development continues under the existing immediate-capture rule.

---

## 14. Review completion vocabulary

This standard uses only review-completeness states, not defect severity.

```text
DIAG_REVIEW_COMPLETE_NO_NEW_FINDING
DIAG_REVIEW_COMPLETE_FINDING_PRESERVED
DIAG_REVIEW_NEEDS_CONTEXT
DIAG_REVIEW_BLOCKED
```

### `DIAG_REVIEW_COMPLETE_NO_NEW_FINDING`

All supplied packets in the bounded episode were reviewed and no new evidence item beyond already-known expected behavior was identified.

This does **not** mean global runtime health.

### `DIAG_REVIEW_COMPLETE_FINDING_PRESERVED`

Review identified a new anomaly/control/gate/evidence fact and preserved it under an owning repository authority.

This does not encode WATCH/FIX/BLOCKER severity.

### `DIAG_REVIEW_NEEDS_CONTEXT`

A material interpretation depends on missing RAW, missing neighbor/retry packet, unknown physical action, stale/unbound diagnostic identity, or other recoverable context.

### `DIAG_REVIEW_BLOCKED`

The evidence cannot be safely bound/reconstructed enough to perform the requested review.

Precedence:

```text
BLOCKED
> NEEDS_CONTEXT
> COMPLETE_FINDING_PRESERVED
> COMPLETE_NO_NEW_FINDING
```

---

## 15. Recommended review card

For one bounded episode:

```text
Review episode ID:
Purpose / active gate:

Packet sequence:
- capture / generation / user→assistant / mode / action

User-intent sequence:
- bounded semantic intent per distinct request

Visible-output sequence:
- semantic frame per generation
- suspicious/healthy visible facts

Adjacent deltas:
- changed facts
- unchanged facts
- unresolved facts

Scoped diagnostic interpretation:
- binding/runtime
- edit/representation
- history/cache
- runtime prompt identity
- lifecycle/chronology
- telemetry/reload
- timing/hotspots

Controls:
- retry/reroll
- neighbor/next-turn
- manual edit
- reload boundary

Observable symptom/control:
Attribution maturity:
Recurrence handoff:
Gate effect:
Preservation sink:
Explicit non-claims:
Review result:
```

---

## 16. Canonical 2026-08-27 example

Episode:

```text
@2158 → @2159
current request = final program statistics summary
output = matching metrics-heavy final-summary frame

@2160 → @2161 first generation
current request = reactions to dawn-cam / no-ceiling mindset / relationship future / chemistry
output = begins by replaying prior metrics-heavy final-summary frame, then incorporates current themes

@2160 → @2161 same-input retry
current request = unchanged
output = directly centers dawn-cam / mindset / relationship / chemistry
```

Retry invariants:

```text
Pre snapshot: REPEAT-SEND · READ HIT
request recurrence hash: same
History mutation: NONE
Cache topology: STABLE · 60/60 · 100%
Cache break: NONE
runtime identity tiers: SAME
SimCore contribution: NO_BREAK
```

Review result:

```text
visible symptom: PARTIAL PREVIOUS-TURN SEMANTIC FRAME REPLAY
same-input retry: symptom cleared
SimCore state/history/prompt change between generations: not observed
root cause: unproven
family recurrence: handed to SYS-16 and confirmed using independent historical specimen
v0.64.7 cross-reload attribution: unproven
```

This example exists specifically to prevent future reviewers from concluding `nothing happened` merely because the retry diagnostic itself is internally healthy.

---

## 17. Non-goals

This standard does not:
- parse logs automatically;
- score anomaly severity;
- assign root cause automatically;
- treat all differences as defects;
- require every timing field to be copied into evidence documents;
- turn retry into recurrence;
- override user/operator clarification about physical actions;
- infer provider/model internals;
- close live gates;
- authorize runtime fixes;
- change `release-simcore`;
- replace SYS-20 intake, SYS-16 recurrence, SYS-21 forensic consistency, Anomaly Watch, or Deferred Ledger.

A future read-only comparison helper may be considered separately, but semantic user-intent/output review remains human-reviewed unless a later design explicitly establishes a safe bounded automation surface.

---

## 18. Frozen operating shorthand

For day-to-day use, the full standard compresses to:

```text
1. BIND every packet.
2. READ current input before diagnostic status.
3. READ visible output for semantic/structural correctness.
4. ORDER all related packets; never latest-only.
5. COMPARE adjacent packets on fixed axes.
6. RECORD what changed AND what stayed invariant.
7. INTERPRET PASS/STABLE/COMMITTED only within subsystem scope.
8. USE retry/edit/reload/neighbor observations as controls, not shortcuts.
9. SEPARATE symptom from attribution.
10. HAND recurrence/classification/gate effects to their owning authorities.
11. PRESERVE any suspicious or useful new evidence before moving on.
```

The operational motto is:

> **Do not ask only “what does the diagnostic say?” Ask “does the diagnostic, RAW content, and sequence tell the same story?”**
