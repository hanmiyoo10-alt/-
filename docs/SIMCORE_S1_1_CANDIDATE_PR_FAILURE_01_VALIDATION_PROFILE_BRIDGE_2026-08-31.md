# SimCore S1-1 Candidate PR Failure 01 — Validation Profile Bridge

Date: 2026-08-31 KST
Classification: **FIX · VALIDATION_PROFILE_VERSION_BRIDGE · NON_RUNTIME · PRODUCTION_UNCHANGED**
Status: **OBSERVED · ROOT CAUSE PROVEN · REPAIR PROVEN**

PR #1011 head `1a17b0540fcd2a2381d7f520ac933269ad8fe641` failed candidate dry qualification because source version `0.70.3` had no exact validation profile. Static, architecture and regression gates otherwise passed; candidate persistence and production mutation were NONE.

Repair: add `products/simcore/releases/validation-profiles/0.70.3.json` binding the unchanged inherited/exact-current contracts. This was later proven by passing PR #1011 head `a8bb97ebe65d539c6f3fda357fdfa541d5df7fd3` with `GATE_PR1_DRY`, `GATE_STATIC`, `GATE_ARCH`, and `GATE_REGRESSION` all PASS.

The reusable pre-major simplification routine subsequently changed S1-1 from a standalone release attempt into an internal construction checkpoint. This evidence remains historical and does not authorize pre-S7 publication.
