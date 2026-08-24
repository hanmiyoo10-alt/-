# SimCore v0.64.7 — Cross-Reload Cache Observer Continuity Implementation Evidence

Date: 2026-08-24
Status: **IMPLEMENTATION ACTIVE · PRE-CANDIDATE**
Parent production: `v0.64.6` / `47969d24771f6cc188df6e32150fc6fde519182d` / blob `34da01aa131f760b92d65d961a7843e9cc0d37d6`
Design authority: `docs/SIMCORE_06407_RELOAD_CACHE_CONTINUITY_ACTIVATION.md`

## 1. Frozen product scope

Runtime change is limited to `runtime-telemetry` transport and its outer-shell claim/publish/diagnostic call sites.

```text
globalThis memory handoff
→ memory-first + same-tab sessionStorage fallback
→ metadata only
→ 10 minute age bound unchanged
→ 16,384 character session serialization bound
```

Explicitly frozen:

```text
Core SnapshotStore schema
Session semantics
Prompt/generation semantics
Representation/Edit Reconcile
Recovery
Broadcast/Frame/Time
Evidence/Lineage/Handoff/Recurrence
Structure/COMMUNITY/Reaction
provider cache authority
request history
network/timers/pluginStorage
M2-3 ownership
```

Provider cache remains `UNVERIFIED`.

## 2. Permanent verification added before candidate creation

A required `reload-cache-continuity` permanent suite is added to `batch-a`.

The suite keeps v0.64.6 as the pre-candidate baseline control and executes the frozen v0.64.7 fixtures against the candidate under `CANDIDATE_REQUIRED`:

1. unchanged reload control
2. full reload match
3. retained-signature partial continuation
4. reload mismatch
5. stale capsule
6. malformed session capsule
7. disabled sessionStorage
8. provider-cache-header absent / UNVERIFIED
9. same-request memory-priority control
10. pre-reload in-memory control

Additional bound: session serialization over 16,384 characters must fall back to memory and leave no oversized session entry.

## 3. Candidate preparation boundary

R v2 is already `REAL_RELEASE_READY` and remains the only production release authority.

The current R surface intentionally begins from an immutable candidate C; it does not yet materialize source edits into C. For this first genuine R release, a v0.64.7 product-owned deterministic builder is used only to create the direct-child candidate:

```text
P = exact v0.64.6 production
→ deterministic v0.64.7 patch
→ latest.js == install.js
→ permanent batch-a candidate regression
→ direct child C of P
→ candidate transport ref only
```

The candidate-preparation job does **not** write `release-simcore` and does not become release authority.

Finding:

```text
R_CANDIDATE_MATERIALIZATION_REMAINS_PRODUCT_SPECIFIC
= WATCH / R_FEEDBACK / NON_RUNTIME / NON_BLOCKING
```

Do not refactor R during this runtime work item. Preserve this as first-real-release operational feedback and decide later whether repeated releases justify a generic candidate materializer.

## 4. Findings preserved during implementation

### ACCIDENTAL_MAIN_TOOLING_PROBE_FILE

Classification:

```text
FIX / TOOLING / NON_RUNTIME
```

A tool-surface check accidentally created root file `foo` on `main` in commit `af32e48c31015d6b02edc6a0f410265608ce80a3`.

It was immediately removed in commit `ca80c0e57bba1f6c688c61bff3e360a860485c93`.

Impact:

```text
runtime mutation: NONE
release-simcore mutation: NONE
production identity mutation: NONE
residual file: NONE
```

### PRODUCT_BUILDER_LEGACY_PATH_CLASSIFICATION

Classification:

```text
FIX / CI_CLASSIFICATION / NON_RUNTIME
```

The first builder path under `scripts/simcore-0*.py` would have entered the existing legacy-verification namespace. It was moved before PR validation to:

`products/simcore/tooling/build-06407-reload-cache-continuity.py`

The product build workflow is classified explicitly as `CI_SELF + HARNESS`, not legacy release authority.

### ACCIDENTAL_WORK_BRANCH_TEMP_FILE

Classification:

```text
FIX / TOOLING / WORK_BRANCH_ONLY
```

A pull-request tool-surface attempt accidentally created empty `docs/.tmp-no` only on the v0.64.7 work branch in commit `b21565e22a1b949d0ff702312bf600fdcf459378`.

It was immediately removed in commit `87a86e8112b9e7ec35cc16a63aedf94ec3e3ff67` before PR creation.

Impact:

```text
main mutation: NONE
runtime mutation: NONE
release-simcore mutation: NONE
residual file: NONE
```

## 5. Promotion gates

Before any real publication:

```text
main verifier/support PR Required PASS
candidate-prep PASS
C direct parent == P
candidate diff == latest.js + install.js only
latest == install
v0.64.7 source identity exact
batch-a including reload-cache-continuity PASS
R CANDIDATE_REQUIRED exact C/P PASS
immutable release spec authorized on main
permanent R caller only
```

After publication, R must set the new production to `PENDING_REAL_LONG_CHAT / LIVE_PENDING`.

`LIVE_PASS`, permanent authority cutover, legacy retirement and `RS2_4_CLOSED` remain forbidden until real long-chat evidence is supplied.
