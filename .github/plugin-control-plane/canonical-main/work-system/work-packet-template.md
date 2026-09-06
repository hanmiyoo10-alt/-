# Work Packet — <PACKET_ID>

<!-- canonical-main-work-packet:v1 -->

**State: READY**

## Primary goal

<ONE_PRIMARY_GOAL>

## Source

- Idea / decision: <SOURCE_ID_OR_ISSUE>

## Classification

- System impact: `<NO_SYSTEM_UPDATE|SYSTEM_UPDATE_REQUIRED>`
- Importance: `<최상|높음|중간|낮음>`
- Difficulty: `<낮음|중간|높음|매우 높음>`
- Size: `<작음|중간|큼|매우 큼>`

## Read first

1. current `main`
2. <AUTHORITY_INPUT_1>
3. <AUTHORITY_INPUT_2>

## Execution compactness

Choose the route before constructing non-trivial local execution payloads. Reuse the existing repository compactness contract in `.agents/skills/agent-execution-compactness/SKILL.md`.

- Route: `<EXISTING_COMMAND|HARNESS|INLINE_SMALL|MATERIALIZE|EXCEPTION>`
- Command/file surface: <SHORT_COMMAND_OR_FILE_HARNESS_OWNER>
- Validation preserved: <REQUIRED_TESTS_CHECKS_EVIDENCE>
- Guardrail accounting: logical lines `<N_OR_NA>`; source/program bytes `<N_OR_NA>`; generated source/test/program files `<N_OR_NA>`
- Exception reason: <NONE_OR_EXPLICIT_BOUNDED_REASON>

`INLINE_SMALL` is not a quoting category. If the directly supplied execution/program payload crosses the existing compactness defaults of approximately 20 logical lines, 2 KiB, or one generated source/test/program file, use `MATERIALIZE` or an evidence-equivalent `HARNESS` unless a bounded `EXCEPTION` is explicitly justified. Quoting, escaping, or heredoc wrapping does not reclassify a large payload as small.

`EXCEPTION` always requires a concrete reason. Compactness never removes required validation, authority checks, uncertainty, failure evidence, or project-owned gates.

## Bounded write scope

- <PATH_OR_ISSUE>

## Dependencies / blockers

- <NONE_OR_EXPLICIT_DEPENDENCY>

## Expected outputs

- <OUTPUT>

## Acceptance

1. <ACCEPTANCE_CRITERION>

## Proof / closure

Use only evidence-backed terms from the Work System taxonomy:
`IMPLEMENTED / CONTRACT_PROVEN / LIVE_PROVEN / OBSERVATIONAL_PENDING / BLOCKED_CAPABILITY / DONE`.

- Evidence terms reached: <ADD_ONLY_TERMS_WITH_EXACT_EVIDENCE_SCOPE>
- Required acceptance UNKNOWNs: <NONE_OR_EXPLICIT_REQUIRED_UNKNOWN>
- Explicitly non-blocking pending/capability evidence: <NONE_OR_ITEM_PLUS_ACCEPTANCE_REFERENCE>

`DONE` belongs in the packet lifecycle State only after every declared required acceptance item is satisfied at its required proof level and required UNKNOWN evidence is `NONE`. `OBSERVATIONAL_PENDING` or `BLOCKED_CAPABILITY` may coexist with `DONE` only when the affected evidence was explicitly declared non-blocking by this packet's acceptance. Do not infer `LIVE_PROVEN` from `CONTRACT_PROVEN`.

## Stop condition

<EXACT_STOP_CONDITION>

## Handoff

At session end record:
- state reached
- proof/closure taxonomy terms reached and exact evidence scope
- verified evidence
- files/issues/PRs changed
- unresolved required UNKNOWNs
- explicitly non-blocking OBSERVATIONAL_PENDING / BLOCKED_CAPABILITY evidence, if any
- blockers/dependencies
- exact next action
