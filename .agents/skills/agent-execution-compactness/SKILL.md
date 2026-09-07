---
name: agent-execution-compactness
description: >-
  Route repository command execution to the narrowest compact surface that preserves
  required validation and authority. Use before constructing non-trivial shell,
  heredoc, inline Python, temporary source/test, or local validation payloads. Prefer
  existing commands and harnesses, materialize larger programs before execution, keep
  repository-owned visible fan-out and avoidable read/result payload height low when
  evidence is preserved, and keep safety, evidence, CI, release, and project-owned gates authoritative.
---

# Agent Execution Compactness

Repository-wide execution-routing procedure for development and validation work.

This skill answers three related questions:

1. **What is the narrowest execution surface that preserves the required validation while keeping the directly visible execution payload bounded?**
2. **When several repository/tool calls prove one semantic result, can an existing composition or harness preserve the same evidence with lower repository-owned visible fan-out?**
3. **When repository evidence must be read, what is the smallest authoritative excerpt or bounded projection that answers the question without hiding required context?**

It operationalizes `docs/REPOSITORY_COMMON_RULES.md`,
`docs/REPOSITORY_AGENT_EXECUTION_COMPACTNESS_V1_DESIGN_2026-09-07.md`, and
`docs/REPOSITORY_AGENT_VISIBLE_FANOUT_V1_DESIGN_2026-09-07.md`.
It is development policy, not a source of mutable product, runtime, release, or production truth.

## Hard boundaries

- Correctness, safety, authority, evidence fidelity, and required validation outrank compactness.
- Never shorten an execution payload by deleting meaningful tests, assertions, authority checks, or required evidence.
- Never reduce visible fan-out by deleting required reads, freshness checks, mutation barriers, or failure verification.
- Never shrink a repository read/result by omitting authority markers, source identity, disagreement, `UNKNOWN`, failure provenance, security context, or required freshness evidence.
- Never place secrets, credentials, tokens, private sensitive payloads, or authentication material into inline execution text.
- Do not bypass Git, CI, main-write, release, security, production, or project-specific gates.
- Do not invent a new writer, executor, privileged hook, interception framework, or opaque mega-call merely to make commands or activity counts smaller.
- Do not claim this repository can hide or suppress ChatGPT tool-activity UI. Reduce repository-owned payload and fan-out instead.
- If the work contains multiple independent goals, split it into bounded work units before choosing an execution route.

## Pre-routing disposition gate

Apply safety dispositions before selecting any of the five execution routes.

Classify request-observable structure before repository-source grounding:

- Facts explicitly stated by the USER TASK about the requested execution shape are input facts, not mutable repository facts.
- If the USER TASK explicitly bundles two or more clearly independent semantic goals into one shell/tool call, `SPLIT` is determinate from the request itself even when repository SOURCE EVIDENCE is empty.
- Do not replace a determinate request-observable `REJECT` or `SPLIT` with generic `UNKNOWN` merely because repository evidence is absent.
- Preserve `UNKNOWN` when the disposition actually depends on missing mutable repository facts or when independence is ambiguous rather than explicit.

- If one request bundles two or more independent semantic goals, emit `Disposition: SPLIT`.
- After `SPLIT`, stop route selection for the combined request. Do not choose `EXISTING_COMMAND`, `HARNESS`, `INLINE_SMALL`, `MATERIALIZE`, or `EXCEPTION` until the goals have been separated into bounded work units.
- Route, size, file-count, and representative examples below apply only after this gate passes for one semantic work unit. They must not override a prior `SPLIT` or `REJECT` disposition.
- Route each resulting bounded work unit independently after the split.

## Visible fan-out companion contract

Visible fan-out is a companion metric. It does not add a sixth execution route.

Define:

```text
repository_owned_visible_fanout
= repository/tool invocations selected by the repository-side route
  for one semantic work unit
```

A **semantic work unit** is one bounded goal whose required authority, evidence, and completion condition can be stated together. Independent goals do not become one work unit merely because a tool could execute them together.

When one existing composition, harness, MCP tool, script, or CI summary preserves the same required authority, source identities, uncertainty, and validation as several visible repository calls, prefer the lower-fan-out surface.

Preferred shape:

```text
one semantic question
→ one existing composition/harness call
→ bounded result
→ targeted drill-down only when needed
```

For example, a routine status question that can be answered by one existing read-only composition should not be reconstructed as several manual repository reads when the composition exposes the same underlying source identities and coherence state.

Internal bounded reads behind an existing composition remain auditable. The composition is still derived and does not become a new truth owner.

### Preserve required separate calls

Do not consolidate merely to improve the metric when separate calls are required by any of these boundaries:

- independent semantic goals;
- distinct writes or mutation owners;
- required pre-write and post-write currentness or authority barriers;
- authoritative sources whose disagreement must remain explicit;
- settling or failure verification that requires a later fresh read;
- targeted drill-down after a bounded summary proves insufficient;
- security, permission, or trust boundaries;
- any path where consolidation would hide `UNKNOWN`, `CONFLICT`, failure provenance, or source identity.

A lower fan-out route is better only when the same required evidence survives. The metric is a repository-side proxy and is not a claim about exact ChatGPT host-card rendering.

## Read/result payload companion contract

Read/result payload height is a companion compactness axis distinct from execution-program size and call fan-out. It does not add a sixth execution route.

Define:

```text
repository_owned_visible_read_payload
= repository source/result text selected for one semantic read question
```

For repository reads, prefer the smallest evidence-equivalent source surface that can answer the question.

Preferred shape:

```text
locate narrowly
→ read the smallest authoritative excerpt/projection that can answer the question
→ preserve source identity + UNKNOWN/conflict/failure context
→ expand only when completeness actually requires it
```

### Source-read selection order

1. **Unknown location:** prefer repository search, index, symbol lookup, or bounded snippet discovery before avoidable whole-file retrieval when discovery quality is equivalent.
2. **Known file + local question:** prefer a bounded line/range read or equivalent targeted excerpt when the available tool supports it.
3. **Existing bounded projection:** prefer established CI/status/summary projections for first-pass questions instead of raw logs or full bodies, then drill down only for attention, failure, ambiguity, or insufficient evidence.
4. **Reuse captured evidence:** do not re-fetch or re-echo a full source when an already captured bounded result/resource is sufficient for the current claim.
5. **Expand only for completeness:** whole-file/full-body reads remain valid when the question genuinely depends on global completeness, document structure, ordering, cross-section consistency, or when the source is already small enough that narrowing provides no material benefit.

A shorter read is better only when it preserves the same authority and evidence needed for the claim. A bounded excerpt does not become a new truth owner merely because it is easier to display.

### Preserve required read context

Do not narrow a read when doing so would hide or weaken any of these:

- the authoritative source locator or owning identity;
- a required currentness/freshness barrier;
- disagreement between authoritative sources;
- `UNKNOWN`, `CONFLICT`, partial, or failure state;
- failure provenance needed to diagnose or verify a result;
- security, permission, or trust context;
- cross-section relationships required by the actual question.

The repository can optimize selected source/result payloads, but it cannot guarantee how ChatGPT or another host renders tool cards or their height.

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

Before manual fan-out, also ask whether one existing composition or harness proves the same semantic result with fewer repository-owned visible calls. Prefer it only when the evidence contract remains equivalent.

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

When an existing harness or composition preserves the same evidence as several manual calls, prefer the harness and reduce repository-owned visible fan-out. Do not use a harness as an excuse to hide required independent phases or source disagreements.

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

Visible fan-out has no universal numeric ceiling because required calls depend on authority, freshness, mutation, and failure boundaries. Optimize relative to an evidence-equivalent candidate, not toward an arbitrary count.

## Required safety dispositions

Some inputs must be handled before the five execution routes.

### `REJECT`

Reject the proposed execution form when:

- it exposes secrets or private authentication material;
- it shortens the command by deleting required validation;
- it asks compactness to bypass an authority or safety gate;
- it lowers visible fan-out only by removing a required authority/freshness/failure check.

After rejection, choose a safe reformulation only if the underlying work remains authorized.

### `SPLIT`

Split the work when one shell/tool call bundles independent goals that should be
separate bounded work units. Route each resulting unit independently.

Do not treat `SPLIT` as a compactness failure. Required semantic separation outranks a lower activity count.

## Representative decisions

| Situation | Decision |
| --- | --- |
| Existing unittest target already covers the work | `EXISTING_COMMAND` |
| Checked-in script/CI/MCP already owns long validation | `HARNESS` |
| Existing read-only composition preserves the same sources as several manual reads | prefer the composition; lower visible fan-out |
| Known large file, local source question, ranged read available | read the targeted authoritative range first |
| Unknown source location | search/index/snippet discovery before avoidable whole-file retrieval |
| Whole-document ordering or cross-section consistency is the question | full-source read is valid; completeness outranks compactness |
| Write requires precondition, mutation, and fresh post-write verification | preserve required separate calls |
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
- an evidence-equivalent existing composition/harness was preferred over avoidable manual visible fan-out;
- repository reads used the smallest evidence-equivalent authoritative excerpt/projection when the question was local;
- full-source reads remained available when completeness, ordering, cross-section consistency, or a genuinely small source required them;
- required separate calls remain separate across mutation, authority, freshness, failure, trust, or semantic-goal boundaries;
- inline work stays within the v1 guardrail unless a bounded exception is justified;
- multi-file or mini-build-system payloads route to materialized/repository-native surfaces;
- secret-bearing or validation-weakening forms are rejected;
- independent goals are split;
- no new execution authority was invented;
- no claim is made that repository-side fan-out equals exact host UI card count.

Then perform the work through the selected owner and use its normal validation/evidence path.

## Output shape

Select exactly one output branch after classification. The branches are mutually exclusive.

### Execution-route branch

Use this branch only when neither `REJECT` nor `SPLIT` applies. The execution-route value must be exactly one of the five registered routes below:

```text
Execution route: EXISTING_COMMAND | HARNESS | INLINE_SMALL | MATERIALIZE | EXCEPTION
Reason: <one sentence>
Command surface: <short command or file/harness owner>
Validation preserved: <tests/checks retained>
```

When fan-out selection is materially relevant, optionally add:

```text
Visible fan-out: <baseline> → <selected>
Evidence preserved: <authority/tests/source identities>
```

Do not emit a fan-out note when the note itself would create more noise than the routing decision.

Never emit both `Disposition:` and `Execution route:` for the same unsplit request.

This routing note is advisory development policy. It does not become source authority.

### Disposition branch

The disposition branch is terminal, not a preface to execution-route selection.

Use this branch whenever `REJECT` or `SPLIT` applies. Emit exactly these two semantic lines and nothing else for the combined request:

```text
Disposition: REJECT | SPLIT
Reason: <one sentence>
```

Do not emit `Execution route:`, `Command surface:`, `Validation preserved:`, `Visible fan-out:`, or `Evidence preserved:` after a disposition. `REJECT` and `SPLIT` are dispositions only. They are never valid values of `Execution route:`.

After the `Reason:` line, stop generating the answer for the combined request. Do not add a third line, additional routing prose, sub-route list, or per-goal route selection.