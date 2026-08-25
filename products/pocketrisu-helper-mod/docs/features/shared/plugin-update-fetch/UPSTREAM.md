# Upstream PR dossier — plugin-update-fetch

Feature-ID: `plugin-update-fetch`
Area: `shared`
PR status: `LOCAL_HISTORY_ONLY`
Isolation status: `PRE_GUARD_HISTORY`
Deployment status: `LOCAL_FORK`

## Historical PR chain

### Fork PR #1
- PR: `hanmiyoo10-alt/PocketRisu#1`
- Title: `fix: make plugin updates cache-safe and prerelease-aware`
- Opened / merged: `2026-08-17`
- Result: **MERGED_LOCAL**
- Scope:
  - bypass browser/WebView cache for update metadata and full plugin downloads;
  - SemVer-style prerelease comparison with legacy dot-numeric fallback;
  - updater logic isolation + regression tests.

### Fork PR #2
- PR: `hanmiyoo10-alt/PocketRisu#2`
- Title: `fix: make plugin update fetch resilient on mobile runtimes`
- Opened: `2026-08-17`
- Merged: `2026-08-18`
- Result: **MERGED_LOCAL / HARDENING OF #1**
- Scope:
  - cache-bust update URLs while preserving query parameters;
  - metadata fallback order: `Range + no-store` → full `no-store` GET → plain GET;
  - full download fallback: `no-store` → plain GET;
  - prerelease ordering unchanged from #1.

## Why there were two PRs
#1 built and tested successfully, but the real mobile localhost runtime suppressed update buttons for multiple plugins. That showed the shared update fetch path could fail when `Request.cache` or `Range` semantics differ from the test/runtime assumptions. #2 kept the cache-safety goal while adding graceful fallback.

## Upstream state
No official `PocketRisu/PocketRisu` PR for this exact historical pair is recorded in the current backfill. Treat these as local-fork history and behavioral evidence, not as upstream acceptance.

If revisiting upstream:
1. inspect current plugin updater first;
2. verify whether equivalent cache busting/fallback has already landed independently;
3. rebuild only missing behavior on current upstream;
4. keep V3 targeted reload (`plugin-targeted-reload`) separate.
