# Voyage Token Check — Product Goal

## Final goal

The plugin should let the user view their actual Voyage token allocation/quota inside the plugin UI.

## Success criteria

- The displayed quota comes from a real, identifiable Voyage source.
- Known zero and unknown remain distinct states.
- Missing quota data is shown as unavailable/unknown rather than fabricated.
- The plugin identifies provenance and scope when the source exposes them.
- Refresh behavior should retrieve current quota without unnecessary polling or unrelated network activity.
- The UI should remain useful when the quota source is temporarily unavailable.

## Current evidence state

- VERIFIED: the final product goal is to display Voyage token allocation/quota in the plugin.
- UNKNOWN: the canonical Voyage endpoint or data source that exposes the quota.
- UNKNOWN: authentication/session mechanism required to read that quota.
- UNKNOWN: exact quota semantics (total, remaining, used, reset window, model-specific, organization/project scope, etc.).
- UNKNOWN: refresh/reset timing and timestamp precision.

Do not infer any of the UNKNOWN items from pricing pages, model names, or assumptions. The next design step is evidence gathering to identify the real quota source and its semantics before implementation.

## Future distribution candidate

Public or broader distribution is a later roadmap candidate, not part of the current primary release goal.

Before distribution work begins, first establish a stable quota-reading implementation and verify its authentication, data-fidelity, privacy, update, and recovery contracts on real devices.

When distribution becomes an active release goal, evaluate it separately, including installation/update flow, secret handling, compatibility boundaries, documentation, release artifacts, and rollback strategy. Do not bundle distribution work into quota-source discovery or early quota-display releases without evidence that the combined change is necessary.
