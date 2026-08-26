# SYS-28 — Verification Debt Index — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · REVIEWED VERIFICATION-DEBT VIEW · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-28
Idea          = Verification Debt Index
Size          = SMALL
Importance    = 4 / HIGH
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

Direct upstream verification boundaries:
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS17_MISSING_EVIDENCE_SLOT_ANALYZER_DESIGN.md`
- `docs/SIMCORE_SYS22_TEST_INTENT_MANIFEST_DESIGN.md`
- `docs/SIMCORE_DEFERRED_LEDGER.md`
- `docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md`

Related systems SYS-28 must compose with rather than replace:
- current live/release/architecture gate authorities;
- actual CI/test/run/live evidence;
- M-13 Evidence Index navigation;
- SYS-08 Work-Item Close Receipt;
- SYS-12 Current-State Snapshot Page;
- SYS-21 Forensic Classification Consistency Check.

---

## 1. Problem

SimCore deliberately distinguishes proof kinds, claim kinds, required evidence slots, test intent, natural live evidence, release proof, and verification WATCHes.

That prevents false PASS promotion, but it also means unresolved verification obligations can be scattered across several authorities.

Current examples are intentionally different:

```text
v0.64.7 real-long-chat reload/cache-continuity proof
→ required by the active live gate
→ currently pending
→ blocks the next runtime release and physical M2-3

R2.1 genuine delegated-release E2E proof
→ explicitly required eventually
→ can only be obtained on the next genuine runtime release
→ does not block the current v0.64.7 live gate

S-10 / S-11 / M-10 / M-11 / M-13 focused/direct permanent-CI execution
→ selected direct-execution claims are NOT_CLAIMED
→ preserved as verification WATCH
→ not current runtime correctness blockers

natural B_END revalidation
→ useful deferred confirmation
→ explicitly non-blocking
→ waiting for a natural sample is not permission to stall M2 indefinitely
```

A flat list called `missing verification` would destroy those distinctions.

Failure modes include:

```text
NONCLAIM → BLOCKER PROMOTION
A deliberately NOT_CLAIMED focused execution is presented as a product blocker.

OPTIONAL → REQUIRED PROMOTION
A useful natural revalidation sample is treated as mandatory close evidence.

GATED → OVERDUE PROMOTION
Proof that cannot exist before a named future event is described as stale debt.

GENERIC PASS ERASURE
A broad CI PASS hides the fact that one narrower direct-execution claim remains NOT_CLAIMED.

GLOBAL QUALITY SCORE
Unrelated proof gaps are collapsed into a percentage or red/yellow/green quality score.

DUPLICATE GATE AUTHORITY
The debt index begins deciding which work may proceed instead of reflecting the owning gate.
```

SYS-28 defines a compact reviewed **Verification Debt Index** that records unresolved verification obligations without changing their proof semantics, due posture, blocker status, or owning authority.

---

## 2. Core invariant

```text
explicit verification obligation or reviewed verification WATCH
+ current proof/slot state
+ owning authority
+ due/trigger posture
+ blocker/non-blocker posture from the owning authority
→ one bounded verification-debt entry

SYS-28
!= evidence discovery
!= evidence-slot analyzer
!= proof-fitness matrix
!= test-intent authority
!= gate engine
!= anomaly severity classifier
!= global quality score
!= automatic priority engine
!= CI log scraper
!= repository writer
```

Canonical question:

> Which verification obligations are still unresolved, what exact claim remains unproven or not claimed, when does that obligation matter, and does its owning authority say it blocks anything now?

SYS-28 does not answer:

> Should this item be a blocker?

That answer comes from the owning gate/policy/evidence authority.

---

## 3. Verification debt is not every unproven thing

Frozen rule:

```text
unproven fact
!= verification debt automatically
```

An entry requires one of:

```text
A. explicit required proof obligation;
B. explicit reviewed verification WATCH/non-claim worth preserving;
C. explicit deferred revalidation obligation;
D. explicit future-event proof requirement.
```

Do not create debt merely because:
- no test exists for an imaginable case;
- an Evidence Index row is absent;
- a document contains `PENDING`;
- a test has an explicit non-claim;
- a human can imagine stronger evidence.

This preserves the SYS-17 rule:

```text
unregistered absence
!= missing evidence
```

and the SYS-22 rule:

```text
explicit non-claim
!= required evidence slot
```

---

## 4. Relationship to SYS-13 Verification Proof Matrix

SYS-13 owns proof fitness:

```text
proof kind × claim kind
→ DIRECT / CONDITIONAL / SUPPORTING / NONE
```

SYS-28 consumes that semantic boundary but never rewrites it.

A debt entry must name the exact unresolved claim or obligation rather than generic wording such as:

```text
needs more testing
verification incomplete
CI uncertain
```

Good examples:

```text
CK: named natural live reload/cache-continuity control not yet passed

CK: focused standalone tooling test direct permanent-CI execution not claimed

CK: genuine delegated release E2E proof not yet established
```

A proof already known to be `NONE` for a claim under SYS-13 cannot be presented as satisfying that debt.

---

## 5. Relationship to SYS-17 Missing Evidence Slot Analyzer

SYS-17 answers:

```text
for one bounded scope,
which explicitly registered required evidence slots are
SATISFIED / MISSING / NOT_CLAIMED / CONFLICTED / BLOCKED / NOT_APPLICABLE?
```

SYS-28 answers:

```text
across reviewed current verification obligations,
which unresolved items are worth carrying forward,
with what due/blocking posture?
```

Therefore:

```text
SYS-17 slot result
!= automatically a SYS-28 debt entry
```

A slot becomes a debt entry only when the owning scope/policy says the unresolved state should remain visible beyond that immediate analysis.

Likewise:

```text
SYS-28 debt entry
!= proof that a SYS-17 slot exists
```

WATCH-only debt may exist because a direct-execution non-claim is intentionally preserved even when it does not block a close scope.

---

## 6. Relationship to SYS-22 Test Intent Manifest

SYS-22 owns what a test may and may not claim.

SYS-28 must preserve explicit non-claims rather than trying to erase them.

Example:

```text
focused standalone test exists
+ test intent says semantic focused behavior is covered
+ permanent CI execution is not proven
→ debt may be DIRECT_EXECUTION_NOT_CLAIMED / WATCH
```

Incorrect treatment:

```text
test exists
→ assume CI executes it
```

or:

```text
CI does not directly prove execution
→ therefore test itself is invalid
```

Both are prohibited.

---

## 7. v1 artifact form

The useful v1 application is one curated living repository document:

```text
docs/SIMCORE_VERIFICATION_DEBT_INDEX.md
```

It is maintained from reviewed authorities and records only durable unresolved obligations worth carrying across work sessions.

No executable scanner, test runner, CI integration, log parser, GitHub API reader, automatic severity ranking, or repository writer is required for v1.

This establishes:

```text
APPLY CLASS = NR_DOC_ONLY
```

Why not executable in v1:
- blocker/non-blocker posture is source-authority semantics, not safe filename/token inference;
- future-event/gated obligations require reviewed trigger meaning;
- WATCH vs required debt must preserve human-reviewed intent;
- SYS-17 already owns deterministic registered-slot comparison when materialized later;
- another executable aggregator would add little value before the curated semantic contract exists.

A later read-only renderer may consume reviewed data, but that is separate implementation work.

---

## 8. Debt entry schema

Each v1 entry contains exactly these fields:

```text
Debt ID
Debt title
Claim / obligation
Debt kind
Current proof state
Due posture
Blocking posture
Owning authority
Current evidence / proof refs
Resolution condition
Next review trigger
Notes / explicit non-claims
```

### 8.1 Debt ID

Stable index-local identifier:

```text
VDEBT-001
VDEBT-002
```

It is navigation identity only.
It must not become a gate/work/evidence/release numbering authority.

### 8.2 Claim / obligation

One exact bounded statement of what remains unresolved.

Prefer existing SYS-13 claim-kind IDs when materialized.
Otherwise use a bounded semantic claim with source ref.

### 8.3 Debt kind

Exactly six v1 kinds:

```text
REQUIRED_PROOF_PENDING
DIRECT_EXECUTION_NOT_CLAIMED
COVERAGE_GAP_REVIEWED
REVALIDATION_PENDING
FUTURE_EVENT_PROOF
PROOF_CONFLICT
```

#### `REQUIRED_PROOF_PENDING`

A currently required proof has not yet been established.

Example:
- active v0.64.7 real-long-chat close proof.

This kind does not itself mean blocker; `Blocking posture` carries that source-owned fact.

#### `DIRECT_EXECUTION_NOT_CLAIMED`

A specific direct-execution claim is intentionally not established even though adjacent generic verification may be green.

Primary current example family:
- focused standalone tooling-test direct permanent-CI execution WATCHes.

#### `COVERAGE_GAP_REVIEWED`

A reviewed verification surface lacks intended coverage that an authority has explicitly decided should remain visible.

Do not infer from arbitrary missing tests.

#### `REVALIDATION_PENDING`

Previously addressed/validated behavior has a named later revalidation obligation or useful deferred confirmation.

Example:
- natural B_END revalidation.

#### `FUTURE_EVENT_PROOF`

The proof is explicitly required but cannot reasonably exist until a named future event.

Example:
- R2.1 genuine delegated release proof on the next genuine runtime release.

#### `PROOF_CONFLICT`

Two reviewed proof/evidence sources materially conflict about the same required claim and the conflict has not been resolved.

This kind must not decide which source wins; use the owning forensic/gate authority.

---

## 9. Current proof state

SYS-28 reuses evidence semantics rather than inventing global PASS.

Allowed v1 debt-facing states:

```text
MISSING
NOT_CLAIMED
BLOCKED
CONFLICTED
PENDING_REVALIDATION
WAITING_ON_TRIGGER
```

`PROVEN` is not an open-debt state. Once the owning obligation is truly satisfied, the entry moves to resolved history rather than remaining active merely for bookkeeping.

Important:

```text
NOT_CLAIMED
!= MISSING
!= FAILED
!= BLOCKER
```

---

## 10. Due posture

Exactly five v1 due postures:

```text
DUE_NOW
DUE_BEFORE_NAMED_TRANSITION
WAITING_ON_NAMED_EVENT
DEFERRED_REVIEW
OPTIONAL_NATURAL_SAMPLE
```

### `DUE_NOW`

The owning authority requires proof for the current close/decision.

### `DUE_BEFORE_NAMED_TRANSITION`

The debt may coexist with current work but must be resolved before a named later transition.

Example:
- post-M2-3 genuine-edit direct recheck before M2-4.

### `WAITING_ON_NAMED_EVENT`

The proof cannot be fairly judged overdue until a named event occurs.

Example:
- genuine release E2E proof waiting for the next genuine release.

### `DEFERRED_REVIEW`

Reviewed debt is intentionally deferred and should be reconsidered at a named later policy/checkpoint event.

### `OPTIONAL_NATURAL_SAMPLE`

Useful evidence to capture when it appears naturally; do not manufacture a stall merely to obtain it.

---

## 11. Blocking posture

Exactly four v1 values:

```text
BLOCKS_CURRENT_TRANSITION
BLOCKS_NAMED_FUTURE_TRANSITION
NON_BLOCKING_WATCH
NON_BLOCKING_DEFERRED
```

This value must be copied from / justified by the owning authority.
SYS-28 never promotes or demotes it independently.

Examples:

```text
v0.64.7 live proof pending
→ BLOCKS_CURRENT_TRANSITION
→ named transition: next runtime release / physical M2-3

post-M2-3 genuine-edit recheck
→ BLOCKS_NAMED_FUTURE_TRANSITION
→ named transition: M2-4

focused standalone CI direct execution not claimed
→ NON_BLOCKING_WATCH

natural B_END revalidation
→ NON_BLOCKING_DEFERRED
```

Frozen rule:

```text
Debt Kind
!= Blocking Posture
```

The same debt kind can have different blocking posture in different scopes.

---

## 12. Resolution condition

Every active debt entry requires an explicit close condition.

Examples:

```text
one real long-chat scenario classified PASS with named required diagnostic/evidence

exact focused test/step execution proven by immutable CI/run evidence

next genuine runtime release executes delegated path and yields genuine E2E proof

natural B_END sample captured and reviewed under the preserved revalidation contract
```

Bad resolution conditions:

```text
looks good
more confidence
probably covered
CI green
later
```

If the resolution condition cannot be stated without guessing, the entry is not ready for the canonical index.

---

## 13. Review trigger

Every entry must identify when it should be revisited.

Allowed forms:

```text
ON_CURRENT_GATE_REVIEW
ON_NAMED_CHECKPOINT_CLOSE:<id>
ON_NAMED_RELEASE:<id/next-genuine-release>
ON_CI_OR_HARNESS_POLICY_CHANGE
ON_NATURAL_SAMPLE
ON_RECURRENCE
MANUAL_POLICY_REVIEW:<reason>
```

This prevents future-event debt from being repeatedly treated as overdue every session.

---

## 14. No scalar severity or debt score

SYS-28 deliberately prohibits:

```text
debt points
quality percentage
red/yellow/green aggregate
numeric risk score
count-based release readiness
```

Reason:

```text
1 current live-gate blocker
may matter more than
10 optional natural revalidations
```

and:

```text
5 NOT_CLAIMED focused execution WATCHes
must not outweigh
one explicit authoritative PASS
for an unrelated claim
```

The index is a semantic navigation surface, not a metric dashboard.

---

## 15. Active vs resolved history

The living index has two bounded sections:

```text
ACTIVE VERIFICATION DEBT
RECENTLY RESOLVED / SUPERSEDED DEBT
```

When resolved:
- preserve the Debt ID;
- record resolution evidence/ref;
- record resolved date/work/release/checkpoint when useful;
- do not delete immediately if the history helps explain a prior WATCH/blocker.

Resolved history must be bounded and periodically move to natural evidence/close records rather than grow into an all-time verification ledger.

SYS-28 is not a replacement for actual evidence history.

---

## 16. Current examples validating the model

These examples validate the design vocabulary only; they are not materialized index rows in this design transaction.

### 16.1 v0.64.7 live close

```text
Debt kind       = REQUIRED_PROOF_PENDING
Proof state     = MISSING
Due posture     = DUE_NOW
Blocking        = BLOCKS_CURRENT_TRANSITION
Owner           = CURRENT_DEVELOPMENT / current live-gate authority
Resolution      = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT classified and closed
```

This is legitimate current blocking verification debt.

### 16.2 R2.1 genuine release proof

```text
Debt kind       = FUTURE_EVENT_PROOF
Proof state     = WAITING_ON_TRIGGER
Due posture     = WAITING_ON_NAMED_EVENT
Blocking        = NON_BLOCKING_DEFERRED for the current v0.64.7 gate
Owner           = current R2.1 operator/release authority
Resolution      = next genuine runtime release completes delegated release E2E proof
```

Incorrect:

```text
R2.1 proof pending
→ release system broken
```

### 16.3 focused/direct CI execution WATCHes

```text
Debt kind       = DIRECT_EXECUTION_NOT_CLAIMED
Proof state     = NOT_CLAIMED
Due posture     = DEFERRED_REVIEW
Blocking        = NON_BLOCKING_WATCH
Owner           = verification WATCH ledger
```

A generic permanent-CI PASS must not erase the direct-execution non-claim.

### 16.4 natural B_END revalidation

```text
Debt kind       = REVALIDATION_PENDING
Proof state     = PENDING_REVALIDATION
Due posture     = OPTIONAL_NATURAL_SAMPLE
Blocking        = NON_BLOCKING_DEFERRED
```

Do not stall M2 waiting solely for a rare natural occurrence.

### 16.5 post-M2-3 genuine-edit close control

```text
Debt kind       = REVALIDATION_PENDING
Proof state     = WAITING_ON_TRIGGER
Due posture     = DUE_BEFORE_NAMED_TRANSITION
Blocking        = BLOCKS_NAMED_FUTURE_TRANSITION
Named transition = M2-4
Trigger         = M2-3 physical extraction lands and stabilizes
```

It is visible now as a future obligation but is not current M2-3 implementation proof.

---

## 17. Relationship to SYS-12 Current-State Snapshot

SYS-12 should not copy the entire verification-debt index.

It may project only high-value current posture, for example:

```text
current blocking verification obligation
current named future blocker
current release-system future-event proof posture
verification WATCH count or ref only when materially useful
```

The authoritative detail remains SYS-28's future materialized index plus the owning source authorities.

A snapshot row must not turn `NON_BLOCKING_WATCH` into a current blocker for brevity.

---

## 18. Relationship to SYS-08 close receipt

When a bounded work item closes with an explicitly preserved verification non-claim or deferred proof:

```text
SYS-08 close receipt
→ may reference/add/review the relevant SYS-28 debt entry
```

But the close receipt does not automatically create debt.

Likewise a debt entry does not mean the work item failed to close if the owning close authority explicitly allows the unresolved verification posture.

---

## 19. Relationship to anomaly / forensic classification

Verification debt is not anomaly severity.

```text
NON_BLOCKING_WATCH verification debt
!= project WATCH anomaly automatically

PROOF_CONFLICT
!= runtime FIX/BLOCKER automatically

BLOCKS_CURRENT_TRANSITION
!= root-cause attribution
```

If conflicting proof reveals a runtime defect, SYS-21 / Deferred Ledger / anomaly authorities own the evidence-to-severity reasoning.

SYS-28 only carries the unresolved verification obligation.

---

## 20. Update discipline

Review the future materialized index when one of these happens:

```text
required proof is established or disproven
current gate changes
named transition/checkpoint closes
future trigger event occurs
verification WATCH is intentionally promoted/dismissed
CI/harness policy materially changes a direct-execution claim
new reviewed proof conflict appears
close receipt explicitly carries deferred verification forward
```

Do not update merely because:
- an unrelated test passed;
- a new commit exists;
- a document timestamp changed;
- a similar evidence sample appeared for another claim.

Close-step principle:

```text
update owning authority/evidence first
→ classify exact proof/debt effect
→ update Verification Debt Index
→ update compact snapshot/navigation only if required
```

The index never leads the source authority.

---

## 21. v1 verification for later application

When `SIMCORE_VERIFICATION_DEBT_INDEX.md` is materialized, verify:

```text
1. every active entry has an explicit source-owned obligation/WATCH basis
2. every entry names one bounded unresolved claim
3. proof state preserves MISSING vs NOT_CLAIMED vs WAITING_ON_TRIGGER
4. due posture is explicit
5. blocking posture cites/reflects owning authority
6. future-event proof is not described as overdue before trigger
7. optional natural sample is not promoted into current blocker
8. generic CI PASS does not erase narrower direct-execution non-claims
9. resolved entries cite actual resolution evidence
10. no global score or automatic severity exists
11. no plugin/runtime/release/CI/repository-writer behavior changes
12. release-simcore remains unchanged
```

Manual semantic review is sufficient for v1.
No real long-chat run is required solely to apply the index document.

---

## 22. Hard boundaries

SYS-28 must never become:

```text
evidence requirement inventor
proof-fit matrix replacement
evidence slot analyzer replacement
test-intent manifest replacement
CI coverage scanner
CI rerouter
release gate engine
roadmap priority engine
anomaly severity classifier
automatic issue creator
repository writer
runtime/plugin feature
global quality score
```

The index records reviewed debt; it does not manufacture it.

---

## 23. Unified classification freeze verdict

Source/design inspection confirms:

```text
SIZE          = SMALL
IMPORTANCE    = 4
DIFFICULTY    = 2
RUNTIME CLASS = NON_RUNTIME
DESIGN GATE   = FROZEN
APPLY CLASS   = NR_DOC_ONLY
```

Why `NR_DOC_ONLY`:
- core value is durable semantic distinction among unresolved verification obligations;
- blocker and due posture must reflect reviewed authority, not automatic inference;
- deterministic slot comparison is already separately owned by SYS-17;
- no executable scanner is needed to obtain v1 value;
- no CI/release/repository governance boundary needs to change.

---

## 24. Stop condition

```text
OPEN DESIGN QUESTIONS = 0
DESIGN = FROZEN
APPLICATION = NOT STARTED
```

Per Design Sweep First, stop SYS-28 here.
Materialization of `docs/SIMCORE_VERIFICATION_DEBT_INDEX.md` is a separate NON_RUNTIME application transaction after the active system-idea design sweep closes or priority is explicitly changed.

Production boundary remains unchanged:

```text
plugin bytes = unchanged
plugin version = unchanged
release-simcore = unchanged
runtime semantics = unchanged
release workflow authority = unchanged
repository writer authority = unchanged
v0.64.7 live gate = PENDING_REAL_LONG_CHAT
```
