# Local Usage Dashboard — Managed CLI Footprint Measurement

Status: **IMPLEMENTATION READY — physical measurement pending**

Idea: `NV-CLI-FOOTPRINT`

## Purpose

Measure the actual installed managed `@llmgateway/cli` runtime footprint on PocketRisu/Android before making any storage claim. This is measurement-only and must not change Plugin / Engine / Manager bytes or runtime behavior.

## Fresh source authority

Current production baseline at implementation start:

- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- contracts `1 / 1`
- Managed CLI package `@llmgateway/cli`
- Managed CLI version `1.9.0`

Current Manager source owns the install layout:

- root: `$HOME/.local/share/local-usage-dashboard/runtime/cli`
- version root: `$HOME/.local/share/local-usage-dashboard/runtime/cli/1.9.0`
- package root: `$HOME/.local/share/local-usage-dashboard/runtime/cli/1.9.0/node_modules/@llmgateway/cli`
- descriptor/state/lock live under the root.

The version root is created by `npm install` and therefore includes the managed package plus its installed dependency tree. Package-name size, npm registry metadata, GitHub artifact size, or desktop measurements are not acceptable substitutes for the real-device measurement.

## Measurement set

Record, in KiB as reported by the device filesystem:

1. managed CLI root total;
2. version root total (package + dependencies + package-lock/package metadata);
3. `@llmgateway/cli` package directory only;
4. installed `node_modules` file count as a descriptive support metric;
5. Diagnostics-reported managed CLI version/state from the same device session.

Do not extrapolate apparent disk allocation to compressed download size or vice versa.

## Interpretation rules

- `version root total` is the main installed-runtime footprint number.
- `root total` may be slightly larger because descriptors/state files live beside the version directory.
- `package directory only` is not the dependency-inclusive runtime footprint.
- unknown/unreadable paths stay UNKNOWN; never substitute `0`.
- a missing `1.9.0` directory while Diagnostics says managed runtime is ready is a mismatch to investigate, not a zero-byte result.

## No product change

This measurement adds no telemetry, no polling, no network call, no Manager endpoint and no version bump. It is intentionally physical-measurement-only.

## Acceptance

`NV-CLI-FOOTPRINT` is complete when the 5.81 PocketRisu session records all available measurements above, the result is written into this document, and `USAGE_DASHBOARD_IDEA_LIST.md` is marked IMPLEMENTED. No storage optimization is authorized by this measurement alone.
