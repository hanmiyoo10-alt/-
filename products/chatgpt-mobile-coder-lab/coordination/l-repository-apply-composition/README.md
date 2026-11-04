# MCL L repository apply composition

Refs #3525 #3524 #4100 #4101.

This composition keeps the raw workspace-holder claim inside one L-local process
while invoking the existing fixed L repository owner. It does not become a Git
writer or a second source authority.

## Supported operations

Exactly four public operations exist:

```text
apply
review-update
continue-prepared
finalize
```

`apply` preserves the existing #3525 contract. It accepts the fixed ordinary
`mcl-l-repository-owner-request.v1`, patch, and non-closing PR request.

`review-update` accepts only the fixed
`mcl-l-review-update-request.v1`, patch, and non-closing PR request. The
composition performs structural packet/path/digest preflight only. The L
repository owner remains responsible for semantic parsing, old-head/current-main
proof, replay, validation, commit/currentization, non-force push, and same-PR
readback. If the merged L owner does not support `review-update`, the
composition fails closed. It never falls back to ordinary `apply`.

`continue-prepared` accepts only the existing fixed
`mcl-l-prepared-continuation-request.v1` plus a non-closing PR request. It is
admitted only for an exact recovery-rebind manifest and delegates all prepared
state, replay, validation, commit/currentization, push and PR semantics to the
existing L repository owner. No patch file is accepted or replayed by this
composition.

`finalize` recovers only already-published activation state and never runs the
source effect again.

## Holder boundary

The effect sequence remains:

```text
exact live D-013 + D-014 binding
→ PREPARED workspace inspect
→ process-local holder claim
→ holder check
→ fixed L owner effect
→ activation
→ holder check
→ D-013 release/readback
→ holder release
→ D-014 COMPLETE
```

The holder claim is never a CLI argument or normal result field. It is supplied
to the L owner only in the composition process environment.

Live binding is refreshed before owner mutation boundaries, including staged
patch application, commit, currentization merge, push, and ordinary PR creation.

## Activation compatibility

New activation records bind `effectOperation=apply|review-update|continue-prepared`. Finalization
uses that exact operation when constructing completion evidence.

Legacy #3525 activation records that predate `effectOperation` remain valid and
are interpreted only as `apply`. An explicit unknown operation is a conflict.
Operation identity is never inferred from branch, title, packet prose, or PR
number.

Completion validation references are operation-specific:

```text
receipt:mcl-l-repository-owner:apply:<manifest-id>
receipt:mcl-l-repository-owner:review-update:<manifest-id>
receipt:mcl-l-repository-owner:continue-prepared:<manifest-id>
```

## Authority boundary

The composition accepts no caller-selected repository, executable, Git command,
environment map, holder claim, branch/worktree outside the manifest, PR number,
current-main SHA, merge strategy, retry count, or fallback.

It grants no merge-to-main, software release, production, runtime, device,
Wireless ADB, pairing, or security authority. All D-013, D-014, holder,
currentness, validation, PR, and repository-owner gates remain authoritative.
