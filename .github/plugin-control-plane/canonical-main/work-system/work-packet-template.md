# Work Packet — <PACKET_ID>

<!-- canonical-main-work-packet:v1 -->

**State: READY**

Keep `State` as the packet lifecycle projection. Preserve exactly one canonical lifecycle token (`READY / CLAIMED / IN_PROGRESS / REVIEW / DONE / BLOCKED / CANCELLED / SUPERSEDED`) here when updating stage bookkeeping. Do not replace lifecycle State with stage-only prose; update `Interaction stage` separately.

Before creating a canonical work-packet issue or publishing a packet-body update, materialize the exact candidate body and require this read-only preflight to return `PASS`:

```text
node .github/plugin-control-plane/canonical-main/work-system/packet-authoring-preflight.cjs --body-file /path/to/candidate-packet.md
```

Do not bypass a non-PASS result by substituting `ACTIVE`, guessing lifecycle from stage prose, or adding another canonical lifecycle word to descriptive State text. The repository does not claim to intercept every external GitHub issue-creation surface; the packet producer owns this prepublication check.

## Primary goal

<ONE_PRIMARY_GOAL>

## Source

- Idea / decision: <SOURCE_ID_OR_ISSUE>

## Classification

- System impact: `<NO_SYSTEM_UPDATE|SYSTEM_UPDATE_REQUIRED>`
- Importance: `<최상|높음|중간|낮음>`
- Difficulty: `<낮음|중간|높음|매우 높음>`
- Size: `<작음|중간|큼|매우 큼>`

## Read first

1. current `main`
2. <AUTHORITY_INPUT_1>
3. <AUTHORITY_INPUT_2>

## Execution compactness

Choose the route before constructing non-trivial local execution payloads. Reuse the existing repository compactness contract in `.agents/skills/agent-execution-compactness/SKILL.md`.

- Route: `<EXISTING_COMMAND|HARNESS|INLINE_SMALL|MATERIALIZE|EXCEPTION>`
- Command/file surface: <SHORT_COMMAND_OR_FILE_HARNESS_OWNER>
- Validation preserved: <REQUIRED_TESTS_CHECKS_EVIDENCE>
- Guardrail accounting: logical lines `<N_OR_NA>`; source/program bytes `<N_OR_NA>`; generated source/test/program files `<N_OR_NA>`
- Exception reason: <NONE_OR_EXPLICIT_BOUNDED_REASON>

`INLINE_SMALL` is not a quoting category. If the directly supplied execution/program payload crosses the existing compactness defaults of approximately 20 logical lines, 2 KiB, or one generated source/test/program file, use `MATERIALIZE` or an evidence-equivalent `HARNESS` unless a bounded `EXCEPTION` is explicitly justified. Quoting, escaping, or heredoc wrapping does not reclassify a large payload as small.

`EXCEPTION` always requires a concrete reason. Compactness never removes required validation, authority checks, uncertainty, failure evidence, or project-owned gates.

## Interaction stage

Use the repository-wide staged-interaction default for substantial interactive work.

Ordered stages:
`AUTHORITY_SCOPE → IMPLEMENTATION_PR → VALIDATION_MERGE → POSTMERGE_CONVERGENCE → EXPERIMENT_CLOSE`.

- Current stage: `<AUTHORITY_SCOPE|IMPLEMENTATION_PR|VALIDATION_MERGE|POSTMERGE_CONVERGENCE|EXPERIMENT_CLOSE>`
- Completed stage(s): <NONE_OR_ORDERED_COMPLETED_STAGES>
- Next stage: <NEXT_STAGE_OR_NONE>
- Ordinary continuation budget: `1 substantial stage`
- Stage-collapse / recovery exception: <NONE_OR_EXPLICIT_BOUNDED_REASON>

An ordinary continuation advances at most one substantial stage. A tiny read-only task may collapse stages only when it genuinely completes in at most two bounded reads. A safety-critical recovery may continue only to the nearest safe stop when delaying would create material risk, and that exception must be recorded. Explicit user instruction may authorize a broader run. Staging never removes required Git, CI, release, production, authority, validation, uncertainty, or evidence checks.

Phase 8.7g intra-stage continuation interprets that ordinary budget as the one substantial stage actually performed after fresh durable rebind. Discovering that an advertised earlier stage is already complete consumes zero current stage budget and never reopens that completed stage.

Inside the actual current stage, preserve every still-valid proven prefix and completed effect, then reconverge only the stale or incomplete suffix. Required immediate effect readback, current-stage validation, idempotence/CAS confirmation, evidence publication, and required current-packet self close-sync may remain one stage-local transaction closure. They never authorize entry into the next declared substantial stage.

Transient read-only `UNKNOWN` retry must remain bounded, same-identity, and explicitly permitted by the owning read-only contract; retry-until-PASS is forbidden. Same-scope acceptance refinement requires exact equality of writable path/prefix set, semantic/effect surface set, primary goal, and effect owner. Any owner/scope/authority expansion or unresolved `BLOCKED / UNKNOWN / CONFLICT` stops the continuation.

Use only the finite interaction dispositions owned by `policy.json::stagedInteraction.intraStageContinuation`. Those dispositions grant no effect authority and do not change the existing five-stage sequence or the numeric ordinary continuation budget.

This packet body is a current lifecycle projection, not an immutable activation snapshot. Before or atomically with native issue closure, reconcile State; completed/current/next stage; evidence-backed Proof / closure terms; required acceptance UNKNOWNs; and Handoff / exact next action so the body does not advertise already-completed work. Native closure or a final comment alone does not override a contradictory stale body. If terminal evidence conflicts with this body, classify the body projection as stale, re-read terminal evidence, and do not resume the stale advertised stage without fresh re-attribution.

## Bounded write scope

- `path:<EXACT_REPO_PATH_OR_TRAILING_PREFIX>`
- `<OPTIONAL surface:<owning-domain>:<stable-owner-or-effect> ONLY WHEN A REAL CROSS-PATH COLLISION BOUNDARY EXISTS>`

Repository/shared/product classification is context only and never an implicit lock. For repository-byte mutation, list every writable `path:` scope. Add a semantic/effect `surface:` only when otherwise-disjoint paths can mutate the same logical owner or effect boundary; it supplements the path list and grants no additional path authority. Reuse the existing owner/effect identity rather than naming the packet, branch, worker, account, chat, or executor. Do not use broad umbrella identities such as `surface:repo:common`, `surface:scope:repo`, or `surface:shared:all`. If a stable owner/effect identity cannot be established from current authority, preserve `UNKNOWN` or `CONFLICT` instead of inventing one.

Keep only writable `path:` / required semantic `surface:` entries inside this deterministic write-scope section. Before listing preservation, exclusion, comparison, neighboring-owner, `do not modify`, non-write, or forbidden paths/surfaces, start a separate level-two section such as `## Preservation boundary`. Do not leave those entries in this section and rely on descriptive prose to make them non-writable. The producer-side packet authoring preflight rejects that mixed-section shape before publication; the semantic scope parser itself remains exact and fail-closed.

Finalization routing is declared at AUTHORITY_SCOPE rather than repaired after merge. A canonical-main infrastructure packet that intends to use the generic repository-neutral validation finalizer must declare one specific stable `surface:repo:<owner-or-effect>` here. An intentionally path-only packet may instead use a separately reviewed finalization owner; do not invent a fake surface for that case. Before merge admission, its canonical IMPLEMENTATION_PR receipt must carry the exact gate `validation-finalization-external-owner-reviewed=PASS` with a real evidence locator. That gate records reviewed routing only and grants no finalization, mutation, merge, coordination, release, runtime, or production authority.

The entries above are implementation/effect outputs and external coordination targets. The packet's own GitHub issue is a reserved self-bookkeeping surface for faithful lifecycle State, interaction-stage, evidence-backed proof/UNKNOWN, Handoff, and terminal close-sync projection; do not add the packet's own issue here solely for that bookkeeping. Reserved self-bookkeeping cannot change the primary goal, acceptance, external write scope, or evidence to manufacture completion, and it grants no authority over any other issue or repository/runtime surface. Overlap classification considers only explicitly declared implementation/effect scopes and does not gain an implicit self-issue token.

## Dependencies / blockers

- <NONE_OR_EXPLICIT_DEPENDENCY>

## Expected outputs

- <OUTPUT>

## Acceptance

1. <ACCEPTANCE_CRITERION>

## Proof / closure

Use only evidence-backed terms from the Work System taxonomy:
`IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN / OBSERVATIONAL_PENDING / BLOCKED_CAPABILITY / DONE`.

- Evidence terms reached: <ADD_ONLY_TERMS_WITH_EXACT_EVIDENCE_SCOPE>
- Required acceptance UNKNOWNs: <NONE_OR_EXPLICIT_REQUIRED_UNKNOWN>
- Explicitly non-blocking pending/capability evidence: <NONE_OR_ITEM_PLUS_ACCEPTANCE_REFERENCE>

`DONE` belongs in the packet lifecycle State only after every declared required acceptance item is satisfied at its required proof level and required UNKNOWN evidence is `NONE`. `OBSERVATIONAL_PENDING` or `BLOCKED_CAPABILITY` may coexist with `DONE` only when the affected evidence was explicitly declared non-blocking by this packet's acceptance. Do not infer `LIVE_PROVEN` from `CONTRACT_PROVEN`.

PR linkage is fail closed: if required acceptance remains after merge, especially blocking `POSTMERGE_CONVERGENCE` or `LIVE_PROVEN` evidence, use `Refs #<packet>` and do not use `Fixes` or `Closes`. A closing keyword is allowed only when merge itself satisfies every required acceptance item and no required postmerge proof remains. Native GitHub issue closure alone is not proof-taxonomy `DONE` evidence.

## Stop condition

<EXACT_STOP_CONDITION>

## Handoff

At session end record:
- state reached
- current interaction stage, completed stages, and exact next stage
- proof/closure taxonomy terms reached and exact evidence scope
- verified evidence
- files/issues/PRs changed
- unresolved required UNKNOWNs
- explicitly non-blocking OBSERVATIONAL_PENDING / BLOCKED_CAPABILITY evidence, if any
- blockers/dependencies
- exact next action
