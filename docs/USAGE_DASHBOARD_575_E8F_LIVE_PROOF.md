# Local Usage Dashboard 5.75 — E8-F Live Release Proof

Status: **COMPLETE — repository/CI/deployment closure proven; physical PocketRisu verification remains PENDING**

Recorded: `2026-08-25`

Authorities:
- E8 design: Issue #312
- 5.75 release tracking: Issue #340
- Release PR: #351
- E8 generation authority: `docs/USAGE_DASHBOARD_PR_LIFECYCLE_E8_EARLY_FAILURE_HARDENING.md`

## Final deployed release

```text
Product: 3.0.0-alpha.5.75
Engine: 1.6.22
Manager: 1.3.0
Contracts: 1 / 1
Engine SHA256: 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
Candidate SHA: 0dd0605baea5017b17a9fb4effd8da028f132422
Main merge SHA: 3d4a32bfee6a2d15a2de593f713f8c5bcf4ebd3f
Production branch SHA: ffa3dae31bad70ca68059fbc085d63b9a2d862ca
Exact-byte parity: VERIFIED
Physical verification: PENDING
```

The product change consolidates request-provenance analytics wrapper ownership into module 16, removes the superseded module 18 source owner, and reduces the plugin source registry from 28 to 27 modules. Engine 1.6.22, Manager 1.3.0 and contracts 1/1 remain unchanged.

## Negative operational evidence retained

### 1. Connected issue-open activation did not initially converge

PR #341 added an owner-authored exact stage-request issue path while preserving the existing owner-only control path and release-ref authority.

Live request #342 was created successfully but the first `issues.opened` path produced no stage receipt and no candidate ref. This was retained as negative evidence instead of being treated as success.

### 2. Trusted-main self-heal repaired activation

PR #344 added a trusted-main stage-request consumer. Request #342 was consumed and dispatched by trusted-main control-plane code. No connected control surface directly created or advanced candidate or production refs.

### 3. First real 5.75 stage failed closed before candidate mutation

Trusted stage run `32819797377` failed before `write_candidate` with:

```text
E7_SOURCE_PATCH_PATH_DRIFT:plugins/usage-dashboard/src/18-request-provenance-analytics.part.js
```

Root cause: source-intent discovery omitted legitimate deleted paths. Production remained 5.74 and no 5.75 candidate ref was created.

### 4. Delete-intent repair

PR #345 changed source-intent discovery to include deleted paths and added a real Git fixture proving deleted plugin-source paths remain part of frozen source intent. Its full registry validation reached `TEST_REGISTRY_GREEN:82` and SimCore Verify/Required were GREEN before exact-head squash merge.

### 5. Release-memory and registry debts were exposed fail-closed

Subsequent same-source retries exposed and repaired four additional release debts without mutating production:

- P38 carried a stale current-release 5.74 assertion; the final repair converted it to forward-lineage semantics for alpha.5 build 74 and later instead of fabricating the current version.
- Module 16's generated first boundary moved to `normalizeRequestProvenanceMetadata`, while `parts.cjs` still retained the old boundary marker; the registry marker was updated and P39 locked the consolidated boundary.
- P35 still read the deleted module 18 source owner; it was migrated to the new module 16 owner.
- One controller-authored PR-head update produced an `action_required` / no-job activation anomaly. The same exact candidate bytes were preserved and the PR was owner-reactivated; this remains diagnostic feedback rather than being hidden.

The final source head was:

```text
2fdacbf32b778e45035313a87b2bd14cf0dd259f
```

## Final candidate transaction

Owner stage request #353 triggered trusted stage run `32822143820`.

The stage completed successfully:

```text
resolve_stage: GREEN
materialize_stage: GREEN
write_candidate: GREEN
candidate: stage/usage-dashboard-3.0.0-alpha.5.75
candidate SHA: 0dd0605baea5017b17a9fb4effd8da028f132422
candidate tree: e130b941e297028f18d0ec1240eeb259aab64f20
```

Issue #353 was closed after direct stage success so the scheduled self-healer would not create an unnecessary duplicate stage commit.

Exactly one deterministic release PR was reused:

```text
PR #351
head: stage/usage-dashboard-3.0.0-alpha.5.75
base: main
head SHA: 0dd0605baea5017b17a9fb4effd8da028f132422
```

## Authoritative exact-SHA validation

Owner-bound exact validation run:

```text
32822385385
```

proved identity first and then ran the complete registered Usage Dashboard regression against the exact candidate SHA.

Final authoritative evidence:

```text
P35 Cross-Scope Request Provenance: OK
P38 Diagnostics Mode Handler Ownership: OK
P39 Provenance Analytics Wrapper Consolidation: OK
TEST_REGISTRY_GREEN:83
validated 3.0.0-alpha.5.75 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1
Engine source parity: OK · sha256 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
```

Defense-in-depth PR CI for the final candidate was also GREEN:

```text
Usage Dashboard Candidate Validation: GREEN
Plugin Control Plane CI: GREEN
SimCore Verify: GREEN
SimCore Required: GREEN
```

## Exact-head merge

Before merge, PR #351 was re-read and remained:

```text
open
mergeable
head SHA == validated SHA == 0dd0605baea5017b17a9fb4effd8da028f132422
```

The PR was squash-merged with `expected_head_sha` set to that exact candidate SHA.

Main merge:

```text
3d4a32bfee6a2d15a2de593f713f8c5bcf4ebd3f
```

The main tree equals the validated candidate tree:

```text
e130b941e297028f18d0ec1240eeb259aab64f20
```

## Monotonic exact-byte production promotion

Automatic promotion run:

```text
32822577653
```

completed GREEN with:

```text
classify: GREEN
promote / promote: GREEN
release-receipt: GREEN
```

The promoter copied exact tested Git blobs to `release-usage-dashboard`; it did not rebuild production.

Production commit:

```text
ffa3dae31bad70ca68059fbc085d63b9a2d862ca
release: promote Local Usage Dashboard 3.0.0-alpha.5.75 exact artifacts
```

The release receipt independently rechecked production parity and emitted:

```text
E7_RELEASE_RECEIPT_POSTED:3.0.0-alpha.5.75:3d4a32bfee6a2d15a2de593f713f8c5bcf4ebd3f:ffa3dae31bad70ca68059fbc085d63b9a2d862ca
exact_byte_parity: VERIFIED
physical_verification: PENDING
```

## E8-F acceptance verdict

The complete real-release lineage is proven:

```text
source intent
→ early fail-closed release-memory checks
→ trusted stage
→ controller-owned candidate
→ one deterministic PR
→ exact-SHA full registry GREEN
→ exact-head squash merge
→ main materialization
→ monotonic exact-byte production promotion
→ deployment receipt
→ production 3.0.0-alpha.5.75
```

Therefore E8-F repository/CI/deployment acceptance is **COMPLETE**.

The remaining boundary is intentionally outside repository closure:

```text
PocketRisu + update
→ actual-device acceptance
```

No physical-device result is inferred or fabricated. Until that evidence is supplied, physical verification remains **PENDING**.

## Feedback carried forward

The 5.75 real release confirmed that fail-closed release-memory and exact-SHA gates catch real drift before production. It also exposed one remaining coordination smell: a controller-authored candidate head update can still occasionally fail to activate ordinary PR CI and require owner reactivation. Exact-SHA authoritative validation remained usable and production safety was not weakened, but the activation anomaly should be treated as the next diagnostic/design input rather than rewritten as a clean success.
