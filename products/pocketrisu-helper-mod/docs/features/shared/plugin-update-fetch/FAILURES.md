# Failures — plugin-update-fetch

Feature-ID: `plugin-update-fetch`

## 2026-08-17 — first cache-safe updater failed on real mobile localhost runtime

Stage: post-merge real-device validation of fork PR #1

Observed fact:
- the first cache-safe/prerelease-aware updater built and passed its regression tests;
- on the real mobile localhost runtime, update buttons disappeared for multiple plugins;
- this indicated failure in the shared update fetch path rather than prerelease ordering itself.

Cause assessment:
- exact browser/runtime implementation detail was not isolated to one API failure;
- evidence pointed to incompatibility around strict `Request.cache: 'no-store'` and/or `Range` request behavior on the mobile runtime.

Remediation:
- fork PR #2 added ordered fallback instead of assuming one request shape works everywhere;
- metadata: `Range + no-store` → full `no-store` GET → plain GET;
- full plugin download: `no-store` → plain GET;
- kept cache-buster and prerelease comparison behavior.

Result:
- #2 merged locally on 2026-08-18 as the hardened historical implementation.

Rule learned:
- plugin updater compatibility must be validated on the actual mobile localhost/browser path; build/test success alone is insufficient for fetch/cache behavior.
