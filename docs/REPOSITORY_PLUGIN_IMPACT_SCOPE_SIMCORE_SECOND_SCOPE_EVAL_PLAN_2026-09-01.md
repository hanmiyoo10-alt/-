# `plugin-impact-scope` — SimCore Second-Scope Eval Plan — 2026-09-01

Date: 2026-09-01 KST

Status: **EVAL PLAN FROZEN · CANDIDATE ONLY · SIMCORE NOT VALIDATED · NO PRODUCT AUTHORITY**

This document converts the completed SimCore second-scope candidacy review into a bounded evaluation plan without promoting `plugin:simcore`, modifying the skill procedure, changing SimCore product/runtime/release bytes, or coupling 3M product design to common-skill success.

## 1. Frozen evidence snapshot

To prevent answer leakage, the prospective 3M-3 held-out case is frozen before any human 3M-3 impact-scope answer is written.

```text
main snapshot        = e4daaa427ed902ca6f8368c45d509f7fd0f26d42
release-simcore      = 861100f4771967aa5b8ab8811d06f11702c0d3ff
candidate scope      = plugin:simcore
validated scope      = plugin:usage-dashboard only
```

Future model execution must use this frozen snapshot or an equivalently isolated source bundle derived only from it. Later 3M-3 answer/design documents must not enter the eval context.

## 2. Three-case shape

Candidate file:

```text
.agents/skills/plugin-impact-scope/evals/second_scope_candidate_evals.json
```

Cases:

1. `simcore-context-projection-retrospective`
   - retrospective compatibility fixture only;
   - useful to detect regressions against an already successful manual impact-scope pattern;
   - not independent generalization proof.

2. `simcore-exposure-retrospective`
   - retrospective compatibility fixture only;
   - checks provenance/exposure owner separation;
   - not independent generalization proof.

3. `simcore-3m3-structured-sidecar-validation-heldout`
   - prospective held-out case;
   - frozen before the human 3M-3 impact map exists;
   - intended independent second-scope evidence.

## 3. Why 3M-3 is the held-out case

3M-3 is broad enough to require real impact scoping but bounded enough to judge source-linked completeness. It spans existing 3M design contracts, deployed runtime owners, validator boundaries, prompt/context/persistence constraints, and release isolation without requiring implementation.

The question deliberately asks only:

```text
what current semantic surfaces and preservation boundaries could be affected?
```

It does not reveal the expected final schema, module placement, implementation mechanism, or human impact-map answer.

## 4. Required SimCore-specific compatibility proof

The strongest second-scope challenge is split authority:

```text
main
= design / evidence / roadmap / administration authority

release-simcore
= deployed runtime code / production artifact authority
```

A useful SimCore impact answer must not treat a convenient `main/plugins/simcore/*` hit as proof of deployed runtime behavior. Current checkout text search remains candidate discovery only; exact owner/ref reads must establish semantic claims.

## 5. Evaluation sequence

Recommended sequence:

```text
mechanical candidate fixture CI
→ isolated retrospective pair(s)
→ isolated prospective 3M-3 with-skill vs baseline pair
→ source-backed human qualitative review
→ trigger positive/negative review
→ explicit second-scope acceptance decision
→ only then consider plugin:simcore in PILOT_VALIDATED_SCOPES
```

No stage may manufacture PASS from fixture presence or mechanical CI.

## 6. Product isolation

The common-skill evaluation and SimCore 3M product work are separate transactions.

```text
skill eval FAIL/PARTIAL
→ preserve skill evidence
→ do not block human SimCore impact-scope/design work

skill eval PASS
→ evidence for common-skill second-scope promotion only
→ does not authorize 3M runtime implementation
```

Do not add a SimCore-specific fork such as `plugin-impact-scope-simcore`. Project-specific authority differences should remain inputs/profiles to one common skill unless real evidence later proves the job itself differs.

## 7. Current gate

```text
SIMCORE_SECOND_SCOPE_CANDIDATE = YES
CANDIDATE_FIXTURE = FROZEN
PROSPECTIVE_HELDOUT = FROZEN BEFORE HUMAN ANSWER
MODEL OUTPUT EVAL = NOT YET EXECUTED
TRIGGER EVAL = NOT YET EXECUTED
PILOT_VALIDATED_SCOPES CHANGE = NOT AUTHORIZED
SIMCORE PRODUCT AUTHORITY = NONE
```

Next common-tooling action, when an isolated execution surface is explicitly available, is to run the frozen 3M-3 candidate pair without importing later answer documents.
