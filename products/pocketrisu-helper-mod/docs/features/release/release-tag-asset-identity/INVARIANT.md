# RELEASE-TAG-ASSET-IDENTITY

Status: `ADOPTED`

## Problem / evidence

A release can become internally inconsistent when the operator-requested build tag, the published GitHub release tag, its target commit, and generated asset links are allowed to derive from different transient metadata.

HaejeokRisuai provides concrete evidence:

- `dbda43876b9322ce8284c166c28f0c3801f099b8` reasserts the requested build tag/target during publish, reads the release back, performs one bounded correction, then fails closed if the tag still differs.
- `b1fd6f3d3151eb347592339227ede5b3410b9ec9` rewrites generated release-note asset URLs to the requested build tag and adds regression coverage against stale intermediate tags.

Current PocketRisu avoids that exact failure shape by construction: `.github/workflows/release.yml` runs on `v*` tag refs and creates the release with `tag_name: ${{ github.ref_name }}` and `name: ${{ github.ref_name }}`, uploading the portable assets in that same tag-triggered release job.

## Invariant / minimal safe scope

Treat the triggering/requested release tag as the single release-build identity authority. Keep these coherent:

1. trigger/requested tag;
2. release `tag_name`;
3. release target commit;
4. packaged version and artifact filenames;
5. any generated download links;
6. updater-visible release/version identity.

Do not add Haejeok-specific repair logic while PocketRisu's current single-owner path already preserves the invariant.

## Ownership boundaries

- Release workflow owns build/release identity derivation.
- Packaging jobs consume that identity; they must not invent a competing release identity.
- Download-link generation, if introduced later, must consume the canonical tag rather than trust stale/intermediate asset URLs.
- Updater behavior remains a consumer of release identity, not an authority for it.

## Compatibility / guardrails

- No device/system runtime migration.
- No PM2; runit guardrail unaffected.
- No server-phone notification behavior change.
- No database/save/plugin reload behavior change.
- Preserve legacy portable artifact aliases only as compatibility names; aliases must still identify bytes produced for the same canonical release tag.

## Validation / acceptance

Whenever the release flow changes, verify:

- tag-triggered builds publish to the same tag;
- the release resolves to the expected target commit;
- packaged version/artifact names correspond to the canonical tag;
- generated links, when present, contain/resolve to the same release identity;
- a mismatch fails the release instead of silently publishing an ambiguous/wrong build.

If publication becomes multi-stage or indirect, add a post-publication read-back assertion and targeted regression tests at that new ownership boundary.

## Risk / blast radius

Risk of preserving the invariant: `LOW`. Release workflow changes can have broad distribution impact, so future changes should remain isolated and reversible even though this invariant itself requires no current code modification.

## Rollback / fallback

Current state is already compliant. If a future refactor weakens tag coherence, revert the release-workflow change or restore a single canonical tag handoff before publishing artifacts.

## Dependencies

`NONE` for the current adopted invariant.

## PR decomposition

No implementation PR is required now. If future release architecture creates a split boundary:

1. add tag/target/link identity regression tests;
2. thread one canonical release tag through the split jobs/tools;
3. add fail-closed publication read-back only where the split makes it necessary.

Do not combine unrelated packaging optimization with release-identity repair.
