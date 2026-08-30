# Local Usage Dashboard — Post-5.93 Stability / Simplification / Automation Next-Cycle Design

Status: **DESIGN READY — IMPLEMENTATION GATED BY 5.93 PHYSICAL ACCEPTANCE**

Tracking: #968

Scope: `plugins/usage-dashboard/` release-control / regression / documentation maintenance plus next-version sequencing.

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

## Decision

The next development cycle keeps 5.93 as the behavioral baseline and prioritizes:

1. **stability** — remove avoidable release/test presentation failures without weakening fail-closed gates;
2. **simplification** — reduce duplicated mutable facts and distinguish baseline proof from exhaustive operational history;
3. **bounded automation** — generate canonical local artifacts from existing authority rather than introducing new writers or state machines.

Control-plane/test/documentation maintenance is byte-neutral and must not by itself create a Product or Engine version bump.

A future actual product version is activated only after 5.93 physical PASS and selection of one genuine runtime/user-facing primary goal.

## Layer A — byte-neutral maintenance

### A1. Canonical E15 PR body at first write

Observed 5.93 friction: the initial deterministic PR body omitted the canonical E15 locator block, and E9 correctly failed before product validation with `E15_PR_LOCATOR_INVALID:candidate-authority:count=0`.

Design:

- normal PR creation consumes the existing canonical `renderStablePrBody()` output;
- `validateStablePrBody()` must succeed before the write;
- hand-copied locator strings are not the normal path;
- body repair is recovery-only;
- no body-sync writer, poller, timer, queue, mutable candidate/source/main SHA prose, or new authority.

Success condition: the next real product release reaches E9 exact-SHA validation without a body-only repair cycle.

### A2. Historical regression scope contract

Observed 5.93 friction: P58 was a 5.92 historical regression whose fixed release tuple was not scoped with the established historical-version pattern, so current 5.93 preflight correctly failed closed.

Design:

- every historical fixed-version regression declares explicit target-version scope;
- registry hygiene rejects fixed historical Product/Engine assertions that lack scope;
- version scoping only controls applicability and must not weaken the regression body;
- fresh release contract remains current-version authority.

Success condition: historical regressions keep their intended coverage but cannot masquerade as current release tuple authority.

### A3. E16 proof-status semantics

E16 live behavior is proven across 5.91, 5.92, and 5.93, while the generated documentation block lists 5.91/5.92 under `live proof releases`.

Design:

- keep `release_merge_capsule_e16.cjs` authority semantics unchanged;
- rename/document that static list as **baseline proof releases**, not exhaustive current operational history;
- immutable E16/request/release receipts remain the owner of later release history;
- renderer remains pure/local and CI-parity enforced;
- no network writer, scheduled docs bot, mutable historical receipt, or E17 generation.

Success condition: another successful release does not make the E16 design page appear stale merely because its immutable baseline proof list is intentionally fixed.

### A4. Candidate-source boundary preservation

Observed 5.93 positive proof: E7 rejected release-authority helper mutation from product source intent.

Design:

- preserve the existing source-path fail-closed rule;
- byte-neutral control-plane maintenance lands on `main` before a future product source freeze;
- future product candidate intent stays restricted to authorized product source/materializer classes;
- do not widen candidate authority for convenience.

Success condition: release-control maintenance cannot accidentally become candidate product authority.

## Layer B — next actual product version

Do **not** reserve `3.0.0-alpha.5.94` at design time.

Activation requires all of:

1. 5.93 physical acceptance PASS;
2. fresh `release-usage-dashboard` tuple/SHA read;
3. Layer A GREEN/byte-neutral, or explicit bounded deferral with no correctness impact;
4. selection of exactly one genuine runtime/user-facing primary goal;
5. fresh proof that the next Product/Engine versions are free immediately before implementation.

Current inventory context:

- `V-COST-DRIVER` #959 — DESIGN READY / source-proven;
- `V-CREDITS-COST` #960 — BLOCKED/PARTIAL;
- this design does not auto-activate either item.

## Carried-forward invariants

- 5.93 working runtime/UI remains baseline;
- UNKNOWN stays UNKNOWN, never synthetic zero;
- no new HTTP/CLI/timer/poller/persistence owner without source-backed need;
- E13 remains durable release generation;
- E14/E15/E9/E11/E16 retain current authority boundaries;
- E16 remains derived read-only evidence;
- final merge remains fresh-read + expected-head bound;
- production promotion remains monotonic and exact-byte verified;
- physical acceptance remains separate from repository authority;
- `one release = one primary product goal` remains binding.

## Regression acceptance for Layer A

1. canonical first-write PR body equals E15 renderer output;
2. generated body validates before PR write;
3. every canonical E15 locator occurs exactly once;
4. historical fixed-version regressions require explicit version scope;
5. scope cannot disable the regression for its intended historical version;
6. E16 generated documentation uses baseline-proof semantics;
7. E16 capsule authority/format stays owned by the existing helper;
8. E7 candidate-source policy still rejects release-authority source mutation;
9. Product/Plugin/Engine/Manager/bootstrap runtime artifacts remain byte-identical;
10. full Usage Dashboard registry remains GREEN.

## E17 decision

**HOLD.**

E17 is reconsidered only when a real release exposes a new machine-readable authority/freshness failure that E13/E14/E15/E9/E11/E16 cannot represent fail-closed. Convenience or fewer manual lines is not enough justification for a new authority layer.

## Physical boundary

Layer A itself requires no device test because it must be runtime-byte-neutral.

The next actual product release still uses the normal flow: `+` update -> PocketRisu verification -> evidence record.

## Related

#587 #901 #906 #958 #959 #960 #961 #964 #968
