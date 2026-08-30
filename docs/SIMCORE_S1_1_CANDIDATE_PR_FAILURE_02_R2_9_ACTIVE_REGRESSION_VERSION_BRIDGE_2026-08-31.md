# SimCore S1-1 Candidate PR Failure 02 — R2.9 Active Regression Version Bridge

Date: 2026-08-31 KST
Classification: **FIX · R2_9_ACTIVE_REGRESSION_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED**
Status: **OBSERVED · ROOT CAUSE PROVEN · REPAIR PROVEN**

PR #1011 head `7258ca9c78bfeef51ac76f19eea40d5eadaa181c` failed candidate dry qualification because the R2.9 active projection test's bounded `KNOWN_RELEASE_IDENTITIES` table did not yet include `0.70.3`.

Repair: add only the `0.70.3 Runtime Cache Hash Primitive Convergence` identity. Do not add parked/unreleased `0.70.2`. No route, authority capability, fixture, registry or workflow behavior changed.

The repair was proven by PR #1011 head `a8bb97ebe65d539c6f3fda357fdfa541d5df7fd3`, where `GATE_PR1_DRY`, `GATE_STATIC`, `GATE_ARCH`, and `GATE_REGRESSION` all passed. Production remained v0.70.1.

The reusable pre-major simplification routine later superseded standalone S1-1 publication. This bridge remains preparation for the cumulative v0.70.3 construction target and does not itself authorize release.
