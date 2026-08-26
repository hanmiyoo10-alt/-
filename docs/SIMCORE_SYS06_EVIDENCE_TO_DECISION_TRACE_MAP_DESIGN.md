# SYS-06 — Evidence-to-Decision Trace Map — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_DOC_ONLY · CURATED EVIDENCE→DECISION LINEAGE · NO APPLICATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-06
Idea          = Evidence-to-Decision Trace Map
Size          = MEDIUM
Importance    = 4 / HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_DOC_ONLY
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_EVIDENCE_INDEX.md`
- `docs/SIMCORE_EVIDENCE_INDEX_ENTRY_FORMAT_DESIGN.md`
- `docs/SIMCORE_SYS13_VERIFICATION_PROOF_MATRIX_DESIGN.md`
- `docs/SIMCORE_SYS21_FORENSIC_CLASSIFICATION_CONSISTENCY_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS28_VERIFICATION_DEBT_INDEX_DESIGN.md`
- `docs/SIMCORE_SYS02_DECISION_SUPERSESSION_GRAPH_DESIGN.md`
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- future `SYS-18 Evidence Provenance Chain Receipt`
- future `SYS-14 Evidence Freshness Ledger`
- future `SYS-07 Cross-Reference Integrity Auditor`

Existing authorities SYS-06 must not replace:
- source evidence documents, run IDs, diagnostics, release receipts, fixture/test results, and natural-live specimens as exact evidence authorities;
- `SIMCORE_EVIDENCE_INDEX.md` / its curated source as contract-centric evidence navigation;
- SYS-13 as proof-kind × claim-kind fitness and non-equivalence authority;
- SYS-17 as required evidence-slot completeness authority;
- SYS-21 as human forensic classification-consistency review;
- SYS-28 as living verification-debt posture;
- SYS-02 as decision-to-decision supersession lineage;
- SYS-35 as repository transaction lineage;
- current gate/policy/release/design documents as the actual decision authorities.

---

## 1. Problem

SimCore already preserves a large amount of evidence and a large number of reviewed decisions.

Examples of evidence include:

```text
natural real-long-chat specimens
permanent fixture / deterministic test results
permanent CI runs
architecture checker output
release publication identity
living-state convergence evidence
operator/tooling incident evidence
```

Examples of decisions include:

```text
PASS / WATCH / FIX / BLOCKER disposition
live-gate close / remain-pending decision
release authorization / hold decision
architecture checkpoint acceptance
verification debt classification
rollback-vs-correction readiness decision
bounded design or implementation acceptance
```

The repository already has strong authorities for both sides, but it does not yet have one durable layer answering the historical question:

```text
Which exact evidence was actually used as a material input to this exact decision?
What role did that evidence play?
Which part of the decision did it support or challenge?
Was the evidence merely available nearby, or was it actually cited as basis?
```

Without explicit lineage, later sessions can accidentally infer decision basis from proximity:

```text
evidence file exists near a decision
→ assume it caused the decision

CI passed before a release
→ assume it established every release claim

historical specimen is linked from a contract
→ assume it justified the latest current disposition

one live sample exists
→ assume it closed every related gate
```

Those inferences are unsafe.

SYS-06 defines a curated **Evidence-to-Decision Trace Map** that records only reviewed, source-backed evidence→decision relationships.

---

## 2. Core invariant

```text
immutable / bounded evidence identity
+ bounded decision identity
+ reviewed trace role
+ exact affected decision scope
+ source authority basis
→ one durable evidence→decision trace edge

SYS-06
!= evidence discovery
!= proof-strength inference
!= decision engine
!= gate engine
!= current-state authority
!= forensic severity classifier
!= evidence-slot analyzer
!= supersession graph
!= repository transaction graph
!= generic backlink graph
```

Canonical question:

> Which exact reviewed evidence materially informed which exact recorded decision, and in what bounded role?

SYS-06 does not answer:

> Was that decision correct now?

> Is the evidence still fresh enough now?

> What claim is that proof kind allowed to establish in general?

Those questions remain with their owning authorities.

---

## 3. Why v1 is `NR_DOC_ONLY`

Evidence→decision linkage is semantic.

A tool can mechanically discover that a document contains a path, run ID, or version string, but it cannot safely conclude:

```text
this citation was the PRIMARY basis
this specimen was only supporting context
this contrary result forced review
this evidence actually closed the gate
this nearby evidence was not used at all
```

Automatic link inference would manufacture decision rationale from textual proximity.

Therefore useful v1 materialization is one curated living repository artifact, conceptually:

```text
docs/SIMCORE_EVIDENCE_TO_DECISION_TRACE_MAP.md
```

No crawler, citation scraper, embedding system, LLM judge, CI hook, GitHub Action, repository writer, automatic graph generator, or background watcher is part of v1.

Apply Class:

```text
NR_DOC_ONLY
```

A future read-only integrity checker may consume the curated map, but that is a separate implementation decision.

---

## 4. Relationship to the existing Evidence Index

The generated Evidence Index is contract-centric navigation.

Conceptually:

```text
SIMCORE_EVIDENCE_INDEX
contract
→ semantic owner
→ authority
→ live evidence
→ fixture
→ evidence release
→ PASS / WATCH / GAP
```

It intentionally does not infer decision rationale.

SYS-06 is decision-lineage metadata:

```text
exact evidence
→ exact reviewed decision
→ bounded role in that decision
```

Therefore:

```text
Evidence Index row exists
!= SYS-06 trace exists

Evidence Index Status = PASS
!= a specific gate/decision consumed that PASS
```

SYS-06 may reference Evidence Index rows for navigation, but source evidence and decision authorities remain the actual semantic bases.

---

## 5. Relationship to SYS-13 Verification Proof Matrix

SYS-13 answers the general proof-fitness question:

```text
proof kind × claim kind
→ DIRECT / CONDITIONAL / SUPPORTING / NONE
```

SYS-06 answers the historical lineage question:

```text
this exact proof/evidence identity
→ was used in this exact decision
→ with this reviewed role and scope
```

SYS-06 must never override SYS-13.

If a trace claims:

```text
permanent CI run
→ PRIMARY_BASIS for named natural-live PASS
```

but SYS-13 says that proof relationship is not fit, the trace is invalid/review-required.

Canonical rule:

```text
trace records actual decision use
!= permission to overclaim proof
```

A bad historical decision may have relied on unfit evidence; SYS-06 may preserve that history only with a review/conflict state rather than laundering it into valid proof.

---

## 6. Relationship to SYS-21 Forensic Classification Consistency Check

SYS-21 asks:

```text
Does a forensic classification stay within cited evidence/proof/impact boundaries?
```

SYS-06 asks:

```text
Which evidence did the recorded decision actually cite/use?
```

Therefore SYS-06 can reduce evidence-identity ambiguity for SYS-21, but it does not itself declare a classification consistent or inconsistent.

Example:

```text
TRACE:
CI run X → SUPPORTING_BASIS → WATCH_ONLY disposition Y

SYS-21:
review whether WATCH_ONLY is semantically consistent with all cited evidence
```

SYS-06 preserves lineage; SYS-21 audits interpretation.

---

## 7. Relationship to SYS-28 Verification Debt

SYS-28 owns unresolved verification obligation posture.

SYS-06 may trace evidence that changes a debt decision, for example:

```text
focused direct-execution proof arrives
→ decision changes NOT_CLAIMED to PROVEN
```

but SYS-06 does not calculate debt state.

Likewise:

```text
no SYS-06 evidence edge
!= missing required evidence
```

Required-slot/debt authorities must explicitly say an obligation exists.

---

## 8. Relationship to SYS-02 Decision / Supersession Graph

The two graphs have deliberately different edge types.

```text
SYS-02
DECISION A
→ superseded/amended/retired by
DECISION B

SYS-06
EVIDENCE E
→ materially informed
DECISION A or B
```

Never encode decision replacement as an evidence edge.
Never encode evidence support as a supersession edge.

Together they permit navigation such as:

```text
Evidence E1 → Decision A
Decision A → superseded by Decision B
Evidence E2 → Decision B
```

without inventing:

```text
Evidence E1 → Decision B
```

Evidence support does not automatically transfer through supersession.

---

## 9. Decision objects

One SYS-06 target is always a bounded reviewed decision object.

Preferred identity order:

```text
stable decision / gate / work / classification ID
→ exact authority path#stable-heading/marker
→ exact authority path + bounded semantic label
```

Examples:

```text
06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT / PASS-WATCH-FIX-BLOCKER close decision
R2.1 delegated operator activation decision
SYSTEM_IDEA_SELECTION_EDGE_OMISSION_SYS24 / FIX disposition
M2-3 checkpoint close decision
named anomaly WATCH/FIX/BLOCKER disposition
```

A whole file is not automatically one decision.
Use the smallest stable decision scope that preserves meaning.

A moving branch name or generic text such as `latest decision` is not sufficient identity.

---

## 10. Evidence objects

One source edge must bind to the narrowest defensible evidence identity.

Preferred evidence identities:

```text
natural live specimen
→ version + runtime/generation + scenario/control + evidence document/specimen marker

CI
→ workflow run ID + job/step when material

focused test
→ commit SHA + test path/mode + fixture/input identity

permanent harness
→ commit/source identity + registered suite + report/run identity

release publication
→ release commit + shared blob + version + publication/receipt identity

architecture evidence
→ base/head or commit + checker/contract identity

repository/tooling event
→ exact commit/PR/tool result + evidence document
```

Generic evidence labels such as:

```text
CI passed
live looked good
old test
latest diagnostic
```

are insufficient.

If the exact evidence cannot be resolved:

```text
TRACE_UNRESOLVED
```

rather than guessing.

---

## 11. Frozen v1 trace-role vocabulary

Exactly five v1 roles:

```text
PRIMARY_BASIS
SUPPORTING_BASIS
CONTRARY_INPUT
TRIGGER_INPUT
CLOSURE_INPUT
```

### `PRIMARY_BASIS`

The decision authority explicitly relies materially on this evidence for the recorded decision scope.

This does not mean the evidence alone proves every statement in the decision.

### `SUPPORTING_BASIS`

The evidence materially supports the decision but is not the principal deciding input.

Examples:
- deterministic regression protection supporting a human live close;
- historical positive control supporting but not replacing current release evidence.

### `CONTRARY_INPUT`

The evidence materially challenges the current/then-proposed decision or classification.

It may trigger review without automatically invalidating the decision.

### `TRIGGER_INPUT`

The occurrence of this evidence caused the bounded decision/review process to begin or change posture.

Example:

```text
specific direct anomaly specimen
→ opens a FIX review
```

Trigger does not equal sufficient proof for the eventual disposition.

### `CLOSURE_INPUT`

The evidence is explicitly required/used to close a previously pending bounded decision or gate.

Example:

```text
named real-long-chat scenario result
→ closes its named live gate
```

`CLOSURE_INPUT` is narrow and must not be used merely because the evidence arrived late in the process.

---

## 12. Role non-equivalence

The role vocabulary is not a strength ranking.

```text
PRIMARY_BASIS
!= strongest proof kind

CLOSURE_INPUT
!= universal correctness proof

TRIGGER_INPUT
!= confirmed root cause

CONTRARY_INPUT
!= automatic blocker

SUPPORTING_BASIS
!= ignorable evidence
```

Proof fitness remains with SYS-13.
Decision authority remains with the target source.

---

## 13. Affected decision scope

Every trace edge names the exact part of the target decision influenced by the evidence.

Good examples:

```text
live-gate named scenario result
current anomaly disposition
release publication identity claim
focused direct-execution claim
rollback source eligibility review
architecture slice acceptance
```

Bad examples:

```text
everything
overall confidence
release
M2
system health
```

One evidence item may have multiple trace edges when it legitimately informs separate decisions/scopes.

Do not collapse them into one vague edge.

---

## 14. Frozen trace state vocabulary

Exactly four v1 trace states:

```text
TRACE_ACTIVE
TRACE_HISTORICAL
TRACE_REVIEW_REQUIRED
TRACE_UNRESOLVED
```

### `TRACE_ACTIVE`

The edge accurately describes the evidence basis for a currently relevant living decision.

### `TRACE_HISTORICAL`

The edge is valid point-in-time lineage for a historical/superseded decision.

Historical does not mean false.

### `TRACE_REVIEW_REQUIRED`

The relation is source-backed enough to preserve but one material scope/role/proof-fit issue requires human review.

### `TRACE_UNRESOLVED`

A trustworthy evidence or decision identity cannot be resolved without guessing.

No `TRACE_PASS` state exists.
The map does not judge the underlying evidence or decision correct.

---

## 15. Edge schema

Each v1 trace row contains:

```text
Trace ID
Evidence ref
Evidence kind / proof ref when available
Decision ref
Trace role
Affected decision scope
Decision-time classification / result
Basis / authority refs
Trace state
Notes / non-claims
```

### Trace ID

Stable map-local navigation identity:

```text
EDT-001
EDT-002
```

It is not a release/work/evidence/decision numbering authority.

### Evidence ref

Exact evidence identity per §10.

### Evidence kind / proof ref

Prefer a SYS-13 proof kind/record when the decision makes a verification claim.

This field does not create a new proof classification.

### Decision ref

Exact bounded decision authority per §9.

### Trace role

One value from §11.

### Affected decision scope

One bounded semantic description.

### Decision-time classification / result

Record the decision result as it existed at that point, e.g.:

```text
PASS
WATCH
FIX
BLOCKER
PENDING_REAL_LONG_CHAT
ACTIVE / AWAITING GENUINE RELEASE PROOF
```

This is copied historical/current context, not SYS-06's own status vocabulary.

### Basis / authority refs

Sources showing that the evidence was actually used as decision input.

A nearby citation alone is insufficient if it does not support the relationship.

### Notes / non-claims

Explicitly preserve boundaries such as:

```text
deterministic evidence only; natural-live proof not claimed
publication identity only; runtime PASS not claimed
one specimen; recurrence/root cause not claimed
```

---

## 16. Inclusion rule

SYS-06 is intentionally curated, not exhaustive.

Include an edge when:

```text
1. a bounded decision is meaningful enough to preserve, and
2. exact evidence materially informed it, and
3. the relationship is source-backed, and
4. preserving the relationship reduces future ambiguity.
```

Do not include every citation.
Do not include every test executed during every task.
Do not include decorative/background references.

Canonical rule:

```text
row absent
!= evidence irrelevant
!= decision unsupported
!= GAP
```

The map is high-value lineage, not a complete citation database.

---

## 17. Historical preservation and later decisions

A later decision must not rewrite the old edge as if the old decision never happened.

Example:

```text
E1 → PRIMARY_BASIS → WATCH decision A
later E2 arrives
→ PRIMARY_BASIS → FIX decision B
A is superseded/reclassified by B
```

Correct preservation:

```text
E1 → A = TRACE_HISTORICAL
E2 → B = TRACE_ACTIVE
A → B supersession/revision = SYS-02
```

Incorrect:

```text
delete E1 → A because current state is FIX
```

This preserves why the system made the earlier decision with the evidence it had then.

---

## 18. Contradictory evidence

If evidence items disagree, SYS-06 records the actual decision use rather than choosing a winner.

Example:

```text
E1 = deterministic PASS
E2 = natural live failure
```

Possible reviewed map:

```text
E1 → SUPPORTING_BASIS → decision review
E2 → CONTRARY_INPUT / PRIMARY_BASIS → FIX decision
```

SYS-13/SYS-21/owning decision authority determines semantic interpretation.

SYS-06 must not calculate weighted confidence or majority vote.

---

## 19. Current SimCore examples validating the design

These are design examples only; they do not materialize the final map.

### 19.1 v0.64.7 reload-cache-continuity live gate

Current Evidence Index row records:

```text
contract = reload-cache-continuity
fixture = EXECUTABLE
live evidence = NONE
status = GAP
related = 06407_RELOAD_CACHE_CONTINUITY_REAL_LONG_CHAT
```

Correct SYS-06 posture before the live sample:

```text
fixture/permanent evidence
→ may SUPPORT the pending gate design/readiness
→ must not be CLOSURE_INPUT for natural live PASS

missing live evidence
→ no fabricated evidence edge
→ gate remains source-owned PENDING_REAL_LONG_CHAT
```

When the exact long-chat specimen is later classified, that specimen may become a CLOSURE_INPUT to the named gate decision if the owning authority explicitly uses it that way.

### 19.2 v0.64.5 genuine-edit baseline

The direct v0.64.5 natural sample can be traced to the decision:

```text
pre-M2-3 genuine-edit positive baseline = ESTABLISHED
```

but not to the future post-M2-3 recheck decision, which still requires new evidence after extraction.

Evidence support does not transfer through time automatically.

### 19.3 R2.1 delegated release operation

Permanent CI qualification and activation evidence support:

```text
ACTIVE / AWAITING GENUINE RELEASE PROOF
```

They do not support:

```text
genuine release E2E = PROVEN
```

A future genuine runtime release must provide its own trace to that later decision.

### 19.4 SYS-24 selection drift FIX

The inventory contradiction and preserved drift document are direct inputs to the decision:

```text
SYSTEM_IDEA_SELECTION_EDGE_OMISSION_SYS24
= FIX / DOC_DRIFT / NON_RUNTIME / NON_BLOCKING
```

The later corrected inventory is evidence of containment/convergence, not proof that the original drift never happened.

---

## 20. Downstream relationship to SYS-18 Evidence Provenance Chain Receipt

SYS-18 is expected to consume SYS-06 lineage rather than inventing evidence→decision links independently.

Conceptually:

```text
source specimen / run / receipt
→ proof identity / evidence authority
→ SYS-06 evidence→decision edge
→ bounded decision authority
→ optional SYS-02 later supersession lineage
```

SYS-18 may package that chain as a receipt, but SYS-06 remains the semantic link authority for the evidence→decision edge.

---

## 21. Downstream relationship to SYS-14 Evidence Freshness Ledger

Freshness is meaningful only relative to what evidence is still relied upon.

SYS-14 may later use SYS-06 to ask:

```text
Which current decisions still depend materially on this evidence?
```

but SYS-06 itself does not age evidence, set TTLs, or mark evidence stale.

Historical trace edges remain valid history even when evidence is no longer suitable for a current decision.

---

## 22. Downstream relationship to SYS-07 Cross-Reference Integrity Auditor

SYS-07 may later verify that:

```text
Evidence ref resolves
Decision ref resolves
Basis refs resolve
SYS-02 / SYS-06 / Evidence Index cross-links are not dangling
```

but SYS-07 must not infer missing semantic trace edges merely because references coexist.

---

## 23. Failure-closed rules

### Unknown evidence identity

```text
→ TRACE_UNRESOLVED
```

Do not substitute a moving branch, nearest file, or guessed latest run.

### Unknown decision identity

```text
→ TRACE_UNRESOLVED
```

Do not invent a decision node from chat memory.

### Proof-fit conflict

```text
trace role appears to overclaim SYS-13 fitness
→ TRACE_REVIEW_REQUIRED
```

Do not rewrite SYS-13.

### Historical/current ambiguity

```text
SYS-05/SYS-02 lifecycle or supersession state unresolved
→ TRACE_REVIEW_REQUIRED or TRACE_UNRESOLVED
```

Do not silently present an old evidence edge as current.

---

## 24. Forbidden automation / inference

SYS-06 v1 must never:

```text
scrape every citation and call it a trace
infer PRIMARY_BASIS from citation order
infer decision causality from timestamps
infer proof strength from test names
infer current truth from newest evidence
copy evidence support through SYS-02 supersession
convert supporting evidence into gate closure
promote WATCH/FIX/BLOCKER
close verification debt
publish release-simcore
mutate main authorities
```

---

## 25. Preferred future artifact shape

Conceptual document:

```text
# SimCore Evidence-to-Decision Trace Map

Status: CURATED LIVING LINEAGE · NON-AUTHORITATIVE FOR SOURCE FACTS

| Trace | Evidence | Decision | Role | Scope | Decision-time result | State | Basis |
|---|---|---|---|---|---|---|---|
| EDT-001 | ... | ... | PRIMARY_BASIS | ... | ... | TRACE_ACTIVE | ... |
```

Optional sections:

```text
Active current-decision traces
Historical decision traces
Review-required / unresolved traces
Maintenance notes
```

No giant copied evidence bodies.
Use durable refs and bounded summaries.

---

## 26. Verification contract for future application

Because v1 is document-only, future application verification is semantic/referential:

```text
[ ] every Evidence ref resolves to a real evidence authority/identity
[ ] every Decision ref resolves to a bounded reviewed decision authority
[ ] every role is one frozen v1 role
[ ] affected scope is bounded
[ ] basis refs actually support the relationship
[ ] SYS-13 proof fitness is not overclaimed
[ ] current/historical trace state respects SYS-05/SYS-02
[ ] no Evidence Index/current-state authority is duplicated
[ ] no executable/runtime/release file changes
[ ] release-simcore unchanged
```

No CI PASS is required to claim the design itself is frozen.

---

## 27. Non-claims

SYS-06 does not establish:

```text
that every decision is correct
that every decision has complete evidence
that every evidence item is fresh
that every citation is represented
that one PRIMARY_BASIS proves a global claim
that one CLOSURE_INPUT proves universal correctness
that historical evidence remains suitable for current decisions
that a decision is current merely because a trace is active-looking
```

Current truth remains source-owned.

---

## 28. Freeze verdict

```text
SYS-06 Evidence-to-Decision Trace Map
= DESIGN FROZEN
= MEDIUM / I4 / D3
= NON_RUNTIME
= NR_DOC_ONLY
= curated evidence→decision semantic lineage
= no automatic evidence discovery
= no proof-strength inference
= no decision/gate/classification authority
= no repository writer
= no runtime/release change
= application HOLD under active system-design sweep
```

Downstream consumers should treat SYS-06 as reviewed lineage metadata and must preserve all proof, lifecycle, supersession, and source-authority boundaries defined above.
