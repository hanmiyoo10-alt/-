# Voyage Token Check — UI Contract

## Product interaction model

Voyage Token Check uses two UI layers with different purposes:

1. a **contextual mini widget** that appears only while Voyage activity is relevant;
2. a **full dashboard** that appears when the user explicitly opens the plugin.

This keeps normal Risu usage uncluttered while preserving the product's core promise: one action opens the useful Voyage dashboard state.

## 1. Contextual mini widget

### Purpose

Show only whether Voyage is actively being used.

The mini widget is a presence/status surface, not a usage meter and not a second dashboard.

### Visibility contract

Preferred behavior:

- hidden by default;
- appears when recent plugin-visible evidence indicates Voyage activity;
- remains visible while Voyage activity is considered active;
- automatically hides after a bounded inactivity window;
- must not remain permanently on screen just because Voyage was used earlier in the session.

The exact activity timeout is **UNKNOWN until real-device UX measurement**. Do not hard-code a long-lived timeout before validation.

### Display contract

When active, the widget should be intentionally minimal:

```text
● Voyage 사용중
```

- use a green status dot for the active state;
- do not show token counts, request usage, remaining quota, cost, rate limits, or model-by-model details in the mini widget;
- do not turn the widget into a continuously changing numeric display;
- if Voyage activity cannot be determined reliably, hide the widget rather than guessing an active state.

The full dashboard remains the place for numeric usage/quota information.

### Interaction

The mini widget should provide a direct action to open the full dashboard.

It should not expose diagnostics, detailed cost tables, full rate-limit metadata, release notes, or configuration controls.

### Refresh behavior

While visible, the mini widget may reuse the bounded visible-only refresh strategy from `LIVE_REFRESH_CONTRACT.md` only as needed to determine active/inactive state.

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

### Model priority and folding contract

The model section must prioritize models the user is actually using rather than presenting the entire Voyage model catalog at equal prominence.

Preferred presentation:

```text
사용 중 / 사용한 모델
  voyage-model-a
  voyage-model-b

미사용 모델 ▸
```

Rules:

- models with VERIFIED current or recent user activity appear in the upper, visible section;
- a model currently involved in Voyage activity should sort ahead of merely historical/recent models when that distinction is available;
- otherwise prefer recency of VERIFIED activity rather than a hard-coded model order;
- models for which the plugin has no VERIFIED user-usage evidence belong in a collapsed **unused models** section by default;
- the unused section must be expandable on demand but should not consume normal dashboard space while collapsed;
- a newly released Voyage model that is observed in real user activity must automatically move into the visible used-model section without requiring a hard-coded model-list update;
- a newly discovered model with no user-usage evidence remains in the collapsed unused section if the product has a legitimate source for listing it;
- do not infer that a model is used merely because it exists in Voyage documentation, pricing metadata, or a model catalog;
- do not invent model usage when evidence is unavailable.

Exact thresholds for what counts as `recent` remain **UNKNOWN until implementation and real-device evidence define the available timestamps/lifecycle**. The semantic requirement is stable: actual user activity gets priority; unused catalog entries stay out of the way.

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

This prevents the widget and dashboard from disagreeing about whether Voyage is active or about numeric dashboard values.

## 4. Fidelity rules

Both surfaces inherit the project data-fidelity contract:

- known zero is not unknown;
- Risu-observed usage is not account-wide quota;
- authoritative remaining quota is shown only when its source is VERIFIED;
- unknown models are data, not errors;
- model identity must not be used to guess unsupported pricing/quota semantics;
- model `used` / `unused` placement requires real user-usage evidence, not catalog membership;
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
- Voyage active → show only a compact green-dot `Voyage 사용중` status surface.
- User opens the plugin → full dashboard appears immediately.
- Dashboard → actively/recently used models are visible first; unused models are collapsed by default.
- Tapping/opening from the mini widget → same full dashboard, not a separate detail implementation.

This makes the mini widget a quiet activity indicator and the full plugin view the authoritative dashboard surface.

## Current evidence status

- VERIFIED: the project already has a provider/snapshot architecture suitable for two presentation surfaces.
- VERIFIED: visible-only bounded refresh is the current live-refresh design.
- DESIGN DECISION: mini widget shows active state only and intentionally omits token counts.
- DESIGN DECISION: used models are prioritized and unused models are collapsed by default.
- UNKNOWN: exact real-device trigger and timeout that best define `Voyage active` without flicker or lingering UI.
- UNKNOWN: exact timestamp/lifecycle evidence available for distinguishing current versus recent model activity.
- UNKNOWN: exact host UI mechanism/location for the mini widget until implementation evidence verifies the safest supported integration point.

## Next evidence gate

During real-device validation, measure:

- when a normal Voyage request becomes visible to the plugin;
- whether activity can be detected reliably without false positives;
- how quickly the widget should appear after activity;
- how long it should remain after the final request;
- whether the chosen placement obstructs chat or mobile controls;
- whether used-model detection remains correct across model switches and repeated requests;
- whether previously unused new models automatically move into the visible section after real use;
- whether the widget and dashboard remain state-consistent under repeated requests.

Do not implement a permanent UI placement, inactivity timeout, or recency threshold before this evidence is collected.
