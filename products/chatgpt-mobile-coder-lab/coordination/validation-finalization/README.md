# MCL validation finalization apply v1

This directory owns the Mobile Coder Lab Phase 8.7e-B fixed-profile finalization compositions.

The repository-wide finalization inspector remains the semantic classifier.
This owner contains only compile-time reviewed MCL profiles. It is not a generic
packet finalizer and does not add caller-selected coordination semantics.

## Reviewed fixed profiles

V1 contains exactly two reviewed targets.

### Profile A — #2463 / PR #2464

The first natural partial-finalization fixture preserves its original contract:

- exact reviewed candidate and merge attribution;
- exact validation D-014 manifest lineage;
- exact already-released D-013 lease provenance;
- optional exact stale-holder cleanup;
- D-014 COMPLETE publication when absent;
- canonical VALIDATION_MERGE receipt publication when absent.

### Profile B — #2786 / PR #2878

The second profile reflects the evidence that actually exists for #2786:

- exact canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- exact PASS implementation coordination readback + D-013 release gates;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest exists and none may be synthesized.

For #2786 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

The caller supplies only one of the two reviewed packet numbers and a bounded output
format. Repository, PR, manifest, lease, run, workspace, effect, command and comment
target remain non-selectable.

## Public operations

~~~
node mcl-validation-finalization-apply.cjs inspect --packet '#2463' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#2463' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#2786' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#2786' --format agent-view
~~~

inspect is always read-only.

apply is the explicit finalization effect boundary and reruns all admission evidence.

## Admission

Before any effect, both profiles prove:

1. the fixed packet remains at the reviewed validation-stage compatibility shape;
2. the canonical IMPLEMENTATION_PR receipt binds the exact merged PR head;
3. the merged PR and merge commit identities are exact;
4. current #2352 proves the target packet has no active lease;
5. the exact worktree branch/head is preserved and clean;
6. canonical VALIDATION_MERGE receipt evidence is absent or exact;
7. the landed repository finalization inspector returns the reviewed state.

Profile A additionally proves the reviewed validation D-014 manifest, historical
release provenance, exact holder relation and D-014 completion state.

Profile B requires the exact #2786 canonical IMPLEMENTATION_PR receipt digest and
PASS gates `implementation-coordination-readback` +
`implementation-d013-release`. Its exact valid IMPLEMENTATION_PR stage-entry
manifest is used only to resolve the fixed worktree/holder location; it is never
completed as a validation D-014 manifest.

The effect-bearing admission is profile-specific:

~~~
#2463:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ COORDINATION_FINALIZATION
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#2786:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT
~~~

Any other pre-effect state fails closed, except an exact ALREADY_FINALIZED state,
which returns success with zero effects.

## Fixed effect order

Profile A preserves the original effect order:

~~~
exact stale holder cleanup if present
→ prove holder absent
→ prove workspace clean
→ build/publish D-014 COMPLETE if absent
→ build/publish canonical VALIDATION_MERGE receipt if absent
→ landed finalization inspector re-run
→ require ALREADY_FINALIZED
→ STOP
~~~

Profile B has a smaller effect order:

~~~
prove #2786 packet lease absent
→ prove holder absent
→ prove workspace clean
→ prove implementation coordination gates PASS
→ build/publish canonical VALIDATION_MERGE receipt if absent
→ landed finalization inspector re-run
→ require ALREADY_FINALIZED
→ STOP
~~~

The apply coordinator never releases or acquires D-013. A profile must already prove
its reviewed release/coordination boundary and current packet-lease absence.

## Effect ceiling

Profile A may perform only:
- one exact stale-holder cleanup through mcl-workspace-holder cleanupStale;
- one exact D-014 COMPLETE packet comment if absent;
- one exact canonical VALIDATION_MERGE packet comment if absent.

Profile B may perform only:
- one exact canonical VALIDATION_MERGE packet comment if absent.

Profile B never cleans a holder and never constructs or publishes D-014 evidence.

The owner has no source/index/commit/ref/PR/currentization/merge, D-013, device,
runtime, package, service, release or production mutation surface.

Git reads are observation only and are limited to exact worktree branch, HEAD and
cleanliness checks. GitHub writes are limited to the fixed inspected packet comment
endpoint.

## Idempotence and lost acknowledgement

Exact existing comments are reused.

A comment write is never blindly retried. If write acknowledgement is lost, the owner
performs one exact readback. Exact presence recovers the acknowledgement; absence
remains UNKNOWN.

After a successful apply, a second exact apply must observe ALREADY_FINALIZED and
perform zero effects.

## D-014 ownership

Profile A completion evidence is constructed only with task-handoff.cjs and validated
against the exact selected validation manifest. Multiple COMPLETE snapshots are
interpreted only by completion-receipt-set.cjs; there is no latest-comment-wins
selection.

Profile B has no validation-stage D-014 manifest. The exact valid #2786
IMPLEMENTATION_PR stage-entry manifest is read only for fixed workspace/holder
identity. The owner must never build, publish or retrospectively complete that
manifest as validation-stage evidence.

## Stage receipt ownership

The canonical VALIDATION_MERGE receipt is constructed only by stage-receipt.cjs.

Both profiles bind:
- exact candidate/diff/path scope;
- exact merge attribution;
- current target packet-lease absence;
- holder absence;
- workspace clean proof;
- next legal action POSTMERGE_CONVERGENCE.

Profile A additionally binds the reviewed historical D-013 release and
exact/equivalent validation D-014 completion evidence.

Profile B instead binds the exact canonical IMPLEMENTATION_PR receipt and the
reviewed implementation coordination-convergence gates. It contains no synthetic
validation D-014 gate or receipt.

All stage-receipt authority flags remain false.

## Re-inspection

Success requires the landed repository finalization inspector to return exactly:

~~~
ALREADY_FINALIZED
result = PASS
attentionDisposition = COMPLETE
requiredEffectClasses = []
nextLegalAction = POSTMERGE_CONVERGENCE
~~~

The inspector remains read-only. Apply effect counters are reported separately.

## Validation

~~~
node --check products/chatgpt-mobile-coder-lab/coordination/validation-finalization/mcl-validation-finalization-apply.cjs
node --check products/chatgpt-mobile-coder-lab/coordination/validation-finalization/tests/test-mcl-validation-finalization-apply.cjs
node --test products/chatgpt-mobile-coder-lab/coordination/validation-finalization/tests/test-mcl-validation-finalization-apply.cjs
git diff --check
~~~

Natural finalization apply for either reviewed profile is forbidden during
IMPLEMENTATION_PR, VALIDATION_MERGE and POSTMERGE_CONVERGENCE of this coordinator
change. The #2463 proof remains historical. The first #2786 apply belongs only to
EXPERIMENT_CLOSE after this implementation is merged and postmerge-proven.
