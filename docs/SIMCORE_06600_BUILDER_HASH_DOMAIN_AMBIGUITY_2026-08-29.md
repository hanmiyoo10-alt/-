# SimCore v0.66.0 Builder Hash Domain Ambiguity

Date: 2026-08-29

Classification:

`FIX · BLOCKER · RELEASE_EVIDENCE_HASH_DOMAIN_AMBIGUITY · NON_RUNTIME · PRODUCTION_UNCHANGED`

Status:

`EVIDENCE RECONCILIATION IN PROGRESS · APPROVAL PAUSED`

## Trigger

After successful `simcore-v0.66.0-intent-02` candidate materialization, the durable candidate receipt recorded:

```text
builderSha256 = cca38629388cf932024226ef02097703f4a73602af6bbf48e5556225baac4a1a
candidate C   = ea88eecb4428a42682894c96980bef420b0a0d27
candidate blob= 766c3b758ca26ae72546a38bfa1c053efa666c45
productionMutation = NONE
```

Earlier implementation and validation evidence records the repaired frozen builder byte hash as:

```text
ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50
```

The runtime candidate identity itself did not diverge.

## Diagnosis

The two values belong to different hash domains.

The exact-production validation evidence recorded the SHA-256 of the builder file bytes after the Slice B assertion repair. Commit `99f0944389387d264e29045ed9968b35838378c7` changes only the Slice B validation assertion in the builder and preserves runtime materialization semantics.

The generic candidate materializer uses the shared `run()` helper to obtain `git show <source>:<builder>`. That helper returns `stdout.trim()`. `candidate-materialize-core.mjs` then computes `builderSha256` from that trimmed UTF-8 buffer:

```text
git show bytes
→ stdout.trim()
→ Buffer.from(..., 'utf8')
→ sha256
```

Therefore the receipt field named `builderSha256` is a normalized/trimmed-text digest, not an unqualified raw-file-byte digest. The durable receipt value `cca386...` must not be interpreted as contradicting the raw builder byte hash `ad6009...`.

## Authority reconciliation

For the current v0.66.0 release evidence:

```text
builder raw-file-byte SHA-256
= ad6009ffee41a86a2723456bfa1cd727e7e760568527a0be3e04fe355767bb50

candidate-materializer normalized/trimmed builder digest
= cca38629388cf932024226ef02097703f4a73602af6bbf48e5556225baac4a1a

candidate commit
= ea88eecb4428a42682894c96980bef420b0a0d27

candidate runtime blob
= 766c3b758ca26ae72546a38bfa1c053efa666c45

candidate runtime SHA-256
= af3659eade34b199d8972cf04cafe2595198c075b5131275603fc2857079ed6a
```

The candidate receipt is still valid for candidate identity and release binding. Its builder digest must be read according to the materializer's current normalization semantics.

## Current repair boundary

This v0.66.0 runtime release does **not** change release-system code to redefine the receipt field. Mixing a release-system semantic migration into the M2-4 runtime release would violate the work-item boundary.

Current release repair is documentation/evidence only:

1. preserve this ambiguity durably;
2. update the current M2-4 implementation evidence to label both digest domains explicitly;
3. keep historical incident documents unchanged where `ad6009...` correctly described the raw builder byte hash at that time;
4. keep the runtime candidate and candidate receipt unchanged;
5. resume exact approval only after the documentation repair passes permanent CI.

A later separate release-system work item should consider making the receipt field/hash domain explicit or hashing raw `git show` bytes without `.trim()`.

Recommended follow-up classification:

`FIX · RELEASE_SYSTEM · HASH_DOMAIN_EXPLICITNESS · NON_RUNTIME · DEFERRED_FROM_V0.66_RUNTIME_RELEASE`

## Safety

```text
release-simcore mutation = NONE
production mutation      = NONE
candidate runtime change = NONE
approval dispatch        = NONE while blocker is open
```

Production remains v0.65.0 at `c6659296c68b4322d0ed43f7d8a3339e57f1cbf1`.
