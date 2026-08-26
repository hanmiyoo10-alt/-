# Local Usage Dashboard — Parser / Normalizer Inventory

Status: **IMPLEMENTED — repository-only semantic inventory**

Idea: `NV-PARSER-INVENTORY`  
Design: #418  
Production baseline: `3.0.0-alpha.5.80 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1`

## Decision summary

Current review found **0 immediately safe parser-consolidation candidates**.

Most repeated-looking transforms are either:

- raw-upstream → privacy-safe Engine normalization,
- sanitized snapshot → Plugin compatibility/identity validation,
- compatibility support for multiple source generations,
- specialized overlap with different output contracts.

The main same-layer area worth deeper review is Engine organization / DevPass-status normalization, but current evidence is insufficient to call it SAFE. It is `MEASURE_MORE`.

## Relationship / action meanings

Relationships:

- `INTENTIONAL_LAYERING`
- `COMPATIBILITY_DUPLICATION`
- `SPECIALIZED_OVERLAP`
- `REAL_DUPLICATION`
- `UNCLEAR`

Actions:

- `KEEP_BOUNDARY`
- `KEEP_COMPATIBILITY`
- `KEEP_SPECIALIZED`
- `MEASURE_MORE`
- `SAFE_CONSOLIDATION_CANDIDATE`

## Inventory

| ID | Area | Owners / trust boundary | Input → output | UNKNOWN / privacy / identity rule | Compared relationship | Regression authority | Action | Confidence | Consolidation prerequisite |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `PN-REQUEST-ALIASES` | request field lookup | Engine raw log capture (`30/35-*`) vs Plugin request normalization (`10/14-*`) | raw upstream aliases → sanitized row → ledger-compatible row | raw prompt/auth/project/org metadata must not cross; Plugin validation must not create missing values; identity remains request-id-first | `INTENTIONAL_LAYERING` | request-ledger behavior + P44; Engine capture/build parity | `KEEP_BOUNDARY` | high | prove both transforms operate on the same trusted shape and remove no compatibility/privacy guard |
| `PN-CACHE-TELEMETRY` | cache | Engine provider/raw cache normalizer vs Plugin `requestCacheSignal` / `requestCacheMetrics` | provider-specific cache shapes → safe cache fields → public fidelity validation | Read ≠ Write; missing Write/TTL stays UNKNOWN; no price/provider inference; no raw request body | `INTENTIONAL_LAYERING` | cache-observer behavior/regressions | `KEEP_BOUNDARY` | high | exact behavior parity for all known provider shapes + compatibility retirement evidence |
| `PN-SERVICE-TIER` | service tier | Engine raw tier extraction vs Plugin `normalizeServiceTierValue` / request ledger | raw requested/used tier fields → safe values/source → known enum/presentation | unsupported/missing stays UNKNOWN; no model/provider/cost inference; tier excluded from dedupe identity | `SPECIALIZED_OVERLAP` | service-tier/outcome behavior coverage | `KEEP_SPECIALIZED` | high | demonstrate a shared primitive can preserve raw-source ownership and Plugin enum validation without widening metadata |
| `PN-DURATION` | request duration | Engine explicit-duration capture vs Plugin duration revalidation | explicit nonnegative finite raw duration → `durationMs/source/fidelity` → public display eligibility | 0 valid; negative/missing/invalid UNKNOWN; duration excluded from identity | `INTENTIONAL_LAYERING` | P34 / duration behavior | `KEEP_BOUNDARY` | high | no reason to collapse trust-boundary validation unless protocol version makes Plugin revalidation redundant and parity is proven |
| `PN-PROVENANCE` | account-scope provenance | Engine transient project/org/`usedMode` classifier vs Plugin scope/fidelity validator | transient raw identity → derived `devpass/credits/unknown` → ledger enrichment | raw IDs must remain Engine-transient; ID-less rows cannot gain explicit provenance; metadata excluded from identity | `INTENTIONAL_LAYERING` | P35 + provenance behavior + P44 | `KEEP_BOUNDARY` | high | impossible without preserving transient-ID privacy and request-ID gate; no current same-layer duplicate proven |
| `PN-USAGE-SCOPES` | usage/activity | Engine usage/activity normalization vs Plugin scope payload adapters | CLI/API source → normalized activity/scope payload → Plugin compatibility/UI shape | absent numeric fields do not become authoritative zero; exact window/source labels preserved | `COMPATIBILITY_DUPLICATION` | current usage/scope behavior + snapshot contract tests | `KEEP_COMPATIBILITY` | medium | retire old snapshot/source shapes explicitly, then re-evaluate duplicate aliases |
| `PN-ANALYTICS` | analytics | Engine analytics normalization vs Plugin analytics adapter | source aggregates → sanitized analytics → UI-compatible aggregate model | missing components remain UNKNOWN/omitted; no reconstructed billing values | `SPECIALIZED_OVERLAP` | analytics behavior/regression coverage | `KEEP_SPECIALIZED` | medium | map exact field-by-field overlap and show identical trust/output contracts |
| `PN-ORG-STATUS` | organization / DevPass status | Engine organization normalization + independent DevPass status + compatibility conversion from org rows | raw org/status shapes → safe account/status model | compatibility fallback semantics and missing-field behavior must remain intact; raw auth/session/cookie fields excluded | `UNCLEAR` | organization/status tests + source/build parity | `MEASURE_MORE` | medium | build a field equivalence matrix across independent-status and org-derived paths; identify one canonical owner; add behavior parity for fallback mode |
| `PN-GENERIC-NUMERIC` | generic coercion helpers | Engine `finite/pick`-style helpers vs Plugin `num`/nested readers | layer-local values → numeric/path validation | utility similarity alone is not semantic duplication | `INTENTIONAL_LAYERING` | broad behavior suite | `KEEP_BOUNDARY` | high | never consolidate across runtime layers solely for LOC reduction |
| `PN-DIAGNOSTICS` | diagnostics interpretation | Diagnostics owners consuming normalized runtime state | normalized state → diagnostic summaries | diagnostics may summarize but must not invent source truth; Full Copy/Basic/Detailed ownership preserved | `SPECIALIZED_OVERLAP` | P37/P40/P43 and diagnostics behavior | `KEEP_SPECIALIZED` | high | only consolidate if two same-layer diagnostic helpers interpret the exact same contract and rendering ownership stays stable |

## Why cross-layer duplication is intentionally retained

### Request aliases

Engine capture is allowed to know raw upstream field aliases because it is the privacy/sanitization boundary. Plugin normalization is deliberately defensive against the sanitized current shape and supported compatibility shapes. Moving raw aliases into Plugin would widen the public trust surface.

### Cache

The Engine understands provider/raw cache structures. The Plugin validates source-fidelity metadata already emitted by the Engine. Removing one side because field names overlap could silently turn missing Write/TTL into false zeroes or merge request HIT with provider cache-read semantics.

### Provenance

The Engine alone may temporarily inspect raw project/org IDs and `usedMode`. The Plugin receives only the derived scope/fidelity/conflict result and ties enrichment to stable request identity. These transforms have different privacy responsibilities.

## Candidate requiring more evidence

`PN-ORG-STATUS` is the only current cluster that appears plausibly same-layer enough for future consolidation work. It is **not SAFE today** because:

- independent status and org-derived compatibility paths have distinct availability roles;
- exact field loss/default behavior has not yet been proven equivalent;
- removing or merging helpers could accidentally alter UNKNOWN/default semantics or fallback compatibility.

A future versioned cleanup may proceed only after a field-level equivalence document plus regression coverage proves one bounded consolidation target.

## Protected contracts

Any future parser consolidation must preserve exactly:

- request dedupe identity and UNKNOWN→explicit enrichment;
- request-ID provenance gate;
- raw project/org privacy boundary;
- explicit-only duration;
- cache Read/Write/TTL source fidelity;
- service-tier explicit-only semantics;
- no model/provider/cost/tier inference;
- generic local-JSON compatibility until separately retired;
- snapshot/recent-request contract compatibility.

## Downstream gate

Current `SAFE_CONSOLIDATION_CANDIDATE` set: **empty**.

The inventory itself changed no parser code, schema, runtime I/O, product version or release artifact.
