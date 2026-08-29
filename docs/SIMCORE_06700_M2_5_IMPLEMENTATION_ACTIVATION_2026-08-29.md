# SimCore v0.67.0 M2-5 implementation activation

Date: 2026-08-29

Status: **IMPLEMENTATION AUTHORIZED · RECOVERY TRANSITION DEBT RETIREMENT ONLY · FRESH RUNTIME WORK BRANCH REQUIRED · PRODUCTION v0.66.0 UNCHANGED**

Planned release:

```text
Version: 0.67.0
Checkpoint: M2-5
Release: Recovery Transition Debt Retirement
```

Production parent:

```text
v0.66.0 — M2-4 Session / Runtime Mirror Boundary Completion
release-simcore commit 4b6ae1a4c63f6be658c6163168cc46a1adef60aa
latest/install blob f0da13d4c47fd98e9065d7dbf253a3296151ee16
validation LIVE_PASS
checkpoint M2-4
```

Frozen design authority:

`docs/SIMCORE_06700_M2_5_RECOVERY_TRANSITION_DEBT_RETIREMENT_DESIGN_2026-08-29.md`

This activation supersedes that design document's initial implementation-blocked status line. Its runtime scope and stop conditions remain frozen.

## 1. Preconditions closed

The design required both:

```text
post-v0.66 architecture-authority convergence
+
exact v0.66 production source re-audit
```

Both are now satisfied.

Architecture convergence:

```text
PR #806
head 9910153de2807d32488fea707e30e67cbec65b0f
merge ff7f696aec71e64e00de893688889421927552d8
SimCore Architecture Contracts = SUCCESS
SimCore CI Verify = SUCCESS
SimCore CI Required = SUCCESS
```

Evidence:

`docs/SIMCORE_POST_06600_ARCH_CONTRACT_CONVERGENCE_EVIDENCE_2026-08-29.md`

The machine and human Contracts v2 authorities now describe exact v0.66 LIVE_PASS / M2-4 ownership rather than pre-publication M2-4 state.

## 2. Exact production Recovery gate

Exact production identity remains byte-stable:

```text
latest.js blob  f0da13d4c47fd98e9065d7dbf253a3296151ee16
install.js blob f0da13d4c47fd98e9065d7dbf253a3296151ee16
size 563040 / 563040
```

Production audit confirms:

```text
Recovery physical module       PRESENT
Recovery own policy/state/I/O  NONE
Recovery delegates             output-compat + bootstrap-migration
require('./recovery') consumer 0
live recovery.* consumer       0 supported by import/call audit
Session runtime Recovery route ABSENT
Edit Reconcile Recovery route  ABSENT
```

The production module contract itself describes Recovery as a deprecated compatibility facade with zero runtime callers.

Repository search did not surface a permanent runtime test as an intentional direct Recovery consumer. Historical builders/evidence that mention or validate Recovery remain provenance and must not be rewritten merely because the production facade is retired in v0.67.

## 3. Authorization decision

```text
06700_IMPLEMENTATION_AUTHORIZED
= YES
```

Authorized runtime mutation is narrow:

```text
exact v0.66 production source
→ bump declared/runtime/host identity to 0.67.0
→ remove the physical SimCore.define("recovery", ...) forwarding facade
→ remove/update current architecture contract declaration for Recovery in the v0.67 candidate
→ remove only transition metadata made stale by that exact deletion
→ preserve all physical-owner behavior byte/decision-equivalent
```

Do not opportunistically delete historical docs/builders/fixtures merely because they mention Recovery.

## 4. Frozen non-goals

Not authorized in this work item:

```text
PARTIAL_PREVIOUS_TURN_REPLAY repair
COMMUNITY platform diversity repair
genuine-edit latency optimization
B_START wording heuristic repair
Kernel dependency inversion cleanup
State module creation
Turn/Request Pipeline extraction
runtime-topology fingerprint dedupe
provider-cache engineering
release-system R2.x changes
new schema/network/timer behavior
```

Those remain separate WATCH/DEFER/investigation tracks.

## 5. Work-branch implementation contract

Implementation must begin on a fresh runtime work branch based on current `main`, while runtime materialization itself uses exact current `release-simcore` v0.66 production as the source parent.

Required static proof before any publication:

```text
metadata version == SIMCORE_RUNTIME_VERSION == HOST_COMPAT_VERSION == 0.67.0
latest.js == install.js byte-for-byte
node syntax PASS
Recovery module definition absent
require('./recovery') absent
runtime recovery.* calls absent
output-compat physical owner present
bootstrap-migration physical owner present
output-finalize physical owner present
Session/Edit direct-owner graph preserved
architecture contract PASS
no persistent schema/key delta
no network/polling/timer expansion
```

Required differential proof must retain all current owner behavior, including:

```text
ordinary Output Compat prepare/canonicalization
THOUGHTS compatibility families
boundary/safe-envelope candidate behavior
history bootstrap
legacy clock/state repair
legacy contamination repair
ordinary SAME_FAST
representation fast reconcile
genuine-edit USER_EDIT_CANDIDATE -> MANUAL_EDIT_REBUILT
Deferred Mirror one-Fresh-read and strict guards
```

## 6. Release workflow remains mandatory

Authorization does not equal publication.

Required order:

```text
repo design/evidence       DONE
precondition convergence   DONE
implementation activation  DONE
fresh work branch          NEXT
static/permanent CI
release-simcore publication
real long-chat validation
main terminal docs/state synchronization
```

No release-simcore mutation is performed by this activation document.

## 7. Stop conditions

Stop implementation advancement and preserve evidence if any of these appear:

```text
an actual runtime Recovery consumer is discovered
permanent test proves Recovery is an intentional required public seam
removing facade changes Output Compat or Bootstrap behavior
architecture dependency cycle/undeclared edge appears
legacy compatibility fixture changes semantically
latest/install diverge
persistent schema/key changes
new host/network/timer surface appears
unrelated WATCH repair becomes necessary to make M2-5 tests pass
```

If a stop condition fires, do not restore a mixed catch-all facade under another name. Re-open the ownership decision with source-backed evidence.

## 8. Current verdict

```text
POST_06600_ARCH_CONTRACT_DRIFT
= CLOSED / FIXED

V066_RECOVERY_ZERO_CONSUMER_PRECONDITION
= SATISFIED

06700_DESIGN
= FROZEN

06700_IMPLEMENTATION_AUTHORIZED
= YES

06700_IMPLEMENTED
= NO

PRODUCTION
= v0.66.0 LIVE_PASS UNCHANGED
```
