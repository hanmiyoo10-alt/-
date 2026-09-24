# MCL validation finalization apply v1

This directory owns the first Mobile Coder Lab Phase 8.7e-B fixed finalization composition.

The repository-wide finalization inspector remains the semantic classifier.
This owner adds only one separately reviewed MCL effect composition for the natural
partial-finalization fixture selected by #2774 / #2863.

## V1 target

V1 is intentionally one vertical slice:

- packet #2463;
- PR #2464;
- exact reviewed candidate and merge attribution;
- exact validation D-014 manifest lineage;
- exact already-released D-013 lease provenance.

The caller supplies only the packet number and bounded output format.
Repository, PR, manifest, lease, run, workspace, effect, command and comment target
are not caller-selectable.

## Public operations

~~~
node mcl-validation-finalization-apply.cjs inspect --packet '#2463' --format agent-view

node mcl-validation-finalization-apply.cjs apply --packet '#2463' --format agent-view
~~~

inspect is always read-only.

apply is the explicit finalization effect boundary and reruns all admission evidence.

## Admission

Before any effect, V1 proves:

1. the fixed packet remains at the reviewed validation-stage compatibility shape;
2. the canonical IMPLEMENTATION_PR receipt binds the exact current merged PR head;
3. the merged PR and merge commit identities are exact;
4. the selected D-014 validation manifest is exact;
5. the historical fixed MCL Task Lease release run proves RELEASE_UPDATED for the
   exact packet/lease/generation;
6. current #2352 proves that lease absent;
7. the exact worktree branch/head is preserved and clean;
8. the holder is absent or exact stale state for that manifest/lease;
9. D-014 COMPLETE evidence is absent or equivalent through the existing
   completion-receipt-set owner;
10. canonical VALIDATION_MERGE receipt evidence is absent or exact;
11. the landed repository finalization inspector returns the reviewed state.

The only effect-bearing admission is:

~~~
FINALIZATION_REQUIRED
+ PASS / ACTION_REQUIRED
+ exact missing classes:
  COORDINATION_FINALIZATION
  CANONICAL_VALIDATION_MERGE_RECEIPT
~~~

Any other pre-effect state fails closed, except an exact ALREADY_FINALIZED state,
which returns success with zero effects.

## Fixed effect order

~~~
exact stale holder cleanup if present
→ prove holder absent
→ prove workspace clean
→ build D-014 COMPLETE through task-handoff.cjs
→ exact comment dedupe/readback
→ publish D-014 only if absent
→ build canonical VALIDATION_MERGE receipt through stage-receipt.cjs
→ exact comment dedupe/readback
→ publish stage receipt only if absent
→ landed finalization inspector re-run
→ require ALREADY_FINALIZED
→ STOP
~~~

The apply coordinator never releases or acquires D-013. The target lease must already
be positively proven released and absent.

## Effect ceiling

V1 may perform only:

- one exact stale-holder cleanup through mcl-workspace-holder cleanupStale;
- one exact D-014 COMPLETE packet comment if absent;
- one exact canonical VALIDATION_MERGE packet comment if absent.

It has no source/index/commit/ref/PR/currentization/merge, device, runtime, package,
service, release or production mutation surface.

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

Completion evidence is constructed only with task-handoff.cjs and validated against
the exact selected manifest.

Multiple COMPLETE snapshots are interpreted only by completion-receipt-set.cjs.
There is no latest-comment-wins selection.

## Stage receipt ownership

The canonical VALIDATION_MERGE receipt is constructed only by stage-receipt.cjs.

It carries:
- exact candidate/diff/path scope;
- exact merge attribution;
- exact candidate-bound owner validation and Required evidence;
- historical D-013 release evidence;
- current lease absence;
- holder absence;
- workspace clean proof;
- exact/equivalent D-014 completion evidence;
- next legal action POSTMERGE_CONVERGENCE.

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

Natural #2463 apply is forbidden during IMPLEMENTATION_PR, VALIDATION_MERGE and
POSTMERGE_CONVERGENCE of the coordinator itself. It belongs only to the later
EXPERIMENT_CLOSE stage after this implementation is merged and postmerge-proven.
