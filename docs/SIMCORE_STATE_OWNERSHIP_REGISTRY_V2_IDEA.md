# SimCore State Ownership Registry v2 — IDEA

Status: `IDEA RECORDED · STATE AUTHORITY MAP · NO SCHEMA CHANGE · NO IMPLEMENTATION · NO RUNTIME CHANGE · POST-M2-3 REBASE REQUIRED WHERE PHYSICAL WRITERS MOVE`

Production authority while this registry is recorded: `release-simcore` v0.64.7.

Related:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_APPLICATION_SERVICE_BOUNDARY_MAP_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`
- `docs/SIMCORE_M2_4C_RUNTIME_MIRROR_OBSERVATION_RECEIPT_CONTRACT.md`
- `docs/SIMCORE_M2_4D_OUTPUT_FINALIZATION_OWNERSHIP_DECISION.md`

## 1. Purpose

Freeze a state-authority map for SimCore without changing the current state schema.

For each meaningful state family, this registry records:

```text
semantic owner
canonical writer
additional authorized writers
readers
persistence class
lifetime
forbidden alternate writers
migration authority
current physical debt / future rebase note
```

This is not a schema redesign.

It does not authorize:

```text
new state fields
field deletion
persistence format changes
state splitting
new migration code
new runtime modules
new Host calls
new Store calls
feature semantics changes
```

## 2. Core rule — owner != writer != holder

Three concepts must remain separate.

```text
SEMANTIC OWNER
= defines what the state means and what transitions are valid

AUTHORIZED WRITER
= may physically update the value as part of an owner-approved application transaction

HOLDER / PERSISTENCE CONTAINER
= may carry or persist the value without owning its semantics
```

Examples:

```text
Reaction owns the meaning of community.platformMax.
Bootstrap Migration may rebuild platformMax from historical state.
Session may persist the resulting Core state.
Store serializes it.

Therefore:
Reaction = semantic owner
Bootstrap Migration = migration-authorized writer
Session = application holder / persistence sequencer
Store = persistence mechanic
```

A module does not gain semantic ownership merely because it assigns a field.

## 3. Persistence classes

Use these registry classes:

```text
CORE_PERSISTENT
  part of persisted Core state / send or out snapshot

SESSION_MEMORY
  memory-only per-chat Session anchor

REPRESENTATION_MEMORY
  bounded memory-only representation provenance

RUNTIME_MEMORY
  runtime/host observation, guards, diagnostics, telemetry

TURN_WORKING_SET
  persisted only as the bounded pending-turn contract and cleared at output completion

MIGRATION_RECEIPT
  bounded version/repair/bootstrap fact; not ordinary semantic authority

DIAGNOSTIC_RECEIPT
  bounded last-result metadata; never an unbounded event history
```

## 4. Global writer rules

```text
Kernel
= schema/default/normalization authority
!= domain semantic owner

Session
= may adopt service results and persist them
!= permission to invent domain transitions

Store
= may serialize/load/prune
!= permission to alter semantic values

Bootstrap Migration
= may reconstruct or repair legacy values
= only under explicit migration/bootstrap contract
!= ordinary runtime semantic owner

Runtime
= must not directly mutate ordinary Core semantic state
except a separately approved bounded application result already interpreted by lower-layer owners

Representation
= memory-only identity/provenance owner
= no persistent Core-state ledger
```

## 5. Registry — schema / bootstrap metadata

### 5.1 `stateVersion`, `coreStateVersion`

```text
Semantic owner: KERNEL / CONTRACTS
Canonical writer: Kernel state construction/reconciliation
Migration writer: Bootstrap Migration may consume, not redefine
Readers: Session, Bootstrap Migration, compatibility paths
Persistence: CORE_PERSISTENT
Lifetime: full snapshot lifetime
Forbidden writers: Domain modules, Runtime, Prompt, Representation
```

Meaning:
- format/contract identity only;
- must never become feature-policy toggles.

### 5.2 `historyBootstrapped`, `historyBootstrappedAt`, `historyBootstrapStats`

```text
Semantic owner: BOOTSTRAP_MIGRATION
Canonical writer: Bootstrap Migration
Authorized adoption writer: Session during verified snapshot/mirror initialization
Readers: Session, diagnostics
Persistence: CORE_PERSISTENT / bounded bootstrap receipt
Lifetime: chat-state lifetime; stats are bounded last bootstrap result
Forbidden writers: Prompt, Runtime Mirror, Representation, ordinary Domain output logic
```

Current v0.64.7 Session sets bounded bootstrap-complete facts when adopting already-verified snapshots/mirrors. This is transitional application adoption, not Session bootstrap-policy ownership.

Target after M2 narrowing:

```text
Bootstrap/Migration returns bounded adoption result
→ Session adopts result
→ Session does not infer legacy/trust semantics independently
```

## 6. Registry — recurrence / lineage / source handoff

### 6.1 `templateRecurrenceVersion`, `templateRegistry`

```text
Semantic owner: RECURRENCE
Canonical writer: Recurrence
Migration writer: Bootstrap Migration / explicit template-history bootstrap
Readers: Lifecycle, Prompt, diagnostics
Persistence: CORE_PERSISTENT
Lifetime: bounded chat history summary
Forbidden writers: Session semantic code, Prompt, Runtime, Representation
```

### 6.2 `requestLineageVersion`, `requestLineage`

```text
Semantic owner: LINEAGE
Canonical writer: Lineage
Readers: Lifecycle, Handoff, Evidence, Prompt, diagnostics
Persistence: CORE_PERSISTENT
Lifetime: current lineage state
Forbidden writers: Session, Runtime, Prompt, Evidence
```

Evidence may consume lineage to locate request evidence but may not rewrite lineage authority.

### 6.3 `communitySourceHandoffVersion`, `communitySourceRegistry`

```text
Semantic owner: HANDOFF
Canonical writer: Handoff
Readers: Lifecycle, Prompt, Evidence, diagnostics
Persistence: CORE_PERSISTENT
Lifetime: bounded source registry / current handoff state
Forbidden writers: Session, Prompt, Runtime, Community parser
```

Handoff may depend on Lineage and Recurrence facts but does not own those facts.

## 7. Registry — broadcast lifecycle and time

### 7.1 `broadcastLocked`

```text
Semantic owner: LIFECYCLE
Canonical transition writer: Lifecycle request preparation + Output Finalization executing existing Lifecycle close contract
Readers: Lifecycle, Prompt, Time, diagnostics
Persistence: CORE_PERSISTENT
Lifetime: broadcast lifecycle
Migration writer: Bootstrap Migration during history reconstruction
Forbidden writers: Runtime, Prompt, Store, Representation
```

Important distinction:
- Lifecycle owns whether a broadcast is open/locked.
- Output Finalization may execute the already-authorized B_END unlock at the finalization phase.
- Output Finalization does not become the semantic owner of broadcast lifecycle.

### 7.2 `episodeNo`

```text
Semantic owner: LIFECYCLE
Canonical writer: Lifecycle
Migration writer: Bootstrap Migration
Readers: Prompt, diagnostics, bootstrap
Persistence: CORE_PERSISTENT
Forbidden writers: Runtime, Store, Prompt
```

### 7.3 `broadcastAirtime`, `broadcastAirtimeStart`

```text
Semantic owner: TIME
Canonical writer: Time
Application executor: Lifecycle preparation / Output Finalization call Time at defined phases
Migration writer: Bootstrap Migration
Readers: Lifecycle, Structure, Prompt, diagnostics
Persistence: CORE_PERSISTENT
Lifetime: current broadcast lifecycle
Forbidden writers: Session direct semantic assignment, Runtime, Prompt, Structure
```

Structure may judge airtime monotonicity but is judge-only and must not repair it.

### 7.4 `worldYear`, `koreanAgeOffset`, `narrativeTimestamp`, `narrativeClockVersion`, `clockRepairVersion`

```text
Semantic owner: TIME
Canonical writer: Time
Migration writer: Bootstrap Migration
Application executors: Lifecycle preparation, Output Finalization, Edit Reconcile only through Time/Bootstrap APIs
Readers: Lifecycle, Prompt, Structure, diagnostics
Persistence: CORE_PERSISTENT
Forbidden writers: Runtime, Prompt, Store, Representation
```

`clockRepairVersion` is a migration/version receipt, not ordinary chronology policy.

## 8. Registry — Community / Reaction state

### 8.1 `community.activationCount`

```text
Semantic owner: COMMUNITY + finalization transaction contract
Canonical application writer: Output Finalization after Structure commit-safety approval
Migration writer: Bootstrap Migration
Readers: diagnostics / bootstrap
Persistence: CORE_PERSISTENT
Forbidden writers: Runtime, Prompt, Representation
```

Community owns COMMUNITY taxonomy; the finalization transaction advances the count only after Structure approves the commit shape.

### 8.2 `community.platformMax`

```text
Semantic owner: REACTION
Canonical writer: Reaction
Migration/repair writer: Bootstrap Migration
Readers: Prompt, Reaction, diagnostics
Persistence: CORE_PERSISTENT
Lifetime: cross-turn per-platform historical floor
Forbidden writers: Community taxonomy module, Session semantic code, Runtime, Prompt
```

Current source explicitly treats per-platform maxima as Reaction authority and removes the obsolete global cross-platform floor during reconciliation/migration.

### 8.3 `community.lastNormalization`

```text
Semantic owner: REACTION
Canonical writer: Reaction
Repair writer: Bootstrap Migration may clear when repairing contaminated historical floors
Readers: diagnostics
Persistence: CORE_PERSISTENT but bounded
Lifetime: last normalization receipt only
Forbidden writers: Runtime diagnostics, Prompt
```

Must remain bounded; it is not an event log.

### 8.4 `community.classifierVersion`

```text
Semantic owner: COMMUNITY contract version
Canonical writer: Community migration/application coordination
Migration writer: Session currently coordinates classifier migration; target should be explicit owner-produced migration result
Readers: Session/bootstrap diagnostics
Persistence: CORE_PERSISTENT
Forbidden writers: Runtime, Prompt, Representation
```

Current direct Session coordination is transition debt / application placement, not evidence that Session owns classifier semantics.

## 9. Registry — current mode and pending-turn working set

### 9.1 `lastMode`

```text
Semantic owner: LIFECYCLE
Canonical writer: Lifecycle at request classification and Output Finalization at completed output commit
Migration writer: Bootstrap Migration
Readers: Lifecycle, Prompt, Time, diagnostics, Edit Reconcile
Persistence: CORE_PERSISTENT
Forbidden writers: Runtime, Store, Representation
```

`lastMode` is lifecycle authority, not merely a UI label.

### 9.2 `pending`

Top-level classification:

```text
Persistence: TURN_WORKING_SET
Envelope owner: LIFECYCLE request-domain coordinator for M2
Holder: Session / Store snapshot
Clear executor: Output Finalization
Lifetime: one prepared request through corresponding output finalization
```

`pending` is not one semantic owner in the sense that every nested field belongs to Lifecycle. It is a bounded application working-set envelope containing facts produced by several owners.

Nested ownership families:

```text
mode / hasStart / hasContinue / hasEnd / wasLocked
→ Lifecycle

summaryScope / summaryTargetYear / summaryComparisonYear / summaryAuthority / summaryScopeReason
→ Lifecycle summary-scope classifier

broadcastAirtimePrevious / broadcastAirtimeStart / narrativeTimestampPrevious / narrative clock guard/floor facts
→ Time semantics coordinated by Lifecycle

template recurrence facts
→ Recurrence

request lineage facts
→ Lineage

community source handoff facts
→ Handoff

frameFloor
→ Frame semantic fact, physically composed into pending by Session in v0.64.7

secondary configured/active facts
→ Lifecycle/config interpretation for the current turn

userText bounded copy
→ request working-set evidence; not a new semantic owner
```

Canonical rule:

```text
PENDING ENVELOPE MAY COMPOSE MULTIPLE OWNER FACTS
!= LIFECYCLE OR SESSION MAY REINTERPRET THEIR SEMANTICS
```

### 9.3 `pending.userText`

Current source retains a bounded current-request copy (`slice(0, 16000)`) inside pending.

Registry classification:

```text
Owner: APPLICATION REQUEST WORKING SET
Persistence: TURN_WORKING_SET
Lifetime: until corresponding output finalization clears pending
Raw-body policy: bounded current user input only; no history accumulation
Forbidden: copying prior assistant/Fresh bodies into pending as convenience state
```

This registry does not authorize changing or removing the field. Any future retention review is a separate task.

## 10. Registry — output identity anchors

### 10.1 persistent `outputFingerprint`, `hostOutputFingerprint`

```text
Semantic owner: SESSION / APPLICATION OUTPUT IDENTITY CONTRACT
Representation owner: Representation owns relation/provenance classification, NOT these persistent anchors
Canonical writer: output commit application path
Authorized writers:
- Bootstrap Migration when establishing a trusted historical baseline
- Edit Reconcile when rebuilding/adopting a committed output identity
- Runtime Mirror APPLY only after lower-layer compatibility interpretation authorizes canonical-equivalent adoption
Readers: Session, Edit Reconcile, Representation comparison inputs, Runtime Mirror snapshot
Persistence: CORE_PERSISTENT
Lifetime: current committed output identity
Raw body: none; fingerprint only
Forbidden writers: Prompt, Structure, Store mechanics, Runtime diagnostics
```

The persistent identity anchor and the memory-only Representation ledger must never be merged.

### 10.2 Session `trustedOutputFingerprint`, `trustedHostOutputFingerprint`, `currentOutputIndex`

```text
Semantic owner: SESSION APPLICATION IDENTITY
Canonical holder/writer: Session
Authorized adoption: bounded result from Bootstrap/Edit/Compat-Mirror application transactions
Readers: Edit Reconcile, Runtime Mirror guard/application wiring
Persistence: SESSION_MEMORY
Lifetime: current loaded/adopted output
Forbidden writers: Domain modules, Prompt, Representation ledger
```

Coherence invariant:

```text
currentOutputIndex
+ trustedOutputFingerprint
+ trustedHostOutputFingerprint
must refer to one currently trusted/adopted output identity
```

Untrusted legacy state may not manufacture this tuple.

## 11. Registry — Representation provenance

Memory-only registry entries such as:

```text
outIndex
locationKey
status
canonicalFingerprint
hostRawFingerprint
freshFingerprint
fingerprint relation/provenance
```

classification:

```text
Semantic owner: REPRESENTATION
Canonical writer: Representation registry
Observation source: Runtime Mirror bounded observation receipt
Readers: Edit Reconcile, diagnostics/history attribution
Persistence: REPRESENTATION_MEMORY
Lifetime: bounded recent ledger only
Raw body: forbidden
Persistent Core state: forbidden
```

Runtime Mirror may observe Fresh and publish bounded facts but may not own the durable representation taxonomy.

## 12. Registry — output quarantine / warning receipts

Examples include bounded fields such as:

```text
lastOutputQuarantine
lastBroadcastAirtimeWarning
lastNarrativeClockWarning
```

Classification:

```text
Persistence: DIAGNOSTIC_RECEIPT / bounded Core receipt
Semantic owner:
- quarantine reason → Structure judgement contract
- broadcast/narrative warning meaning → Time
Application writer: Output Finalization may attach/clear the receipt while executing the transaction
Readers: diagnostics
Lifetime: last relevant result only
Forbidden: append-only historical accumulation
```

These receipts must not become alternate semantic state machines.

## 13. Registry — edit / compatibility migration markers

Examples observed in current compatibility paths include:

```text
manualEditRevision
envelopeRepairVersion
clockRepairVersion
```

Classification:

```text
manualEditRevision
→ Edit Reconcile application receipt

envelopeRepairVersion
→ Output Compat / legacy compatibility migration receipt

clockRepairVersion
→ Bootstrap Migration / Time migration receipt
```

Rules:

```text
version/receipt fields record completed compatibility work
!= permission for Session to own the underlying policy
```

These remain persistent only when current compatibility semantics require them.
No deletion is authorized by this registry.

## 14. Registry — Session-only state

From M2-4B, constitutional Session state is:

```text
store handle
current Core state
currentOutputIndex
trusted output identity tuple
lastPreparedSendIndex or equivalent bounded phase marker
bounded init/bootstrap status
```

Classifications:

### `store`

```text
Owner: Session association only
Persistence mechanics owner: Store
Persistence: SESSION_MEMORY handle
Forbidden: semantic policy in Store handle state
```

### `current`

```text
Owner: Session holder
Nested semantic ownership: remains with each domain/application owner
Persistence: SESSION_MEMORY working/adopted state with snapshot copies in Store
```

### `lastPreparedSendIndex`

```text
Owner: Session sequencing/idempotence
Persistence: SESSION_MEMORY
Lifetime: current request phase
Forbidden use: semantic turn classification
```

### `initSource`, `needsHistoryBootstrap`

```text
Owner: Session bounded orchestration status
Semantic bootstrap policy: Bootstrap Migration
Persistence: SESSION_MEMORY
```

### `loadedFromLegacySnapshot`

```text
Current: Session field used in trust gating
Target: MOVE_POLICY_FACT / REMOVE_AS_SESSION_AUTHORITY
Owner: Bootstrap/Migration adoption result
Classification: TRANSITION_DEBT
```

### deferred prune running/index state

```text
Owner: Store housekeeping
Current Session location: TRANSITION_DEBT
Target: Store retention subsystem
```

### owner-specific `*Stats` Session fields

```text
Classification: TRANSITIONAL_BOUNDED_RECEIPTS
Target choices after source rebase:
- forward owner result transiently
- return owner result directly
- bounded diagnostic envelope
```

No unbounded Session receipt history.

## 15. Registry — Runtime-only state

The following families are explicitly outside persistent Core state:

```text
runtime epoch / disposed flag
hook references
mirror schedule sequence
latest-by-location supersession map
stale-drop counters
cache observation state
request topology signatures
cache candidate trajectories
runtime telemetry handoff capsule
operator probe snapshots
UI-part handles
```

Classification:

```text
Owner: corresponding runtime/observability module
Persistence: RUNTIME_MEMORY
Core semantic mutation: forbidden
Transfer across reload: only explicitly bounded telemetry handoff contracts
Raw chat/body retention: prohibited except call-scoped host input already required by the operation
```

Runtime telemetry must never become a second Core state database.

## 16. Store authority

Store owns:

```text
keying
serialization
load/save mechanics
snapshot bundle mechanics
retention/prune mechanics
prune duplicate/running guards
```

Store does NOT own:

```text
broadcast lifecycle
clock semantics
reaction floors
lineage
representation meaning
edit classification
which compatibility candidate is semantically acceptable
```

Canonical rule:

```text
SESSION / APPLICATION decides WHEN a semantic result is ready to persist
STORE decides HOW persistence is executed
```

## 17. Kernel authority

Kernel currently contains state construction/reconciliation plus known transition dependency debt.

Registry rule:

```text
Kernel may normalize shape/defaults/version compatibility
Kernel must not become semantic owner merely because reconcileState touches every field
```

If a field-specific semantic migration requires domain knowledge, that belongs to the domain owner plus Bootstrap Migration coordination, not silent Kernel policy growth.

## 18. Forbidden multi-writer patterns

The following patterns are architecture violations unless explicitly added to this registry with evidence:

```text
Prompt directly mutates semantic Core state
Runtime diagnostics repairs Core state
Store rewrites semantic fields during serialization
Representation persists a duplicate identity ledger into Core state
Session manually recomputes Reaction/Time/Lineage/Handoff semantics
Bootstrap Migration runs ordinary every-turn policy
Output Finalize duplicates domain algorithms instead of calling owners
Edit Reconcile invents Representation taxonomy locally
Structure repairs content/state after judging it invalid
```

## 19. Authorized multi-writer pattern

A field may have more than one physical writer only when writer roles are distinct and explicit.

Allowed form:

```text
one semantic owner
+ one ordinary canonical transition path
+ optional migration/bootstrap writer
+ optional application adoption writer
```

Example:

```text
narrativeTimestamp
owner = Time
ordinary writer = Time during lifecycle/finalization
migration writer = Bootstrap Migration through Time rules
holder/persistence = Session + Store
```

Not allowed:

```text
Time calculates one value
Session independently calculates another
Runtime chooses which one wins
```

## 20. Post-M2-3 rebase checklist

After physical M2-3 lands, re-audit at minimum:

```text
1. outputFingerprint / hostOutputFingerprint writer locations
2. manualEditRevision ownership and writer
3. legacy clock repair call sites
4. pending working-set consumers
5. Session loadedFromLegacySnapshot trust gating
6. Session owner-specific diagnostic receipts
7. Store prune running/index state
8. Representation persistent-vs-memory boundary
9. any new edit-reconcile result fields
10. whether M2-4D output-finalize extraction changes application writer locations without changing semantic owners
```

Writer movement alone does not require changing semantic ownership.

## 21. CI / architecture guard candidates — future only

This registry may later support static checks such as:

```text
Runtime modules cannot assign known Core semantic state fields
Prompt cannot assign Core semantic state
Representation cannot add persistent state fields
Store cannot import domain owners
Session cannot gain new owner-specific semantic helpers
bounded diagnostic arrays must have explicit caps
```

No new CI is authorized in this IDEA task.

## 22. Registry summary

```text
SCHEMA / VERSION
→ Kernel / Contracts

BOOTSTRAP MARKERS
→ Bootstrap Migration

RECURRENCE
→ Recurrence

LINEAGE
→ Lineage

SOURCE HANDOFF
→ Handoff

BROADCAST LIFECYCLE / LAST MODE
→ Lifecycle

TIME / CLOCK / AIRTIME / WORLD YEAR
→ Time

COMMUNITY TAXONOMY
→ Community

REACTION FLOORS / NORMALIZATION RECEIPT
→ Reaction

COMMIT SAFETY / QUARANTINE MEANING
→ Structure

PENDING TURN ENVELOPE
→ Lifecycle-coordinated multi-owner working set

PERSISTENT OUTPUT IDENTITY ANCHORS
→ Session/Application identity contract

REPRESENTATION PROVENANCE
→ Representation, memory-only

EDIT RECONCILE RECEIPTS
→ Edit Reconcile after M2-3

PERSISTENCE MECHANICS
→ Store

SESSION IDENTITY / PHASE MARKERS
→ Session

HOST / MIRROR / CACHE / TELEMETRY STATE
→ Runtime, memory-only
```

## 23. Final classification

```text
SIMCORE_STATE_OWNERSHIP_REGISTRY_V2
= ONE SEMANTIC OWNER PER STATE FAMILY
= PHYSICAL WRITER DOES NOT IMPLY OWNERSHIP
= MIGRATION WRITERS MUST BE EXPLICIT
= SESSION MAY HOLD WITHOUT OWNING NESTED SEMANTICS
= STORE PERSISTS WITHOUT SEMANTIC AUTHORITY
= REPRESENTATION MEMORY-ONLY
= RUNTIME MEMORY/HOST-BOUND
= PENDING IS A MULTI-OWNER TURN WORKING SET
= DIAGNOSTIC RECEIPTS BOUNDED
= NO SCHEMA CHANGE
= NO IMPLEMENTATION
= REBASE PHYSICAL WRITERS AFTER M2-3
```

## 24. Recommended next research slice

Proceed to:

```text
Contracts v2 Transition-Debt Retirement Map
```

Reason:

The Application-Service Boundary Map now defines transaction authority, and State Ownership Registry v2 defines state authority. The next useful layer is to inventory every known transitional exception/facade/overlap and attach an exact milestone + evidence gate for retirement.
