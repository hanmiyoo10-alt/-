# Local Usage Dashboard E23 Post-Implementation Feedback

Date: 2026-09-07  
Scope: `plugins/usage-dashboard/` release-control maintenance only  
Current main at review: `25c8eba73f7aab9f917a8bf89728f17e7d7d64cd`  
Current production at review: `release-usage-dashboard@7fc4e31ab28d726cc355915a57f0be566dab2b25` / Product `3.0.0-alpha.5.103`  
E23 canonical issue: `#1611`  
E23 design PR: `#1613`  
E23 implementation PR: `#1616`  
E23 implementation merge: `0279313864296c937040c9da207680b8c61ec1d0`

## 1. Overall verdict

**CORE IMPLEMENTATION: PASS**  
**END-TO-END AUTOMATION: PARTIAL / NOT CLOSED**  
**STABILITY / AUTHORITY PRESERVATION: STRONG**

E23 succeeded at the most important architectural boundary: it introduced one pure accepted-baseline handoff projector without creating another source of truth, release writer, workflow stage, persistent latest-baseline file, or physical-acceptance authority.

However, the original E23 product goal was broader than the pure projector alone. The goal explicitly included eliminating repeated manual reconstruction of the accepted Product/SHA/issue/comment tuple when preparing the next release specification. That end-to-end integration is not yet complete on current main.

The correct next action is therefore a **byte-neutral E23 Integration Closure**, not a new release generation and not a new authority layer.

## 2. What E23 got right

### 2.1 One pure handoff owner

`plugins/usage-dashboard/tools/release_baseline_handoff_e23.cjs` is appropriately narrow:

- consumes supplied E22 resolver output rather than reparsing GitHub comments;
- imports the existing E20 release-evidence contract and shared version ordering only;
- performs no filesystem, network, HTTP, process, workflow, or repository mutation;
- freezes derived output;
- has no persistent handoff artifact.

This matches the frozen design's strongest simplicity rule.

### 2.2 Existing E20/E21 authority stays sealed

E23 emits the existing E20 `releaseEvidence` shape instead of inventing an E23 schema. E20 validates the derived object and E21 consumes it through the existing structured evidence path with no E23-specific branch.

That is the right authority direction:

```text
E22 exact accepted projection
-> E23 pure handoff
-> existing E20 releaseEvidence
-> existing E21 evidenceView
```

E23 remains a derivation helper rather than an authority source.

### 2.3 Pending/rejected/conflict deployments do not displace acceptance

The regression corpus correctly preserves the previous exact accepted baseline while a newer deployment is PENDING, REJECTED, or CONFLICT. Once an exact newer physical acceptance exists, the same derivation advances automatically.

This preserves the crucial invariant:

```text
latest deployed != latest physically accepted
```

and prevents production deployment success from being silently promoted into physical truth.

### 2.4 Fail-closed identity validation is strong

E23 rejects missing or invalid:

- Product version;
- release SHA;
- physical issue binding;
- physical comment binding;
- accepted verdict;
- ambiguous accepted ordering;
- same-version accepted/deployed SHA contradiction;
- invalid or non-advancing target versions through the existing E20 contract.

No missing identity is converted into zero, fallback, guessed version, guessed SHA, or inferred acceptance.

### 2.5 Byte-neutrality and user contract were preserved

E23 changed no Product, Plugin, Engine, Manager, bootstrap, runtime, production, or physical-device behavior. It requires no PocketRisu test of its own and does not add work for the user.

That matches the project contract: the user remains responsible only for `+` update and real-device evidence when a Product release itself requires it.

## 3. Gap F1: end-to-end baseline automation is not wired

The largest remaining gap is that the E23 projector exists, but the ordinary release-spec preparation / generic preflight path does not currently consume it.

Current `plugins/usage-dashboard/tools/release_generic_preflight.cjs` validates stale Product-version literals in tests. It does not import or invoke E23 and does not compare a release spec's `releaseEvidence` against a canonical E23 handoff.

Current repository search for `E23_RELEASE_EVIDENCE_MISMATCH` resolves to the E23 tool, design, and focused E23 test, not to the generic release preflight/source-readiness path.

The freshly completed 5.103 release is concrete operational evidence of this gap. `.github/usage-dashboard/releases/5.103.json` still contains a manually authored accepted tuple:

```text
Product 3.0.0-alpha.5.102
release SHA d0292b48c520bbd8a42c5aa1b5b1afa7ed14ca77
physical issue #1803
physical comment 5565569980
verdict accepted
```

The tuple is correct, but correctness was achieved by manual authoring and later validation rather than by E23 automatically supplying the next release's E20 handoff.

Therefore the original E23 simplicity goal is only partially realized.

## 4. Gap F2: handoff comparison is stricter than the frozen design

`inspectReleaseEvidenceHandoff()` currently compares the full serialized actual and derived `releaseEvidence` objects.

That means `note` text participates in exact equality.

The frozen E23 design explicitly permits release-specific note wording when that wording does not alter accepted identity or verdict truth. The current exact-object comparison would reject a release spec that has the correct Product/SHA/issue/comment/verdict tuple but uses a different truthful E20-valid note.

For integration closure, the comparison boundary should distinguish:

### Authority-bearing fields

These must match exactly:

```text
schemaVersion
acceptedBaseline.productVersion
acceptedBaseline.releaseSha
acceptedBaseline.verdict
acceptedBaseline.issue
acceptedBaseline.commentId
latestInstalled.productVersion
latestInstalled.releaseSha
latestInstalled.verdict
latestInstalled.issue
latestInstalled.commentId
```

### Descriptive fields

`note` should remain subject to the existing E20 contract and bounded-shape rules, but a truthful note-only difference should not become an E23 identity mismatch.

This keeps E23 strict about truth while avoiding unnecessary coupling to prose.

## 5. Gap F3: repository documentation/test freshness drift

Two small freshness issues remain:

1. `docs/USAGE_DASHBOARD_E23_ACCEPTED_BASELINE_HANDOFF_SIMPLIFICATION_DESIGN.md` still begins with `DESIGN FROZEN / IMPLEMENTATION NOT STARTED`, although PR #1616 implemented and merged E23.
2. `e23-accepted-baseline-handoff-contract.cjs` describes the 5.100 accepted / 5.101 pending fixture as the "Real current repository shape". That fixture remains valuable regression history, but it is no longer current after accepted 5.101, accepted 5.102, and the 5.103 deployment.

The frozen design document should remain historical design authority rather than being silently rewritten. A later bounded maintenance patch should instead relabel the regression comment as a historical fixture and use this feedback document as the implementation-status addendum.

## 6. Current 5.103 boundary

At this review point:

- deployed production is `3.0.0-alpha.5.103` at `7fc4e31ab28d726cc355915a57f0be566dab2b25`;
- exact-byte parity is verified;
- 5.103 physical acceptance is still PENDING until user real-device evidence is recorded.

E23 must therefore **not** treat 5.103 as the accepted baseline yet.

If a next Product release were designed before 5.103 physical acceptance, the accepted baseline must remain the latest exact physically accepted release selected by E22. If 5.103 is later accepted, the same E22 -> E23 derivation should advance without manual identity editing.

## 7. Recommended follow-up: E23 Integration Closure

This should be a byte-neutral maintenance slice, not `release_generation: E23`, not E24 by implication, and not a Product release.

### IC1. Add semantic handoff comparison

Introduce a small identity-normalization/comparison helper inside the existing E23 owner so that:

- authority-bearing E20 identity fields must match exactly;
- note-only differences may pass when the whole object still passes E20 validation;
- any Product/SHA/verdict/issue/comment difference fails closed with `E23_RELEASE_EVIDENCE_MISMATCH`.

### IC2. Wire E23 into the existing release-preparation/preflight path

The integration must consume canonical E22 resolution supplied by the existing transaction/control path.

It must **not** make `release_generic_preflight.cjs` independently scrape GitHub comments or recreate E22 parsing.

Preferred shape:

```text
existing canonical repository evidence capture
-> E22 resolver output
-> E23 handoff
-> compare/derive releaseEvidence
-> existing source-readiness / generic preflight
```

Any invocation-time transport should be transaction-local and derived. Do not add `latest-accepted.json`, `accepted-baseline.json`, a new database/state file, poller, scheduler, issue bot, or persistent second source of truth.

### IC3. Make the next release spec consume the handoff

The next Product release source-intent should prove that accepted Product/SHA/issue/comment identity came from the E23 handoff rather than from a release-specific materializer search or manually reconstructed tuple.

Release-specific notes may remain release-specific under the E20 contract.

### IC4. Add permanent regression coverage

At minimum:

1. exact identity + different valid notes -> PASS;
2. Product mismatch -> FAIL;
3. release SHA mismatch -> FAIL;
4. issue mismatch -> FAIL;
5. comment mismatch -> FAIL;
6. verdict mismatch -> FAIL;
7. deployed PENDING newer release preserves prior accepted baseline;
8. REJECTED newer release preserves prior accepted baseline;
9. CONFLICT newer release preserves prior accepted baseline;
10. exact newer acceptance advances baseline;
11. integration consumes supplied E22 resolution and does not parse GitHub independently;
12. no persistent baseline state artifact appears;
13. full discovered Usage Dashboard registry remains GREEN;
14. Product/Plugin/Engine/Manager/bootstrap/runtime bytes remain unchanged.

Do not freeze a total test-count integer.

### IC5. Refresh historical labels, not historical truth

Keep the existing 5.100/5.101 fixture but label it historical regression evidence instead of current repository state.

Do not rewrite historical acceptance identities.

## 8. What not to do

The integration closure must not add:

- a new release generation;
- a new workflow stage;
- a new scheduler/reconciler;
- another accepted-baseline state file;
- independent GitHub comment parsing in E23;
- automatic physical acceptance;
- Product/runtime/release bytes;
- any inference from deployment success into physical acceptance;
- any `UNKNOWN -> accepted` fallback.

## 9. Final feedback

E23 is architecturally good. Its core is small, pure, deterministic, authority-neutral, and correctly layered on E22/E20/E21.

The remaining problem is not the projector algorithm. It is the final integration seam.

A concise status is:

```text
E23 core projection        PASS
E22 -> E23 authority seam  PASS
E23 -> E20/E21 shape       PASS
fail-closed behavior       PASS
runtime/release neutrality PASS
release-spec auto handoff  PARTIAL
shift-left generic wiring  NOT CLOSED
note comparison semantics  TOO STRICT
freshness labeling         NEEDS CLEANUP
```

The next maintenance step should close those integration seams while preserving the exact authority graph that made the E23 core safe in the first place.
