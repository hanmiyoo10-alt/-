# Request-log source budgets — invariant

Feature-ID: `OBS-REQUEST-LOG-SOURCE-BUDGETS`

## Problem / evidence

Official PocketRisu `develop` expanded request logging beyond the main LLM path in `2deffd1f63d0b118dcbaa299b124b4efe79706ca`, including plugin and auxiliary/provider-specific paths, and added a smaller plugin-specific byte budget before the global request-log budget. Commit `222911203581270ad4657b4d98e0f474a00b4ef3` also normalizes leading provider keep-alive whitespace for usable response inspection.

## Durable invariant

Every logged request path should have explicit source ownership. High-volume or less-predictable sources should not be able to consume the entire shared retention budget. Per-source caps may be stricter than the global cap, but the global cap remains authoritative as the final bound.

Logging must not weaken request secrecy. Existing masking/redaction, bounded body handling, source filters, and retention limits remain part of the same ownership boundary.

## Compatibility / acceptance

- Main-source rows remain available when plugin rows exceed the plugin-specific budget.
- Newer plugin rows survive source-specific rotation while older plugin rows are reclaimed.
- The global byte budget still bounds the complete store.
- Source attribution is deterministic for main, plugin, legacy auxiliary, and provider-specific request owners.
- Sensitive-data masking/redaction remains active for every source.
- Leading whitespace used only as provider keep-alive padding is removed for display/storage normalization without modifying content after the first non-whitespace byte.
- Filter persistence is UI state only and must not alter which requests are authorized or emitted.

## Risk / rollback

Risk is `MEDIUM` because request logs may retain sensitive prompt/response content. If a source integration misattributes or over-retains data, disable that source's logging path or revert the source registration/budget change without changing request execution itself.

## Classification

- System impact: `NO_SYSTEM_UPDATE`
- Importance: `MEDIUM`
- Difficulty: `LOW`
- Size: `S`
- Evidence: `HIGH`
- Risk: `MEDIUM`
- Dependencies: `NONE`
- Priority: `P1`
- Lifecycle status: `ADOPTED`
