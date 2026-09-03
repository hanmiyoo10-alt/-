# MODEL-JOB-RECOVERY-PRESERVES-CHRONOLOGICAL-ORDER

Status: `SUPERSEDED`

This path is preserved as durable history, but it duplicated the same underlying invariant as the canonical dossier:

`products/pocketrisu-helper-mod/docs/features/recovery/terminal-job-recovery-preserves-chronology/INVARIANT.md`

Do not create a second implementation/design track from this file. Merge any future evidence into the canonical dossier above.

## Superseded-by rationale

Both dossiers derive from official PocketRisu commit `342b3a8a702cbce4ad7c3ea0594196ff7836c66b` and describe the same ownership rule: terminal, unclaimed `kind = 'main'` model-job results that are eligible for replay must be appended in durable causal order. The canonical recovery dossier is retained because it already carries the current shared classification schema, distinguishes recovery admission from replay ordering, and explicitly notes that a future stable sequence field would supersede wall-clock `created_at` as ordering authority.

## Preserved historical evidence

Official PocketRisu commit `342b3a8a702cbce4ad7c3ea0594196ff7836c66b` changed terminal unclaimed main-job enumeration from newest-first to oldest-first because recovery appends results in query order. Current `develop` retains ascending `created_at` ordering for this recovery view.

## Classification history

- `System impact`: `NO_SYSTEM_UPDATE`
- `Importance`: `HIGH`
- `Difficulty`: `LOW`
- `Size`: `XS`
- `Evidence`: `HIGH`
- `Risk`: `MEDIUM`
- `Dependencies`: `NONE`
- `Priority`: `P0`
- lifecycle status: `SUPERSEDED`

The lifecycle change here reflects dossier deduplication only. The implementation invariant itself remains `ADOPTED` at the canonical recovery dossier.
