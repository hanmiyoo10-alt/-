# Voyage Token Check — Live Refresh Contract

## Goal

Keep the visible Voyage token/usage state fresh enough that the user does not need to manually refresh the plugin after normal Voyage activity.

Target experience:

`open plugin → current state appears immediately → new Voyage usage is reflected shortly after the request completes while the view is open`

This is a freshness UX contract. It must not weaken source fidelity or invent account-wide quota from locally observed traffic.

## Verified host facts

Current RisuAI Plugin API v3 exposes `getFetchLogs()` as a permission-gated snapshot getter. The public API does not currently expose a dedicated fetch-log-changed or request-completed event for plugins.

Risu's host fetch log is bounded to the most recent 20 entries. Host code inserts new fetch entries at the front and removes the oldest entry when the list exceeds 20.

Risu also exposes some lifecycle listeners such as chat-output listeners, but those are not a complete or authoritative signal for all Voyage activity. Voyage usage may occur outside the final chat-output event path, so they must not be treated as the sole refresh trigger.

## Design decision

Use a hybrid refresh model.

### 1. Immediate refresh on open

When the Voyage Token Check UI is opened:

1. render the last trustworthy normalized snapshot immediately when available;
2. call the active provider once;
3. normalize any new evidence;
4. update the visible values and freshness timestamp.

For a future authoritative quota provider, this open-time refresh should normally be enough to obtain the current account/project state.

### 2. Visible-only live refresh

While the plugin's quota/usage view is visible, the observed-usage provider may perform a bounded local refresh loop against `getFetchLogs()`.

Rules:

- refresh only while the relevant plugin view is visible;
- stop the loop when the view is hidden or the plugin unloads;
- do not perform Voyage network requests just to drive the live UI;
- do not poll the Voyage dashboard or any hidden endpoint;
- process only sanitized plugin-visible fetch-log data;
- discard raw logs after extracting the minimum normalized fields;
- compare a small fingerprint/cursor so unchanged snapshots do not trigger unnecessary render work.

The exact interval is **UNKNOWN until real-device measurement**. Start with a low-frequency human-visible target in the approximate one-to-few-second range only if real-device evidence shows it is cheap enough. Do not hard-code an aggressive interval before measuring host IPC, parse, normalize, and render cost.

### 3. Event acceleration where safe

Public Risu lifecycle events may be used as hints to trigger an immediate local refresh after relevant activity, but only as acceleration.

They must not be treated as complete accounting because not every Voyage request is guaranteed to map to the same host lifecycle event.

### 4. Manual refresh remains available

A manual refresh action remains part of the UI even when live refresh is enabled. It is the deterministic recovery path when permission, lifecycle, or host behavior prevents an automatic refresh.

## Authoritative quota vs observed usage

Live refresh semantics depend on the active provider.

### Authoritative provider

If a supportable authoritative Voyage quota source is later VERIFIED, the plugin should display that provider's current allocation/used/remaining values. The UI can refresh on open and optionally while visible, according to that provider's own documented rate/freshness constraints.

No local traffic reconstruction is needed to claim current account/project quota when the authoritative source directly supplies it.

### Risu observed-usage provider

`getFetchLogs()` can support near-real-time display of recently observed Voyage request usage while the plugin is active, but it does **not** by itself guarantee complete historical accounting.

Because the host retains only the newest 20 fetch entries, usage can be missed if the plugin is not observing often enough and more relevant requests occur than the retained window can cover. Therefore:

- live observed totals must remain labeled `Risu observed`;
- missed coverage must not be silently converted into exact account totals;
- opening the plugin after a long inactive period must not pretend to reconstruct full account history from the 20-entry window;
- persistent cumulative accounting remains UNKNOWN until a deterministic duplicate/miss strategy is validated on a real device.

## Performance contract

Live freshness must not become a background tax.

Measure and attribute:

`read host snapshot → filter Voyage entries → parse usage → normalize → compare state → render`

Only optimize after identifying the dominant phase.

Preferred behavior:

- no continuous loop when the quota view is closed;
- no unnecessary network request for observed refresh;
- no raw-response persistence;
- no unbounded history;
- no full rerender when normalized state is unchanged;
- back off or stop on repeated permission/source errors.

## UI freshness state

The summary screen should distinguish:

- `Live` or equivalent only when the current view is actively refreshing and the latest successful refresh is recent;
- `Updated just now` / timestamp when a snapshot was refreshed but no live loop is active;
- `Stale` when the last trustworthy value is retained after refresh failure;
- `Unavailable` when no trustworthy value exists.

Do not label a value `real-time` when the provider or host lifecycle cannot support that fidelity.

## Current verdict

- VERIFIED: `getFetchLogs()` is a snapshot getter available to plugins after permission.
- VERIFIED: Risu bounds the host fetch log to the latest 20 entries.
- VERIFIED: no dedicated public fetch-log change event is currently documented in Plugin API v3.
- DESIGN DECISION: use immediate open refresh plus visible-only bounded live refresh for observed usage, with optional lifecycle-event acceleration and a manual refresh fallback.
- UNKNOWN: the final refresh interval and real-device cost.
- UNKNOWN: whether observed usage can be made complete enough for persistent cumulative accounting.
- FUTURE: an authoritative quota provider may give fresher and more complete state without reconstructing account totals from host request logs.

## Validation gate

Before shipping live refresh, real-device diagnostics must verify:

- actual Voyage entries appear in `getFetchLogs()`;
- usage fields become available after request completion;
- log ordering and response-finalization behavior;
- refresh-loop CPU/IPC/render cost;
- behavior when the 20-entry window rotates;
- permission denial and recovery;
- no secret-bearing headers are exposed to the plugin.

The measured result determines the final live-refresh interval and whether any event acceleration is worth keeping.
