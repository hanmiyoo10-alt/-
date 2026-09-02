# PLUGIN-STORAGE-CORRUPT-ROWS-ARE-QUARANTINED-UNTIL-REPAIR-SIGNAL

Status: `ADOPTED`
Source: `PocketRisu/PocketRisu@167def7df98e8272dcb179a4e8b4451e29e32604`

## Problem / evidence

An externalized plugin-storage value can be durably present yet fail JSON parsing. Treating that value as logically missing is a safe degradation, but the server index still advertises the key. Without a remembered failure state, every periodic index refresh can rediscover the key and every preload top-up can refetch and reparse the same unchanged corrupt payload.

The official PocketRisu fix adds focused regression coverage showing the corrupt row is fetched once, skipped on repeated refreshes, healthy keys remain usable, and a rewrite repairs the key.

## Minimal safe scope

Keep retry suppression strictly per key. A parse failure may suppress background refetch of that exact unchanged key, but it must not delete the durable row, block unrelated keys, or become global plugin-storage failure state.

## Ownership boundaries

- Server/durable store owns whether a key exists and its bytes.
- Client plugin-storage reconciliation owns whether a known-unparseable key should be retried during routine top-up.
- A parse failure does **not** grant deletion authority.
- Concrete repair/revalidation signals own quarantine invalidation.

## Mechanism

Maintain an in-memory set of keys whose latest fetched/streamed payload failed parsing. Exclude these keys from routine `topUpMissing()` fetches. Clear quarantine when:

1. a successful local write replaces the value;
2. a subsequent successful parse proves the value readable; or
3. a refreshed server index no longer contains the key, allowing a later recreation to be treated as new state.

## Compatibility / invariants

- Healthy keys remain readable and refresh normally.
- Corrupt rows degrade to missing rather than crashing the store.
- Quarantine is never equivalent to deletion or tombstoning.
- A repaired/recreated key can re-enter normal fetch flow.
- V2 fail-closed preload semantics remain unchanged.
- Partial writes remain merge-only unless explicit delete/clear authority is used.

## Validation / acceptance

Acceptance requires focused tests for:

- first corrupt fetch produces one parse failure and missing result;
- repeated index refreshes do not refetch the same unchanged corrupt row;
- healthy keys are unaffected;
- local rewrite immediately clears quarantine and restores reads;
- successful parse clears quarantine;
- server-index disappearance clears quarantine so later recreation can be fetched;
- test/reset paths clear quarantine state.

## Risk / blast radius

Risk is low and localized. The main failure mode is stale quarantine hiding a remotely repaired key, so invalidation rules are part of the invariant rather than an optional optimization.

## Rollback / fallback

Removing quarantine returns to repeated retry/log churn but does not alter durable data. If quarantine behavior is suspected, disable only the retry suppression and keep corrupt-value-as-missing behavior intact while investigating.

## Dependencies

None.

## PR decomposition

Already adopted upstream. Any future refactor should keep this as one small reconciliation invariant with its focused tests; do not bundle it with unrelated plugin-storage cleanup or migration work.
