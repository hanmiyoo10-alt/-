# NV-LOCAL-COST-MAP — Design and implementation gate

Status: **DESIGN READY / REPO IMPLEMENTED / CURRENT-PRODUCTION PHYSICAL CAPTURE PENDING**

Classification: no product version update · importance medium · difficulty medium.

Primary goal: maintain a source-backed map of local normalization, render, dedup and persistence cost using existing Diagnostics only. Source/CLI latency must stay separate from local Plugin work, and unavailable isolated timing stays UNKNOWN.

Canonical implementation artifact: `docs/USAGE_DASHBOARD_LOCAL_COST_MAP.md`.

The latest available 5.80 physical capture is retained only as a historical baseline. Closure requires one current 5.81 Diagnostics capture so the current-production column is populated without inference.

Interpretation contract: an observed integer `0ms` means below measurement resolution, not literal zero CPU. Write/skip counters show dedup activity but are not timing measurements. UI stalls are not attributed to Dashboard work without refresh/render overlap evidence.

Non-goals: no new profiler/timer/telemetry, no optimization release, no network/polling, no version bump, no change to the `+` update flow.
