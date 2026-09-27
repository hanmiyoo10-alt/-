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

The pure V1 classifier remains classification-only. Natural self-host evidence from #3055 adds one separately reviewed effectful sibling, `reviewed-external-finalizer.cjs`, without changing that classifier.

The reviewed external finalizer is not a generic finalization API. V1 is compile-time fixed to packet #3050 / PR #3052 and its reviewed three-path semantic contract. Its two-step boundary is:

```text
admit --implementation-receipt-file <canonical receipt>
→ validate current dynamic candidate + reviewed semantic blobs + clean validation-attention merge admission
→ publish/reuse one digest-bound admission marker

external expected-head merge

apply --apply
→ require the exact admitted head was merged
→ read the actual merge SHA
→ require receipt-only finalization
→ publish/reuse exactly one canonical VALIDATION_MERGE receipt
→ re-read ALREADY_FINALIZED
```

`admit` never merges. `apply` never merges or currentizes and has no Git/ref, D-013/D-014, holder, device/runtime, release, or production effect. Its only issue-write effects are the fixed target admission marker and, after the separately owned merge, the exact canonical validation-stage receipt. Unknown, conflicting, duplicate, or drifted evidence fails closed; there is no latest-comment-wins selection.

The reviewed target intentionally binds semantic paths/blob identities and diff identity while reading the currentized candidate dynamically. It does not guess a future merge SHA. Any additional target or broader effect requires a separate reviewed change.

In ordinary approved remote shells where no explicit `GH_TOKEN` / `GITHUB_TOKEN` is present, the reviewed finalizer may reuse the already-authenticated `gh api` transport for semantic blob reads only through a finalizer-local adapter. That adapter admits only repository `hanmiyoo10-alt/-`, the compile-time `TARGET.paths`, an exact 40-hex ref, and fixed `GET`; all other content paths/ref forms fall back to the existing generic client and remain rejected by its allowlist. The generic validation-merge `GH_READ_ENDPOINTS` stays unchanged, token-backed behavior stays unchanged, and no credential extraction, auth mutation, arbitrary contents endpoint, or caller-selected repository/path/ref/method/body surface is added.
