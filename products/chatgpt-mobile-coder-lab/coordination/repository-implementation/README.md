# MCL bound repository implementation coordinator

`mcl-repository-implementation.cjs` is the Phase 8.6b S-only fixed effect-stage owner for one ordinary `IMPLEMENTATION_PR` transaction.

It composes existing owners. It does not replace them and does not create a generic dispatcher.

## Fixed transaction

```text
current packet / main / #485 / complete DISJOINT overlap
+ exact parent stage-entry D-014 + HANDOFF_READY
+ active D-013 repository lease
+ exact clean leased worktree / remote head
+ bounded repository-patch request
+ fixed validation request
+ bounded PR-publication request
→ immutable child D-014 + child HANDOFF_READY
→ same-process workspace-holder
→ existing repository patch owner
   PREPARE → fixed prepared validation → COMMIT → PUSH
→ exact local/remote head readback
→ one fixed same-repository non-closing PR
→ exact PR readback
→ normal D-013 release
→ holder release
→ child + parent D-014 COMPLETE receipts
→ owner report → execution receipt v2 → Agent Decision View
```

A successful view is scoped to `IMPLEMENTATION_PR` and sets `nextLegalAction=VALIDATION_MERGE`.

## Authority boundaries

The coordinator is fixed to:

- repository `hanmiyoo10-alt/-`;
- route/executor `S`;
- the already leased `server/mcl-packet-N` worktree;
- base branch `main` for PR publication;
- the existing repository patch owner for patch/commit/push semantics;
- the existing D-013, D-014 and workspace-holder owners.

All emitted authority flags remain false. The receipt is evidence, not permission.

The coordinator does not accept a caller repository, base branch, head branch, worktree, command, executable, owner selector, environment map, retry count, reviewer, label, milestone, draft mode, merge action, branch deletion, or PR update operation.

## Parent and child D-014

The existing stage-entry manifest and `HANDOFF_READY` are immutable parent preparation evidence.

Before effect, the coordinator requires the exact parent envelopes to exist as unique durable packet comments, verifies the current packet-body digest and active lease, and re-runs complete Work System overlap discovery.

A new child `REPOSITORY_MUTATION` manifest binds:

- exact parent manifest and handoff comment locators;
- repository-patch request hash;
- fixed validation request hash;
- repository-owned validation contract digest;
- PR-publication request hash;
- exact active lease/workspace/base/scopes.

The parent bytes are never rewritten.

`observedBaseSha` remains historical execution evidence. If protected main has advanced, the coordinator reads the base-to-current path delta and fails closed only when that current-main delta intersects the packet's writable paths. It never fetches, rebases, merges, resets, stashes or silently currentizes the leased branch.

## Validation binding

V1 supports exactly three repository-reviewed semantic prepared-state validation profiles:

```text
mcl:d014-completion-set:v1
repo:validation-continuation:v1
repo:published-progress-recovery:v1
```

The coordinator derives the unique compatible profile from the exact normalized
current packet scope. The caller-supplied validation request remains the same
strict data-only shape:

```json
{
  "schema": "mcl-repository-validation-request.v1",
  "profile": "<exact reviewed profile id>"
}
```

That request is verification input, not profile-selection authority. Zero
compatible profiles block as `NO_REVIEWED_VALIDATION_PROFILE`; multiple
matches conflict as `VALIDATION_PROFILE_AMBIGUOUS`; a supplied request that
does not match the derived profile blocks before PREPARE.

The child D-014 manifest binds both the exact validation-request digest and the
deterministic repository-owned validation-contract digest. The existing
repository patch owner re-derives the profile contract and runs its fixed
checks between PREPARE and COMMIT.

The `repo:published-progress-recovery:v1` profile is admitted only for the exact six published-progress-recovery paths plus its two semantic surfaces, and runs the fixed classifier/adapter/session/recovery contract matrix owned by repository source.

No arbitrary command, argv, executable, test path or working directory is
caller-controlled.

## PR publication request

The only caller-owned PR data is:

```json
{
  "schema": "mcl-pr-publication-request.v1",
  "title": "bounded title",
  "body": "bounded Markdown body with Refs #N"
}
```

The body must keep a non-closing `Refs #N` linkage while later stages remain. `Fixes`, `Closes`, `Resolves` and equivalent closing linkage for that source packet are rejected.

The coordinator fixes `base=main`, `head=server/mcl-packet-N`, `draft=false`, requires no existing open PR for the exact head, creates one PR, then verifies state, base, head SHA, body and exact changed-file inventory.

## Holder and cleanup ordering

The raw holder claim exists only in process memory and the existing local holder record. It is never written to Git, issue/PR text, report/receipt artifacts, stdout or stderr.

Fresh owner/holder guards remain required before later effect boundaries. On success:

```text
PR readback PASS
→ holder/current evidence PASS
→ D-013 release
→ exact released-ledger readback
→ holder release
→ D-014 completion evidence
```

No automatic retry is added. A failure after prepare, commit, push or PR creation preserves the real partial state and leaves targeted recovery to the existing recovery owners.

## CLI

```text
node mcl-repository-implementation.cjs \
  --packet '#N' \
  --parent-manifest-file <regular file> \
  --parent-handoff-file <regular file> \
  --request-file <regular file> \
  --patch-file <regular file> \
  --validation-request-file <regular file> \
  --pr-request-file <regular file> \
  --apply
```

`--apply` is mandatory. Normal stdout is one bounded `REPOSITORY_AGENT_DECISION_VIEW v1`. Raw Git, test, holder, lease and GitHub plumbing stays behind evidence locators unless targeted drill-down is required.

## Live-consumer history

The first natural live consumer for the fixed implementation coordinator was
#2569 using `mcl:d014-completion-set:v1`; that Phase 8.6b proof is preserved.

The second profile, `repo:validation-continuation:v1`, is a reviewed semantic
extension. Existing #2770 coordination must not be rewritten or backfilled to
claim adoption. A later live proof requires a fresh compatible activation
under current authority.
