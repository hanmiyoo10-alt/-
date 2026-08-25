# SimCore Application-Service Boundary Map — IDEA

Status: `IDEA RECORDED · ARCHITECTURE MAP · NO IMPLEMENTATION · NO RUNTIME CHANGE · POST-M2-3 REBASE REQUIRED WHERE PHYSICAL OWNERSHIP MOVES`

Production authority while this map is recorded: `release-simcore` v0.64.7.

Related:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_M2_4_SESSION_RUNTIME_MIRROR_TARGET_MAP_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`
- `docs/SIMCORE_M2_4C_RUNTIME_MIRROR_OBSERVATION_RECEIPT_CONTRACT.md`
- `docs/SIMCORE_M2_4D_OUTPUT_FINALIZATION_OWNERSHIP_DECISION.md`
- `docs/SIMCORE_M2_4E_RECOVERY_FACADE_CALL_SITE_AUDIT.md`

## 1. Purpose

Map SimCore by application phase and authority rather than by file size or by a single generic pipeline.

For every important phase, this map records:

```text
owner
inputs
outputs
semantic-state mutation permission
Store permission
Host permission
request/output-byte mutation permission
raw-body lifetime
```

The map is architectural guidance only.

It does not authorize:

```text
new runtime modules
new APIs
new state fields
new persistence
new Host calls
prompt-byte changes
feature behavior changes
TurnPipeline extraction
```

## 2. Core architectural rule

An Application service coordinates already-owned policy to complete one bounded application transaction.

Canonical distinction:

```text
DOMAIN / VALIDATION OWNER
= decides WHAT a semantic rule means

APPLICATION SERVICE
= decides WHEN existing owners participate in one bounded transaction

SESSION
= holds per-chat application identity and sequences transactions/persistence

STORE
= executes persistence mechanics

RUNTIME
= touches Host boundaries and transports observations/results
```

Therefore:

```text
application orchestration != semantic ownership
session orchestration != god pipeline
runtime access != permission to decide Core policy
persistence access != permission to decide what should be persisted semantically
```

## 3. Why no generic TurnPipeline

Contracts v2 already rejected premature Turn Pipeline extraction.

Current source supports that decision.

The request and output paths are not one homogeneous algorithm. They are a sequence of bounded transactions with different permissions:

```text
runtime admission
→ bootstrap/migration
→ edit reconcile
→ turn preparation
→ request snapshot commit
→ prompt serialization
→ request projection
→ MODEL
→ output compatibility
→ validation
→ output finalization
→ output snapshot commit
→ deferred host observation / mirror
```

Collapsing these into one owner would erase useful boundaries between:

```text
semantic state
persistence
request bytes
host I/O
representation identity
compatibility policy
observability
```

The desired architecture is therefore a chain of explicit boundaries, not one physical pipeline module.

## 4. Current request flow — source-backed shape

Current v0.64.7 request-side sequencing is approximately:

```text
beforeRequest runtime admission
→ Runtime Session load/reuse for chat
→ History bootstrap if needed
→ Edit reconcile against previous visible assistant
→ transitional Community classifier migration if needed
→ CoreRulesetSession.onSend(...)
   → pre/restore snapshot handling
   → template bootstrap if needed
   → Lifecycle.prepareTurn(...)
   → previous Frame capture when active
   → Store.saveTurn(...)
   → Prompt.compileRuntimePromptParts(...)
→ bounded Evidence inspect/fence when source-lock active
→ append SimCore runtime system block
→ runtime cache/topology/telemetry observation
→ return provider request messages
```

Important current evidence:

- Runtime loads/reuses the per-chat CoreSession before later application work.
- History bootstrap runs before edit reconcile.
- `onSend` persists the pre/send turn bundle before returning the compiled runtime prompt.
- Evidence may apply bounded request-only fencing to the already-built provider request array.
- Request-topology/cache observers execute after the runtime prompt is present and remain observational.

This ordering is part of current behavior and must not be casually rearranged by future extraction.

## 5. Current output flow — source-backed shape

Current v0.64.7 output-side sequencing is approximately:

```text
output runtime admission
→ Runtime Session load/reuse
→ CoreRulesetSession.processOutput(...)
   → resolve/load base semantic state
   → Output Compat / Recovery prepareOutput(...)
   → Structure.validateStructure(...)
   → finalizePreparedOutput(...)
   → build bounded post-finalization compatibility confirmation metadata
   → attach canonical + host-raw fingerprints
   → Store.save('out', ...)
   → adopt Session current/output identity anchors
→ Deferred Runtime Mirror scheduling
→ later Fresh host observation
→ strict guard checks
→ representation / compatibility confirmation path
→ safe host mirror write or fail-closed skip
→ bounded Representation provenance record
→ diagnostics rendering
```

M2-4C and M2-4D refine the target ownership inside this sequence without authorizing implementation yet.

## 6. Canonical phase map

### P0 — Runtime Admission & Context Acquisition

Current / target owners:

```text
runtime-hooks
runtime-host
runtime-session
outer runtime wiring
```

Owns:

```text
hook admission
runtime epoch/currentness checks
chat/location lookup
host-facing CoreSession reuse/load/cold-init selection
```

Permissions:

```text
semantic Core state mutation: NO policy ownership
Store: indirect only through lower application/session initialization boundary
Host read: YES
Host write: only where runtime contract explicitly allows
request/output bytes: pass-through / acquisition only
raw body retention: NO
```

Rule:

> Runtime may acquire context and invoke lower layers, but it must not reinterpret Core semantic policy merely because it owns Host access.

### P1 — Bootstrap / Migration Transaction

Target owner:

```text
bootstrap-migration
```

Inputs:

```text
current/base state
history or old snapshot specimen
bounded Store access when migration requires it
version / legacy facts
```

Outputs:

```text
adoptable semantic state
bounded bootstrap/migration receipt
trust/adoption eligibility facts
```

Permissions:

```text
semantic state mutation: YES, on the returned/adopted migration result
Store: YES, migration/bootstrap-specific only
Host: NO
request bytes: NO
raw history/body retention: NO beyond call scope
```

Does not own ordinary output compatibility or edit attribution.

### P2 — Edit Reconcile Transaction

Target owner after M2-3:

```text
edit-reconcile
```

Inputs:

```text
previous visible assistant identity/body for call scope
Session trusted output identity tuple
Representation prior provenance facts
relevant snapshots through Store
Output Compat / Bootstrap Migration helper results where required
```

Outputs:

```text
reconcile disposition
adopted/rebuilt state when required
bounded reconcile receipt
snapshot-write requirement/result
```

Permissions:

```text
semantic state mutation: YES through bounded reconcile result
Store: YES, exact reconcile/snapshot needs only
Host Fresh read: NO
Host write: NO
request bytes: NO
raw previous assistant body: CALL_ONLY
```

Owns selection among reconcile paths, not Representation taxonomy.

### P3 — Turn Preparation Transaction

Current target composition:

```text
Session application sequencing
+ Lifecycle request-domain coordinator
+ bounded Domain helpers such as Frame/Time/Recurrence/Lineage/Handoff
```

No new physical `request-pipeline` or `turn-pipeline` module is selected by this map.

Inputs:

```text
current reconciled state
current user text
prompt/request probe facts
send index
bounded previous-output facts when needed
history only where an existing domain contract explicitly permits call-scoped inspection
```

Outputs:

```text
prepared semantic state with pending turn facts
bounded request-domain receipts
```

Permissions:

```text
semantic state mutation: YES through Lifecycle/domain operations
Store: NO inside domain policy
Host: NO
request bytes: NO
raw history retention: NO
```

Session decides when the transaction runs; Lifecycle and domain owners decide their semantics.

### P4 — Request Snapshot Commit Boundary

Owners:

```text
Session = commit sequencing
Store = persistence mechanics
```

Current example:

```text
Store.saveTurn(sendIndex, preState, preparedState, ...)
```

Permissions:

```text
semantic policy: NO new policy at persistence boundary
Session anchor mutation: YES after successful sequencing
Store: YES
Host: NO
request bytes: NO
```

Rule:

> Store may serialize, key, save, retain and prune. It must not infer Lifecycle/Representation/Compatibility meaning.

### P5 — Prompt Serialization Transaction

Owner:

```text
prompt
```

Inputs:

```text
already-prepared semantic state
```

Outputs:

```text
runtime prompt text
bounded compiler/identity metadata
```

Permissions:

```text
semantic state mutation: NO
Store: NO
Host: NO
request bytes: PRODUCES bytes but does not own Host request insertion
raw history: NO
```

Canonical invariant:

```text
Prompt serializes authority facts
!= Prompt creates authority facts
```

### P6 — Request Projection / Evidence Boundary

Owners:

```text
Evidence = bounded source-fence eligibility/mapping semantics
Runtime wiring = provider-request array placement/invocation context
```

Current Evidence may inspect and fence the already-built request messages when source-lock eligibility is present.

Permissions:

```text
Core semantic state mutation: NO
Store: NO
Host API: NO
provider request bytes: YES, only under the existing bounded Evidence contract
visible chat history mutation: NO
raw source retention: NO
```

This is a deliberate narrow exception to the idea that lower layers never touch provider-request bytes: Evidence owns one bounded request-only projection contract, not arbitrary prompt mutation.

### P7 — Runtime Request Observation Tail

Owners:

```text
runtime-cache
runtime-topology
runtime-cache-candidates
runtime-telemetry
runtime-probe inputs
```

Permissions:

```text
semantic state mutation: NO
Store: NO unless separately declared telemetry handoff mechanism already exists
Host semantic actions: NO
request bytes: OBSERVE ONLY after final request construction
provider-cache claims: FORBIDDEN / UNVERIFIED
```

This phase must never become a hidden request optimizer.

### EXTERNAL — Model Generation

The model/provider is outside SimCore application ownership.

SimCore may control the request content it is authorized to inject/fence, but does not own provider execution, latency, cached-token behavior, or generated semantic correctness.

### P8 — Output Compatibility Preparation

Owner:

```text
output-compat
```

Inputs:

```text
raw output body for call scope
pending turn facts
```

Outputs:

```text
prepared/canonical-compatible content
envelope metadata
bounded Fresh-confirmation candidate metadata
```

Permissions:

```text
Core semantic state mutation: NO direct durable ownership
Store: NO
Host: NO
output bytes: YES, deterministic compatibility/canonicalization only
raw output retention: NO
```

It owns compatibility meaning, not Structure judgement and not edit attribution.

### P9 — Structure Validation Boundary

Owner:

```text
structure
```

Inputs:

```text
prepared output
pending turn facts
```

Outputs:

```text
issues
integrity judgement
state-commit safety facts
```

Permissions:

```text
semantic state mutation: NO
Store: NO
Host: NO
output repair: NO
```

Canonical invariant:

```text
Structure = JUDGE
Structure != REPAIR
```

### P10 — Output Finalization Transaction

Provisional target selected by M2-4D:

```text
output-finalize
```

Inputs:

```text
base semantic state
prepared output
out index
bounded finalization options
```

Outputs:

```text
finalized cloned state
finalized content
bounded Frame/Time/commit receipts
```

Permissions:

```text
semantic state mutation: YES, on the returned cloned final state
Store: NO
Host: NO
output bytes: YES through already-owned deterministic Frame/Time/Reaction helpers
raw history/Fresh: NO
```

It owns application ordering of finalization steps, not the underlying Frame/Time/Reaction/Structure policies.

### P11 — Output Snapshot Commit & Session Adoption

Owners:

```text
Session = sequencing + anchor adoption
Store = persistence mechanics
```

Current responsibilities include:

```text
save finalized out snapshot
adopt current state
adopt currentOutputIndex
adopt trusted canonical/host output identity anchors
schedule bounded Store housekeeping
```

Permissions:

```text
semantic policy creation: NO
Session anchor mutation: YES
Store: YES
Host: NO
```

The output finalizer must not swallow this boundary.

### P12 — Deferred Mirror Observation / Compatibility Interpretation / Safe Apply

Target split from M2-4C:

```text
Runtime Mirror OBSERVE
→ Output Compat INTERPRET
→ Runtime Mirror SAFE APPLY / TRANSPORT
→ Representation RECORD
```

Runtime Mirror permissions:

```text
Host Fresh read: YES, at most once per mirror operation
Host mirror write: YES only after guards and accepted interpretation
semantic compatibility meaning: NO
raw Fresh retention: NO
```

Output Compat permissions in this phase:

```text
interpret opaque candidate-match facts: YES
Host: NO
Store: NO
raw Fresh body: NO
```

Representation permissions:

```text
bounded fingerprint/provenance memory: YES
persistent Core state: NO
Host: NO
raw body: NO
```

## 7. Compact authority matrix

```text
PHASE                         STATE   STORE        HOST R   HOST W   BYTES
Runtime admission             no*     no*          yes      bounded  pass
Bootstrap/Migration           yes     migration    no       no       no
Edit Reconcile                yes     reconcile    no       no       no
Turn Preparation              yes     no           no       no       no
Request Snapshot Commit       anchors yes          no       no       no
Prompt Serialization          no      no           no       no       produce
Evidence Request Projection   no      no           no       no       bounded mutate
Runtime Request Observation   no      no           observe* no       observe
Output Compat Prepare         no      no           no       no       compat mutate
Structure Validate            no      no           no       no       judge only
Output Finalize               yes     no           no       no       deterministic mutate
Output Snapshot Commit        anchors yes          no       no       no
Mirror Observe                no      no           yes      no       fingerprint only
Compat Interpret              no      no           no       no       no
Mirror Safe Apply             bounded no           guarded  guarded  transport
Representation Record         no      no           no       no       fingerprint only
```

`no*` / `observe*` means runtime may coordinate acquisition/observation but must not become semantic authority.

## 8. Session’s constitutional role in this map

This map strengthens the M2-4B decision:

```text
SESSION
= PER_CHAT_STATEFUL_APPLICATION_ORCHESTRATOR
```

Session is not merely another stateless service.

It legitimately owns:

```text
per-chat current state identity
current output position
trusted output identity references
bounded request/output phase markers
commit sequencing around Store
adoption of application-service results
```

It should not own:

```text
Edit Reconcile decision tree after M2-3
Output Compat policy
Bootstrap/Migration semantic policy
Representation taxonomy
Output Finalize inner deterministic transaction after M2-4D
Host Mirror guards
Store retention mechanics
```

## 9. Application-service dependency rule

Preferred direction:

```text
Runtime
→ Session / Application services
→ Domain / Validation / Representation / Foundation
```

Application services may compose lower owners, but lower owners must not import Runtime.

Cross-application dependency is allowed only when the lower service has a narrower reusable contract.

Examples:

```text
edit-reconcile → output-finalize
MAY be acceptable after post-M2-3 rebase if deterministic replay still requires it.

bootstrap-migration → output-compat
MAY remain acceptable for bounded migration replay compatibility.

output-finalize → edit-reconcile
FORBIDDEN direction.

output-compat → runtime-mirror
FORBIDDEN direction.
```

## 10. Mutation ownership rule

A phase receiving a state object does not automatically gain authority over all nested fields.

Canonical rule:

```text
STATE HOLDER / TRANSACTION COORDINATOR
!= FIELD SEMANTIC OWNER
```

Examples:

```text
output-finalize may coordinate Time commit
but Time owns timestamp/airtime semantics.

Session may persist Community state
but Community/Reaction own its semantics.

Edit Reconcile may adopt a Representation exact carryover result
but Representation owns relation taxonomy/provenance.
```

Future State Ownership Registry v2 should refine this map field-by-field.

## 11. Raw-body lifetime rule

Across all phases:

```text
raw visible assistant body
raw generated output body
raw Fresh body
raw history arrays
```

must remain call-scoped unless an existing explicit contract says otherwise.

Never introduce an application-service cache of raw bodies merely to simplify cross-phase wiring.

Identity evidence should use bounded fingerprints/indices/receipts whenever possible.

## 12. Persistence rule

Only two categories may legitimately cause Store I/O:

```text
A. Session-controlled normal application commit sequencing
B. explicitly owned Bootstrap/Migration or Edit Reconcile repair/rebuild transactions
```

Domain/Validation/Prompt/Representation/Output Finalize must not independently persist semantic state.

If a future domain helper requests Store access merely for convenience, classify it as ownership drift before coding.

## 13. Host rule

Host API access belongs to Runtime adapters.

Application services may receive bounded Host-derived facts but must not directly call Host APIs.

Canonical examples:

```text
Edit Reconcile receives Representation/Fresh-derived identity facts
but does not read Fresh itself.

Output Compat interprets a Mirror observation receipt
but does not call host.getChat.

Prompt receives semantic state
but does not query Character/Chat Host state itself.
```

## 14. Request/output-byte rule

There are three distinct byte authorities:

```text
Prompt
= produces SimCore runtime prompt bytes

Evidence
= may perform one bounded request-only source fence under its contract

Output Compat / Output Finalize
= may deterministically transform output bytes under their separate contracts
```

These authorities must not merge.

Runtime wiring may place/transport bytes but does not become their semantic owner.

## 15. Architecture pressure points exposed by this map

### A. Session gravity well

Current Session still physically contains several phases.

Already-selected future moves:

```text
Edit Reconcile → M2-3 extraction
Output Finalize → M2-4D extraction candidate selected
Recovery facade calls → direct physical owner after M2-3 proof
Store housekeeping state → move toward Store ownership
```

The remaining Session should become more coherent after these moves.

### B. Bootstrap/Migration adoption boundary

The semantic migration owner is clear, but Session/runtime initialization still carries transitional trust/legacy facts.

Future M2-4A post-M2-3 inventory must confirm that migration returns bounded adoption facts rather than leaving legacy policy flags in Session.

### C. Runtime Mirror semantic leakage

M2-4C already identified compatibility-policy interpretation inside current Mirror.

This map confirms the target correction:

```text
Host observation/transport = Runtime
compatibility meaning = Output Compat
provenance taxonomy = Representation
```

### D. Request Projection boundary

Evidence is a deliberately narrow request-byte modifier outside Prompt.

Future architecture work must avoid casually adding additional modules that mutate provider request messages. Any new request-byte modifier requires an explicit ownership review.

## 16. Non-goals

This map does not select:

```text
new RequestPreparation module
new TurnPipeline
new OutputController
new ApplicationBus
new transaction framework
new dependency-injection framework
new state schema
new persistence schema
new host abstraction
```

It maps responsibilities first.

Physical extraction requires separate evidence.

## 17. Rebase / promotion rules

Before this map becomes implementation-authoritative for M2-4 physical work:

```text
1. close the current v0.64.7 real-long-chat gate
2. implement and stabilize M2-3 under its own evidence/release sequence
3. re-read actual post-M2-3 Session/runtime source
4. update any phase whose physical owner changed
5. verify no new circular Application dependency
6. keep request/output ordering behavior equivalent
```

High-level permission rules in this map may survive M2-3, but physical call-site assignments must defer to actual post-M2-3 source.

## 18. Suggested follow-up

The strongest follow-up artifact is:

```text
SIMCORE_STATE_OWNERSHIP_REGISTRY_V2
```

Reason:

This map answers:

```text
which transaction may mutate state
```

The registry should answer the next, finer-grained question:

```text
which exact owner may define/write/read each state family
```

That pairing gives SimCore both:

```text
transaction authority map
+
field/state authority map
```

without inventing a generic pipeline.

## 19. Current verdict

```text
SIMCORE_APPLICATION_SERVICE_BOUNDARY_MAP
= CHAIN OF BOUNDED TRANSACTIONS
= SESSION AS STATEFUL ORCHESTRATOR
= DOMAIN OWNERS KEEP SEMANTICS
= STORE OWNS PERSISTENCE MECHANICS
= RUNTIME OWNS HOST ACCESS
= PROMPT / EVIDENCE / OUTPUT BYTE AUTHORITIES REMAIN DISTINCT
= NO TURN PIPELINE
= NO NEW PHYSICAL MODULE SELECTED BY THIS MAP
= M2-3 ACTUAL SOURCE REMAINS AUTHORITATIVE
= NO IMPLEMENTATION
= NO RUNTIME CHANGE
```
