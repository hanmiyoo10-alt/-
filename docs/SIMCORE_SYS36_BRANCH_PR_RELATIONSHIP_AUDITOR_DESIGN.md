# SYS-36 — Branch/PR Relationship Auditor — Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR_PROTECTED · READ-ONLY BRANCH/PR/COMMIT RELATIONSHIP AUTHORITY · NO IMPLEMENTATION IN THIS TRANSACTION · NO RUNTIME CHANGE`

Unified idea classification:

```text
ID            = SYS-36
Idea          = Branch/PR Relationship Auditor
Size          = MEDIUM
Importance    = 4 / HIGH
Difficulty    = 3 / MODERATE
Runtime Class = NON_RUNTIME
Design Gate   = FROZEN (selected from NOW)
Apply Class   = NR_PROTECTED
Open design questions = 0
```

Classification authority:
- `docs/SIMCORE_UNIFIED_IDEA_CLASSIFICATION_POLICY.md`
- `docs/SIMCORE_NON_RUNTIME_APPLY_CLASSIFICATION_2026-08-26.md`
- `docs/SIMCORE_DESIGN_SWEEP_FIRST_POLICY_2026-08-26.md`

Direct operating context:
- `docs/SIMCORE_STALE_PR_HYGIENE_CLASSIFIER_DESIGN.md` / S-11
- `docs/SIMCORE_SYS35_REPOSITORY_TRANSACTION_LEDGER_DESIGN.md`
- `docs/SIMCORE_SYS07_CROSS_REFERENCE_INTEGRITY_AUDITOR_DESIGN.md`
- `docs/SIMCORE_SYS31_VERSION_BUMP_BLAST_RADIUS_CHECK_DESIGN.md`
- `docs/SIMCORE_SYS50_WORK_BUNDLING_CONFLICT_DETECTOR_DESIGN.md`
- `docs/SIMCORE_SYS46_CANONICAL_TASK_CARD_DESIGN.md`
- `docs/SIMCORE_SYS07_PARALLEL_MAIN_ACTIVITY_WATCH_2026-08-26.md`
- Git/GitHub branch, pull-request, commit, compare, and merge metadata as the natural relationship authority
- future `SYS-49 Safe Parallel Work Finder`

Existing authorities SYS-36 must not replace:
- Git commit graph as immutable commit/ancestry truth;
- GitHub PR metadata as PR open/closed/merged truth;
- GitHub branch refs as current mutable branch-tip truth;
- S-11 as stale/open-PR hygiene classification;
- SYS-35 as curated cross-work repository transaction lineage;
- SYS-31 as release/version blast-radius preflight;
- SYS-50 as work-family bundling preflight;
- repository main-write coordination as write/race policy;
- release records / release-simcore as release/runtime authority;
- current work/gate authorities as authorization and NEXT truth.

---

## 1. Problem

SimCore repository work uses several legitimate branch/PR shapes:

```text
ordinary bounded implementation PR
protected infrastructure PR
exact-base replay/replacement PR
command-only / trigger PR not intended to merge
long-lived release/control PR
closed-unmerged superseded candidate
merged PR whose source branch may later disappear
parallel main activity while another bounded SimCore transaction is in progress
```

The repository already has concrete examples showing why one PR field or one branch name cannot safely stand in for the whole relationship.

Examples observed during design review:

```text
PR #468
state = closed
merged_at != null
merge_commit_sha = 2453a6e9...
→ actually merged
```

```text
PR #109
state = open
merged_at = null
merge_commit_sha != null
body = command-only trigger / not intended to merge
→ merge_commit_sha presence alone does NOT mean merged
```

Recent exact-base repository-document promotion PRs also show:

```text
same base ref name = main
but recorded exact base SHA becomes stale as main advances
→ candidate may be intentionally closed without merge
→ replacement PR is created from a fresher exact base
```

And SYS-07 design work observed:

```text
bounded SimCore work in progress
+ unrelated canonical-main infrastructure commit lands on main
→ base→head compare contains unrelated paths
→ transaction authorship cannot be inferred from the whole compare alone
```

Without an explicit branch/PR relationship auditor, later operators/tools can make unsafe shortcuts:

```text
state = closed
→ assume merged

merge_commit_sha != null
→ assume merged

base.ref = main
→ assume exact expected base is still valid

branch name matches expected name
→ assume expected commit is still checked out

head branch missing after PR close
→ assume corruption

compare contains file X
→ assume current work authored file X

old PR still open
→ assume stale/close-worthy
```

All are invalid without the relevant relationship contract.

SYS-36 defines a bounded read-only **Branch/PR Relationship Auditor** that reports exact repository relationship facts under an explicit audit mode.

---

## 2. Core invariant

```text
explicit audit mode
+ exact repository / PR identity
+ exact observed PR metadata
+ exact mutable branch-tip observations when required
+ explicit expected base/head contract when required
+ fixed-SHA compare / ancestry facts when required
+ bounded capture-coherence check
→ deterministic branch/PR relationship findings

SYS-36
!= PR hygiene classifier
!= branch cleanup tool
!= merge/close authority
!= branch deletion authority
!= rebase tool
!= release authorizer
!= work scheduler
!= safe-parallel decision engine
!= repository transaction ledger
!= generic GitHub crawler
!= repository writer
```

Canonical question:

> What exact branch, PR, commit, base/head, merge, and ancestry relationships are true for this bounded repository object set under the selected contract?

SYS-36 does not answer:

> Should this PR be closed?

> Should these work items run in parallel?

> Is this release authorized?

> Is this work stale or abandoned?

Those remain with their owning systems.

---

## 3. Relationship facts are not interchangeable

The following facts are independent and must not be substituted for one another:

```text
PR state
PR merged_at
PR merge_commit_sha
PR head.ref
PR head.sha
PR base.ref
PR base.sha / API-side base metadata
current live head-branch tip
current live base-branch tip
explicit expected base SHA
explicit expected head SHA
fixed-SHA ancestry / compare result
```

Frozen rule:

```text
one field may corroborate another
but no field silently redefines another field's authority
```

### 3.1 Merge-state rule

Merged state is established by GitHub merge-state metadata, primarily:

```text
merged_at != null
```

normally together with closed PR state.

Critical anti-inference rule:

```text
merge_commit_sha != null
!= merged
```

A non-null merge SHA-like field may be exposed before an actual merge for an open PR.
It must not be interpreted as merge completion until merged state itself is established.

Once the PR is actually merged, `merge_commit_sha` may be used as the GitHub-provided merge-result identity for that PR.

### 3.2 Closed is not merged

```text
state = closed
+ merged_at = null
→ CLOSED_UNMERGED
```

This is a valid historical outcome and may represent:
- superseded exact-base candidate;
- abandoned candidate;
- deliberate command/control close;
- other policy-owned closure.

SYS-36 reports the relationship only.
It does not decide whether the closure was correct.

---

## 4. Branch refs are mutable; commit SHAs are identity

Frozen rule:

```text
branch ref
= mutable transport / current-tip locator

commit SHA
= immutable repository identity
```

Therefore:

```text
head.ref matches expected name
!= head commit matches expected head SHA
```

and:

```text
base.ref = main
!= exact-base contract remains satisfied
```

Any contract that requires exact branch content must carry an exact SHA.

Branch name alone is never sufficient identity for:
- exact-base replay;
- exact-head validation;
- merge approval;
- release candidate identity;
- transaction attribution.

This matches SYS-35's rule that branch names are not immutable transaction identities.

---

## 5. Frozen v1 audit modes

Exactly three v1 modes:

```text
BR-01 GENERIC_RELATION_AUDIT
BR-02 EXACT_BASE_TRANSACTION_AUDIT
BR-03 HISTORICAL_RELATION_AUDIT
```

### BR-01 `GENERIC_RELATION_AUDIT`

Purpose:

```text
report current PR/ref/commit relationships without inventing an exact-base policy
```

Required inputs:
- repository identity;
- PR number or explicit bounded branch pair;
- current GitHub metadata capture.

Checks may include:
- PR exists;
- state/merged_at coherence;
- head/base refs and recorded SHAs;
- live branch-tip binding for open PRs when branch exists;
- fixed-SHA compare/ancestry facts when requested.

Important:

```text
base branch advanced
!= error by itself
```

Generic GitHub PRs normally coexist with moving base branches.

### BR-02 `EXACT_BASE_TRANSACTION_AUDIT`

Purpose:

```text
validate a transaction that explicitly requires exact expected base/head identities
```

Required contract inputs:

```text
Expected base ref
Expected base SHA
Expected head ref when named
Expected head SHA when frozen
Base movement policy
Head movement policy
```

The expected values must come from an explicit structured authority such as:
- work packet/card;
- release/candidate request;
- machine-readable promotion request;
- reviewed PR body marker/structured block;
- other named transaction authority.

Never infer expected SHA merely from:
- current PR `base.sha`;
- PR title;
- age;
- branch naming convention;
- nearby commit timestamps.

Possible findings include:

```text
EXPECTED_BASE_ADVANCED
EXPECTED_HEAD_MOVED
EXPECTED_BASE_UNRESOLVED
EXPECTED_HEAD_UNRESOLVED
ANCESTRY_CONTRACT_NOT_MET
```

### BR-03 `HISTORICAL_RELATION_AUDIT`

Purpose:

```text
reconstruct immutable historical PR/commit relationship without requiring mutable source branches to still exist
```

For a closed/merged historical PR:

```text
head branch deleted later
!= integrity failure by itself
```

Required historical anchors should prefer:
- PR number;
- recorded head SHA;
- recorded base/ref context when material;
- merged_at / closed_at;
- merge identity when actually merged;
- fixed Git commit identities.

Live branch existence is optional unless the historical claim explicitly requires it.

---

## 6. Four relationship layers

SYS-36 separates four layers.

```text
L1 PR IDENTITY / STATE
Does the exact PR exist and what does GitHub say its state is?

L2 REF / TIP BINDING
Do mutable branch refs currently resolve to the expected tips when the audit mode requires live binding?

L3 FIXED-SHA RELATIONSHIP
What do immutable SHAs say about compare/ancestry/divergence?

L4 TRANSACTION CONTRACT
If exact-base/head semantics are declared, do observed facts satisfy that explicit contract?
```

A relationship can be clean on one layer and fail another.

Example:

```text
PR exists / open
→ L1 clean

head branch tip moved from expectedHeadSha
→ L2/L4 finding
```

---

## 7. Merge-method neutrality

SYS-36 must not assume one repository merge method.

Invalid universal rule:

```text
original PR head SHA must be an ancestor of merge_commit_sha
```

Squash/rebase/merge behaviors can produce different commit-graph shapes.

Therefore:
- GitHub `merged_at` owns merged-state observation;
- GitHub merge-result identity may be reported when merged;
- fixed-SHA ancestry is reported only for the exact relationship the selected rule requests;
- lack of an ancestry shape that only one merge method would create is not a generic merge-integrity failure.

SYS-36 reports facts, not a guessed merge algorithm.

---

## 8. Open PR head-branch rule

For an ordinary same-repository open PR, the live head branch is normally expected to resolve.

Possible distinction:

```text
OPEN PR + required head branch missing
→ HEAD_REF_UNRESOLVED_OPEN
```

For a closed/merged historical PR:

```text
head branch missing
→ allowed by default / informational
```

Do not use branch deletion as proof that a historical PR was abandoned or invalid.

Cross-repository/fork cases may require a different bounded rule later; v1 fails closed as `RELATION_INPUT_AMBIGUOUS` when repository/ref ownership cannot be resolved exactly.

---

## 9. Base movement semantics

Base movement has no one global meaning.

### Generic mode

```text
current base tip != PR creation-time/base-side SHA
→ normal possible repository evolution
→ not a failure by itself
```

### Exact-base mode

```text
explicit expectedBaseSha = P
current required base tip = P2
P2 != P
→ EXPECTED_BASE_ADVANCED
```

The owning transaction policy determines whether that finding means:
- review required;
- rebuild/replay required;
- hard block.

SYS-36 does not invent that business consequence unless the input contract explicitly maps it.

This keeps exact-base repository-document/release flows separate from ordinary PR semantics.

---

## 10. Head movement semantics

If a bounded transaction freezes a candidate/head SHA:

```text
expectedHeadSha = H
observed PR head SHA = H2
H2 != H
→ EXPECTED_HEAD_MOVED
```

This matters for:
- exact-head CI evidence;
- approval identity;
- deterministic promotion candidates;
- review receipts bound to a specific commit.

For an ordinary active development PR with no frozen-head contract, head movement is normal and must not be labeled an integrity defect.

---

## 11. Frozen v1 top-level dispositions

Exactly four:

```text
RELATION_CLEAN
RELATION_REVIEW_REQUIRED
RELATION_BLOCKED
RELATION_NOT_APPLICABLE
```

### `RELATION_CLEAN`

All checks required by the selected relationship contract resolved without contradiction.

It means only:

```text
requested repository relationships are coherent for the capture
```

It does not mean:
- PR should merge;
- CI passed;
- work is approved;
- release is safe;
- branch may be deleted;
- parallel work is safe.

### `RELATION_REVIEW_REQUIRED`

A relationship fact is unresolved/changed but the owning policy is required to determine consequence.

### `RELATION_BLOCKED`

A required relationship contract cannot be satisfied without guessing or a required exact identity is contradicted.

This is an **auditor result**, not automatic product/release BLOCKER disposition.
The caller/gate owns the operational consequence.

### `RELATION_NOT_APPLICABLE`

The requested audit mode does not apply to the supplied object type/contract.

---

## 12. Frozen v1 finding vocabulary

Canonical findings:

```text
BRF-01 PR_NOT_FOUND
BRF-02 PR_STATE_METADATA_CONFLICT
BRF-03 BASE_REF_UNRESOLVED
BRF-04 HEAD_REF_UNRESOLVED_OPEN
BRF-05 EXPECTED_BASE_UNSPECIFIED
BRF-06 EXPECTED_BASE_ADVANCED
BRF-07 EXPECTED_HEAD_UNSPECIFIED
BRF-08 EXPECTED_HEAD_MOVED
BRF-09 ANCESTRY_CONTRACT_NOT_MET
BRF-10 MERGED_IDENTITY_UNRESOLVED
BRF-11 MERGE_COMMIT_NOT_RESOLVABLE
BRF-12 RELATION_SNAPSHOT_RACED
BRF-13 RELATION_INPUT_AMBIGUOUS
BRF-14 FIXED_SHA_UNRESOLVED
```

Informational observations may include:

```text
BRI-01 CLOSED_UNMERGED
BRI-02 HEAD_REF_ABSENT_POST_CLOSE_ALLOWED
BRI-03 MERGE_SHA_PRESENT_PREMERGE_IGNORED
BRI-04 BASE_ADVANCED_GENERIC_MODE_ALLOWED
BRI-05 LIVE_HEAD_MATCHES_RECORDED_HEAD
```

Information codes never silently escalate to errors.

---

## 13. `merge_commit_sha` trap — frozen regression rule

The repository already contains a direct specimen:

```text
PR #109
state = open
merged_at = null
merge_commit_sha = non-null
```

Therefore v1 must have an explicit regression condition:

```text
IF merged_at == null
THEN merge_commit_sha MUST NOT establish merged state
```

Allowed behavior:

```text
record merge_commit_sha as raw GitHub field if useful
emit BRI-03 MERGE_SHA_PRESENT_PREMERGE_IGNORED
continue using actual state/merged_at semantics
```

Forbidden behavior:

```text
merge_commit_sha != null
→ merged = true
```

This rule is mandatory in any later implementation test corpus.

---

## 14. Bounded capture and race handling

Branch refs are mutable while the audit runs.

A relationship auditor can otherwise generate a false coherent snapshot by combining observations from different moments.

Frozen v1 capture pattern:

```text
1. capture PR metadata
2. capture required live base/head tips
3. convert compare/ancestry work to fixed SHA inputs
4. perform fixed-SHA relationship checks
5. re-read required live base/head tips
6. if a required ref moved during capture → RELATION_SNAPSHOT_RACED
```

Output should record:

```text
capture started
capture completed
initial observed base tip
final observed base tip
initial observed head tip
final observed head tip
fixed SHAs compared
```

Rules:

```text
fixed SHA result
= stable historical fact

ref tip result
= point-in-time observation
```

If a ref movement does not matter to the selected historical mode, do not manufacture a race failure.

---

## 15. Relationship to S-11 Stale PR Hygiene Classifier

S-11 answers:

```text
Given reviewed/offline open-PR metadata,
what hygiene posture should this PR receive?
```

Examples:

```text
KEEP_ACTIVE
REVIEW_LEGACY_CONTROL
COMMAND_ONLY_DONE
SUPERSEDED
REVIEW_STALE
UNKNOWN
```

SYS-36 answers:

```text
What exact branch/PR/commit relationships are true?
```

Therefore:

```text
SYS-36 may provide exact relationship evidence to a future S-11 review
but SYS-36 never emits KEEP/CLOSE/STALE hygiene decisions
```

And:

```text
old/open PR
!= stale merely because SYS-36 observes age
```

Age is not a SYS-36 semantic input except as optional display metadata.

---

## 16. Relationship to SYS-35 Repository Transaction Ledger

SYS-35 is curated historical semantic lineage.

SYS-36 is mechanical relationship verification.

```text
SYS-36
→ PR #X actually merged at T with GitHub merge identity M

SYS-35
→ this meaningful merge belongs to work/release lineage L as PR_MERGE
```

SYS-36 never decides whether a PR/commit is ledger-worthy.
SYS-35 never replaces GitHub relationship verification.

A future SYS-35 row may cite one SYS-36 report/receipt as supporting relationship evidence.

---

## 17. Relationship to SYS-07 Cross-Reference Integrity Auditor

SYS-07 intentionally remains local/no-network and audits registered repository-memory references.

SYS-36 owns live Git/GitHub relationship facts.

Possible future composition:

```text
SYS-07 structured field contains PR/branch relationship ref
→ local syntax/reference identity checks
→ external relationship status = NOT_CLAIMED unless a SYS-36 receipt/report is supplied
```

Do not make SYS-07 network-dependent merely to absorb SYS-36.

---

## 18. Relationship to SYS-31 / release authority

SYS-31 may need exact repository relationship facts during a release-radius review.

SYS-36 may report:
- expected production-parent branch/ref relation;
- exact candidate branch/head identity;
- whether a release PR/candidate relationship is coherent.

It does not:
- approve a release;
- write `release-simcore`;
- validate plugin bytes;
- close live gates;
- establish R2.1 E2E proof.

`RELATION_CLEAN` is never equivalent to release readiness.

---

## 19. Relationship to future SYS-49 Safe Parallel Work Finder

SYS-49 needs reliable facts about active repository work before reasoning about parallelism.

SYS-36 can provide bounded facts such as:

```text
active PR A head ref / head SHA
active PR B head ref / head SHA
base relationships
whether a frozen head moved
whether main advanced during a capture
whether a PR is actually merged/closed/open
```

SYS-49 may combine those with:
- SYS-46 task scope;
- SYS-50 bundling conflicts;
- SYS-09 review surfaces;
- explicit write scopes;
- repository coordination authority.

But:

```text
SYS-36 RELATION_CLEAN
!= safe to run in parallel
```

Parallel-safety judgment remains with SYS-49 / existing work coordination policy.

---

## 20. Why SYS-36 is `NR_PROTECTED`

The implementation can be fully read-only and still be governance-sensitive.

Canonical NR policy defines branch/repository governance policing as protected territory.

SYS-36's purpose is specifically to police:

```text
branch identity
PR identity/state
base/head exactness
merge relationship
ancestry relationship
exact-base transaction relationship
```

Those facts may feed merge, release, protected infrastructure, or parallel-work decisions.

Therefore:

```text
Apply Class = NR_PROTECTED
```

This does not mean SYS-36 may mutate protected surfaces.
It means any implementation must use a dedicated protected transaction with explicit review of:
- GitHub read scope;
- credentials/token handling if any collector exists;
- failure-closed behavior;
- no write endpoints;
- no hidden merge/close/delete primitive;
- no CI/release authority promotion.

---

## 21. Future implementation shape

A preferred later architecture separates live capture from deterministic evaluation.

Conceptually:

```text
products/simcore/tooling/branch-pr-relationship-core.mjs
products/simcore/tooling/branch-pr-relationship-audit.mjs
products/simcore/tooling/branch-pr-relationship.test.mjs
```

Potential data flow:

```text
read-only Git/GitHub capture
→ normalized bounded relationship snapshot
→ deterministic core
→ report
```

The deterministic core should be testable without network access.

If a live collector is included:
- read-only APIs only;
- no token value in output/logs;
- no mutation endpoints;
- no branch deletion/close/merge/rebase methods;
- bounded repository/object input only;
- explicit timeout/failure state;
- no background monitoring in v1.

Implementation remains a **later protected transaction**.

---

## 22. No CI integration in the implementation transaction

A future local/protected SYS-36 tool does not automatically become a required CI gate.

Frozen separation:

```text
SYS-36 implementation
!= permanent CI integration
!= merge requirement
!= release gate
```

If later evidence justifies making a subset mandatory in CI, that is a separate protected repository/CI transaction with its own authority review.

This preserves the rule that repository-system changes are not casually bundled into another feature/tool implementation.

---

## 23. Required later verification specimens

Any future implementation must include at least these bounded tests.

```text
T1 merged PR
state closed + merged_at present + merge identity
→ merged relation recognized

T2 closed-unmerged PR
state closed + merged_at null
→ not merged

T3 open PR with non-null merge_commit_sha
merged_at null
→ MUST NOT classify merged

T4 generic PR with base advancement
no exact-base contract
→ no EXPECTED_BASE_ADVANCED failure

T5 exact-base transaction with base moved
→ EXPECTED_BASE_ADVANCED

T6 exact-head transaction with head moved
→ EXPECTED_HEAD_MOVED

T7 closed/merged historical PR with deleted head branch
→ historical relation may remain valid

T8 open PR with required live head missing
→ HEAD_REF_UNRESOLVED_OPEN

T9 capture base/head ref moves during required live audit
→ RELATION_SNAPSHOT_RACED

T10 fixed SHA not resolvable
→ FIXED_SHA_UNRESOLVED / fail closed

T11 no network/write primitive in deterministic core
→ verified
```

The real PR #109 field combination should be preserved as a regression specimen or normalized equivalent.

---

## 24. Evidence honesty / non-claims

Every report must distinguish:

```text
OBSERVED
= exact Git/GitHub field or fixed-SHA compare result

DERIVED_DETERMINISTIC
= direct rule result from frozen inputs

NOT_CLAIMED
= semantics outside SYS-36
```

Mandatory non-claims include as applicable:

```text
PR should merge = NOT_CLAIMED
PR is stale = NOT_CLAIMED
branch should be deleted = NOT_CLAIMED
CI proof = NOT_CLAIMED unless separately supplied
release readiness = NOT_CLAIMED
parallel safety = NOT_CLAIMED
work ownership = NOT_CLAIMED
runtime correctness = NOT_CLAIMED
```

---

## 25. Failure / uncertainty behavior

Fail closed when a required relationship cannot be resolved exactly.

Examples:

```text
expected base SHA omitted in exact-base mode
→ RELATION_BLOCKED + EXPECTED_BASE_UNSPECIFIED

PR identity ambiguous
→ RELATION_BLOCKED + RELATION_INPUT_AMBIGUOUS

branch moved during required snapshot
→ RELATION_REVIEW_REQUIRED/BLOCKED per contract + RELATION_SNAPSHOT_RACED

GitHub unavailable
→ no cached CLEAN promotion
→ report capture failure / unresolved
```

Never convert missing live data into:

```text
probably clean
probably merged
probably stale
```

---

## 26. Non-goals

SYS-36 v1 does not:

```text
close PRs
merge PRs
reopen PRs
delete branches
create branches
rebase branches
force-push refs
edit PR bodies/labels
change branch protection
change workflow files
change CI policy
change release records
write release-simcore
classify PR hygiene/staleness
schedule work
calculate safe parallelism
scan every repository PR continuously
run background/webhook monitoring
```

---

## 27. Design acceptance

SYS-36 design is complete when all are true:

```text
1. merge state is separated from merge_commit_sha presence
2. closed-unmerged is a first-class valid state
3. branch ref names are separated from commit identity
4. generic PR movement is separated from exact-base/head contracts
5. historical mode does not require deleted source branches to exist
6. capture races fail closed rather than producing mixed-time CLEAN
7. S-11 stale hygiene remains separate
8. SYS-35 semantic transaction lineage remains separate
9. SYS-07 stays local/no-network
10. SYS-49 remains the future safe-parallel decision owner
11. apply class is NR_PROTECTED under branch-governance policy
12. no writer/merge/close/delete/release primitive is introduced
13. no runtime/release-simcore change occurs
```

All conditions are frozen here.

---

## 28. Application / implementation posture

```text
DESIGN = FROZEN
APPLY CLASS = NR_PROTECTED
IMPLEMENTATION = HOLD
CI INTEGRATION = NOT AUTHORIZED
RUNTIME CHANGE = NONE
RELEASE-SIMCORE CHANGE = NONE
REAL LONG-CHAT VALIDATION = NOT REQUIRED SOLELY FOR SYS-36
```

The active system-design sweep continues after this freeze.
Actual SYS-36 implementation must wait for a separately selected protected implementation transaction.

---

## 29. Verdict

```text
SYS-36 BRANCH/PR RELATIONSHIP AUDITOR
= FROZEN
= MEDIUM / I4 / D3
= NON_RUNTIME
= NR_PROTECTED

Core safety rule:
GitHub relationship fields are observed independently;
no single mutable ref or convenience field is promoted into a stronger relationship than its natural authority supports.

Mandatory regression boundary:
merge_commit_sha != null
+ merged_at == null
→ NOT MERGED

Implementation/application remains HOLD.
Plugin/runtime/release-simcore remains unchanged.
```
