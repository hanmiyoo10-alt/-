# Feature-ID: REQUEST-VALIDATED-RESPONSE-BOUNDARY

Status: **DESIGN DRAFT — NOT IMPLEMENTATION READY**

## Problem / evidence

External evidence from `rpaddict/RisuBard` release `372b4efe0cb8a10d40f4e227ad949d78b8aadc60` shows a useful request-safety pattern: carry provider finish/stop metadata into structured-output validation, distinguish truncated/blocked/empty/invalid output, retry only pure generation/validation, cap repair attempts, and never automatically replay a request after tool execution or other caller-declared side effects.

This is evidence, not authority. PocketRisu's current provider/fallback/streaming ownership must be inspected before changing behavior.

## Classification

- **System impact:** `NO_SYSTEM_UPDATE`
- **Importance:** `HIGH`
- **Difficulty:** `LOW`
- **Size:** `S`
- **Evidence:** `MEDIUM`
- **Risk:** `MEDIUM`
- **Dependencies:** PocketRisu provider response metadata + retry/tool-execution ownership audit
- **Priority:** `P0`
- **Lifecycle:** `DESIGN_NEEDED`

## Minimal safe scope

First slice, if the audit proves a gap:

1. Define a small internal normalized completion-status contract for structured-output consumers only.
2. Preserve provider-specific raw behavior outside that boundary.
3. Detect known truncation/block/empty outcomes before persistence or downstream automatic analysis.
4. Permit at most one bounded repair retry only when the request is proven side-effect free.
5. Forbid automatic replay once a tool/write side effect occurred or once streaming output was materially emitted when replay would duplicate user-visible effects.

No broad provider rewrite, no storage migration, no server/runtime change, and no change to PocketRisu DB lifecycle guardrails.

## Ownership boundaries

- Provider adapters own raw provider stop/finish metadata extraction.
- Shared request/validation code owns normalized completion classification.
- Structured-output callers own schema parsing and the declaration of whether retry is side-effect safe.
- Persistence/tool execution must remain outside retryable validation loops unless explicitly proven idempotent.

## Proposed mechanism

Use a normalized result carrying text plus completion state such as `complete`, `truncated`, `blocked`, `empty`, or `unknown`. Provider adapters may map known finish reasons into the normalized state without erasing the original reason.

A validation helper may run one original attempt plus at most one repair attempt. Repair is allowed only for pure generation/validation failures such as incomplete structure where no tool/write/user-visible side effect has occurred. Authentication failure, cancellation, provider refusal/block, or side-effect-marked responses are never converted into generic format retries.

## Compatibility / invariants

- Existing provider-specific fallback order is unchanged unless separately reviewed.
- Cancellation stays cancellation; it is not reclassified as invalid structured output.
- Authentication/credential failures are never retried as format repair.
- A tool call or persisted write is never duplicated by validation retry.
- Partial streaming text may remain visible after disconnect, but incomplete output must not be marked complete or automatically fed into downstream memory/wiki-style analysis.
- Do not reintroduce forced DB flush on `visibilitychange` / `pagehide`.
- Keep `flushServerDbKeepalive()` no-op.
- Preserve targeted V3 plugin reload, runit, and the server-phone no-Android-notification rule.

## Validation / acceptance

Before implementation:

1. Trace current PocketRisu finish/stop metadata from each major provider adapter to the final caller.
2. Identify every retry layer and prove there is no nested unbounded retry path.
3. Identify tool-executing or persistence-producing calls and establish an explicit non-replay boundary.

Focused tests for an implementation slice:

- known output-limit finish reason → truncated classification, no persistence;
- known provider block/refusal → blocked classification, no repair retry;
- empty success payload → invalid/empty result;
- malformed structured output with no side effect → maximum one repair attempt;
- tool executed / write committed → zero automatic replay;
- cancellation/auth failure → preserve original error category;
- partial stream disconnect → retain received text for display while suppressing normal-completion downstream hooks.

Acceptance requires deterministic attempt counts and no behavior change for ordinary successful chat generation.

## Risk / blast radius

Main risk is changing provider-specific fallback or retry behavior globally. Keep the first slice restricted to one clearly owned structured-output boundary with tests. Do not centralize all request logic in the same PR.

## Rollback / fallback

The feature must be removable by reverting one isolated request-validation slice. Existing provider response paths remain the fallback. No persistent data format changes are allowed.

## Dependencies / PR decomposition

1. **INSPECT_ONLY:** provider finish metadata + retry ownership map.
2. Add normalized completion-status contract and unit tests without behavior change, if useful.
3. One isolated structured-output caller adopts bounded side-effect-aware validation.
4. Expand only after regression evidence.

One feature per branch/PR. Do not mix unrelated request cleanup.
