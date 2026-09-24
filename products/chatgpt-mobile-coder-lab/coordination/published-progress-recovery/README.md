# MCL published-progress recovery

Phase 8.6.5b owns interrupted `VALIDATION_MERGE` recovery when an exact open PR already preserves the source effect.

## Layers

1. `mcl-published-progress-recovery-inspect.cjs`
   - read-only MCL evidence adapter;
   - consumes the reviewed S/M RDC session-evidence owner;
   - projects the pure repository classifier;
   - positive result: `PUBLISHED_PROGRESS_REBIND_ELIGIBLE`.
2. `mcl-published-progress-recovery-apply.cjs`
   - fixed effect coordinator;
   - composes existing D-013 / D-014 / workspace-holder owners;
   - preserves the published PR/head;
   - terminal result: `RECOVERY_REBIND_READY`.

The pure classifier remains under:

`.github/plugin-control-plane/canonical-main/work-harness/published-progress-recovery/**`.

## Core rule

> Preserve published progress; recover only its abandoned coordination envelope.

The coordinator never currentizes, edits source, commits, pushes, updates the PR, claims a fresh holder, merges, mutates a device/runtime, or performs release/production effects.

## Public operations

Read-only:

```text
node mcl-published-progress-recovery-apply.cjs \
  inspect --packet '#N' --format agent-view
```

Effectful:

```text
node mcl-published-progress-recovery-apply.cjs \
  apply --packet '#N' --apply --format agent-view
```

The caller selects only the packet and output format. `apply` additionally requires the literal `--apply`.

No repository, PR, branch, worktree, lease, manifest, holder, route, executor, head, command, argv, executable, currentization method, or effect primitive is caller-selectable.

## Positive admission

Before the first effect, the landed inspector must return exactly:

```text
PASS
PUBLISHED_PROGRESS_REBIND_ELIGIBLE
PUBLISHED_PROGRESS_RECOVERY_EFFECT_REVIEW
```

That implies current `VALIDATION_MERGE`, exact old D-013/D-014/holder identity, reviewed owner-session `ABSENT`, clean workspace, exact local=remote=open-PR head, exact changed paths, descendant attribution, and normal D-013 release eligibility.

`PRESENT`, `UNKNOWN`, dirty state, conflicting PR identity, changed paths, or release uncertainty never become takeover authority.

## Fixed effect sequence

```text
old exact D-013 release
→ prove old lease absent
→ exact stale-holder cleanup
→ old D-014 PARTIAL receipt
→ fresh main/#485 barrier
→ COMPLETE external overlap = DISJOINT
→ exact preserved PR/head recheck
→ fresh D-013 on same route/executor/branch/worktree/scopes
   observedBaseSha = preserved PR head
→ fresh VALIDATION_MERGE D-014
→ prove holder ABSENT
→ RECOVERY_REBIND_READY
→ VALIDATION_MERGE
```

The fresh lease base is the preserved PR head, not current main. Currentization belongs to Phase 8.7 after recovery.

## Replay safety

The coordinator stores one bounded immutable activation record in the repository Git common directory before the first effect. It is execution evidence, not a recovery registry or truth owner.

Every later invocation re-reads external truth and resumes only the exact missing step.

Supported replay points include:

- old lease still active;
- old lease absent but stale holder still present;
- holder absent but old PARTIAL receipt missing;
- old PARTIAL exact but fresh lease absent;
- fresh exact lease active but fresh manifest missing;
- fresh exact lease + manifest + holder absent.

Exact byte-equivalent immutable D-014 rows collapse by semantic identity. A genuinely distinct identity is `CONFLICT`.

No TTL, age, latest-comment-wins, or automatic retry policy exists.

## D-014 boundary

Both old completion evidence and the fresh manifest are built and validated only through `task-handoff.cjs`.

Before publication, complete bounded packet comments are inspected:

- exact semantic identity already present → reuse;
- same semantic slot with different identity → `CONFLICT`;
- partial comment discovery → `UNKNOWN`.

The coordinator exposes no arbitrary issue/comment writer.

## D-013 boundary

Lease effects are performed only through `mcl-coordination-operator.cjs` and the existing `mcl-task-lease.yml` owner.

Lost-ack recovery uses bounded workflow-run evidence for the exact deterministic lease identity. It does not infer success from time or absence alone.

## Holder boundary

Stale-holder cleanup occurs only after old lease absence and only through `mcl-workspace-holder.cjs cleanupStale`.

No holder secret is reconstructed or exported. A fresh holder is deliberately not claimed.

## GPT-facing evidence

The coordinator reuses:

- `REPOSITORY_EXECUTION_RECEIPT v2`;
- `REPOSITORY_AGENT_DECISION_VIEW v1`.

Normal terminal projection:

```text
VALIDATION_RECOVERY
PASS
PUBLISHED_PROGRESS=EXACT_PRESERVED
RECOVERY_REBIND_READY
NEXT=VALIDATION_MERGE
```

Full detail remains in restrictive Git-admin report/receipt artifacts.

All receipt authority flags remain false.

## Separate gaps

`#2853 MCL-RECOVERY-MANIFEST-ROW-DEDUPE-01` remains a separate old recovery-inspector gap. This coordinator accepts exact byte-equivalent rows at its own publication boundary but does not modify the old inspector owner.

## Validation

```text
node products/chatgpt-mobile-coder-lab/coordination/published-progress-recovery/tests/test-mcl-published-progress-recovery-apply.cjs
node products/chatgpt-mobile-coder-lab/coordination/published-progress-recovery/tests/test-mcl-published-progress-recovery-inspect.cjs
node .github/plugin-control-plane/canonical-main/work-harness/published-progress-recovery/tests/published-progress-recovery-contract.cjs
node products/chatgpt-mobile-coder-lab/device-ops/rdc-session-evidence/tests/test-mcl-rdc-session-evidence.cjs
```

Neighboring D-013, D-014, holder, execution-receipt and Agent Decision View contracts remain authoritative and are run by the packet validation profile/checklist.

Refs: #2743 #2744 #2766 #2769 #2776 #2840 #2853 #2887.
