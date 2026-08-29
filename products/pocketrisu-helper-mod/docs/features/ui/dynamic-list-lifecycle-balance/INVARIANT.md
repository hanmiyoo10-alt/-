# DYNAMIC-LIST-LIFECYCLE-BALANCE

Status: `HOLD`

## Problem / evidence

`Nagase-Kotono/PocketRisu-kotono@cdd71970233438d7d2a49f860d597cf944d5a846` fixes a class of UI-state bugs where dynamic row components contribute to aggregate list state (for example, an open-row counter used to disable/recreate drag sorting), but row deletion, parent array replacement, reorder identity reuse, or parent unmount can remove a contributor without balancing teardown. The aggregate then stays stale and list interactions can remain permanently disabled.

## Minimal safe scope

Do not port source code proactively. Preserve the invariant and, only if PocketRisu has a matching owner plus a reproducible stale-state path, fix one list owner at a time.

## Ownership boundaries

- row/component lifecycle owns its own open/close contribution;
- list owner owns aggregate counters and drag/sort enablement;
- keyed collection identity must correspond to the stateful row instance;
- drag/sort initialization must only target a live, connected DOM owner.

## Mechanism

When a matching PocketRisu owner exists, prefer lifecycle-balanced registration: every successful open/register contribution has exactly one teardown path, including destructive removal and parent unmount. Keep open/close classification symmetric. Use stable/keyed row identity when per-row state must survive reorder. Do not recreate DOM-bound helpers against detached nodes.

## Compatibility / invariants

- deleting a closed row must not decrement an open counter;
- deleting an open row must settle its contribution exactly once;
- replacing the entire backing list must not leak old row contributions;
- parent unmount must leave no live aggregate contribution;
- keyed reorder must keep state attached to the intended row;
- helper teardown/recreation must be idempotent and must not operate on detached nodes.

## Validation / acceptance

Required before implementation:

1. identify the concrete PocketRisu list/row owner;
2. reproduce stale aggregate state before the fix;
3. add focused tests for open-row deletion, closed-row deletion, parent dataset replacement, parent unmount, reorder, and repeated mount/unmount;
4. verify drag/sort remains functional after each path and aggregate state returns to baseline;
5. verify no duplicate teardown or negative counter path is introduced.

Acceptance: the reproduced stale-state failure disappears with no behavior change for unaffected list operations.

## Risk / blast radius

`LOW` if confined to one UI list owner. Main risk is duplicate cleanup or mismatched row classification, which can create a new underflow/stale-state bug.

## Rollback / fallback

Revert the isolated list-owner change. No persistent data or schema migration is involved.

## Dependencies

- matching PocketRisu-owned dynamic editor/list with aggregate open-state or drag-disable state;
- reproducible failure in current PocketRisu.

## PR decomposition

If promoted later, one list owner per PR. First PR should contain the failing regression test plus the smallest lifecycle-balancing fix. Do not mix unrelated UI cleanup.