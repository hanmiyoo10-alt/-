# Validation finalization inspector

This directory owns the repository-level read-only Phase 8.7e validation-stage finalization projection.

Core rule:

```text
merge proves the Git effect
finalization proves the validation stage is complete
```

The owner consumes exact semantic evidence for one validation-stage candidate and projects one bounded disposition:

- `ALREADY_FINALIZED`
- `FINALIZATION_REQUIRED`
- `MERGE_NOT_PROVEN`
- `NEEDS_RECOVERY_INSPECT`
- `BLOCKED`
- `CONFLICT`
- `UNKNOWN`

A positive finalized result requires exact merge/candidate/diff/path attribution, exact head-bound validation, no required UNKNOWN, applicable coordination convergence or `NOT_APPLICABLE`, and an exact canonical `VALIDATION_MERGE` receipt whose next legal action is `POSTMERGE_CONVERGENCE`.

`FINALIZATION_REQUIRED` is classification only. It may identify fixed semantic classes such as coordination finalization, workspace-clean proof, or canonical stage-receipt publication, but it grants no effect authority.

Repository-only consumers use neutral coordination states. Product-specific coordination systems may adapt their own evidence into `NOT_APPLICABLE / COMPLETE / INCOMPLETE / CONFLICT / UNKNOWN`; this owner does not import or own those systems.

The owner never:

- merges or retries a merge;
- currentizes, rebases, pushes, or writes refs;
- invokes shell, Git, GitHub, network, process, device, release, or production effects;
- chooses evidence by timestamp or latest-comment-wins;
- treats merged=true without exact candidate attribution as sufficient;
- turns ambiguous lost acknowledgement into a merge retry;
- absorbs `POSTMERGE_CONVERGENCE`.

Normal finalized routing is:

```text
ALREADY_FINALIZED
→ POSTMERGE_CONVERGENCE
```

Ambiguous effect truth routes to `RECOVERY_INSPECT`. A missing merge routes only to validation-stage re-evaluation. Missing fixed finalization evidence routes to separately reviewed finalization-effect review.

The V1 contract is implemented in `validation-finalization-owner.cjs` and covered by `tests/validation-finalization-owner-contract.cjs`.

This directory owns classification only. A future effectful apply composition, if justified by natural evidence, requires a separate reviewed packet and must compose existing fixed owners rather than adding a generic finalizer.
