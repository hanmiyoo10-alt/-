# Local Usage Dashboard — E7 Config-Free Release Orchestration

Status: **IMPLEMENTED — E7-A/B/C/D merged; E7-E real-release proof executed on 5.75, with one residual PR-CI activation anomaly carried forward**

Recorded: `2026-08-25`

Design: Issue `#261`.
5.73 release-system retrospective: Issue `#259`.
PR-bootstrap/event-trust follow-up: Issue `#254`.
Implementation PR: `#263`.
Implementation merge SHA: `65a62b03288546ba1196271dd619499e8ff8b9ed`.
First real E7 feature-release proof: Local Usage Dashboard `3.0.0-alpha.5.75`, PR `#351`.
5.75 live proof: `docs/USAGE_DASHBOARD_575_E8F_LIVE_PROOF.md`.

## Latest-generation rule

E7 is the cohesive release-orchestration baseline inherited by later Usage Dashboard hardening work.

It does not mean E1–E6 were deleted. Operationally:

```text
E7
=
all previously proven E1–E6 contracts that remain valid
+
E7 PR/bootstrap/validation simplification
```

Later E8 hardening adds earlier failure detection and stage-request recovery without weakening E7's exact-SHA or exact-byte authorities.

---

# 1. Inherited from E1–E6 — unchanged

## Source / derived-candidate authority

- Source branches remain under `release/usage-dashboard-*`.
- Source branches remain source-of-intent only.
- Hand-authored generated output remains denied on source branches.
- Materialized candidates remain controller-owned under `stage/usage-dashboard-<product-version>`.
- Every stage freezes exact trusted-main and exact source SHA authority.
- Candidate trees are freshly reconstructed from trusted base + current source intent.
- Prior generated candidate bytes never become source authority.

## Reentrant repair

The normal release-stage operation remains one reentrant stage transaction. Ordinary repair is:

```text
source fix
→ same stage path
→ same derived candidate branch advances
→ same release PR is reused
```

No replacement `-v2/-v3` candidate branch or replacement PR is required for ordinary repair.

## Privilege separation

- Candidate/materializer/test code receives no repository write credential.
- Read-only materialization is isolated from repository write authority.
- The derived candidate writer executes trusted control-plane code only.
- The writer does not execute candidate materializers, behavior tests or the full registry.
- Candidate writes remain exact digest/path/mode/parent checked.
- Candidate ref mutation remains CAS-guarded, fast-forward-only and postverified.
- Force push remains forbidden.

## Test authority

- Stage smoke remains pre-PR protection only.
- The complete registered Usage Dashboard regression remains authoritative.
- Regression registration remains fail-closed.
- Engine/plugin behavior contracts, UNKNOWN semantics, privacy, cache/CLI/scheduler behavior and product data fidelity remain protected.

## Merge authority

GREEN alone never authorizes a blind merge.

Before merge:

```text
current PR head is re-read
+ validation identity is checked
+ mergeability is re-read
+ expected head SHA is supplied to squash merge
```

## Production promotion

The strongest release boundary remains:

```text
merged main candidate
→ release/maintenance classifier
→ monotonic guard
→ exact-byte promotion
→ release-usage-dashboard
```

Production is never rebuilt during promotion.

## Receipts and repository closure

- Deployment receipts remain automatic for real product releases.
- Product / Engine / Manager / contracts, merge SHA, production SHA, Engine hash and exact-byte parity remain recorded.
- Repository/CI/deployment closure remains separate from PocketRisu physical verification.
- Physical verification remains explicitly `PENDING` until actual-device evidence exists.

---

# 2. E7-A — `stage` succeeds at `CANDIDATE_READY`

E7 separated a valid candidate transaction from PR-bootstrap success.

The stage terminal boundary is:

```text
SOURCE
→ release-generic preflight
→ read-only materialization
→ constrained derived-candidate write
→ exact ref postverify
→ UD_CANDIDATE_READY
```

`UD_CANDIDATE_READY` is a successful stage terminal state. PR bootstrap or validation activation failure does not invalidate already-verified candidate bytes.

---

# 3. E7-B — deterministic PR orchestration outside the Actions-token critical path

After `CANDIDATE_READY`, the assistant's authorized connected GitHub control surface owns deterministic PR ensure:

```text
head = stage/usage-dashboard-<product-version>
base = main
```

The assistant must:

1. search for the exact deterministic release PR;
2. create it when zero matches exist;
3. reuse it when exactly one match exists;
4. fail closed when multiple matching open PRs exist;
5. never alter candidate bytes merely to create or reuse the PR.

The 5.75 release reused exactly one deterministic PR, `#351`, throughout same-branch repair.

---

# 4. E7-C — exact-SHA authoritative validation

The authoritative controller binds an open deterministic release PR to an exact candidate SHA and verifies:

```text
PR is open
PR base == main
PR head repo == this repository
PR head branch matches deterministic stage namespace
PR head SHA == requested candidate SHA
remote candidate branch SHA == requested candidate SHA
```

Only then does it run the complete reusable Usage Dashboard validator at that exact SHA.

The acceptance invariant is:

```text
VALIDATED_SHA == CURRENT_PR_HEAD_SHA == CANDIDATE_READY_SHA
```

A mismatch fails closed.

For 5.75, final authoritative validation run `32822385385` bound PR `#351` to:

```text
0dd0605baea5017b17a9fb4effd8da028f132422
```

and completed with:

```text
P35 Cross-Scope Request Provenance: OK
P38 Diagnostics Mode Handler Ownership: OK
P39 Provenance Analytics Wrapper Consolidation: OK
TEST_REGISTRY_GREEN:83
validated 3.0.0-alpha.5.75 / Engine 1.6.22 / Manager 1.3.0 / contracts 1/1
```

---

# 5. E7-D — release-generic preflight

E7 added a narrow fail-closed preflight before expensive release materialization and full integration validation.

Protected stale-current-release assertions fail early. Legitimate historical locks remain possible only when explicitly annotated; the preflight does not rewrite tests, infer intended versions or fabricate current values.

The 5.75 real release proved this boundary was useful: stale release-memory debt was rejected before production and repaired in source intent rather than silently normalized.

Later E8 hardening expands this early-failure philosophy while retaining E7 authority boundaries.

---

# 6. Current normal flow

The current cohesive flow is:

```text
assistant implements source/tests/spec/materializer
→ trusted stage request
→ release-generic / E8 early preflight
→ trusted materialization
→ derived candidate CAS write
→ CANDIDATE_READY
→ assistant ensures one deterministic PR through connected GitHub control surface
→ assistant activates full validator for exact candidate SHA
```

If full validation is RED:

```text
fix source only
→ same stage path
→ same candidate branch advances
→ same PR reused
→ exact-SHA full validation for the new candidate head
```

If GREEN:

```text
re-read PR head
→ require PR_HEAD_SHA == VALIDATED_SHA
→ re-read mergeability
→ exact-head squash merge
→ classifier / monotonic guard
→ exact-byte production promotion
→ deployment receipt
→ repository documentation closure
→ user only PocketRisu + physical verification when product bytes changed
```

---

# 7. E7-E — 5.75 real feature-release proof result

E7-E was deliberately deferred until a real feature release could exercise the whole orchestration chain. Local Usage Dashboard `3.0.0-alpha.5.75` provided that proof.

Final successful lineage:

```text
source branch: release/usage-dashboard-575-provenance-analytics-wrapper-consolidation
final source SHA: 2fdacbf32b778e45035313a87b2bd14cf0dd259f
candidate branch: stage/usage-dashboard-3.0.0-alpha.5.75
candidate SHA: 0dd0605baea5017b17a9fb4effd8da028f132422
PR: #351
exact validator: 32822385385 / TEST_REGISTRY_GREEN:83
main merge SHA: 3d4a32bfee6a2d15a2de593f713f8c5bcf4ebd3f
promotion run: 32822577653
production SHA: ffa3dae31bad70ca68059fbc085d63b9a2d862ca
exact-byte parity: VERIFIED
```

The real release proved:

- no Actions-token PR creation HTTP 403 was required on the normal path;
- ordinary repair reused the same deterministic candidate branch and PR;
- no user GitHub UI/settings action was required;
- the full authoritative registry remained mandatory;
- candidate / PR / validated SHA identity was exact before merge;
- exact-head squash merge used the validated SHA;
- production promotion remained monotonic and exact-byte with no rebuild;
- the deployment receipt independently verified production parity.

One original E7-E acceptance item was **not** cleanly satisfied: a controller-authored candidate head update produced an `action_required` / no-job ordinary PR-CI activation anomaly, and PR owner reactivation was used to restore the defense-in-depth PR CI lane. The exact-SHA authoritative validator remained usable and production safety was not weakened.

Therefore the E7-E real-release experiment is **EXECUTED and materially proven, but not declared perfectly clean**. The remaining PR-CI activation anomaly is retained as the next diagnostic/design input rather than rewritten as success.

The complete 5.75 release itself is closed under E8-F because all candidate, exact-validation, merge, monotonic promotion and deployment acceptance gates completed successfully. See `docs/USAGE_DASHBOARD_575_E8F_LIVE_PROOF.md`.

---

# 8. Current deployed and physical-verification boundary

Current deployed production is:

```text
Product: 3.0.0-alpha.5.75
Engine: 1.6.22
Manager: 1.3.0
Contracts: 1 / 1
release-usage-dashboard: ffa3dae31bad70ca68059fbc085d63b9a2d862ca
Engine SHA256: 85682703e8aeb345d20d9cb436231887fc7cc2050e850a61a54ac5298c5a2c69
```

Repository/CI/deployment closure is complete. Physical verification is a separate boundary and remains:

```text
PENDING
```

No PocketRisu result is inferred. The next user action is only the normal `+` update and actual-device acceptance when requested.

---

## Verdict

E7's core design is operationally proven by a real feature release: simplify coordination without removing validation, exact identity or production safety boundaries.

The 5.75 release also supplied useful negative evidence: event/PR-CI activation is still not perfectly deterministic. That residual issue belongs in the next design cycle; it does not invalidate the successfully deployed 5.75 exact-byte release.
