# SimCore Release-System Continuous Feedback Loop

Date: 2026-08-28 KST
Status: **ACTIVE OPERATING POLICY · NON-RUNTIME**
Scope: SimCore release-system evolution across future runtime releases
Current system at policy creation: `R2.4 — Preflight Compression` design active

## 1. Purpose

The release system itself is not versioned for its own sake.

SimCore will evolve the release system only from observed use during real product updates.

Canonical operating loop:

```text
USE CURRENT RELEASE SYSTEM
→ SHIP A REAL SIMCORE UPDATE
→ OBSERVE THE SYSTEM IN PRACTICE
→ RECORD FEEDBACK FROM DURABLE EVIDENCE
→ CLASSIFY THE SYSTEM VERDICT
→ KEEP, STABILIZE, OR UPDATE
→ USE THE RESULTING SYSTEM ON THE NEXT REAL UPDATE
→ REPEAT
```

The default outcome is **KEEP**, not a mandatory new release-system version.

## 2. Decision classes

After each real SimCore update, evaluate the active release system using durable evidence and choose exactly one primary disposition:

### KEEP

Use when the current system preserved safety, simplicity, authority boundaries, and acceptable operating cost.

Effects:
- keep the current release-system version;
- record feedback if useful;
- do not create a successor system merely because another runtime release occurred.

### STABILIZE

Use when the architecture remains sound but a bounded FIX can reduce risk, ambiguity, or recovery cost without changing the authority model.

Preferred examples:
- move a proven failure earlier into an existing verification lane;
- replace brittle test assumptions with semantic checks;
- remove duplicated current-state authority;
- clarify lifecycle wording;
- reduce recovery PR tax without adding new release stages.

Effects:
- preserve the current engine;
- design the smallest compatible system increment only when evidence justifies it;
- prefer strengthening an existing gate over adding a new gate.

### UPDATE

Use only when durable evidence proves that the current release-system architecture itself is insufficient or unsafe and cannot be repaired by bounded stabilization.

Effects:
- design a successor architecture from the evidence;
- explicitly preserve every still-valid safety invariant;
- treat added authority, actors, PRs, polling, or lifecycle states as exceptional costs requiring proof.

## 3. Evaluation dimensions

Every feedback pass should consider at least:

```text
SAFETY
SIMPLICITY
AUTOMATION QUALITY
RECOVERY COST
AUTHORITY INTEGRITY
STATE / DOCUMENT CONVERGENCE
TERMINAL CLOSURE INTEGRITY
USER MANUAL OPERATIONS
OBSERVABILITY
```

Findings continue to use evidence-first classification such as:

```text
WATCH
DEFER
FIX
BLOCKER
```

and tags such as:

```text
NON_RUNTIME
NON_BLOCKING
DOC_DRIFT
OBSERVABILITY
RELEASE_AUTHORING
INCIDENT_LIFECYCLE
```

A finding does not automatically authorize implementation. It becomes design input first, then follows the normal release-system change flow.

## 4. Automation rule

Automation is favored when it reduces repeated human work or detects mistakes earlier, but automation must not silently acquire new release authority.

Canonical principle:

```text
AUTOMATE EARLY CHECKING
AUTOMATE REPETITIVE EVIDENCE HANDLING
DO NOT AUTOMATE NEW AUTHORITY WITHOUT PROOF
```

Preferred automation:
- fail earlier in existing CI;
- derive machine-known identity from existing durable evidence;
- reduce duplicated manual bookkeeping;
- reuse exact immutable candidates;
- produce bounded diagnostic evidence.

Disfavored automation unless independently proven necessary:
- a second publisher;
- an issue-closing authority;
- polling merely to compensate for connector/UI observation noise;
- automatic human LIVE_PASS substitution;
- extra clean-path PRs or approval gates;
- background retry loops that expand race or lifecycle surfaces.

## 5. Stability and simplicity invariants

Unless fresh evidence explicitly requires change, preserve:

```text
one production publisher
exact immutable candidate identity
fast-forward-only production publication
latest.js == install.js
append-only recovery evidence
human real-world LIVE_PASS requirement
single current-production authority
release blocker closure integrity
clean release work-item terminal integrity
```

Operating cost targets remain:

```text
2 PRs → LIVE_PENDING
3 PRs → terminal closure when HUMAN_EVIDENCE / PR3 is required
0 user manual pre-live GitHub operations
```

A successor system should not increase these costs merely to improve administrative neatness.

## 6. Per-release feedback procedure

For each real runtime release:

1. Observe the full release transaction, including PR1, candidate materialization, exact approval, permanent publication, state convergence, recovery attempts if any, and HUMAN_EVIDENCE / PR3 when reached.
2. Compare observed behavior against the active system's frozen invariants and cost targets.
3. Separate product/runtime findings from release-system findings.
4. Record only evidence-supported system feedback.
5. Classify each finding as WATCH / DEFER / FIX / BLOCKER.
6. Decide the system-level disposition: KEEP / STABILIZE / UPDATE.
7. If KEEP, continue using the same system version on the next update.
8. If STABILIZE or UPDATE, design from the observed evidence while preserving valid existing invariants.
9. Implement only the authorized bounded change, qualify it through permanent CI, and use it on a later real update.
10. Repeat the loop.

## 7. Evidence authority

Prefer durable evidence over transient UI observations.

Typical authority order remains:

```text
candidate receipt / machine release record
→ exact candidate / parent / blob identity
→ permanent release result
→ release-simcore production identity
→ main machine state
→ workflow / connector observation
→ labels and convenience metadata
```

Historical evidence is preserved. Current mutable status may be updated, but prior failed attempts, receipts, incidents, and live evidence are not rewritten merely to make the latest state look cleaner.

## 8. Relationship to R2.4

R2.4 is the current next stabilization design and is itself subject to this loop.

Expected sequence:

```text
implement/use R2.4 on real SimCore updates
→ collect operational evidence
→ evaluate R2.4
→ KEEP if healthy
→ otherwise derive the smallest evidence-backed stabilization/update
```

No R2.5 or later version is mandatory after a runtime release.

## 9. Standing verdict

```text
RELEASE-SYSTEM EVOLUTION MODEL = CONTINUOUS EVIDENCE-DRIVEN FEEDBACK LOOP
DEFAULT SYSTEM DISPOSITION = KEEP
SYSTEM VERSION BUMP = EVIDENCE-DRIVEN, NOT CADENCE-DRIVEN
SAFETY PRIORITY = FIRST
SIMPLICITY PRIORITY = PRESERVE
AUTOMATION PRIORITY = EARLY CHECKING + REPETITIVE WORK REDUCTION
NEW AUTHORITY = REQUIRES SEPARATE PROOF
RUNTIME MUTATION FROM THIS POLICY = NONE
RELEASE-SIMCORE MUTATION FROM THIS POLICY = NONE
```
