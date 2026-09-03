# Feature-ID: PLUGIN-STORAGE-CORRUPT-ROW-REFETCH-QUARANTINE

Status: ADOPTED invariant

## Problem / evidence

PocketRisu commit `167def7df98e8272dcb179a4e8b4451e29e32604` fixed a loop where a malformed plugin-storage JSON value was dropped from the local index after parse failure, but the server index continued to list it. Every later index refresh therefore treated it as missing and fetched/parsing it again.

## Minimal safe invariant

- A value that has already failed parsing is treated as missing for reads and remembered as unparseable.
- Refresh/top-up must not repeatedly fetch a still-listed key already known to be unparseable.
- The quarantine is not deletion authority and must be reversible.
- A successful local write repairs/clears quarantine for that key.
- If an authoritative refreshed index no longer lists the key, quarantine is cleared so a later recreation can be observed normally.

## Ownership boundaries

- Browser plugin-storage cache/index reconciliation owns the quarantine state.
- Server index remains authoritative for key existence.
- Normal plugin-storage writes remain authoritative for repair.
- This invariant does not authorize destructive cleanup of malformed rows.

## Compatibility / guardrails

Preserve current per-key write ordering, cross-device visibility semantics, bounded cache behavior, targeted V3 plugin reload, and existing PocketRisu save/integrity guardrails. Do not introduce visibility/pagehide flushes or any host/runtime changes.

## Validation / acceptance

Regression coverage should prove that one corrupt row is fetched at most once while it remains corrupt and continuously listed; repeated refreshes do not refetch it; valid rows remain usable; rewriting the key immediately restores reads; authoritative disappearance clears quarantine and permits later recreation to be fetched.

## Risk / blast radius

MEDIUM. Incorrect quarantine lifetime can either recreate the periodic I/O loop or hide externally repaired data. The state must remain advisory and reversible.

## Rollback / fallback

This is already adopted upstream. If future refactors break the invariant, revert the refactor or restore the explicit per-key unparseable quarantine and its recovery edges rather than deleting data.

## Dependencies / PR decomposition

Dependencies: NONE. No implementation PR is required for the current PocketRisu branch because the invariant is already present.

## Source / history

- Source: `PocketRisu/PocketRisu@167def7df98e8272dcb179a4e8b4451e29e32604`.
- Verified retained at `develop@278251f85a19bfdfd4cf3faae780e62682878f9e`.
