# MCL owner-lifecycle closure preflight

Read-only V1/V2 classifier for detecting owner-lifecycle closure debt before effectful progression.

## Scope

The classifier consumes caller-supplied, source-derived evidence only. It performs no GitHub/network access, D-013/D-014 mutation, workspace/ref/PR mutation, stage-receipt publication, cleanup, runtime/device, merge, release, or production effect. All authority flags remain false.

Checkpoints:
- `AUTHORITY_SCOPE`
- `PRE_MERGE`

V1 obligations remain unchanged:
- `IMPLEMENT_SELF`
- `REFINE_SELF`
- `FINALIZE_SELF`
- `RETIRE_SELF`

V2 adds one independent obligation:
- `RECOVER_SELF`

Aggregate result precedence remains `CONFLICT > UNKNOWN > BLOCKED > PASS`.

## Backward compatibility

`mcl-owner-lifecycle-closure-input.v1` and `mcl-owner-lifecycle-closure-receipt.v1` preserve the existing four-obligation contract. V1 callers do not receive a synthetic `RECOVER_SELF` field.

`mcl-owner-lifecycle-closure-input.v2` returns `mcl-owner-lifecycle-closure-receipt.v2` and adds `RECOVER_SELF` without changing the four V1 obligations.

## RECOVER_SELF V2

The required V2 recovery evidence is caller-supplied and source-backed:

- `naturalStates[]` contains bounded diagnostic `kind` plus boolean `routeCovered`;
- `continuationPrerequisites[]` contains bounded diagnostic `kind` plus boolean `covered`.

A missing or malformed required boolean remains `UNKNOWN`. A natural state with no reviewed route is `BLOCKED / RECOVER_ROUTE_MISSING`. A missing next-owner prerequisite is `BLOCKED / RECOVER_NEXT_OWNER_PREREQUISITE_MISSING`. If every required row is covered, the obligation is `PASS / RECOVER_SELF_COVERED`.

Receipts expose only bounded missing kind identifiers and evidence references. Kind labels are provenance/diagnostics only and never create owner, route, cleanup, Git, finalization, or mutation authority.

Source-backed fixture families include prepared/staged/dirty continuation, stale linked-worktree registration, stage-entry partial create, post-effect PR projection lag, current-main object locality, lost-ack reconvergence, owner effect reachability, packet-activity evidence, coordination envelope capacity, ephemeral holder composition, producer/consumer lineage, execution profile, executable mode, canonical evidence byte transport, and postmerge finalization reachability.

The #4214/#4216 sequence is the direct `POSTMERGE_FINALIZATION_REACHABILITY` fixture: pre-repair coverage blocks, while the landed reviewed finalization route turns the same prerequisite into PASS.

## Historical replay contract

The V1 fixture set remains unchanged and covers #2813/#3093 implementation bootstrap, #3055 external finalizer bootstrap, #3143/#3149 self-finalization, #3178 late recognition, #4046 same-PR refinement, #3856/#3862 retirement, and #4148/#4150 producer-lineage coverage.

V2 replay adds the source-backed recovery/prerequisite cases selected by #4194/#4195. Positive landed-owner fixtures must turn the same class to PASS where capability exists.

## V2 boundary

V2 remains classifier-only. It never performs recovery, cleanup, object materialization, holder/lease mutation, Git retry, evidence normalization, or finalization. Automatic stage-entry or PRE_MERGE consumer wiring remains a separately reviewed deny-only packet after known capability gaps are repaired.

## Disposable smoke/proof lifecycle closure

`mcl-smoke-lifecycle-closure.cjs` is a read-only sibling classifier for disposable proof work. It extends the closure-preflight family without changing the original owner-lifecycle V1 classifier.

Input schema: `mcl-smoke-lifecycle-closure-input.v1`.

Checkpoints:
- `PREFLIGHT`: before disposable state is created;
- `TERMINAL`: after proof and any separately authorized cleanup have completed.

Retention modes:
- `EPHEMERAL_SELF_RETIRING`: the default shape. PREFLIGHT requires every declared disposable asset to have a reviewed retirement owner. TERMINAL requires every owned asset to be absent, coordination converged, the declared baseline preserved, and foreign/unattributed residue absent.
- `EVIDENCE_PRESERVED`: an explicit exception. PREFLIGHT requires durable evidence, a bounded retention reason, and a reviewed retirement policy. TERMINAL additionally requires retained asset identity to remain current and coordination to converge.

Foreign or unattributed residue never creates cleanup authority. Missing, unknown, or conflicting identity/retirement evidence fails closed. The classifier performs no Git/GitHub/network access, D-013/D-014 mutation, workspace/ref/file cleanup, stage publication, runtime/device action, merge, release, or production effect. All authority flags remain false.

Historical contract fixtures include:
- #2391 self-retiring notebook live proof;
- #4164 exact L stage-entry smoke with separately orchestrated cleanup;
- #3862 pre-owner exact-L retirement gap;
- early evidence-preserved smoke without an explicit retention policy.

This classifier is an admission/terminal-evidence helper only. Actual retirement remains with the reviewed S/M/L or owner-specific cleanup surface.
