# PROVIDER-NATIVE-STRUCTURED-OUTPUT-CONTRACT — design draft

Status: assistant-owned draft
Lifecycle target: `DESIGN_NEEDED` until PocketRisu-specific ownership and error taxonomy are resolved.

## Problem / evidence

`rpaddict/RisuBard` commit `c9b7b6f81b6f5672ba7832f740f46a8489ba7541` adds a backward-compatible provider contract for native JSON-schema output. Providers explicitly opt in; opted-in requests receive a normalized schema object; legacy providers retain prompt-only constraints; schema rejection may retry once without the native field; structured JSON avoids generic text rewriting. The release is `5340a96440689893bedf6ad6de5a1d30b7c231f0`.

PocketRisu does not currently expose the same `structuredOutput`/`response_schema` contract in the searched `develop` tree. Evidence is therefore strong for the source behavior but only `MEDIUM` for PocketRisu benefit until the local provider/request pipeline is mapped.

## Minimal safe scope

One isolated request-layer slice only:

1. add an optional provider capability describing native structured-output support;
2. define one host-normalized, non-secret schema descriptor passed only to opted-in providers;
3. preserve the existing prompt-based JSON/schema instruction for compatibility;
4. if and only if the provider rejects the native schema feature, retry once without the native schema field;
5. keep structured-output response bytes out of ordinary newline/text normalization paths that can alter JSON semantics.

Do not redesign provider registration, prompt construction, streaming, credentials, plugin permissions, or general retry architecture in the same PR.

## Ownership boundaries

- Plugin/provider registry: owns capability declaration only.
- Request orchestration: owns whether native schema is attached and whether one bounded fallback is permitted.
- Structured-output helper: owns normalized schema descriptor and schema-specific error classification if a suitable existing boundary exists.
- Response processing: owns the invariant that structured JSON is not mutated by generic text transforms.
- Provider plugins: own translation from the host-normalized schema descriptor to each provider's native API shape.

No host/device/runtime changes. No storage migration.

## Proposed mechanism

Represent native structured-output support as an optional provider capability rather than provider-name branching. When a structured-output request is built:

- always retain the existing prompt-level compatibility instruction unless PocketRisu already has a stronger proven invariant;
- attach the normalized native schema descriptor only if the chosen provider explicitly advertises support;
- propagate an explicit structured-output marker through response handling so generic prose fixups are skipped;
- classify failures narrowly. Only errors proven to mean “native schema unsupported/rejected” may trigger fallback;
- fallback removes only the native schema field and retries once. It must not reset unrelated request state, switch providers, or recursively enter the general retry loop.

## Compatibility / invariants

- Providers without the new capability behave exactly as before.
- Existing plugin API remains source-compatible; the capability is optional.
- No credentials, auth headers, prompt bodies, or private plugin state are added to logs.
- Existing PocketRisu bounded retry/fallback behavior remains bounded; this feature cannot create an independent unbounded loop.
- Structured JSON content is not passed through newline restoration or prose cleanup that changes escapes or string contents.
- Streaming and non-streaming paths must converge on the same final structured-output preservation rule.
- Existing PocketRisu guardrails remain untouched: no DB flush changes, `flushServerDbKeepalive()` stays no-op, targeted V3 reload remains targeted, runit remains, no PM2, no Android notification behavior.

## Validation / acceptance

Required focused tests before `READY_TO_PORT`:

1. Legacy provider + structured request: no native schema field; existing prompt-schema behavior is unchanged.
2. Opted-in provider: receives exactly one normalized schema descriptor and structured-output marker.
3. Native schema accepted: no fallback request occurs.
4. Native schema rejected with a specifically recognized compatibility error: one retry occurs with only the native schema removed.
5. Unrelated provider error (auth, quota, transport, model-not-found, malformed plugin response): zero schema fallback retries.
6. Repeated schema rejection after fallback: fail normally; never retry a second time.
7. JSON strings containing escaped newlines, backslashes, Unicode, and embedded formatting round-trip without generic text mutation.
8. Streaming/non-streaming final payloads satisfy the same preservation rules.
9. Existing provider/plugin request tests remain green.

Acceptance for promotion: PocketRisu ownership map is explicit, schema-rejection error taxonomy is concrete enough to test, all dependencies are resolved, and rollback is a clean removal/disable of the optional capability path with legacy prompt-only behavior intact.

## Risk / blast radius

Risk is `MEDIUM`. A bad implementation could break model calls for plugin providers or silently mutate structured JSON. Blast radius is contained if capability opt-in is default-off and fallback is narrow and single-shot.

Do not broaden fallback based on generic 4xx/5xx status codes. That would hide authentication, quota, or request-shape bugs.

## Rollback / fallback

Primary rollback: remove/disable the optional capability branch; all providers return to existing prompt-only structured-output behavior. No persisted data or migration is involved.

Runtime fallback for a recognized native-schema compatibility failure is exactly one request without the native field. This is compatibility behavior, not a substitute for rollback.

## Dependencies

- PocketRisu plugin-provider API inventory.
- PocketRisu structured-output/prompt-schema ownership map.
- Provider-specific/native schema rejection error classification.
- Exact response post-processing paths, including streaming.

Until these are resolved, lifecycle remains `DESIGN_NEEDED`.

## PR decomposition

PR 1 (investigation/tests only if needed): document provider/request ownership and add characterization tests for current structured-output behavior.

PR 2 (implementation candidate): optional provider capability + normalized schema handoff + one-shot compatibility fallback + JSON-preservation tests. One Feature-ID, no unrelated cleanup.

A separate future PR may add provider-specific implementations, but only after each provider's native schema contract is independently validated.
