# Local Usage Dashboard 5.67 — Real-device Diagnostics Evidence

Source: PocketRisu / Android real-device verification reported after the 5.67 release.

## Verified release outcome

- `3.0.0-alpha.5.67 — Diagnostics Workspace Overhaul` is the successful production baseline for this follow-up.
- The observed issue is not that Basic or Full Diagnostics reports an incorrect value. The issue is temporal ambiguity: when Basic and Full Diagnostics are copied from different refresh states, the existing text does not make it immediately obvious whether both outputs describe the same refresh.
- The relevant existing state already contains `lastSyncAt`, `lastSyncDurationMs`, `lastRefreshReason`, and `refreshCount`, which are updated together on a successful refresh and can identify the refresh without introducing a new runtime counter.

## Follow-up requirement

The next release should make Basic, Detailed/Full export, and summary copy self-identifying by including a capture timestamp plus a compact identity derived from the existing refresh state. The identity must preserve the actual `refreshCount`, `lastRefreshReason`, and `lastSyncAt` values and must not invent a timestamp when the source value is unknown.

A required production-harness case is:

- capture Basic at refresh `#10` with reason `visibility`;
- advance the state to refresh `#11` with reason `timer`;
- capture Full Diagnostics;
- the two outputs must visibly prove that they describe different refreshes.

The inverse case is also required: Basic and Full generated from the same refresh state must report the same refresh identity.

## Explicitly deferred evidence

An intermittent style/render sample around `758ms` was observed, but its cause remains UNKNOWN. It is not part of the Diagnostics Capture Identity follow-up and must not be optimized or attributed in this release without additional evidence.
