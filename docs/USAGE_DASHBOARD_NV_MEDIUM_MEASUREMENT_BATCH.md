# Local Usage Dashboard — NV Medium / Medium Measurement Batch

Status: **IMPLEMENTATION BATCH IN PROGRESS — physical evidence gate**

Batch:
- `NV-CLI-FOOTPRINT`
- `NV-LOCAL-COST-MAP`

Both ideas are repository-only measurement work. Their design and canonical measurement artifacts are now implemented. Neither item may be marked complete until the remaining real-device evidence is captured on the current production baseline.

## Current production authority

At batch start, `release-usage-dashboard` reports:
- Product `3.0.0-alpha.5.81`
- Engine `1.6.22`
- Manager `1.3.0`
- contracts `1 / 1`
- Managed CLI `1.9.0`

## Implemented artifacts

- `docs/USAGE_DASHBOARD_CLI_FOOTPRINT_MEASUREMENT.md`
- `docs/USAGE_DASHBOARD_LOCAL_COST_MAP.md`

## Shared physical gate

One current PocketRisu session should supply both:

1. full 5.81 Diagnostics text, which closes the current local-cost baseline and can also serve the ordinary 5.81 physical runtime acceptance evidence;
2. actual filesystem measurements for the Manager-owned managed CLI root/version/package directories.

The two measurements must be recorded before the idea list changes to `IMPLEMENTED`.

## Safety

No product bytes, runtime semantics, telemetry, network calls, scheduler behavior, updater behavior or PocketRisu `+` flow are changed by this batch.
