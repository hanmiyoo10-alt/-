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

This contract applies across repository/project scopes that inherit `docs/REPOSITORY_COMMON_RULES.md`, including work outside canonical-main coordination. Canonical-main packet wiring is one enforcement adapter that makes the repository default explicit at that boundary; it is not the scope owner and does not limit this skill to canonical-main work. Project-specific contracts may specialize this repository `DEFAULT` inside their valid scope, but they must preserve repository hard invariants and required authority/evidence.

This skill answers five related questions:

1. **What is the narrowest execution surface that preserves the required validation while keeping the directly visible execution payload bounded?**
2. **When several repository/tool calls prove one semantic result, can an existing composition or harness preserve the same evidence with lower repository-owned visible fan-out?**
3. **When repository evidence must be read, what is the smallest authoritative excerpt or bounded projection that answers the question without hiding required context?**
4. **Before retrieval, what is the narrowest evidence-equivalent connector/result surface that avoids unnecessary full-object or broad collection payloads?**
5. **When an exact immutable validation/result was already observed, can that same result be cited without rereading bulky output while preserving fresh-state and validation-execution boundaries?**

It operationalizes `docs/REPOSITORY_COMMON_RULES.md`,
`docs/REPOSITORY_AGENT_EXECUTION_COMPACTNESS_V1_DESIGN_2026-09-07.md`, and
`docs/REPOSITORY_AGENT_VISIBLE_FANOUT_V1_DESIGN_2026-09-07.md`.
It is development policy, not a source of mutable product, runtime, release, or production truth.

## Hard boundaries

- Correctness, safety, authority, evidence fidelity, and required validation outrank compactness.
- Never shorten an execution payload by deleting meaningful tests, assertions, authority checks, or required evidence.
- Never reduce visible fan-out by deleting required reads, freshness checks, mutation barriers, or failure verification.
- Never shrink a repository read/result by omitting authority markers, source identity, disagreement, `UNKNOWN`, failure provenance, security context, or required freshness evidence.
- Never choose a smaller connector/result surface when it would omit exact ref/SHA identity, currentness, authority, disagreement, partial/failure state, permission context, or required completeness.
- Never turn exact-result read reuse into permission to skip, satisfy, or requalify a validation execution; current/latest/exact-head/release/live evidence follows its owning fresh-proof contract.
- Never place secrets, credentials, tokens, private sensitive payloads, or authentication material into inline execution text.
- Do not bypass Git, CI, main-write, release, security, production, or project-specific gates.
- Do not invent a new writer, executor, privileged hook, interception framework, proxy truth owner, or opaque mega-call merely to make commands or activity counts smaller.
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

## Exact immutable result read-reuse companion contract

Exact immutable result read reuse is a specialization of the read/result compactness axis. It optimizes **result reading only**. It does not add a sixth execution route and it does not introduce validation-execution reuse.

Use these bounded read dispositions:

```text
READ_REUSE_EXACT_RESULT
READ_REQUIRED
```

`READ_REUSE_EXACT_RESULT` is eligible only when the same already-observed immutable result is identified exactly, the requested claim stays inside that result's original scope, the captured evidence is sufficient for that claim, and no current/latest/newer-state proof is requested.

Preserve bounded provenance equivalent to:

```text
readDisposition: READ_REUSE_EXACT_RESULT
reason: REUSE_EXACT_RESULT
sourceOwner: <existing owner>
sourceLocator: <exact immutable locator>
sourceIdentity: <owner-defined immutable identity>
scopedResult: <already-observed PASS, FAIL, or other exact result>
claimsCurrentState: false
```

The immutable identity may be an exact workflow run ID plus head SHA/check identity, immutable artifact digest, immutable commit-bound report, exact issue/comment evidence object, or another owner-defined immutable locator. Missing or ambiguous identity is never invented. Exact-result reuse is not green-only: the same immutable FAIL result may be reused as that same scoped FAIL claim.

Return `READ_REQUIRED` when any of these apply:

- the caller asks for `current`, `latest`, `now`, exact-current-main, post-mutation, post-merge, post-publish, or another fresh-state claim;
- the prior source is mutable, or exact immutable identity is missing or ambiguous;
- the prior observation is `UNKNOWN`, `CONFLICT`, partial, stale, invalid, or insufficient for the requested claim;
- failure drill-down needs details or provenance that were not captured in the bounded prior evidence;
- an authority, currentness, security, or trust boundary requires a fresh read;
- the requested claim differs from the prior result's original scope.

A1 does not introduce `REUSE_CURRENT`. Exact-result read reuse cannot satisfy or skip tests, lint, build, static checks, local validators, GitHub Required/exact-head CI, release or promotion verifiers, current-production/pre-publish rechecks, post-merge/post-publish convergence, or live/device/external evidence required by an owning contract. If the new request requires one of those executions, preserve that execution unchanged.

## Connector-response selection companion contract

Connector-response selection is a companion compactness axis distinct from execution-program size, call fan-out, and source-range/read selection. It does not add a sixth execution route.

Define:

```text
repository_owned_connector_response_surface
= connector action, projection, filtered endpoint, query, or broad fetch
  selected before retrieval for one semantic repository question
```

The goal is to choose the narrowest evidence-equivalent result surface before a potentially large connector response is materialized.

Preferred shape:

```text
existing bounded repository projection/harness
→ action-specific connector tool
→ server-side filtered/query-scoped endpoint
→ targeted source read when source text is needed
→ broad generic fetch/full JSON only as an evidence-required fallback
→ reuse captured sufficient evidence within the same currentness barrier
```

### Connector-response selection order

1. **Existing bounded repository projection/harness:** prefer it when it already owns the semantic result and exposes the required authority/source identities/uncertainty.
2. **Action-specific connector tool:** prefer an operation such as PR metadata, issue metadata, changed filenames, workflow-job summaries, commit status, or another narrow object class over a broad generic REST/full-object fetch when both answer the same question.
3. **Filtered/query-scoped endpoint:** when a collection or object can be narrowed server-side by exact SHA/ref, check/job name, status context, file path, issue/PR number, or equivalent selector, apply that filter before retrieving the broad result.
4. **Targeted source read:** when source text itself is required, use the read/result payload contract to select the smallest authoritative excerpt or range.
5. **Broad fetch fallback:** broad generic fetch/full JSON remains valid when completeness is part of the question or no available narrower connector surface preserves the required authority/evidence.
6. **Reuse captured evidence:** do not repeat the same broad response inside one unchanged currentness window merely to recover a fact already captured with sufficient provenance.

A smaller connector response is better only when the semantic authority and evidence contract remain equivalent. Action-specific or filtered surfaces are derived access paths, not new truth owners.

### Preserve connector authority and fallback exceptions

Do not narrow connector selection when doing so would hide or weaken any of these:

- exact repository/ref/SHA or owning source identity required by the claim;
- a required currentness/freshness barrier or post-mutation verification;
- disagreement between authoritative sources;
- `UNKNOWN`, `CONFLICT`, partial, cancelled, skipped, or failure state;
- failure provenance needed for diagnosis or verification;
- security, permission, branch-protection, or trust context;
- global completeness, ordering, absence, or cross-object relationships required by the actual question.

Direct canonical authority reads that lack an evidence-equivalent compact connector surface remain allowed. Perform them only as often as the currentness contract requires, then reuse the captured authority evidence within that barrier.

This repository controls agent/repository-side connector selection only. It does not modify the ChatGPT/GitHub connector response schema and cannot guarantee host tool-card height, grouping, or token savings.

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

Before rereading a validation/result, first ask whether the exact immutable result was already observed and the request is only about that same result. Use `READ_REUSE_EXACT_RESULT` only with exact identity, bounded provenance, and `claimsCurrentState: false`; otherwise use `READ_REQUIRED`. This read choice never skips a required validation execution.

Before a broad connector read, ask whether an existing bounded projection, action-specific connector tool, server-side filter, targeted read, or already captured result answers the same semantic question with equivalent authority. Prefer the narrower result surface when it does.

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

Connector-response compactness has no universal byte ceiling either. Prefer an evidence-equivalent narrower result surface, not arbitrary truncation.

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
| Action-specific connector metadata answers the question | use the action-specific result instead of broad generic full-object fetch |
| Exact SHA/check/job filter isolates the required CI result | filter server-side before retrieving the broad collection |
| Sufficient broad authority evidence is already captured inside the same currentness barrier | reuse it instead of repeating the broad fetch |
| Exact immutable run/report already observed; question asks only about that same exact result | `READ_REUSE_EXACT_RESULT`; preserve identity/provenance and `claimsCurrentState: false` |
| Current/latest/newer-state claim, missing identity, incomplete prior evidence, or uncaptured failure detail | `READ_REQUIRED` |
| Caller tries to use old exact-result reuse to satisfy a required new validation execution | preserve the required execution; read reuse grants no execution reuse |
| No compact equivalent exists for a required direct canonical authority read | broad fetch is valid; preserve exact authority and reuse within the barrier |
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
- connector reads preferred an evidence-equivalent bounded projection, action-specific tool, or server-side filter before avoidable broad generic responses;
- captured sufficient connector evidence was reused within the same unchanged currentness barrier;
- exact immutable result rereads used `READ_REUSE_EXACT_RESULT` only with exact source owner/locator/identity, original scoped result, and `claimsCurrentState: false`;
- current/latest/newer-state claims, missing or ambiguous identity, incomplete/unknown evidence, and uncaptured failure detail used `READ_REQUIRED`;
- exact-result read reuse never satisfied, skipped, or requalified a validation execution required by an owning contract;
- broad connector/full-object reads remained available when completeness or lack of an evidence-equivalent compact surface required them;
- full-source reads remained available when completeness, ordering, cross-section consistency, or a genuinely small source required them;
- required separate calls remain separate across mutation, authority, freshness, failure, trust, or semantic-goal boundaries;
- inline work stays within the v1 guardrail unless a bounded exception is justified;
- multi-file or mini-build-system payloads route to materialized/repository-native surfaces;
- secret-bearing or validation-weakening forms are rejected;
- independent goals are split;
- no new execution authority or connector truth owner was invented;
- no claim is made that repository-side fan-out equals exact host UI card count.
- no claim is made that connector selection equals exact host UI card count or token savings.

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