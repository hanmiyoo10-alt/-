# Voyage Token Check — Product Goal

## Final goal

The plugin should let the user view their actual Voyage token allocation/quota inside the plugin UI.

## User experience goal

The product exists primarily to remove the friction of opening the Voyage website, navigating to usage/quota information, and checking it manually.

The intended interaction is:

`open plugin → see current Voyage quota/usage immediately`

The plugin should therefore optimize for a fast, one-action check rather than recreating the full Voyage dashboard. The first useful screen should surface the verified quota/usage state directly, with extra provenance or diagnostics available only when needed.

## Success criteria

- The displayed quota comes from a real, identifiable Voyage source.
- Known zero and unknown remain distinct states.
- Missing quota data is shown as unavailable/unknown rather than fabricated.
- The plugin identifies provenance and scope when the source exposes them.
- Refresh behavior should retrieve current quota without unnecessary polling or unrelated network activity.
- The UI should remain useful when the quota source is temporarily unavailable.
- Normal use should not require opening the Voyage website just to check quota/usage.

## Current evidence state

- VERIFIED: the final product goal is to display Voyage token allocation/quota in the plugin.
- VERIFIED: the primary UX motivation is to replace the repetitive website-navigation check with a one-action plugin check.
- VERIFIED: documented inference responses expose per-request token usage such as `total_tokens`.
- VERIFIED: Voyage documents usage/cost and rate-limit visibility in its dashboard at organization/project scope.
- VERIFIED: Voyage documents API keys as secrets and says not to expose them in browsers or apps.
- VERIFIED: Voyage Terms prohibit page-scraping/robot-style access to obtain information not purposely made available through the Service.
- UNKNOWN: a documented public Voyage API that exposes account/project free-token balance or remaining quota.
- UNKNOWN: whether the host application already exposes enough authenticated usage/quota data for the plugin without handling secret credentials itself.
- UNKNOWN: exact quota semantics (total, remaining, used, reset window, model-specific, organization/project scope, etc.).
- UNKNOWN: refresh/reset timing and timestamp precision.

Do not infer any UNKNOWN item from pricing pages, model names, or assumptions. The next design step is evidence gathering to identify the real quota source and its semantics before implementation.

## Distribution decision gate

Distribution is decided by the quota source, not merely by whether the code works locally.

### Public / official distribution candidate

Public distribution may be considered only if the feature can be implemented using an intentionally exposed, supportable interface, for example:

- a documented Voyage API for usage/quota; or
- authenticated quota/usage data already exposed to plugins by the host application without leaking or copying secret credentials.

The implementation must preserve user isolation, avoid shipping credentials, and have stable data semantics.

### Private distribution candidate

Private distribution may be considered when the plugin can rely only on user-local, already-authorized data or host-observed request usage, while keeping secrets local and respecting Voyage's documented interfaces and terms.

Local per-request token accounting alone must not be presented as exact account-wide remaining quota unless evidence proves that all relevant usage and allocation semantics are captured.

### Do not distribute yet

Do not publish either publicly or privately if the only workable method requires:

- scraping the Voyage dashboard;
- automating browser/session navigation to obtain data not intentionally exposed for programmatic access;
- copying or transmitting another user's session/login credentials;
- embedding or publishing API keys; or
- guessing remaining quota from incomplete local traffic.

A private build is not an exception to source legitimacy or credential safety.

## Future distribution candidate

Public or broader distribution remains a later roadmap candidate, separate from the current primary goal of identifying and validating the quota source.

Before distribution work begins, first establish a stable quota-reading implementation and verify authentication, data fidelity, privacy, update, and recovery contracts on real devices.

When distribution becomes an active release goal, evaluate installation/update flow, secret handling, compatibility boundaries, documentation, release artifacts, and rollback strategy as a separate release goal.
