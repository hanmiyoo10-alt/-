# SimCore Release System v2 — RS2-3 Project-Authority Closure Amendment

Date: 2026-08-24
Status: **DESIGN FROZEN · CLOSURE AMENDMENT · NON-RUNTIME**
Phase: `RS2-3 — Permanent CI`
Supersedes only the platform-enforcement prerequisite of the original RS2-3 P4/P5 close contract.

## 1. Decision

RS2-3 closes under an amended enforcement model because repository-level branch-protection / ruleset mutation is not available through the current operational tool surface.

The unavailable platform control is not silently treated as present.

Instead, SimCore defines its own project-authorized write boundary:

```text
PROJECT_AUTHORITY_GATEWAY
```

A write is considered an authorized SimCore state/release write only when it passes the project-owned gateway appropriate to that authority surface.

The platform-level branch-protection gap remains recorded as a residual administrative DEFER.

## 2. Why replacement is valid

The permanent CI itself is already available and shadow-verified.

The shared main-write coordinator already supports protected mode:

```text
replay bounded payload on latest main
→ materialize exact candidate commit
→ stage exact candidate on temporary ref
→ dispatch permanent SimCore CI
→ require exact Required job PASS for that candidate SHA
→ re-fetch main
→ reject/retry if main moved
→ ordinary fast-forward main update only
```

Existing deterministic coordination tests already cover:

```text
exact candidate accepted only with Required PASS
wrong candidate not accepted
missing Required job fails
failed Required job fails
content conflict fails
path allowlist violation fails
main race retries
no force / force-with-lease path
```

The active SimCore release-state writer invokes this protected gateway with:

```text
--required-workflow simcore-ci.yml
--required-profile MAIN_HEALTH
--required-job Required
--staging-prefix simcore-main-write-gate
```

Therefore automated SimCore main-state writes no longer depend on repository branch protection for their own required-check enforcement.

## 3. Authority scopes

This amendment separates three scopes.

### 3.1 Platform governance

```text
GitHub main branch protection / ruleset Required enforcement
status = UNAVAILABLE / NOT VERIFIED
```

This remains desirable hardening, but is not claimed.

### 3.2 SimCore main-state authority

```text
status = PROJECT_GATEWAY_ENFORCED
```

Current active state writer must use `repo-main-write.py` protected mode and exact `SimCore CI / Required` success before main update.

### 3.3 SimCore production release authority

```text
status = RESERVED_FOR_RS2_4E
```

`release-simcore` production publication remains disabled until RS2-4E proves that exact `(C,P)` `CANDIDATE_REQUIRED` success is non-bypassable before every production write.

RS2-3 closure does not itself activate production publication.

## 4. Manual owner bypass residual risk

Because GitHub branch protection is not active, a repository owner could still manually merge or push around the project gateway.

That path is explicitly outside authorized SimCore release/state operation.

If such a bypass occurs on SimCore-authoritative paths, classify it immediately as:

```text
FIX / GOVERNANCE_BYPASS / AUTHORITY_VIOLATION
```

and require fresh permanent CI plus state reconciliation before normal operation continues.

This residual capability is recorded honestly rather than pretending the platform blocks it.

## 5. Amended closure claims

RS2-3 may now claim:

```text
PERMANENT_CI_AVAILABLE = YES
PERMANENT_CI_SHADOW_VERIFIED = YES
PROJECT_AUTHORITY_GATEWAY_ACTIVE = YES
PROJECT_AUTHORITY_GATEWAY_VERIFIED = YES
RS2_3_CLOSED = YES
RS2_4_ENTRY_AUTHORIZED = YES
```

while these platform-specific claims remain false:

```text
REQUIRED_CI_ACTIVE = NO
REQUIRED_CI_ENFORCEMENT_VERIFIED = NO
PLATFORM_BRANCH_PROTECTION_VERIFIED = NO
```

This is an amended closure, not a retroactive claim that the original platform P4/P5 path succeeded.

## 6. Residual DEFER

```text
REQUIRED_CI_ENFORCEMENT_ADMIN_CAPABILITY_GAP
= DEFER / ADMIN_GOVERNANCE / NON_RUNTIME / RESIDUAL
```

It is no longer an RS2-3 phase blocker under this amendment.

If branch-protection/ruleset control becomes available later:

```text
configure SimCore CI / Required
→ verify platform enforcement
→ record supplemental governance hardening evidence
```

Historical amended-closure evidence must remain intact.

## 7. Legacy physical cleanup

Existing legacy verification workflows may remain physically present while mapped as non-authoritative / compatibility evidence.

Physical cleanup must not be confused with authority.

Where release/state responsibilities are still needed as fallback during RS2-4 qualification, retirement remains deferred until the permanent release path reaches its own cutover gate.

## 8. RS2-4 handoff

With this amendment:

```text
RS2-3 CLOSED_AMENDED
→ RS2-4 entry authorized
→ continue RS2-4E controller-level E-A1..E-A6 qualification
→ repair current administrative state drift
→ positive/negative/rollback qualification
→ REAL_RELEASE_READY
```

The next genuine SimCore product release remains the first real production qualification of R.

## 9. Non-runtime boundary

This closure amendment changes no SimCore runtime behavior and performs no `release-simcore` publication.

```text
runtimeMutation = NONE
releaseSimcoreMutation = NONE
```
