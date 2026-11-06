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

`continue-prepared` accepts only one of the two fixed L-owner continuation
request schemas plus a non-closing PR request: the existing legacy
`mcl-l-prepared-continuation-request.v1`, or the additive
`mcl-l-interrupted-recovery-continuation-request.v1` for the native general
interrupted-recovery lineage. It is admitted only for the matching exact
recovery-rebind manifest profile and delegates all prepared state, replay,
validation, commit/currentization, push and PR semantics to the existing L
repository owner. A `COORDINATION` manifest is admitted only for the general
recovery continuation profile; ordinary apply/review-update remain
`REPOSITORY_MUTATION`-only. No patch file is accepted or replayed by this
composition.

`finalize` recovers only already-published activation state and never runs the
source effect again. After exact released-D-013 readback, it also reconverges one
reviewed post-effect holder residue state before reading published Git/PR identity:

```text
holder already absent -> continue with zero cleanup effect
exact same manifest + same released lease holder -> cleanupStale once -> reread absent -> continue
foreign / malformed holder, active target lease, cleanup failure, or absent-proof failure -> BLOCKED
```

This suffix is operation-neutral for every current effect operation:
`apply | review-update | continue-prepared`. A future effect operation that can
claim a holder and release D-013 before D-014 completion must gain the same
holder-absent and released-D013-stale-holder regression rows before it is
closure-complete. No holder secret is reconstructed and no fresh holder is
claimed during finalization.

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


### continue-pushed

This operation recovers only an exact L repository candidate already committed
and pushed to its bound feature branch while no PR publication is durably
present. The composition requires the ordinary active D-013/D-014 binding,
requires holder absence before claim, delegates pushed-candidate identity and
fixed validation to the L repository owner, and then uses the normal release,
holder, and D-014 completion sequence. It never replays source, commit, push, or
currentization effects.
