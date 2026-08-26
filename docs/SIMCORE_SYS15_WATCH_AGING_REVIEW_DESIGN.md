# SYS-15 — WATCH Aging Review — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · EVENT-DRIVEN WATCH RELEVANCE / QUIESCENCE REVIEW · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-15
Idea          = WATCH Aging Review
Size          = SMALL
Importance    = 3 / MEDIUM
Difficulty    = 2 / EASY
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_ANOMALY_WATCH.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_SYS16_ANOMALY_RECURRENCE_CORRELATOR_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- `docs/SIMCORE_SYS14_EVIDENCE_FRESHNESS_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS02_DECISION_SUPERSESSION_GRAPH_DESIGN.md`
- current live/runtime/release evidence authorities
- future `SYS-20 Natural Evidence Intake Checklist Generator`

Existing authorities SYS-15 must not replace:
- `SIMCORE_ANOMALY_WATCH.md` / `SIMCORE_DEFERRED_LEDGER.md` as source anomaly/deferred memory;
- SYS-16 as same-family recurrence / specimen-independence / cross-family-correlation authority;
- SYS-21 as forensic classification-consistency review;
- SYS-28 as verification-debt / due / blocking-posture authority;
- SYS-14 as claim-scoped evidence freshness authority;
- SYS-02 as decision / supersession lineage authority;
- owning runtime/live/release/gate authorities as actual WATCH / DEFER / FIX / BLOCKER consequence authority;
- dedicated mitigation / regression-control evidence as proof authority.

---

## 1. Problem

SimCore deliberately preserves suspicious evidence immediately, before recurrence exists.

That policy is correct:

```text
first suspicious natural specimen
→ preserve now
→ recurrence may be reviewed later
```

But a long-lived repository accumulates WATCH items with very different current meanings:

```text
one-off anomaly that has never naturally recurred
mitigated defect whose historical specimen must remain preserved
WATCH with a named future natural revalidation trigger
verification-coverage WATCH that is intentionally non-blocking
WATCH whose subsystem/contract was later superseded
WATCH that just acquired a new independent recurrence
WATCH whose current relevance cannot be determined because authority changed
old direct evidence that remains historically valid but no longer requires active operational attention
```

A naive aging mechanism creates two opposite failure modes.

### False escalation

```text
WATCH has existed for many days / versions
→ therefore severity must increase
→ therefore FIX / BLOCKER
```

This is invalid. Time is not impact, recurrence, attribution, or blocker evidence.

### Silent forgetting

```text
WATCH has not recurred for a long time
→ delete it / call it DISMISSED_NO_DEFECT
```

This is also invalid. Absence of recurrence does not disprove an observed event, and historical evidence must remain preserved.

SYS-15 defines one bounded human-reviewed **WATCH Aging Review** that answers:

```text
Does this WATCH still need active living attention?
Has a named review trigger occurred?
Has recurrence / mitigation / supersession / phase movement changed its relevance?
Can the item become quiescent or historical while preserving the evidence?
Does the owning classification need re-review?
```

without calculating severity from elapsed time.

---

## 2. Core invariant

```text
one source-owned WATCH / deferred-watch item
+ exact current source identity
+ reviewed recurrence posture when relevant
+ reviewed mitigation / supersession / phase facts
+ reviewed current operational relevance
+ explicit next review trigger
+ optional elapsed-time context
→ WATCH aging review posture

WATCH AGING REVIEW
!= anomaly dismissal engine
!= severity engine
!= recurrence engine
!= root-cause engine
!= verification-debt engine
!= evidence-freshness engine
!= gate engine
!= automatic archive/delete action
!= runtime repair selector
!= repository writer
```

Canonical question:

> Given everything now known, how should this preserved WATCH participate in current living attention, and what event should cause the next review?

SYS-15 does not answer:

> Was the original symptom real?

> What caused it?

> Should runtime be patched?

> Is the gate blocked?

> Is old evidence reusable for a new claim?

Those remain with their owning authorities.

---

## 3. Why v1 is `NR_DOC_ONLY`

The difficult part is semantic current relevance, not arithmetic age.

Examples:
- a one-off semantic excursion can remain a valid historical WATCH indefinitely;
- a mitigation can make an item operationally quiescent while preserving revalidation debt;
- a new independent recurrence can reactivate a dormant family immediately;
- a superseded architecture owner can make an old current-action note historical without invalidating the old specimen;
- a verification-coverage WATCH may remain intentionally non-blocking through many releases.

A script can count days, but cannot safely decide those meanings without reproducing SYS-16/SYS-21/SYS-28/SYS-14 semantics and inventing authority.

Therefore useful v1 is a reviewed document contract / living review table, conceptually:

```text
docs/SIMCORE_WATCH_AGING_REVIEW.md
```

No daemon, scheduler, cron job, GitHub Action, repository crawler, automatic status mutation, LLM similarity judge, runtime telemetry consumer, or repository writer is required.

Apply class:

```text
NR_DOC_ONLY
```

A later deterministic reminder/report tool could be designed only if it consumes explicit reviewed review dates/triggers and does not infer disposition or severity. That is outside SYS-15 v1.

---

## 4. Aging is event-driven first, time-aware second

Frozen rule:

```text
elapsed time
!= severity
!= recurrence
!= dismissal
!= staleness
!= blocker posture
```

Elapsed time may be recorded only as orientation metadata:

```text
firstObservedAt
lastMeaningfulEvidenceAt
lastReviewedAt
optional nextCalendarReviewAt
```

The primary review inputs are semantic events.

Canonical event-driven triggers include:

```text
new independent natural specimen
SYS-16 recurrence posture change
new healthy / contrary control
mitigation deployed
post-mitigation validation arrives
owning contract / subsystem materially changes
owning decision is superseded / retired
current phase/checkpoint crosses a named boundary
named future release / M2 checkpoint / live gate occurs
verification debt is satisfied / changed
new evidence changes current relevance
source classification changes
```

A calendar review may prevent a WATCH from becoming invisible, but reaching the date means only:

```text
REVIEW NOW
```

never:

```text
PROMOTE / DISMISS / ARCHIVE AUTOMATICALLY
```

No global 30/60/90-day severity thresholds exist in v1.

---

## 5. Review object and identity

One review is bounded to one source-owned item or one explicitly reviewed anomaly family.

Minimum identity:

```text
Watch ID / family ID
Source authority path
Source authority commit/blob when available
Current source classification
First observed identity/date
Latest meaningful evidence identity/date
Last aging review identity/date when any
```

If one family has multiple specimens, SYS-16 owns the specimen membership and recurrence posture.

SYS-15 consumes that posture; it does not count or merge specimens itself.

Duplicate references to the same event do not refresh `lastMeaningfulEvidenceAt` merely because another document was edited later.

---

## 6. Mandatory reviewed dimensions

Each aging review evaluates exactly these semantic dimensions.

### 6.1 Current operational relevance

Question:

```text
Can this issue still affect a current/future supported path,
current gate,
current architecture owner,
current verification obligation,
or named future validation trigger?
```

Values:

```text
RELEVANCE_CURRENT
RELEVANCE_TRIGGER_ONLY
RELEVANCE_HISTORICAL_ONLY
RELEVANCE_UNRESOLVED
```

`RELEVANCE_TRIGGER_ONLY` means no current action is useful, but one named future event should reopen review.

`RELEVANCE_HISTORICAL_ONLY` does not mean the original anomaly was false.

### 6.2 Recurrence posture

When recurrence is material, cite SYS-16 exactly.

Examples:

```text
RECURRENCE_FIRST_ONLY
RECURRENCE_CANDIDATE
RECURRENCE_CONFIRMED
RECURRENCE_SERIES_ESTABLISHED
RECURRENCE_REVIEW_REQUIRED
NOT_APPLICABLE
```

Frozen rule:

```text
RECURRENCE_CONFIRMED
→ aging review becomes newly relevant
!= automatic FIX / BLOCKER
```

Likewise:

```text
RECURRENCE_FIRST_ONLY for a long time
!= DISMISSED_NO_DEFECT
```

### 6.3 Mitigation / resolution posture

Review whether the source has a recorded mitigation or resolving evidence.

Values:

```text
NO_MITIGATION
MITIGATION_DEPLOYED_REVALIDATION_PENDING
MITIGATION_VALIDATED_FOR_NAMED_SCOPE
RESOLVED_NO_DEFECT_WITH_EVIDENCE
SUPERSEDED_CONTEXT
MITIGATION_STATE_UNRESOLVED
```

SYS-15 does not invent these facts. It cites the owning evidence.

`MITIGATION_DEPLOYED_REVALIDATION_PENDING` is a canonical reason to become trigger-only rather than deleted.

### 6.4 Supersession / owner relevance

Use reviewed current authority / SYS-02 lineage where relevant.

Questions:
- does the original subsystem/decision still exist?
- was the affected path removed or ownership moved?
- does a successor contract preserve the same risk?
- did the WATCH become historical only because the old path is no longer current?

Frozen rule:

```text
old owner superseded
!= old specimen invalid
```

Historical evidence remains intact.

### 6.5 Verification / gate relevance

Use SYS-28 / gate authority when material.

A WATCH may be:

```text
current blocking obligation
current non-blocking observation
future-event proof
optional natural sample
verification-coverage NOT_CLAIMED
not a verification obligation at all
```

SYS-15 copies that relevance; it never calculates blocker posture from age.

### 6.6 Evidence-freshness relevance

Use SYS-14 only when the WATCH is being reused to support a current claim.

A historical WATCH can remain valid history even when it is stale for a new claim.

Frozen rule:

```text
STALE_FOR_SCOPE
!= delete historical WATCH
```

### 6.7 Next review trigger

Every active/quiescent WATCH must name one bounded next review trigger or explicitly state why none is required.

Preferred trigger forms:

```text
ON_NATURAL_RECURRENCE
ON_POST_M2_3_REVALIDATION
ON_NEXT_GENUINE_RELEASE
ON_OWNER_CONTRACT_CHANGE
ON_POST_MITIGATION_NATURAL_SAMPLE
ON_NAMED_GATE_CLOSE
ON_NEW_CONTRARY_EVIDENCE
ON_OPTIONAL_CALENDAR_REVIEW
NONE_HISTORICAL_ONLY
```

Free-form trigger text is allowed only when no canonical form fits; it must still name an observable event.

---

## 7. Frozen v1 aging postures

Exactly five top-level postures:

```text
WATCH_AGING_ACTIVE
WATCH_AGING_QUIESCENT
WATCH_AGING_REVIEW_REQUIRED
WATCH_AGING_HISTORICALIZE_CANDIDATE
WATCH_AGING_BLOCKED
```

### `WATCH_AGING_ACTIVE`

Current operational relevance exists and the item should remain visible in active living WATCH surfaces.

Possible reasons:
- active current behavior risk;
- current gate/verification relevance;
- new recurrence or contrary evidence under review;
- current owner still contains the affected path and named review work remains relevant.

Meaning only:

```text
keep active attention
```

It does not mean FIX/BLOCKER.

### `WATCH_AGING_QUIESCENT`

The evidence remains valid but there is no useful immediate action. A precise future trigger should reopen review.

Canonical examples:
- one-off generation anomaly with no independent recurrence;
- rare natural B_END revalidation intentionally deferred;
- mitigation deployed with a natural revalidation trigger that should not stall current architecture work;
- verification-coverage WATCH deliberately waiting for a separate CI-system decision.

Quiescent items remain discoverable and preserved.

### `WATCH_AGING_REVIEW_REQUIRED`

New information or a review trigger occurred and the living disposition must be re-reviewed by its owner.

Examples:
- SYS-16 moves from `FIRST_ONLY` to `CONFIRMED`;
- new direct evidence contradicts a previous low-confidence assumption;
- current owner/contract changes materially;
- mitigation validation arrives;
- named phase/gate trigger fires.

This posture does not decide the new WATCH/FIX/BLOCKER classification.

### `WATCH_AGING_HISTORICALIZE_CANDIDATE`

The item appears eligible to leave active living attention while the evidence remains preserved historically.

This requires reviewed support such as:

```text
current operational relevance = HISTORICAL_ONLY
and
no active current/future verification or gate obligation
and
no unresolved recurrence/attribution fact that requires living monitoring
and
owner/contract supersession or resolved evidence is explicit
```

Important:

```text
HISTORICALIZE_CANDIDATE
!= DISMISSED_NO_DEFECT
!= delete evidence
```

The owning document/lifecycle authority performs any actual movement or status update.

### `WATCH_AGING_BLOCKED`

A trustworthy aging review cannot be completed because a material source fact is unresolved.

Examples:
- source evidence identity cannot be resolved;
- current owner/supersession state is ambiguous;
- recurrence references may duplicate one event and independence is unresolved;
- mitigation/revalidation state conflicts across authorities.

Fail closed. Do not age out or escalate the item by guess.

---

## 8. Historicalization discipline

SYS-15 exists partly to reduce living WATCH clutter without erasing evidence.

Canonical lifecycle:

```text
active WATCH
→ quiescent trigger-only WATCH
→ historicalization review
→ historical preserved record
```

when the evidence supports it.

Forbidden lifecycle:

```text
old WATCH
→ delete
```

or:

```text
no recurrence observed recently
→ DISMISSED_NO_DEFECT
```

SYS-21 already requires resolving evidence for `DISMISSED_NO_DEFECT`.

If an item is historicalized because its owner/path was retired, preserve at minimum:

```text
original source identity
last living classification
why active monitoring ended
supersession/resolution authority
final known recurrence posture
future reactivation condition if any
```

If the same family later reappears on a successor path, do not silently rewrite the historical record. Create/reopen the appropriate current living item with SYS-16/SYS-02 lineage as applicable.

---

## 9. Recurrence reactivation rule

SYS-16 is a primary input to SYS-15.

Canonical progression:

```text
WATCH_AGING_QUIESCENT
+ new independent qualifying specimen
→ SYS-16 re-review
→ if recurrence posture changes materially
→ WATCH_AGING_REVIEW_REQUIRED
```

Do not skip directly to:

```text
BLOCKER
```

The owning anomaly/gate authority decides impact after reviewing the new recurrence and current context.

Same-input reroll/regeneration remains a control and does not reactivate a natural recurrence count by itself.

---

## 10. Mitigation and revalidation rule

A deployed mitigation can change attention posture without erasing the original defect.

Typical pattern:

```text
direct defect evidence
→ mitigation deployed
→ current operational exposure reduced
→ named natural revalidation remains
```

Possible aging result:

```text
WATCH_AGING_QUIESCENT
Next trigger = ON_POST_MITIGATION_NATURAL_SAMPLE
```

This does not mean:

```text
mitigation = live validation complete
```

When validation arrives:

```text
trigger fires
→ WATCH_AGING_REVIEW_REQUIRED
→ owning authority decides whether regression control / historicalization / further WATCH is appropriate
```

---

## 11. Verification-coverage WATCH rule

Current repository examples include focused tooling tests whose permanent-CI direct execution is `NOT_CLAIMED` while generic CI is PASS and runtime/release impact is NONE.

These WATCHes must not become defects merely because they remain open across time.

A valid aging posture may be:

```text
WATCH_AGING_QUIESCENT
Current relevance = RELEVANCE_TRIGGER_ONLY
Next trigger = explicit future CI/harness-policy work or new claim that requires focused execution
```

If no such work is selected, preserving the non-claim is sufficient.

SYS-15 does not create a CI redesign task just to make the WATCH disappear.

---

## 12. Current representative examples

These examples validate the frozen model; they are not a materialized SYS-15 review table in this transaction.

### 12.1 `GENERATION_SEMANTIC_EXCURSION`

Current source evidence:

```text
one natural first-generation scope excursion
same-input regeneration corrected it
diagnostics otherwise healthy
Recovery/Representation attribution unproven
```

SYS-16 boundary:

```text
same-input regeneration != second independent recurrence
```

Reasonable SYS-15 posture under current evidence:

```text
WATCH_AGING_QUIESCENT
recurrence = RECURRENCE_FIRST_ONLY
next trigger = ON_NATURAL_RECURRENCE
```

This is not a dismissal.

### 12.2 visible scene-time regression guard gap

Historical symptom evidence is direct/high and a narrow mitigation was deployed.

Aging review must distinguish:

```text
original defect evidence
mitigation deployed
post-mitigation / explicit-past-scene validation state
current chronology ownership
```

The item may become trigger-only when current mitigation is stable, but the historical defect remains preserved.

### 12.3 natural B_END closure revalidation

Current repository explicitly marks this:

```text
DEFERRED_NON_BLOCKING
```

because waiting indefinitely for a rare natural B_END would stall M2.

Reasonable aging posture:

```text
WATCH_AGING_QUIESCENT
next trigger = natural B_END occurrence or relevant ownership change
```

Its age must not promote it into a blocker.

### 12.4 NR focused tooling-test discovery coverage

Current state:

```text
permanent CI = PASS
focused standalone direct CI execution = NOT_CLAIMED
runtime/release impact = NONE
```

Reasonable aging posture:

```text
WATCH_AGING_QUIESCENT
```

until a new verification claim or separate CI-system work makes the distinction actionable.

### 12.5 current v0.64.7 live gate

`PENDING_REAL_LONG_CHAT` is not an aged anomaly WATCH.

It is a current required gate obligation owned by the live-gate authority.

SYS-15 must not reclassify it as a stale WATCH merely because time passes.

This is a negative scope control for SYS-15.

---

## 13. Relationship to SYS-16

```text
SYS-16
= did the same reviewed family recur, with what specimen independence/correlation posture?

SYS-15
= given that recurrence posture and current context, does the WATCH still require active living attention and when should it be reviewed next?
```

SYS-15 must cite SYS-16 rather than recalculate recurrence.

---

## 14. Relationship to SYS-21

```text
SYS-21
= is the current recorded classification consistent with evidence?

SYS-15
= is the WATCH still operationally active, quiescent, review-due, or historicalization-eligible?
```

If SYS-15 sees stronger evidence that may make the source classification stale:

```text
WATCH_AGING_REVIEW_REQUIRED
→ source owner / SYS-21 consistency review
```

not automatic classification mutation.

---

## 15. Relationship to SYS-28

SYS-28 owns verification-debt semantics.

```text
SYS-28
= what verification obligation exists, when is it due, what does it block?

SYS-15
= how should a WATCH that points to that obligation participate in current attention over time/events?
```

A future-event proof may remain quiescent until its named event.

A current blocking debt cannot be historicalized merely because it is old.

---

## 16. Relationship to SYS-14

SYS-14 owns current reuse of historical evidence for a current claim.

SYS-15 never converts age into evidence staleness.

If a WATCH is cited as support for a new claim, use SYS-14 separately.

```text
old WATCH evidence
+ new current claim
→ SYS-14 freshness review
```

not:

```text
old WATCH
→ stale automatically
```

---

## 17. Relationship to future SYS-20

Future SYS-20 Natural Evidence Intake Checklist Generator should help preserve a new natural specimen completely at intake time.

SYS-15 should benefit from that by receiving better source identities, recurrence discriminators, reroll/control facts, and next-review triggers.

Boundary:

```text
SYS-20
= capture a new natural specimen correctly

SYS-15
= review an already-preserved WATCH across later events/time
```

SYS-15 does not define the full intake checklist.

---

## 18. Frozen v1 review record schema

One review row/block contains:

```text
Watch ID / Family ID
Source authority
Current source classification
First observed identity/date
Latest meaningful evidence identity/date
Last review identity/date
Optional elapsed-time context
Current relevance
SYS-16 recurrence ref / posture
Mitigation / resolution posture + refs
Supersession / owner relevance + refs
Verification / gate relevance + refs
SYS-14 freshness ref when current reuse is material
Next review trigger
Optional next calendar review date
Aging posture
Recommended owner action
Explicit non-claims
Reviewed at
```

Recommended owner actions are bounded to:

```text
KEEP_ACTIVE
KEEP_QUIESCENT_WITH_TRIGGER
REVIEW_SOURCE_CLASSIFICATION
REVIEW_HISTORICALIZATION
REQUEST_MISSING_SOURCE_FACT
```

Forbidden actions:

```text
AUTO_DISMISS
AUTO_PROMOTE_TO_FIX
AUTO_PROMOTE_TO_BLOCKER
AUTO_ARCHIVE_DELETE
AUTO_PATCH
AUTO_CLOSE_GATE
AUTO_RELEASE
```

---

## 19. Explicit non-claims

Every aging review preserves at least these non-equivalences:

```text
old != severe
old != harmless
no recent recurrence != no defect
quiescent != dismissed
historicalize candidate != delete
recurrence confirmed != blocker
mitigation deployed != revalidation complete
calendar review due != operational overdue defect
```

---

## 20. Application discipline

Later v1 application is document-only.

Prospective application should:
1. materialize one bounded WATCH-aging review surface/template;
2. seed only current living WATCH/deferred-WATCH items that genuinely benefit from aging review;
3. avoid retroactively rewriting historical evidence docs;
4. preserve source classifications until their owning authority explicitly changes them;
5. record next review trigger for each active/quiescent row;
6. keep actual runtime/live/release/CI state unchanged.

Do not create rows for every historical defect, PASS, gate, release, or evidence artifact merely to fill the table.

---

## 21. Verification for later application

Minimum later verification:

```text
all seeded source WATCH IDs/paths resolve
SYS-16 recurrence refs use frozen postures
no age-based automatic severity/dismissal rule exists
DISMISSED_NO_DEFECT requires source resolving evidence
current blocking gate/debt cannot be aged out
quiescent rows have bounded next-review triggers
historicalization candidates preserve original source evidence
no runtime/plugin/fixture/CI/release file changed
release-simcore unchanged
```

No live-chat validation is required solely for applying this document-only review system.

---

## 22. Freeze verdict

```text
SYS-15 WATCH AGING REVIEW
= DESIGN FROZEN
= SMALL / I3 / D2
= NON_RUNTIME
= NR_DOC_ONLY
= EVENT-DRIVEN FIRST / TIME-AWARE SECOND
= NO AGE-BASED SEVERITY
= NO AGE-BASED DISMISSAL
= NO RECURRENCE RECOMPUTATION
= NO CLASSIFICATION MUTATION
= NO REPOSITORY WRITER
= NO RUNTIME CHANGE
= OPEN DESIGN QUESTIONS 0
```

Application remains a later transaction under the active Design Sweep First hold.
