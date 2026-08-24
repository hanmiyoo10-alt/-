# Voyage Token Check — UI Contract

## Product interaction model

Voyage Token Check uses two UI layers with different purposes:

1. a **contextual mini widget** that appears only while Voyage activity is relevant;
2. a **full dashboard** that appears when the user explicitly opens the plugin.

This keeps normal Risu usage uncluttered while preserving the product's core promise: one action opens the useful Voyage dashboard state.

## 1. Contextual mini widget

### Purpose

Show only the minimum live information needed while Voyage is actively being used.

The mini widget is not a second dashboard and must remain visually lightweight.

### Visibility contract

Preferred behavior:

- hidden by default;
- appears when recent plugin-visible evidence indicates Voyage activity;
- remains visible while Voyage activity is considered active;
- automatically hides after a bounded inactivity window;
- must not remain permanently on screen just because Voyage was used earlier in the session.

The exact activity timeout is **UNKNOWN until real-device UX measurement**. Do not hard-code a long-lived timeout before validation.

### Suggested contents

Keep the mini widget to a small set of high-signal fields:

- Voyage active/live indicator;
- current model when VERIFIED from runtime evidence;
- latest request token usage or current observed usage when available;
- authoritative remaining quota only if an authoritative source is later VERIFIED;
- freshness state when useful.

Unknown model metadata or quota must remain unknown rather than being guessed.

### Interaction

The mini widget should provide a direct action to open the full dashboard.

It should not expose diagnostics, detailed cost tables, full rate-limit metadata, release notes, or configuration controls.

### Refresh behavior

While visible, the mini widget may reuse the bounded visible-only refresh strategy from `LIVE_REFRESH_CONTRACT.md`.

- do not create a separate high-frequency background poller;
- reuse the same normalized snapshot/state pipeline as the dashboard;
- stop active refresh work when the widget is hidden unless another visible surface still needs it;
- prefer one shared refresh coordinator over duplicate polling loops.

## 2. Full plugin dashboard

### Opening contract

When the user explicitly opens Voyage Token Check, the plugin should present the dashboard immediately rather than an intermediate menu.

Normal interaction:

`open Voyage Token Check → dashboard appears → latest trustworthy snapshot is visible → bounded refresh updates it`

### Dashboard hierarchy

The full dashboard is the primary product surface and may show:

1. authoritative remaining quota when available;
2. total / used / remaining breakdown when supported;
3. Risu-observed Voyage usage with explicit observed fidelity;
4. model / endpoint breakdown when supported by evidence;
5. cost when exposed by a legitimate source;
6. rate-limit state when exposed by a legitimate source;
7. reset/freshness/source indicators;
8. manual refresh;
9. update notes / What's new;
10. redacted diagnostics.

The dashboard should reproduce the useful decision-making information from the Voyage website, not clone unrelated website navigation or account-management UI.

## 3. Shared state architecture

The mini widget and full dashboard must consume the same normalized `VoyageSnapshot` state.

Do not create separate accounting logic for each surface.

Conceptually:

```text
Voyage / Host / Risu sources
          ↓
      Providers
          ↓
 Normalize + provenance
          ↓
   Shared VoyageSnapshot
        ↙       ↘
 Mini widget   Full dashboard
```

This prevents the widget and dashboard from showing contradictory token values.

## 4. Fidelity rules

Both surfaces inherit the project data-fidelity contract:

- known zero is not unknown;
- Risu-observed usage is not account-wide quota;
- authoritative remaining quota is shown only when its source is VERIFIED;
- unknown models are data, not errors;
- model identity must not be used to guess unsupported pricing/quota semantics;
- stale trustworthy data may remain visible with an explicit freshness indication during temporary source failure.

## 5. Security and privacy

Neither UI surface may display or retain:

- Voyage API keys;
- authorization headers;
- browser cookies or sessions;
- raw credential material;
- raw fetch logs by default;
- personal organization/project identifiers unless a future legitimate source exposes them and the product has a clear need to display them.

The mini widget in particular should avoid showing unnecessary account-identifying metadata because it may remain visible over normal Risu usage.

## 6. UX design decision

**DESIGN DECISION:** use a two-tier interface.

- Voyage inactive → no mini widget.
- Voyage active → compact live mini widget may appear.
- User opens the plugin → full dashboard appears immediately.
- Tapping/opening from the mini widget → same full dashboard, not a separate detail implementation.

This makes the mini widget a contextual glance surface and the full plugin view the authoritative dashboard surface.

## Current evidence status

- VERIFIED: the project already has a provider/snapshot architecture suitable for two presentation surfaces.
- VERIFIED: visible-only bounded refresh is the current live-refresh design.
- UNKNOWN: exact real-device trigger and timeout that best define `Voyage active` without flicker or lingering UI.
- UNKNOWN: exact host UI mechanism/location for the mini widget until implementation evidence verifies the safest supported integration point.

## Next evidence gate

During real-device validation, measure:

- when a normal Voyage request becomes visible to the plugin;
- whether activity can be detected reliably without false positives;
- how quickly the widget should appear after activity;
- how long it should remain after the final request;
- whether the chosen placement obstructs chat or mobile controls;
- whether the widget and dashboard remain numerically consistent under repeated requests.

Do not implement a permanent UI placement or inactivity timeout before this evidence is collected.
