# SimCore Exposure Model Compliance Evaluation Protocol — 2026-09-01

Date: 2026-09-01 KST

Status: **EVAL PROTOCOL FROZEN · BASELINE VS CANDIDATE · NO MODEL RUN EXECUTED · NO IMPLEMENTATION AUTHORITY · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · DIRECT B-ROOT · MODEL COMPLIANCE · PAIRED A/B EVALUATION · RELEASE DECISION EVIDENCE**

Related design/evidence:

```text
docs/SIMCORE_EXPOSURE_KNOWLEDGE_IMPACT_SCOPE_2026-09-01.md
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR_2026-09-01.md
docs/SIMCORE_EXPOSURE_SEMANTIC_ADVERSARIAL_FIXTURE_CORPUS_2026-09-01.md
```

This document freezes how the next real model-compliance evidence must be collected.

It does not modify:

```text
release-simcore
plugins/simcore/latest.js
plugins/simcore/install.js
runtime Prompt bytes
Lineage / Handoff / Evidence
Community / Reaction / Structure
persistent schema
request/history mutation
S7 / P13 / v0.70.3 scope
```

No model-compliance run is claimed by this document.

---

## 1. Purpose

The Exposure line has already proven four different things:

```text
1. product invariant exists:
   Community may use EXPOSED information only

2. direct-B-root first slice is structurally bounded

3. the frozen candidate can be represented as exactly six Prompt lines

4. 12 semantic fixtures define what ALLOW / DENY means
```

None of those prove:

```text
THE MAIN MODEL ACTUALLY FOLLOWS THE SIX LINES
```

The next evidence must therefore compare the same model under two conditions:

```text
BASELINE
= current deployed v0.70.1 Prompt behavior

CANDIDATE
= the same request and same runtime behavior
  plus exactly the frozen six exposure-restraint lines
  at the frozen insertion point
```

Canonical question:

```text
Does the candidate reduce exposure-policy violations
without making Community less knowledgeable, less natural,
or structurally less correct than the baseline?
```

---

## 2. Evaluation doctrine

This protocol follows the repository feedback principle:

```text
with candidate
VS
baseline / previous behavior
```

and evaluates three independent evidence dimensions:

```text
objective assertions
qualitative semantic review
cost / execution overhead
```

The protocol therefore rejects a one-dimensional success criterion such as:

```text
"candidate leaked less, therefore ship it"
```

A candidate that prevents leakage by suppressing valid public knowledge, visible-cue inference, social attribution, humor, or normal Community expression is not a successful implementation.

Canonical balance:

```text
EXPOSURE SAFETY
+
PUBLIC-KNOWLEDGE RETENTION
+
NATURAL COMMUNITY BEHAVIOR
+
STRUCTURAL CORRECTNESS
+
BOUNDED COST
```

---

## 3. Production authority at protocol freeze

Production authority remains:

```text
version         = 0.70.1
release name    = Cold First-Turn Tail Attribution
release branch  = release-simcore
release commit  = 861100f4771967aa5b8ab8811d06f11702c0d3ff
```

`main` is design/evidence authority only.

Before executing this protocol in the future, the runner must re-read then-current production authority.

If the deployed Prompt/Handoff/Lineage/Evidence shape differs materially from the assumptions frozen here:

```text
STOP
→ classify HARNESS_DRIFT
→ update the eval design before running
```

Do not silently adapt the candidate to new production in the middle of evidence collection.

---

## 4. Scope remains direct B-root only

The model-compliance evaluation is limited to:

```text
DIRECT_B_ROOT_MODE_C_EXPOSURE_RESTRAINT
```

Every evaluated fixture must satisfy the already-frozen gate:

```text
mode == C
communitySourceHandoffEligible == true
communitySourceHandoffRootMode == B
communitySourceHandoffParentMode == B
communitySourceHandoffRootIndex >= 0
communitySourceHandoffParentIndex >= 0
communitySourceHandoffParentIndex == communitySourceHandoffRootIndex
communitySourceHandoffDepth == 1
```

Out of scope:

```text
MULTI_B_SOURCE_EXPOSURE_WINDOW
A-source exposure
INLINE_C exposure
long-C recurrence exposure
persistent audience memory
channel reachability / propagation
generic private-state database
semantic post-output fact checker
```

No result from this protocol may be generalized to those paths.

---

## 5. Conditions under test

### Condition B0 — Baseline

```text
B0 = exact current production Prompt behavior
```

Requirements:

```text
no exposure six-line overlay
no hidden helper instruction
no fixture-specific correction
no post-generation repair
```

### Condition E6 — Candidate

```text
E6 = B0 + exactly six frozen exposure lines
```

The lines are:

```text
short_community_b_exposure_scope=direct_root_broadcast_turn
short_community_b_audience_exposure_basis=current_source_visible_broadcast_prose+current_user_explicit_public_disclosure;mere_mention_or_reaction_request_does_not_publish_hidden_fact=1
short_community_b_source_community_role=derived_social_context_not_event_fact_authority;rumor_opinion_may_recur_only_as_attributed_rumor_opinion_or_reaction=1
short_community_b_source_knowledge_role=continuity_context_not_audience_exposure_authority;reference_context_alone_not_public_knowledge_certificate=1
short_community_b_unknown_exposure=do_not_assert_as_known_public_fact;event_scope_expansion_does_not_expand_audience_exposure=1
short_community_b_visible_cue_inference=allowed_as_inference_opinion_joke;hidden_private_state_not_confirmed_without_exposure=1
```

Required insertion order:

```text
existing current source/event provenance
→ six E6 exposure lines
→ existing new-source guidance, if present
```

No other Prompt line may be added, deleted, reordered, or rewritten for E6.

---

## 6. Candidate delivery must not equal production installation

The first model-compliance run must not require shipping E6 to production users.

Preferred execution shape:

```text
isolated eval harness / synthetic request materialization
→ exact baseline request
→ optional request-local E6 overlay
→ model generation
→ evidence capture
```

Required properties:

```text
persistent runtime state unchanged
installed plugin unchanged
release-simcore unchanged
normal user sessions unaffected
candidate overlay exists only in the synthetic eval request
```

If the available host cannot produce a request-local candidate without installing it globally:

```text
BLOCK · EVAL_HARNESS_CANNOT_ISOLATE_CANDIDATE
```

Do not convert an evaluation transaction into an accidental release.

---

## 7. Fixture authority

The semantic source set is:

```text
products/simcore/tooling/exposure-semantic-adversarial-fixture-corpus.mjs
```

Current frozen inventory:

```text
12 fixtures
7 TRAPS
5 CONTROLS
```

The fixtures define semantic review oracles, not production truth.

The model-compliance runner must not rewrite a fixture after seeing model output merely to make the candidate pass.

Allowed future corpus evolution:

```text
new general failure class
new independently justified control
clarified oracle ambiguity
```

Forbidden overfitting:

```text
copy one failed model phrase into the Prompt
then edit the fixture until the phrase disappears
```

---

## 8. Trap inventory and target behavior

The seven trap classes are:

```text
1. Knowledge-only hidden fact confirmation
2. prior Community rumor promoted to canonical fact
3. reference/world omniscience promoted to public fact
4. visible cue overclaimed into hidden private-state confirmation
5. mere hidden-fact mention treated as publication
6. historical/event scope treated as audience-exposure expansion
7. unknown exposure upgraded into confirmed public fact
```

Desired candidate behavior:

```text
no confirmed-public assertion that violates the frozen semantic oracle
```

Natural alternatives remain allowed where appropriate:

```text
speculation
question
joke
visible-cue inference
explicit rumor attribution
uncertainty language
```

The candidate must not be rewarded merely for refusing to react.

---

## 9. Control inventory and target behavior

The five controls are:

```text
1. prior Community rumor retained as attributed social context
2. visible broadcast fact stated as known public fact
3. visible-cue inference/opinion
4. current-user explicit public disclosure
5. Knowledge duplicate with independent broadcast exposure
```

Desired candidate behavior:

```text
retain the allowed information channel
and continue producing ordinary Community reactions
```

The main utility risk is:

```text
UNDER-KNOWLEDGE
```

Examples:

```text
broadcast clearly says the score is 3-1
but candidate refuses to acknowledge the score

visible hands are shaking
but candidate treats any "looks nervous" reaction as forbidden

prior Community rumor exists
but candidate deletes even attributed discussion of that rumor
```

These are regressions.

---

## 10. Evaluation unit

One atomic evaluation unit is:

```text
fixture_id
+ condition [B0 | E6]
+ trial_id
+ immutable model/settings fingerprint
+ exact request fingerprint
+ generated output
+ timing/accounting metadata
+ blind semantic review result
```

Each condition must begin from an independent fixture state.

Forbidden contamination:

```text
B0 output becomes history for E6
E6 output becomes history for B0
trial 1 output becomes history for trial 2
reviewer feedback is inserted into later model context
```

Each trial is a fresh synthetic session or equivalent isolated request.

---

## 11. Pairing and execution order

Every fixture/trial forms a pair:

```text
same fixture
same model identity
same model settings
same character/reference inputs
same source surfaces
same current-user input
same runtime authority

only difference:
B0 lacks six lines
E6 contains six lines
```

Condition order must be counterbalanced or randomized.

Do not always run:

```text
B0 then E6
```

because temporal/model-service drift could become condition bias.

Record actual order.

Preferred opaque labels during review:

```text
Condition X
Condition Y
```

The semantic reviewer should not know which is B0 or E6 until scoring is complete.

---

## 12. Generation-control policy

If the host/model exposes deterministic generation controls that are known to be meaningful:

```text
pin them identically for paired B0/E6 trials
```

If no reliable deterministic seed exists:

```text
keep all available settings identical
use repeated paired trials
record model/service identity and timestamps
```

Never fake determinism by claiming two stochastic generations are equivalent because the UI settings look the same.

The protocol records uncertainty rather than inventing reproducibility.

---

## 13. Two-stage sample plan

### Stage M1 — Smoke

Purpose:

```text
catch harness bugs and obvious semantic regressions cheaply
```

Run:

```text
12 fixtures
× 2 conditions
× 1 trial
= 24 generations
```

M1 does not authorize production promotion.

Stop immediately if:

```text
candidate lines missing or duplicated
wrong insertion point
fixture not direct-B-root eligible
B0 and E6 differ by anything besides six lines
candidate changes persistent state
obvious E6 critical leakage
obvious E6 catastrophic under-knowledge
```

### Stage M2 — Bounded comparative evidence

Run only after M1 harness integrity passes.

Run:

```text
12 fixtures
× 2 conditions
× 3 independent paired trials
= 72 generations
```

Per condition:

```text
7 trap fixtures × 3 = 21 trap outputs
5 control fixtures × 3 = 15 control outputs
36 outputs total
```

This is the first bounded evidence set eligible for a promotion decision.

Three trials are an initial bounded repeat count, not a universal statistical truth. If output variance makes disposition unstable, classify the result as inconclusive and increase evidence in a separately authorized follow-up rather than cherry-picking the favorable trial.

---

## 14. Per-output semantic disposition

Every output receives exactly one primary disposition:

```text
PASS_ALLOWED
FAIL_LEAK
FAIL_UNDERKNOWLEDGE
FAIL_ATTRIBUTION
FAIL_OVERCLAIM
FAIL_STRUCTURE
REVIEW_AMBIGUOUS
```

Definitions follow.

### PASS_ALLOWED

Output respects the fixture oracle and remains appropriately expressive.

### FAIL_LEAK

Community presents a hidden/unexposed proposition as known/confirmed public fact.

This is a critical exposure failure.

### FAIL_UNDERKNOWLEDGE

Output suppresses or denies a fact/inference/social attribution that the fixture explicitly allows.

Examples:

```text
refuses visible broadcast fact
refuses explicit current-user publication
forbids visible-cue inference entirely
```

### FAIL_ATTRIBUTION

A prior social claim is used with the wrong epistemic status.

Typical form:

```text
rumor/opinion exists
→ output restates it as world fact
```

If the wrong attribution results in a hidden fact being asserted as confirmed public fact, use the more severe `FAIL_LEAK` primary disposition and record attribution as a secondary note.

### FAIL_OVERCLAIM

Visible evidence supports a weaker inference, but output upgrades it into a more specific unsupported internal/private proposition.

### FAIL_STRUCTURE

The output violates the owning Community/Knowledge structural contract enough that semantic scoring is not trustworthy.

### REVIEW_AMBIGUOUS

The text does not cleanly resolve to pass/fail without interpretation.

Ambiguous is not silently counted as pass.

---

## 15. Secondary qualitative dimensions

In addition to the primary disposition, score:

```text
NATURALNESS      1..5
REACTIVITY       1..5
EPISTEMIC_CLARITY 1..5
```

### Naturalness

Does the Community sound like ordinary reactions rather than policy text?

### Reactivity

Does it actually react to visible/current material rather than becoming generic or evasive?

### Epistemic clarity

When uncertainty/rumor/inference is relevant, does wording preserve the correct degree of certainty without awkward over-explanation?

These scores are qualitative evidence and must not replace primary semantic disposition.

---

## 16. Structural assertions

Mechanically check where possible:

```text
fixture id preserved
condition id preserved
candidate six-line count exactly 6
candidate six-line hashes match frozen design
B0 candidate-line count exactly 0
candidate insertion order correct
no duplicate candidate line
request identities equal except candidate overlay
model/settings fingerprints equal within each pair
required Community / Knowledge output shape still valid
```

A mechanical failure in the request pair is:

```text
HARNESS_INVALID
```

The affected pair must be rerun after fixing the harness; its generated outputs are not usable evidence.

---

## 17. Blind review protocol

Reviewer packet must hide condition identity.

The packet may show:

```text
fixture semantic oracle
source broadcast
source Community
source Knowledge
reference context
current user request
candidate output under opaque label X/Y
```

It must not show:

```text
"this is E6"
"this is baseline"
expected improvement narrative
prior reviewer scores
```

Recommended review sequence:

```text
1. score primary disposition
2. score qualitative dimensions
3. write one-sentence evidence rationale
4. mark ambiguity if necessary
5. reveal condition only after scoring is locked
```

For `REVIEW_AMBIGUOUS`, use a second independent review/adjudication pass if available.

A model grader may assist triage, but it must not be the sole authority for semantic promotion because the tested failure concerns subtle epistemic claims that can be paraphrased freely.

---

## 18. Evidence rationale requirement

Every non-pass must include a minimal claim-level rationale:

```text
what proposition was asserted/suppressed
which source surface supports or fails to expose it
why the fixture oracle allows/denies that assertion mode
```

Do not use vague labels such as:

```text
"felt wrong"
"maybe leaked"
```

Example:

```text
FAIL_LEAK:
output states the private resignation decision as confirmed;
that proposition appears only in source Knowledge and has no broadcast/user-publication basis.
```

---

## 19. M2 hard safety gate

E6 candidate must record:

```text
FAIL_LEAK = 0
```

across all:

```text
21 candidate trap outputs
```

Any E6 `FAIL_LEAK` means:

```text
BLOCK · EXPOSURE_CANDIDATE_STILL_LEAKS
```

The candidate is not eligible for production implementation from this protocol.

Do not average a critical leak away with many good outputs.

---

## 20. M2 utility gate

E6 must preserve allowed controls.

Required initial gate:

```text
at least 14 / 15 candidate control outputs
must receive PASS_ALLOWED
```

and:

```text
no control fixture may receive PASS_ALLOWED in 0 / 3 trials
```

Any candidate control output classified `FAIL_UNDERKNOWLEDGE` is reviewed explicitly as a utility regression.

If E6 receives fewer than 14/15 control passes:

```text
BLOCK · EXPOSURE_CANDIDATE_OVER_RESTRICTIVE
```

The 14/15 threshold is a bounded initial release-design gate, not a claim of universal statistical significance.

---

## 21. Comparative value gate

Even if E6 passes safety and utility, it must demonstrate value over B0.

Possible value evidence includes:

```text
fewer critical/major exposure failures
fewer ambiguous epistemic outputs
more stable correct attribution across rerolls
```

If:

```text
B0 already has zero relevant failures
AND
E6 produces no material robustness improvement
```

then classify:

```text
NO_INCREMENTAL_VALUE
```

Disposition:

```text
do not add production Prompt cost merely because E6 also passes
```

This follows the repository rule that a candidate must earn its context/orchestration cost.

---

## 22. Comparative non-regression gate

E6 must not make controls materially worse than B0.

Required:

```text
E6 control PASS_ALLOWED count
>=
B0 control PASS_ALLOWED count - 1
```

and:

```text
E6 median Naturalness
must not be more than 1 point below B0 median

E6 median Reactivity
must not be more than 1 point below B0 median
```

A large qualitative regression blocks promotion even when leakage improves.

Classification:

```text
BLOCK · COMMUNITY_UTILITY_REGRESSION
```

---

## 23. Ambiguity handling

`REVIEW_AMBIGUOUS` does not count as semantic pass for hard safety/utility gates until adjudicated.

If ambiguity remains after adjudication:

```text
HOLD · SEMANTIC_EVIDENCE_INCONCLUSIVE
```

Do not:

```text
assign the favorable interpretation
remove the difficult fixture
reroll until wording becomes easy to score
```

A high ambiguity rate is itself evidence that the contract may not be clear enough to the model.

---

## 24. Baseline failures are evidence, not permission

If B0 leaks:

```text
record it
```

Do not use baseline failure to excuse E6 failure.

E6 still requires zero critical leaks for initial promotion.

Likewise, if B0 under-knows a control:

```text
record it separately
```

The candidate should ideally improve or at least not worsen that behavior.

---

## 25. Output naturalness must not become policy recitation

A candidate output that says things like:

```text
"The audience cannot know unexposed information according to the rules."
```

may technically avoid leakage but is poor product behavior if ordinary Community reactions should have been possible.

Such output may receive:

```text
PASS on leak safety
but low Naturalness / Reactivity
```

and can still fail the comparative utility gate.

The desired behavior is implicit epistemic discipline, not visible policy narration.

---

## 26. Cost/accounting capture

For every B0/E6 pair capture, when observable:

```text
Prompt chars
Prompt tokens or tokenizer estimate
output tokens/chars
request preparation time
model generation latency
end-to-end latency
```

Also record:

```text
candidate line chars
candidate line count = 6
```

Primary cost question:

```text
What measurable context/latency cost does E6 add for the direct-B-root path?
```

A small semantic win with disproportionate recurring Prompt cost may require shrinking the lines before release.

No cost claim may be invented when the host does not expose the metric.

Use:

```text
NOT_OBSERVED
```

instead.

---

## 27. Required execution trace record

Each run should retain a machine-readable record conceptually containing:

```text
protocol_version
fixture_id
fixture_kind
condition_opaque_id
condition_actual_id [revealed after review]
trial_id
execution_order
production_release_commit
candidate_contract_hash
model_identifier
model_settings_fingerprint
character/reference fingerprint
request fingerprint
candidate_line_count
candidate_line_hashes
prompt accounting
output raw text
output structural status
primary disposition
secondary notes
naturalness
reactivity
epistemic_clarity
review rationale
reviewer/adjudication status
timestamps / latency where observable
```

Synthetic fixture content may be stored as evaluation evidence.

Do not mix real user private chat content into this corpus run.

---

## 28. Candidate hash discipline

Before model execution, compute and record a deterministic hash of the exact six candidate lines in order.

Every E6 run must use the same candidate hash.

If any run uses a different six-line payload:

```text
HARNESS_INVALID
```

Do not combine results from different Prompt variants into one candidate score.

Prompt iteration after failures requires a new candidate version and a new evidence run.

---

## 29. No mid-run Prompt tuning

Once M2 begins:

```text
candidate bytes are frozen
fixture bytes are frozen
scoring rubric is frozen
```

If a serious design flaw is discovered:

```text
stop M2
record failed candidate
create new design candidate
start a new evaluation identity
```

Do not patch E6 between trials while keeping the same result table.

---

## 30. Reroll policy

The three M2 trials are intentional independent repeats.

A reroll caused by model variance is still a trial and must not replace an unfavorable valid output.

Only invalid harness executions may be discarded and rerun.

Valid bad output:

```text
counts
```

Invalid request construction:

```text
does not count, fix harness and rerun the pair
```

This prevents survivorship bias.

---

## 31. Edit / rewind / session contamination

The first compliance protocol does not use ordinary conversation edit/rewind state as an evaluation variable.

Each case is materialized independently.

Reason:

```text
this protocol measures semantic effect of six Prompt lines
not conversation-history mutation behavior
```

If later production design requires reroll/edit lineage evidence, that becomes a separate validation transaction after implementation design.

---

## 32. Structure validation

The candidate must preserve existing SimCore output structure.

At minimum validate the owning direct-C output expectations applicable to the fixture environment, including:

```text
Community placement/shape where required
exactly one final Knowledge block where required
no candidate Prompt line echoed as output scaffolding
no malformed structural envelope caused by the new instructions
```

Structural invalidity can make semantic comparison unusable and is classified separately from exposure safety.

---

## 33. Decision table

After M2, choose exactly one disposition.

### `PROMOTION_EVIDENCE_PASS`

Requires all:

```text
harness integrity PASS
E6 FAIL_LEAK = 0 / 21 trap outputs
E6 control PASS_ALLOWED >= 14 / 15
no control fixture 0 / 3 pass
comparative value demonstrated
no material qualitative regression
cost acceptable / observed or explicitly unknown
no unresolved critical ambiguity
```

This disposition authorizes only the next design/implementation transaction.

It does not itself modify production.

### `BLOCK_EXPOSURE_CANDIDATE_STILL_LEAKS`

Any E6 critical leak.

### `BLOCK_EXPOSURE_CANDIDATE_OVER_RESTRICTIVE`

Control utility gate fails.

### `BLOCK_COMMUNITY_UTILITY_REGRESSION`

Naturalness/reactivity or comparative control behavior degrades materially.

### `REJECT_NO_INCREMENTAL_VALUE`

Baseline already satisfies the tested need and E6 adds no meaningful robustness.

### `HOLD_SEMANTIC_EVIDENCE_INCONCLUSIVE`

Ambiguity or stochastic instability prevents a trustworthy decision.

### `BLOCK_EVAL_HARNESS_DRIFT`

Request construction/model identity/candidate bytes cannot be kept comparable.

---

## 34. What a promotion pass would authorize

If and only if `PROMOTION_EVIDENCE_PASS` is reached, the next transaction may be:

```text
DIRECT_B_ROOT_EXPOSURE_RUNTIME_IMPLEMENTATION_DESIGN
```

That transaction must freshly re-read then-current production and decide:

```text
exact Prompt insertion symbol
diagnostic/accounting exposure
static tests
release identity
version placement
interaction with parked v0.70.2 and frozen S7/v0.70.3
real-chat acceptance boundary
```

This protocol does not pre-authorize implementation.

---

## 35. What a failure should not trigger

Do not react to a failed candidate by immediately building:

```text
persistent audience database
LLM semantic fact checker
hidden/public fact extraction pipeline
new generic knowledge graph
post-output censorship layer
```

A failure first means:

```text
six-line Prompt restraint was insufficient or over-restrictive
```

The smallest next action is to study the failure class and decide whether a bounded Prompt refinement remains viable.

---

## 36. Initial semantic success matrix

For convenience, the expected oracle classes from the 12-fixture corpus are:

```text
TRAPS
Knowledge-only hidden fact               → deny confirmed fact
prior Community rumor promoted to fact   → deny promotion
reference omniscience                     → deny confirmed fact
visible cue hidden-state overclaim        → deny overclaim
mere mention treated as publication       → deny publication
history scope treated as exposure scope   → deny exposure promotion
unknown exposure upgraded to public fact  → deny confirmed fact

CONTROLS
prior Community rumor attributed          → allow attributed social context
visible broadcast fact                    → allow known public fact
visible-cue inference                     → allow inference/opinion
explicit current-user public disclosure   → allow known public fact
Knowledge duplicate + broadcast exposure  → allow known public fact
```

The review rubric should assess meaning, not exact wording.

---

## 37. Anti-cheating / anti-overfitting rules

Forbidden:

```text
searching output for one magic phrase and declaring semantic pass
requiring exact fixture answer wording
penalizing harmless paraphrase
letting E6 see fixture oracle labels
letting model know it is the candidate condition
rerolling valid failures away
changing model or sampler between B0 and E6 pair
adding extra candidate instructions not in the six-line contract
```

The model sees the scenario, not the hidden answer key.

---

## 38. Mechanical harness candidates

A later tooling transaction may create a read-only/offline harness that:

```text
loads 12 fixtures
materializes B0/E6 request pairs
verifies candidate hashes/order
assigns opaque condition labels
records run metadata
builds blind review packets
aggregates locked reviewer scores
```

The harness must not implement semantic grading through regex alone.

Suggested future identifier:

```text
EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS
```

No such harness is implemented by this protocol document.

---

## 39. Real-device / real-host boundary

If the exact model request can only be generated inside the target RisuAI environment, that host interaction becomes a genuine physical/e2e evidence boundary.

The user should only be asked for actions that cannot be reproduced from repository tooling.

Before requesting any manual run, tooling should first prepare:

```text
exact fixture pack
condition materialization
capture instructions
acceptance table
minimal evidence fields
```

Do not make the user manually reconstruct Prompt lines or score dozens of cases from memory.

---

## 40. Release/S7 separation

This protocol remains outside S7.

```text
S7 = frozen simplification convergence P0→P12
Exposure = separate semantic feature/evidence lane
```

Therefore:

```text
no P13
no v0.70.3 semantic expansion
no release-simcore mutation
no runtime implementation
```

Any future production placement must be decided only after compliance evidence and fresh release-authority review.

---

## 41. WATCH / DEFER / BLOCKER classification

### WATCH

`WATCH · STOCHASTIC_MODEL_VARIANCE`

Three paired trials are bounded initial evidence. High variance can require a separate extended run.

`WATCH · REVIEWER_SEMANTIC_AMBIGUITY`

Subtle rumor/inference wording may require adjudication.

`WATCH · PROMPT_COST_MAY_OUTWEIGH_INCREMENTAL_VALUE`

If baseline is already robust, six lines may not earn permanent Prompt cost.

`WATCH · HOST_MODEL_IDENTITY_DRIFT`

Model/service updates during a run can invalidate pair comparability.

### DEFER

```text
MULTI_B_SOURCE_EXPOSURE_WINDOW
A_SOURCE_EXPOSURE
INLINE_C_EXPOSURE
persistent audience state
semantic post-output checker
production release design
```

### BLOCKER

None for creating the next offline/isolated evaluation harness.

Production implementation remains blocked pending actual model-compliance evidence.

---

## 42. Required final report shape

A completed M2 report must include at minimum:

```text
production authority identity
model/settings identity
candidate six-line hash
fixture corpus hash/identity
valid pair count
invalid/rerun pair count
B0 trap disposition counts
E6 trap disposition counts
B0 control disposition counts
E6 control disposition counts
E6 critical leak count
E6 control pass count
per-fixture 3-trial table
qualitative median scores
ambiguity/adjudication count
Prompt/accounting overhead if observed
latency overhead if observed
final disposition
```

Do not report only a single aggregate score.

Per-fixture evidence is required because different epistemic failure classes are not interchangeable.

---

## 43. Frozen next action

The next safe transaction is:

```text
EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS
```

Its job is only to operationalize this protocol.

Preferred first deliverables:

```text
offline fixture-to-pair manifest generator
candidate-line/hash verifier
opaque A/B labeling
review-packet schema
result aggregation schema
standalone deterministic harness tests
```

Actual model calls remain a separate execution step if the repository environment cannot reproduce the target RisuAI model host.

---

## 44. Final state

```text
EXPOSURE_IMPACT_SCOPE                    = COMPLETE
DIRECT_B_ROOT_EXPOSURE_CONTRACT          = FROZEN
OFFLINE_PROMPT_EVALUATOR                 = COMPLETE
SEMANTIC_ADVERSARIAL_CORPUS              = COMPLETE
MODEL_COMPLIANCE_EVAL_PROTOCOL           = FROZEN
MODEL_COMPLIANCE_RUN                     = NOT EXECUTED
PRODUCTION_IMPLEMENTATION                = NOT AUTHORIZED
RELEASE_SIMCORE_CHANGE                   = NONE
PROMPT_BYTE_CHANGE                       = NONE
PERSISTENT_SCHEMA_CHANGE                 = NONE
S7_CHANGE                                = NONE
NEXT                                      = EXPOSURE_MODEL_COMPLIANCE_EVAL_HARNESS
```
