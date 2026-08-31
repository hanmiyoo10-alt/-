# Local Usage Dashboard E20 — Structured Release Evidence Roles

Status: **DESIGN READY — E19 PRESERVED / BYTE-NEUTRAL MAINTENANCE ONLY**

Issue: `#1023`

## Fresh design baseline

- production Product: `3.0.0-alpha.5.96`
- production branch: `release-usage-dashboard`
- production SHA: `5fc75fbc0725962997f65de17db4ffaf156ba6f9`
- Engine: `1.6.32`
- Manager: `1.3.5`
- managed CLI: `1.10.0`
- managed Models catalog: `1.251.0`
- contracts: snapshot `1` / recentRequest `1`
- design base main: `a8ec4f712ae3b75517600f75f33416881cda6999`

E20 is a maintenance/design label only. It must not reserve a Product version or introduce `release_generation: E20`.

## Trigger from E19 live proof

E19 did what it was designed to do in the 5.96 release:

- source-readiness rejected a bounded release-spec violation before candidate publication;
- the declared materializer second pass proved target idempotence;
- current-release + P5 + P49 ran before E18 behavior smoke;
- E18 derived-impact behavior selection stayed intact;
- E9 exact-SHA validation finished with `TEST_REGISTRY_GREEN:124`;
- E11/E16 and exact-byte promotion remained the release authority path.

The remaining gap is semantic rather than procedural.

The 5.96 release spec currently carries two free-form evidence strings:

- `verifiedBaseline`: the last fully accepted physical release, 5.94;
- `latestInstalledEvidence`: the newer 5.95 device observation whose feature passed but whose Diagnostics fidelity failed.

That split is correct, but the distinction is only encoded in human prose. The E19 outer release-spec helper requires `verifiedBaseline` to be a non-empty string and does not define the relationship between the accepted baseline and the latest installed observation.

This allowed one 5.96 source revision to be structurally READY while the accepted-vs-latest role distinction was still overloaded in prose. The source was later corrected before the successful release. This is not an E19 regression: E19 shifts deterministic validation earlier, while E20 should define the missing evidence semantics that can now be shifted left.

## Decision

Preserve the existing authority graph exactly:

`E13 -> E14 -> E15 -> E9 -> E11 -> E16 -> assistant fresh reread -> expected-head merge -> exact-byte promotion -> separate physical acceptance`

Preserve E18 and E19:

- E18 remains the post-materialization derived-impact and smoke-depth layer;
- E19 remains the canonical release-spec reuse, materializer second-pass, and cheap structural-gate layer;
- E20 adds one small structured **release-evidence sub-contract** reused by the E19 path.

E20 changes neither release authority nor physical acceptance authority.

## E20-A — Exactly two evidence roles

Future forward release specs should represent release evidence with one bounded object:

```json
{
  "releaseEvidence": {
    "schemaVersion": 1,
    "acceptedBaseline": {
      "productVersion": "3.0.0-alpha.5.xx",
      "releaseSha": "0123456789abcdef0123456789abcdef01234567",
      "verdict": "accepted",
      "issue": 123
    },
    "latestInstalled": {
      "productVersion": "3.0.0-alpha.5.yy",
      "releaseSha": "89abcdef0123456789abcdef0123456789abcdef",
      "verdict": "partial",
      "issue": 456
    }
  }
}
```

Allowed latest-installed verdicts:

- `accepted`
- `partial`
- `rejected`
- `unverified`

Optional fields may be limited to:

- `commentId`: positive integer durable evidence locator;
- `note`: short bounded human context.

Neither optional field may control release authority.

### Role meaning

`acceptedBaseline` means:

> the most recent release known to have completed the normal physical acceptance contract at the moment the new source is frozen.

Its verdict is always exactly `accepted`.

`latestInstalled` means:

> the most recent release actually observed on the device at the moment the new source is frozen, whether accepted, partial, rejected, or not yet fully verified.

No third evidence role is introduced in E20.

## E20-B — Stable semantic invariants

Add one pure repository-local helper, preferred path:

`plugins/usage-dashboard/tools/release_evidence_contract_e20.cjs`

The helper owns only the `releaseEvidence` sub-object. It must not duplicate the outer release-spec schema.

Minimum deterministic checks:

1. `releaseEvidence` is an object;
2. `schemaVersion === 1`;
3. both roles are objects;
4. both Product identities satisfy the existing Product-version format;
5. both `releaseSha` values are exact lowercase 40-hex Git SHAs;
6. `issue` is a positive integer; `commentId`, when present, is a positive integer;
7. `acceptedBaseline.verdict === 'accepted'`;
8. `latestInstalled.verdict` is one of the four bounded values;
9. latest-installed Product is not older than accepted-baseline Product;
10. when latest-installed verdict is `accepted`, accepted baseline and latest installed identify the exact same Product + release SHA;
11. the same Product + release SHA cannot be the accepted baseline while the latest-installed role labels it `partial`, `rejected`, or `unverified`;
12. when validating a newly introduced forward target, both evidence Products must be older than the target Product;
13. conflicting or incomplete facts fail closed with bounded, aggregated findings.

The helper must be pure and local. No GitHub API call, issue fetch, network lookup, process poller, cache, persistent state, or writer is permitted.

### Why Product + release SHA

Product alone is insufficient because exact-byte release authority already treats the Git release identity as important. Release SHA prevents two different artifact histories from being silently described as the same physical baseline.

The helper validates only the supplied exact identity shape and role relationship. It does **not** remotely prove that an issue comment exists or parse issue prose.

## E20-C — Compose into E19, do not fork it

`plugins/usage-dashboard/tools/release_spec_contract_e19.cjs` remains the outer canonical release-spec contract.

E20 should be composed beneath it rather than creating a replacement release-spec validator.

Preferred compatibility rule:

- historical/current specs without `releaseEvidence` remain valid and unchanged;
- newly introduced forward release specs must contain valid `releaseEvidence`;
- once a spec uses `releaseEvidence`, the structured object is the sole machine evidence truth for that spec.

### Generic forward activation

Do not hard-code `5.97` or another future Product number.

Source-readiness already has the checked-out current Product context and the target release spec. A spec is a forward source when its target Product is newer than the checked-out current Product. That condition activates the E20 structured-evidence requirement.

This gives one reusable rule for every later release and avoids a new generation or per-version switch.

## E20-D — Historical compatibility without migration churn

Do not bulk-rewrite `.github/usage-dashboard/releases/5.xx.json` history.

Historical `verifiedBaseline` prose remains historical data.

For new forward specs:

- `verifiedBaseline` must not remain an independent evidence owner;
- `latestInstalledEvidence` must not remain an independent evidence owner;
- structured `releaseEvidence` is authoritative for evidence roles.

The existing E19 outer helper can preserve legacy `verifiedBaseline` compatibility only for historical/current specs that do not opt into structured evidence.

This keeps history immutable and prevents a large migration PR whose only purpose would be schema cosmetics.

## E20-E — One canonical human projection

Where project docs, diagnostics guidance, or release-memory text need a human summary of evidence, provide one pure formatter from the structured object.

Conceptually:

```text
Accepted physical baseline: 3.0.0-alpha.5.xx · release <short-sha> · accepted
Latest installed evidence: 3.0.0-alpha.5.yy · release <short-sha> · partial
```

The formatter must not create new facts. It only projects structured values.

A release materializer should not hand-author separate baseline prose once E20 is active.

This is the simplicity/automation payoff from the 5.96 feedback: future materializers stop carrying one-off baseline wording that can drift from the release spec.

## E20-F — Shift-left integration

E20 adds no workflow stage.

Effective order stays:

`canonical source/spec validation + E20 evidence semantics -> materialize -> E19 declared materializer second-pass no-op -> E19 cheap structural gates -> E18 derived-impact classification -> impact-selected smoke -> candidate write -> E9 full registry`

Use the existing `SOURCE_SHA_NOT_READY` receipt family.

Recommended bounded finding codes:

- `release-evidence-required`
- `release-evidence-schema`
- `release-evidence-role-shape`
- `accepted-baseline-verdict`
- `latest-installed-verdict`
- `evidence-release-sha`
- `evidence-release-order`
- `accepted-latest-identity-mismatch`
- `same-release-conflicting-verdict`
- `evidence-target-order`

Related findings should be aggregated in one readiness result rather than causing one repair/restage per field.

## E20-G — Physical acceptance remains a later, separate boundary

E20 release evidence is a snapshot of facts that already existed when a new source was frozen.

It is not a mutable live status record for the target release.

After a release is promoted:

1. repository authority has already completed through E9/E11/E16 + exact-byte promotion;
2. the normal device `+` update / Diagnostics acceptance occurs separately;
3. that device result is recorded through the existing project evidence path;
4. the **next** forward release spec snapshots the then-current accepted baseline and latest installed release.

Old release specs do not need post-deploy mutation merely because a later physical result arrived.

This avoids an evidence-sync loop and keeps the release spec immutable after release.

## Stability scorecard

E20 improves stability by:

- rejecting contradictory accepted/latest roles before candidate churn;
- binding each role to exact Product + release SHA;
- eliminating machine interpretation of evidence prose;
- preserving historical specs untouched;
- keeping E18/E19/E9/E11/E16 authority semantics unchanged;
- remaining fail-closed on ambiguity.

## Simplicity scorecard

E20 stays simple by allowing only:

- two evidence roles;
- one sub-contract schema version;
- one pure validator;
- one optional pure human formatter;
- one generic forward-activation rule;
- one existing readiness receipt family.

It explicitly rejects:

- a release-evidence database;
- a new evidence state machine;
- a third evidence role;
- dynamic historical-spec rewrites;
- issue-prose scraping;
- a new workflow stage;
- a new release generation.

## Automation scorecard

E20 automates the recurring work that produced the 5.96 correction:

- source-readiness checks evidence role meaning automatically;
- multiple evidence mistakes are reported together;
- future forward specs cannot silently regress to dual free-form truth;
- release materializers can use one canonical evidence projection instead of custom prose;
- the user still performs only the real-device acceptance action when a product release reaches that boundary.

## Boundaries

E20 must not add:

- `release_generation: E20`;
- a new release/merge/promotion authority;
- auto-merge;
- a second outer release-spec schema implementation;
- a new durable writer;
- a queue, timer, poller, scheduled bot, or state database;
- network validation I/O;
- issue-body/comment prose parsing for machine truth;
- automatic invention of physical evidence;
- a bulk historical release-spec migration;
- Product/Plugin/Engine/Manager/bootstrap version changes for E20-only maintenance;
- weakened E18 derived-impact semantics;
- weakened E19 second-pass/structural gates;
- weakened E9/E11/E16 or exact-byte promotion;
- physical acceptance as CI merge/promotion authority.

## Implementation gate

Preferred implementation order:

1. focused E20 contract regression first;
2. pure `release_evidence_contract_e20.cjs` helper;
3. shape/verdict/order/exact-identity/conflict tests;
4. generic forward-target activation test with no hard-coded future Product version;
5. compose the evidence sub-contract into the existing E19 release-spec/source-readiness path;
6. preserve legacy historical/current specs without rewriting them;
7. reject dual evidence ownership on new structured forward specs;
8. add one pure human projection only if an existing consumer needs text;
9. prove E18 contract GREEN;
10. prove E19 contract GREEN;
11. full Usage Dashboard registry GREEN;
12. prove Product/Plugin/Engine/Manager/bootstrap byte-neutral;
13. maintenance PR/CI/main merge;
14. first later legitimate forward product release provides live E20 proof.

## Implementation regression targets

An E20 regression should at minimum prove:

- accepted 5.x + newer partial 5.y is valid when both precede the target;
- accepted 5.x + older latest-installed 5.w fails;
- accepted latest-installed must exactly match accepted baseline Product + release SHA;
- the same release cannot be `accepted` in one role and `partial/rejected/unverified` in the other;
- malformed SHA/issue/comment identifiers fail closed;
- both evidence roles equal to or newer than a forward target fail;
- a newly introduced forward spec without `releaseEvidence` fails;
- a historical/current legacy spec without `releaseEvidence` remains valid;
- a structured forward spec cannot also own independent legacy evidence prose;
- E19 aggregated source-readiness reporting remains bounded;
- E19 materializer second-pass and structural-gate ordering remains unchanged;
- E18 Engine repeat-3 / unknown-runtime fail-closed remains unchanged;
- E9/E11/E16 authority remains unchanged;
- full registry stays GREEN.

## Non-goals

- no change to the 5.96 Diagnostics product feature;
- no closure of physical acceptance issue `#1012` as part of E20 design/maintenance;
- no device-side telemetry or new evidence collection mechanism;
- no automatic claim that a release passed physically;
- no runtime/UI feature;
- no Product release for E20 itself.

## Verdict

**E19 KEEP SEALED -> E20 STRUCTURE RELEASE-EVIDENCE ROLES, NOT RELEASE AUTHORITY.**

The target is fewer ambiguous source freezes and fewer one-off release-memory repairs, using a smaller machine-readable contract rather than another workflow or state owner.
