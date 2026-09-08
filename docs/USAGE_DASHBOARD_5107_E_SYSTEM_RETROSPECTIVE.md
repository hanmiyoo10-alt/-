# Local Usage Dashboard 5.107 — E-system Retrospective

Date: 2026-09-08 KST
Scope: `plugins/usage-dashboard/`
Release observed: `3.0.0-alpha.5.107`

## Summary

The E-system performed well on safety, authority preservation, and merge/deploy integrity. The strongest evidence from 5.107 is that it blocked a malformed handoff before merge, recovered without changing the immutable candidate, re-established exact-SHA authority, proved no main drift immediately before merge, and then promoted only exact tested production bytes.

Overall qualitative verdict: **KEEP, with one targeted retry-path improvement**.

## What worked especially well

### 1. E15 caught a real handoff defect

The first E9 validation attempt failed because PR #1893 body contained mutable 40-character SHA prose. E15 rejected it with `E15_PR_MUTABLE_SHA_PROSE`.

This was a good failure. Product code, candidate bytes, and production were not implicated, and nothing reached `main` or `release-usage-dashboard` because the handoff contract failed closed first.

After the PR body was normalized to the stable authority form, the same immutable candidate remained valid. No source or runtime patch was required.

### 2. E9 exact-SHA validation was a strong authority boundary

The corrected retry bound request #1892, PR #1893, and candidate `00b1f5f3ba20357268f655061148ec2e6b6228ef` before running the full candidate registry.

The retry completed with all E9 jobs GREEN and published an authoritative `UD_VALIDATION_RESULT` for the exact candidate SHA.

This is preferable to treating ordinary PR CI as release authority. CI can answer whether checks pass; E9 answers whether the exact durable release candidate passed under the correct request/PR identity.

### 3. E11 prevented stale-main merge risk

Immediately after E9 GREEN, E11 produced `MERGE_READY_NO_DRIFT` and proved:

- candidate parent = frozen main;
- candidate base = frozen main;
- current main = frozen main.

The assistant then re-read PR head, candidate branch, current main, and mergeability before executing expected-head merge.

This is one of the most valuable parts of the system. It converts a potentially hand-wavy “CI is green, merge it” step into a concrete freshness barrier.

### 4. E16 made merge authority portable and deterministic

E16 emitted a derived merge authority capsule after E9/E11. The capsule did not invent new truth; it summarized already-proven authority into a compact deterministic receipt.

That made the final merge decision easier to audit and reduced reliance on conversational state.

### 5. Exact-byte promotion behaved correctly

After merge, the production workflow classified the change as a release candidate, promoted exact tested Git blobs, advanced `release-usage-dashboard` monotonically from the 5.106 release commit, and verified production parity.

The final durable deployment evidence recorded:

- Product `3.0.0-alpha.5.107`;
- Engine `1.6.41`;
- Manager `1.3.6`;
- contracts `1/1`;
- exact-byte parity `VERIFIED`;
- physical verification `PENDING`.

This cleanly preserves the separation between code/release proof and actual-device acceptance.

## Main weakness observed

### E9 retry after a failed dispatch is too sticky

The first E9 failure left an immutable `UD_E9_VALIDATION_DISPATCHED` marker on the durable request. After the PR body was corrected, the durable reconciler correctly did not falsify or delete that historical receipt, but it also did not automatically dispatch a fresh validation attempt for the unchanged candidate.

Recovery therefore required an explicit GitHub Actions job rerun.

The rerun was legitimate and safe, but this is a usability and automation gap because the canonical “user only presses + and validates hardware” operating model should not depend on an operator recognizing a stale dispatch marker and manually selecting the workflow rerun path.

## Recommended next improvement

Add a narrowly scoped **retry generation / attempt-aware E9 redispatch rule** without weakening immutable history.

Desired behavior:

1. Never delete or rewrite the original dispatch/failure receipts.
2. Keep candidate SHA immutable.
3. Permit a new E9 attempt only when the prior authoritative attempt for that exact candidate is terminal RED and a relevant mutable handoff input has changed or an explicit trusted retry event is present.
4. Record `attempt` or `retry_of` in the new durable receipt so history remains monotonic.
5. Continue to require exact request/PR/candidate binding on every attempt.
6. Never allow a retry marker itself to imply GREEN.
7. Preserve E11/E16 freshness requirements after the retry succeeds.

A safe conceptual state model would be:

```text
candidate ready
-> E9 attempt 1 dispatched
-> RED
-> handoff corrected
-> E9 attempt 2 dispatched
-> GREEN
-> E11
-> E16
-> fresh reread
-> expected-head merge
```

rather than requiring a human/operator-level workflow rerun while the durable reducer remains blocked by its original dispatch marker.

## What should not be changed

Do not weaken E15 to permit mutable SHA prose in PR bodies. The 5.107 incident demonstrates that E15 is doing useful work.

Do not collapse E9, E11, and E16 into ordinary PR CI. Their separation provided distinct guarantees:

- E9: exact candidate validation under durable identity;
- E11: current-main freshness / no-drift proof;
- E16: deterministic derived merge authority.

Do not merge physical acceptance into code/release authority. Actual-device verification should remain a separate post-deploy proof.

## Final verdict

For 5.107, the E-system was **strict in the right places**. It generated one false-start operational cost, but no unsafe release behavior.

The next iteration should optimize **retry ergonomics, not safety policy**.

Priority: **medium-high** because the gap does not threaten correctness, but it directly affects the goal of fully autonomous development/release operation.
