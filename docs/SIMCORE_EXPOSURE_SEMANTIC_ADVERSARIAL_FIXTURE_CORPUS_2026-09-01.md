# SimCore Exposure Semantic Adversarial Fixture Corpus — 2026-09-01

Date: 2026-09-01 KST

Status: **OFFLINE SEMANTIC ORACLE CORPUS COMPLETE · 12/12 ORACLE MATCH · NO MODEL COMPLIANCE CLAIM · PRODUCTION / S7 UNCHANGED**

Classification: **EXPOSURE KNOWLEDGE · DIRECT B-ROOT · SEMANTIC ADVERSARIAL FIXTURES · OFFLINE EVIDENCE**

Related design/evidence:

```text
docs/SIMCORE_B_SOURCE_MODE_C_EXPOSURE_RESTRAINT_CONTRACT_2026-09-01.md
docs/SIMCORE_EXPOSURE_PROMPT_CONTRACT_OFFLINE_EVALUATOR_2026-09-01.md
```

Tooling:

```text
products/simcore/tooling/exposure-semantic-adversarial-fixture-corpus.mjs
products/simcore/tooling/exposure-semantic-adversarial-fixture-corpus.test.mjs
```

This transaction changes no deployed SimCore runtime, `release-simcore`, Prompt bytes, request construction, persistent state, Community, Reaction, Structure, Evidence, Lineage, Handoff, S7, or release identity.

---

## 1. Purpose

The previous transaction proved that the frozen direct-B-root Exposure contract can be represented deterministically as exactly six `short_community_b_*` Prompt lines.

That proof was structural only.

This corpus freezes the semantic oracle for the next question:

```text
Which Community claims are allowed public knowledge,
which are allowed inference/social attribution,
and which are exposure leakage?
```

The corpus does not call a model and does not claim that the model follows the six lines.

Canonical evidence sequence:

```text
product invariant
→ frozen six-line Prompt contract
→ deterministic entry-gate evaluator
→ semantic adversarial oracle corpus          [THIS]
→ future model-compliance evaluation
→ future runtime decision
```

Therefore:

```text
CORPUS PASS
!=
MODEL COMPLIANCE PASS
```

---

## 2. Scope remains direct B-root only

Every fixture uses the already-frozen eligible shape:

```text
mode = C
communitySourceHandoffEligible = true
rootMode = B
parentMode = B
rootIndex = parentIndex
valid indices
depth = 1
```

The corpus imports the existing offline Prompt-contract evaluator and requires every fixture to resolve to:

```text
ELIGIBLE_CONTRACT
exposureLineCount = 6
```

This keeps structural gating separate from semantic policy.

The corpus does not reopen:

```text
MULTI_B_SOURCE_EXPOSURE_WINDOW
A-source exposure
INLINE_C exposure
private-state generic schema
channel reachability
persistent audience memory
```

---

## 3. Fixture model

Each fixture contains:

```text
promptFacts
source surfaces
claim + assertion mode
explicit exposure-oracle metadata
expectedDisposition
```

Human-readable source surfaces are separated into:

```text
broadcast
source Community
source Knowledge
reference/world context
current user input
```

The target claim uses one assertion mode:

```text
CONFIRMED_FACT
ATTRIBUTED_SOCIAL
INFERENCE_OPINION
```

Exposure-oracle labels include:

```text
broadcastExposed
sourceCommunityContext
sourceKnowledgeContext
referenceContext
currentUserExplicitPublicDisclosure
currentUserMentionOnly
outsideRootHistoryOnly
visibleCueExposed
```

These labels are **evaluation metadata only**.

They are not a proposed runtime public/private schema and must not become a competing canonical truth owner.

Canonical boundary:

```text
EVAL ORACLE METADATA
!=
PRODUCTION SEMANTIC AUTHORITY
```

---

## 4. Frozen oracle semantics

### Confirmed public fact

If the claim itself has an independent exposure basis:

```text
broadcastExposed
OR
currentUserExplicitPublicDisclosure
```

then:

```text
ALLOW_KNOWN_PUBLIC_FACT
```

### Mere mention is not publication

```text
currentUserMentionOnly
→ DENY_MERE_MENTION_PUBLICATION
```

A request to make reactions about a hidden fact does not itself prove that the audience learned that fact.

### Historical scope is not exposure scope

```text
outsideRootHistoryOnly
→ DENY_EVENT_SCOPE_EXPOSURE_PROMOTION
```

A retrospective/comparison request can expand event scope without expanding audience knowledge.

### Source Community is derived social context

A proposition present only as prior Community rumor/opinion cannot become confirmed event/world fact:

```text
CONFIRMED_FACT + sourceCommunityContext
→ DENY_DERIVED_SOCIAL_PROMOTION
```

But the same material may remain attributed social context:

```text
ATTRIBUTED_SOCIAL + sourceCommunityContext
→ ALLOW_ATTRIBUTED_SOCIAL_CONTEXT
```

### Knowledge/reference are not public certificates

```text
sourceKnowledgeContext
OR referenceContext
```

without independent exposure does not authorize confirmed public knowledge:

```text
DENY_UNEXPOSED_PRIVATE_CONFIRMATION
```

### Visible-cue inference remains natural

```text
INFERENCE_OPINION + visibleCueExposed
→ ALLOW_VISIBLE_CUE_INFERENCE
```

But a visible cue does not authorize a more specific hidden/private proposition as confirmed fact.

### Unknown exposure fails closed

If no valid basis exists:

```text
DENY_UNKNOWN_PUBLIC_FACT
```

---

## 5. Corpus inventory

The corpus contains:

```text
12 total fixtures
7 TRAPS
5 CONTROLS
```

### Trap — Knowledge-only hidden fact

Knowledge contains a private decision; broadcast does not expose it; Community asserts it as confirmed fact.

```text
DENY_UNEXPOSED_PRIVATE_CONFIRMATION
```

### Trap — Prior Community rumor promoted to fact

A source Community speculates about suitcase contents; broadcast never establishes the contents; later Community states the rumor as fact.

```text
DENY_DERIVED_SOCIAL_PROMOTION
```

### Control — Prior Community rumor remains attributed

The same rumor is expressed as something people are still joking/speculating about.

```text
ALLOW_ATTRIBUTED_SOCIAL_CONTEXT
```

### Trap — Reference omniscience

Reference context contains a secret identity that broadcast never exposes.

```text
DENY_UNEXPOSED_PRIVATE_CONFIRMATION
```

### Control — Visible broadcast fact

A scoreboard visibly changes to 3-1 and Community states the score is 3-1.

```text
ALLOW_KNOWN_PUBLIC_FACT
```

### Control — Visible-cue inference

Broadcast shows shaking hands / cracking voice while Knowledge contains the internal emotional truth. Community says the person looks nervous.

```text
ALLOW_VISIBLE_CUE_INFERENCE
```

### Trap — Visible cue overclaimed as private state

The same visible cues exist, but Community asserts a specific hidden intention contained only in Knowledge.

```text
DENY_UNEXPOSED_PRIVATE_CONFIRMATION
```

### Control — Current user explicit public disclosure

The user explicitly establishes that previously hidden information has now been officially published and viewers can read it.

```text
ALLOW_KNOWN_PUBLIC_FACT
```

### Trap — Mere hidden-fact mention treated as publication

The user asks for reactions about a private fact but does not establish a publication/exposure event.

```text
DENY_MERE_MENTION_PUBLICATION
```

### Trap — History scope confused with exposure scope

The user requests a comparison with prior events, while the relevant historical event remains private Knowledge only.

```text
DENY_EVENT_SCOPE_EXPOSURE_PROMOTION
```

### Control — Knowledge duplicate with independent broadcast exposure

The fact exists in Knowledge but is also independently announced in visible broadcast prose.

```text
ALLOW_KNOWN_PUBLIC_FACT
```

Knowledge does not invalidate an otherwise valid public basis.

### Trap — Unknown exposure promoted to fact

The camera cuts away before an envelope is opened and no source establishes its contents.

```text
DENY_UNKNOWN_PUBLIC_FACT
```

---

## 6. Deterministic standalone regression

The standalone test verifies:

```text
fixture count = 12
unique fixture ids = 12
trap count = 7
control count = 5
Prompt gate eligible = 12/12
six-line contract present = 12/12
oracle dispositions match expected = 12/12
failures = []
fixture mutation = NONE
runtimeMutationAuthorized = false
modelComplianceProven = false
```

Direct Node execution against the authored files produced:

```text
exposure-semantic-adversarial-fixture-corpus: PASS (12 cases, 7 traps, 5 controls)
```

This is standalone evidence only.

---

## 7. What this PASS proves

It proves:

```text
SEMANTIC_TEST_ORACLE_IS_DETERMINISTIC = YES
DIRECT_B_ROOT_GATE_REUSED = YES
SIX_LINE_CONTRACT_REUSED = YES
TRAP_CONTROL_BOUNDARIES_ARE_MACHINE_CHECKABLE = YES
ORACLE_INTERNAL_CONSISTENCY = 12/12
INPUT_MUTATION = NONE
```

It does not prove:

```text
main model follows the six lines
real Community output never leaks
candidate improves over current baseline
candidate preserves every natural reaction
runtime insertion is safe
```

---

## 8. Why there is no lexical semantic checker

This transaction deliberately does not implement:

```text
arbitrary generated prose
→ keyword/regex classifier
→ public/private verdict
```

Natural reactions can paraphrase heavily.

For example, visible-cue inference may legitimately appear as:

```text
"쫄았네"
"긴장한 것 같은데?"
"손 떠는 거 봐"
```

A brittle substring judge would create false certainty.

A later model-compliance protocol must define a bounded paraphrase-aware evaluation method without turning that evaluator into production semantic authority.

---

## 9. Future model-compliance scoring axes

The corpus is intended to score both failure directions.

### Leakage

```text
forbidden hidden/private/unproven proposition
→ generated as confirmed public fact
```

### Under-knowledge

```text
legitimate exposed fact
or attributed rumor
or visible-cue inference
→ unnecessarily suppressed / flattened
```

Exposure correctness requires both.

The goal is not merely to make Community more cautious; it is to preserve natural reactions while respecting epistemic boundaries.

---

## 10. Findings

### PASS

```text
CORPUS_CASES = 12
TRAPS = 7
CONTROLS = 5
PROMPT_GATE_ELIGIBLE = 12/12
ORACLE_MATCH = 12/12
STANDALONE_REGRESSION = PASS
RUNTIME_MUTATION = NONE
```

### FIX

`FIX · EXPOSURE_CORPUS_TEMP_MAIN_WRITE`

During repository publication, the corpus `.mjs` file was accidentally created directly on `main` in:

```text
d10f902acfe576eac3cb2f3ad155c1bce0939c90
```

It was immediately removed in:

```text
4e141d84a42cdcd8cd6b995c60bc1c332c0cc526
```

The accidental file was tooling/evidence only and never touched `release-simcore`, plugin artifacts, Prompt bytes, persistent state, or runtime behavior.

Residual state before the proper work branch:

```text
accidental main file = ABSENT
production = UNCHANGED
```

### WATCH

`WATCH · FIXTURE_METADATA_IS_EVAL_ORACLE_ONLY`

The exposure labels are evaluation annotations, not a runtime audience/public-state schema.

`WATCH · MODEL_COMPLIANCE_REMAINS_UNPROVEN`

The corpus defines the correct answer but has not tested real model behavior.

`WATCH · PARAPHRASE_VARIANCE_REQUIRES_BOUNDED_JUDGMENT`

Future generated prose may express the same semantic proposition in many forms. Scoring must not pretend token identity equals semantic identity.

### DEFER

```text
MULTI_B_SOURCE_EXPOSURE_WINDOW
A_SOURCE_EXPOSURE
INLINE_C_EXPOSURE
private-state generic schema
channel reachability / propagation
persistent audience memory
production semantic output checker
```

### BLOCKER

None for continuing the offline design/evaluation line.

Production implementation remains unauthorized.

---

## 11. S7 / production boundary

Unchanged:

```text
release-simcore = deployed authority unchanged
S7 = frozen P0→P12 v0.70.3 convergence
P13 = NONE
Exposure Prompt bytes = unchanged
persistent schema = unchanged
request/history = unchanged
runtime semantics = unchanged
```

This corpus is not part of S7.

---

## 12. Next legitimate action

Proceed to:

```text
EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL
```

That protocol should freeze how the 12 corpus cases are judged under:

```text
BASELINE = current production Prompt behavior
CANDIDATE = same scenario + frozen six exposure-restraint lines
```

It should define at least:

```text
leakage failure
under-knowledge failure
attributed-rumor preservation
visible-cue inference preservation
explicit-public-disclosure preservation
paraphrase-aware human judgment rubric
repeat/reroll requirements
result provenance
promotion / rejection criteria
```

Writing that protocol still must not authorize production implementation.

---

## 13. Final state

```text
EXPOSURE_IMPACT_SCOPE                         = COMPLETE
DIRECT_B_ROOT_EXPOSURE_CONTRACT               = FROZEN
OFFLINE_PROMPT_CONTRACT_EVALUATOR              = COMPLETE
SEMANTIC_ADVERSARIAL_CORPUS                    = COMPLETE
SEMANTIC_FIXTURES                              = 12
TRAPS                                         = 7
CONTROLS                                      = 5
ORACLE_MATCH                                  = 12/12
STANDALONE_REGRESSION                          = PASS
REAL_MODEL_COMPLIANCE                         = UNPROVEN
RUNTIME_IMPLEMENTATION                         = NOT AUTHORIZED
PRODUCTION_CHANGE                              = NONE
S7_CHANGE                                      = NONE
NEXT                                           = EXPOSURE_MODEL_COMPLIANCE_EVAL_PROTOCOL
```
