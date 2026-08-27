# SimCore Historical Documentation

Primary role: historical preservation and release-family evidence navigation.

This directory is **not** current production or live-gate authority.

Current SimCore production identity, active live gate, priority, stop conditions, and hard freezes remain in:

- `../CURRENT_DEVELOPMENT.md`

## Preservation layers

### Exact pre-rollover snapshot

`CURRENT_DEVELOPMENT_PRE_ROLLOVER_2026-08-27.md`

This path reuses the exact blob that was `docs/CURRENT_DEVELOPMENT.md` immediately before the first slimming migration.

```text
source commit: ec52c7510f9a12a24c6d1bac6cf655a7b645193b
source blob: 0d1413ebc0da79a5a7274f17ff4786bc9d850eb5
preservation: byte-identical
```

It exists so no historical prose, timing, failed hypothesis, old status wording, or evidence ledger entry is lost merely because the living document was slimmed.

### Release-family manifests

- `SIMCORE_RELEASE_HISTORY_063.md`
- `SIMCORE_RELEASE_HISTORY_064.md`

These are `POINT_IN_TIME_EVIDENCE` family views. They provide compact release chronology, source section identities, active-residue notes, and dedicated evidence pointers.

They do not override the exact snapshot or dedicated evidence documents.

## Authority prohibition

Do not infer any of the following from this directory:

```text
current production
current release commit/blob
current validation status
current live gate
current priority
current authorization
```

Archive filename, recency, highest version, file order, and historical `PRODUCTION` wording are not current-state signals.

## Migration architecture

Frozen architecture:

- `../SIMCORE_CURRENT_DEVELOPMENT_SLIMMING_AND_HISTORY_ROLLOVER_DESIGN.md`

Application evidence:

- `../SIMCORE_CURRENT_DEVELOPMENT_ROLLOVER_IMPLEMENTATION_EVIDENCE_2026-08-27.md`
