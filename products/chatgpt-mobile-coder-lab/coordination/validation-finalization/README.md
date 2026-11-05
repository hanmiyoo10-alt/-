# MCL validation finalization apply v1

This directory owns the Mobile Coder Lab Phase 8.7e-B fixed-profile finalization compositions.

The repository-wide finalization inspector remains the semantic classifier.
This owner contains only compile-time reviewed MCL profiles. It is not a generic
packet finalizer and does not add caller-selected coordination semantics.

## Reviewed fixed profiles

V1 contains exactly sixteen reviewed targets.

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

### Profile F — #3099 / PR #3102

The sixth profile is the exact repository-implementation finalize-recovery packet:

- exact canonical current IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for currentization payload preservation, D-013 release and D-014 completion;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #3099 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile G — #3144 / PR #3147

The seventh profile is the exact repository-implementation packet-activity composition packet:

- exact canonical current IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for currentization payload preservation, D-013 release and D-014 completion;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #3144 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile H — #3110 / PR #3113

The eighth profile is the exact stage-entry packet-activity adapter packet:

- exact canonical current IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for currentization payload preservation, D-013 release and D-014 completion;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #3110 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile I — #3118 / PR #3122

The ninth profile is the exact historical D-013 release-proof recovery packet:

- exact canonical current IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for currentization payload preservation, D-013 release and D-014 completion;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #3118 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile J — #3126 / PR #3129

The tenth profile is the exact historical D-013 aggregate scan-lifetime recovery packet:

- exact canonical current IMPLEMENTATION_PR receipt and merged candidate attribution;
- fixed PASS gates for currentization payload preservation, D-013 release and D-014 completion;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #3126 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile K — #3108 / PR #3135

The eleventh profile is the exact descendant-main finalize-recovery packet after
packet-scoped currentization:

- exact currentized canonical IMPLEMENTATION_PR receipt and merged currentized head attribution;
- exact currentization manifest/workspace lineage;
- fixed PASS gates for original D-013/D-014 convergence, currentization release/completion,
  payload-preservation/replay proof and the natural #3090 recovery proof;
- current packet-lease absence in #2352;
- exact clean preserved currentized worktree and holder absence;
- the stale original implementation head is never accepted as the merged candidate;
- no validation-stage D-014 manifest is created.

For #3108 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile L — #2791 / PR #2795

The twelfth profile is the exact merged M Termux lifeline IPC repair after
packet-scoped currentization:

- exact currentized canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- exact currentization manifest/workspace lineage;
- fixed PASS gates for currentization scope/blob preservation and replay safety,
  D-013 release, D-014 completion, exact-head Verify/Required, dedicated lifeline CI,
  and the exact seven-path scope;
- current packet-lease absence in #2352;
- exact clean preserved currentization worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #2791 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile M — #3216 / PR #3219

The thirteenth profile is the exact merged primary-S RDC maintenance owner after
its bounded implementation publication/recovery rebind:

- exact canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- exact recovery-rebind manifest/workspace lineage;
- fixed PASS gates for scope/blob preservation, D-013 release, D-014 completion,
  implementation coordination convergence, exact-head Verify/Required, and exact
  four-path scope;
- current packet-lease absence in #2352;
- exact clean preserved implementation worktree and holder absence;
- no validation-stage D-014 manifest is created.

For #3216 the only permitted finalization effect is publication of the missing
canonical VALIDATION_MERGE receipt followed by read-only re-inspection.

### Profile N — #3356 / PR #3358

The fourteenth profile is the exact merged docs-only primary-S RDC checkpoint sync:

- exact candidate / merge / implementation-receipt / diff / one-path identity is fixed;
- the implementation receipt must prove currentization preservation, review repair,
  Verify/Required, and `coordination-not-applicable`;
- current #2352 must prove packet #3356 has no active lease;
- no D-014 manifest, workspace, holder or completion receipt is read, selected,
  synthesized or mutated;
- finalization evidence projects coordination and workspace as `NOT_APPLICABLE`;
- the only permitted effect is one canonical `VALIDATION_MERGE` receipt comment;
- an exact existing receipt is reused and a second apply is zero-effect.

### Profile O — #3561 / PR #3794

The fifteenth profile is the exact merged L interrupted-recovery rebind owner:

- exact canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- exact L/L implementation D-014 manifest, released lease, clean worktree and holder absence;
- exact implementation D-014 COMPLETE receipt identity is compile-time fixed and revalidated;
- fixed PASS gates for currentization diff preservation, coordination release,
  exact-head Verify/Required, and exact three-path scope;
- current #2352 must prove packet #3561 has no active lease;
- no validation-stage D-014 manifest is created;
- the only permitted effect is one canonical `VALIDATION_MERGE` receipt comment;
- an exact existing receipt is reused and a second apply is zero-effect.

For #3561 the live #3473 recovery transaction remains separately owned and is never
performed by this finalization profile.

### Profile P — #3762 / PR #3786

The sixteenth profile is the exact merged M→S Wireless ADB peer-controller packet:

- exact canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- exact L/L implementation D-014 manifest, released lease, clean worktree and holder absence;
- exact implementation D-014 COMPLETE receipt identity is compile-time fixed and revalidated;
- fixed PASS gates for currentization scope/blob preservation, coordination release,
  Codex exact-head clear, exact-head Verify/Required, and exact three-path scope;
- current #2352 must prove packet #3762 has no active lease;
- no validation-stage D-014 manifest is created;
- the only permitted effect is one canonical `VALIDATION_MERGE` receipt comment;
- an exact existing receipt is reused and a second apply is zero-effect.

This profile finalizes repository validation only. It grants no M/S device, ADB,
pairing, bootstrap-pin, reconnect, persistence, release or production authority.

### Profile Q — #3203 / PR #3204

The seventeenth profile is the exact already-merged D-013 zero-run reconciliation packet whose historical validation inspect sidecar was not durably retained:

- exact currentized canonical IMPLEMENTATION_PR receipt and merged candidate attribution;
- exact S/S currentization D-014 manifest, released lease, clean historical worktree and holder absence;
- exact currentization D-014 COMPLETE receipt identity is compile-time fixed and revalidated;
- fixed PASS gates bind currentization release/completion/lineage, scope/blob preservation, original release/completion, exact-head Verify/Required, exact nine-path diff, focused matrix, holder/workspace convergence, non-closing PR authoring, packet-scoped replay, PR observe, and repository patch write;
- current #2352 must prove packet #3203 has no active lease;
- no historical validation inspect sidecar is reconstructed or claimed;
- no merge/currentization retry is permitted;
- the only permitted effect is one canonical `VALIDATION_MERGE` receipt comment;
- an exact existing receipt is reused and a second apply is zero-effect.

This profile repairs #3208 only. It does not rewrite #3203 source bytes or weaken generic finalization semantics.

The caller supplies only one of the seventeen reviewed packet numbers and a bounded output
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

node mcl-validation-finalization-apply.cjs inspect --packet '#3099' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3099' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3110' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3110' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3118' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3118' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3126' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3126' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3144' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3144' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3108' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3108' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#2791' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#2791' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3216' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3216' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3203' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3203' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3356' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3356' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3561' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3561' --format agent-view

node mcl-validation-finalization-apply.cjs inspect --packet '#3762' --format agent-view
node mcl-validation-finalization-apply.cjs apply --packet '#3762' --format agent-view
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

Profiles B, C, D, E, F, G, H, I, J, K, L, M and O each require their exact compile-time canonical IMPLEMENTATION_PR
receipt digest plus their exact compile-time coordination gate set. Profile B
requires `implementation-coordination-readback` + `implementation-d013-release`.
Profile C requires the reviewed original implementation release/completion gates
and the exact currentization release/completion/replay-preservation gates.
Profile D requires `currentization-scope-and-blob-preservation`,
`d013-d014-holder-convergence`, `d013-release` and `d014-completion`.
Profile E requires `currentization-scope-and-blob-preservation`,
`d013-release` and `d014-completion`.
Profile F requires `currentization-scope-and-blob-preservation`,
`d013-release` and `d014-completion`.
Profile G requires `currentization-scope-and-blob-preservation`,
`d013-release` and `d014-completion`.
Profile H requires `currentization-scope-and-blob-preservation`,
`d013-release` and `d014-completion`.
Profile I requires `currentization-scope-and-blob-preservation`,
`d013-release` and `d014-completion`.
Profile J requires `currentization-scope-and-blob-preservation`,
`d013-release` and `d014-completion`.
Profile K requires `d013-release`, `d014-completion`,
`currentization-coordination-released`, `currentization-d014-complete`,
`currentization-scope-and-blob-preservation`,
`packet-scoped-currentization-replay` and `natural-3090-recovery-proof`.
Profile L requires `currentization-scope-and-blob-preservation`,
`currentization-replay-safe`, `currentization-d013-release`,
`currentization-d014-complete`, `exact-head-required`, `exact-head-verify`,
`lifeline-dedicated-ci` and `exact-seven-path-scope`.
Profile M requires `currentization-scope-and-blob-preservation`, `d013-release`,
`d014-completion`, `implementation-coordination-converged`,
`exact-head-required`, `exact-head-verify` and `exact-four-path-diff`.
Profile N requires `currentization-scope-and-blob-preservation`,
`coordination-not-applicable=NOT_APPLICABLE`, `exact-head-required`,
`exact-head-verify`, and `review-finding-addressed`. It has no workspace/holder/
D-014 admission because those semantics are compile-time not applicable.
Profile O requires `currentization-diff-preserved`, `coordination-released`,
`exact-head-required`, `exact-head-verify`, and `exact-three-path-diff`.
It additionally binds the exact L/L implementation D-014 manifest and exact D-014
COMPLETE receipt before the existing implementation-coordination finalization path
may publish a canonical validation receipt.
Profile P requires `codex-exact-head-review-clear`, `coordination-released`,
`currentization-scope-and-blob-preservation`, `exact-head-required`,
`exact-head-verify`, and `exact-three-path-scope`.
It additionally binds the exact #3762 L/L review-update D-014 manifest and exact
D-014 COMPLETE receipt before the existing implementation-coordination finalization
path may publish a canonical validation receipt.
Profile Q requires `currentization-d013-release`, `currentization-d014-complete`,
`currentization-parent-lineage`, `currentization-scope-and-blob-preservation`,
`d013-release`, `d014-completion`, `exact-head-required`, `exact-head-verify`,
`exact-nine-path-diff`, `focused-contract-matrix`, `holder-workspace-convergence`,
`non-closing-pr-authoring`, `packet-scoped-currentization-replay`, `pr-observe`,
and `repository-patch-write`.
It additionally binds the exact #3203 S/S currentization D-014 manifest and COMPLETE
receipt before the existing implementation-coordination finalization path may publish
a canonical validation receipt.
Profile R is the exact already-merged docs-only #4214 / PR #4215 recovery profile.
It binds the fixed candidate, merge, canonical IMPLEMENTATION_PR receipt, one-path
diff identity and the exact PASS gates for Codex review, Required, Verify, PR
observation, repository-patch transport and scope-overlap. Coordination/workspace/
holder/D-014 are compile-time not applicable. It never reconstructs the missing
historical validation-merge inspect sidecar and never retries the merge.
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

#3099:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3110:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3118:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3126:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3144:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3108:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#2791:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3216:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3561:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#3762:
FINALIZATION_REQUIRED / PASS / ACTION_REQUIRED
+ CANONICAL_VALIDATION_MERGE_RECEIPT

#4214:
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

Profiles B through M, O, P, Q and R share the smaller effect order:

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

Profiles B, C, D, E, F, G, H, I, J, K, L, M and O may perform only:
- one exact canonical VALIDATION_MERGE packet comment if absent.

Profile Q may perform only:
- one exact canonical `VALIDATION_MERGE` receipt comment if absent.

Profile Q never reconstructs historical validation inspect sidecars and never performs Git/PR/currentization/merge effects.

Profile N may perform only:
- one exact canonical VALIDATION_MERGE packet comment if absent.

Profile N never constructs, selects, completes or mutates D-014/workspace/holder evidence.

Profile R may perform only:
- one exact canonical VALIDATION_MERGE packet comment if absent.

Profile R never reconstructs historical validation-merge inspect evidence and never
performs Git/PR/currentization/merge, D-013, D-014 or holder effects.

Profiles B, C, D, E, F, G, H, I, J, K, L, M and O never clean a holder and never construct or publish D-014 evidence.

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

Profiles B, C, D, E, F, G, H, I, J, K, L, M and O have no validation-stage D-014 manifest. Their exact reviewed
workspace manifests are read only for fixed workspace/holder identity. The owner
must never build, publish or retrospectively complete those manifests as
validation-stage evidence.

Profile Q has no validation-stage D-014 manifest. Its exact reviewed currentization
manifest and COMPLETE receipt are read only as implementation-coordination evidence.

## Equivalent implementation-receipt replay

Fixed profiles select the canonical `IMPLEMENTATION_PR` semantic generation by exact packet, PR/candidate, and compile-time receipt digest. The same canonical receipt may appear both as its direct immutable comment and inside the paired stage checkpoint. Identical appearances of one digest are one semantic receipt, not competing generations.

Selection groups eligible current-candidate receipts by digest, requires the fixed target digest, and still fails closed when distinct eligible digests coexist. Chronology, comment id, and latest-wins selection are forbidden. Required profile gate checks remain unchanged.

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

Profiles B through M and O instead bind the exact canonical IMPLEMENTATION_PR receipt and
their reviewed implementation-coordination convergence gates. They contain no
synthetic validation D-014 gate or receipt.

Profile Q likewise binds the exact canonical IMPLEMENTATION_PR receipt and its reviewed
implementation-coordination convergence gates; it contains no synthetic validation D-014 gate.

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
change. Existing #2463/#2786/#3043 and Profiles G-J #3144/#3110/#3118/#3126 proof remains historical. The first Profile K #3108 apply belongs
only after this implementation is merged and postmerge-proven.

## Stable self-owner finalization class

Fixed packet profiles remain authoritative and take precedence. A packet outside that
map may enter the self-owner class only when current repository evidence proves its
deterministic packet scope is exactly the three MCL validation-finalization owner files
plus `surface:mcl:validation-finalization-effect`.

Class membership is never granted by packet number alone. The owner derives the
candidate and PR from a qualifying canonical `IMPLEMENTATION_PR` receipt, requires one
of the fixed self-owner lineage gate sets, then follows that selected lineage's exact
D-014 completion evidence locator to one valid implementation completion receipt.
That completion receipt binds the exact producer D-014 manifest ID and payload hash,
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

### Late-stage zero-effect self-owner recognition

The normal self-owner publication path remains `VALIDATION_MERGE` only. A packet
that reaches `POSTMERGE_CONVERGENCE` or `EXPERIMENT_CLOSE` before the self-owner
proof is observed may use one narrower recognition path only when an exact
canonical `VALIDATION_MERGE` receipt is already present for the same live merged
PR head, candidate, merge commit, exact owner scope and diff identity.

Late recognition never publishes or rebuilds a missing V receipt. It returns only
`ALREADY_FINALIZED` with zero effects, and a missing exact V receipt blocks before
the comment writer. Conflicting V evidence remains conflict.

Self-owner implementation lineage selection is also generation-aware. Immutable
historical I receipts are preserved, but the owner reads the one merged PR and
selects only the qualifying semantic generation whose candidate equals that PR's
actual merged head. Three reviewed semantic lineages are supported:

- normal S implementation-stage entry via `d014-completion` and
  `<packet>-implementation-pr-stage-entry`;
- S packet-scoped currentization via `currentization-d014-completion` and
  `<packet>-validation-merge-currentization`;
- fixed L/L repository implementation via `d014-completion`, with exactly the
  direct-L `<packet>-implementation-pr` or stage-entry-prepared
  `<packet>-implementation-pr-stage-entry` phase. The completion receipt and
  selected manifest must carry the same exact phase ID. The manifest must bind
  exact route/executor `L / L` and one direct-child `laptop/<target>` /
  `/home/alsl0/nyang-worktrees/<target>` workspace identity.

Distinct PR generations, missing live-head generations, bad lineage, active lease,
holder presence, dirty/non-exact workspace, near-match scope or missing required
gates remain fail-closed.


## Reviewed external L product-path finalization route

The exact #4169 recovery profile records the already-merged smoke-lifecycle packet
that exposed a missing product-path finalization route. It consumes only the existing
canonical IMPLEMENTATION_PR receipt, exact D-014 completion lineage, released D-013
identity, clean L workspace/holder state, merged PR identity and current validation
evidence. It does not recreate missing coordination evidence.

Future non-neutral MCL packets may use the reusable external L route only when all of
these are true before merge:

- the packet explicitly includes surface:mcl:validation-finalization-effect;
- the canonical IMPLEMENTATION_PR receipt carries
  validation-finalization-external-owner-reviewed=PASS with evidence issue:#4182;
- the same receipt proves D-013 release, D-014 completion, exact-head Required and
  exact-head Verify;
- packet paths are exact, not prefix wildcards;
- the completion receipt and its exact manifest bind route/executor L / L, the same
  packet scopes, one direct-child laptop/* workspace, released lease, clean workspace,
  exact candidate and PR;
- the PR is actually merged at that candidate and the packet is at
  VALIDATION_MERGE.

The route publishes only the canonical VALIDATION_MERGE stage receipt and is
idempotent on exact replay. Missing/ambiguous route evidence, near-match scopes,
another executor, active lease, holder presence, dirty/moved workspace, PR/head
mismatch or any UNKNOWN/CONFLICT remains fail-closed. Path location, age, packet
number, branch naming or generic MCL membership never substitutes for the explicit
reviewed route gate.

A same-PR review-update may narrow its final D-014 write scope to the exact files
actually changed by that review update without losing the packet's full-scope
finalization lineage. This additive form is admitted only when the final L/L
review-update manifest is a strict exact path subset with identical semantic
surfaces and its `observedBaseSha` is proven by exactly one earlier L/L D-014
COMPLETE generation for the same packet, PR and exact workspace whose scopes equal
the full current packet scopes. The predecessor must be clean/released, output
that exact predecessor commit, and its release generation must be strictly lower
than the final review-update acquisition generation. Exact replay copies of one
immutable predecessor completion receipt are deduplicated by receipt identity;
distinct predecessor generations remain a conflict. Missing, foreign-workspace,
non-subset, surface-drift, out-of-order or mismatched predecessor evidence remains
fail-closed. The canonical
`IMPLEMENTATION_PR` receipt still owns the full PR diff/path identity; this lineage
rule does not let a subset manifest shrink packet authority or add mutation power.
