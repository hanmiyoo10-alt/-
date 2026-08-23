# SimCore PR Failure Feedback Loop

Date: 2026-08-23
Status: **DESIGN FROZEN · IMPLEMENTATION NOT STARTED · NON-RUNTIME**
Scope: SimCore pull-request execution, repository/process failures, and prevention feedback only

---

## 1. Purpose

SimCore already follows an evidence-first development model:

```text
Observe
→ Attribute
→ Correlate
→ Verify
→ Stabilize
→ Measure
```

The repository also already preserves individual failure evidence in implementation/evidence documents and uses explicit reason codes for repository-write failures.

What is missing is a durable loop that converts repeated PR failures into reusable prevention rules for future work.

This document freezes that loop.

Canonical name:

```text
SimCore PR Failure Feedback Loop
short name: PFFL
```

Primary goal:

```text
PR failure
   ↓
bounded evidence
   ↓
normalized failure signature
   ↓
recurrence detection
   ↓
prevention decision
   ↓
future-work preflight
   ↓
fewer repeated avoidable failures
```

The purpose is not to make every PR green on its first run.

The purpose is to make every meaningful failure leave behind enough structured knowledge that the same avoidable failure becomes less likely to recur.

---

## 2. Relationship to existing SimCore authority

This system is a separate repository-process concern.

It is **not** part of RS2-1, RS2-2, RS2-3, or RS2-4 implementation authority.

It does not reopen those phases and it does not change their frozen contracts.

Authority relationship:

```text
SIMCORE_GUIDELINES
  → development principles
  → Evidence Before Repair
  → FIX / WATCH / DEFER / BLOCKER discipline

REPO_MAIN_WRITE_COORDINATION
  → safe main integration
  → MAIN_WRITE_* failure semantics

PR Failure Feedback Loop
  → failure normalization
  → recurrence memory
  → prevention promotion
  → next-PR preflight feedback
```

If this system is implemented later, `SIMCORE_GUIDELINES.md` may receive a short pointer to this document as an operational routine.

That pointer is not part of this design-only change.

---

## 3. Non-goals

PFFL does not:

- modify SimCore runtime behavior;
- modify `release-simcore`;
- deploy plugin code;
- rewrite failed code automatically;
- auto-repair tests;
- auto-repair GitHub configuration;
- turn every red workflow into a product regression;
- store full CI logs in git;
- store raw plugin source in failure records;
- treat intentional negative-proof runs as accidental failures;
- make historical evidence documents obsolete;
- replace permanent regression tests;
- replace `SimCore CI / Required`;
- replace `repo-main-write.py`;
- infer causes when evidence is insufficient;
- silently convert a hypothesis into a prevention rule;
- apply Usage Dashboard-only failures to SimCore work.

PFFL is a repository memory and feedback system.

It is not an autonomous repair agent.

---

## 4. Scope boundary

A PR is PFFL-relevant when at least one of these is true:

```text
A. PR changes a SimCore-owned path
B. PR changes shared repository infrastructure used by SimCore
C. PR is a SimCore release / state / CI / test / documentation work item
D. PR failure is explicitly referenced by a current SimCore evidence document
```

Initial SimCore-owned path families include:

```text
plugins/simcore/**
products/simcore/**
docs/SIMCORE_**
config/simcore-**
scripts/simcore-**
.github/workflows/simcore-**
```

Shared infrastructure is included only when SimCore is an actual consumer, for example:

```text
scripts/repo-main-write.py
scripts/test-repo-main-write.py
docs/REPO_MAIN_WRITE_COORDINATION.md
```

A Usage Dashboard-only PR with no SimCore/shared-infrastructure effect is out of scope.

---

## 5. Core rule: inspect PR history, not only the final green head

A merged PR may have a green final head while containing useful earlier failures.

Therefore this loop must not inspect only:

```text
final PR conclusion
```

It must inspect the bounded PR execution history across the PR's relevant commits/runs.

Canonical review surface:

```text
PR metadata
  + changed paths
  + associated workflow runs
  + failed/cancelled/timed-out jobs
  + failed step identity
  + repair commit boundary
  + rerun behavior
  + final successful proof
  + merge/base movement where relevant
```

The final green state is necessary for merge authority.

It is not sufficient for failure learning.

---

## 6. Three loop moments

PFFL has three distinct moments.

### 6.1 START PRECHECK

Before implementing a new SimCore work item:

```text
planned paths / activity
        ↓
load active prevention rules
        ↓
match applicable historical signatures
        ↓
apply required preflight controls
        ↓
start implementation
```

This is how historical failures influence a future task.

### 6.2 FAILURE REVIEW

Whenever an accidental PR/workflow failure occurs:

```text
preserve bounded evidence
→ determine whether cause is known
→ classify
→ repair only after attribution
→ verify corrected result
```

A failure is not required to be fully entered into the global ledger while the PR is still moving.

The work-specific evidence document may preserve it immediately.

### 6.3 POST-PR FEEDBACK CLOSE

After a PR is merged or closed:

```text
freeze scan cutoff
→ inspect all eligible runs through cutoff
→ normalize accidental failures
→ deduplicate signatures
→ update recurrence counts
→ evaluate prevention promotion
→ write bounded ledger/rule delta
```

This produces the durable cross-PR memory.

---

## 7. Why global ledger updates happen after PR close

Mutating the canonical global ledger repeatedly inside the same active PR creates an avoidable self-reference problem:

```text
PR fails
→ edit failure ledger
→ new CI run
→ that run fails
→ edit same ledger again
→ ...
```

PFFL avoids that.

Canonical generation boundary:

```text
scanCutoff = timestamp / PR head boundary chosen after target PR closes
```

The feedback reconciliation processes only failures that existed at or before that cutoff.

If the feedback-only reconciliation PR itself fails, that failure belongs to the **next** reconciliation generation.

Therefore no feedback PR is required to recursively describe its own live failures before it can finish.

---

## 8. Planned durable files

Implementation, if authorized later, should create a separate process namespace:

```text
products/simcore/process/
```

Planned canonical machine files:

```text
products/simcore/process/pr-failure-ledger.json
products/simcore/process/pr-prevention-rules.json
products/simcore/process/PR_FAILURE_FEEDBACK_STATUS.json
```

Planned local normalization tool:

```text
products/simcore/tooling/pr-feedback.mjs
```

These files are intentionally **not** placed under `products/simcore/ci/`.

Reason:

```text
CI authority               ≠ repository failure-memory authority
```

Permanent CI may consume active prevention controls later where explicitly promoted.

The failure ledger itself is not a CI result authority.

---

## 9. Human and machine authority split

### Human/design authority

This document owns:

- failure taxonomy;
- evidence rules;
- recurrence rules;
- prevention-promotion rules;
- lifecycle semantics;
- privacy/boundedness constraints;
- implementation/activation gates.

### Machine ledger authority

`pr-failure-ledger.json` will own normalized observed failures.

It does not decide product correctness by itself.

### Machine prevention authority

`pr-prevention-rules.json` will own currently active prevention controls that have been explicitly promoted.

A failure record does not automatically become a prevention rule.

### Status authority

`PR_FAILURE_FEEDBACK_STATUS.json` will record whether the loop is advisory, active, degraded, or blocked.

It must not become production release authority.

---

## 10. Failure record identity

Every normalized accidental failure gets a stable failure record ID.

Recommended format:

```text
PFF-YYYYMMDD-NNN
```

Example:

```text
PFF-20260823-004
```

This ID identifies the occurrence record.

A separate stable `signature` identifies the recurring failure pattern.

Multiple occurrence records may share one signature.

---

## 11. Stable failure signature

The signature must ignore volatile identities such as:

```text
run ID
job ID
commit SHA
timestamp
runner worker ID
```

It should be derived from bounded normalized fields such as:

```text
failureClass
reasonCode
workflow family
job/step family
relevant subsystem/activity
normalized trigger shape
```

Conceptual signature source:

```text
HARNESS
+ FUNCTION_BODY_BOUNDARY_DEFAULT_OBJECT
+ durable-test-harness
+ function-extraction
```

A signature may be stored as:

```text
human-readable key
+ SHA-256 digest of canonical normalized fields
```

Raw log text must never be the signature authority.

---

## 12. Orthogonal classification dimensions

One overloaded label is insufficient.

Each record uses multiple dimensions.

### 12.1 Failure class

Frozen initial classes:

```text
PRODUCT_REGRESSION
HARNESS
FIXTURE
CI_WORKFLOW
EVIDENCE_COLLECTOR
PERMISSION
CONCURRENCY
STALE_MAIN
GITHUB_EVENT_SEMANTICS
TOOLING
ADMINISTRATION
PLATFORM_TRANSIENT
UNKNOWN
```

### 12.2 Scope class

```text
RUNTIME
TEST_INFRASTRUCTURE
CI_INFRASTRUCTURE
REPOSITORY_INFRASTRUCTURE
RELEASE_ADMINISTRATION
DOCUMENTATION_ADMINISTRATION
EXTERNAL_PLATFORM
```

### 12.3 Evidence confidence

```text
DIRECT_EVIDENCE
REPRODUCED
CORRELATED
HYPOTHESIS
UNKNOWN
```

A `HYPOTHESIS` record may be preserved.

It may not create a hard prevention gate by itself.

### 12.4 Disposition

Reuse the existing SimCore vocabulary:

```text
FIX
WATCH
DEFER
BLOCKER
```

### 12.5 Repeatability

```text
SINGLE_OBSERVATION
RECURRENT
DETERMINISTIC
INTERMITTENT
UNKNOWN
```

These dimensions must remain independent.

Example:

```text
class        = FIXTURE
scope        = TEST_INFRASTRUCTURE
confidence   = DIRECT_EVIDENCE
disposition  = FIX
repeatability= DETERMINISTIC
```

---

## 13. Expected versus accidental failure

Not every red run is a PFFL failure occurrence.

The system must distinguish:

```text
ACCIDENTAL_FAILURE
EXPECTED_NEGATIVE_PROOF
EXPECTED_FAIL_CLOSED_CONTROL
CANCELLED_AS_OBSOLETE
UNKNOWN_FAILURE
```

Examples of expected red behavior:

- a controlled malformed candidate proving a gate rejects invalid input;
- a deliberate negative fixture whose expected result is a non-zero exit;
- an old PR run cancelled because a newer head superseded it under an allowed freshness policy.

Expected negative proofs may be referenced as prevention evidence.

They must not increment accidental recurrence counts.

If expectation cannot be proven from the workflow/evidence contract, classify it as `UNKNOWN_FAILURE` rather than silently excluding it.

---

## 14. Minimum failure occurrence schema

Conceptual machine record:

```json
{
  "failureId": "PFF-20260823-001",
  "signature": "sha256:...",
  "reasonCode": "FUNCTION_BODY_BOUNDARY_DEFAULT_OBJECT",
  "failureClass": "HARNESS",
  "scopeClass": "TEST_INFRASTRUCTURE",
  "confidence": "DIRECT_EVIDENCE",
  "disposition": "FIX",
  "repeatability": "DETERMINISTIC",
  "expectedness": "ACCIDENTAL_FAILURE",
  "pr": 141,
  "workflowRun": 0,
  "job": null,
  "step": "function extraction",
  "headCommit": "...",
  "repairCommit": "...",
  "finalPassRun": 32634645909,
  "productCodeWrong": false,
  "rootCauseSummary": "bounded normalized explanation",
  "recurrenceGroup": "harness-function-boundary",
  "preventionRuleIds": [],
  "status": "RESOLVED"
}
```

The actual implementation schema may add bounded versioning fields.

It may not remove the semantic distinction between occurrence and signature.

---

## 15. Bounded evidence requirements

A failure record may retain:

```text
PR number
workflow run ID
job ID
step name
workflow name/family
commit SHA
repair commit SHA
final PASS run ID
reason code
bounded root-cause summary
classification
relevant path/subsystem labels
prevention link
```

It must not retain:

```text
full workflow logs
full stdout/stderr
raw environment dumps
tokens
credentials
full plugin source
real long-chat transcripts
clipboard payloads
private user content
unbounded exception text
```

GitHub run/log retention is finite.

Therefore durable ledger records must preserve enough identifiers and normalized explanation to remain useful after raw logs expire.

---

## 16. Product regression must be distinguished from test-system failure

A failed test does not prove product code is wrong.

Canonical decision order:

```text
Did the expected product contract actually fail?
  ↓ yes
PRODUCT_REGRESSION candidate

Did harness/fixture/collector fail before valid product assertion?
  ↓ yes
TEST / CI infrastructure class

Is evidence insufficient?
  ↓
UNKNOWN
```

The field:

```text
productCodeWrong
```

must be one of:

```text
true
false
unknown
```

Never force a boolean when attribution is unresolved.

---

## 17. Root cause and repair are separate fields

Do not encode the repair as the root cause.

Bad:

```text
rootCause = changed regex
```

Good:

```text
rootCause = parser treated a default object literal as the function-body boundary
repair    = body-boundary extraction now starts after the parameter list
```

This separation improves recurrence matching when future repairs differ.

---

## 18. Recurrence counting

Recurrence is counted by distinct evidence identities, not repeated retries of the same unchanged condition.

Default distinct identity:

```text
PR number + materially distinct head / failure context
```

The following do **not** automatically create separate recurrence counts:

```text
rerun same failed job with no code change
rerun same workflow with same input tuple
same failure printed by Required aggregator after Verify already failed
```

The following may count separately:

```text
same signature on another PR
same signature after a materially distinct attempted fix
same prevention gap recurring in a later phase
```

This prevents one noisy PR from looking like a ten-time recurrence.

---

## 19. Recurrence promotion policy

Count alone is not the only promotion signal.

Frozen default policy:

### First occurrence

```text
record occurrence
classify
resolve or preserve UNKNOWN
consider prevention candidate if deterministic and cheap
```

### Second distinct occurrence

```text
mark RECURRENT
mandatory prevention review
WATCH unless stronger disposition is justified
```

### Third distinct occurrence

If deterministic prevention exists:

```text
permanent prevention control REQUIRED
```

unless an explicit `DEFER` entry explains why implementation cost/risk is not justified.

### Immediate promotion exception

One occurrence may justify an immediate permanent control when:

```text
release corruption risk exists
silent overwrite risk exists
production identity risk exists
security/credential risk exists
failure is deterministic and prevention is low-risk
```

Therefore:

```text
3 occurrences is not a minimum safety threshold.
```

It is the default recurrence threshold for ordinary avoidable failures.

---

## 20. Prevention-control levels

A promoted prevention rule has one level.

Frozen levels, weakest to strongest:

```text
NOTE_ONLY
CHECKLIST_PRECHECK
LOCAL_PREFLIGHT
HARNESS_SELF_TEST
PERMANENT_CI_GATE
RELEASE_BLOCKER
ADMIN_POLICY
```

Definitions:

### NOTE_ONLY

Historical warning only.

### CHECKLIST_PRECHECK

Task start must explicitly verify a bounded condition.

### LOCAL_PREFLIGHT

A deterministic local tool must pass before PR creation/update.

### HARNESS_SELF_TEST

The failure is prevented by the permanent test infrastructure itself.

### PERMANENT_CI_GATE

The relevant PR cannot be considered valid unless permanent CI checks the condition.

### RELEASE_BLOCKER

The condition must block release promotion, not merely PR merge.

### ADMIN_POLICY

Repository administration procedure prevents the recurrence, for example an expected-head merge rule or no-force-push rule.

A prevention rule may later move between levels with explicit evidence.

---

## 21. Prevention rule schema

Conceptual record:

```json
{
  "ruleId": "PFR-0007",
  "title": "Use real Structure envelope grammar for B_END fixtures",
  "status": "ACTIVE",
  "sourceFailureIds": ["PFF-20260823-003"],
  "match": {
    "activities": ["B_END fixture authoring"],
    "paths": ["products/simcore/tests/**"]
  },
  "level": "HARNESS_SELF_TEST",
  "instruction": "bounded prevention statement",
  "verification": "deterministic check description",
  "promotedBecause": "DIRECT_EVIDENCE",
  "retirementCondition": "explicit future criterion or null"
}
```

A rule must be narrow enough to know when it applies.

Generic statements such as:

```text
be careful
check CI
avoid bugs
```

are invalid prevention rules.

---

## 22. Applicability matching at task start

Prevention rules match against a bounded task profile.

Planned task profile fields:

```text
planned paths
work type
subsystem
workflow families
test families
release/admin involvement
main-write involvement
```

Example:

```text
work type = test harness
paths     = products/simcore/tests/**
```

may activate:

```text
function-extractor self-test rule
real-envelope fixture rule
negative-fixture semantic-boundary rule
```

A release-only rule should not spam a documentation-only task.

---

## 23. Start-precheck output

A future `pr-feedback.mjs preflight` should produce a bounded report such as:

```text
PFFL PRECHECK
applicable rules: 3

PFR-0002 REQUIRED · LOCAL_PREFLIGHT
PFR-0007 REQUIRED · HARNESS_SELF_TEST
PFR-0011 ADVISORY · CHECKLIST_PRECHECK

unresolved BLOCKER rules: 0
```

The tool may recommend controls.

It may not edit implementation files automatically.

---

## 24. Post-PR scan input model

The normalization engine should be local/pure where practical.

Preferred split:

```text
OUTER COLLECTOR
  → reads GitHub PR/run/job/step metadata
  → creates bounded pr-observation.json

pr-feedback.mjs
  → no GitHub write
  → no branch push
  → normalize/dedupe/classify known mechanical facts
  → compare existing ledger/rules
  → emit proposed ledger/rule delta
```

The local engine must not require repository write credentials.

Network/GitHub access belongs to the outer collection layer.

---

## 25. Why the normalizer must not auto-decide root cause

Some fields can be derived mechanically:

```text
run conclusion
job conclusion
failed step
run identity
PR/head identity
same-head rerun
final pass identity
```

Root cause often cannot.

Therefore implementation must distinguish:

```text
mechanically observed fact
human/evidence-backed attribution
```

The tool may propose:

```text
UNKNOWN
```

It must not fabricate a specific root cause to make the ledger look complete.

---

## 26. Initial failure taxonomy examples from current durable evidence

The existing repository already contains seed examples.

### RS2-1 harness/fixture findings

Current durable evidence records:

```text
VM_REALM_REFERENCEERROR
= FIX / HARNESS_SELF_TEST

FUNCTION_BODY_BOUNDARY_DEFAULT_OBJECT
= FIX / HARNESS / PRE_PRODUCT_ASSERTION

B_END_FIXTURE_SHAPE_UNDERSPECIFIED
= FIX / FIXTURE / PRE_EQUIVALENCE
```

PFFL mapping:

```text
VM_REALM_REFERENCEERROR
  class = HARNESS

FUNCTION_BODY_BOUNDARY_DEFAULT_OBJECT
  class = HARNESS

B_END_FIXTURE_SHAPE_UNDERSPECIFIED
  class = FIXTURE
```

### RS2-3 evidence-collector findings

Current durable evidence records:

```text
RS2_3_SHADOW_EVIDENCE_PARSER_ASSUMPTION
= FIX / TEST_EVIDENCE / NON_RUNTIME

RS2_3_SHADOW_NEGATIVE_FIXTURE_OVERDESTRUCTIVE
= FIX / TEST_EVIDENCE / NON_RUNTIME
```

PFFL mapping:

```text
RS2_3_SHADOW_EVIDENCE_PARSER_ASSUMPTION
  class = EVIDENCE_COLLECTOR

RS2_3_SHADOW_NEGATIVE_FIXTURE_OVERDESTRUCTIVE
  class = EVIDENCE_COLLECTOR
  secondary characteristic = FIXTURE DESIGN
```

### Repository main-write findings

Current durable infrastructure evidence records:

```text
REPO_MAIN_WRITE_RACE
= FIX / DIRECT_EVIDENCE / INFRASTRUCTURE

ADMIN_WRITE_MISROUTE
= FIX / DIRECT_EVIDENCE / ADMIN_ONLY
```

PFFL mapping:

```text
REPO_MAIN_WRITE_RACE
  class = CONCURRENCY

ADMIN_WRITE_MISROUTE
  class = ADMINISTRATION
```

These examples are seed evidence only.

The implementation backfill must still verify the relevant PR/run identities before creating canonical occurrence records.

---

## 27. Historical backfill policy

PFFL should not pretend the ledger begins with the first implementation-day PR.

Initial implementation includes a bounded backfill.

Frozen selection rule:

```text
A. all currently documented SimCore PR/run failures referenced by durable evidence docs
PLUS
B. recent closed/merged SimCore-related PRs in the Release System v2 modernization window
```

The initial backfill must prioritize evidence quality over volume.

It is acceptable to record:

```text
UNKNOWN root cause
```

when historical raw logs have expired or do not support a stronger attribution.

It is not acceptable to reconstruct detailed causes from memory alone.

---

## 28. Backfill is not a mass rewrite of history

Historical evidence documents remain authoritative for their work items.

PFFL stores normalized references.

It does not rewrite every old evidence document into the new taxonomy.

Canonical relationship:

```text
old evidence doc
   ↓ referenced by
PFFL occurrence record
```

not:

```text
PFFL implementation
→ edit hundreds of historical docs
```

---

## 29. Failed run handling policy

For each failed run, the review must ask in order:

```text
1. Was failure expected?
2. Was this run superseded/cancelled normally?
3. Did the product contract actually fail?
4. Did test/fixture/harness fail before product assertion?
5. Was the failure caused by permission/repository/platform behavior?
6. Is the cause directly evidenced?
7. What corrected run proved the repair?
8. Does this signature already exist?
9. Is prevention already active?
10. Did existing prevention fail to catch it?
```

Question 10 is critical.

A recurrence under an already-active prevention rule is stronger evidence than a first occurrence.

---

## 30. Prevention-control failure

If an active prevention rule should have caught a failure but did not, create a distinct relationship:

```text
PREVENTION_CONTROL_GAP
```

Do not merely increment the original failure occurrence count.

Record:

```text
source signature
expected prevention rule
why it did not trigger / was bypassed
repair to prevention control
```

A prevention system that silently fails becomes another source of false confidence.

---

## 31. Transient platform failures

A failed GitHub runner/network/action download may be transient.

But `PLATFORM_TRANSIENT` cannot be assigned merely because a rerun passed.

Required evidence should include, when available:

```text
no repository change between attempts
same immutable inputs
failure located in external/platform operation
rerun passes without semantic repair
no product assertion failure observed
```

If these conditions are not supported, use `UNKNOWN`.

---

## 32. Stale-main and concurrency feedback

`main` advancing during a PR is not inherently a failure.

It becomes PFFL-relevant when it causes or nearly causes an avoidable integration failure.

Existing repository policy already provides controls:

```text
fetch latest main
three-way integrate
fail closed on content conflict
ordinary fast-forward only
bounded retry
no force push
```

PFFL must reference those existing controls instead of inventing a competing main-write algorithm.

A recurrence may promote a task-level precheck such as:

```text
reconfirm latest main before expected-head merge
```

but must not replace `repo-main-write.py` for automated writers.

---

## 33. Failure review must preserve branch/workflow semantics

GitHub event semantics can produce confusing outcomes:

```text
workflow not triggered
workflow skipped
job skipped
run cancelled
required aggregator failed because dependency failed
```

These are not interchangeable.

The normalized record must preserve the exact observed semantic state.

Examples:

```text
RUN_NOT_CREATED
RUN_SKIPPED
JOB_SKIPPED
JOB_CANCELLED
JOB_FAILED
AGGREGATOR_PROPAGATED_FAILURE
```

Only the evidence-backed causal reason is classified as the failure class.

---

## 34. Required aggregator failures are not double-counted

If:

```text
Verify = FAILED
Required = FAILED because Verify failed
```

this is normally one underlying failure occurrence.

The aggregator failure is stored as propagation evidence, not a second recurrence.

If the aggregator itself fails independently while Verify succeeds, that is a separate `CI_WORKFLOW` occurrence.

---

## 35. Prevention-rule lifecycle

Frozen statuses:

```text
PROPOSED
ACTIVE
SUPERSEDED
RETIRED
BLOCKED
```

Transition:

```text
failure evidence
→ PROPOSED
→ explicit review
→ ACTIVE
```

A rule may not become `ACTIVE` solely because a script generated it.

`SUPERSEDED` means another control fully owns the prevention responsibility.

`RETIRED` requires evidence that the failure surface no longer exists or the responsibility was intentionally removed.

Historical source failure IDs are never deleted merely because a rule retires.

---

## 36. Prevention must stay proportional

Avoid turning every one-off typo into permanent heavyweight CI.

Promotion should consider:

```text
severity
recurrence
reproducibility
cost of prevention
false-positive risk
runtime/release risk
maintenance burden
```

Examples:

```text
one deterministic parser boundary bug
→ harness self-test may be cheap and justified immediately

one unclear GitHub transient
→ NOTE_ONLY / WATCH

repeated stale-main merge race
→ ADMIN_POLICY / deterministic integration guard
```

---

## 37. No automatic runtime changes from failure feedback

Even when a failure is classified `PRODUCT_REGRESSION`:

```text
ledger entry
≠ authorization to patch production
```

The normal SimCore workflow still applies:

```text
evidence record
→ dedicated design/work item
→ working branch
→ static/CI validation
→ release-simcore deployment
→ real long-chat validation
→ main close sync
```

PFFL may raise a `BLOCKER`.

It may not skip the release workflow.

---

## 38. Integration with future SimCore work routine

After implementation/activation, the canonical SimCore repository routine becomes conceptually:

```text
0. PFFL START PRECHECK
   → load applicable prevention rules

1. repo design / evidence record
2. working-branch implementation
3. static / CI validation
4. PR execution
5. PR failure review when needed
6. merge / release flow appropriate to the work item
7. post-PR PFFL feedback close
8. release-simcore / live validation when runtime work requires it
9. main documentation / long-memory close
```

For pure NON-RUNTIME infrastructure work, steps 8 runtime deployment/live validation remain not applicable unless runtime bytes changed.

---

## 39. Work-specific evidence remains immediate

The global ledger is post-PR.

But SimCore's existing rule remains:

```text
anomaly discovered
→ preserve immediately
→ classify FIX / WATCH / DEFER / BLOCKER
→ then continue
```

Therefore an implementation evidence document should still record meaningful failures as soon as they are understood.

PFFL later references and normalizes those records.

It does not delay evidence preservation until PR close.

---

## 40. Initial preflight candidates suggested by current evidence

These are design candidates, not yet ACTIVE rules.

### Candidate A — function extractor boundary self-test

Source:

```text
FUNCTION_BODY_BOUNDARY_DEFAULT_OBJECT
```

Potential control:

```text
HARNESS_SELF_TEST
```

### Candidate B — real-envelope fixture grammar

Source:

```text
B_END_FIXTURE_SHAPE_UNDERSPECIFIED
```

Potential control:

```text
HARNESS_SELF_TEST / fixture schema validation
```

### Candidate C — evidence parser contracts must use stable outputs

Source:

```text
RS2_3_SHADOW_EVIDENCE_PARSER_ASSUMPTION
```

Potential control:

```text
CHECKLIST_PRECHECK
or
LOCAL_PREFLIGHT when machine-detectable
```

### Candidate D — semantic negative fixtures preserve loadability

Source:

```text
RS2_3_SHADOW_NEGATIVE_FIXTURE_OVERDESTRUCTIVE
```

Potential control:

```text
HARNESS_SELF_TEST
```

### Candidate E — latest-main safe integration

Source:

```text
REPO_MAIN_WRITE_RACE
```

Existing prevention authority already exists:

```text
repo-main-write.py + coordination contract
```

PFFL should link to it rather than create a duplicate implementation.

---

## 41. Feedback report format

A post-PR feedback report should be short enough to inspect.

Recommended human summary:

```text
PR FAILURE FEEDBACK
PR: #151
cutoff: <timestamp/head>

accidental failure occurrences: 2
new signatures: 2
recurrent signatures: 0
expected negative proofs: 4
platform transient: 0
unknown: 0

prevention proposals:
- PFR-... evidence parser stable-output contract
- PFR-... semantic negative fixture boundary

existing prevention gaps: none
```

The machine delta may contain more detail.

Raw logs remain outside git.

---

## 42. No-failure PRs still close the loop

A PR with no accidental failures should still produce a bounded conclusion:

```text
PFFL_FEEDBACK_CLEAN
```

It does not need a new ledger occurrence.

The system should record enough reconciliation state to know the PR was scanned.

This prevents ambiguity between:

```text
no failures found
```

and:

```text
PR never reviewed
```

---

## 43. Scan cursor / reconciliation state

`PR_FAILURE_FEEDBACK_STATUS.json` should retain a bounded cursor such as:

```text
lastReconciledClosedAt
lastReconciledPr
lastReconciliationCommit
ledgerSchemaVersion
rulesSchemaVersion
```

The cursor is administrative state only.

It must not cause an older explicitly referenced failure to be ignored during historical backfill or repair.

---

## 44. Feedback-only PR behavior

Feedback reconciliation changes process records only.

Expected paths:

```text
products/simcore/process/**
docs/SIMCORE_PR_FAILURE_FEEDBACK_*.md
```

It must not modify:

```text
plugins/simcore/**
release-simcore
product-manifest release identity
runtime contracts
```

If a prevention proposal requires CI/tooling modification, that becomes a **separate infrastructure work item**.

Do not mix ledger reconciliation and permanent CI redesign in one PR.

---

## 45. Main-write behavior

Initial PFFL implementation should prefer ordinary dedicated PRs for canonical ledger/rule changes.

Reason:

- it avoids silently expanding automated main-writer authority;
- it preserves reviewability;
- it does not require modifying the existing repo-main-write allowlist during the first implementation.

If future automation writes PFFL files directly to `main`, that is a separate repository-system change.

It must use the repository's safe main-integration protocol and an explicit allowlist.

No direct-force update is permitted.

---

## 46. Tool failure handling

If the future feedback normalizer fails:

```text
PFFL_TOOL_ERROR
```

The target product PR history remains authoritative.

Do not rewrite or drop prior ledger entries.

If a malformed ledger is detected:

```text
PFFL_LEDGER_INVALID
→ BLOCKER for feedback reconciliation
```

This does not automatically invalidate already-proven runtime code or production deployment.

It blocks claiming the failure-feedback loop is up to date.

---

## 47. Ledger append/update semantics

Occurrence history is append-oriented.

Allowed corrections:

```text
UNKNOWN → evidenced classification
open → resolved
prevention link added
bounded root-cause clarification with evidence
```

Disallowed behavior:

```text
delete an embarrassing failure
silently change occurrence identity
rewrite original run/PR identity
collapse multiple distinct occurrences into one without migration record
```

When a historical record is wrong, correct it transparently rather than erasing it.

---

## 48. Dedupe rules

Before adding a new occurrence, compare:

```text
PR
run/job lineage
normalized signature
head/input identity
```

Exact duplicate observation:

```text
NO_NEW_OCCURRENCE
```

Same signature, distinct PR/context:

```text
NEW_OCCURRENCE
RECURRENCE_COUNT +1
```

Different root cause that happened to fail the same workflow step:

```text
DIFFERENT_SIGNATURE
```

The step name alone is never a sufficient dedupe key.

---

## 49. Unknown-class handling

Unknowns are first-class records.

```text
failureClass = UNKNOWN
confidence   = UNKNOWN
```

They remain searchable and may later be resolved.

An unknown failure that recurs on distinct PRs should itself be flagged:

```text
UNKNOWN_RECURRENT
→ WATCH
→ attribution work recommended
```

Repeated unknowns are evidence that observability is insufficient.

That may justify a diagnostic/instrumentation prevention rule.

---

## 50. Metrics

PFFL may compute bounded operational metrics, but metrics are secondary to evidence.

Allowed examples:

```text
accidental failures per PR
repeat signatures per 10 SimCore PRs
unknown attribution count
failures prevented by active preflight
prevention-control gaps
median repair commits before final PASS
```

Do not optimize for:

```text
zero red runs at all costs
```

A controlled negative run can be valuable evidence.

The desired trend is:

```text
fewer repeated avoidable failures
+ faster attribution
+ stronger deterministic prevention
```

---

## 51. Implementation stages

This design is frozen, but implementation is separate.

Recommended stages:

### PFFL-1 — Inventory and backfill

```text
create process namespace
create schemas
backfill evidence-supported historical failures
no preflight enforcement yet
```

### PFFL-2 — Local normalizer

```text
implement pr-feedback.mjs
fixture/self-test the signature and dedupe logic
produce proposed ledger/rule delta
no GitHub writes from tool
```

### PFFL-3 — Start preflight

```text
match active prevention rules to planned task profile
produce bounded precheck
initially advisory
```

### PFFL-4 — Post-PR reconciliation routine

```text
collect closed PR execution history
normalize through scan cutoff
update ledger/rules through dedicated admin PR
```

### PFFL-5 — Selective prevention promotion

```text
promote deterministic repeated failures into self-test / CI / admin controls
one prevention change per dedicated infrastructure work item
```

Automation beyond this point is optional.

---

## 52. Implementation safety gates

Before PFFL becomes operational:

```text
schema validation                         PASS
ledger dedupe fixtures                    PASS
signature stability fixtures              PASS
expected-negative exclusion fixtures      PASS
aggregator double-count prevention         PASS
UNKNOWN preservation                       PASS
historical backfill review                 PASS
preflight path/activity matching           PASS
no runtime diff                            NONE
release-simcore diff                       NONE
no auto product-code mutation              PROVEN
no raw log persistence                     PROVEN
```

---

## 53. Activation state machine

Frozen process state:

```text
DESIGN_FROZEN
  ↓
BACKFILL_READY
  ↓
LEDGER_ACTIVE
  ↓
PREFLIGHT_ADVISORY
  ↓
FEEDBACK_LOOP_ACTIVE
```

Optional later state:

```text
SELECTIVE_GATES_PROMOTED
```

Failure states:

```text
BLOCKED
DEGRADED
RECONCILIATION_STALE
```

A stale feedback ledger does not silently pretend to be current.

---

## 54. Active-loop close condition per work item

Once PFFL is active, a SimCore work item has a feedback close when one of these is durable:

```text
PFFL_FEEDBACK_CLEAN
```

or:

```text
all accidental failures through scan cutoff are represented by
  existing occurrence IDs
  or new occurrence IDs
and prevention review is complete
```

This is a process close.

It does not substitute for release/live close when runtime work is involved.

---

## 55. Prevention review outputs

For every new/recurrent signature, one of these must be chosen:

```text
NO_CONTROL_JUSTIFIED
PROPOSE_CONTROL
EXISTING_CONTROL_SUFFICIENT
EXISTING_CONTROL_GAP
DEFER_CONTROL
BLOCK_UNTIL_CONTROL
```

`NO_CONTROL_JUSTIFIED` requires a short rationale.

`DEFER_CONTROL` maps to the existing `DEFER` discipline.

`BLOCK_UNTIL_CONTROL` maps to `BLOCKER`.

---

## 56. Failure feedback must not create broad generic rules

A rule should prevent the demonstrated failure surface.

It should not turn one incident into an unrelated repository-wide prohibition.

Bad:

```text
one fixture parser failed
→ forbid all dynamic fixture generation forever
```

Better:

```text
function extractor must self-test default-object parameters before executing product assertions
```

Evidence scope limits prevention scope.

---

## 57. Cross-product boundary

PFFL v1 is SimCore-owned.

Usage Dashboard may later adopt an analogous loop.

Do not create a shared cross-product failure ledger in this work.

Shared repository failures may be referenced by both products, but each product decides applicability through its own prevention rules.

This keeps product-specific process memory from becoming one ambiguous global pile.

---

## 58. Privacy and repository hygiene

Failure records are administrative engineering evidence.

Never put user/chat content into the ledger merely because it appeared in a diagnostic workflow.

Use:

```text
reason code
bounded structural facts
digests
run IDs
commit IDs
```

instead of raw content.

If evidence requires sensitive/raw material, preserve it outside the machine ledger according to the existing evidence process and reference only a bounded evidence ID.

---

## 59. Seed feedback decisions from current evidence

The initial implementation should evaluate, not blindly activate, the following seed prevention decisions:

| Evidence | Proposed class | Initial prevention review |
|---|---|---|
| `VM_REALM_REFERENCEERROR` | HARNESS | existing self-test likely sufficient |
| `FUNCTION_BODY_BOUNDARY_DEFAULT_OBJECT` | HARNESS | permanent extractor boundary self-test candidate |
| `B_END_FIXTURE_SHAPE_UNDERSPECIFIED` | FIXTURE | canonical Structure-envelope fixture/schema candidate |
| `RS2_3_SHADOW_EVIDENCE_PARSER_ASSUMPTION` | EVIDENCE_COLLECTOR | stable-output contract/preflight candidate |
| `RS2_3_SHADOW_NEGATIVE_FIXTURE_OVERDESTRUCTIVE` | EVIDENCE_COLLECTOR | semantic-negative boundary self-test candidate |
| `REPO_MAIN_WRITE_RACE` | CONCURRENCY | existing main-write coordination control |
| `ADMIN_WRITE_MISROUTE` | ADMINISTRATION | branch-before-write admin policy candidate |

The implementation backfill must attach actual PR/run evidence where supported.

No seed row is automatically an `ACTIVE` rule merely because it appears here.

---

## 60. Frozen final contract

The SimCore PR Failure Feedback Loop is considered correctly designed when these principles remain true:

```text
1. inspect meaningful PR history, not only final green state;
2. preserve evidence before attribution/repair;
3. distinguish product failure from harness/fixture/CI/platform failure;
4. distinguish accidental failures from expected negative proofs;
5. normalize recurring signatures without storing raw logs;
6. count distinct recurrences, not noisy retries;
7. convert repeated/deterministic failures into proportional prevention controls;
8. apply active prevention rules at the start of future relevant work;
9. keep feedback reconciliation separate from runtime/release changes;
10. never let the feedback system auto-patch production;
11. preserve FIX / WATCH / DEFER / BLOCKER semantics;
12. keep Usage Dashboard-only history outside SimCore's ledger;
13. use existing safe main-write authority instead of inventing a competing writer;
14. preserve UNKNOWN when evidence does not support a cause;
15. make feedback status explicit when reconciliation is stale or blocked.
```

Desired long-term effect:

```text
A failure may happen once.
If it happens again, the repository should know that it has happened before.
If it is preventable, the next task should see the prevention before repeating it.
```

---

## 61. Current status

```text
PFFL design                    FROZEN
PFFL implementation            NOT STARTED
historical backfill            NOT STARTED
machine ledger                 NOT CREATED
prevention rules               NOT CREATED
start preflight                NOT ACTIVE
post-PR reconciliation         NOT ACTIVE
runtime change                 NONE
release-simcore change         NONE
```

Next authorized work, if requested:

```text
PFFL-1 — Inventory / schema / evidence-backed historical backfill
```

Do not mix that implementation with a SimCore runtime feature release or RS2-4 release-controller implementation.
