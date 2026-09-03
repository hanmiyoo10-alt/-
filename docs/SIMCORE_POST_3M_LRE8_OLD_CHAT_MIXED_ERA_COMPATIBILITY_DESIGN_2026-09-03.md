# SimCore Post-3.0M LRE-8 Old-Chat / Mixed-Era Compatibility Design — 2026-09-03

Date: 2026-09-03 KST

Status: **LRE-8 DESIGN FROZEN · LC5 LEGACY_READ_ONLY_COMPAT_STABLE CONTRACT · OLD CHAT PRESERVED · MIXED-ERA OPERATION MATRIX FROZEN · NO HISTORY REWRITE · NO SOURCE AUTHORITY FROM LEGACY HISTORY · DESIGN-ONLY · RUNTIME / RELEASE UNCHANGED**

Classification: **SIMCORE · POST-3M · LEGACY / RUNTIME-ENABLING · LRE-8 · LC5 · OLD CHAT · MIXED ERA · READ-ONLY COMPATIBILITY**

## 0. Purpose

LRE-8 freezes the detailed compatibility contract for chats that contain both:

```text
pre-migration assistant messages with legacy <COMMUNITY>
+
post-LC4 migrated messages with no stored Community and optional ephemeral structured LIVE_REACTION presentation
```

It answers:

```text
How is historical legacy content kept readable without becoming current Source authority?
How are passive read, reload, manual edit, reroll, and navigation distinguished?
How is a newly rerolled message at an old index classified?
How does SimCore avoid inferring era from content or message position?
What happens to LC4 structured messages after runtime reload when their presentation binding is gone?
How does old Community parsing remain read-only?
What evidence proves mixed-era safety without a history scan or era database?
```

This is a design-only checkpoint.

It does not implement code, modify `latest.js` / `install.js`, mutate old messages, add persistent metadata, activate Candidate C, change host history construction, deploy, or run target-host validation.

## 1. Authority chain

Consumes:

```text
docs/SIMCORE_POST_3M_LEGACY_RUNTIME_ENABLING_MASTER_DESIGN_2026-09-01.md
docs/SIMCORE_POST_3M_LRE1_PRODUCTION_HOST_COUPLING_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE5_SEMANTIC_OWNER_CUTOVER_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE6_STRUCTURED_PRESENTATION_CUTOVER_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE7_PROSPECTIVE_LEGACY_CONTEXT_RETIREMENT_DESIGN_2026-09-03.md
docs/SIMCORE_POST_3M_LRE8_OLD_CHAT_MIXED_ERA_COMPATIBILITY_IMPACT_SCOPE_2026-09-03.md
docs/SIMCORE_3M_6_CURRENT_PROJECTION_SUPPORT_INVALIDATION_DESIGN_2026-09-01.md
docs/SIMCORE_3M_7_CONTEXT_REENTRY_SOURCE_HISTORY_DESIGN_2026-09-01.md
docs/SIMCORE_3M_9_INTEGRATION_PERFORMANCE_SOURCE_IRRELEVANT_DESIGN_2026-09-01.md
M2 Representation / Edit Reconcile ownership contracts
current production Community structural reader/parser behavior
```

The impact-scope post-merge SimCore CI cancellation caused by unrelated main advance is preserved separately in:

```text
docs/SIMCORE_LRE8_IMPACT_POST_MERGE_CI_MAIN_ADVANCE_WATCH_2026-09-03.md
```

Production remains independently authoritative on `release-simcore`.

## 2. Design-time snapshot

```text
LRE-8 impact merge = 566c588955d4cebd7e049b3d285de52f19622d30
WATCH merge base for this detailed design = 74f901634e7ff4ab78b48dc25d5a220e3b602c61
release-simcore = 861100f4771967aa5b8ab8811d06f11702c0d3ff
production = v0.70.1
```

Any implementation must re-run G1 against then-current production and target host.

## 3. LC5 target state

For the already-migrated first slice:

```text
S = S1 STRUCTURED_VALIDATED_SEMANTIC
P = P1 STRUCTURED_LIVE_REACTION_PRESENTATION
H = H2 LEGACY_CONTEXT_PREEXISTING_ONLY
R = R1 LEGACY_READ_ONLY_COMPAT_STABLE
```

LRE-8 closes the `R1` behavior and mixed-era lifecycle semantics.

It does not migrate additional Source capabilities.

## 4. Central compatibility law

```text
OLD LEGACY CONTENT MAY REMAIN READABLE
BUT
OLD LEGACY CONTENT MAY NOT BECOME CURRENT SOURCE AUTHORITY
```

This remains true even if:

```text
the model can see old Community in ordinary transcript
old Community describes the same event as the current request
old Community text exactly matches a new structured assertion
old Community was manually edited by the user
old Community sits at the same message index that is later rerolled
```

## 5. Do not collapse representation and provenance

LRE-8 rejects one-field era inference.

Two independent axes are required conceptually:

```text
Axis A · STORED REPRESENTATION
Axis B · GENERATION / RUNTIME PROVENANCE
```

Reason:

```text
no <COMMUNITY> in stored message
!=
proof that message was produced by structured LC4
```

After reload an old ordinary message with no Community and an LC4 migrated message may look identical at the stored-text layer.

Absence of legacy representation is not structured-generation proof.

## 6. Stored representation classes

`StoredSourceRepresentationClassV1`:

```text
LEGACY_COMMUNITY_PRESENT
NO_LEGACY_COMMUNITY
MALFORMED_OR_AMBIGUOUS_COMMUNITY_MARKER
```

The class is structural only.

It does not authorize semantic interpretation.

## 7. Generation provenance classes

`SourceGenerationProvenanceClassV1`:

```text
CURRENT_STRUCTURED_GENERATION
CURRENT_UNMIGRATED_LEGACY_GENERATION
OBSERVED_USER_EDIT
HISTORICAL_WITHOUT_LIVE_PROVENANCE
UNKNOWN_PROVENANCE
```

Positive `CURRENT_STRUCTURED_GENERATION` requires current runtime evidence such as the current generation / projection / validation / binding chain.

It must never be inferred from:

```text
messageIndex
message age
absence of Community
content hash
visual position
CSS class
```

## 8. `MixedEraCompatibilityObservationV1`

Conceptual bounded input:

```text
MixedEraCompatibilityObservationV1
  operation
  currentHostScope
  messageHostIdentity if currently available
  storedRepresentationClass
  generationProvenanceClass
  currentMigrationCapability
  structuredBindingState
  editObservationState
  sourceJobState
```

It contains no Community prose and no structured assertion prose.

## 9. `MixedEraCompatibilityClassifierV1`

The classifier derives compatibility disposition from the two axes plus current operation.

It owns:

```text
read/presentation compatibility disposition
whether legacy read adapter may run
whether current structured binding may be used
whether current Source authority is categorically unavailable from history
```

It does not own:

```text
Source semantics
Exposure policy
edit repair
message persistence
Source-job selection
history construction
Source provenance creation
```

## 10. Closed compatibility dispositions

```text
LEGACY_PASSIVE_READ
LEGACY_USER_EDITED_PASSIVE
UNMIGRATED_LEGACY_CURRENT
STRUCTURED_LIVE_PRESENTATION
STRUCTURED_STORED_ONLY_NO_LIVE_BINDING
UNKNOWN_PASSIVE_ONLY
MALFORMED_LEGACY_PASSIVE_RAW
REROLL_REEVALUATE_CURRENT_RUNTIME
NAVIGATION_SCOPE_INVALIDATED
```

These are compatibility states, not semantic Source states.

## 11. `LegacyCommunityReadOnlyAdapterV1`

The legacy adapter may consume only a structurally bounded stored legacy Community representation for historical display/compat diagnostics.

Allowed:

```text
recognize block count / structural extent
preserve ordinary historical visible content
report bounded structural compatibility state
```

Forbidden:

```text
parse reaction meaning into SourceAssertion
extract facts into Exposure policy
create a new SourceProjectionEnvelope
create a persistent Source object
synthesize Source identity
copy Community into current structured proposal
mutate legacy block
```

## 12. Read-only means no repair writer

At LC5, old-chat compatibility must not silently repair legacy Community formatting.

If historical content is malformed:

```text
MALFORMED_OR_AMBIGUOUS_COMMUNITY_MARKER
→ MALFORMED_LEGACY_PASSIVE_RAW
```

Preferred first-major behavior:

```text
preserve stored representation as ordinary historical content
no Source interpretation
no migration rewrite
```

LRE-8 does not create a new historical sanitizer.

## 13. Passive read contract

For an old stored message containing a bounded Community and no live current-generation provenance:

```text
operation = PASSIVE_READ
storedRepresentation = LEGACY_COMMUNITY_PRESENT
generationProvenance = HISTORICAL_WITHOUT_LIVE_PROVENANCE
→ LEGACY_PASSIVE_READ
```

Effects:

```text
historical bytes unchanged
legacy visible compatibility allowed
Source activation from history = false
structured binding = none
structured re-entry = 0
```

## 14. Passive read does not prove original generator version

`LEGACY_PASSIVE_READ` means:

```text
this stored message currently contains a legacy Community representation that is safe only for passive compatibility
```

It does not claim:

```text
we cryptographically know which old SimCore version generated it
```

This distinction avoids inventing provenance the runtime does not possess.

## 15. Reload contract for old legacy message

After runtime reload:

```text
stored legacy Community still exists
→ may remain visible/readable as passive legacy content
```

No migration write occurs.

No structured Source object is reconstructed.

## 16. Reload contract for LC4 structured message

An LC4 migrated message may have:

```text
storedRepresentation = NO_LEGACY_COMMUNITY
live structured binding before reload = yes
```

After reload the ephemeral binding may be gone.

Without a durable provenance carrier, LRE-8 must not infer:

```text
NO_LEGACY_COMMUNITY
→ STRUCTURED_GENERATION
```

Therefore the safe post-reload state is conceptually:

```text
STRUCTURED_STORED_ONLY_NO_LIVE_BINDING
```

only when current runtime has an explicit bounded reason to know the message belonged to the just-committed structured runtime session.

Otherwise:

```text
UNKNOWN_PASSIVE_ONLY
```

In both cases:

```text
ordinary stored assistant content remains
Source UI need not reappear
no Source authority is reconstructed
```

## 17. No durable era ledger

LRE-8 does not solve reload ambiguity by storing:

```text
messageIndex → era
chatId → source generation version
message → structured sidecar exists
```

in a new persistent table.

Required:

```text
persistent era writes = 0
persistent Source history = 0
```

Durable replay belongs to Candidate C if later required.

## 18. Manual edit contract for historical legacy message

Manual edit is a representation mutation, not a Source generation.

When host edit observation proves an old message changed:

```text
operation = MANUAL_EDIT
→ Representation / Edit Reconcile owns representation change semantics
→ Source presentation binding for that message, if any, invalidates
→ compatibility re-observes stored representation
```

If Community remains:

```text
LEGACY_USER_EDITED_PASSIVE
```

If user removes Community:

```text
NO_LEGACY_COMMUNITY + OBSERVED_USER_EDIT
→ UNKNOWN_PASSIVE_ONLY / user-edited ordinary history
```

No structured Source is synthesized.

## 19. User adding Community manually

If a user manually inserts a `<COMMUNITY>`-shaped block into a historical or new stored message:

```text
OBSERVED_USER_EDIT
+ LEGACY_COMMUNITY_PRESENT
→ LEGACY_USER_EDITED_PASSIVE
```

It remains user-edited historical representation only.

It cannot become:

```text
current Source authority
Exposure proof
structured proposal
Source-job trigger
```

## 20. Equal-value manual edit limitation

LRE-6 already identified that content fingerprint cannot prove an edit event whose final value is unchanged.

LRE-8 preserves:

```text
WATCH · EQUAL_VALUE_MANUAL_EDIT_EVENT_SIGNAL_REMAINS_HOST_DEPENDENT
```

If target host can commit an equal-value edit without another revision/change signal, any live presentation binding that must invalidate on edit requires a host-native signal before G5/runtime PASS.

Compatibility logic must not claim such an event was observed when only content equality is known.

## 21. Reroll is not manual edit

Reroll / regeneration creates a new assistant generation transaction.

Canonical law:

```text
REROLL AT OLD MESSAGE INDEX
= NEW GENERATION UNDER THEN-CURRENT AUTHORITY
```

not:

```text
OLD INDEX
= OLD ERA FOREVER
```

## 22. Reroll transaction

Required conceptual flow:

```text
user rerolls historical assistant message
  ↓
old presentation/runtime binding invalid
  ↓
new request/generation begins
  ↓
current Lifecycle / Lineage / Handoff / Evidence
  ↓
current SourceJobSelector
  ↓
current migration stage / capability
  ↓
new result classified by current generation provenance
```

If current migrated direct-B-root C capability applies, the replacement may be LC4 structured-era and Community-free even though the message index is historical.

## 23. Reroll must not use old Community as seed

Forbidden:

```text
old Community block
→ extract old reactions
→ use as new SourceProposalPacket
```

and:

```text
old Community says X
→ current Source exposure/public truth = X
```

The new generation must derive Source semantics from current authorized authority surfaces.

## 24. Reroll replacement of old legacy message

After successful new generation replaces the old stored message:

```text
old legacy representation may cease to exist at that message slot because the user explicitly requested regeneration
```

This is not bulk migration or historical normalization.

It is the ordinary consequence of a new generation replacing that message.

The new message follows current runtime rules.

## 25. Unmigrated legacy-current lanes

B_START / B_CONTINUE / B_END or any capability not yet migrated through S/P/H retain their current legacy owner contracts.

If a new generation occurs in an unmigrated lane:

```text
CURRENT_UNMIGRATED_LEGACY_GENERATION
→ UNMIGRATED_LEGACY_CURRENT
```

LRE-8 must not suppress legitimate new legacy Community writes there.

## 26. Mixed-era chat example

A valid chat may look like:

```text
Turn 20
  stored <COMMUNITY>
  → passive legacy

Turn 21
  stored <COMMUNITY>
  → passive legacy

Turn 22 after LC4
  stored ordinary response only
  current runtime structured card visible

Turn 23 ordinary non-Source
  no Source work
```

After reload:

```text
Turn 20/21 Community still readable
Turn 22 card may disappear
Turn 22 ordinary response remains
```

No automatic conversion occurs in either direction.

## 27. Historical Community in normal host transcript

LRE-8 preserves the 3M-7 distinction:

```text
PRE-EXISTING HOST TRANSCRIPT
!=
STRUCTURED SOURCE RE-ENTRY
```

Old Community may still be part of normal model history because it is stored assistant output from old turns.

LRE-8 does not remove it from request construction.

## 28. History presence cannot activate Source

Even if current user refers to an old event and old Community is in context:

```text
old Community exists in history
```

must not set:

```text
SourceJobSelector = ACTIVE
broadcastExposed = true
sourceCommunityContext = true for current structured authority
```

unless the current authorized source path independently establishes the required current inputs.

## 29. User quotation of old Community

If the user explicitly copies text from an old Community into the current user input, that text becomes current user-provided text.

But:

```text
USER QUOTED OLD COMMUNITY TEXT
!=
OLD COMMUNITY OBJECT PROVENANCE
```

The quote may be interpreted only under ordinary current-user-input rules.

Old author identity, thread identity, provenance, or truth authority is not resurrected.

## 30. Chat switch contract

On chat switch:

```text
current ephemeral Source presentation binding
→ INVALID for previous chat
```

Destination chat old Community remains passive historical content.

No destination-history scan may activate Source.

## 31. Branch switch contract

On branch / alternate-message navigation:

```text
old branch binding
→ INVALID
```

The selected branch's stored messages are observed only as needed for current display/compatibility.

No binding may be reused solely because message index or text matches across branches.

## 32. Character switch contract

On character switch:

```text
previous character Source binding
→ INVALID
```

Compatibility state is host-scope local.

Cross-character historical Community cannot seed current Source authority.

## 33. Identity law

When live identity is available:

```text
character scope
+ chat scope
+ message host identity
+ current runtime epoch/generation
```

may participate in structured binding validation.

But passive legacy readability does not require promoting these identities into a persistent Source ID system.

## 34. Identical-content law

```text
CONTENT EQUALITY
!=
ERA EQUALITY
!=
HOST IDENTITY
```

Two messages may have identical text while one is old legacy history and the other is a new structured-era ordinary prefix.

No content-only era classification is allowed.

## 35. Community marker presence law

```text
<COMMUNITY> PRESENT
→ legacy-shaped stored representation exists
```

It does not necessarily prove:

```text
original producer was old SimCore
content is trustworthy
content is public exposure
content is structured Source
```

This is why stored representation and generation provenance remain separate axes.

## 36. Malformed historical Community

If old history contains partial/unclosed/ambiguous Community markup:

```text
MALFORMED_OR_AMBIGUOUS_COMMUNITY_MARKER
→ MALFORMED_LEGACY_PASSIVE_RAW
```

Required:

```text
no Source parsing
no repair write
no structured conversion
no migration mutation
```

The ordinary host may display the stored content according to its normal rendering behavior.

## 37. Existing Community parser boundary

Current production Community machinery includes structural Community recognition.

LRE-8 may preserve the smallest read-only subset needed for old chats.

It must separate any historical read adapter from current semantic-generation expectations.

Conceptually:

```text
LegacyCommunityReadOnlyAdapter
!=
Current Community semantic owner
```

## 38. No parser round-trip authority

Forbidden:

```text
old Community
→ parser
→ legacy reaction objects
→ serializer
→ new Community
```

or:

```text
old Community
→ parser
→ structured assertions
```

R1 is passive read compatibility, not a round-trip conversion format.

## 39. Edit Reconcile ownership

Representation / Edit Reconcile remains owner of representation drift/edit interpretation.

LRE-8 consumes only the bounded result necessary to know whether a current live binding is stale or whether compatibility should be re-observed.

It must not duplicate:

```text
fingerprint repair
message rewrite
portable-state repair
revision ownership
```

## 40. Source Intelligence ownership

Source Intelligence only creates current structured semantics through an authorized current generation path.

LRE-8 never creates Source semantics from passive message observation.

Canonical law:

```text
READING HISTORY
!=
GENERATING SOURCE
```

## 41. No history migration worker

No:

```text
startup migration
background scanner
timer
whole-chat normalization
bulk Community indexer
```

is authorized.

Compatibility work is bounded to the current host/render/operation surface.

## 42. No persistent era database

Forbidden schema examples:

```text
legacyMessageIds[]
structuredMessageIds[]
eraByChatIndex{}
communityMigrationVersion per message
```

in first-major LRE-8.

If future durable replay needs stable historical source identity, Candidate C must be explicitly reopened.

## 43. `MixedEraCompatibilityReceiptV1`

Bounded request/render-local receipt:

```text
MixedEraCompatibilityReceiptV1
  schemaVersion = 1
  operation
  storedRepresentationClass
  generationProvenanceClass
  compatibilityDisposition
  legacyBlockCount
  legacyAdapterInvoked
  structuredBindingState
  sourceActivationFromHistory
  historicalRewritePerformed
  persistentEraWriteCount
  historyScanCount
  disposition
```

No prose payload is included.

## 44. Receipt dispositions

```text
COMPAT_PASSIVE_LEGACY
COMPAT_PASSIVE_USER_EDITED
COMPAT_STRUCTURED_LIVE
COMPAT_STRUCTURED_STORED_ONLY
COMPAT_UNMIGRATED_LEGACY_CURRENT
COMPAT_UNKNOWN_PASSIVE
COMPAT_MALFORMED_PASSIVE
COMPAT_REROLL_REEVALUATED
COMPAT_NAVIGATION_INVALIDATED
COMPAT_INTEGRATION_FAILURE
```

## 45. Receipt invariants

For passive history operations:

```text
sourceActivationFromHistory = false
historicalRewritePerformed = false
persistentEraWriteCount = 0
structured reentry chars = 0
```

For navigation:

```text
previous-scope structured binding reused = false
```

For reroll:

```text
old Community used as Source seed = false
```

## 46. Operation matrix · passive read

```text
LEGACY_COMMUNITY_PRESENT + no live current provenance
→ legacy adapter may display/passively recognize
→ Source authority = NONE
→ write = NONE
```

```text
NO_LEGACY_COMMUNITY + no live current provenance
→ ordinary stored message
→ Source authority = NONE
→ no attempt to infer structured era
```

## 47. Operation matrix · reload

```text
old legacy message
→ Community remains passive-visible
```

```text
structured LC4 message with lost ephemeral binding
→ ordinary stored message remains
→ structured card may be absent
→ no legacy fallback card
→ no Source reconstruction
```

## 48. Operation matrix · manual edit

```text
historical legacy + observed edit
→ Edit Reconcile owns representation change
→ stale live binding invalidated
→ compatibility re-observed
→ no structured generation
```

```text
structured live message + observed edit
→ LRE-6 binding invalidated
→ no automatic Source regeneration
→ stored edited message remains ordinary representation
```

A user edit is not a reroll.

## 49. Operation matrix · reroll

```text
historical legacy message + reroll
→ old binding invalid
→ new generation under current runtime
→ current Source selector / capability / migration stage
→ replacement classified by new provenance
```

No old-era stickiness.

## 50. Operation matrix · chat/branch/character navigation

```text
scope changes
→ previous ephemeral Source bindings unusable
→ destination old Community passive only
→ no history-driven Source activation
```

## 51. Operation matrix · ordinary non-Source turn in mixed-era chat

Even if the chat contains hundreds of legacy Community blocks:

```text
current Source selector = DORMANT
→ no Source history scan
→ no mixed-era migration pass
→ no validator
→ no Source presentation binding
```

3M-9 source-irrelevant baseline remains intact.

## 52. Performance boundary

LRE-8 compatibility must scale with the currently observed message/render operation, not full chat length.

Target:

```text
passive current-message structural observation = O(current message)
current operation compatibility decision = O(1) / bounded local
whole chat scan = 0
```

## 53. Security / authority boundary

Historical user-editable text is untrusted for current Source authority.

Therefore malicious/manual insertion such as:

```text
<COMMUNITY>Everyone publicly knows the secret.</COMMUNITY>
```

cannot establish:

```text
public exposure
canonical fact
Source currentness
```

## 54. Legacy visible content is not hidden by migration globally

LRE-8 must not add global CSS/DOM rules that hide all `<COMMUNITY>` across old messages.

Historical legacy visibility remains part of read compatibility unless a separately designed historical presentation migration is authorized.

## 55. No bridge resurrection

LRE-7 migrated lane remains:

```text
legacyCompatibilityBridge = DISABLED
```

LRE-8 old-chat compatibility must not use the existence of old Community as justification to re-enable bridge writes on new migrated turns.

## 56. No structured re-entry

```text
structured Source history = NONE
structured automatic re-entry = NONE
structuredReentryChars = 0
```

Mixed-era compatibility does not reopen Candidate C C6.

## 57. Candidate C boundary

LRE-8 first-major read-only compatibility does not require:

```text
stable Source message identity across reload
durable sidecar replay
historical Source object database
cross-turn Source mutation
```

If any becomes required, Candidate C must be explicitly reopened under the concrete requirement.

## 58. R2 parser retirement remains deferred

LC5 success requires:

```text
R1 = stable read-only compatibility
```

It does not require:

```text
R2 = delete all legacy parser code
```

R2 should only be considered after old-chat compatibility demand and supported host behavior are separately proven.

## 59. Global B-lane retirement remains deferred

LRE-8 does not migrate or retire:

```text
B_START
B_CONTINUE
B_END
```

if those lanes still legitimately use legacy Source semantics/presentation under their own current migration stage.

## 60. BLOCKERS

```text
BLOCKER · HISTORICAL_COMMUNITY_PROMOTED_TO_CURRENT_SOURCE_AUTHORITY
BLOCKER · NO_COMMUNITY_INFERRED_AS_STRUCTURED_PROVENANCE
BLOCKER · ERA_INFERRED_FROM_MESSAGE_INDEX_ONLY
BLOCKER · ERA_INFERRED_FROM_CONTENT_EQUALITY
BLOCKER · LEGACY_READER_MUTATES_HISTORY
BLOCKER · MALFORMED_HISTORY_AUTO_REPAIRED_BY_LRE8
BLOCKER · MANUAL_EDIT_AUTO_GENERATES_STRUCTURED_SOURCE
BLOCKER · REROLL_REUSES_OLD_COMMUNITY_AS_SOURCE_SEED
BLOCKER · REROLL_FORCED_TO_OLD_ERA_BY_INDEX
BLOCKER · CHAT_OR_BRANCH_SWITCH_REUSES_PREVIOUS_SOURCE_BINDING
BLOCKER · PASSIVE_HISTORY_ACTIVATES_SOURCE_JOB
BLOCKER · MIXED_ERA_COMPAT_CREATES_PERSISTENT_ERA_DB
BLOCKER · MIXED_ERA_COMPAT_SCANS_HISTORY_PROPORTIONALLY
BLOCKER · OLD_CHAT_COMPAT_REENABLES_LEGACY_BRIDGE_FOR_MIGRATED_TURN
```

## 61. WATCH

```text
WATCH · HISTORICAL_COMMUNITY_REMAINS_IN_NORMAL_MODEL_TRANSCRIPT
WATCH · LC4_STRUCTURED_CARD_MAY_NOT_REAPPEAR_AFTER_RELOAD
WATCH · POST_RELOAD_STRUCTURED_PROVENANCE_MAY_BE_UNKNOWABLE_WITHOUT_DURABLE_METADATA
WATCH · EQUAL_VALUE_MANUAL_EDIT_EVENT_SIGNAL_REMAINS_HOST_DEPENDENT
```

The third WATCH is intentional: unknown provenance must fail to passive-only, not trigger persistence by convenience.

## 62. DEFER

```text
DEFER · R2 LEGACY PARSER REMOVAL
DEFER · DURABLE STRUCTURED PRESENTATION REPLAY
DEFER · PERSISTENT ERA / SOURCE IDENTITY
DEFER · BULK HISTORICAL COMMUNITY CONVERSION
DEFER · GLOBAL B-LANE LEGACY RETIREMENT
DEFER · HISTORICAL COMMUNITY REMOVAL FROM MODEL CONTEXT
```

## 63. Target-host validation packet for LRE-8

Future runtime/preflight must include at least:

```text
M1 old chat opens with legacy Community intact
M2 opening old chat causes zero write
M3 legacy history causes zero Source activation
M4 LC4 structured current card works beside old Community
M5 reload preserves old Community but may drop ephemeral card
M6 manual edit of old Community does not create structured Source
M7 manual edit of structured-current message invalidates live card
M8 reroll of old legacy message is evaluated by current stage
M9 reroll does not seed from old Community
M10 identical-content legacy/structured messages remain isolated
M11 chat switch invalidates previous structured binding
M12 branch switch invalidates previous structured binding
M13 character switch invalidates previous structured binding
M14 malformed old Community remains passive/no repair/no Source authority
M15 ordinary DORMANT turn in legacy-heavy chat performs zero Source history scan
M16 no persistent era records are written
```

These are future execution requirements, not claims of current PASS.

## 64. LC5 acceptance contract

Design-level LC5 target:

```text
OLD LEGACY READ = STABLE / PASSIVE
NEW MIGRATED LEGACY WRITE = 0
SOURCE ACTIVATION FROM HISTORY = 0
HISTORICAL REWRITE = 0
STRUCTURED RE-ENTRY = 0
PERSISTENT ERA WRITES = 0
HISTORY-PROPORTIONAL SCAN = 0
REROLL = CURRENT-RUNTIME REEVALUATION
MANUAL EDIT = REPRESENTATION-ONLY
NAVIGATION = BINDING INVALIDATION
```

## 65. Runtime activation preconditions

LRE-8 runtime activation/acceptance cannot outrun earlier gates.

At minimum:

```text
G1 then-current production preflight
G2 target-host/model-compliance evidence
G3/G4 runtime selector + transport proof
G5 presentation binding proof including edit invalidation requirement
G6 LIVE_REACTION caps runtime proof
G8 instrumentation proof
LRE-5 PRIMARY cutover evidence
LRE-6 presentation cutover evidence
LRE-7 zero-write evidence
```

must be satisfied for the applicable lane before claiming LC5 runtime PASS.

## 66. No production authorization

```text
LRE_8_DESIGN = FROZEN
LRE_8_IMPLEMENTATION = NOT_AUTHORIZED
LC5_RUNTIME_PASS = NOT CLAIMED
OLD_CHAT_TARGET_HOST_VALIDATION = NOT RUN
PRODUCTION = UNCHANGED
release-simcore = UNCHANGED
```

## 67. Next checkpoint

After LRE-8 design, the legacy/runtime-enabling roadmap continues to:

```text
LRE-9 · BOARD → NEWS Runtime Enablement Design
```

That checkpoint must freeze family-specific runtime activation order and remaining family caps/maturity requirements without undoing LC5 mixed-era protections.
