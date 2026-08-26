# NV-CLI-FOOTPRINT — Design and implementation gate

Status: **DESIGN READY / REPO IMPLEMENTED / PHYSICAL MEASUREMENT PENDING**

Classification: no product version update · importance medium · difficulty medium.

Primary goal: measure the actual installed managed `@llmgateway/cli` footprint on PocketRisu/Android from the Manager-owned install root. No package-name or desktop estimate is allowed.

Canonical implementation artifact: `docs/USAGE_DASHBOARD_CLI_FOOTPRINT_MEASUREMENT.md`.

Acceptance requires current-production physical evidence for the root, version root, package-only size, dependency-inclusive version-root size, file-count support metric, and same-session Diagnostics managed CLI version/state. Missing paths are UNKNOWN/investigate, never zero.

Non-goals: no runtime telemetry, no Manager endpoint, no storage cleanup, no version bump, no change to the `+` update flow.
