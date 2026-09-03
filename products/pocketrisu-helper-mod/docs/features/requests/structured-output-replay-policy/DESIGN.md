# Feature-ID: STRUCTURED-OUTPUT-REPLAY-POLICY

Status: `DESIGN_NEEDED`

## Problem / evidence

PocketRisu already supports provider-native JSON schema on at least OpenAI- and Google-family request paths, and already protects ModelPreset results marked `toolExecuted` / `noRetry` from replay. The remaining gap is a single conservative policy for what happens when a structured response is invalid or the provider rejects native structured output. `rpaddict/RisuBard@db8c204b30f338e09634620c707d82ef91932c2c` demonstrates a bounded policy with explicit native-unavailable signaling, validation repair, prompt-schema fallback, and non-replayable-result guards.

Evidence is `MEDIUM`: the external implementation and PocketRisu's adjacent safeguards are concrete, but a PocketRisu production failure has not been reproduced and provider error shapes have not yet been mapped end-to-end.

## Minimal safe scope

First slice should be a pure/shared structured-response policy helper plus unit tests. It must not change provider payload construction, persistence, tool execution, streaming, model fallback lists, or normal chat retry behavior. Provider wiring should be a separate slice unless one already exposes an exact native-structured-output-unavailable signal.

## Ownership boundaries

- Request orchestration owns attempt count and replay eligibility.
- Provider adapters own detection of provider-specific native structured-output capability rejection.
- Parser/validator owns deciding whether returned text satisfies the requested schema/shape.
- Tool execution and persistence remain downstream side-effect boundaries and must never be repeated by schema recovery.

## Proposed mechanism

1. Attempt native structured output once.
2. If parsing/validation reports a specifically retryable shape error and the result is replayable, optionally perform at most one native repair attempt with validation feedback.
3. If native structured output is explicitly unavailable, or bounded native validation repair still fails, perform at most one prompt-schema fallback.
4. Do not convert network, rate-limit, auth, cancellation, or ordinary provider errors into schema fallback.
5. Do not replay/fallback after a result marked `noRetry` or `toolExecuted`.
6. The prompt fallback is terminal: invalid fallback output returns the validation error rather than triggering another request.

## Compatibility / invariants

- Preserve PocketRisu's current `toolExecuted` no-replay invariant.
- Preserve `noRetry` semantics.
- Preserve existing model fallback ordering and normal request retries; structured-output recovery must not become a second hidden model-fallback engine.
- Preserve cancellation/abort behavior.
- Do not alter `visibilitychange` / `pagehide` save behavior, `flushServerDbKeepalive()`, V3 targeted plugin reload, runit, or Android notification behavior.
- Provider capability rejection must be explicitly identified, not inferred from arbitrary failures.

## Validation / acceptance

Required unit matrix:

- valid native response => 1 request;
- retryable validation error repaired natively => exactly 2 native requests;
- retryable native validation error twice => exactly 2 native + 1 prompt request;
- explicit native unsupported => exactly 1 native + 1 prompt request;
- invalid prompt fallback => no fourth request;
- rate limit/network/auth/cancel => no schema fallback;
- `noRetry` invalid structured result => no replay;
- `toolExecuted` invalid structured result => no replay;
- attempt ordering and counts asserted exactly.

Provider-level acceptance requires tests for every mapped native-unavailable error form. Unknown errors remain ordinary failures.

## Risk / blast radius

Risk is `MEDIUM`. Incorrect error classification can hide provider outages or multiply cost/latency; incorrect replay eligibility can duplicate side effects. The blast radius stays contained if the first PR is a pure helper with tests and no production wiring.

## Rollback / fallback

The helper can be reverted independently. Provider wiring must be feature-local and removable without changing provider request construction. On uncertainty, fall back to current PocketRisu behavior rather than guessing that an error means native-schema incompatibility.

## Dependencies

- Map PocketRisu's current schema parsing/validation ownership.
- Identify whether provider adapters can emit an exact native-structured-output-unavailable signal without heuristic string matching.
- Confirm where `noRetry` / `toolExecuted` metadata remains available relative to structured response validation.

## PR decomposition

1. Pure replay-policy helper + exhaustive unit tests, no production behavior change.
2. One provider adapter capability-error mapping + policy wiring, if explicit mapping is reliable.
3. Additional provider mappings one at a time, each with adapter regression tests.

Promotion to `READY_TO_PORT` requires all three dependency questions above to be resolved and a concrete first-provider validation path. No autonomous implementation before that point.
