# Feature-ID: BOUNDED-ENTITY-HANDOFF-UNIQUE-RESOLUTION

## Problem / evidence

RisuBard release `a97c0d8afddee16d40590ed2b1c3c2e1b3958730` demonstrates a useful retrieval-safety pattern: when model-visible character lore identifies an entity, pass only bounded identity metadata into canonical-memory retrieval, resolve only unique exact title/alias matches, reject ambiguity, and keep the existing retrieval budgets authoritative. This is credible external code-level evidence, but PocketRisu does not yet have a mapped equivalent ownership boundary, so evidence remains MEDIUM for PocketRisu.

## Minimal safe scope

Add a small runtime-neutral entity-hint contract at an existing PocketRisu narrative-memory/retrieval boundary only after such a boundary is identified. The first slice should support only character hints composed of bounded names/aliases, exact normalized matching, unique-match acceptance, ambiguity rejection, and existing downstream document/token caps. Do not include lore bodies, summaries, fuzzy search, automatic entity creation, or new persistence.

## Ownership boundaries

- Producer: the already-selected, model-visible character/lore context owner.
- Contract: runtime-neutral bounded entity-hint metadata.
- Consumer: existing PocketRisu narrative-memory/retrieval candidate selector.
- Persistence: none in the minimal slice.
- Server/device: no system/runtime/service-manager changes.

## Proposed mechanism

1. Producer derives `{ kind: 'character', names: string[] }` only from already-selected model-visible identity metadata.
2. Bound the payload before transport. Initial limits may mirror source evidence (12 hints, 16 names per hint, 128 characters per name) only as conservative starting values; PocketRisu should validate appropriate limits.
3. Consumer normalizes names using the same canonical title/alias normalization used by its entity index.
4. Match only eligible active character entities.
5. Accept an entity only when the supplied names resolve to exactly one canonical entity; zero or multiple matches add no direct candidate.
6. Merge accepted entities into the existing candidate set without changing downstream document-count/token budgets.

## Compatibility / invariants

- Metadata-only: lore body, generated summary, private notes, and arbitrary prompt text never enter the hint payload.
- Hints cannot bypass existing retrieval eligibility or token/document budgets.
- Ambiguity is fail-closed: multiple matches select none.
- No fuzzy matching in the first slice.
- Hints are advisory retrieval metadata, not persistence authority.
- Preserve all PocketRisu save/integrity optimizations, targeted V3 plugin reload, runit, no Android server-phone notifications, no visibility/pagehide forced DB flush, and `flushServerDbKeepalive()` no-op.

## Validation / acceptance

Focused tests must prove:
- transport rejects/ignores over-limit hints and names;
- lore body/summary/private text is absent from serialized hints;
- a unique exact normalized alias/title match selects the correct entity;
- an alias shared by two eligible entities selects neither;
- inactive/ineligible entities are not selected;
- candidate merging is deterministic;
- pre-existing document-count and token budgets remain unchanged and authoritative;
- no extra request replay or persistence write is introduced.

Acceptance requires a concrete PocketRisu owning interface and green focused tests against that interface.

## Risk / blast radius

Risk is LOW if kept advisory, metadata-only, exact-match, and non-persistent. The blast radius increases to MEDIUM if fuzzy matching, prompt text, cross-chat/global identity leakage, or new persistence is added; those changes require a separate design.

## Rollback / fallback

The feature must be removable by ignoring the optional entity-hint field. Existing retrieval without hints remains the fallback path. No migration or stored data rollback should be required.

## Dependencies

A concrete PocketRisu narrative-memory/retrieval boundary and entity title/alias ownership map must exist or be identified. This unresolved dependency keeps the lifecycle at `DESIGN_NEEDED`.

## PR decomposition

1. Contract + pure normalization/unique-resolution helper + focused unit tests, with no caller enabled.
2. One producer path that emits bounded metadata-only hints.
3. One consumer integration that merges unique resolved entities under unchanged retrieval budgets, plus integration tests.

Each slice must remain independently revertible; do not combine unrelated cleanup.
