# Local Usage Dashboard E25 Acceptance — 2026-09-08

Status: **IMPLEMENTED / MERGED / POST-MERGE CANARY PASS**

Shared-standard automation verdict: **IMPROVED PARTIAL**

Physical verification: **NOT AN E25 REQUIREMENT**. The deployed 5.106 physical-verification state remains independently **PENDING**.

## 1. Scope

E25 implements the frozen design in `docs/USAGE_DASHBOARD_E25_TRUSTED_PR_HANDOFF_AND_STAGE_FAILURE_PRECISION_DESIGN.md`:

- E25-A: trusted deterministic release-PR discovery/reuse and durable `pr_number` handoff;
- E25-B: bounded E7 stage failure projection using phase, reason, and optional sanitized diagnostic code;
- no new credential class, production authority, release authority, physical-acceptance authority, or auto-merge authority.

Canonical authority:

- feature / authority issue: #1884
- design PR: #1885
- implementation PR: #1886
- implementation final head: `7ddf7a888677431f8effa8fce714e720b7939504`
- main merge commit: `122d6a1ce417f254590d74f688250ae6e38ffb2f`

## 2. Release baseline preserved

Current deployed release remains:

- Product: `3.0.0-alpha.5.106`
- Engine: `1.6.40`
- Manager: `1.3.6`
- CLI: `1.10.0`
- Models: `1.280.0`
- contracts: snapshot `1`, recentRequest `1`
- release branch: `release-usage-dashboard`
- release head: `77cf4524d230a907ab90c89ac7fd25e1f96a48f9`

Post-merge read-back proved `plugins/usage-dashboard/runtime/product-manifest.json` has the same blob SHA on `main` and `release-usage-dashboard`:

`a5b5f743d0b7d22f8bfd76b2a37cdbff2bcddf09`

Therefore E25 is byte-neutral control-plane work. It consumes no Product/Engine/Manager/CLI/Models version, requires no monotonic release promotion, and requires no `+` reinstall or E25-specific device verification.

## 3. Pre-merge regression evidence

Final implementation head:

`7ddf7a888677431f8effa8fce714e720b7939504`

Final pre-merge Candidate Validation:

- run: `34191974130`
- `validate / validate`: **SUCCESS**
- non-authoritative deterministic release-PR lane: **SKIPPED as intended for this PR context**

The final GREEN state was reached without changing Product/runtime/release bytes.

### P72 regression recovery

Candidate Validation exposed latent/brittle P72 test assumptions rather than E25 runtime defects. Recovery remained test-only:

1. `09745e691d33604097f1f291359af27ae60f122a` — narrowed the forbidden materializer route check from the bare `/gateway-endpoint-rpm` substring to the actual route-owner form `url.pathname === '/gateway-endpoint-rpm'`, preserving the legitimate 5.106 negative guard.
2. `38d3d5cd25dea30004bc2826c0f9233930d94502` — restored P72 to the current source-fidelity regression shape and removed an unrelated stale rewrite.
3. `7ddf7a888677431f8effa8fce714e720b7939504` — aligned prior next-tier preservation with P71's semantic contract by asserting `최고 Tier` rather than an impossible plain-text concatenation across `<b>` markup.

These recovery commits changed tests only. They did not alter Product, Engine, Manager, CLI, model catalog, runtime artifacts, or the release branch.

## 4. Merge and post-merge canary evidence

PR #1886 merged with expected-head protection at exact head:

`7ddf7a888677431f8effa8fce714e720b7939504`

Merge commit:

`122d6a1ce417f254590d74f688250ae6e38ffb2f`

Post-merge evidence on that main commit:

- Candidate Validation run `34192036698`: **SUCCESS**
- Durable Release Reconciler run `34192035580`: **SUCCESS**
- Stage Request Self-Heal run `34192035717`: **SUCCESS**

Both E25-related canary workflow runs published no Actions artifacts. No durable post-merge receipt was found that proves a finer E25-A decision class such as `REUSE_EXISTING`, `CREATE_ALLOWED`, or `ASSISTANT_CREATE_REQUIRED`. This acceptance therefore records only the workflow-success evidence that is actually durable and retrievable, and does not manufacture a more specific canary conclusion.

## 5. Shared-standard verdict

### Stability / Safety

**PASS.** Existing 5.106 release bytes and physical-truth boundaries are unchanged.

### Simplification

**PASS.** Deterministic PR discovery/reuse and bounded failure projection reduce manual handoff ambiguity without adding a new credential or authority owner.

### Correctness / Authority

**PASS.** E22/E23/E24 authority boundaries, exact-SHA validation, expected-head merge, monotonic exact-byte promotion, and deployment != physical acceptance remain preserved.

### Determinism / Reproducibility

**PASS.** E25-A is reducer-driven and fail-closed for ambiguous/stale/invalid candidates; E25-B projects a bounded phase/reason taxonomy rather than arbitrary logs.

### Recoverability / Retry Safety

**PASS.** Existing deterministic PR reuse and post-bind re-read semantics are preserved; no retry loop is authorized for unavailable trusted PR creation.

### Full Automation

**IMPROVED PARTIAL.** E25's discovery/reuse/binding path is implemented and post-merge workflows are GREEN, but trusted initial PR creation has not been live-proven under current repository policy. The authorized assistant-create fallback therefore remains part of the safe boundary. Full Automation must not be upgraded to PASS until a real current-policy live proof exists.

## 6. Physical truth boundary

This E25 acceptance does not alter the deployed 5.106 physical state.

- E25 itself requires no PocketRisu/Android verification because its deployed artifact bytes did not change.
- 5.106 remains deployed on `release-usage-dashboard` but its separate physical verification remains `PENDING` until actual-device evidence is supplied through the established physical-verification authority.
- CI, deployment, this acceptance document, and any automation MUST NOT synthesize physical acceptance.

## 7. Acceptance conclusion

E25 is accepted as implemented, merged, byte-neutral control-plane improvement with post-merge canary workflows GREEN.

The remaining automation gap is intentionally explicit: trusted initial release-PR creation is not accepted as live-proven. Automation remains **IMPROVED PARTIAL**, not full PASS.

Next lifecycle checkpoint returns to the already-deployed 5.106 physical verification. No E25 deployment or reinstall step is permitted or necessary.
