# BaseCore Current Development

<!-- BASECORE_PRODUCTION_SNAPSHOT:BEGIN -->
## Current Production Snapshot

- Product: BaseCore
- Production version: none
- Development target: `v0.1.0`
- Development branch: `basecore-v0.1`
- Release branch: `release-basecore`
- Validation status: `NOT_YET_LIVE_VALIDATED`
- Donor baseline: SimCore `v0.63.56`

This block will become machine-managed after BaseCore release automation is enabled.
<!-- BASECORE_PRODUCTION_SNAPSHOT:END -->

## VERIFIED

- BaseCore product namespace is designed to be independent from SimCore.
- Donor source was verified as SimCore `v0.63.56` on `release-simcore`.
- BaseCore v0.1 candidate source passes JavaScript syntax checking with `node --check`.
- Local Node VM smoke fixture passed two sequential turns: 2017→2018 calendar repair, Korean-age offset +1, same-title Chapter hold, Chatindex 1→2, and deferred `$basecore_state` mirror. This is local fixture evidence only, not live PocketRisu validation.
- Removed conceptual subsystems: Broadcast, Mode C, COMMUNITY, exposure, reaction, lineage, handoff, evidence fencing.
- `basecore-v0.1` now contains the materialized v0.1 runtime pair: `plugins/basecore/latest.js` and `plugins/basecore/install.js` are byte-identical, 67,367 bytes each, Git blob `943bdb576d8e9d254d61e5e2fb7caeed4d5d1ddd`.
- The remote runtime blob exactly matches the locally syntax-checked/smoke-tested candidate (local Git blob is the same `943bdb576d8e9d254d61e5e2fb7caeed4d5d1ddd`; local SHA-256 `76bbf4f89651fcc26381722b8ee971a8ef0b3b87579813fb5560af4b9e0de690`).
- Main-to-feature comparison contains only BaseCore-owned runtime/product-memory/release-automation additions; no SimCore runtime or durable-memory file is changed.

## CURRENT IMPLEMENTATION TARGET

The first independent Narrative-only runtime candidate is materialized on `basecore-v0.1` and is ready for real PocketRisu validation.

Frozen candidate capabilities:

- BaseCore-only handshake/storage/mirror namespaces
- Narrative Time derived from donor behavior
- Frame continuity derived from donor behavior
- A-only recurrence guard
- canonical response envelope + final Knowledge validation
- visible-history bootstrap for attaching BaseCore to an existing Narrative chat
- conservative manual-edit rebuild
- named hook cleanup and runtime epoch stale-drop protection
- BaseCore-owned durable memory and guarded release automation

Do not promote to `release-basecore` until the live validation gate is completed and `manifest.json` records a `VALIDATED_*` state.

## LIVE VALIDATION GATE

After installing the candidate in PocketRisu, validate in this order:

1. Fresh Narrative chat: handshake active, runtime prompt appended after current user.
2. Sequential turns: Chatindex increments exactly by one.
3. Same Chapter title: Chapter number holds.
4. Changed Chapter title: Chapter advances by one.
5. Explicit date progression: frame date and weekday match the deterministic target.
6. January 1/year crossing: `worldYear` and Korean-age offset advance exactly once per crossed year.
7. Multi-scene response: monotonic final scene timestamp becomes the narrative anchor.
8. Existing long chat: first attach bootstraps current narrative time/world year without SimCore state import.
9. Reload/update: one active request/output hook pair; stale runtime does not commit.
10. Manual edit of previous assistant: next request rebuilds BaseCore state from visible history.

## UNKNOWN / NOT YET CLAIMED

- Real long-chat performance relative to SimCore.
- Whether simplified envelope compatibility needs SimCore's full Fresh-confirmation boundary logic.
- Whether BaseCore needs the larger SimCore cache-topology diagnostics.
- Provider cache behavior remains unverified and is not a BaseCore v0.1 requirement.
