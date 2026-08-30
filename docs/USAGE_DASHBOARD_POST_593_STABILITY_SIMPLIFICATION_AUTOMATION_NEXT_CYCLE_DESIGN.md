# Local Usage Dashboard — E17 Stability Envelope Design

Status: **E17 DESIGN READY — NON-AUTHORITY OPTIMIZATION ENVELOPE / IMPLEMENTATION GATED**

Tracking: #968

Scope: `plugins/usage-dashboard/` release-control, regression, documentation, and next-version sequencing.

## Fresh production authority

At design time `release-usage-dashboard` declares:

- Product `3.0.0-alpha.5.93`
- Engine `1.6.30`
- Manager `1.3.4`
- managed CLI `1.10.0`
- snapshot / recent-request contracts `1 / 1`
- production SHA `a506185701025ac167b2550aaff0def04ed322e2`
- exact-byte parity `VERIFIED`
- physical verification `PENDING`

Repository/static proof does not substitute for PocketRisu acceptance.

## E17 definition

E17 is **not** a new durable release generation and **not** a new authority layer.

`E17` is the design label for a bounded stability envelope around the already-proven E13/E14/E15/E9/E11/E16 graph.

Its job is to make the existing release path:

1. more stable — fewer avoidable presentation/test failures;
2. simpler — fewer duplicated mutable facts and fewer manual translations between existing authorities;
3. more automatic — canonical local derivation before writes, without adding new state machines or writers.

The authority graph remains:

`E13 durable request -> E14 candidate ancestry -> E15 canonical handoff -> E9 exact-SHA validation -> E11 fresh-main readiness -> E16 derived merge capsule -> assistant fresh reread -> expected-head merge -> exact-byte promotion -> separate physical acceptance`

E17 adds no arrow to that graph.

## Hard invariants

E17 must not add:

- `release_generation: E17`;
- a second merge authority;
- auto-merge;
- a new promotion authority;
- a new workflow solely to own state;
- a queue, timer, poller, scheduled bot, or synchronization loop;
- mutable PR/capsule SHA synchronization;
- network-backed documentation mutation;
- production writer authority;
- physical verification as repository authority.

E16 remains the latest merge-control layer and stays derived/read-only.

## E17 workstreams

### E17-A — canonical first-write handoff automation

Observed 5.93 friction: the initial deterministic release PR body omitted the canonical E15 locator block and E9 correctly failed with `E15_PR_LOCATOR_INVALID:candidate-authority:count=0` before product validation.

Design:

- the normal release PR creation path consumes `release_handoff_e15.cjs::renderStablePrBody()`;
- `validateStablePrBody()` must succeed locally before a PR create/update call;
- locator strings are not hand-reproduced in the normal path;
- body repair remains recovery-only for historical/noncanonical state;
- no mutable candidate/source/main SHA prose is inserted into the body.

Acceptance:

- the next real release creates the canonical PR body on first write;
- every E15 locator appears exactly once;
- E9 identity binding reaches exact-SHA validation without a body-only repair cycle.

### E17-B — historical regression scope hygiene

Observed 5.93 friction: P58 was a valid 5.92 historical regression but lacked the established version-scoped applicability marker, so 5.93 preflight correctly failed closed on a stale current-version assertion.

Design:

- every fixed historical Product/Engine regression declares explicit target-version scope using the existing registry pattern;
- registry hygiene rejects fixed historical tuple assertions that lack explicit scope;
- scoping controls applicability only and must not weaken the historical regression body;
- the fresh release contract/manifest remains current-version authority.

Acceptance:

- intended historical versions still execute the full regression;
- future releases cannot receive false current-version RED from an unscoped old tuple.

### E17-C — E16 proof-status semantic stabilization

E16 live behavior is proven across 5.91, 5.92, and 5.93. Its generated status currently lists 5.91/5.92 as `live proof releases`, which can look like an exhaustive history even though immutable receipts own later operational evidence.

Design:

- keep `release_merge_capsule_e16.cjs` authority semantics unchanged;
- rename/document the static list as **baseline proof releases** / **baseline proof requests**;
- immutable request/E16/release receipts own later operational history;
- keep the renderer pure/local and CI-parity enforced;
- do not append every successful release into a hand-maintained list;
- do not mutate historical E16 capsules.

Acceptance:

- a later successful release does not make the E16 design page semantically stale;
- E16 authority helper and capsule format remain unchanged.

### E17-D — candidate-source boundary preservation

Observed 5.93 positive proof: E7 correctly rejected release-authority helper mutation from product candidate source intent.

Design:

- preserve the current fail-closed source-path boundary;
- byte-neutral release-control maintenance lands on `main` before future product source freeze;
- product candidate source stays limited to authorized product spec/materializer/source classes;
- do not widen candidate authority merely to bundle maintenance conveniently.

Acceptance:

- release-control maintenance cannot silently become candidate product authority;
- runtime artifacts remain byte-identical for E17-only maintenance.

### E17-E — derived operator summary, not new authority

After E9/E11/E16 are ready, the assistant still has to visually join several receipts before the final fresh reread. E16 already owns the exact merge capsule, so E17 must not duplicate it.

Design:

- if an operator-facing summary is useful, derive a read-only projection from existing immutable receipts;
- expose only status such as `CURRENT`, `STALE`, `SUPERSEDED`, or `BLOCKED` for human readability;
- the projection grants zero merge/promotion authority and cannot suppress the final fresh PR/main/mergeability reread;
- absence or ambiguity must fail closed to `UNKNOWN/BLOCKED` rather than infer state.

Acceptance:

- fewer manual interpretation steps without any new writer or authority source;
- canonical E16 capsule remains the merge-handoff evidence.

## Simplification rule

Every E17 implementation slice must remove or prevent more operational complexity than it adds.

A proposed slice is rejected if it requires a new persistent owner, queue, workflow state machine, synchronization protocol, or duplicated authority representation merely to save a few manual lines.

Prefer:

`existing authority -> pure helper -> deterministic output -> local validation -> existing writer`

over:

`new authority -> new state -> new synchronization -> new repair path`.

## Automation rule

Automation is allowed when it is deterministic and bounded:

- generate canonical PR text before first write;
- validate locally before mutation;
- derive documentation blocks from local constants/immutable baseline evidence;
- enforce parity in CI;
- derive read-only operator projections from existing receipts.

Automation is not allowed to invent missing truth. UNKNOWN remains UNKNOWN.

## Runtime boundary

E17-only implementation is byte-neutral for Product/Plugin/Engine/Manager/bootstrap runtime artifacts and must not reserve or cause a Product/Engine version bump by itself.

A future product release is activated separately only after:

1. 5.93 PocketRisu physical acceptance PASS;
2. fresh `release-usage-dashboard` authority reread;
3. E17 byte-neutral maintenance is GREEN or explicitly deferred with no correctness impact;
4. exactly one genuine runtime/user-facing primary goal is selected;
5. the next Product/Engine versions are freshly proven free immediately before implementation.

Current inventory context remains separate:

- `V-COST-DRIVER` #959 — DESIGN READY / source-proven;
- `V-CREDITS-COST` #960 — BLOCKED/PARTIAL.

E17 does not auto-activate either item.

## Regression plan

E17 maintenance must prove at least:

1. first-write PR body equals canonical E15 renderer output;
2. generated PR body validates before a write;
3. E15 locator cardinality is exact;
4. historical fixed-version regressions require explicit applicability scope;
5. historical scope cannot weaken intended-version coverage;
6. E16 generated documentation uses baseline-proof semantics;
7. E16 authority helper/capsule format stays unchanged;
8. candidate-source policy still rejects release-authority source mutation;
9. any operator projection is pure/read-only and fails closed on ambiguity;
10. no new HTTP/CLI/timer/poller/persistence/writer owner appears;
11. Product/Plugin/Engine/Manager/bootstrap bytes remain unchanged;
12. full Usage Dashboard registry remains GREEN.

## Implementation sequencing

E17 implementation, when activated, should be split into the smallest byte-neutral slices:

1. E17-A canonical first-write PR generation;
2. E17-B historical regression scope hygiene;
3. E17-C E16 baseline-proof terminology/parity;
4. E17-D source-boundary regression lock;
5. E17-E operator projection only if it remains strictly simpler than current receipt reading.

Each slice must pass focused tests plus the full registry before merge. No device test is required for an E17-only byte-neutral maintenance slice.

## E17 exit criteria

E17 is considered complete when the next legitimate product release demonstrates:

- canonical E15 handoff on first write;
- no historical-version false RED;
- E16 documentation no longer appears stale after later releases;
- candidate source boundaries stay fail-closed;
- E9/E11/E16 authority semantics remain unchanged;
- final merge still requires fresh reread + expected-head binding;
- exact-byte promotion/parity and separate physical acceptance remain intact.

If those goals require a new authority layer to achieve, the E17 design has failed its own simplification rule and must be reconsidered rather than expanded.

## Related

#587 #901 #906 #958 #959 #960 #961 #964 #968
