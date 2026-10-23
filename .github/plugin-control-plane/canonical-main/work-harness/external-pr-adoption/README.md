# External PR Adoption owner v1

This directory owns one narrow read-only bridge for a canonical work packet that needs to adopt an already-existing exact same-repository pull request into the normal canonical validation pipeline.

It exists for candidates created outside the packet-owned implementation path, such as Dependabot security-update pull requests. It does not claim that the packet created, pushed, or published the candidate.

## Public CLI

```sh
node external-pr-adoption-owner.cjs inspect --packet '#N'
node external-pr-adoption-owner.cjs inspect --packet '#N' --format markdown
```

The caller can select only the packet number and output format.

The caller cannot select:
- repository;
- PR number;
- candidate head;
- base;
- changed paths;
- Required run;
- review state;
- merge method;
- GitHub endpoint or method.

Repository identity is fixed to `hanmiyoo10-alt/-`.

## Packet contract

A valid adoption packet must be native-open, `IN_PROGRESS`, and currently at `IMPLEMENTATION_PR`.

Its Work System scope must contain:
- one or more exact `path:` scopes;
- exactly one adoption surface:

```text
surface:repo:external-pr-adoption:pr-<positive PR number>
```

Prefix/broad path scopes are rejected.

The adoption surface is the only source of the PR number. Titles, labels, authors, chat context, and caller arguments do not select the candidate.

## Adoption provenance

The target PR must have been created strictly before the packet issue.

That invariant distinguishes adoption from ordinary packet-owned publication:

```text
external PR already exists
→ packet is created
→ AUTHORITY_SCOPE explicitly selects adoption
→ IMPLEMENTATION_PR read-only adoption proof
→ existing VALIDATION_MERGE
```

The owner never reconstructs a historical D-013 lease, D-014 manifest, workspace holder, push transaction, or PR-publication receipt for the external candidate.

## Read composition

The owner reuses existing semantic readers from `validation-merge-owner.cjs`:

- current main + #485 coherence;
- open/non-draft/same-repository/current-main PR identity;
- exact PR changed-file inventory;
- exact-head natural SimCore Required;
- review/requested-reviewer/unresolved-thread barrier;
- strict branch-protection currentness and ancestry.

Work System owns packet lifecycle/stage/scope parsing.

`stage-receipt.cjs` remains the only canonical IMPLEMENTATION_PR receipt projector.

## Positive result

A successful adoption returns a canonical PASS `IMPLEMENTATION_PR` stage receipt containing:

- exact current main;
- exact PR/head identity;
- exact changed path set;
- deterministic diff identity derived from immutable base + head + exact paths;
- exact-head Required evidence;
- review/currentness gates;
- proof terms `IMPLEMENTED` and `CONTRACT_PROVEN`;
- next legal action `VALIDATION_MERGE`.

`IMPLEMENTED` means the exact candidate exists and is bound to the adoption packet. It does not mean the packet created the candidate.

`CONTRACT_PROVEN` is bound to exact-head Required evidence.

No `LIVE_PROVEN` or `DONE` claim is created here.

## Failure semantics

The owner preserves fail-closed validation vocabulary:

- `BLOCKED`
- `UNKNOWN`
- `CONFLICT`
- `FAIL`
- `NEEDS_REVIEW`

Examples:
- PR does not predate packet;
- broad or mismatched packet path scope;
- missing/multiple adoption surface;
- moved/current-main mismatch;
- changed-file mismatch;
- failed/missing Required;
- CHANGES_REQUESTED or unresolved review thread;
- strict-currentness failure;
- malformed packet or GitHub evidence.

A failed adoption never mutates the PR or packet.

## Authority boundary

This owner is read-only.

It does not:
- create/update/close PRs;
- push or currentize branches;
- dispatch or rerun workflows;
- merge;
- mutate main;
- update packet comments or body;
- release software;
- mutate production/runtime/device/security settings.

Publishing the rendered receipt/checkpoint remains a separately authorized packet-bookkeeping effect.

Merge remains owned by the existing validation-merge + expected-head merge path.

## Review-fix hardening

The downstream adoption identity is carried by one canonical implementation gate:

\`\`\`text
external-pr-adoption-surface
→ surface:repo:external-pr-adoption:pr-<N>
\`\`\`

Validation-merge re-checks that this gate selects the validation PR and still exists exactly once in the current packet scope. Removing or changing the packet surface after adoption therefore invalidates merge admission.

The adoption owner also:
- performs a final exact PR/head/base/path reread before receipt projection even when branch protection is non-strict;
- preserves delegated validation-owner evidence locators;
- cites PR evidence for PR/base/path and diff facts;
- cites compare/ancestry evidence only when strict-currentness actually read it.

These guards were added after exact-head review of the predecessor #3703.

## Validation

The focused contract test is:

```sh
node .github/plugin-control-plane/canonical-main/work-harness/external-pr-adoption/tests/external-pr-adoption-owner-contract.cjs
```

The already manifest-listed validation-merge contract imports that focused test, so Plugin Control Plane CI executes it without changing the CI manifest currently owned by #3667.

Also run:

```sh
node --check .github/plugin-control-plane/canonical-main/work-harness/external-pr-adoption/external-pr-adoption-owner.cjs
node .github/plugin-control-plane/canonical-main/work-harness/validation-merge/tests/validation-merge-owner-contract.cjs
node .github/plugin-control-plane/canonical-main/tests/work-system-contract.cjs
git diff --check
```

Design/source gap: #3355.
Implementation packet: #3702.
