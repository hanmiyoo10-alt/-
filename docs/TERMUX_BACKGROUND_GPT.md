# Termux Background GPT Prototype

Date: 2026-08-28
Status: PROTOTYPE · NON-PRODUCTION
Scope: `plugins/termux/background-gpt/`
Canonical issue: `#707`

## Primary goal

Allow a Termux-side GPT request to continue as a server-side OpenAI Responses API background response even when the local UI or watcher is not kept in the foreground, then report completion through an Android notification when the local watcher can observe the terminal remote state.

## Verified platform contract

OpenAI's current Responses API exposes a `background` boolean on response creation. Response status includes `queued`, `in_progress`, `completed`, `failed`, `cancelled`, and `incomplete`. OpenAI also exposes retrieve/cancel operations for Responses and webhook events such as `response.completed`, `response.failed`, and `response.cancelled` for background responses.

This prototype uses polling only. Webhooks remain a later candidate because a phone-local Termux process is not a stable public HTTPS webhook target by default.

## Architecture

```text
prompt
  -> POST /v1/responses { background: true }
  -> persist response_id + lifecycle metadata
  -> detached local watcher polls GET /v1/responses/{id}
  -> terminal remote status
  -> Termux Android notification
```

Cancellation uses `POST /v1/responses/{id}/cancel`.

## Failure boundary

The remote response lifecycle and local watcher lifecycle are separate.

A dead watcher becomes `watcher_status=stale` while preserving the last known remote state. The prototype must never convert a local process death, Android process restriction, network outage, or repeated polling failure into a fabricated remote `failed` state.

After five consecutive polling errors, the watcher stops and emits a status-check notification. `resume` re-reads the remote response and starts a fresh watcher if the response is still active.

## Privacy and secrets

- API key comes only from `OPENAI_API_KEY`.
- API key is not persisted or logged.
- Prompt text is not stored in local state.
- Final answer is not stored in local state.
- Notification content contains lifecycle state and elapsed time, not prompt/answer text.
- ChatGPT cookies/session data are out of scope.

## Prototype commands

- `submit`
- `status`
- `result`
- `cancel`
- `resume`

## Regression contract

Repository CI must verify without network access:

1. background submission sends `background: true`;
2. retrieve/cancel use the expected Responses endpoints;
3. API key is supplied only through Authorization and is not persisted by state helpers;
4. dead local watcher becomes `stale` without changing an `in_progress` remote state;
5. response text extraction handles ordinary `output_text` parts;
6. completion notification is non-ongoing and alerts once;
7. watcher uncertainty wording does not claim remote failure.

## Real-device validation required before production

1. Configure a valid OpenAI API key and supported model in Termux without committing either secret to the repository.
2. Submit a deliberately long response.
3. Immediately press Home and separately test screen lock.
4. Confirm the Android notification continues to reflect polling while Termux is allowed to run.
5. Force-stop/kill only the local watcher process, wait briefly, and verify `status` marks the watcher stale without declaring the remote response failed.
6. Run `resume`; verify it retrieves the same response id and either resumes monitoring or observes its terminal state.
7. Verify `result` returns the completed answer.
8. Record battery/heat, notification duplication, polling errors, Android background restrictions, and completion latency.

Do not claim ChatGPT consumer-app background continuity from this test. This route is a separate API-backed client.
