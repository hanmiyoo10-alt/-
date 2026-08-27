# Local Usage Dashboard — Exact Final HTTP Error Status Design

Status: **DESIGN READY — implementation not started**

Idea: `V-HTTP-STATUS`
Parent: #343
Classification: product version required · importance high · difficulty medium

## Fresh baseline

Current production/release authority at design time:

- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- snapshot / recent-request contracts `1 / 1`
- release branch `release-usage-dashboard`

A separate low-difficulty candidate, `V-BILLING-STRIP` (#572), is design-ready but not implemented. Therefore the concrete product/Engine numbers for this design are **monotonic candidates only** and must be re-resolved from the repository immediately before implementation.

If #572 ships exactly as designed first, the expected tuple for this feature is Product `3.0.0-alpha.5.83`, Engine `1.6.24`, Manager `1.3.0`, contracts `1 / 1`. If release ordering changes, never force these remembered numbers; use the next monotonic product/Engine versions from fresh authority.

## Primary goal

Expose the **exact final HTTP error status** for a request only when the authenticated LLMGateway `/logs` row explicitly provides `errorDetails.statusCode`.

Examples of allowed presentation when source exists:

- `HTTP 429`
- `HTTP 401`
- `HTTP 503`

Missing source remains UNKNOWN / not displayed.

This feature must never synthesize HTTP 200 for success rows and must never treat provider-routing attempt status as the final request status.

## Authoritative source

Pinned upstream LLMGateway evidence defines:

- `errorDetails.statusCode` as a numeric field;
- `errorDetails.statusText`, `responseText`, and optional `cause` as separate error-detail fields;
- routing metadata can independently contain provider-attempt `status_code` values.

The upstream shared LogCard displays `errorDetails.statusCode` under final Error Details, separately from routing attempt metadata.

Therefore Local Usage Dashboard authority is **only**:

`authenticated /logs row -> errorDetails.statusCode`

Forbidden as final HTTP-status authority:

- `routingMetadata.routing[].status_code`;
- provider score/status metadata;
- `hasError` alone;
- request outcome taxonomy alone;
- exception/error type strings;
- model/provider/service tier;
- transport result of the local CLI/Bridge call;
- guessed success `200`.

## A. Engine capture / privacy boundary

Current Engine `/logs` sanitizer already allowlists only safe request metadata and does **not** pass through raw `errorDetails`.

Implementation must preserve that boundary.

Add a bounded extractor that:

1. reads only exact `row.errorDetails.statusCode`;
2. accepts only a finite integer in the HTTP status range `100..599`;
3. emits a safe scalar field, proposed name `httpStatusCode`;
4. emits source/fidelity metadata only if useful for diagnostics, proposed:
   - `httpStatusSource: 'errorDetails.statusCode'`
   - `httpStatusFidelity: 'explicit'`
5. missing/invalid source => `httpStatusCode:null`, source empty, fidelity `unknown`;
6. never copies `statusText`, `responseText`, `cause`, raw `errorDetails`, raw routing metadata, messages, content, headers, cookies, or auth material.

The extractor may retain an explicit code even if other row metadata is contradictory; the Plugin presentation layer decides whether it is appropriate to show for the normalized request outcome. Do not silently rewrite the outcome from the code.

Because the public recent-request snapshot gains new optional fidelity metadata, Engine semantic version should bump for the feature release. No contract-number bump is planned because the fields are optional/additive and absent remains valid.

## B. Plugin normalization

Add a dedicated HTTP-status normalizer rather than reusing generic `errorCode` aliases.

Proposed normalized fields:

- `httpStatusCode: number | null`
- `httpStatusSource: 'errorDetails.statusCode' | ''`
- `httpStatusFidelity: 'explicit' | 'unknown'`

Rules:

- explicit iff code is an integer `100..599`, source is exactly `errorDetails.statusCode`, and fidelity is explicit;
- otherwise UNKNOWN;
- no inference from existing `errorCode`, `statusCode`, `httpStatus`, routing metadata, outcome, model, provider, latency, or service tier;
- do not backfill from historical generic `errorCode` values because their authority is not guaranteed to be final `errorDetails.statusCode`.

## C. Outcome/presentation separation

The existing request outcome taxonomy (`success/error/cancelled/unknown`) remains authoritative for whether a row is presented as an error.

Presentation rule:

- normalized outcome `error` + explicit `httpStatusCode` => show `HTTP <code>`;
- normalized outcome `error` + missing code => existing error wording / UNKNOWN, no invented code;
- `success`, `cancelled`, or `unknown` => do not display an HTTP status badge merely because some contradictory scalar exists; retain it only as internal safe enrichment if captured.

No success row gets `HTTP 200` by default.

## D. Request Ledger identity/enrichment

`httpStatusCode`, source, and fidelity are **enrichment only**.

They must not alter exact request identity:

- exact ID rows keep key `request:<id>`;
- UNKNOWN -> explicit HTTP status updates the existing row in place;
- provenance/service-tier/duration/cache identity contracts remain unchanged;
- no duplicate request row may appear when the status becomes known later.

Do not add HTTP status to the exact request identity. Historical ID-less fallback identity behavior is not expanded by this feature.

## E. UI scope

### Recent Requests

For failed/error rows with explicit status, add a compact `HTTP <code>` indicator beside the existing error/outcome metadata.

Keep model/provider/duration/cache/tier layout intact. On mobile, the status must not create a new full-width card or push request identity off-screen.

### Hourly drilldown

The same failed request row may show `HTTP <code>` in its existing compact metadata/error area. Do not build a separate hourly HTTP aggregation in this release.

### Diagnostics

Add bounded fidelity counters, for example:

`HTTP status fidelity: error rows 3 · exact 2/3 · unknown 1/3 · source errorDetails.statusCode`

Only count normalized **error** rows in the denominator. Success/cancelled rows are not “unknown HTTP errors”.

Optional diagnostic distribution may list only coarse numeric code counts if already cheap from the in-memory ledger, e.g. `429×1 · 503×1`; do not add new I/O or persist a separate history.

## F. No new I/O

Reuse the existing account-wide authenticated `/logs` capture (`24h`, bounded rows, existing TTL/capture reuse).

Forbidden additions:

- new HTTP endpoint;
- new CLI invocation;
- new polling/timer;
- new background refresh;
- new persistence store;
- raw log-detail fetch per row.

## G. Regression plan — P48 Exact Final HTTP Status

Add a new regression after the preceding monotonic release is resolved. P48 must lock at least:

1. fresh target Product/Engine/Manager/contracts tuple;
2. Engine sanitizer reads only `errorDetails.statusCode` for this feature;
3. valid integer `100..599` survives as explicit;
4. missing/null/string/object/NaN/out-of-range values remain UNKNOWN;
5. `routingMetadata.routing[].status_code` cannot populate final HTTP status;
6. `statusText`, `responseText`, `cause`, raw `errorDetails`, routing payload, content/messages/headers are not emitted to Plugin state;
7. Plugin normalization requires explicit source/fidelity;
8. success rows never synthesize `HTTP 200`;
9. error row with explicit 429 renders `HTTP 429`;
10. error row without source renders no invented status;
11. cancelled/unknown rows do not get an HTTP badge from inference;
12. HTTP metadata is excluded from exact request identity;
13. UNKNOWN -> explicit enriches the same request ID row without duplication;
14. DevPass/Credits provenance filtering remains unchanged;
15. duration/cache/service-tier/outcome regressions remain GREEN;
16. no new fetch/CLI/timer/scheduler/persistence owner;
17. deterministic Engine build and manifest SHA are correct;
18. full Usage Dashboard registry GREEN.

## H. Physical acceptance

After future deployment on PocketRisu:

- target Product/Engine/Manager tuple matches release authority;
- READY / Health ok / active errors 0 / failures 0;
- Diagnostics shows HTTP-status fidelity line;
- if the observed ledger contains a source-backed failed request, its displayed `HTTP <code>` matches the source-backed diagnostic metadata;
- if no such failed request exists during the acceptance window, record `NOT_EXERCISED` for positive-code rendering rather than intentionally causing a failure;
- normal success rows show no synthetic HTTP 200;
- Recent Requests and hourly rows remain mobile-readable;
- request IDs/provenance/duration/cache/service-tier remain plausible and duplicate-free;
- no extra CLI/network/refresh activity attributable to the feature.

Do **not** deliberately generate a failing/chargeable request solely to satisfy physical acceptance.

## Non-goals

- no provider-attempt routing timeline/status UI;
- no error body/statusText display;
- no raw request/response details;
- no success HTTP 200 inference;
- no error retry controls;
- no service-tier/model/funding change;
- no billing/account feature;
- no transaction write;
- no contract-number bump unless implementation evidence proves additive compatibility is false.

## Sequencing gate

This design may be completed while implementation remains gated. It must not be implemented until current release physical/stabilization gates permit versioned feature work. Before implementation, fresh-check the current production tuple and rebase the monotonic target version if necessary.
