# SimCore v0.70.11 Operator Release Card Metadata Repair Design — 2026-09-06

Date: 2026-09-06 KST
Status: **DESIGN READY · #1657 ONLY · RUNTIME-SOURCE MINI RELEASE**
Tracking: `#1657`, `#1677`

## 1. Problem

Current production ships `OPERATOR_RELEASE_CARD` with a split identity:

```text
version/name = current production release
scenario/summary/checks = historical v0.69.0 State Reconcile / Kernel Inversion release
```

This can present correct plugin identity while instructing the operator to validate an unrelated historical release.

Classification:

```text
FIX · PRODUCTION OPERATOR UI METADATA · NON-HOTPATH
```

There is no current evidence that request/output diagnostic correctness is affected, but operator guidance is stale and product advancement must remain held until repaired or evidence-reclassified.

## 2. Source root cause

The full operator-card body was introduced by:

`products/simcore/tooling/build-06900-state-reconcile-kernel-inversion.py`

That builder authored all card fields:

```text
version
name
scenario
validation
summary[]
checks[]
```

Later release builders inherited that card but generally changed only `version` and `name` while preserving scenario/summary/checks. The current attribution builder still validates/replaces only those two identity fields before applying its own unrelated runtime patch.

Therefore:

```text
ROOT_CAUSE = RELEASE_BUILDER_CARD_BODY_CARRYOVER_GAP
ONE_OFF_MANUAL_CORRUPTION = NOT SUPPORTED
```

## 3. Release scope

Proposed repair release:

```text
Version: 0.70.11
Release: Operator Release Card Metadata Repair
Live scenario: 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
Checkpoint: 2.0M / M2 / M2-6 unchanged
```

Single target:

```text
#1657 stale operator release card metadata
```

Explicitly excluded:

```text
#1660 visible standalone internal: alias repair
#1588 Host-local latency optimization
provider-cache work
runtime architecture refactor
release-system refactor
storage/network/timer/persistent-schema changes
```

## 4. Implementation contract

The implementation must replace the **whole release card**, not merely version/name.

Required card identity:

```text
version = 0.70.11
name = Operator Release Card Metadata Repair
scenario = 07011_OPERATOR_RELEASE_CARD_METADATA_REPAIR_REAL_LONG_CHAT
validation = PENDING_REAL_LONG_CHAT
```

Summary must describe only this repair:

```text
- replaces stale historical operator release-card scenario/summary/checks with release-local metadata
- adds regression coverage so card fields cannot silently drift across release families
- preserves runtime request/output/storage/network/timer/schema behavior
```

Required live checks:

1. **Operator card identity**
   - open the SimCore update/operator release card after installing the new version;
   - confirm the displayed version/name belong to this repair release;
   - confirm no v0.69 State Reconcile / Kernel Inversion scenario, summary, or instruction remains.
2. **Ordinary long-chat control**
   - run one natural ordinary turn;
   - copy Last Turn Diagnostic;
   - confirm stable request/output/binding/mirror/hook behavior with no visible output regression.
3. **Scope control**
   - confirm no new storage/network/timer/schema behavior and no #1660 repair is claimed by this release.

## 5. Regression contract

Add deterministic regression coverage that validates the operator card as one release-local unit.

Minimum assertions:

```text
card.version == expected release version
card.name == expected release name
card.scenario == release-spec liveGate.scenario
card.summary contains release-local repair wording
card.checks contain release-local validation wording
card does not contain historical 06900 scenario
card does not contain State Reconcile / Kernel Inversion release instructions
```

The regression must prevent a future builder from passing by updating only version/name while silently retaining unrelated card-body metadata.

Do not create a new mutable current-state database. The release spec remains the release-specific machine-readable owner of the live-gate scenario; the regression checks parity against it.

## 6. Runtime invariants

This is metadata-only inside the shipped plugin source. Preserve:

```text
request hook behavior
output hook behavior
Core handshake
Session / Mirror / Representation / Edit Reconcile semantics
telemetry checkpoint ordering
Host-local attribution behavior
persistent state schemas
mailbox semantics
retry/polling behavior
timer/network behavior
provider-cache policy
```

Protected side-effect counts must remain unchanged.

## 7. Build/release shape

Implementation should use a dedicated builder/spec pair for the mini release and preserve the standard release path:

```text
design/evidence on main
→ work branch implementation
→ static + SimCore CI
→ release-simcore publication
→ real operator-card + ordinary long-chat validation
→ main documentation/continuity synchronization
```

`plugins/simcore/latest.js` and `plugins/simcore/install.js` must be byte-identical at candidate and production.

## 8. Acceptance

Static / CI:

```text
syntax PASS
latest == install PASS
existing architecture/contracts PASS
protected side-effect counts unchanged
new operator-card release-local regression PASS
release-spec contract PASS
```

Production readback:

```text
release-simcore version = 0.70.11
latest/install same blob
operator card no longer contains v0.69 release guidance
```

Live acceptance:

```text
operator release card = correct release-local identity and checks
one ordinary natural long-chat turn = stable
no visible runtime regression
```

Only after live acceptance may #1657 close and the separate #1660 repair lane begin.
