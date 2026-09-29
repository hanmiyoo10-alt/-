# MCL validation finalization apply v1

This directory owns the Mobile Coder Lab Phase 8.7e-B fixed-profile finalization compositions.

The repository-wide finalization inspector remains the semantic classifier.
This owner contains only compile-time reviewed MCL profiles. It is not a generic
packet finalizer and does not add caller-selected coordination semantics.

## Reviewed fixed profiles

V1 contains exactly five reviewed targets.

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

### Profile C — #3043 / PR #3046

The third profile is the exact post-merge PocketRisu handoff-liveness recovery:

- exact currentized canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for original implementation D-013/D-014 convergence plus currentization release/completion/replay preservation;
- current packet-lease absence in #2352;
- exact clean preserved currentization worktree and holder absence;
- no new validation-stage D-014 manifest is created.

For #3043 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile D — #3051 / PR #3053

The fourth profile is the exact local disposable branch-ref cleanup owner recovery:

- exact canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for currentization payload preservation plus D-013/D-014/holder convergence;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no new validation-stage D-014 manifest is created.

For #3051 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile E — #3092 / PR #3094

The fifth profile is the exact prepared-validation finalizer-profile recovery:

- exact canonical currentized IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for currentization payload preservation, D-013 release and D-014 completion;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #3092 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

The caller supplies only one of the five reviewed packet numbers and a bounded output
format. Repository, PR, manifest, lease, run, workspace, effect, command and comment
target remain non-selectable.

## Public operations

~~~
node mcl-validation-finalization-apply.cjs inspect --packet '#2463' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#2463' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#2786' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#2786' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3043' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3043' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3051' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3051' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3092' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3092' --format agent-view
~~~

inspect is always read-only.

apply is the explicit finalization effect boundary and reruns all admission evidence.

## Admission

Before any effect, all reviewed profiles prove:

1. the fixed packet remains at the reviewed validation-stage compatibility shape;
2. the canonical IMPLEMENTATION_PR receipt binds the exact merged PR head;
3. the merged PR and merge commit identities are exact;
4. current #2352 proves the target packet has no active lease;
5. the exact worktree branch/head is preserved and clean;
6. canonical VALIDATION_MERGE receipt evidence is absent or exact;
7. the landed repository finalization inspector returns the reviewed state.

Profile A additionally proves the reviewed validation D-014 manifest, historical
release provenance, exact holder relation and D-014 completion state.

Profiles B, C, D and E each require their exact compile-time canonical IMPLEMENTATION_PR
receipt digest plus their exact compile-time coordination gate set. Profile B
requires `implementation-coordination-readback` + `implementation-d013-release`.
Profile C requires the reviewed original implementation release/completion gates
and the exact currentization release/completion/replay-preservation gates.
Profile D requires `currentization-scope-and-blob-preservation`,
`d013-d014-holder-convergence`, `d013-release` and `d014-completion`.
Profile E requires `currentization-scope-and-blob-preservation`,
`d013-release` and `d014-completion`.
Each profile's exact valid workspace manifest is used only to resolve the fixed
worktree/holder location; it is never manufactured or rewritten as a
validation-stage D-014 manifest.

The effect-bearing admission is profile-specific:

~~~
#2463:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ COORDINATION_FINALIZATION
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#2786:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3043:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3051:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3092:
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

Profiles B and C share the smaller effect order:

~~~
prove exact fixed packet lease absent
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

Profiles B, C, D and E may perform only:
- one exact canonical VALIDATION_MERGE packet comment if absent.

Profiles B, C, D and E never clean a holder and never construct or publish D-014 evidence.

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

Profiles B, C, D and E have no validation-stage D-014 manifest. Their exact reviewed
workspace manifests are read only for fixed workspace/holder identity. The owner
must never build, publish or retrospectively complete those manifests as
validation-stage evidence.

## Stage receipt ownership

The canonical VALIDATION_MERGE receipt is constructed only by stage-receipt.cjs.

All reviewed profiles bind:
- exact candidate/diff/path scope;
- exact merge attribution;
- current target packet-lease absence;
- holder absence;
- workspace clean proof;
- next legal action POSTMERGE_CONVERGENCE.

Profile A additionally binds the reviewed historical D-013 release and
exact/equivalent validation D-014 completion evidence.

Profiles B, C and D instead bind the exact canonical IMPLEMENTATION_PR receipt and
their reviewed implementation-coordination convergence gates. They contain no
synthetic validation D-014 gate or receipt.

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

Natural finalization apply for any newly reviewed profile is forbidden during
IMPLEMENTATION_PR, VALIDATION_MERGE and POSTMERGE_CONVERGENCE of this coordinator
change. Existing #2463/#2786/#3043 proof remains historical. The first #3051 apply belongs
only after this implementation is merged and postmerge-proven.

## Stable self-owner finalization class

Fixed packet profiles remain authoritative and take precedence. A packet outside that
map may enter the self-owner class only when current repository evidence proves its
deterministic packet scope is exactly the three MCL validation-finalization owner files
plus `surface:mcl:validation-finalization-effect`.

Class membership is never granted by packet number alone. The owner derives the
candidate and PR from a qualifying canonical `IMPLEMENTATION_PR` receipt, requires the
fixed self-owner gate set, then follows that selected receipt's exact
`d014-completion` evidence locator to one valid implementation-stage completion receipt.
That completion receipt binds the exact stage-entry D-014 manifest ID and payload hash,
which derives deterministic repository workspace/lease lineage without choosing among
historical manifests by chronology or comment order. The owner then requires the PR to
be merged at the selected candidate and reuses the existing lease-absence,
holder-absence, clean-workspace, immutable validation-receipt-set and receipt-only
finalization checks.

The class can publish only the canonical `VALIDATION_MERGE` stage receipt. It cannot
publish validation-stage D-014 completion, mutate Git/refs/PRs, currentize, acquire or
release D-013, mutate the holder, touch devices/runtime, or grant release/production
authority. A second exact apply is zero-effect. Near-match scopes, missing fixed gates,
ambiguous semantic receipt generations, invalid manifests, active leases, holder
presence, dirty/non-exact workspaces, and unmerged/mismatched PRs remain fail-closed.

This stable class exists so an implementation packet that changes this owner can
finalize itself after merge instead of creating another packet-specific finalizer debt.
