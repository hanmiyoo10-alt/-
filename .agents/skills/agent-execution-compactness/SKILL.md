---
name: agent-execution-compactness
description: >-
  Route repository command execution to the narrowest compact surface that preserves
  required validation and authority. Use before constructing non-trivial shell,
  heredoc, inline Python, temporary source/test, or local validation payloads. Prefer
  existing commands and harnesses, materialize larger programs before execution, and
  keep safety, evidence, CI, release, and project-owned gates authoritative.
---

# Agent Execution Compactness

Repository-wide execution-routing procedure for development and validation work.

This skill answers one question:

**What is the narrowest execution surface that preserves the required validation while keeping the directly visible execution payload bounded?**

It operationalizes `docs/REPOSITORY_COMMON_RULES.md` and
`docs/REPOSITORY_AGENT_EXECUTION_COMPACTNESS_V1_DESIGN_2026-09-07.md`.
It is development policy, not a source of mutable product, runtime, release, or production truth.

## Hard boundaries

- Correctness, safety, authority, evidence fidelity, and required validation outrank compactness.
- Never shorten an execution payload by deleting meaningful tests, assertions, authority checks, or required evidence.
- Never place secrets, credentials, tokens, private sensitive payloads, or authentication material into inline execution text.
- Do not bypass Git, CI, main-write, release, security, production, or project-specific gates.
- Do not invent a new writer, executor, privileged hook, or interception framework merely to make commands shorter.
- Do not claim this repository can hide or suppress ChatGPT tool-activity UI. Reduce the payload supplied to execution surfaces instead.
- If the work contains multiple independent goals, split it into bounded work units before choosing an execution route.

## Routing order

Apply the following order before constructing a non-trivial execution payload.

### 0. Preserve the work contract

Identify the validation that must survive the routing decision.

Record mentally or explicitly:

```text
required work
→ required authority / safety constraints
→ required tests or evidence
→ candidate execution surface
```

If a proposed compact route weakens the required work, reject that route.

### 1. `EXISTING_COMMAND`

Use a short existing command when it already performs the required work.

Examples:

```bash
python -m unittest discover -s tools/simcore-mcp/tests
```

```bash
python -m pytest tools/repo-ci-mcp/tests -q
```

Do not reconstruct an existing command's logic inline.

### 2. `HARNESS`

Use an existing repository script, checked-in test harness, package CLI, CI workflow,
or MCP validation surface when it already owns the longer reusable work.

Preferred long-validation shape:

```text
agent edit
→ repository-native test/script/CI
→ compact CI summary or bounded result
→ targeted drill-down only when needed
```

Do not paste a committed harness into a shell call merely to run a temporary copy.

### 3. `INLINE_SMALL`

A small inline snippet is acceptable only when all of these hold:

- genuinely one-off;
- easy to inspect;
- no suitable existing command or harness;
- no secret or sensitive payload;
- no validation weakening;
- no independent goals bundled together;
- at most one generated source/test/program file;
- approximately 20 logical execution/program lines or fewer;
- approximately 2 KiB of source/program text or less;
- does not mix source generation, compilation, multiple test suites, and report interpretation into a mini build system.

Examples include a tiny import check, JSON assertion, or bounded environment probe.

### 4. `MATERIALIZE`

Materialize source/test/fixture content through an appropriate file-edit surface and
then execute a short command when any normal compactness guardrail is crossed.

Route to `MATERIALIZE` when any of these are true:

- more than about 20 logical execution/program lines;
- more than about 2 KiB of source/program text;
- more than one source/test/program file is created in one invocation;
- one invocation mixes file generation, compilation, multiple test suites, and result interpretation;
- the intended inline body is effectively a temporary build system.

Preferred shape:

```text
write/edit file
→ run short compile/test command
→ inspect bounded result
```

Default anti-pattern:

```text
one giant bash invocation
→ heredoc file A
→ heredoc file B
→ heredoc file C
→ compile
→ run tests
→ parse/report
```

Crossing a compactness guardrail means choose a better surface. It never means skip validation.

### 5. `EXCEPTION`

Use a larger inline program only when materialization is materially worse for
correctness, safety, or evidence and no suitable repository/file surface exists.

A bounded exception requires a short explicit reason, for example:

- real-device-only scratch probe with no usable file-edit surface;
- external disposable environment where materialization is unavailable;
- persistence would create misleading durable state for a one-shot reproducer.

Even under exception, prefer one program/file and one primary execution goal.

## Guardrail semantics

The v1 numbers are routing defaults, not security boundaries:

```text
logical lines: ~20
source/program text: ~2 KiB
generated source/test/program files: 1
```

Use the strongest triggered guardrail. For example, a 12-line command that creates
three modules is still `MATERIALIZE`.

The line/size limits apply to the directly supplied execution/program payload,
including heredoc program bodies. Wrapper noise does not justify hiding a large
program behind quoting tricks.

## Required safety dispositions

Some inputs must be handled before the five execution routes.

### `REJECT`

Reject the proposed execution form when:

- it exposes secrets or private authentication material;
- it shortens the command by deleting required validation;
- it asks compactness to bypass an authority or safety gate.

After rejection, choose a safe reformulation only if the underlying work remains authorized.

### `SPLIT`

Split the work when one shell/tool call bundles independent goals that should be
separate bounded work units. Route each resulting unit independently.

## Output shape

Before complex execution, use a compact routing note when useful:

```text
Execution route: EXISTING_COMMAND | HARNESS | INLINE_SMALL | MATERIALIZE | EXCEPTION
Reason: <one sentence>
Command surface: <short command or file/harness owner>
Validation preserved: <tests/checks retained>
```

For `REJECT` or `SPLIT`, state that disposition instead of pretending an execution route was selected.

This routing note is advisory development policy. It does not become source authority.

## Representative decisions

| Situation | Decision |
| --- | --- |
| Existing unittest target already covers the work | `EXISTING_COMMAND` |
| Checked-in script/CI/MCP already owns long validation | `HARNESS` |
| Five-line import smoke, no secrets, one goal | `INLINE_SMALL` |
| One 40-line temporary Python module | `MATERIALIZE` |
| Three heredoc-created modules in one shell call | `MATERIALIZE` |
| Command becomes shorter only by deleting tests | `REJECT` |
| Real-device scratch probe with no file-write surface | `EXCEPTION` with reason |
| Secret-bearing inline payload | `REJECT` |
| Multiple independent goals in one shell call | `SPLIT` |

## Completion criterion

The routing decision is complete only when:

- required validation and authority constraints are identified and preserved;
- existing command/harness surfaces were preferred when sufficient;
- inline work stays within the v1 guardrail unless a bounded exception is justified;
- multi-file or mini-build-system payloads route to materialized/repository-native surfaces;
- secret-bearing or validation-weakening forms are rejected;
- independent goals are split;
- no new execution authority was invented.

Then perform the work through the selected owner and use its normal validation/evidence path.
