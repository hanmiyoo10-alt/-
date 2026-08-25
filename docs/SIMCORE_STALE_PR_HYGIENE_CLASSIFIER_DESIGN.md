# SimCore S-11 Stale PR Hygiene Classifier — Frozen Design

Date: 2026-08-26
Status: `DESIGN FROZEN · NON_RUNTIME · NR DIFFICULTY-2 · NO IMPLEMENTATION · NO RUNTIME CHANGE`

Idea inventory ID: `S-11`
Size: `SMALL`
Importance: `3 / MEDIUM`
Design difficulty: `2 / EASY`
Runtime class: `NON_RUNTIME`
Design gate at selection: `NOW`

Related authority:
- `docs/SIMCORE_IDEA_DESIGN_FREEZE_POLICY.md`
- `docs/SIMCORE_IDEA_TIER_NON_RUNTIME_HARVEST_POLICY.md`
- `docs/SIMCORE_IDEA_NR_R_SPLIT_PRIORITY_2026-08-26.md`
- `docs/SIMCORE_REPO_STATUS_AUDIT_2026-08-26.md`
- current GitHub PR metadata when explicitly captured for review

---

## 1. Problem

SimCore keeps some old/open pull requests for different historical reasons:

```text
long-lived release/control branch PR
command-only trigger PR
shadow/release-system implementation PR
ordinary unfinished work PR
superseded work PR
```

Age alone cannot distinguish them.

A stale-looking PR may be intentionally non-mergeable, may have been a one-shot command surface, or may simply be old evidence. Conversely, a PR can remain open after its purpose is already satisfied and create operator noise.

S-11 defines a bounded offline classifier that helps a human decide which open PRs deserve review without closing, editing, labeling, or otherwise mutating GitHub.

---

## 2. Core identity

```text
STALE PR HYGIENE CLASSIFIER
= offline metadata classifier / review aid

!= GitHub bot
!= PR closer
!= merge authority
!= branch deleter
!= release authority
!= age-only stale detector
```

The classifier never decides that a PR may be closed automatically.

---

## 3. Input boundary

S-11 consumes an explicit local JSON snapshot supplied by the caller.

Conceptual input:

```json
{
  "schemaVersion": 1,
  "capturedAt": "2026-08-26",
  "pullRequests": [
    {
      "number": 109,
      "state": "open",
      "title": "...",
      "body": "...",
      "base": "main",
      "head": "...",
      "headSha": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "mergeable": false
    }
  ],
  "context": {
    "productionBranch": "release-simcore",
    "currentMain": "<optional sha>",
    "knownCompletedWork": ["<bounded IDs or PR numbers>"],
    "knownSupersededHeads": ["<branch names>"]
  }
}
```

Required PR fields:

```text
number
state
title
base
head
createdAt
updatedAt
```

Optional fields:

```text
body
headSha
mergeable
```

No GitHub API call belongs inside the classifier.

The metadata snapshot may be produced manually or by a separate future read-only capture step. S-11 does not own capture/network behavior.

---

## 4. Output contract

Machine report:

```json
{
  "schemaVersion": 1,
  "result": "CLEAN | REVIEW_REQUIRED | BLOCKED",
  "rows": [
    {
      "number": 109,
      "classification": "COMMAND_ONLY_DONE",
      "reasonCodes": ["BODY_NOT_INTENDED_TO_MERGE", "KNOWN_WORK_COMPLETED"],
      "action": "REVIEW_FOR_MANUAL_CLOSE"
    }
  ]
}
```

The report contains bounded metadata/reason IDs only.

No patch, close request, GitHub mutation payload, or branch deletion command is emitted.

---

## 5. Frozen classification vocabulary

Exactly these v1 classifications:

```text
KEEP_ACTIVE
= evidence says the PR still represents active current work/control and should not be treated as stale

REVIEW_LEGACY_CONTROL
= long-lived control/release-branch style PR; human review required, no automatic stale conclusion

COMMAND_ONLY_DONE
= source metadata explicitly says the PR was command/trigger-only and the supplied context says that work is complete

SUPERSEDED
= supplied bounded context explicitly identifies the head/work item as superseded by completed current authority

REVIEW_STALE
= no active/superseded/command-only proof, but metadata is old enough to justify human review

UNKNOWN
= insufficient or contradictory metadata; no hygiene conclusion
```

Top-level result:

```text
CLEAN
= every supplied open PR is KEEP_ACTIVE

REVIEW_REQUIRED
= at least one row is REVIEW_LEGACY_CONTROL / COMMAND_ONLY_DONE / SUPERSEDED / REVIEW_STALE

BLOCKED
= required metadata is missing/ambiguous enough that at least one row cannot be safely classified beyond UNKNOWN
```

`UNKNOWN` is fail-closed, never silently treated as clean.

---

## 6. Age rule

Age is a review signal only.

Frozen default threshold:

```text
STALE_REVIEW_DAYS = 14
```

But:

```text
age >= threshold
!= SUPERSEDED
!= COMMAND_ONLY_DONE
!= permission to close
```

Age may only produce:

```text
REVIEW_STALE
```

when no stronger bounded evidence exists.

The threshold is a tool default and may be overridden explicitly by CLI input; the report must include the threshold used.

---

## 7. Rule precedence

For an OPEN PR:

```text
1. insufficient required metadata
   → UNKNOWN

2. explicit current active/control context
   → KEEP_ACTIVE

3. head == production authority branch (for example release-simcore)
   → REVIEW_LEGACY_CONTROL

4. body explicitly marks command/trigger-only AND context says work completed
   → COMMAND_ONLY_DONE

5. context explicitly marks head/work as superseded
   → SUPERSEDED

6. age >= threshold
   → REVIEW_STALE

7. otherwise
   → KEEP_ACTIVE
```

Closed/merged PRs may be omitted from the report or marked as non-open input; they are not stale-open hygiene targets.

---

## 8. Current examples / evidence constraints

Current repository audit preserves three open legacy/control PRs:

```text
#2   Release simcore
#109 v0.64.6 closure build command
#207 RS2-4 shadow release transaction
```

They are currently `WATCH / REPO_HYGIENE / NON_RUNTIME / NON_BLOCKING` and do not override production authority.

Observed metadata supports different handling:

```text
#2
head = release-simcore
base = main
→ REVIEW_LEGACY_CONTROL
→ never auto-close

#109
body explicitly says command-only trigger and not intended to merge
→ if supplied context confirms the v0.64.6 closure-build work is complete
→ COMMAND_ONLY_DONE

#207
shadow/release-system implementation PR
→ classification depends on supplied current completion/supersession context
→ do not infer from age/title alone
```

These examples are design evidence, not hard-coded PR-number rules.

---

## 9. Reason codes

Frozen v1 reason codes:

```text
MISSING_REQUIRED_METADATA
PRODUCTION_BRANCH_HEAD
EXPLICIT_ACTIVE_CONTEXT
BODY_NOT_INTENDED_TO_MERGE
KNOWN_WORK_COMPLETED
KNOWN_SUPERSEDED_HEAD
AGE_THRESHOLD_EXCEEDED
NO_STALE_SIGNAL
CONTEXT_CONTRADICTORY
```

Reason codes are descriptive only and never authorize a write.

---

## 10. Physical implementation boundary

Preferred future implementation:

```text
products/simcore/tooling/stale-pr-hygiene.mjs
```

CLI concept:

```text
node products/simcore/tooling/stale-pr-hygiene.mjs \
  --input <snapshot.json> \
  --report <report.json> \
  [--stale-days 14]
```

No network.
No GitHub token.
No `gh` subprocess.
No branch writes.
No issue/PR mutations.

This keeps S-11 eligible for SAFE_NON_RUNTIME harvest after NR Difficulty-2 closes.

---

## 11. Determinism / boundedness

Given identical input bytes and CLI options:

```text
report bytes = identical
```

Normalization:
- sort rows by PR number ascending;
- sort reason codes lexicographically;
- UTF-8 JSON;
- stable indentation;
- trailing newline;
- no generated current wall-clock timestamp;
- no environment/hostname/tool-version fields.

Bounds:

```text
max PR rows: 512
max title/body field consumed per row: 4096 chars
max reason codes per row: 8
max report: 512 KiB
```

The classifier may inspect only the first bounded body segment required to recognize explicit command-only wording.

It must not copy PR body text into the output report.

---

## 12. Failure behavior

```text
invalid JSON
→ exit operational error
→ no authoritative-looking partial report

missing required PR metadata
→ row UNKNOWN
→ top-level BLOCKED

contradictory supplied context
→ UNKNOWN + CONTEXT_CONTRADICTORY
→ BLOCKED

output write failure
→ operational error
→ input untouched
```

No failure path mutates GitHub or repository authority files.

---

## 13. Security / privacy boundary

Forbidden output/input expansion:

```text
GitHub credentials
author email/private profile details
review comment bodies
full diffs
patches
repository secrets
raw workflow logs
```

Only bounded PR hygiene metadata is needed.

---

## 14. Verification obligations

Minimum later tests:

```text
1. production-branch head → REVIEW_LEGACY_CONTROL
2. explicit command-only + completed context → COMMAND_ONLY_DONE
3. command-only without completed context → not COMMAND_ONLY_DONE
4. explicit superseded head → SUPERSEDED
5. old ordinary PR → REVIEW_STALE
6. young ordinary PR → KEEP_ACTIVE
7. explicit active context overrides age → KEEP_ACTIVE
8. missing required fields → UNKNOWN / BLOCKED
9. contradictory active + superseded context → UNKNOWN / BLOCKED
10. closed/merged input not treated as stale-open target
11. identical input → byte-identical report
12. output contains no body/diff payload
13. no network or GitHub dependency
14. no plugin/release-simcore change
```

Current #2/#109/#207 metadata may be used as bounded documentation examples, but permanent tests should use neutral fixture IDs rather than hard-code live PR numbers as product rules.

---

## 15. Relationship to S-10

```text
S-10 Authority Drift Check
= current authority surfaces agree?

S-11 Stale PR Hygiene
= which supplied open PRs deserve human hygiene review?
```

S-11 does not inspect production identity or CURRENT_DEVELOPMENT semantics.
S-10 does not classify PR hygiene.

---

## 16. Relationship to release system

S-11 may identify old release-system PRs for review, but:

```text
release workflows
release approval
release publication
branch authority
PR close/merge
```

remain outside S-11.

No result from S-11 authorizes a release-system mutation.

---

## 17. Live validation

```text
REAL LONG-CHAT VALIDATION = NOT REQUIRED
```

S-11 is offline repository tooling only.

---

## 18. Implementation disposition

Frozen classification:

```text
Runtime Class = NON_RUNTIME
SAFE_NON_RUNTIME candidate = YES
```

Final harvest eligibility is evaluated only after the NR Difficulty-2 tier closes and implementation inspection confirms:

```text
no network
no GitHub writer
no CI-policy change
no plugin/runtime/release-simcore change
```

---

## 19. Open design questions

```text
NONE
```

---

## 20. Final frozen contract

```text
S-11 STALE PR HYGIENE CLASSIFIER

INPUT
= explicit bounded local PR metadata snapshot

OUTPUT
= deterministic bounded review classification report

NETWORK
= FORBIDDEN

GITHUB WRITE
= FORBIDDEN

AUTO CLOSE / MERGE / LABEL / DELETE BRANCH
= FORBIDDEN

AGE
= review signal only

CLASSIFICATIONS
= KEEP_ACTIVE
  REVIEW_LEGACY_CONTROL
  COMMAND_ONLY_DONE
  SUPERSEDED
  REVIEW_STALE
  UNKNOWN

DESIGN STATUS
= FROZEN

RUNTIME CHANGE
= NONE
```