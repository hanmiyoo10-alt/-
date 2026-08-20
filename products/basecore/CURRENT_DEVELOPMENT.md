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

## CURRENT IMPLEMENTATION TARGET

Build the first independent Narrative-only runtime baseline with:

- BaseCore-only handshake/storage/mirror namespaces
- Narrative Time derived from donor behavior
- Frame continuity derived from donor behavior
- A-only recurrence guard
- canonical response envelope + final Knowledge validation
- visible-history bootstrap for attaching BaseCore to an existing Narrative chat
- conservative manual-edit rebuild
- named hook cleanup and runtime epoch stale-drop protection

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
