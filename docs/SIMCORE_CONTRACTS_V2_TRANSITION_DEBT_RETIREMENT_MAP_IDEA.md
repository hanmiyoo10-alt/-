# SimCore Contracts v2 Transition-Debt Retirement Map — IDEA

Status: `IDEA RECORDED · TRANSITION-DEBT ROADMAP · NO IMPLEMENTATION · NO RUNTIME CHANGE · RETIREMENT IS EVIDENCE-GATED`

Production authority while this map is recorded: `release-simcore` v0.64.7.

Related:
- `docs/SIMCORE_CONTRACTS_V2.md`
- `config/simcore-architecture-v2.json`
- `docs/SIMCORE_MODULE_COHESION_AND_EXTRACTION_GUIDELINE.md`
- `docs/SIMCORE_APPLICATION_SERVICE_BOUNDARY_MAP_IDEA.md`
- `docs/SIMCORE_STATE_OWNERSHIP_REGISTRY_V2_IDEA.md`
- `docs/SIMCORE_M2_4B_SESSION_STATE_HOLDER_CONTRACT.md`
- `docs/SIMCORE_M2_4C_RUNTIME_MIRROR_OBSERVATION_RECEIPT_CONTRACT.md`
- `docs/SIMCORE_M2_4D_OUTPUT_FINALIZATION_OWNERSHIP_DECISION.md`
- `docs/SIMCORE_M2_4E_RECOVERY_FACADE_CALL_SITE_AUDIT.md`
- `docs/SIMCORE_REGRESSION_FIXTURE_EXPANSION_COMPLETENESS_AUDIT_2026-08-26.md`

## 1. Purpose

Contracts v2 intentionally allowed staged migration rather than a big-bang rewrite.

That means the current architecture contains several different kinds of temporary debt:

```text
known dependency exceptions
compatibility facades
physical ownership that has not yet moved to its frozen target
Session-held facts that belong to narrower owners
Runtime policy interpretation that belongs below Runtime
HYBRID_TRANSITIONAL test surfaces caused by physical ownership
temporary policy-label coupling between otherwise separated owners
```

This document maps those debts to explicit retirement conditions.

The goal is not to maximize deletion.

The goal is:

```text
keep temporary machinery while it reduces migration risk
→ retire it only when its replacement boundary is real
→ prove behavior equivalence
→ remove the corresponding Contracts/config exception at the same time
```

## 2. Retirement vocabulary

Every debt item uses one of these lifecycle states:

```text
ACTIVE_TRANSITION_DEBT
= current physical source still contains the debt

RETIRE_AT_MILESTONE
= target milestone is already known, but physical work is not yet authorized/complete

RETIRE_AFTER_ZERO_CALLER_PROOF
= compatibility surface may disappear only after all consumers migrate

RETIRE_WHEN_EDGE_DISAPPEARS
= dependency exception is removed per actual source edge, not by deadline

PROMOTE_WHEN_OWNER_EXPOSED
= test debt disappears when an already-planned ownership boundary becomes directly executable

WATCH_SEPARATE_EXTRACTION
= real ownership debt exists, but it should not be silently folded into another patch

NOT_DEBT
= deliberately retained architecture; do not remove merely to make the diagram smaller
```

## 3. Debt classification rule

A transition debt is not automatically a correctness defect.

Canonical distinction:

```text
CORRECTNESS DEFECT
→ behavior is wrong

TRANSITION DEBT
→ behavior may be correct, but physical ownership / dependency / compatibility shape is temporary
```

Therefore debt retirement must normally be:

```text
mechanical
+ equivalence-first
+ independently validated
```

If a correctness defect is discovered while retiring debt, record it separately as WATCH / DEFER / FIX / BLOCKER and do not smuggle semantic repair into the ownership move.

## 4. Master retirement map

| ID | Debt | Type | Current state | Retirement target / trigger | Required proof |
|---|---|---|---|---|---|
| TD-01 | outer-runtime + Session split Edit Reconcile decision tree | ownership | `ACTIVE_TRANSITION_DEBT` | M2-3 physical `edit-reconcile` application service | representation-fast + genuine-edit differential controls; snapshot write/no-write equivalence; Fresh remains identity evidence only |
| TD-02 | `recovery` compatibility facade | compatibility | `RETIRE_AFTER_ZERO_CALLER_PROOF` | post-M2-3/M2-4 direct-owner call-site migration | zero `require('./recovery')`; zero `recovery.*` runtime calls; direct `output-compat` / `bootstrap-migration` equivalence |
| TD-03 | Session-owned `finalizePreparedOutput` transaction | ownership/cohesion | `RETIRE_AT_MILESTONE` | M2-4D `output-finalize` extraction after post-M2-3 rebase | finalization differential matrix; no Store/Host movement; B_END/reaction/time/frame/structure equivalence |
| TD-04 | Runtime Mirror interprets Output Compat candidate meaning | ownership | `RETIRE_AT_MILESTONE` | M2-4C Observe → Interpret → Apply → Record split | one Fresh read; unchanged guards; candidate-match equivalence; no raw Fresh retention |
| TD-05 | Representation knows Output Compat policy labels | coupling | `WATCH_SEPARATE_EXTRACTION` | move to accepted-canonical-equivalence facts after M2-4C boundary exists | exact prior-match equivalence; provenance classifications unchanged; no new policy import |
| TD-06 | Session `loadedFromLegacySnapshot` as trust/policy fact | state ownership | `RETIRE_AT_MILESTONE` | Bootstrap/Migration returns bounded adoption/trust result | fresh/snapshot/mirror/legacy load differential proof; trusted identity tuple unchanged |
| TD-07 | Session `deferredPruneIndex` / `deferredPruneRunning` | persistence-housekeeping ownership | `RETIRE_AT_MILESTONE` | Store owns retention scheduling/dedupe/running state | identical prune cadence/outcome; no output semantic policy enters Store |
| TD-08 | Session owner-specific `*Stats` receipts | state/diagnostic placement | `WATCH_SEPARATE_EXTRACTION` | transient forwarding receipt / bounded diagnostic envelope when useful | boundedness preserved; diagnostic meaning unchanged; no new diagnostic subsystem required |
| TD-09 | Kernel upward dependency exceptions to Domain modules | dependency inversion | `RETIRE_WHEN_EDGE_DISAPPEARS` | remove each exception individually when its actual source import/need disappears | architecture checker passes; state/schema normalization equivalence; no new upward edge |
| TD-10 | `representation-fast` fixture is HYBRID_TRANSITIONAL | test surface | `PROMOTE_WHEN_OWNER_EXPOSED` | M2-3 direct Edit Reconcile boundary | same stable fixture ID becomes EXECUTABLE; no duplicate representation suite |
| TD-11 | `genuine-edit` fixture is HYBRID_TRANSITIONAL | test surface | `PROMOTE_WHEN_OWNER_EXPOSED` | M2-3 direct Edit Reconcile boundary | USER_EDIT_CANDIDATE → MANUAL_EDIT_REBUILT positive control executable directly |
| TD-12 | `broadcast-closure` final B_END unlock is HYBRID_TRANSITIONAL | test surface | `PROMOTE_WHEN_OWNER_EXPOSED` | output-finalize boundary exposes deterministic final unlock | existing broadcast-closure suite gains direct unlock execution; no new broadcast-lifecycle suite |

## 5. TD-01 — Edit Reconcile ownership split

Contracts v2 already defines the target:

```text
edit-reconcile
= single application owner of previous-assistant reconciliation path selection
```

Current debt exists because physical logic remains divided between:

```text
outer request/runtime shell
+
CoreRulesetSession.reconcileEditedOutput(...)
```

The debt is not merely code duplication. The application decision tree lacks one physical authority.

Retirement milestone:

```text
M2-3
```

Required frozen controls:

```text
Prior OUTPUT_MISMATCH + current == prior FRESH_CHAT exact
→ REPRESENTATION_FAST_RECONCILED
→ snapshot UNCHANGED

Prior EXACT + current matches neither canonical nor Fresh
→ USER_EDIT_CANDIDATE
→ MANUAL_EDIT_REBUILT
```

Also preserve:

```text
no raw Fresh body retention
no new host read
no Representation taxonomy duplication
same snapshot/load/save semantics
same legacy fallback behavior
```

M2-3 closes TD-01 only when the physical decision tree and its regression controls move together.

## 6. TD-02 — Recovery compatibility facade

M2-1 intentionally created:

```text
output-compat
bootstrap-migration
```

while retaining `recovery` as the old API surface.

The current facade owns:

```text
no policy
no state
no I/O
```

Therefore it is legitimate transition machinery but not a long-term service.

Retirement gate:

```text
post-M2-3 call-site inventory
→ migrate surviving output calls to output-compat
→ migrate surviving bootstrap/legacy calls to bootstrap-migration
→ prove zero runtime facade consumers
→ remove/deprecate facade
→ synchronize Contracts/config/module inventory
```

Do not retire it before the call-site migration simply because it is thin.

Do not replace it with a renamed catch-all facade.

## 7. TD-03 — Output Finalization inside Session

M2-4D provisionally selected extraction of the deterministic transaction now represented by `finalizePreparedOutput(...)`.

Target:

```text
output-finalize
= deterministic output state transition Application service
```

It owns ordering of existing owner calls, not their semantics.

Retirement of the Session-held finalization debt requires:

```text
M2-3 actual source stable
→ M2-4D rebase
→ mechanical helper extraction
→ normal-output caller migrated
→ any edit-reconcile replay caller migrated if still present
```

The following must remain outside the new service:

```text
Store I/O
Host I/O
Runtime Mirror
Output Compat policy meaning
Edit Reconcile policy
operator-facing rendering
```

This debt is an extraction candidate because responsibility is independently describable, not because Session is large.

## 8. TD-04 — Runtime Mirror compatibility-policy interpretation

Current Runtime Mirror legitimately owns:

```text
Fresh host observation
exact fingerprint comparison
async identity/location/epoch/sequence guards
safe mirror transport
```

But it currently also interprets exact candidate matches into policy-shaped meanings such as:

```text
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

M2-4C classifies that interpretation as ownership debt.

Target split:

```text
Runtime Mirror
→ observation facts + strict guard + safe application/transport

Output Compat
→ candidate meaning + acceptance policy

Representation
→ identity relation/provenance

Session
→ accepted trusted identity anchor only
```

Retirement proof must preserve:

```text
at most one Fresh host read per mirror operation
no weakened stale/supersession/location guard
no raw Fresh/candidate-body retention
same accepted candidate families
same mismatch fail-closed behavior
```

## 9. TD-05 — Representation ↔ Output Compat label coupling

Current Representation exact-prior matching knows policy-shaped values including:

```text
FRESH_CONFIRMED_SUFFIX
BOUNDARY_CONFIRMED_SUFFIX
SAFE_BOUNDARY_CONFIRMED
```

This is secondary coupling debt, not an independent correctness problem.

Long-term target:

```text
Representation receives bounded accepted-canonical-equivalence facts
→ classifies CANONICAL / HOST_RAW / FRESH identity relation
→ does not need to enumerate Output Compat policy names
```

Do not retire TD-05 before TD-04 provides the correct bounded fact boundary.

Preferred sequencing:

```text
M2-4C observation/interpretation boundary first
→ differential proof
→ remove label coupling in same or separately proven mechanical slice
```

If combining them would enlarge the risk surface, keep TD-05 as a separate follow-up.

## 10. TD-06 — Session legacy/trust policy fact

M2-4B identifies:

```text
loadedFromLegacySnapshot
```

as a current compatibility fact whose semantic interpretation belongs to Bootstrap/Migration rather than Session.

Behavior that must remain:

```text
legacy/untrusted state must not manufacture trusted output identity
current/repaired state may return trusted identity when existing conditions allow it
```

Target result shape is conceptual only:

```text
Bootstrap/Migration result
→ state
→ source
→ trustedIdentityEligible
→ bootstrapStatus
→ bounded migration receipt

Session
→ adopts result
→ stores only bounded init/orchestration status
```

Do not simply delete the flag without reproducing its trust-gating outcome.

## 11. TD-07 — Session retention housekeeping state

Current Session holds:

```text
deferredPruneIndex
deferredPruneRunning
```

M2-4B classifies these as Store housekeeping ownership debt.

Target:

```text
Session
→ requests retention housekeeping at the correct application point

Store
→ cadence eligibility
→ duplicate suppression
→ running-state guard
→ prune execution
```

Retirement gate:

```text
identical retention behavior
identical snapshot survival/prune outcome
no semantic output decision moves into Store
```

This move may be performed as a narrow M2-4 mechanical slice and must not be combined with performance tuning.

## 12. TD-08 — Session owner-specific diagnostic receipts

Current bounded Session receipts include examples such as:

```text
communityAliasRepairStats
templateRecurrenceBootstrapStats
narrativeClockMigrationStats
```

Their boundedness is acceptable.

The debt is only that their physical lifetime/placement can make Session look like the semantic owner.

Possible retirement outcomes:

```text
KEEP_AS_TRANSIENT_FORWARDING_RECEIPT
RETURN_DIRECTLY_FROM_OWNER
MOVE_TO_BOUNDED_DIAGNOSTIC_ENVELOPE
```

This is intentionally lower priority.

Do not invent a new observability framework solely to eliminate three bounded fields.

Retire only when another ownership move naturally provides a cleaner receipt boundary.

## 13. TD-09 — Kernel upward dependency exceptions

Contracts v2 explicitly allow current Kernel transition exceptions to:

```text
community
recurrence
lineage
handoff
```

These are known M0 inverted-dependency debts.

Important rule:

```text
RETIRE THE EDGE, NOT THE LABEL
```

Do not remove the allowlist entry while the physical import still exists.
Do not force all four edges into one large Kernel rewrite.

Each exception should retire independently when an actual mechanical seam removes its need.

Potential enabling mechanism such as a pure `state` seam remains a candidate, not a pre-decided requirement.

Per-edge retirement proof:

```text
actual upward dependency removed
architecture checker no longer needs exception
state initialization/reconciliation stays equivalent
serialization/schema output stays equivalent
no replacement upward edge appears elsewhere in Foundation
```

Timing:

```text
trigger-based / later architecture work
not required to close M2-3 or M2-4 unless those changes naturally remove an edge
```

## 14. TD-10 / TD-11 — Edit Reconcile HYBRID fixture exposure

Current permanent registry intentionally retains:

```text
representation-fast  HYBRID_TRANSITIONAL
genuine-edit         HYBRID_TRANSITIONAL
```

This is not missing fixture design.

The semantic fixture identities are already frozen.

Retirement target after M2-3:

```text
same fixture IDs
→ direct executable Edit Reconcile boundary
→ EXECUTABLE
```

Forbidden response:

```text
create another representation/edit suite
copy outer runtime algorithms into test-only helper
expose production-only API solely for fixture convenience
```

M2-3 ownership movement itself should create the legitimate executable seam.

## 15. TD-12 — Broadcast final unlock HYBRID fixture exposure

The existing `broadcast-closure` suite already owns the family.

Current subcoverage:

```text
Lifecycle classification    EXECUTABLE
Broadcast airtime           EXECUTABLE
Structure controls          EXECUTABLE
final B_END unlock          HYBRID_TRANSITIONAL
```

The final unlock remains physically buried inside output-finalization orchestration.

If M2-4D `output-finalize` lands, the existing suite should promote that subcase to direct execution.

Do not create a new `broadcast-lifecycle` suite.

Retirement of this test-surface debt is supporting evidence for output-finalize extraction, not the architectural reason for extraction.

## 16. Deliberately retained architecture — NOT DEBT

The retirement map must explicitly protect intentional architecture from aesthetic cleanup.

### 16.1 Lifecycle as request-domain coordinator

Contracts v2 deliberately selected:

```text
Lifecycle remains current request-domain preparation coordinator for M2
```

This is currently:

```text
NOT_DEBT
```

Do not create a generic TurnPipeline just to remove cross-domain coordination from Lifecycle.

Reconsider only if later evidence shows Lifecycle has become an ownership gravity well rather than one coherent request-domain coordinator.

### 16.2 Session itself

Target Session remains:

```text
PER_CHAT_STATEFUL_APPLICATION_ORCHESTRATOR
```

Shrinking Session does not imply deleting Session.

Keeping current state, Store association, output position, trusted identity references, phase markers, and bounded init status is intentional architecture.

### 16.3 Compatibility aliases inside physical owners

Removing Recovery does not imply deleting useful internal/public functions from `output-compat` or `bootstrap-migration`.

Retire the duplicate facade alias, not the owner API automatically.

### 16.4 HYBRID_TRANSITIONAL as a temporary fixture classification

HYBRID does not mean a broken test system.

It is a truthful label for a contract whose physical owner is not yet directly executable.

Promote only when the ownership boundary becomes real.

### 16.5 Deferred `state` seam candidate

A possible pure Foundation `state` seam is not itself a mandatory milestone.

It becomes justified only if dependency inversion work proves it is the cleanest way to remove Kernel upward edges without duplicating policy.

## 17. Retirement ordering constraints

Some debts have explicit dependencies on other debt retirement.

Canonical partial order:

```text
v0.64.7 live gate close
→ M2-3 TD-01
   ├─ enables TD-10 representation-fast EXECUTABLE
   └─ enables TD-11 genuine-edit EXECUTABLE

M2-3 stable source
→ M2-4A actual responsibility inventory
→ rebase M2-4B/C/D/E

M2-4C TD-04
→ then TD-05 can safely lose Output Compat label knowledge

M2-4D TD-03
→ enables TD-12 final B_END unlock direct execution

post-M2-3/M2-4 direct-owner migration
→ TD-02 Recovery zero-caller retirement

M2-4B narrow state cleanup
→ TD-06 / TD-07 / opportunistic TD-08

TD-09 Kernel edges
→ independent trigger-based retirement when actual seams exist
```

Do not collapse this into one giant M2-4 patch.

## 18. Per-retirement evidence packet

Every retired debt item should leave a small durable evidence packet in `main` containing:

```text
debt ID
before physical shape
after physical shape
source/branch commit
static/architecture result
regression result
runtime/live result if runtime artifact changed
Contracts/config metadata change
remaining related debt IDs
```

If runtime bytes changed, normal production sequencing remains mandatory.

If only non-runtime fixture metadata changed, do not invent a release-simcore deployment.

## 19. Contracts/config synchronization rule

A transition exception or transitional module status must disappear from Contracts/config only when source reality changes.

Canonical order:

```text
physical source moves
→ static/regression proof
→ architecture metadata reflects new source truth
```

Never:

```text
edit diagram/config first
→ pretend debt is gone while source still contains it
```

For runtime mechanical refactors, architecture metadata belongs in the same coherent architecture change/evidence sequence, but release-system redesign remains separate.

## 20. Stop / reopen rule

This map is complete when every known transition debt has:

```text
why it exists
current classification
target owner/shape
retirement trigger
required proof
ordering dependency
```

Do not create retirement work merely to reduce the debt count.

Reopen/add an item only when:

```text
new source inspection reveals a temporary owner overlap
new dependency exception is explicitly authorized
an architecture extraction intentionally leaves a compatibility shim
a fixture becomes HYBRID due to a new staged move
a real ownership debt is discovered during implementation/live validation
```

Any unexpected new transition debt must be recorded rather than silently normalized into the architecture.

## 21. Current roadmap verdict

```text
CONTRACTS_V2_TRANSITION_DEBT
= EXPLICITLY INVENTORIED
= RETIREMENT EVIDENCE-GATED
= NO BIG-BANG CLEANUP

NEXT GUARANTEED RETIREMENT MILESTONE
= M2-3 EDIT RECONCILE OWNERSHIP MOVE

NEXT POST-M2-3 RETIREMENT FAMILY
= M2-4 SESSION / RUNTIME MIRROR / OUTPUT FINALIZE / RECOVERY CLEANUP

KERNEL DEPENDENCY EXCEPTIONS
= RETIRE PER EDGE WHEN ACTUAL SOURCE ALLOWS

HYBRID FIXTURES
= PROMOTE THROUGH REAL OWNER EXPOSURE

INTENTIONAL LIFECYCLE / SESSION ARCHITECTURE
= KEEP

IMPLEMENTATION NOW
= NONE

RUNTIME CHANGE NOW
= NONE
```

## 22. Suggested next research slice

If continuing design-only architecture work, proceed to:

```text
SIMCORE_MODULE_COHESION_AUDIT
```

Purpose:

```text
audit current production modules using
COHESIVE_LARGE / WATCH_EXTRACTION / EXTRACTION_CANDIDATE / EXTRACTION_REQUIRED
```

Use this retirement map to avoid classifying already-known staged transition debt as a newly discovered architecture problem.

The audit may create new WATCH candidates, but it does not authorize extraction.
