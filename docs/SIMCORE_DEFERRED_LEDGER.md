# SimCore Deferred / Error Ledger

Purpose: preserve deferred validation items, watch-only anomalies, confirmed-but-nonblocking defects, and regression controls so they are not lost while M2 proceeds. This file is additive evidence memory; it does not replace `SIMCORE_GUIDELINES.md`, `CURRENT_DEVELOPMENT.md`, `SIMCORE_M2_LIVE_EVIDENCE.md`, or `SIMCORE_ANOMALY_WATCH.md`.

## Immediate diagnostic capture rule

This ledger is part of the normal diagnostic-review workflow, not a document that is updated only at release time.

Whenever a real SimCore diagnostic or copied RAW turn exposes **any suspicious behavior, contradiction, unexplained mismatch, probable defect, or new regression-control sample**, record it immediately before moving on to unrelated development work.

Do not wait for recurrence before preserving the first specimen. Recurrence controls promotion priority, not whether the evidence is recorded.

Minimum capture flow:

```text
full diagnostic review
→ RAW / state / next-turn cross-check
→ suspicious or defective behavior observed
→ classify immediately
→ append evidence to this ledger or SIMCORE_ANOMALY_WATCH.md
→ only then decide WATCH / DEFER / FIX / DISMISS / REGRESSION_CONTROL
```

Use the narrowest applicable status:

```text
SUSPECTED                    evidence exists, cause not established
WATCH_ONLY                   one-off or low-confidence anomaly preserved for recurrence
DIRECT_EVIDENCE              observable defect is real, attribution may still be open
DEFERRED_NON_BLOCKING        real or useful validation item intentionally not blocking current work
CONFIRMED_BLOCKING           must be repaired before the active architectural step continues
MITIGATED                    production patch exists; preserve as a regression target
REGRESSION_CONTROL           verified healthy behavior that future updates must preserve
DISMISSED_NO_DEFECT          suspicion was resolved as expected behavior; retain the reason
```

Every new entry should preserve, when available:

```text
production version
runtime/generation ID
user / assistant turn indices
mode
exact suspicious diagnostic fields
relevant RAW evidence
cross-field contradiction or reason for suspicion
whether reroll/regeneration reproduced or cleared it
whether the next turn inherited the suspect state
confidence / attribution status
```

A suspicious item must not be silently dropped merely because the rest of the diagnostic says `PASS`, `Warnings: 0`, `COMMITTED`, or `REPAIRED`. Those labels remain scoped signals and must be cross-checked against RAW and neighboring state.

If later evidence disproves the suspicion, update the existing entry to `DISMISSED_NO_DEFECT` with the resolving evidence rather than deleting the specimen. If it recurs, append the new runtime/turn evidence and promote classification as appropriate.

Operational rule:

> **See something suspicious in a diagnostic → capture it immediately. Do not rely on chat memory to remember it later.**

## Current baseline

```text
Production: v0.64.7 — Cross-Reload Cache Observer Continuity
Production validation: PENDING_REAL_LONG_CHAT
Primary current phase: close 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT before any later runtime release or physical M2-3 implementation
Next physical architecture move: M2-3 Edit Reconcile extraction only after the v0.64.7 live gate is classified and closed
Safe parallel non-runtime state: original NR design/harvest, R doc-apply, and four-item permanent-fixture queues are exhausted; a separate system-idea NON_RUNTIME design sweep is ACTIVE and may proceed while the live gate is pending, with apply/implementation held until that sweep closes or priority changes
System-idea sweep state: 39/52 designs FROZEN; scoped next design = SYS-37 Release-System Residual Cleanup Registry
Genuine-edit baseline: v0.64.5 DIRECT LIVE PASS established before M2-3; post-M2-3 direct recheck remains required before M2-4
Natural B_END revalidation: DEFERRED / NON-BLOCKING
R2.1 delegated release operation: ACTIVE / PERMANENT-CI PASS / genuine release end-to-end proof PENDING on the next genuine runtime release
```

### System-idea selection edge omission — SYS-24

Status: `FIXED / DOC_DRIFT / NON_RUNTIME / NON_BLOCKING`

Observed during the 2026-08-26 system-design sweep:

```text
SYS-24 inventory row = I4 / D2 / NOW
SYS-52 inventory row = I4 / D2 / NOW
selection block incorrectly listed only SYS-52
```

The omission was preserved immediately as:

```text
docs/SIMCORE_SYSTEM_IDEA_SELECTION_DRIFT_FIX_SYS24_2026-08-26.md
```

Correction:

```text
re-evaluate the actual I4/D2 edge
→ select SYS-24 first on downstream fixture-governance leverage
→ freeze SYS-24 as NR_PROTECTED
→ resynchronize inventory/progress/classification/deferred pointers
→ SYS-52 becomes the actual final remaining I4/D2/NOW design
```

Runtime/release impact:

```text
NONE
```

Do not delete this specimen merely because the living pointer is now corrected; it is a process-regression control for future selection-ledger maintenance.

### Parallel main activity during SYS-07 design

Status: `WATCH / PARALLEL_MAIN_ACTIVITY / NON_SIMCORE_CHANGE / NON_BLOCKING`

Preserved evidence:

```text
docs/SIMCORE_SYS07_PARALLEL_MAIN_ACTIVITY_WATCH_2026-08-26.md
```

Observed while closing SYS-07:

```text
SYS-07 base main = 14e692f17e722cb70969096e2c9f4ea4354faa9d
parallel commit  = 2453a6e91e6966b8960efe6a619c8886c234b309
message          = infra: add canonical-main work decomposition system
```

The parallel commit changed `.github/plugin-control-plane/canonical-main/...` and one plugin-control-plane workflow line, but did not overlap any of the five bounded SYS-07 SimCore paths. `release-simcore` remained unchanged and no SYS-07 semantic conflict was observed.

Operational control:

```text
base→head compare containing unrelated paths
!= current SimCore transaction authored those paths

use bounded commit identities + per-path inspection
→ separate current work from parallel main activity
```

This WATCH is not permission to mix canonical-main repository-system redesign into SimCore work. The unrelated repo-system topic stays separate.

### Operator Error Specimen Ledger design

Status: `SYS-52 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-52 now freezes a dedicated future repository-memory surface for operator/tooling process deviations.

Frozen contract:

```text
reviewed operator/tooling deviation
+ exact context / actual mutation facts
+ immediate containment
+ WATCH / DEFER / FIX / BLOCKER disposition
+ durable evidence refs
→ curated process-regression specimen
```

The future ledger will distinguish historical disposition from current resolution and will preserve corrected errors rather than deleting them. It explicitly prohibits blame/actor scoring, automatic severity, recurrence auto-escalation, auto ingestion, and remediation/repository-write authority.

Existing preserved real seeds include:

```text
R2_1_OPERATOR_POLICY_PREWRITE_BRANCH_MISSING
R2_1_OPERATOR_POLICY_ACCIDENTAL_MAIN_NOOP_MARKER
SYSTEM_IDEA_SELECTION_EDGE_OMISSION_SYS24
```

Current application remains HOLD while the system design sweep is active. The existing source evidence documents remain authoritative for those historical events until a later bounded SYS-52 application transaction materializes `docs/SIMCORE_OPERATOR_ERROR_SPECIMEN_LEDGER.md`.

### Evidence-to-Decision Trace Map design

Status: `SYS-06 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-06 now freezes the reviewed semantic lineage from exact evidence identities to exact bounded decision identities.

Frozen contract:

```text
exact evidence identity
+ bounded decision identity
+ reviewed trace role
+ exact affected decision scope
+ source-backed basis
→ curated evidence→decision lineage
```

Frozen trace roles:

```text
PRIMARY_BASIS
SUPPORTING_BASIS
CONTRARY_INPUT
TRIGGER_INPUT
CLOSURE_INPUT
```

The map is deliberately distinct from the generated Evidence Index, SYS-13 proof fitness, SYS-21 forensic consistency review, SYS-28 verification debt, SYS-02 supersession lineage, and SYS-35 repository transaction lineage. It does not discover evidence, infer causality from citations/timestamps, promote proof strength, close gates, or calculate current truth.

Historical evidence→decision edges remain preserved when later evidence produces a superseding decision. A later decision needs its own evidence trace; support does not silently transfer through SYS-02 supersession.

Current application remains HOLD while the system design sweep is active. Frozen SYS-18 consumes this reviewed lineage for point-in-time provenance receipts rather than inventing evidence→decision causality independently.

### Evidence Provenance Chain Receipt design

Status: `SYS-18 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-18 now freezes the point-in-time receipt contract for one meaningful bounded decision/close.

Frozen contract:

```text
bounded decision-time source / derivative / proof identities
+ reviewed SYS-06 trace edges
+ explicit non-basis / unresolved links
→ one immutable evidence-provenance receipt
```

Frozen top-level receipt states:

```text
PROVENANCE_RECEIPT_COMPLETE
PROVENANCE_RECEIPT_REVIEW_REQUIRED
PROVENANCE_RECEIPT_BLOCKED
PROVENANCE_RECEIPT_NOT_APPLICABLE
```

The receipt is historical decision-time provenance, not a living evidence map. Later evidence must not be backfilled into an older receipt as if it had supported the original decision; a later evidence-driven disposition requires its own decision/receipt and SYS-02/SYS-06 lineage where applicable.

`PROVENANCE_RECEIPT_COMPLETE` means only that the exact source/derivative/proof/trace chain used at that decision time is sufficiently resolvable and coherent. It does not establish runtime/live PASS, gate close, release authorization, universal proof fitness, or current evidence freshness.

Current application remains HOLD while the system design sweep is active. Frozen SYS-14 consumes historical provenance only as context for current claim-scoped reuse review; it never mutates SYS-18 receipts.

### Evidence Freshness Ledger design

Status: `SYS-14 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-14 now freezes the current-reuse review contract for historically valid evidence.

Frozen contract:

```text
exact historical evidence identity
+ exact current reuse claim / decision scope
+ reviewed current-context anchor
+ reviewed relevant change events
+ explicit reuse / revalidation basis
→ claim-scoped evidence-freshness disposition
```

Frozen top-level freshness states:

```text
FRESH_FOR_SCOPE
FRESHNESS_REVIEW_REQUIRED
REVALIDATION_REQUIRED
STALE_FOR_SCOPE
FRESHNESS_UNRESOLVED
```

Freshness is not a global property of an evidence artifact and is never decided by wall-clock age or version arithmetic alone. Historical validity remains intact even when current reuse becomes `REVALIDATION_REQUIRED` or `STALE_FOR_SCOPE`.

The v0.64.5 genuine-edit positive control is the canonical boundary example: it remains valid/fresh for the claim that a pre-M2-3 direct baseline exists, while post-M2-3 extracted behavior requires the already-owned direct revalidation before M2-4. SYS-14 represents that distinction; it does not invent the requirement.

SYS-14 cannot broaden SYS-13 proof fitness, create required evidence slots, determine verification-debt/blocker posture, close a live gate, authorize release, or auto-scan repository history. Current application remains HOLD while the system design sweep is active. Frozen SYS-07 consumes reviewed freshness only for registered current-evidence-reuse reference fields and never calculates freshness itself.

### Cross-Reference Integrity Auditor design

Status: `SYS-07 DESIGN FROZEN / NR_EXECUTABLE / IMPLEMENTATION HOLD / NON_RUNTIME`

SYS-07 now freezes the bounded deterministic audit contract for registered structured repository-memory references.

Frozen contract:

```text
registered structured reference field
+ explicit reference class
+ exact target identity
+ reviewed lifecycle / supersession / provenance / freshness metadata when required
→ deterministic cross-reference-integrity findings
```

Frozen top-level audit states:

```text
XREF_AUDIT_CLEAN
XREF_AUDIT_FINDINGS
XREF_AUDIT_PARTIAL
XREF_AUDIT_BLOCKED
```

SYS-07 explicitly separates mechanical resolution from semantic eligibility. A path can resolve while still being ineligible for a current-authority field, and a superseded historical target can remain correct for a historical evidence/lineage field. Current evidence reuse requires the exact reviewed SYS-14 freshness row; the auditor cannot infer freshness from age/version or promote `REVALIDATION_REQUIRED` into a blocker.

v1 is local/read-only/no-network and scans only explicitly registered structured reference surfaces. It does not crawl arbitrary prose, infer lifecycle/supersession/provenance, verify GitHub-side branch/PR/commit relationships, repair references, mutate repository state, become required CI, or affect runtime/release authority.

Current implementation remains HOLD while the system design sweep is active. Frozen SYS-36 now owns the GitHub-side branch/PR relationship contract deliberately excluded from SYS-07.

### Branch/PR Relationship Auditor design

Status: `SYS-36 DESIGN FROZEN / NR_PROTECTED / IMPLEMENTATION HOLD / NON_RUNTIME`

SYS-36 now freezes the protected read-only relationship audit contract for GitHub branch/PR/commit facts.

Frozen contract:

```text
explicit relationship audit mode
+ exact PR/ref/SHA observations
+ explicit expected-base/head contract when required
+ fixed-SHA relationship facts
+ bounded capture-coherence check
→ deterministic branch/PR relationship findings
```

Frozen modes:

```text
BR-01 GENERIC_RELATION_AUDIT
BR-02 EXACT_BASE_TRANSACTION_AUDIT
BR-03 HISTORICAL_RELATION_AUDIT
```

Critical regression rule:

```text
merge_commit_sha != null
+ merged_at == null
→ NOT MERGED
```

This is backed by a real repository specimen: PR #109 is open with `merged_at = null` while exposing a non-null `merge_commit_sha`. SYS-36 therefore keeps PR state, `merged_at`, merge identity, mutable branch refs, exact expected base/head identities, and fixed-SHA ancestry facts separate rather than promoting one convenience field into stronger truth.

Generic base movement is not an error without an explicit exact-base contract. A closed/merged historical PR may remain valid even after its head branch is deleted. Live relationship captures must re-read required mutable refs and fail closed on mixed-time/raced snapshots rather than returning a false CLEAN result.

SYS-36 is `NR_PROTECTED` despite being read-only because it polices branch/PR governance relationships. It may later feed SYS-49 safe-parallel-work reasoning, SYS-31 release review, or SYS-35 lineage evidence, but it does not decide stale-PR hygiene, safe parallelism, merge/close/delete/rebase action, release authorization, or repository writes.

Current implementation remains HOLD while the system design sweep is active. Frozen SYS-49 now owns the safe-parallel-work judgment deliberately excluded from SYS-36.

### Safe Parallel Work Finder design

Status: `SYS-49 DESIGN FROZEN / NR_PROTECTED / IMPLEMENTATION HOLD / NON_RUNTIME`

SYS-49 now freezes the protected read-only concurrency judgment for already-legitimate bounded work.

Frozen contract:

```text
2+ independently legitimate bounded tasks
+ reviewed semantic read/write/dependency profiles
+ current SYS-36 relationship facts when repository relations matter
+ current gate/dependency facts
+ frozen parallel conflict/guard rules
→ deterministic pairwise/group parallel-safety disposition
```

Frozen top-level dispositions:

```text
PARALLEL_SAFE
PARALLEL_GUARDED
PARALLEL_SERIALIZE_REQUIRED
PARALLEL_NOT_STARTABLE
PARALLEL_BLOCKED
```

Critical non-equivalences:

```text
different branches != PARALLEL_SAFE
no shared filenames != PARALLEL_SAFE
BUNDLE_CLEAN != PARALLEL_SAFE
RELATION_CLEAN != PARALLEL_SAFE
```

SYS-49 distinguishes substantive mutation from shared close-sync. Two tasks with disjoint primary work but shared living inventory/progress/classification/deferred close writes may be `PARALLEL_GUARDED`: substantive work may overlap, but shared close writes serialize, each closer rereads current authority, and counts/NEXT are recomputed from the new head.

Shared primary mutation, direct predecessor dependencies, a task changing another task's defining authority, protected-governance interference, or production identity movement during a live-evidence window require serialization. Exact-base sibling transactions may overlap only under explicit serialized promotion/re-audit/replay guards when replay is allowed. A raced/stale SYS-36 relationship capture blocks a current safe-parallel claim.

SimCore's immediate anomaly preservation rule is a first-class guard: if real live evidence produces a new suspicious specimen while another task is about to write shared close state, the anomaly/evidence record takes priority, the other close must reread current authority, and any changed scope/gate/NEXT invalidates the old parallel assessment.

SYS-49 is `NR_PROTECTED` despite being read-only because false SAFE output can affect shared main writers, branch/PR transactions, exact-base work, production evidence windows, and protected repository/release governance. It does not select tasks, change priority/gates, schedule workers, create locks, mutate branches/PRs, write main/release-simcore, or become CI authority.

Current implementation remains HOLD while the system design sweep is active. Frozen SYS-16 now owns anomaly recurrence/correlation semantics while preserving the immediate-capture priority that SYS-49 consumes as a concurrency guard.

### Anomaly Recurrence Correlator design

Status: `SYS-16 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-16 now freezes the reviewed family-scoped recurrence/correlation contract for preserved natural, controlled, deterministic, and process specimens.

Frozen contract:

```text
reviewed anomaly/process family contract
+ exact source-backed specimen identities
+ reviewed specimen-independence classes
+ required family discriminators / exclusions
+ healthy / contrary controls
→ curated same-family recurrence / cross-family correlation posture
```

Frozen natural recurrence postures:

```text
RECURRENCE_FIRST_ONLY
RECURRENCE_CANDIDATE
RECURRENCE_CONFIRMED
RECURRENCE_SERIES_ESTABLISHED
RECURRENCE_REVIEW_REQUIRED
```

Critical independence boundary:

```text
same-input reroll/regeneration
!= second independent natural recurrence

controlled live reproduction
!= natural recurrence

deterministic fixture/static reproduction
!= natural recurrence

duplicate documents for the same event
!= multiple specimens
```

`RECURRENCE_CONFIRMED` means only that at least two independent qualifying natural specimens satisfy one reviewed family contract. It does not establish root cause, severity, FIX/BLOCKER posture, M2 attribution, or reproducibility on demand.

Cross-family recurrence/correlation remains separate from family identity. Shared runtime/version/adjacency alone is `CORRELATION_CONTEXT_ONLY`, not one combined defect. The existing Host Observation Recurrence Matrix remains the specialized authority for handshake/frontier evidence and supplies the canonical contrary control that a healthy handshake can coexist with the history frontier.

SYS-16 does not change the immediate-capture rule: preserve the first suspicious specimen before recurrence exists. It also does not mutate WATCH/DEFER/FIX/BLOCKER automatically; owning anomaly/gate authorities may re-review disposition when recurrence materially changes the evidence.

Current application remains HOLD while the system design sweep is active. A later document-only application may materialize `docs/SIMCORE_ANOMALY_RECURRENCE_INDEX.md`.

### Golden Fixture Mutation Receipt design

Status: `SYS-25 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-25 now freezes point-in-time accountability for intentional mutations of established permanent golden fixtures.

Frozen contract:

```text
reviewed permanent golden-fixture mutation
+ exact before/after fixture identities
+ source-backed semantic mutation basis
+ bounded case/test-intent/negative-control impact
+ exact post-mutation verification refs
→ immutable golden-fixture mutation receipt
```

Primary anti-greenwashing rule:

```text
implementation changed / test failed
→ expected fixture changed to restore green
!= legitimate mutation basis
```

An expected-value change must resolve one of two source-backed directions:

```text
A. owning semantic contract changed first
→ fixture follows the new reviewed authority

B. owning semantic contract stayed the same
+ evidence proves the fixture expectation was wrong
→ fixture defect correction
```

If neither direction is established, the receipt state is `MUTATION_RECEIPT_BLOCKED` rather than a fabricated clean record.

Case removal also requires explicit replacement/supersession/move/debt disposition, and every affected SYS-22 test-intent / SYS-23 negative-control boundary must be reviewed. A post-mutation permanent-harness PASS remains deterministic proof only; it does not establish natural LIVE_PASS, coverage completeness, release readiness or runtime semantic authorization.

SYS-25 v1 is prospective `NR_DOC_ONLY`: later application may materialize `docs/SIMCORE_GOLDEN_FIXTURE_MUTATION_RECEIPT_TEMPLATE.md`, while the actual fixture mutation remains a separate fixture-authority transaction. Historical initial fixture creation does not need fake retrospective mutation receipts.

Current application remains HOLD while the system design sweep is active. SYS-25 closes the I4/D3/NOW edge.

### WATCH Aging Review design

Status: `SYS-15 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-15 now freezes event-driven aging/relevance review for preserved WATCH and deferred-WATCH items.

Frozen contract:

```text
one source-owned WATCH / deferred-WATCH item
+ reviewed current relevance
+ SYS-16 recurrence posture when material
+ mitigation / supersession / verification facts
+ explicit next-review trigger
+ optional elapsed-time context
→ reviewed WATCH aging posture
```

Frozen top-level aging postures:

```text
WATCH_AGING_ACTIVE
WATCH_AGING_QUIESCENT
WATCH_AGING_REVIEW_REQUIRED
WATCH_AGING_HISTORICALIZE_CANDIDATE
WATCH_AGING_BLOCKED
```

Critical boundaries:

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

Elapsed time is orientation metadata only. SYS-15 does not compute severity, recurrence, dismissal, staleness, blocker posture, or gate status from age. A calendar date may reopen review but never auto-promote or auto-dismiss an item.

`WATCH_AGING_QUIESCENT` is the normal posture for valid evidence with no useful immediate action and one named future trigger, such as a rare natural revalidation or a one-off semantic anomaly waiting for natural recurrence. `WATCH_AGING_HISTORICALIZE_CANDIDATE` means only that active living attention may end while the source evidence remains historically preserved; it never means `DISMISSED_NO_DEFECT` without resolving evidence.

New SYS-16 recurrence, mitigation validation, owner/supersession changes, or other named triggers yield `WATCH_AGING_REVIEW_REQUIRED`; the owning anomaly/gate authority decides any WATCH/DEFER/FIX/BLOCKER change. Current application remains HOLD while the design sweep is active. A later document-only application may materialize `docs/SIMCORE_WATCH_AGING_REVIEW.md`.

### Natural Evidence Intake Checklist Generator design

Status: `SYS-20 DESIGN FROZEN / NR_DOC_ONLY / APPLY HOLD / NON_RUNTIME`

SYS-20 now freezes the generic intake/preservation contract for a newly observed candidate natural production specimen.

Frozen contract:

```text
new candidate natural production specimen
+ exact source / production / runtime / observation identity
+ bounded semantic user-intent and visible-observation facts
+ diagnostic / RAW / reroll / neighbor / next-turn controls as required
+ naturalness review
+ proof-scope / explicit non-claims
+ preservation sinks / next-review trigger
→ reviewed natural-evidence intake record
```

Frozen top-level intake states:

```text
NATURAL_INTAKE_COMPLETE
NATURAL_INTAKE_REVIEW_REQUIRED
NATURAL_INTAKE_BLOCKED
NATURAL_INTAKE_NOT_APPLICABLE
```

Critical boundaries:

```text
LIVE != NATURAL
same-input reroll/regeneration != second natural recurrence
intake complete != S-12 eligibility
intake complete != PASS/WATCH/FIX/BLOCKER
intake complete != fixture readiness
intake blocked != runtime defect
```

SYS-20 does not create a second S-04 packet. S-04 remains the bounded machine-fact projection from one coherent diagnostic observation; SYS-20 records whether that packet/full diagnostic/RAW/neighbor/next-turn evidence is required for the specific natural specimen. S-12 remains post-review corpus navigation and assigns `NE-*` only after eligibility is established. SYS-16 owns recurrence; SYS-15 owns later WATCH aging; SYS-19 owns live-gate experiment instructions; M-10 owns reviewed evidence → fixture-skeleton planning.

Controlled live validation remains explicitly outside natural corpus eligibility unless a source authority establishes ordinary natural use. The checklist uses bounded semantic user-intent summaries rather than copying full prompts by default, and it preserves observable symptom separately from attribution/root cause.

Current application remains HOLD while the system design sweep is active. A later doc-only application may materialize `docs/SIMCORE_NATURAL_EVIDENCE_INTAKE_CHECKLIST.md`. The scoped next system design is SYS-37 Release-System Residual Cleanup Registry.

The v0.63.59 natural B_END gate is intentionally no longer a blocker. B_END is rare enough that waiting for another natural occurrence would stall M2. When a natural B_END appears later, capture it as bonus production confirmation.

## Deferred / non-blocking validation

### M2-3 genuine visible user-edit direct control

Status: `PRE_M2_3_BASELINE_ESTABLISHED / POST_M2_3_RECHECK_REQUIRED`

The current v0.64.x line now has direct positive-control evidence, including the v0.64.5 real-long-chat sample:

```text
Prior representation: EXACT
current visible fingerprint != canonical
current visible fingerprint != Fresh
→ Edit origin: USER_EDIT_CANDIDATE
→ Edit reconcile: MANUAL_EDIT_REBUILT
→ snapshot UPDATED
```

The v0.64.5 sample is recorded in `SIMCORE_M2_3_GENUINE_EDIT_LIVE_CONTROL_06405.md` as `DIRECT LIVE PASS / REGRESSION_CONTROL / M2-3 GOLDEN`. It confirms that the pre-extraction production line still distinguishes genuine visible edits from Representation drift and returns to a healthy exact output afterward.

This removes the old documentation state in which a direct v0.64.x positive control was still merely deferred.

The remaining requirement is different:

```text
M2-3 physical extraction lands and stabilizes
→ run one direct harmless genuine visible edit against the post-M2-3 line
→ require USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT → snapshot UPDATED
→ only then may M2-4 begin
```

This post-M2-3 recheck is an extraction-close control, not a reason to repeat the pre-M2-3 baseline now.

### B_END closure natural revalidation

Status: `DEFERRED_NON_BLOCKING`

Triggering v0.63.58 evidence:

```text
broadcast start: 2030-09-08 09:00 AM
B_END frame:      2030-09-09 08:30 AM
visible prose:    30 minutes remaining -> 5 minutes remaining -> broadcast end
expected terminal airtime: 09:00 AM
stored airtime:            08:30 AM
```

The same B_END output also violated the structure contract:

```text
required: 2 COMMUNITY blocks x 3 platform sections
observed: 1 COMMUNITY block x 6 sections
warnings: 8
state quarantine: response=1, COMMUNITY=1/2
```

v0.63.59 addresses the exact B_END closure boundary. Natural revalidation remains desirable but does not block the current v0.64.7 live close or M2-3 after that gate. The separate permanent `broadcast-closure` expansion is now complete and does not substitute for a future natural sample.

### Legacy/bootstrap migration path

Status: `DEFERRED_NON_BLOCKING`

Ordinary COLD_INIT and reload behavior have been observed, but a true legacy/history-bootstrap schema migration path has not been meaningfully exercised. Do not force destructive state mutation solely to obtain this sample. M2-2 did not touch migration ownership. Revisit only when a later checkpoint changes bootstrap/migration coordination, Recovery retirement reaches migration callers, schema evolution requires it, or a natural legacy path exposes new evidence.

### Explicit past-scene allowance under Current Timeline Authority

Status: `DEFERRED_NATURAL_SAMPLE`

v0.63.57 current-era containment has positive evidence. A natural explicit flashback/past-scene allowance sample remains useful, but is not a blocker unless chronology ownership is changed.

### Summary Scope Authority rendered-semantics validation

Status: `DEFERRED_NATURAL_SAMPLE / VALIDATION_ONLY`

v0.64.1 established the deterministic request-scoped `ANNUAL_ONLY` versus `CUMULATIVE_YOY` temporal authority contract. Broad fixture research is closed and the `summary-scope` deterministic permanent fixture is now implemented as an `EXECUTABLE / required / goldenGate` suite. Its permanent-CI success establishes deterministic classifier/authority regression protection but does not promote rendered natural semantics to LIVE PASS.

Natural annual-only and cumulative-YoY outputs remain useful for renderer-semantic validation, but they are no longer the active production mini gate. Keep the repeated standalone-C lineage over-chain on WATCH and do not patch Lineage/Recurrence without new attributable evidence.

## WATCH_ONLY anomalies

### NR standalone tooling-test discovery coverage

Status: `WATCH_ONLY / VERIFICATION_COVERAGE / NON_RUNTIME / NON_BLOCKING`

Observed during the S-10 and S-11 SAFE_NON_RUNTIME harvests on 2026-08-26.

Both work items added focused standalone test sources:

```text
products/simcore/tooling/authority-drift-check.test.mjs
products/simcore/tooling/stale-pr-hygiene.test.mjs
```

Their PR-level SimCore CI workflows completed successfully, but the current path classifier does not register arbitrary new `products/simcore/tooling/*.test.mjs` files as semantic test lanes. The permanent verifier therefore treated the new standalone tooling paths as outside the planned SimCore gates; it did not automatically execute those focused semantic test files.

Preserved evidence:

```text
S-10 PR #396
SimCore CI run 32890770492
Verify PASS
Required PASS
standalone S-10 semantic test execution by current CI: NOT CLAIMED

S-11 PR #398
SimCore CI run 32891014549
Verify PASS
Required PASS
standalone S-11 semantic test execution by current CI: NOT CLAIMED
```

Dedicated implementation evidence:

```text
docs/SIMCORE_S10_AUTHORITY_DRIFT_IMPLEMENTATION_EVIDENCE_2026-08-26.md
docs/SIMCORE_S11_STALE_PR_HYGIENE_IMPLEMENTATION_EVIDENCE_2026-08-26.md
```

Current disposition:

```text
runtime correctness impact: NONE
release-simcore impact: NONE
implementation blocker: NO
current NR easy-tier close blocker: NO
```

Do not silently widen the permanent CI classifier, harness registry, or release-gate policy inside S-10/S-11 just to erase this WATCH. If generalized standalone tooling-test discovery becomes desirable, design it as a separate repository/CI item so CI authority changes are not mixed with product/tool harvest work.

### NR Difficulty-3 focused verification coverage

Status: `WATCH_ONLY / VERIFICATION_COVERAGE / NON_RUNTIME / NON_BLOCKING`

The completed Difficulty-3 harvest also preserves focused-execution coverage limits under:

```text
docs/SIMCORE_NR_DIFFICULTY3_HARVEST_VERIFICATION_WATCH_2026-08-26.md
```

Current non-claims:

```text
M-11 architecture snapshot mode direct permanent-CI execution = NOT CLAIMED
M-10 focused fixture-skeleton standalone test direct CI execution = NOT CLAIMED
M-13 focused evidence-index standalone test direct CI execution = NOT CLAIMED
M-13 evidence-index --check direct CI execution = NOT CLAIMED
```

These do not affect runtime correctness, `release-simcore`, the completed current NR harvest, M2-3 readiness after the live gate, or v0.64.7 live validation. Do not widen CI/harness authority inside unrelated work merely to erase this WATCH.

### GENERATION_SEMANTIC_EXCURSION

One first generation abandoned an explicit source/scene-only boundary and produced an unrelated continuation. Regeneration corrected it. Diagnostics were otherwise healthy. Preserve as generation-semantic evidence; do not attribute to Recovery/Representation without recurrence.

### SILENT_COMPAT representation mismatch family

Observed examples include a `CANONICAL/FRESH` mismatch such as `-80` chars. The following request proved exact Fresh carryover and Representation Fast Reconcile now avoids the false manual-edit rebuild. The output-side transformation cause remains unknown. Do not broaden normalization from this alone.

### B_END unresolved Thoughts + malformed COMMUNITY correlation

One natural B_END simultaneously showed:

```text
THOUGHTS_COMPAT: UNRESOLVED
preamble: ~4200 chars
CANONICAL/FRESH delta: ~-4189 chars
COMMUNITY: malformed 1 x 6 shape
```

The numerical proximity is worth preserving, but causality is unproven. The visible COMMUNITY body independently violated its contract.

### PARTIAL_PREVIOUS_TURN_REPLAY

One B_CONTINUE first generation replayed a large semantic prefix from the preceding turn before continuing with the new requested content. Recurrence telemetry reported `FIRST / NO MATCH`. Reroll of the same input removed the replay. Escalate only on natural recurrence.

### COMMUNITY platform-family diversity

A C output used three named sites but only two distinct platform families (`여초 + SNS + 여초`), producing a true-positive Structure warning. This is direct structural evidence, but recurrence threshold for an independent mini-release has not been met.

### Reaction normalization stale-scale fallback

One B_CONTINUE produced a `stale_scale_fallback` reaction-normalization warning and successfully normalized the values. No repeated correctness failure established. Observe only.

### Diagnostic clarity: repaired RAW/frame wording

Some diagnostics can show final RAW frame progression as already advanced while separately reporting `Frame guard: REPAIRED · CHATINDEX_SAME`. Treat as diagnostic-clarity debt, not a behavior defect, unless misleading attribution causes real debugging errors.

## Confirmed defects already mitigated / regression targets

### Visible current-era rollback / historical-context takeover

Status: `MITIGATED_IN_0.63.57`

Persisted state floor protection had succeeded while visible output could still regress into an unrequested historical era. Current Timeline Authority was added. Preserve the distinction: state repair does not imply visible repair.

### Intra-turn narrative time advancement lost

Status: `MITIGATED_IN_0.63.58`

A scene began at `01:00`, visibly progressed to `03:00` only in prose, and persisted `01:00`, causing stale next-turn inheritance. Narrative Tail Time Contract requires explicit canonical terminal time rather than arbitrary prose-time inference.

### B_END terminal airtime closure gap

Status: `PATCHED_IN_0.63.59 / NATURAL_REVALIDATION_DEFERRED`

B_END could unlock successfully while retaining the opening frame airtime instead of the visible terminal time. v0.63.59 adds B_END terminal timestamp authority and closure diagnostics.

## Validated M2 regression controls

Preserve these behaviors through M2-3 and later narrowing work:

```text
normal canonical == Fresh EXACT                         PASS
small output representation mismatch                   OBSERVED
next-turn REPRESENTATION_FAST_RECONCILED               PASS
genuine user hand-edit -> USER_EDIT_CANDIDATE          PASS (direct v0.64.5 live control; post-M2-3 recheck required)
genuine user hand-edit -> MANUAL_EDIT_REBUILT          PASS (direct v0.64.5 live control; post-M2-3 recheck required)
same-turn reroll replacement                           PASS
historical response-variant restore                    PASS
historical restore -> reroll returns to new authority  PASS
natural B_START / B_CONTINUE / B_END lifecycle         PASS
premature broadcast end denied                         PASS
explicit B_END authority allowed                       PASS
runtime COLD_INIT during active broadcast              PASS
broadcast date rollover                                PASS
Deferred Mirror exact commit                           PASS
Frame progression / deterministic repair               PASS
```

## Escalation rule

Do not stop M2 for every new anomaly. Promote a deferred/watch item into a blocking fix only when natural evidence establishes one of the following:

```text
hard state corruption
broadcast lifecycle regression
real user-edit corruption/misclassification
repeatable chronology corruption
repeatable representation ownership corruption
repeatable structural failure with a narrow attributable cause
```

One-off semantic generation anomalies, cache/provider uncertainty, diagnostic-clarity debt, and rare natural-validation gaps remain non-blocking unless recurrence changes the evidence.

SYS-16 recurrence posture is supporting evidence for such review, not an automatic escalation rule. `RECURRENCE_CONFIRMED` does not itself mean FIX/BLOCKER, and `RECURRENCE_FIRST_ONLY` does not make a directly proven hard defect harmless.

SYS-15 aging posture is likewise an attention/lifecycle signal, not a severity engine. `WATCH_AGING_QUIESCENT` does not dismiss evidence, and `WATCH_AGING_REVIEW_REQUIRED` does not preselect the source owner's next classification.

SYS-20 intake state is preservation completeness only. `NATURAL_INTAKE_COMPLETE` does not establish recurrence, root cause, PASS/WATCH/FIX/BLOCKER, S-12 eligibility, fixture readiness or live-gate close.

## Next action

```text
1. Close v0.64.7 with 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT and classify PASS / WATCH / FIX / BLOCKER.
2. Preserve any live anomaly immediately before moving on and keep living current-state documents synchronized under SIMCORE_LIVE_DOCUMENT_CONSISTENCY_POLICY.md.
3. Original current gate-open NR design = NONE and original NR harvest queue = EMPTY. Seven gated/future original NR items remain and must wait for their legitimate gates.
4. Separate system-idea NON_RUNTIME design sweep = ACTIVE; 39/52 system designs are currently FROZEN and the scoped next design is SYS-37 Release-System Residual Cleanup Registry. Frozen SYS application/implementation remains HOLD while that sweep is active.
5. The four-item non-runtime permanent-fixture expansion portfolio is COMPLETE: summary-scope, narrative-clock, frame, broadcast-closure expansion. There is no next item in that bounded portfolio.
6. Current gate-open R design = NONE and R DOC APPLY queue = EMPTY; S-04 document prep is already APPLIED.
7. After the v0.64.7 gate closes, M2-3 Edit Reconcile becomes the next physical architecture checkpoint.
8. After M2-3 lands, run the direct genuine-edit post-extraction close control before M2-4.
9. R2.1 end-to-end delegated release proof belongs to the next genuine runtime release and remains non-blocking for the current live gate.
10. Capture natural B_END, explicit flashback, Summary Scope rendered-semantics, Reaction/Community and other WATCH samples when informative without stalling M2.
```
