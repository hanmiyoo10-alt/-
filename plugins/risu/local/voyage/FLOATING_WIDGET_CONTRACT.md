# Voyage Token Check — Floating Widget Contract

## Goal

The Voyage activity widget should behave as a lightweight floating status control that stays out of the user's way while remaining easy to reach.

Its job remains intentionally narrow:

```text
● Voyage 사용중
```

The widget is not a usage meter and must not show token counts, model names, quota, cost, or rate-limit details.

## Floating behavior

**DESIGN DECISION:** the mini widget is floating rather than permanently occupying dashboard or chat layout space.

Rules:

- the widget overlays the Risu interface without reserving permanent layout space;
- it appears only while Voyage activity is considered active;
- it automatically hides when Voyage activity expires under the activity-window contract;
- opening/tapping the widget opens the full Voyage Token Check dashboard;
- floating behavior must not create a second independent refresh loop.

## Docking and edge snapping

The widget may be dragged vertically by the user, but once released it must dock to one of the two horizontal screen edges.

Stable rule:

```text
free drag → release → snap to nearest safe left/right edge
```

The settled widget must not remain parked in the middle of the chat area.

Preferred constraints:

- final horizontal position: left edge or right edge only;
- vertical position: user-selected within a safe viewport range;
- respect safe areas, keyboard/IME overlap, bottom navigation, and other host controls when measurable;
- preserve a small edge margin so the widget is reachable and not clipped;
- if the viewport changes materially, clamp the stored position back into the visible safe range.

Exact margins, drag threshold, animation, and safe-area offsets remain **UNKNOWN until real-device UI validation**.

## User enable/disable control

The user must be able to turn the floating widget on or off independently of the main dashboard.

Conceptual setting:

```text
사용 중 표시 위젯  [켜기 / 끄기]
```

Rules:

- widget disabled → never render the floating Voyage status widget;
- widget disabled must **not** disable Voyage data collection required by an explicitly opened dashboard;
- widget disabled must **not** disable the full dashboard itself;
- widget enabled → the widget may appear only when legitimate Voyage activity is detected;
- toggling the widget must not affect quota/usage fidelity or provider behavior.

The default enabled/disabled value remains an implementation choice until real-device UX validation, but the user's explicit choice must persist locally.

## Position persistence

Store only minimal UI preference state:

- widget enabled/disabled;
- dock side: `left | right`;
- normalized or otherwise viewport-safe vertical position when supportable.

Do not store sensitive Voyage/account data as part of widget preferences.

On reload/restart, the widget should restore the last valid dock side and vertical placement when the host UI allows it.

If the stored position is no longer valid after viewport or layout changes, clamp it safely instead of rendering off-screen.

## Interaction hierarchy

The floating widget has one primary action:

```text
tap/click → open full dashboard
```

Dragging must be distinguishable from tapping so repositioning does not accidentally open the dashboard.

The floating widget should not contain nested menus, token details, diagnostics, update notes, or configuration controls. Those remain in the full plugin dashboard/settings surface.

## Accessibility and obstruction rules

The widget should remain small, readable, and non-obstructive.

- do not cover primary message composer controls when a safe alternative position exists;
- do not permanently obscure chat content in the center column;
- maintain sufficient hit target size for touch use;
- if left/right docking conflicts with host controls, real-device evidence determines the safe vertical clamp zones;
- avoid visually aggressive motion or continuous animation; the green active dot is sufficient status emphasis.

## Shared-state rule

The widget consumes the same activity state produced by the shared Voyage snapshot/module architecture.

It must not independently infer token totals, independently poll Voyage, or maintain a second definition of `Voyage active`.

Conceptually:

```text
Voyage activity evidence
        ↓
Model/Activity state + shared refresh coordinator
        ↓
MiniActivityModule
        ↓
Floating edge-docked widget
```

## Failure behavior

- floating UI integration fails → full dashboard remains usable;
- stored position is invalid → reset/clamp to a safe edge position;
- activity detection is uncertain → hide rather than falsely show `사용중`;
- widget preference storage fails → use a safe session default without affecting dashboard data;
- dashboard opening action fails → widget must not expose raw diagnostics or sensitive state as a fallback.

## Evidence status

- DESIGN DECISION: mini widget is a floating overlay.
- DESIGN DECISION: settled position docks only to the left or right screen edge.
- DESIGN DECISION: user can independently enable/disable the widget.
- DESIGN DECISION: last valid dock side/vertical position should be retained locally when supportable.
- VERIFIED project rule: mini widget shows only active status and no usage numbers.
- UNKNOWN: exact supported host UI insertion mechanism for a floating overlay.
- UNKNOWN: exact safe zones, edge margins, keyboard handling, and drag/tap thresholds on the user's real device.

## Real-device validation gate

Before finalizing production placement, validate:

- whether the host permits a stable floating overlay without interfering with chat controls;
- left and right dock behavior on mobile;
- drag versus tap discrimination;
- keyboard-open behavior;
- orientation/viewport changes;
- persistence of dock side and vertical position;
- whether the widget can be disabled and remain absent while the full dashboard still works;
- whether Voyage activity appearance/disappearance remains reliable without flicker.

This document defines the UX contract only. It does not claim that the final host insertion mechanism is already VERIFIED.
