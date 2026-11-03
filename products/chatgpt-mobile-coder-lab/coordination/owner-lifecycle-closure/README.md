# MCL owner-lifecycle closure preflight

Read-only V1 classifier for detecting owner-lifecycle closure debt before effectful progression.

## Scope

The classifier consumes caller-supplied, source-derived evidence only. It performs no GitHub/network access, D-013/D-014 mutation, workspace/ref/PR mutation, stage-receipt publication, cleanup, runtime/device, merge, release, or production effect. All authority flags remain false.

Checkpoints:
- `AUTHORITY_SCOPE`
- `PRE_MERGE`

Independent obligations:
- `IMPLEMENT_SELF`
- `REFINE_SELF`
- `FINALIZE_SELF`
- `RETIRE_SELF`

Aggregate result precedence:
`CONFLICT > UNKNOWN > BLOCKED > PASS`.

Required-but-incomplete evidence fails closed as `UNKNOWN`. Authoritative disagreement remains `CONFLICT`. Per-obligation evidence references are provenance only and grant no authority.

## Historical replay contract

The V1 fixture set covers:
- #2813 / #3093 implementation bootstrap;
- #3055 external finalizer bootstrap;
- #3143 pre-#3149 non-decreasing self-finalization debt;
- #3149 stable self-owner coverage;
- #3178 late-recognition-only finalization;
- #4046 same-PR refinement owner gap;
- #3856/#3862 exact L retirement owner gap;
- #4148 pre-#4150 producer-lineage gap;
- post-#4150 reviewed L/L lineage coverage.

The classifier distinguishes a missing stable self-owner class from a stable class whose exact producer lineage is unsupported.

## V1 boundary

This first implementation is classifier-only. Automatic stage-entry or PRE_MERGE consumer wiring is intentionally deferred to a separately reviewed packet after the classifier itself is proven in-repository.

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
