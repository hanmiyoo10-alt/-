# PLUGIN-NONSTREAM-CONSUMER-CONTRACT

## Problem / evidence

`rpaddict/RisuBard@40b66b2e1ee149a60ef14f1654237aa0e5d6ffc6` fixes a response-shape mismatch where a plugin provider returned a `ReadableStream` even though the caller explicitly requested a non-stream response. The source drains the provider stream into text only for the non-stream caller and adds a regression test that keeps this conversion ahead of the normal streaming return path.

## Minimal safe scope

If PocketRisu has the same owner and a reproducible mismatch, adapt only the boundary that translates a provider response into the caller-requested response shape. Do not change provider protocol, normal chat streaming, plugin installation/security, or unrelated request logic.

## Ownership boundary

The response-shape adapter belongs at the consumer/request boundary that knows whether the caller requested streaming. Provider transport choice is evidence, not authority over the caller contract.

## Invariants

1. A caller that explicitly requests non-stream output receives one completed textual success value even if an otherwise-valid plugin provider transports it as a stream.
2. Normal streaming callers still receive streaming results with existing latency and cancellation behavior.
3. Stream errors and cancellation remain observable; draining must not silently convert a failed stream into success.
4. Do not buffer streams unless the consumer explicitly requested non-stream behavior.
5. No persistence, storage, system/runtime, server-phone notification, PM2, or PocketRisu save-integrity guardrail is touched.

## Validation / acceptance

- Reproduce a plugin provider returning a stream to a non-stream caller.
- Assert complete ordered text collection and model/result metadata parity.
- Assert stream error propagation and cancellation behavior.
- Assert ordinary chat streaming remains streaming and is not eagerly buffered.
- Prefer a focused regression test before code modification.

## Risk / blast radius

Low if restricted to the explicit non-stream consumer branch. The main failure mode is accidental eager buffering of normal chat streams, which can increase memory and first-token latency.

## Rollback / fallback

A single localized adapter should be independently revertible. Existing provider-specific behavior remains the fallback until a concrete PocketRisu mismatch is demonstrated.

## Dependencies

A matching PocketRisu plugin-provider request owner and a reproducible caller/provider response-shape mismatch. Until then this remains a HOLD invariant, not an implementation instruction.
