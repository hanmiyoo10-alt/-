# Repository Common Rule Review — Top-Up-Only Refresh — 2026-09-02

Status: **NO NEW RCR · KEEP DOMAIN/SHARED GUARDRAIL · PROJECT-SPECIFIC REFRESH SEMANTICS · POLICY/DOCS ONLY · NO PRODUCT/RUNTIME/RELEASE AUTHORITY**

## 0. Question

Review the LATER candidate:

```text
initial hydration
!=
periodic refresh

therefore periodic refresh should be top-up-only
```

Determine whether this should become a repository-wide common rule, remain a domain/shared guardrail, or be absorbed by existing Repository Common Rules.

## 1. Summary verdict

Do **not** create a new Repository Common Rule requiring `top-up-only` refresh.

The PocketRisu incident strongly proves that steady-state refresh must not accidentally replay expensive bootstrap work when the owning refresh contract only requires bounded reconciliation. It does not prove that every periodic refresh should fetch only missing keys.

Selected portable principle:

```text
STEADY-STATE REFRESH
MUST MATCH THE OWNING AUTHORITY'S CHANGE / RECONCILIATION SCOPE

BOOTSTRAP / FULL HYDRATION WORK
MUST NOT HITCHHIKE ON PERIODIC REFRESH WITHOUT A CONTRACTUAL NEED
```

This is a domain/shared design guardrail, not a new universal refresh algorithm.

## 2. Primary evidence — PocketRisu top-up-only invariant

PocketRisu preserves the adopted invariant:

```text
products/pocketrisu-helper-mod/docs/features/plugins/plugin-storage-refresh-top-up-only/INVARIANT.md
```

The production regression was:

```text
periodic V2 plugin-storage index refresh
→ replayed bulk /api/plugin-storage/all preload
→ repeatedly downloaded the whole plugin store
→ remote links could remain saturated for minutes
```

The adopted repair separates:

```text
1. initial bulk hydration
2. authoritative index refresh
3. missing-key top-up
4. local cache/index state
5. per-key durable writes
6. temporary suppression for unparseable rows
```

After initial hydration, index refresh discovers missing keys and fetches only those missing locally. The design also bounds parse-failure suppression and clears it after repair/removal/recreation.

This is high-quality evidence for the PocketRisu plugin-storage refresh contract.

## 3. Why TOP-UP-ONLY is not repository-universal

### 3.1 A periodic full reconciliation can be correct

The repository Plugin Control Plane intentionally runs a bounded periodic reconciler that:

```text
enumerates the current open PR set
→ classifies changed paths
→ reconciles managed labels
```

The authoritative reconciliation unit is the current set of open PRs. Re-enumerating that bounded set is part of the owning contract rather than accidental bootstrap replay.

Therefore:

```text
PERIODIC
!=
INCREMENTAL-ONLY
```

### 3.2 Existing values may change, not only missing keys

A missing-key-only algorithm is correct only when the owning storage/index semantics make that sufficient.

Other systems may allow:

```text
same logical key
→ new revision/value from another writer
```

A refresh that fetches only absent keys could remain permanently stale.

A correct steady-state algorithm may need:

```text
missing objects
+ changed revisions
+ deletions/tombstones
+ authoritative full replacement
```

depending on the owning contract.

### 3.3 Full snapshots may be the only authoritative API

Some systems expose no safe delta/index contract. A bounded complete snapshot may be the only way to detect additions, updates, and deletions consistently.

The common layer must not invent an incremental protocol that the source authority does not provide.

### 3.4 Small bounded state may make full refresh cheaper and safer

For a tiny authoritative set, full reconciliation can be simpler, easier to validate, and cheaper than maintaining delta cursors, negative caches, tombstones, and reconciliation metadata.

### 3.5 Recovery/bootstrap may legitimately require full hydration

Initialization, explicit repair, corruption recovery, schema migration, cache loss, or operator-requested rebuild may intentionally rerun full hydration.

The problem is implicit periodic replay without need, not the existence of full hydration itself.

## 4. Existing Repository Common Rules already own the general discipline

The relevant existing rules are:

```text
RCR-D04  Measure before optimizing
RCR-D11  Choose the narrowest capable semantic owner/effect surface
RCR-D12  Map state/data/effect flow before multi-layer mutation
RCR-D13  Validate contracts across boundaries
RCR-H02  Preserve owning authority
RCR-H03  Preserve uncertainty/evidence fidelity
```

Their combined effect is sufficient at repository level:

- do not optimize a merely plausible bottleneck;
- identify the actual refresh owner and source authority;
- separate bootstrap, index/delta discovery, cache state, and persistence boundaries;
- choose the narrowest correct effect surface;
- validate source/index/cache/write reconciliation end-to-end;
- do not fabricate a delta protocol or missing state when authority cannot prove it.

A new common rule named `TOP_UP_ONLY_REFRESH` would over-specify project-owned storage and synchronization semantics.

## 5. Selected domain/shared guardrail

Carry this wording into designs that have expensive bootstrap hydration plus repeated steady-state refresh:

```text
When initialization/recovery performs broad hydration and later refresh has a narrower authoritative reconciliation surface, keep those lifecycle operations separate.

Steady-state refresh should perform only the work required to reconcile with current authority. It must not implicitly replay broad bootstrap/full-hydration work unless the owning contract requires a complete refresh.
```

Important:

```text
NARROWEST CORRECT REFRESH
!=
MISSING-KEY-ONLY IN EVERY SYSTEM
```

The owning project decides whether the correct mechanism is:

```text
missing-key top-up
revision/delta fetch
cursor-based change feed
bounded full snapshot
full reconciliation
explicit repair/rebuild
```

## 6. Negative-cache / suppression lesson remains project-specific

PocketRisu also proves a separate boundedness lesson:

```text
parse failure
→ do not retry the same unchanged corrupt row every refresh
```

but suppression must be invalidated when:

```text
rewrite succeeds
index stops listing the key
key disappears and is later recreated
```

This is useful domain evidence for negative-cache lifecycle design. It is not part of a universal top-up-only common rule.

## 7. SimCore Candidate C applicability

SimCore Candidate C currently has no authorized Source History Store, durable cache, retrieval index, or periodic history refresh.

Therefore this review does not activate Candidate C or authorize implementation.

If `CC-3 Source History Store / Lifetime / Retrieval` later creates:

```text
authoritative history index
+ local bounded object cache
```

then the child design should explicitly answer:

```text
What is bootstrap hydration?
What is steady-state change discovery?
How are new objects found?
How are changed revisions found?
How are deletions/expiry found?
When is full reconciliation required?
What bounded fallback exists when delta/index authority is unavailable?
```

A possible design may use missing-object top-up, but only if its authority/revision model proves that changed existing objects cannot be missed.

Candidate C already requires:

```text
no arbitrary full transcript scan
bounded records
bounded retrieval
cost proportional to active object/query rather than total conversation age
```

The top-up incident reinforces those cost boundaries without selecting a storage algorithm.

## 8. Acceptance pattern for future refresh-capable systems

When a project introduces broad bootstrap hydration plus periodic refresh, review at least:

1. lifecycle separation: bootstrap/recovery vs steady-state refresh;
2. authoritative change-discovery source;
3. addition handling;
4. update/revision handling;
5. deletion/expiry handling;
6. negative-cache/suppression invalidation;
7. bounded network / I/O / CPU cost;
8. recovery path when local cache/index is lost;
9. concurrency with writes;
10. evidence that full hydration is not accidentally replayed on ordinary refresh unless required.

This is an analysis/acceptance checklist, not a repository-mandated implementation API.

## 9. Promotion decision

```text
NEW RCR = NO
TOP-UP-ONLY AS UNIVERSAL RULE = REJECT
DOMAIN/SHARED GUARDRAIL = KEEP
POCKETRISU PLUGIN-STORAGE INVARIANT = ADOPTED / PROJECT-OWNED
SIMCORE CC-3/CC-9 INPUT = YES, FUTURE-ONLY
```

Revisit repository-wide promotion only if multiple independent projects need a common lifecycle rule that cannot be adequately expressed through the existing `D04/D11/D12/D13` discipline.

Even then, promote a lifecycle/effect-scope principle rather than a particular missing-key top-up algorithm.

## 10. Transaction anomalies

Two direct-main documentation writes occurred accidentally during this review because a branch parameter was omitted before the review branch existed:

```text
1. one-line placeholder write
→ immediately deleted in next commit

2. full draft audit write
→ immediately deleted in next commit
```

No runtime/product/release files were touched. Each accidental file was removed before the normal branch/PR transaction resumed. The events remain in Git history and are recorded here rather than hidden.

These anomalies do not authorize direct-main writes and do not weaken the repository main-write contract.

During the same interval, unrelated common Agent Skill work advanced `main` via PR #1216. The review branch was therefore created from then-current main after both direct-main reversions and that unrelated merge.

## 11. Transaction scope

This review is documentation/policy only.

```text
repository common-rule body = UNCHANGED
runtime change               = NONE
storage implementation       = NONE
network behavior             = NONE
SimCore implementation       = NONE
release change               = NONE
production change            = NONE
```
