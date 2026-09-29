# SimCore Fusion Core Contract Freeze v1 - 2026-09-29

Status: **FROZEN DESIGN CONTRACT SET / PRE-IMPLEMENTATION / NO RUNTIME, RELEASE, OR PRODUCTION AUTHORITY**

Tracking:
- Fusion architecture: #2961
- contract-freeze owner: #3133
- legacy supersession owner: #3072
- RisuBard donor review: #3130
- donor watch and donor-intake freeze: #3131

## 1. Purpose

This document freezes the semantic ownership and bridge contracts required before the large integrated SimCore Fusion build.

It does not implement Fusion. It defines the seams that implementation must respect.

Core rule:

```text
one semantic field
→ one canonical writer
→ versioned contract
→ deterministic validation
→ explicit provenance
→ no hidden fallback owner
```

Broad donor discovery is no longer part of the normal path. A new donor is relevant only when implementation proves a current-scope requirement has no capable owner.
## 2. Point-in-time authority snapshot

Observed when this contract set was materialized:

```text
main
= a2c68cffd695fd837282a67f79bbca662500d11d

production
= SimCore 0.70.11
= LIVE_PASS

release-simcore
= 01769eb6db7244e3682bb8ba6001d89aea4e0ed8

current priority
= POST_07011_NEXT_STEP_REVIEW

current architecture checkpoint
= M2-6

provider cache
= UNVERIFIED
```

This block is historical freeze evidence, not a live authority locator. Mutable current truth remains owned by `product-manifest.json`, `release-simcore`, current SimCore guidance, Git/CI, and the repository control plane.

## 3. Current-production preservation boundary

Until a separately proven Fusion cutover:
- SimCore 0.70.11 / M2-6 remains the current production architecture;
- Mode A/B/C and `B_START / B_CONTINUE / B_END` remain current Control semantics;
- Broadcast lifecycle and End Authority remain current Control semantics;
- COMMUNITY / Knowledge, user control, secondary-character activation, exposure, secret, and front boundaries remain preserved;
- current runtime validation/commit authority remains preserved;
- current production prompt ordering remains `CHAT_HISTORY → CURRENT_USER → SIMCORE_RUNTIME`;
- `SIMCORE_RUNTIME` remains the final tail authority.
The future Fusion packet topology defined here is a pre-implementation contract. It does not change current production bytes.

No clause in this document authorizes:
- plugin/runtime source mutation;
- `release-simcore` mutation;
- production deployment;
- version bump;
- issue retirement solely because a replacement is designed;
- third-party code import across an unresolved license/provenance boundary.

## 4. Plane ownership

| Plane | Canonical responsibility | Must not own |
| --- | --- | --- |
| Control | A/B/C, B lifecycle, Broadcast/COMMUNITY/Knowledge policy, exposure, secret/front policy, user control, final utilization permission | deterministic game state, long-term memory storage, retrieval indexes |
| Runtime | current deterministic state and deterministic validation/commit | narrative long-term memory, retrieval truth, exposure-policy elevation |
| Memory & Knowledge | Source Ledger, StoryWorldlines, semantic projections, Knowledge Registry, Curated Overlay, Reference Library, retrieval | current Runtime state, Control exposure decisions |
| Presentation | `SecondaryOutputTask` routing and secondary surface adapters | duplicate Runtime/Memory canonical state |
| Composer / Host | one host lifecycle owner, snapshot capture, packet ordering, token budget, composition diagnostics | semantic truth, exposure-policy ownership |

## 5. Global semantic-writer matrix

| Semantic family | Canonical writer |
| --- | --- |
| host-observed chat/request material | host, captured by Composer as evidence |
| A/B/C and Broadcast lifecycle | Control |
| exposure / user-control / secret utilization policy | Control |
| current vars/time/scenario/front/check/fight/action/choice/checkpoint/live subsystem state | Runtime |
| source identity/revision/activity/acceptance | Source Ledger / Reconciler |
| fictional branch/worldline topology | StoryWorldline Registry |
| semantic interpretation proposal | Semantic Observer, proposal only |
| durable entity/fact/relation/correction state | Knowledge Registry / Curated Overlay |
| conversational-memory retrieval selection | Memory Retrieval/Budget owner |
| canon/lore/reference retrieval selection | Reference Library retrieval owner |
| secondary-output task lifecycle | Presentation task router |
| final prompt region ordering/budget | Composer |
| composition diagnostics | Composer via `CompositionReceipt.v1` |

A reader may consume another plane's contract. Consumption never grants write authority.

Field ownership rule for every contract: the listed producer owns envelope, identity, lifecycle, and diagnostic fields it creates; referenced semantic fields retain the authority of their source contract/plane; the listed canonical semantic owner is the only writer of owned semantic state; provenance references are immutable evidence links. Consumers cannot rewrite any of these by reading the contract.

## 6. Identity model

Fusion uses separate identities because one identifier cannot safely represent host request retries, source revisions, fictional branches, and derived semantic work.

Required identity concepts:
- `conversation_id`: stable conversation identity when available;
- `logical_turn_id`: stable logical user-turn identity across host retries;
- `request_attempt_id`: one host execution attempt, diagnostics only;
- `source_id`: stable logical source message/item identity;
- `source_revision_id`: immutable identity for one exact source revision;
- `worldline_id`: fictional continuity branch identity;
- `runtime_epoch`: plugin/runtime lifecycle epoch;
- `runtime_state_version`: monotonic Runtime commit identity;
- contract-specific IDs such as `observation_id`, `patch_id`, `query_id`, `packet_id`, and `task_id`.

When the host does not provide a stable native identity, the adapter may generate a persistent local identity only if it records `identity_origin=derived` and the deterministic derivation/persistence rule. Missing authority must never be disguised as a native host ID.

Timestamps are evidence and ordering aids. They are not sufficient idempotence keys by themselves.

## 7. Common contract envelope and versioning

Every core contract carries:
- `contract_type`;
- `contract_version`;
- its contract-specific stable ID;
- `created_at` or capture time when meaningful;
- producer identity/version;
- provenance references;
- content or canonical-payload fingerprint.
Compatibility rules:
- unknown optional fields may be ignored by a v1 consumer;
- a consumer must not reinterpret a known field with a new meaning inside v1;
- adding a new required field, changing ownership, changing identity semantics, or changing an enum's meaning requires a new major contract version;
- malformed `contract_type` or unsupported major version fails closed for that contract;
- consumers must not silently coerce malformed required fields into valid state;
- diagnostic-only fields do not become semantic ownership.

Hash rules:
- semantic/idempotence hashes use canonical serialization of the semantic payload;
- diagnostic timestamps, latency, transient attempt numbers, and display-only labels are excluded unless explicitly declared semantic;
- the exact canonical serialization algorithm must be fixed before code implementation.

## 8. Contract 1 - `HostTurnSnapshot.v1`

### Purpose and ownership

Purpose: bounded, retry-stable capture of the host-observed conversation/request state used for source reconciliation and Composer planning.

Producer: Composer / Host capture owner.

Canonical semantic owner: the host owns the original material; the snapshot is evidence, not a replacement host truth database.

Allowed consumers:
- Source Ledger / Reconciler;
- Control;
- Runtime send preparation;
- Composer diagnostics.

Stable identity:
`snapshot_id = logical_turn_id + active_source_set_fingerprint + host_history_fingerprint + runtime_epoch`.

`request_attempt_id` may differ across retries without changing `snapshot_id` when semantic host input is unchanged.
Required fields:
- `snapshot_id`;
- `conversation_id` or explicit `UNKNOWN`;
- `logical_turn_id`;
- `request_attempt_id`;
- `runtime_epoch`;
- ordered `active_history_sources[]` with host/source identity and content fingerprints;
- `current_user_source`;
- `host_history_fingerprint`;
- `host_retry_key`;
- `excluded_injected_regions[]`;
- capture provenance.

Lifecycle: `CAPTURED → RECONCILED`, or `STALE / INVALID`.

Validation:
- current user must occur exactly once in the snapshot model;
- injected Memory/Reference/Runtime regions must not masquerade as host history;
- ordered source fingerprints must match captured content;
- retry-equivalent input must produce the same semantic snapshot identity.

UNKNOWN / malformed / stale:
- unknown host native IDs remain explicitly derived/unknown;
- malformed source ordering blocks reconciliation mutation;
- stale snapshot may be used for diagnostics only and must not mutate Source Ledger.

Forbidden effects:
- no direct Runtime state write;
- no Knowledge write;
- no prompt injection by the snapshot itself.

Minimum fixtures:
- ordinary turn;
- identical beforeRequest retry;
- edited user source;
- reroll/swipe source-set change;
- injected-memory exclusion;
- missing host-native ID.

Version rule: breaking identity/order/source-classification changes require `HostTurnSnapshot.v2`.
## 9. Contract 2 - `RuntimeStateCapsule.v1`

### Purpose and ownership

Purpose: bounded publication of current deterministic Runtime truth to other Fusion planes.

Producer and canonical semantic owner: Runtime Plane.

Allowed consumers:
- Control;
- Memory/Knowledge compiler;
- MemoryQuery compiler;
- Composer diagnostics;
- Presentation where an explicit read projection is needed.

Stable identity:
`capsule_id = runtime_epoch + runtime_state_version + canonical_state_fingerprint`.

Required fields:
- `capsule_id`;
- `runtime_epoch`;
- `runtime_state_version`;
- `conversation_id`;
- active `worldline_id`;
- producing `logical_turn_id`;
- current accepted/provisional source refs relevant to the commit;
- `state_sections`;
- per-section or per-field provenance;
- canonical state fingerprint.

Minimum `state_sections` cover the required Fusion profile as applicable:
- vars and derived deterministic values;
- time / `time_epoch`;
- scenario act;
- secret tier state;
- fronts and surfaced stage;
- checks / fight;
- actions/events/choices;
- checkpoint identity/content reference;
- board/messenger/shop/quest/party/calendar live-state projection;
- pending one-shot notifications/current UI state where consumers genuinely need them.

Lifecycle: `COMMITTED → SUPERSEDED_BY_NEWER_STATE`. Capsules are immutable after publication.

Validation:
- state version must be monotonic inside a runtime epoch;
- deterministic recomputation must match published deterministic fields;
- memory-derived narrative claims cannot overwrite capsule values;
- Control-owned visibility cannot be elevated by Runtime.

UNKNOWN / malformed / stale:
- a deterministic field not known by Runtime remains unknown; it is not filled from memory;
- malformed capsule is rejected by consumers;
- stale capsule may support historical diagnostics but not current query scope.

Provenance:
every state section must identify Runtime as writer and the commit/source evidence that caused the state.

Forbidden effects:
- consumers cannot write back through the capsule;
- Memory/Knowledge cannot reinterpret the capsule as narrative-source authority;
- Presentation cannot mutate live state from a read projection.

Minimum fixtures:
- deterministic state equality against v1.13 fixtures;
- monotonic version;
- checkpoint restore;
- secret/private section preservation;
- stale-capsule rejection;
- narrative claim conflicting with Runtime truth.

Version rule: breaking state-section meaning/ownership requires `RuntimeStateCapsule.v2`.
## 10. Contract 3 - `SourceRevision.v1`

### Purpose and ownership

Purpose: immutable revision record for host/user/model/source material, including activity and acceptance state.

Canonical owner: Source Ledger / Reconciler.

Producer: Reconciler from `HostTurnSnapshot.v1`, provisional output capture, import, or explicit source operations.

Allowed consumers:
- Semantic Observer/Compiler;
- StoryWorldline Registry;
- Runtime reconciliation;
- Memory/Reference retrieval;
- Composer diagnostics.

Stable identity:
- `source_id` remains stable across revisions of the same logical source;
- `source_revision_id` uniquely identifies exact bytes plus revision lineage;
- retries over identical bytes must not create duplicate revisions.

Required fields:
- `source_id`;
- `source_revision_id`;
- `source_kind`;
- conversation/logical-turn identity when applicable;
- role/author class;
- exact content fingerprint;
- parent/superseded revision references;
- `lifecycle_state`;
- `acceptance_state`;
- active/inactive reason;
- worldline association evidence;
- created/observed provenance.

Lifecycle states:
`PROVISIONAL / ACTIVE / INACTIVE_SUPERSEDED / INACTIVE_DELETED / INACTIVE_BRANCH / IMPORTED / REJECTED_INVALID`.
Acceptance states:
`UNSET / PROVISIONAL / ACCEPTED / REJECTED`.

Accept-on-continuation rule:
a model output becomes `ACCEPTED` only when a later authoritative host request observes that exact revision as active history in the continued conversation/worldline. A rerolled, deleted, or abandoned candidate before that proof never becomes accepted merely because it was generated.

Validation:
- exact content hash must match bytes;
- only one active revision per logical source unless the host explicitly exposes multiple active variants;
- inactive revisions remain durable evidence but are retrieval-ineligible for current generation by default;
- acceptance transition is idempotent.

UNKNOWN / malformed / stale:
- unknown lineage remains explicit;
- malformed revision never enters active retrieval;
- a stale revision can remain historical evidence but cannot influence current packets.

Forbidden effects:
- no direct Runtime state mutation;
- no permanent deletion solely to hide an inactive revision;
- no activation from a retrieval result.

Minimum fixtures:
- edit;
- delete;
- reroll;
- swipe;
- retry duplicate suppression;
- next-turn acceptance;
- abandoned provisional output;
- branch divergence/import.

Version rule: breaking lifecycle/acceptance/identity semantics require `SourceRevision.v2`.
## 11. Contract 4 - `StoryWorldlineEvent.v1`

### Purpose and ownership

Purpose: durable fictional-continuity topology separate from source revision history.

Canonical owner: StoryWorldline Registry.

Producers:
- validated Runtime checkpoint/branch operations;
- Reconciler when host branch/import evidence requires topology reconciliation.

Allowed consumers:
- Runtime;
- Source Ledger;
- Memory/Knowledge;
- retrieval;
- Composer;
- Presentation.

Stable identity:
`worldline_event_id = worldline_id + event_kind + authoritative_trigger_ref + parent_topology_fingerprint`.

Required fields:
- `worldline_event_id`;
- `worldline_id`;
- optional `parent_worldline_id`;
- `event_kind`;
- triggering source/checkpoint/import reference;
- effective logical turn;
- topology disposition;
- active/inactive consequence when applicable;
- provenance.

Event kinds include at minimum:
`ROOT / BRANCH / CHECKPOINT_CREATE / CHECKPOINT_RESTORE / ACTIVATE / DEACTIVATE / IMPORT / RECONCILE`.

Lifecycle: immutable event append; current topology is a derived projection.

Validation:
- parent cannot create a cycle;
- restore/activate target must exist or remain explicit UNKNOWN;
- branch creation must not rewrite SourceRevision lineage;
- checkpoint contents remain Runtime-owned even when topology references them.

UNKNOWN / malformed / stale:
- unknown parent/target blocks topology activation mutation;
- malformed event is rejected;
- stale topology projection is rebuilt from immutable events.

Forbidden effects:
- no source revision mutation merely because a worldline changes;
- no copying erased-future memory into the active worldline without an explicit authorized carry rule;
- no Runtime checkpoint-content rewrite by the registry.

Minimum fixtures:
- root;
- checkpoint create/restore;
- branch fork;
- inactive erased future retained but retrieval-blocked;
- import;
- cycle rejection;
- SourceLineage independence.

Version rule: breaking topology/event semantics require `StoryWorldlineEvent.v2`.

## 12. SourceLineage vs StoryWorldline

These axes must never collapse:

```text
SourceLineage
source_id A
  ├─ revision A1 ACTIVE
  ├─ revision A2 INACTIVE_SUPERSEDED
  └─ revision A3 ACTIVE
tracks: what bytes/revision existed and whether they are active

StoryWorldline
worldline W0
  ├─ checkpoint C1
  ├─ branch W1
  └─ branch W2
tracks: which fictional continuity branch is active
```
A SourceRevision can be associated with a worldline, but:
- editing one source is not automatically a fictional branch;
- creating a fictional branch is not automatically a source edit;
- a checkpoint rewind may inactivate influence from later sources without deleting their revision evidence.

## 13. Contract 5 - `SemanticObservation.v1`

### Purpose and ownership

Purpose: one structured semantic interpretation of a narrative source when natural-language inference is required.

Producer: unified Semantic Observer.

Canonical semantic owner of the observation record: unified Semantic Observer.

Semantic status: proposal/evidence only. The Observer owns the observation record, not Runtime or Knowledge truth.

Allowed consumers:
- Runtime validator;
- accepted-turn Memory/Knowledge compiler;
- Presentation task router;
- diagnostics.

Stable identity:
`observation_id = source_revision_id + observer_profile + observer_contract_version + semantic_input_context_hash`.

If those inputs match exactly, accepted-turn memory compilation must reuse the same valid observation rather than call another semantic model.

Required fields:
- `observation_id`;
- `source_revision_id`;
- `semantic_source_hash`;
- `worldline_id`;
- observer profile/model provenance;
- semantic input-context fingerprint;
- `runtime_delta_candidates`;
- `runtime_reasons`;
- `conflicts`;
- `detected`;
- optional `time_expression_candidate`;
- `events`, `facts`, `relations`;
- `knowledge_changes`;
- `promises_threads`;
- `entities_aliases`;
- `salience`;
- `memory_candidates`;
- optional `secondary_task_candidates`;
- validation disposition.

Lifecycle:
`PROVISIONAL → VALIDATED / PARTIALLY_VALID / REJECTED / REUSED_BY_ACCEPTED_COMPILER`.

Validation:
- source hash must match active referenced revision;
- candidate fields must pass deterministic owner-specific schemas/caps;
- Runtime deltas are applied only by Runtime validation;
- Knowledge candidates become durable only through `KnowledgePatch.v1`.

UNKNOWN / malformed / stale:
- ambiguous values remain UNKNOWN/conflict rather than fabricated;
- deterministic salvage may retain valid subfields;
- malformed required semantics fail open for current generation;
- stale observation cannot mutate current owners;
- normal operation does not retry until success.

Forbidden effects:
- no direct Runtime write;
- no direct Knowledge write;
- no exposure-policy elevation;
- no second ordinary semantic interpretation merely for another subsystem.

Minimum fixtures:
- no-LLM deterministic turn;
- one-call runtime semantic turn;
- accepted-turn reuse;
- malformed partial salvage;
- conflict/UNKNOWN;
- rerolled source becomes stale;
- secret candidate remains non-exposed.

Version rule: breaking candidate meaning/ownership requires `SemanticObservation.v2`.
## 14. Contract 6 - `KnowledgePatch.v1`

### Purpose and ownership

Purpose: validated proposal-to-commit boundary for durable knowledge/entity/fact/relation/correction state.

Producer: Memory/Knowledge semantic compiler, usually from a valid `SemanticObservation.v1` or explicit curated user action.

Canonical commit owner:
- Knowledge Registry for durable entity/fact/relation identity state;
- Curated Overlay for user corrections, pins, merges, aliases, and explicit curation.

Allowed consumers after commit:
- Memory/Reference retrieval;
- Control;
- Composer/UI;
- diagnostics.

Stable identity:
`patch_id = source_revision_id + observation_or_curated_action_id + target_key + operation + patch_payload_hash`.

Required fields:
- `patch_id`;
- patch class and target store;
- target entity/key;
- operation;
- proposed value/change;
- source revision/provenance;
- `worldline_id` or explicit cross-worldline scope;
- time/turn scope;
- truth/assertion class;
- knowledge owner/scope;
- visibility class/policy reference;
- confidence;
- disposition;
- correction/supersession reference when applicable.

Allowed operations include explicit, schema-owned forms such as `UPSERT / CORRECT / TOMBSTONE / MERGE / PIN / UNPIN`.
Lifecycle:
`PROPOSED → VALIDATED → COMMITTED`, or `REJECTED / SUPERSEDED`.

Validation:
- target store must own the field;
- active source/provenance must be valid;
- a patch cannot overwrite current Runtime truth;
- curated correction outranks rebuildable projection only inside its declared scope;
- merge/alias operations must preserve audit provenance.

UNKNOWN / malformed / stale:
- unknown identity stays unresolved;
- malformed patch is rejected;
- stale source-derived patch cannot commit against current active state;
- rebuildable projections may be recomputed without rewriting curated intent.

Forbidden effects:
- no Runtime current-state write;
- no SourceRevision activity change;
- no secret/exposure elevation;
- no destructive loss of correction history.

Minimum fixtures:
- new fact;
- relation;
- alias merge;
- user correction;
- pin/unpin;
- stale-source rejection;
- contradiction with Runtime;
- worldline-scoped fact.

Version rule: breaking operation/target/precedence semantics require `KnowledgePatch.v2`.

## 15. Contract 7 - `MemoryQuery.v1`

### Purpose and ownership

Purpose: deterministic request from Composer to Memory retrieval, carrying scope, policy constraints, and budget without transferring Control ownership.
Producer: Composer / Host query compiler.

Policy inputs:
- Control-owned utilization/exposure policy reference;
- current `RuntimeStateCapsule.v1`;
- current request intent/source refs;
- active Source/Worldline scope.

Canonical semantic owner: query construction belongs to Composer; exposure decisions remain Control-owned.

Allowed consumer: Memory Retrieval/Budget owner.

Stable identity:
`query_id = logical_turn_id + active_worldline + active_source_set_hash + runtime_capsule_id + control_policy_fingerprint + query_profile + budget_fingerprint`.

Required fields:
- `query_id`;
- conversation/logical-turn identity;
- active `worldline_id`;
- current user/source reference and query intent fingerprint;
- `runtime_capsule_id`;
- Control policy reference/fingerprint;
- retrieval lanes;
- source/worldline/time/turn scope;
- visibility eligibility constraints;
- exclusion set;
- per-lane and total token/item budgets;
- ranking profile;
- deadline/fail-open policy.

Lifecycle: immutable request, `ISSUED → SATISFIED / EMPTY / TIMEOUT / STALE / FAILED`.

Provenance:
- retain exact references/fingerprints for the HostTurnSnapshot/current source set, RuntimeStateCapsule, Control policy, active worldline, and query profile that produced the query;
- query text/intent derived from current input must retain its source fingerprint rather than becoming unattributed free text.

Validation:
- scope must reference current active source/worldline evidence;
- budget cannot be negative or exceed configured hard ceiling;
- Composer cannot widen Control-provided visibility;
- retry-equivalent input yields the same semantic query identity.

UNKNOWN / malformed / stale:
- unknown required scope produces bounded empty/fail-open behavior, not invented scope;
- malformed query is rejected;
- stale query result is not injected.

Forbidden effects:
- no Knowledge/Runtime mutation;
- no exposure-policy authoring;
- no implicit reference-library query unless a declared lane requests it.

Minimum fixtures:
- ordinary query;
- zero-result query;
- retry identity;
- worldline change invalidation;
- budget ceiling;
- Control exclusion;
- Memory timeout.

Version rule: breaking scope/budget/policy semantics require `MemoryQuery.v2`.

## 16. Contract 8 - `MemoryPacket.v1`

### Purpose and ownership

Purpose: selected long-horizon conversational memory evidence returned under a `MemoryQuery.v1`.

Producer: Memory Retrieval/Budget owner.

Canonical semantic owner of packet selection: Memory Retrieval/Budget owner.

Semantic status: packet selection is retrieval output. Backing facts retain their Source/Knowledge owners; the packet is not Runtime or exposure truth.

Allowed consumers:
- Control final utilization gate;
- Composer;
- diagnostics/UI.

Stable identity:
`memory_packet_id = query_id + retrieval_corpus_version + selected_item_set_hash + ranking_profile_version`.

Required fields (packet):
- `memory_packet_id`;
- `query_id`;
- retrieval corpus/index version;
- packet status;
- total token/item cost;
- omitted/truncated reason summary;
- selection provenance.

Each item requires:
- durable item/projection identity;
- backing `source_revision_id` set;
- active-source proof/fingerprint;
- `worldline_id` and scope;
- time/turn scope;
- truth/assertion class;
- knowledge owner/scope;
- visibility class;
- confidence/disposition;
- relevance/rank evidence;
- rendered content fingerprint and token cost.

Lifecycle: immutable `READY / EMPTY / STALE / UNAVAILABLE`.

Validation:
- all current-generation items must derive from active eligible sources or explicit durable curated state;
- worldline and query scope must match;
- packet total must respect budget;
- retrieval eligibility does not imply Control utilization permission.

UNKNOWN / malformed / stale:
- unknown provenance item is excluded from model-facing packet;
- malformed item is dropped with diagnostic reason;
- stale packet is discarded, not injected;
- service outage means no Memory packet and current generation continues fail-open.

Forbidden effects:
- no direct prompt injection without Composer/Control;
- no Runtime/Knowledge write;
- no inactive revision influence;
- no secret/private leakage.

Minimum fixtures:
- lexical/vector hybrid selection;
- inactive-source exclusion;
- worldline exclusion;
- curated correction precedence;
- budget truncation;
- empty packet;
- stale packet;
- service unavailable.

Version rule: breaking item provenance/selection semantics require `MemoryPacket.v2`.

## 17. Contract 9 - `ReferencePacket.v1`

### Purpose and ownership

Purpose: selected canon/original-work/lorebook/reference evidence kept distinct from conversational Memory.
Producer: Reference Library retrieval owner.

Canonical semantic owner of packet selection: Reference Library retrieval owner.

Canonical owner of stored reference material: Reference Library, subject to source provenance/license metadata. Packet selection itself is derived.

Allowed consumers:
- Control utilization gate;
- Composer;
- UI/diagnostics.

Stable identity:
`reference_packet_id = reference_query_scope_hash + reference_corpus_version + selected_reference_set_hash + budget_fingerprint`.

Required fields:
- `reference_packet_id`;
- request/query association;
- reference corpus/revision identity;
- reference lane/kind;
- source title/locator/provenance;
- selected excerpt/content fingerprint;
- canon/lore/reference assertion class;
- fictional/world scope where applicable;
- visibility/knowledge constraints;
- confidence/disposition if interpreted;
- token cost;
- omitted/truncated reasons.

Lifecycle: immutable `READY / EMPTY / STALE / UNAVAILABLE`.

Validation:
- reference revision must exist and be permitted for the configured use;
- reference evidence never becomes host history;
- reference evidence never overrides current Runtime state;
- Control owns final utilization/exposure.

UNKNOWN / malformed / stale:
- unknown provenance blocks model-facing use;
- malformed or stale entries are omitted;
- unavailable optional references fail open.

Forbidden effects:
- no SourceRevision mutation;
- no Runtime/Knowledge write by packet consumption;
- no hidden conversion into conversational memory without a separately validated KnowledgePatch/source rule.
Minimum fixtures:
- canon reference;
- lorebook reference;
- conflicting reference vs Runtime current state;
- visibility exclusion;
- budget truncation;
- stale corpus version;
- unavailable optional lane.

Version rule: breaking provenance/assertion/scope semantics require `ReferencePacket.v2`.

## 18. Contract 10 - `SecondaryOutputTask.v1`

### Purpose and ownership

Purpose: deterministic routing contract for explicit or due secondary-generation/presentation work.

Canonical task owner: Presentation task router.

Producers:
- validated explicit user interaction;
- deterministic due/event scheduler;
- validated SemanticObservation candidate when policy permits.

Allowed consumers:
- Presentation adapters/renderers;
- optional bounded generation adapter;
- diagnostics/UI.

Stable identity:
`task_id = kind + trigger_identity + worldline_id + deterministic_payload_hash + renderer_profile`.

Required fields:
- `task_id`;
- `kind`;
- trigger and input-scope references;
- `worldline_id`;
- model policy;
- output schema;
- renderer ID/profile;
- visibility scope/policy reference;
- retry policy;
- fail-open policy;
- effect destination;
- payload/provenance fingerprint.

Lifecycle:
`SCHEDULED → READY → RUNNING → COMMITTED`, with `SKIPPED / FAILED / STALE / CANCELLED`.
Validation:
- current trigger/worldline must still be active;
- one task identity may commit at most once;
- adapter cannot mutate Runtime/Memory canonical state directly;
- any semantic state change produced by explicit generation must route through the proper Runtime/Knowledge validation contract.

UNKNOWN / malformed / stale:
- unknown visibility or owner blocks presentation;
- malformed task is rejected;
- stale task is cancelled/skipped;
- optional surface failure does not fail the main response.

Forbidden effects:
- no duplicate state database;
- no mandatory ordinary-turn LLM call merely to keep a surface alive;
- no retry-until-success loop;
- no hidden Control/exposure decision.

Minimum fixtures:
- deterministic render-only task;
- explicit messenger/board-like generation;
- due event;
- retry duplicate suppression;
- stale worldline cancellation;
- optional generation failure;
- secret visibility rejection.

Version rule: breaking task/effect/model-policy semantics require `SecondaryOutputTask.v2`.

## 19. Derived diagnostic contract - `CompositionReceipt.v1`

`CompositionReceipt.v1` is frozen as the Composer-owned derived diagnostic receipt. It is not an eleventh canonical semantic state owner.

Purpose:
- prove what Composer attempted to place in one request;
- make budget, truncation, exclusion, ordering, and retry behavior inspectable;
- support RisuBard-style request-manifest observability without creating a second truth database.
Required fields:
- `composition_id`;
- logical turn and request attempt;
- host snapshot ID;
- runtime capsule ID;
- MemoryQuery/MemoryPacket/ReferencePacket refs when used;
- included regions with source packet refs and token/byte cost;
- excluded regions with reason;
- truncated regions with reason and before/after cost;
- required-overflow status;
- final region ordering;
- final prompt/request fingerprint where safe;
- retry/idempotence identity;
- Composer version/profile;
- latency/budget diagnostics.

Rules:
- never store secret raw prompt material merely for diagnostics;
- required-region overflow fails visibly instead of silently dropping the required region;
- optional regions may be omitted/truncated only under declared deterministic policy;
- the receipt cannot override Control, Runtime, Memory, or Reference truth;
- a retry-equivalent composition must preserve semantic region identity/order unless an authoritative input changed.

Version rule: breaking diagnostic identity/order/budget semantics require `CompositionReceipt.v2`.

## 20. Candidate Fusion request flow

Target pre-cutover design:

```text
host request
→ HostTurnSnapshot.v1
→ reconcile SourceRevision / StoryWorldline
→ settle prior accepted continuation evidence
→ Control mode + exposure policy
→ Runtime deterministic send/update preparation
→ RuntimeStateCapsule.v1
→ MemoryQuery.v1
→ MemoryPacket.v1 + ReferencePacket.v1
→ Control final utilization gate
→ Composer budget/order
→ CompositionReceipt.v1
→ main model request
```

Candidate packet topology:

```text
HOST HISTORY
→ MEMORY REFERENCE
→ CANON / LORE / REFERENCE
→ OPTIONAL SECONDARY SURFACE CONTEXT
→ CURRENT USER
→ SIMCORE RUNTIME
```

Hard rule: external Memory/Reference packets never masquerade as host chat history, and `SIMCORE_RUNTIME` remains the final tail in the candidate unless a separately authorized contract later replaces that invariant.

## 21. Accepted-turn output flow

```text
main output stream
→ streaming settle / one-turn reentry guard
→ deterministic output parser/effects
→ optional SemanticObservation.v1 (0 or 1 ordinary semantic LLM read)
→ Runtime validates and commits allowed current-state deltas
→ RuntimeStateCapsule.v1
→ SourceRevision.v1 PROVISIONAL for model output
→ optional SecondaryOutputTask scheduling
→ next authoritative user request
→ Reconciler observes prior exact output revision active in continued history
→ prior output becomes ACCEPTED
→ if reusable SemanticObservation exists: memory compiler reuses it
→ otherwise one deferred semantic compiler call if semantic projection is needed
→ KnowledgePatch.v1 validation/commit
→ rebuildable projections/indexes
```
A discarded/rerolled output that is never observed as active continuation does not acquire ACCEPTED status.

## 22. Semantic LLM accounting contract

Ordinary-turn target:

| Case | Semantic LLM calls |
| --- | ---: |
| deterministic-only turn, no long-term semantic projection needed | 0 |
| output needs immediate runtime semantic inference | 1 immediate |
| accepted turn did not need immediate inference but needs durable semantic projection | 1 deferred |
| rerolled/discarded turn with no immediate semantic need | 0 |
| accepted turn with reusable immediate observation | 1 total, reused |
| explicit user-triggered secondary generation | separate bounded call, classified as explicit generation |

Hard diagnostics:
- `semantic_llm_calls <= 1` for ordinary semantic interpretation;
- `semantic_source_hash`;
- `observation_reused_by_memory`;
- `extra_generation_calls[]` with reason;
- `retry_calls`;
- `retrieval_rerank_calls`;
- `observer_skipped_reason`.

Normal target:
```text
retry_calls = 0
independent_memory_critic_calls = 0 when observation is reusable
```

A second Critic/reranker semantic call is escalation-only and must expose an explicit reason. It is not a normal pipeline stage.
## 23. Failure and fail-open matrix

| Failure | Required behavior |
| --- | --- |
| Memory service unavailable/timeout | omit Memory packet, record receipt/diagnostic, continue main generation |
| Reference service unavailable for optional lane | omit reference lane, continue |
| stale Memory/Reference packet | discard, never inject |
| malformed SemanticObservation | deterministic salvage valid subfields; otherwise no semantic mutation; no retry-until-success |
| observer blocked/timeout | current generation continues; accepted-turn deferred compiler may recover later |
| malformed RuntimeStateCapsule | consumer rejects capsule; no memory guess fills Runtime truth |
| unknown exposure/visibility | fail closed to non-exposure |
| stale SecondaryOutputTask | cancel/skip task |
| optional Presentation failure | main response remains valid |
| required Composer region exceeds hard budget | visible required-overflow failure; never silently drop required authority |
| unsupported contract major version | reject that contract, preserve explicit incompatibility |

Fail-open means "continue without the optional subsystem." It never means "invent substitute truth."

## 24. Security and exposure invariants

All model-facing Memory/Reference/Presentation material must preserve:
- source provenance;
- active source proof;
- worldline;
- time/turn scope;
- truth/assertion class;
- knowledge owner/scope;
- visibility class;
- confidence/disposition where applicable.

Control remains final utilization owner.

Therefore:
- unopened secrets remain unopened;
- unsurfaced fronts/backstage data remain non-public;
- private or character-limited knowledge cannot leak through retrieval;
- COMMUNITY receives exposed information only;
- a high retrieval score never grants visibility;
- a presentation adapter cannot bypass Control because it is "only UI".
## 25. Fixture and acceptance matrix before shadow implementation

A-D contracts are coherent only when fixtures cover at least:

| Area | Required fixture |
| --- | --- |
| host lifecycle | duplicate beforeRequest retry produces stable semantic snapshot/query/task identities |
| streaming | one model output commits Runtime/source effects once |
| edit | old source revision retained but inactive and non-influential |
| delete | deleted source retained as evidence and excluded |
| reroll/swipe | discarded candidate remains unaccepted/inactive |
| continuation | exact active prior output becomes ACCEPTED on next authoritative request |
| branch | SourceLineage preserved while StoryWorldline forks |
| checkpoint rewind | erased-future evidence retained but cannot leak into active worldline |
| import | imported source/worldline provenance explicit |
| Runtime conflict | deterministic Runtime value outranks extracted narrative claim |
| UNKNOWN | missing value stays UNKNOWN |
| secret/front | Memory/Reference/Presentation cannot expose non-public evidence |
| memory outage | main generation continues without Memory packet |
| stale retrieval | stale packet discarded |
| budget | required overflow visible; optional truncation deterministic |
| observer reuse | immediate valid observation reused by accepted-turn compiler |
| semantic calls | ordinary interpretation never exceeds one call without explicit escalation |
| secondary task | exactly-once commit and stale cancellation |
| update/unload | stale runtime epoch cannot commit late effects |
| provenance | every injected external item is traceable to source/reference authority |

Implementation may add more fixtures. It must not weaken these.

## 26. Donor and source basis

Current SimCore authority/preservation:
- `product-manifest.json`
- `docs/SIMCORE_GUIDELINES.md`
- `docs/CURRENT_DEVELOPMENT.md`
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
Fusion routing:
- #2961
- #3133
- `docs/SIMCORE_FUSION_LEGACY_PROGRAM_SUPERSESSION_INDEX_2026-09-28.md`

Donor/reference inputs:
- `products/simcore/reference/external-memory-integration/simcore-v1.13.0-user-upload.original.js`
- `products/simcore/reference/lightboard/2026-09-26/**`
- `products/simcore/reference/memory-donors/2026-09-26/**`
- `products/simcore/reference/feature-donors/2026-09-26/risupot_v1_1_5.js`
- NMOS role as captured in #2961/#3131;
- Archive Center role as captured in #2961/#3131;
- RisuBard product-integration donor #3130.

Legacy design donors remain routed by the supersession index, including 3M/Post-3M, Candidate C, Exposure M1, Temporal, Cache, SYS, and presentation research.

Donor code is not automatically authorized for copying. License/provenance review remains required where code reuse is considered.

## 27. Freeze order and implementation gate

Dependency order:

```text
A. identity + lineage
   HostTurnSnapshot.v1
   SourceRevision.v1
   StoryWorldlineEvent.v1

B. runtime + semantic bridge
   RuntimeStateCapsule.v1
   SemanticObservation.v1
   KnowledgePatch.v1

C. retrieval + delivery
   MemoryQuery.v1
   MemoryPacket.v1
   ReferencePacket.v1

D. presentation
   SecondaryOutputTask.v1

E. derived diagnostics
   CompositionReceipt.v1
```
A-D are the core semantic bridge set. E is a required observability surface but not a semantic truth owner.

No shadow implementation should begin from an alternate owner map.

Implementation may refine serialization details only when:
- producer and canonical owner stay unchanged;
- semantic meaning stays unchanged;
- identity/idempotence stays unchanged;
- required safety/provenance fields stay intact;
- no new canonical writer is introduced.

Any change to those boundaries reopens contract design rather than being treated as an implementation detail.

## 28. Shadow implementation entry conditions

After this contract set is merged and converged, the next implementation program may begin only with a bounded shadow architecture that:
- does not mutate production prompt bytes;
- does not replace current 0.70.11 runtime;
- introduces no second host-hook owner;
- starts Source Ledger/reconciliation/worldline/retrieval in observation/shadow mode;
- measures deterministic equivalence and latency/token/storage cost;
- proves idempotence before enabling prompt injection;
- keeps current production/reference baseline untouched.

The intended later program order remains:

```text
contract freeze
→ shadow Source Ledger / reconciliation / worldline / retrieval
→ unified Semantic Observer
→ Knowledge / Reference + Curated Overlay
→ Presentation adapters
→ Composer packet injection with final runtime tail
→ cache ABI rebase
→ bounded real-host acceptance
→ Fusion release candidate
→ proven cutover
```

## 29. Cutover non-authority

This document does not make Fusion current production.
Until explicit cutover proof:

```text
0.70.11 / M2-6 = current production architecture
Fusion contracts = future implementation contract set
```

Retirement remains proof-first. Existing paths are removed only after equivalent Fusion behavior is implemented and accepted.

## 30. Frozen disposition

```text
CORE CONTRACT SET
= FROZEN V1 DESIGN

CORE SEMANTIC CONTRACTS
= 10

DERIVED COMPOSER RECEIPT
= CompositionReceipt.v1
= REQUIRED OBSERVABILITY
= NOT A SEMANTIC TRUTH OWNER

CANONICAL WRITER RULE
= ONE WRITER PER SEMANTIC FIELD

SOURCE LINEAGE
!= STORY WORLDLINE

ORDINARY SEMANTIC LLM READS
<= 1 PER NARRATIVE SOURCE BY DEFAULT

CURRENT PRODUCTION
= 0.70.11 / M2-6
= UNCHANGED BY THIS DOCUMENT

RUNTIME / RELEASE / PRODUCTION AUTHORITY
= NONE

NEXT AFTER MERGE + CONVERGENCE
= BOUNDED SHADOW IMPLEMENTATION AUTHORITY/SCOPE
```
