# Local Usage Dashboard E21 — Evidence Consumer Convergence

Status: **DESIGN FROZEN / IMPLEMENTATION NOT STARTED**

Canonical issue: #1048  
Design branch: `design/usage-dashboard-e21-evidence-consumer-convergence`

## 1. Why E21 exists

E20 solved the right problem: it separated release evidence into two typed semantic roles — `acceptedBaseline` and `latestInstalled` — and composed that sub-contract under E19 without creating new release authority.

The first live forward use in Product `3.0.0-alpha.5.97` proved the structured contract works, but it also exposed two implementation gaps that should be removed before the next forward release:

1. generic/current consumers still knew the old representation and read `verifiedBaseline` directly, causing a sequence of one-by-one regression failures during 5.97 validation;
2. E20 says there are exactly two evidence roles, but the current validator does not reject unknown additional keys that could become shadow semantic owners.

A smaller ownership duplication also remains: E20 has its own `3.0.0-alpha.5.N` parser/comparator instead of reusing one release-version ordering authority.

E21 is intentionally narrow. It does not change release authority. It makes E20's successful model easier to consume and harder to accidentally bypass.

## 2. Fresh baseline

At design freeze:

- `main`: `51522eb1552cd6a3e8bb451051ddcc273e4a3e0c`
- production branch: `release-usage-dashboard`
- production SHA: `ef4686126addf26eac07b1d4c3e047e2dfacaaae`
- Product: `3.0.0-alpha.5.97`
- Engine: `1.6.33`
- Manager: `1.3.5`
- managed CLI: `1.10.0`
- managed Models: `1.251.0`
- contracts: `1 / 1`
- 5.97 exact-byte deployment: VERIFIED
- 5.97 physical acceptance: separate / pending at design time

This state is useful: deployed/latest-installed evidence and accepted physical baseline are allowed to differ. E21 must preserve that distinction rather than collapse it.

## 3. Design verdict

**E20 KEEP SEALED -> E21 CONVERGE CONSUMERS, CLOSE THE SHAPE, AND PROVE THE NEXT FORWARD SPEC BEFORE IT EXISTS.**

The target shape is:

`E19 outer schema -> E20 structured evidence validator -> one canonical evidence view -> all generic consumers`

with one shared release-version ordering authority underneath.

## 4. A — Canonical evidence view

Introduce one pure compatibility/view helper for release-evidence consumers.

Conceptual interface:

```js
resolveReleaseEvidenceView(spec, options) => Object.freeze({
  mode: 'structured' | 'legacy',
  acceptedBaseline: evidenceRoleOrNull,
  latestInstalled: evidenceRoleOrNull,
  display: Object.freeze({
    acceptedBaseline: string,
    latestInstalled: string | null,
  }),
})
```

### Structured spec

For a spec containing `releaseEvidence`:

- validate through the existing E20 contract;
- project `acceptedBaseline` only from `releaseEvidence.acceptedBaseline`;
- project `latestInstalled` only from `releaseEvidence.latestInstalled`;
- never read or synthesize legacy prose fields;
- preserve Product + exact release SHA + verdict identity.

### Historical legacy spec

For a historical spec without `releaseEvidence`:

- preserve compatibility with the committed legacy evidence fields;
- do not rewrite old release specs;
- expose only what is actually present;
- do not fabricate release SHA, issue id, verdict, or latest-installed identity from prose.

Legacy mode therefore may have less structured information than structured mode. That is acceptable and safer than inference.

### Ownership rule

After migration, generic consumers must not directly branch on these representation fields:

- `releaseEvidence`
- `verifiedBaseline`
- `latestInstalledEvidence`

Only the canonical compatibility/view helper and explicitly historical frozen tests/materializers may know representation details.

This is the central simplicity change in E21.

## 5. B — Closed-shape structured evidence

E20's executable contract must match its “exactly two roles” design statement.

### Allowed `releaseEvidence` keys

Exactly:

- `schemaVersion`
- `acceptedBaseline`
- `latestInstalled`

Unknown top-level keys fail closed with a deterministic finding such as:

`release-evidence-unknown-key@releaseEvidence.<key>`

### Allowed evidence-role keys

Exactly:

- `productVersion`
- `releaseSha`
- `verdict`
- `issue`
- optional `commentId`
- optional bounded `note`

Unknown role keys fail closed, including apparently harmless authority-like fields such as:

- `trusted`
- `source`
- `acceptedCandidate`
- `verifiedBy`
- `physical`
- `thirdRole`

E21 does not add extensibility metadata. If a future role or field is actually needed, it requires an explicit contract revision instead of silent acceptance.

## 6. C — Synthetic forward-consumer canary

The next real product release must not be the first place where generic consumer incompatibility is discovered.

Add one ordinary local registry test that synthesizes a valid forward release spec from the currently checked-out Product.

The canary must:

1. derive a strictly newer synthetic Product through canonical version ordering;
2. build one valid structured `releaseEvidence` object using older source-backed fixture identities;
3. pass E19 + E20 validation;
4. resolve the canonical evidence view;
5. exercise every generic release-evidence consumer entrypoint that can be invoked read-only;
6. prove no generic consumer requires legacy evidence fields;
7. verify unknown top-level and role keys fail closed;
8. verify dual legacy ownership beside structured evidence fails closed;
9. change no tracked file and write no mutable repository state.

The canary joins the existing test registry. E21 adds no new workflow stage.

### Static migration guard

Add one bounded source scan for generic release tooling/tests that rejects new direct legacy-evidence reads outside an explicit allowlist.

The allowlist should include only:

- the canonical compatibility/view helper;
- explicitly historical frozen tests/materializers that cannot be safely rewritten without changing history semantics.

The guard must not force a repository-wide purge of historical release specs.

## 7. D — Shared release-version ordering

E20 currently owns a local regex/ordinal comparison for `3.0.0-alpha.5.N`.

E21 should identify the pure version-ordering authority already used by monotonic candidate/promotion logic and consolidate around it.

Requirements:

- one parser/comparator owner for release ordering;
- E19 forward detection reuses it;
- E20 target ordering reuses it;
- synthetic forward canary reuses it;
- no speculative widening of accepted production version formats;
- invalid/uncomparable versions remain fail-closed.

If the existing monotonic helper cannot be imported cleanly because it owns I/O or CLI behavior, extract only the pure version primitive into a shared local module and have both paths depend on that primitive. Do not duplicate the parser again.

## 8. E — Consumer convergence boundary

Target ownership after E21:

| Concern | Single owner |
|---|---|
| outer release spec schema | E19 |
| structured evidence semantics | E20 |
| legacy/structured representation compatibility | E21 canonical evidence view |
| release Product ordering | shared pure version helper |
| current-release and generic regression consumption | normalized evidence view only |
| physical acceptance | separate real-device process |

Historical tests may retain literal old release fields only when they are explicitly version-locked historical evidence.

No current/generic regression should independently implement `if (release.releaseEvidence) ... else release.verifiedBaseline ...` after E21.

## 9. F — Shift-left automation

E21 reuses the existing pipeline:

`source/spec validation -> deterministic materialization/idempotence -> structural gates -> derived-impact smoke -> full registry -> PR/CI -> expected-head merge -> exact-byte promotion -> separate physical acceptance`

Preferred validation order inside existing gates:

1. shared Product ordering / closed-shape release-spec validation;
2. canonical evidence-view contract;
3. synthetic forward-consumer canary;
4. existing E20/E19/E18 contract checks;
5. normal behavior regressions.

No new queue, reducer, action workflow, timer, bot, or release generation is introduced.

## 10. Failure behavior

All new E21 failures are deterministic and local.

Recommended findings:

- `release-evidence-unknown-key`
- `release-evidence-role-unknown-key`
- `release-evidence-view-rejected`
- `release-evidence-direct-legacy-consumer`
- `release-version-order-unavailable`
- `forward-consumer-canary-legacy-dependency`

Where E19 source-readiness already wraps release-spec findings, keep the existing bounded `SOURCE_SHA_NOT_READY` / `release-spec-contract` family rather than inventing a new orchestration receipt.

## 11. Stability scorecard

E21 improves stability by:

- rejecting shadow evidence roles instead of ignoring them;
- eliminating per-consumer representation branching;
- testing a future structured spec before a real release exists;
- preserving UNKNOWN/absent legacy information instead of inventing structured identities;
- retaining the exact separation between accepted physical baseline and latest installed release;
- keeping physical acceptance outside repository CI authority.

## 12. Simplicity scorecard

E21 improves simplicity by reducing owners:

- one evidence compatibility/view helper;
- one Product ordering primitive;
- no new schema above E19;
- no new release stage;
- no historical-spec migration;
- no mutable evidence database;
- no duplicate prose owner for new releases.

The desired future consumer code is intentionally boring: load current release -> obtain normalized view -> assert/display the view.

## 13. Automation scorecard

E21 improves automation because:

- ordinary registry tests catch future consumer drift;
- unknown evidence keys fail before candidate churn;
- synthetic forward proof makes the next release representation testable without changing Product bytes;
- generic consumers no longer need a release-specific migration when the next structured spec arrives;
- the user still only performs `+` update and real-device acceptance when a production release needs it.

## 14. Hard boundaries

E21 must not:

- add `release_generation: E21` as durable release authority;
- change expected-head merge authority;
- change exact-byte promotion authority;
- auto-merge;
- make physical acceptance a CI gate for merge/promotion;
- fetch GitHub issues/releases over the network from evidence contract/view code;
- add a release-evidence database;
- mutate old release specs after device acceptance;
- bulk-convert historical specs;
- infer missing legacy Product/SHA/verdict values;
- add a third evidence role;
- bump Product, Plugin, Engine, Manager, CLI, Models, contracts, or bootstrap for E21 maintenance alone;
- weaken E18/E19/E20/E9/E11/E16 contracts.

## 15. Implementation gate

E21 implementation is complete only when all are true:

1. one pure canonical evidence-view helper exists;
2. structured evidence top-level and role shapes are closed;
3. Product ordering has one shared pure owner;
4. current/generic evidence consumers are migrated to the view;
5. direct legacy-consumer guard is active with a minimal historical allowlist;
6. synthetic forward-consumer canary is registered;
7. valid structured, malformed structured, legacy historical, and dual-owner fixtures are covered;
8. E18/E19/E20 remain GREEN;
9. full Usage Dashboard registry is GREEN;
10. shipped Product/Plugin/Engine/Manager/bootstrap bytes remain unchanged by E21 maintenance;
11. maintenance PR/CI is GREEN and exact-head merged;
12. the next legitimate forward release reaches full registry without any new evidence-consumer migration repair.

## 16. Rollback / failure posture

Because E21 is maintenance-only, rollback is simple:

- if the compatibility view or canary destabilizes current behavior, revert the E21 maintenance commit/PR;
- production release bytes stay at the already deployed baseline;
- E20 remains valid and sealed;
- no release branch rollback or device rollback is required for E21-only failure.

## 17. Final decision

**KEEP E20 semantics and authority unchanged.**

E21 is not “more release machinery.” It is a convergence pass so the release evidence contract has:

- one shape,
- one compatibility view,
- one ordering authority,
- one automatic future-release canary.

That is the stability + simplicity + automation path selected after the first real E20 proof in 5.97.
