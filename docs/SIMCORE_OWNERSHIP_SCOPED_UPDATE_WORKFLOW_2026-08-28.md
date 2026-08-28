# SimCore Ownership-Scoped Update Workflow

Date: 2026-08-28
Status: `ADOPTED · NON_RUNTIME · OPERATING_WORKFLOW`

## Purpose

Reduce update-time context load without changing SimCore runtime behavior, release semantics, module ownership, or deployment authority.

This workflow replaces the default habit of reading the complete installable runtime for every change with an ownership-scoped reading strategy.

## Core Rule

For each future SimCore runtime update, begin from the requested behavior and identify the authoritative module owner(s) before reading implementation detail.

Default read scope:

1. current production/version header and the directly relevant release note block;
2. module responsibility/ownership contracts for the affected behavior;
3. the affected module implementation and its immediate callers/callees;
4. tests, CI guards, evidence, and diagnostics that directly cover the behavior;
5. cross-module invariants explicitly referenced by those owners.

Do not read the complete `plugins/simcore/latest.js` / `install.js` body by default.

## Escalation Rule

Expand beyond the scoped read only when evidence requires it, including:

- an ownership boundary is ambiguous;
- a referenced invariant crosses modules;
- a test or diagnostic shows an unexplained side effect;
- a change touches persistence schema, request/output orchestration, generation/reload safety, or another known cross-cutting contract;
- static/CI verification fails outside the expected ownership surface;
- live evidence contradicts the scoped model.

When scope expands, record why it expanded and which additional modules became relevant.

## Runtime Artifact Rule

`release-simcore/plugins/simcore/latest.js` and `install.js` remain the deployment authority and must stay byte-identical.

Ownership-scoped reading changes only the operator/developer inspection strategy. It does not authorize splitting the shipped plugin, moving runtime authority, weakening parity checks, or skipping whole-artifact validation.

## Validation Rule

Narrow reading does not mean narrow verification.

After an implementation change, continue to run the full applicable static/CI verification required by the release process, including parity/integrity checks that operate on the complete runtime artifact.

The workflow therefore separates:

```text
READ SCOPE = ownership-bounded by default
VALIDATION SCOPE = full applicable release guards
```

## Change Worksheet

Every runtime update should be able to answer the following before implementation:

```text
Requested behavior:
Primary owner(s):
Immediate dependency owner(s):
Cross-cutting invariants:
Target implementation region(s):
Target tests/diagnostics/evidence:
Initial excluded modules:
Escalation triggers:
```

This worksheet may live in the release design/evidence document rather than a separate file.

## WATCH / DEFER / FIX / BLOCKER Use

Unexpected behavior discovered while operating under the scoped read is recorded immediately and classified:

- WATCH: suspicious but not yet evidence-backed as a defect;
- DEFER: valid concern outside the bounded change;
- FIX: evidence-backed defect inside the authorized change;
- BLOCKER: prevents safe continuation or invalidates the scoped ownership model.

## First-Use Gate

The next SimCore runtime update is the first practical use of this workflow.

Acceptance for first use:

- primary owner identified before implementation;
- initial read scope documented;
- any scope expansion explained;
- implementation remains bounded to the authorized behavior;
- full applicable static/CI verification still passes;
- `latest.js` and `install.js` remain identical;
- live verification records whether ownership-scoped reading missed any relevant interaction.

## Non-Goals

This workflow does not itself perform a runtime release, refactor the single-file plugin, alter module ownership, change deployment/repository authority, or claim performance improvement in the plugin runtime.

Its only immediate effect is to make future update work consume context deliberately instead of treating the entire ~550 KB runtime as the default reading unit.
