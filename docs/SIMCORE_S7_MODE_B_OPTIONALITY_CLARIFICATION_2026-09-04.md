# SimCore S7 Mode B Optionality Clarification — 2026-09-04

Date: 2026-09-04 KST
Status: **DESIGN CLARIFICATION · L4 CONDITIONAL · NO RUNTIME / RELEASE CHANGE**
Classification: **SIMCORE · S7 · REAL-LONG-CHAT · VALIDATION CONTRACT CLARIFICATION**

## 1. Purpose

This document clarifies one ambiguity in `docs/SIMCORE_S7_POST_M2_SIMPLIFICATION_PROGRAM_CONVERGENCE_DESIGN_2026-08-31.md` section L4.

The original text says to exercise `B_START`, `B_CONTINUE`, and `B_END`. Read literally, that can be mistaken for a requirement to force Mode B during S7 close even when Broadcast mode is not selected by the operator/current scenario.

That reading is incorrect.

## 2. Canonical clarification

Mode B is a selectable runtime path. S7 must validate the behavior of Mode B when Mode B is actually selected or naturally enters the accepted validation evidence set. S7 does not require the operator to activate Broadcast merely to satisfy a checklist.

Canonical L4 semantics are therefore:

```text
IF Mode B is selected / exercised in the accepted live-validation scenario:
  validate B_START -> B_CONTINUE -> B_END lifecycle integrity
  validate broadcast lock / airtime / closure / Frame-Time sentinels

IF Mode B is not selected during the accepted live-validation scenario:
  L4 = NOT_APPLICABLE / CONDITIONAL_NOT_EXERCISED
  absence of B activation is not a live-close blocker by itself
```

A naturally available direct post-B_END observation may still be retained as bounded supporting evidence, but it does not create an obligation to manufacture a new B lifecycle run.

## 3. Scope of amendment

This clarification supersedes only an unconditional reading of S7 L4. It does not weaken correctness requirements for any B lifecycle that is actually exercised.

It does not change:

- production runtime bytes;
- release identity or release state;
- persistent schema;
- A/C mode contracts;
- reroll/edit/reload requirements;
- Frame/Time/Broadcast semantics;
- provider-cache posture;
- HUMAN_EVIDENCE close authority.

## 4. Validation consequence

For v0.70.3 pre-close accounting:

```text
L4 Mode B lifecycle = CONDITIONAL
forced B activation = NOT REQUIRED
B not selected = NOT_APPLICABLE, not NOT_RUN blocker
B selected = lifecycle evidence required for that exercised path
```

Any pre-close checklist that lists a forced `B_START -> B_CONTINUE -> B_END` sequence as universally mandatory must be corrected to this interpretation.

## 5. Final disposition

```text
S7_L4 = CONDITIONAL_ON_MODE_B_SELECTION
FORCED_B_FOR_LIVE_CLOSE = NO
B_CORRECTNESS_IF_EXERCISED = REQUIRED
RUNTIME_CHANGE = NONE
PRODUCTION_CHANGE = NONE
```
