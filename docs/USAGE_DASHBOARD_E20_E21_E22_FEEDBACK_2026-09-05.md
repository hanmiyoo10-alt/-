# Local Usage Dashboard — E20 / E21 / E22 Feedback

Date: 2026-09-05 KST  
Status: **FEEDBACK RECORDED · E20 KEEP SEALED · E21 KEEP SEALED · E22 NOT AUTHORIZED**

This note records a fresh design/maintenance review only. It does not authorize a Product bump, runtime change, release generation, workflow stage, or production mutation.

## 1. Fresh authority

At this review boundary:

- repository: `hanmiyoo10-alt/-`;
- main: `195c39b0bc4de097dafa1dfc52b6d7da037f40cf`;
- production branch: `release-usage-dashboard`;
- production SHA: `91c3d11d6aa7d5299b701ff94956a230a07d4be2`;
- production Product: `3.0.0-alpha.5.99`;
- 5.99 repository deployment: exact-byte promotion complete;
- 5.99 physical acceptance: still separate and pending user device evidence at this review boundary.

The current 5.99 release spec still uses E20 structured release evidence and E21 canonical evidence compatibility without creating new release authority:

- `releaseEvidence.acceptedBaseline` = accepted 5.98 release;
- `releaseEvidence.latestInstalled` = accepted 5.98 release at the 5.99 source freeze;
- `authority.releaseGeneration` remains `E13`;
- E20 is described as structured release evidence authority only;
- E21 is described as canonical evidence-view compatibility only.

## 2. E20 feedback — KEEP SEALED

E20 solved the correct ownership problem.

What it got right:

- exactly two semantic roles: `acceptedBaseline` and `latestInstalled`;
- release SHA and Product identity remain explicit rather than inferred from prose;
- accepted / partial / rejected / unverified are bounded evidence states;
- forward release evidence must point backward to older release authority;
- structured evidence does not coexist with independent legacy machine owners;
- the contract is pure/local and does not fetch GitHub, create a database, or convert physical acceptance into CI authority;
- E20 is subordinate to the existing release authority graph instead of becoming `release_generation: E20`.

This is the right abstraction layer: E20 validates evidence semantics but does not own release orchestration.

No E20 redesign is justified by current 5.99 evidence. The contract has survived multiple forward Product specs and remains useful without widening authority.

**Verdict: KEEP SEALED.**

## 3. E21 feedback — KEEP SEALED

E21 is the stronger convergence pass and should also remain sealed.

What it improved:

- one canonical `release_evidence_view_e21.cjs` owns structured/legacy representation compatibility;
- generic current-release consumers no longer branch independently on raw evidence representations;
- the structured evidence shape is closed, so shadow third roles/fields fail closed;
- one shared release-order primitive replaces local ordering duplication;
- the synthetic forward canary checks the next Product representation before a real Product bump;
- a bounded static guard rejects new generic raw-evidence consumers;
- historical frozen release proofs remain historical instead of being rewritten.

The current E21 contract derives its synthetic next Product from the checked-out manifest, so the guard is not permanently tied to the original 5.97-era forward fixture. That is the desired maintenance property.

5.99 reaching successful candidate validation and exact-byte promotion while retaining E20/E21 is evidence that the convergence goal is working: no release-specific generic evidence-consumer migration was required for 5.99.

**Verdict: KEEP SEALED.**

## 4. E22 feedback — DO NOT CREATE FROM SEQUENCE ALONE

There is currently no canonical Usage Dashboard E22 design or implementation in the repository.

That absence is healthy. `E22` must not exist merely because `E21` exists.

Creating a new generation now would likely add machinery without a demonstrated ownership gap. In particular, do not introduce any of the following under an E22 label without new evidence:

- a third release-evidence role;
- a new outer release schema above E19;
- a new workflow stage, queue, reducer, poller, bot, or writer;
- network lookup of GitHub issues/comments from the evidence contract;
- automatic conversion of physical acceptance into release authority;
- a mutable release-evidence database;
- bulk migration of historical release specs;
- another release-version parser;
- another compatibility view beside E21;
- `release_generation: E22`.

## 5. What would justify an E22 later

E22 should be considered only after fresh repeated evidence exposes a real gap that E19/E20/E21 cannot solve locally.

Strong qualifying examples would be:

1. two or more forward Product releases require the same manual repair because release-evidence authoring itself has duplicated semantics that E20 validates but no single pure helper owns;
2. a real forward release passes the synthetic E21 canary but fails because a generic consumer still has an unmodeled representation dependency;
3. an actual source-backed release lifecycle requires a new evidence state or field that cannot be represented honestly by the current closed E20 role shape;
4. Product ordering parity or evidence-view ownership begins drifting despite the current E21 guards.

A single release-specific materializer containing version-locked assertions is not by itself sufficient evidence for E22. Historical/release-specific assertions are intentionally allowed to stay specific when they freeze exact release truth.

## 6. If E22 ever becomes justified

The preferred direction would be the smallest missing pure ownership primitive, not a new orchestration layer.

For example, if repeated future releases prove that constructing the same closed `releaseEvidence` object is an actual duplicated semantic owner, a future E22 could be considered as a **pure release-evidence authoring helper** that:

- accepts already-resolved explicit source facts;
- emits only the existing E20 closed shape;
- validates through E20 before returning;
- uses the existing shared release-order helper;
- performs no network I/O;
- creates no new evidence role or authority;
- does not decide whether physical evidence is accepted;
- does not mutate historical specs;
- remains beneath E19/E20/E21 and the existing E13 release authority graph.

This is only a conditional direction, not an authorized design.

## 7. Current recommendation

The correct maintenance posture now is:

`E20 KEEP SEALED -> E21 KEEP SEALED -> E22 HOLD / NO DESIGN`

Finish 5.99 physical acceptance first. After that, the next Product design should re-read the current repository and only open a new E-generation if a concrete repeated release-control defect exists.

Until such evidence exists, the simplicity win is to stop adding generations.
