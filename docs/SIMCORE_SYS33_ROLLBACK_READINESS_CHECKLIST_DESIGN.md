# SYS-33 — Rollback Readiness Checklist — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · PRE-RELEASE ROLLBACK-READINESS CONTRACT · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-33
Idea          = Rollback Readiness Checklist
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

Direct upstream / adjacent authorities:
- `docs/SIMCORE_SYS31_VERSION_BUMP_BLAST_RADIUS_CHECK_DESIGN.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_RS2_4E_PROMOTION_REAL_RELEASE_ROLLBACK_RETIREMENT.md`
- `docs/SIMCORE_RELEASE_SYSTEM_V2_1_OPERATOR_DELEGATION_POLICY.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- current permanent release/candidate/publication/state-sync authorities
- `release-simcore` actual deployed production identity
- `product-manifest.json` synchronized declarative identity

Existing authorities SYS-33 must not replace:
- `release-simcore` as runtime/deployment authority;
- RS2-4 rollback transaction semantics and rollback rehearsal evidence;
- SYS-31 release-mode/version/blast-radius preflight;
- candidate materialization and permanent verification;
- permanent publisher / exact approval path;
- post-publish state-sync and administrative recovery;
- human real-long-chat evidence and product FIX/BLOCKER classification;
- rollback/correction authorization by the owning release policy.

---

## 1. Problem

A release can be fully prepared for the happy path and still be operationally unsafe if nobody can answer, before publication:

```text
If the new production is bad, what exact safe runtime identity can we restore?
How is that restoration published without moving release-simcore backward?
Which evidence from the failed release must remain preserved?
What happens to main documentation/state if runtime rollback succeeds first?
What if publication succeeded but only post-publish administration failed?
Does a product bug require rollback, same-version correction, or neither?
```

SimCore already owns the hard rollback mechanics in Release System v2:

```text
current production P_bad
→ direct-child rollback candidate C_rollback
→ C_rollback latest/install blobs reproduce approved prior-safe runtime bytes
→ ordinary fast-forward publication
→ history moves forward even if visible product version decreases
```

SYS-31 also freezes whether a proposed `ROLLBACK` release transaction is legitimate.

What is still useful is a compact operator-facing readiness contract that must be reviewed **before a genuine runtime publication**, so rollback is not invented reactively after a failure.

SYS-33 defines that checklist.

---

## 2. Core invariant

```text
current production identity
+ reviewed release intent
+ explicit rollback source eligibility
+ preserved rollback execution authority
+ post-rollback convergence plan
+ evidence-preservation plan
→ rollback-readiness disposition
```

But:

```text
ROLLBACK_READY
!= rollback authorization
!= rollback execution
!= source runtime LIVE_PASS for every future context
!= candidate PASS
!= release publication PASS
!= product correctness PASS
```

SYS-33 is a readiness surface only.

---

## 3. Why v1 is `NR_DOC_ONLY`

The useful v1 form is a reviewed checklist/template.

Preferred later materialization:

```text
docs/SIMCORE_ROLLBACK_READINESS_CHECKLIST.md
```

It does not require:
- a rollback executor;
- a GitHub Action;
- a release publisher;
- a candidate builder;
- a branch/ref writer;
- automatic historical-safe-version selection;
- a CI log scraper;
- a runtime probe;
- a repository writer.

Several readiness questions are intentionally human/reviewed semantics, especially:
- whether a historical source is still approved as safe for the affected failure;
- whether rollback or same-version correction is the appropriate recovery class;
- whether a failed publication is product-semantic or release-infrastructure failure;
- whether unresolved administrative state is repairable without runtime rollback.

Therefore:

```text
Apply Class = NR_DOC_ONLY
```

A future executable rollback planner or protected release integration would be separate protected work.

---

## 4. Review timing

SYS-33 applies to a genuine runtime publication transaction.

Normal placement:

```text
product/runtime work verified
→ release intent prepared
→ SYS-09 / SYS-50 / SYS-31 release-boundary review
→ SYS-33 rollback-readiness review
→ candidate materialization / exact approval / permanent publication
```

Re-run the checklist if any of these change materially before publication:

```text
current production P
candidate C
release mode
rollback source identity
release-system authority
state-sync/recovery authority
live-gate contract
```

A stale readiness review cannot be reused merely because the target version string is unchanged.

---

## 5. Rollback is forward history, never ref rewind

Frozen rule:

```text
rollback
!= reset release-simcore backward
!= force-push
!= move production ref to an ancestor
```

Canonical rollback shape remains:

```text
P_bad
  ↓ parent
C_rollback
```

where `C_rollback` is a new direct child of current production and its approved runtime blobs reproduce the selected safe source.

Therefore readiness requires the operator to know that the current permanent release authority can perform a normal forward-history rollback transaction.

Any plan requiring:

```text
force push
ref reset
history rewrite
manual replacement outside permanent authority
```

is:

```text
ROLLBACK_NOT_READY
```

unless a separately authorized emergency policy explicitly supersedes the normal authority.

SYS-33 does not create such an emergency policy.

---

## 6. The rollback source is an exact identity, not a version label

A readiness review must identify a bounded approved source using immutable facts where available:

```text
source release commit
source shared latest/install blob
source version
source release name / release record
source validation/evidence refs
source eligibility rationale for the affected failure class
```

A bare statement such as:

```text
rollback to previous version
```

is insufficient.

Likewise:

```text
version X was once good
```

is not enough if the exact commit/blob cannot be resolved.

The selected source must satisfy existing rollback policy; SYS-33 does not infer safety from age, lower version, commit order, or historical popularity.

---

## 7. Source safety is failure-relative

Frozen rule:

```text
historically LIVE_PASS
!= universally safe rollback target for every future failure
```

Example reasoning:

```text
new release breaks representation ownership
→ a prior source known-good for that ownership boundary may be eligible

new release fixes a security/compatibility-critical host requirement
→ blindly restoring an older source may be unsafe even if it previously LIVE_PASSed
```

Therefore the readiness row records:

```text
source eligibility rationale
```

and cites the owning evidence/policy.

SYS-33 does not provide an automatic ranking of historical releases.

---

## 8. Readiness checklist domains

Every genuine runtime release review covers these 15 domains.

### RR-01 — Current production identity

Required:

```text
current release-simcore commit resolvable
current latest/install equality established
current shared blob known
current version/name known
```

If current production identity is ambiguous:

```text
ROLLBACK_NOT_READY
```

### RR-02 — Proposed release identity / parent

Required:

```text
release intent names expected current production parent
release mode is known
candidate/publication path remains permanent authority
```

A readiness checklist does not approve an otherwise invalid release.

### RR-03 — Rollback trigger ownership

Required:

```text
who/what classifies the failure
what evidence can justify rollback consideration
what conditions instead require FIX / correction / admin recovery
```

Do not use SYS-33 as an automatic rollback trigger.

### RR-04 — Exact rollback source

Required before claiming `ROLLBACK_READY`:

```text
approved source commit identified
approved source shared blob identified
source version/name resolvable
source latest/install pair known identical
```

If an exact source is intentionally selected only after observing a failure, the release may be `ROLLBACK_REVIEW_REQUIRED`; it is not fully `ROLLBACK_READY`.

### RR-05 — Source eligibility evidence

Required:

```text
historical release/evidence refs exist
source is not merely inferred safe from chronology
known disqualifying evidence has been reviewed
```

### RR-06 — Forward-history rollback construction

Required:

```text
rollback candidate would be direct child of then-current production
no backward ref movement
no force operation
```

### RR-07 — Production path radius

Required rollback candidate paths remain exactly the currently authorized production pair:

```text
plugins/simcore/latest.js
plugins/simcore/install.js
```

Any broader production-candidate plan belongs to release-system redesign and cannot be hidden inside rollback.

### RR-08 — Candidate verification

Rollback does not bypass normal candidate verification.

Required:

```text
latest/install target equality
syntax/static verification
permanent candidate verification authority
exact candidate/parent binding
```

A rollback source being historically safe does not exempt the newly constructed rollback candidate from current permanent verification.

### RR-09 — Exact approval / publication authority

Required:

```text
rollback still travels through the current exact approval + permanent publication authority
rollback metadata required by current release policy is available
```

Delegated operator authority does not permit freehand C/P/blob substitution.

### RR-10 — Failed-release evidence preservation

Before recovery, preserve enough identity/evidence to explain what failed:

```text
failed production commit/blob/version
release transaction identity
candidate/approval/publication receipts
live diagnostic/evidence if failure was observed live
classification: WATCH / FIX / BLOCKER as applicable
```

Rollback must not erase the evidence trail.

### RR-11 — Post-rollback administrative convergence

After rollback publication, `release-simcore` is runtime authority immediately.

Main-side state must then converge under existing state-sync authority:

```text
product-manifest
CURRENT_DEVELOPMENT managed current state
SIMCORE_GUIDELINES managed state where applicable
release/live records
```

But:

```text
main temporarily stale
!= runtime rollback failed
```

The runtime authority remains actual `release-simcore`.

### RR-12 — Admin-failure distinction

If publication itself is correct but post-publish main synchronization fails:

```text
production remains the published runtime
status = administrative recovery required
```

Do **not** rollback runtime merely to make main documentation match.

Repair administrative convergence separately unless product/release authority provides a real rollback reason.

### RR-13 — Live validation after rollback

A rollback deployment still requires the current human real-long-chat close semantics when runtime bytes were newly published.

Historical LIVE_PASS is supporting/source-eligibility evidence; it does not automatically close the new rollback deployment.

### RR-14 — Product failure vs release-system failure

Readiness must preserve this classification split:

```text
publisher/candidate/state authority behaves correctly
+ runtime semantics bad
→ product FIX/BLOCKER path

release transaction authority itself misbehaves
→ release-infrastructure blocker
```

Do not call the release system broken solely because the released product failed live validation.

Do not call product rollback sufficient when the publication authority itself is untrustworthy.

### RR-15 — R2.1 genuine-release proof implications

The next genuine runtime release is expected to provide genuine delegated-release E2E evidence.

If it later requires correction/rollback:
- preserve which release-system steps actually succeeded;
- do not manufacture `R2.1 E2E PASS` from a partial path;
- a final stable LIVE_PASS under the delegated permanent path remains required before operational proof is closed.

SYS-33 records this dependency only; it does not close R2.1 proof.

---

## 9. Recovery-choice boundary

SYS-33 intentionally does not choose among:

```text
NO RUNTIME ACTION
SAME_VERSION_CORRECTION
NEW_VERSION_FIX
ROLLBACK
ADMIN_RECOVERY_ONLY
```

That choice belongs to current evidence, release policy, and the bounded product/release work item.

The checklist only asks whether a legitimate rollback path is prepared if rollback becomes the selected recovery class.

This prevents:

```text
rollback readiness
→ rollback preference
```

from becoming an accidental policy.

---

## 10. Readiness result vocabulary

Exactly four v1 dispositions:

```text
ROLLBACK_READY
ROLLBACK_REVIEW_REQUIRED
ROLLBACK_NOT_READY
ROLLBACK_NOT_APPLICABLE
```

### `ROLLBACK_READY`

All required readiness domains for the selected genuine runtime release resolve without contradiction, including an exact eligible rollback source and preserved permanent rollback authority.

Meaning only:

```text
A bounded rollback path is prepared if later authorized.
```

### `ROLLBACK_REVIEW_REQUIRED`

No hard contradiction is established, but one or more reviewed semantics remain unresolved before publication.

Examples:

```text
exact source chosen but eligibility rationale not yet reviewed
source is intentionally selected only after failure observation
state-sync recovery authority changed since prior checklist
```

This is not equivalent to ready.

### `ROLLBACK_NOT_READY`

A hard readiness condition is absent or contradicted.

Examples:

```text
current production identity unresolved
no eligible exact source and policy requires one
rollback would require backward ref movement
rollback path would bypass permanent verification/publication
failed-release evidence cannot be preserved
```

### `ROLLBACK_NOT_APPLICABLE`

The reviewed transaction is not a genuine runtime publication requiring rollback readiness, for example a pure document-only design transaction.

This value must not be used to skip readiness for an actual runtime release merely because rollback is considered unlikely.

---

## 11. Reason-code vocabulary

Frozen v1 reason families:

```text
RR_CURRENT_IDENTITY_UNRESOLVED
RR_RELEASE_PARENT_UNRESOLVED
RR_TRIGGER_OWNER_UNRESOLVED
RR_SOURCE_UNRESOLVED
RR_SOURCE_IDENTITY_INCOMPLETE
RR_SOURCE_ELIGIBILITY_UNRESOLVED
RR_SOURCE_DISQUALIFIED
RR_FORWARD_HISTORY_UNAVAILABLE
RR_FORCE_OR_REWIND_REQUIRED
RR_PATH_RADIUS_INVALID
RR_VERIFICATION_AUTHORITY_UNRESOLVED
RR_PUBLICATION_AUTHORITY_UNRESOLVED
RR_EVIDENCE_PRESERVATION_GAP
RR_ADMIN_CONVERGENCE_UNRESOLVED
RR_LIVE_CLOSE_UNRESOLVED
RR_FAILURE_CLASSIFICATION_UNRESOLVED
RR_R2_1_PROOF_CONTEXT_UNRESOLVED
```

These codes are readiness findings only.

They do not replace release-controller error codes or forensic disposition codes.

---

## 12. Fail-closed rules

SYS-33 fails closed for readiness when:

```text
current production identity cannot be trusted;
rollback source cannot be resolved to exact immutable identity;
selected source contradicts known disqualifying evidence;
rollback requires force/ref rewind;
rollback would bypass current permanent candidate verification;
rollback would bypass current publication authority;
rollback candidate path radius exceeds current production allowlist;
failed release evidence would be overwritten/discarded;
```

A checklist failure does not mutate the repository or production.

It only blocks the `ROLLBACK_READY` claim.

Whether the proposed release itself must stop is decided by the owning release policy/task gate.

---

## 13. Relationship to SYS-31

```text
SYS-31
= Is the proposed release/version transaction legitimate?

SYS-33
= If this genuine runtime publication later needs rollback, is a bounded recovery path actually prepared?
```

Therefore:

```text
VERSION_RADIUS_CLEAR
!= ROLLBACK_READY

ROLLBACK_READY
!= VERSION_RADIUS_CLEAR
```

A runtime release should normally have both independent reviews where current policy requires them.

SYS-33 never validates version arithmetic or candidate radius independently when SYS-31 owns that rule; it references the current SYS-31 disposition.

---

## 14. Relationship to RS2-4E rollback rehearsal

RS2-4E owns structural rollback qualification:

```text
sandbox full rollback transaction
repository-bound rollback shadow plan
rollback negative controls
→ ROLLBACK_REHEARSAL_VERIFIED
```

SYS-33 does not repeat that rehearsal per release.

Instead it asks:

```text
Is the already-approved rollback mechanism still available,
and is this release bound to an exact eligible recovery source/plan?
```

If rollback mechanism authority changed materially after its rehearsal evidence, affected readiness must be reviewed again rather than blindly reusing old rehearsal proof.

---

## 15. Relationship to R2.1 delegated operator policy

R2.1 allows the delegated operator to complete pre-live repository/release work after explicit user authorization of that release work item.

SYS-33 does not add another user confirmation button.

Normal user-facing behavior remains:

```text
explicit release work authorized
→ delegated operator performs pre-live work
→ rollback readiness is reviewed internally
→ release reaches LIVE_PENDING if all owning gates pass
→ user performs real long-chat validation
```

If rollback later becomes an actual new release work item, authorization follows the current release/operator policy rather than being silently inferred from the prior readiness checklist.

---

## 16. Relationship to main vs release-simcore authority

Frozen rule:

```text
release-simcore
= actual runtime/deployment authority

main
= design/evidence/roadmap/admin memory authority
```

After a rollback publication:

```text
release-simcore updated first by permanent publication
→ that deployed identity is real production
→ main state converges afterward
```

If main still shows the failed release temporarily:
- record/admin recovery is required;
- do not pretend the failed runtime is still production;
- do not republish or rollback merely to satisfy stale documentation.

This distinction is mandatory in every SYS-33 checklist instance.

---

## 17. Minimal checklist template

```text
Release work ID:
Proposed release mode/version:
Current production commit/blob/version:
SYS-31 disposition:

RR-01 current identity                  PASS / REVIEW / FAIL
RR-02 release parent                    PASS / REVIEW / FAIL
RR-03 rollback trigger owner            PASS / REVIEW / FAIL
RR-04 exact rollback source             PASS / REVIEW / FAIL
RR-05 source eligibility evidence       PASS / REVIEW / FAIL
RR-06 forward-history construction      PASS / REVIEW / FAIL
RR-07 production path radius            PASS / REVIEW / FAIL
RR-08 candidate verification            PASS / REVIEW / FAIL
RR-09 approval/publication authority     PASS / REVIEW / FAIL
RR-10 failed-release evidence preserve  PASS / REVIEW / FAIL
RR-11 post-rollback main convergence     PASS / REVIEW / FAIL
RR-12 admin-failure distinction          PASS / REVIEW / FAIL
RR-13 rollback live validation           PASS / REVIEW / FAIL
RR-14 failure-class split                PASS / REVIEW / FAIL
RR-15 R2.1 proof implications            PASS / REVIEW / FAIL

Selected exact rollback source:
Source eligibility rationale:
Known disqualifiers reviewed:
Recovery-choice authority:
Result:
Reason codes:
Evidence / authority refs:
```

Individual row `PASS` means only that the readiness question is resolved, not that any rollback or release has succeeded.

---

## 18. Mutation / update rules

SYS-33 v1 checklist instances are review artifacts.

If material release identity changes:

```text
old checklist → STALE
new/reviewed checklist → required
```

Material changes include:
- production parent moved;
- release intent/release mode changed;
- rollback source changed;
- source evidence became contradicted;
- permanent publication authority changed;
- state-sync recovery semantics changed;
- live-close semantics changed.

Do not silently edit a historical readiness receipt to look as though it reviewed later facts.

For an active living checklist, reviewed corrections may be made with explicit source refs; once attached to a completed release transaction it becomes point-in-time evidence.

---

## 19. Non-goals

SYS-33 does not:
- select the global current release;
- choose a rollback source automatically;
- execute rollback;
- write release-simcore;
- alter candidate bytes;
- bypass candidate verification;
- create approval metadata;
- dispatch workflows;
- update product-manifest;
- repair main state;
- classify runtime anomalies automatically;
- decide rollback vs correction vs fix;
- prove LIVE_PASS;
- close R2.1 genuine release proof;
- redesign release infrastructure.

---

## 20. Verification expectations for later application

Because v1 is document-only, later materialization must verify at minimum:

```text
all referenced authority paths resolve
checklist vocabulary matches frozen design
SYS-31/RS2 rollback semantics are not redefined
release-simcore remains runtime authority
main remains design/evidence/admin authority
no plugin/runtime file changed
no CI/release workflow changed
no publisher/writer authority changed
no production ref changed
```

No static/CI PASS claim is created merely by materializing the checklist document.

---

## 21. Current SimCore example boundary

Current production remains outside this design transaction:

```text
Production = v0.64.7 Cross-Reload Cache Observer Continuity
Live gate  = PENDING_REAL_LONG_CHAT
Next physical architecture move after gate close = M2-3
R2.1 genuine delegated-release E2E proof = PENDING on next genuine runtime release
```

SYS-33 does **not** claim current rollback readiness for v0.64.7 or any future version in this design transaction.

It freezes only the readiness contract that a future genuine runtime release review will apply.

---

## 22. Application hold

```text
SYS-33 DESIGN = FROZEN
SYS-33 APPLY CLASS = NR_DOC_ONLY
SYS-33 APPLICATION = HOLD
```

Reason:
- current system-idea Design Sweep First remains active;
- design/application bundling is intentionally prohibited;
- no runtime/release authority needs changing to freeze the contract.

When the sweep/application gate later allows document-only materialization, apply SYS-33 as its own bounded repository-memory transaction.

---

## 23. Freeze verdict

```text
SYS-33 Rollback Readiness Checklist
= DESIGN FROZEN
= NON_RUNTIME
= NR_DOC_ONLY
= PRE-RELEASE REVIEW CONTRACT
= NO ROLLBACK EXECUTION
= NO PUBLICATION AUTHORITY
= NO RUNTIME CHANGE
= APPLICATION HOLD
= OPEN DESIGN QUESTIONS 0
```

Canonical design rule:

> Prepare rollback as an exact forward-history recovery path before publishing, but never confuse readiness with authorization, historical safety with universal safety, or main documentation convergence with deployed runtime truth.
