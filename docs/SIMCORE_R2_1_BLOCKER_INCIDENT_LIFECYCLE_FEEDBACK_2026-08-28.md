# SimCore R2.1 — Blocker Incident Lifecycle Feedback

Date: 2026-08-28 KST
Classification: **FIX / INCIDENT_LIFECYCLE / NON_RUNTIME / NON_BLOCKING**
Tracking issue: **#641**

## Observation

Issue `#629` represented both the release-system defect and the blocked v0.64.8 publication incident.

PR `#631` used `Fixes #629`, so GitHub closed the issue when the release-system code repair merged at `e58cfdb672b92a3a8915d79ab7c5b661ee36f0e4`.

At that moment the blocked release had not yet completed append-only recovery and permanent publication.

The successful recovery path completed later through:

```text
simcore-v0.64.8-intent-02
→ simcore-v0.64.8-new-02
→ approval PR #636
→ Permanent Release run 33086543601 SUCCESS
→ release-simcore f5e29464452728f859a1a6a8191a846468353531
→ LIVE_PENDING state dbaa095df47b0293a39283c9664fefa1feafd756
```

## Impact

```text
runtime = NONE
production safety = NONE
release authority = NONE
incident-state accuracy = TEMPORARILY OVERSTATED CLOSURE
```

The defect was fixed, but the release incident was still in recovery.

## Recommended rule

For future release blockers, either:

```text
A. separate a DEFECT issue from a RELEASE INCIDENT issue
```

or:

```text
B. keep one issue but do not use Fixes/Closes until recovery + production reobservation is complete
```

An intermediate state may be recorded as:

```text
DEFECT_FIXED / RELEASE_RECOVERY_PENDING
```

but the release-blocker incident should not read fully closed while the blocked transaction remains unresolved.

## Boundary

This is Release System / administrative lifecycle feedback only.

Do not mix it with v0.64.8 runtime code, `release-simcore`, or the pending real-long-chat validation.
