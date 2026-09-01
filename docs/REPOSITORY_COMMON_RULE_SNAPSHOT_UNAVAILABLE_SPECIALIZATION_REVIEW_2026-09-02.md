# Repository Common Rule Review: Snapshot Unavailable Is Not Authoritative Empty (2026-09-02)

Status: **REVIEW PASS · NO NEW RCR · SPECIALIZE RCR-H03 + RCR-H08 · RCR-C10 REINFORCEMENT WHERE PARTIAL VIEWS APPLY · DOCS/AUDIT ONLY**

## 0. Question

Review the candidate principle:

```text
SNAPSHOT UNAVAILABLE
!=
AUTHORITATIVE EMPTY SNAPSHOT
```

and decide whether it deserves a new repository-wide common rule or should remain a specialization of existing hard invariants.

## 1. Verdict

```text
NEW RCR = NO

PRIMARY OWNERS
RCR-H03 · Preserve uncertainty and evidence fidelity
RCR-H08 · Unresolved conflicts fail closed to explicit uncertainty

SUPPORTING RULE WHEN THE INPUT IS PARTIAL/PROJECTED
RCR-C10 · Incomplete/projected views do not own deletion-by-omission
```

The candidate is important, but it does not establish a new constitutional principle beyond the existing hard-invariant distinction between known state and unresolved/unknown state plus the requirement to stop affected unsafe actions.

## 2. Exact existing common-rule coverage

### 2.1 RCR-H03

RCR-H03 already requires:

```text
UNKNOWN remains UNKNOWN until evidence resolves it
known zero != unknown where the distinction matters
missing evidence must not be fabricated into status/existence/state
```

An unavailable complete snapshot is therefore not evidence of an empty snapshot.

Canonical specialization:

```text
SNAPSHOT_UNAVAILABLE
→ UNKNOWN / UNAVAILABLE

NOT
→ EMPTY
```

### 2.2 RCR-H08

RCR-H08 already requires unresolved authority/evidence conflicts to fail closed for the affected unsafe action.

For a consumer whose correctness requires a complete snapshot:

```text
required complete snapshot unavailable
→ affected consumer admission/mutation stops
```

The common layer does not require every unrelated subsystem to stop.

Dependency-scoped containment remains project/domain owned.

### 2.3 RCR-C10 interaction

RCR-C10 applies when a consumer receives an incomplete/projected view rather than a proven complete authoritative snapshot.

In that case:

```text
omitted field/key
→ UNSPECIFIED
NOT DELETE
```

C10 therefore reinforces destructive-write safety, but it is not the primary owner of the unavailable-vs-empty distinction.

A snapshot may be wholly unavailable rather than merely partial; H03/H08 still cover that case without C10.

## 3. Primary production evidence: PocketRisu V2 preload

PocketRisu V2 synchronous storage consumers require the server-backed plugin store to be completely preloaded.

Observed failure mode:

```text
preload fails
→ V2 still starts
→ synchronous reads return null
→ plugin interprets null as no stored value
→ plugin writes defaults
→ real durable server values can be overwritten
```

Adopted invariant:

```text
complete-snapshot-required consumer
+ snapshot unavailable/incomplete
→ consumer must not start
```

The important semantic distinction is:

```text
availability failure
!=
authoritative empty state
```

PocketRisu also demonstrates correct failure containment: affected V2 runtime is disabled/removed while unrelated V3 consumers may continue when their own contract remains valid.

This is a strong domain specialization of H03/H08, not evidence that H03/H08 are insufficient.

## 4. Independent cross-project alignment

### 4.1 Usage Dashboard

Usage Dashboard cache/provenance diagnostics preserve distinct unknown states such as:

```text
write unknown-on-cache
read/no-write-value
TTL unknown-after-write
```

These states are not flattened into numeric zero, success, or absence.

This independently demonstrates the H03 pattern:

```text
not observed / not reported / unavailable
!=
known zero / known absence
```

The exact cache telemetry schema remains Usage Dashboard-owned.

### 4.2 SimCore Candidate C

Candidate C already distinguishes failures such as:

```text
OBJECT_NOT_FOUND
SUPPORT_UNAVAILABLE
SUPPORT_MISMATCH
```

This separation means:

```text
object proven absent
!=
support source unavailable
```

Again, the common principle is evidence-state fidelity plus fail-closed use, not a source-history-specific snapshot rule.

No Candidate C runtime/store is authorized by this review.

## 5. Why a new RCR would be duplicative

A hypothetical rule such as:

```text
RCR-C12 — Unavailable snapshots are not empty
```

would mostly restate two existing hard invariants:

```text
H03 → unknown/unavailable cannot be invented into known empty
H08 → unsafe dependent action stops until uncertainty is resolved
```

Creating another repository-wide rule would add numbering and maintenance without adding a distinct authority boundary.

The common layer should remain a small constitution rather than a catalog of every domain-shaped example of H03/H08.

## 6. Safe specialization template

Projects may specialize H03/H08 using a pattern like:

```text
consumer requires COMPLETE authoritative snapshot
        ↓
load / preload / fetch / hydrate
        ↓
PROVEN_COMPLETE
    → consumer may proceed under project policy

PROVEN_EMPTY
    → empty-state behavior may proceed

UNAVAILABLE / INCOMPLETE / UNKNOWN
    → do not reinterpret as empty
    → block only affected unsafe action/capability
    → preserve unrelated valid capabilities where possible
```

Important separation:

```text
PROVEN_EMPTY
!=
UNAVAILABLE
!=
INCOMPLETE
```

Projects retain ownership of exact state names, retry policy, admission lifecycle, error UI, cache/storage implementation, and recovery mechanism.

## 7. Destructive-default safety

The highest-risk anti-pattern is:

```text
read unavailable
→ return null/empty convenience value
→ initialize defaults
→ persist defaults
```

For authoritative/persistent state this can convert an availability incident into data loss.

Therefore, when complete state is required before destructive initialization or replacement:

```text
unavailable/incomplete evidence
→ no destructive default write
```

This conclusion follows from H03/H08 and, for partial replacement surfaces, C10.

## 8. What this review does not require

This review does not require:

- one repository-wide snapshot API;
- one `UNAVAILABLE` enum;
- mandatory retries;
- global process shutdown;
- disabling unrelated consumers;
- treating every cache miss as failure;
- treating every optional field as snapshot-critical;
- forbidding legitimate default initialization after authoritative absence is proven;
- persistence, history, or storage implementation in SimCore;
- any production/release mutation.

The rule applies only where the owning consumer contract says complete authoritative state is required for the affected action.

## 9. Legitimate empty-state case

This review must not convert true empty state into permanent uncertainty.

Example:

```text
owner proves authoritative store exists
+ complete read succeeds
+ key/object is absent under owning semantics
→ PROVEN_EMPTY / OBJECT_NOT_FOUND may be valid
```

Default initialization can then be valid if the project contract authorizes it.

The forbidden shortcut is:

```text
could not establish state
→ therefore state is empty
```

## 10. Relationship to RCR-C10

Use this decision table:

| Situation | Primary rule | Meaning |
| --- | --- | --- |
| complete authoritative read proves empty | project owner + H03 fidelity | empty is known |
| complete snapshot cannot be obtained | H03 + H08 | unavailable/unknown, affected unsafe action stops |
| projection/partial snapshot omits fields | C10 + H03 | omissions are unspecified, not deletion intent |
| authority/evidence conflict remains unresolved | H08 | explicit uncertainty and fail-closed affected action |

No new rule is necessary to cover the matrix.

## 11. Future SimCore Candidate C acceptance note

If a future Candidate C child design introduces a source-history store or other complete-snapshot consumer, acceptance should explicitly prove:

```text
history store unavailable / preload incomplete
→ HISTORY_UNAVAILABLE (or consumer-owned equivalent)
→ NOT EMPTY_HISTORY
→ no default/replacement/destructive mutation from that state
→ affected history-dependent feature fails closed
→ unrelated source/runtime capability remains independent where valid
```

This is an acceptance specialization, not authorization to implement Candidate C.

## 12. Reconsideration trigger

Re-open repository-wide promotion only if a future cross-project case demonstrates a **distinct principle not expressible by H03/H08/C10**.

Examples that alone are insufficient for promotion:

- another preload failure with the same unavailable-vs-empty shape;
- another cache API that distinguishes unknown from zero;
- another project-specific `UNAVAILABLE` enum;
- another fail-closed consumer admission rule.

Those are additional evidence for the existing hard invariants, not reasons to duplicate them.

A new rule is justified only if a genuinely new authority or lifecycle boundary emerges.

## 13. Repository mutation scope

This transaction intentionally changes only this review document.

```text
docs/REPOSITORY_COMMON_RULES.md = UNCHANGED
product runtime                    = UNCHANGED
production/release authority       = UNCHANGED
SimCore release branch             = UNCHANGED
```

## 14. Final classification

```text
CANDIDATE
Snapshot unavailable != authoritative empty

VERDICT
NO_NEW_RCR

OWNERSHIP
RCR-H03 + RCR-H08

SUPPORTING SPECIALIZATION
RCR-C10 when partial/projected omission semantics are involved

STATUS
REVIEW CLOSED
```
