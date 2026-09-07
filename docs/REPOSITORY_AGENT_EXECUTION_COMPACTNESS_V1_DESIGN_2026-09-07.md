# Repository Agent Execution Compactness v1

Status: DESIGN
Tracking: #1752
Date: 2026-09-07

## 1. Goal

Define a repository-wide development contract that keeps agent tool execution naturally compact when the same work can be performed through repository-native files, tests, scripts, CI, or MCP surfaces.

The primary user-facing problem is giant visible shell payloads such as one `bash -lc` invocation that creates several temporary Python modules with heredocs and then compiles/tests them. ChatGPT may surface the tool invocation in its activity UI, which can turn correct work into a large code wall.

This design does not attempt to hide, suppress, or alter product UI. It reduces the payload placed into that UI.

## 2. Design principle

Use the shortest execution surface that preserves the strongest practical validation.

```text
existing repo-native command
→ existing repo-native harness/script/test
→ small one-off inline command
→ materialized file(s) + short execution command
→ bounded inline exception only when materially better justified
```

Compactness is subordinate to correctness, safety, evidence fidelity, and owning project contracts.

## 3. Authority and policy placement

This work is repository-wide development behavior, not project truth or release authority.

Proposed implementation placement:

1. `docs/REPOSITORY_COMMON_RULES.md`
   - add one repository-wide `DEFAULT` rule, provisionally `RCR-D14 — Prefer compact agent execution surfaces`.
2. `.agents/skills/agent-execution-compactness/SKILL.md`
   - operational decision procedure and examples.
3. `.agents/skills/agent-execution-compactness/evals/` and tests
   - validate routing decisions and boundary cases.
4. existing Agent Skills CI
   - consume the skill's tests/evals without creating a new privileged workflow.

The common rule owns the policy. The skill operationalizes it. CI validates the skill contract. None becomes a source of mutable production truth.

## 4. Relationship to existing common rules

This design specializes existing repository defaults rather than replacing them:

- `RCR-D02`: one primary goal per bounded work unit.
- `RCR-D05`: prefer safe repository automation over unnecessary manual work.
- `RCR-D09`: creation is incomplete without the strongest practical feedback loop.
- `RCR-D10`: prefer small composable workflow modules.
- `RCR-D11`: choose the narrowest capable semantic owner/effect surface.

It also preserves hard invariants including current-authority reads, evidence fidelity, secret safety, gate preservation, and fail-closed behavior.

## 5. Definitions

### 5.1 Execution payload

The command/script text sent directly to an execution tool and therefore potentially exposed in a tool-activity surface.

Examples:

- a shell command string;
- a `bash -lc` body;
- an inline Python program passed through stdin;
- heredoc bodies embedded in a shell invocation.

### 5.2 Repo-native harness

A committed or already-materialized repository file intended to perform validation or execution, such as:

- `python -m unittest ...` target;
- `pytest` target;
- repository script;
- package CLI;
- checked-in eval harness;
- CI workflow already owning the long validation;
- MCP surface returning bounded validation state.

### 5.3 Inline generated program

Source/test/program text constructed inside the execution payload rather than through a repository/file-edit surface.

Typical forms:

```text
cat > /tmp/x.py <<'PY'
...
PY
```

or multiple such blocks in one shell invocation.

### 5.4 Materialized execution

Create or update the required source/test/fixture through an appropriate file-edit surface, then execute it using a short command.

The file may be temporary or committed depending on authority, durability, and task requirements.

## 6. v1 compactness guardrail

The following is a routing guardrail, not a correctness limit.

An inline generated program should normally be avoided when **any** of these are true:

- execution payload exceeds roughly **20 logical lines**;
- execution payload exceeds roughly **2 KiB** of source/program text;
- one invocation creates **more than one source/test/program file**;
- the invocation mixes file generation, compilation, multiple test suites, and result interpretation into one large command;
- equivalent repo-native test/script/CI/MCP coverage already exists.

Crossing a guardrail means: choose a better execution surface, not skip validation.

The numbers are intentionally conservative v1 defaults and may be tuned from eval evidence. They are not security boundaries.

## 7. Required decision ladder

Before constructing a non-trivial execution payload, use this order.

### Level 1 — Existing command

Prefer a short existing command when it already performs the needed work.

Examples:

```bash
python -m unittest discover -s tools/simcore-mcp/tests
```

```bash
python -m pytest tools/repo-ci-mcp/tests -q
```

### Level 2 — Existing harness

If one short command is insufficient, prefer an existing repository script, test harness, skill helper, package CLI, CI workflow, or MCP tool.

Do not reconstruct the harness inline merely to keep all logic in one tool call.

### Level 3 — Small one-off inline command

A small inline snippet is acceptable when all of the following hold:

- it is genuinely one-off;
- it is easy to inspect;
- it stays below the compactness guardrail;
- it does not duplicate a durable repository harness;
- it does not contain secrets or sensitive payloads;
- it does not materially weaken the feedback loop.

Examples include a small import check, a tiny JSON assertion, or a short environment-state probe.

### Level 4 — Materialize then execute

When the inline payload would exceed the guardrail, materialize the source/test/fixture through the appropriate file surface and then run a short command.

Preferred shape:

```text
write/edit file
→ run short compile/test command
→ inspect bounded result
```

Avoid:

```text
one giant shell call
→ create file A
→ create file B
→ create file C
→ compile all
→ run tests
→ parse output
```

### Level 5 — Bounded exception

A larger inline program is allowed only when materialization is materially worse for correctness, safety, or evidence and no suitable repository-native surface exists.

The agent should be able to state a short reason such as:

- real-device-only scratch probe;
- external environment where repository file editing is unavailable;
- disposable reproducer whose persistence would create misleading durable state.

Even under exception, prefer one program/file and one primary execution goal.

## 8. Explicit anti-patterns

The skill should route away from these by default:

### A. Multi-heredoc source construction

```text
bash -lc
  cat > a.py <<'PY' ...
  cat > b.py <<'PY' ...
  cat > c.py <<'PY' ...
  python ...
```

### B. Re-embedding files that already exist

Do not paste full current repository files into shell merely to test a local variant when the file/edit tooling can create the variant directly.

### C. Build-script-in-a-command

Do not turn an execution tool call into a temporary build system containing source creation, patching, compilation, test orchestration, and report formatting when repository-native owners already exist.

### D. Validation compression by deletion

Never make the command shorter by removing meaningful tests, assertions, authority checks, or required evidence.

Compactness changes *where validation logic lives*, not *how much required validation happens*.

## 9. Preferred architecture for long validation

When validation is durable or reusable, the preferred direction is:

```text
agent edit
→ repository-native tests/scripts
→ CI executes long work
→ compact CI summary
→ MCP/ChatGPT consumes bounded result
→ targeted drill-down only when required
```

This design intentionally composes with Repository CI Compact Summary v1 and `repo_ci_summary()` rather than inventing another result authority.

## 10. Skill contract

Proposed skill name:

```text
agent-execution-compactness
```

The skill answers:

> Given the work that must be executed, what is the narrowest execution surface that preserves the required validation while keeping directly visible execution payload bounded?

The skill should return a small routing decision before complex execution:

```text
Execution route: EXISTING_COMMAND | HARNESS | INLINE_SMALL | MATERIALIZE | EXCEPTION
Reason: <one sentence>
Command surface: <short command or file/harness owner>
Validation preserved: <tests/checks retained>
```

This routing artifact is advisory development policy, not source authority.

## 11. Proposed repository common rule

Implementation should add a rule equivalent to:

### RCR-D14 — Prefer compact agent execution surfaces

**Class:** `DEFAULT`

When automated repository work requires local command execution, prefer short commands that invoke existing repository-native scripts, tests, package CLIs, CI, or other durable harnesses. Avoid embedding large generated programs, multiple source/test files, or mini build systems inside one shell/tool invocation when the same validation can be materialized or delegated without weakening evidence.

Small one-off inline snippets remain appropriate when they are bounded and easier to inspect than a durable file. Compactness must never remove required validation, bypass authority/gates, or hide meaningful failure evidence.

The exact guardrail and routing procedure are owned by the agent-execution-compactness skill and may evolve without changing project authority.

## 12. Eval plan

The implementation should add deterministic routing/eval cases covering at least:

1. **Existing unittest command**
   - expected: `EXISTING_COMMAND`.
2. **Existing repository harness available**
   - expected: `HARNESS`.
3. **Five-line import smoke**
   - expected: `INLINE_SMALL`.
4. **One 40-line temporary Python test module**
   - expected: `MATERIALIZE`.
5. **Three heredoc-created modules in one bash call**
   - expected: `MATERIALIZE`.
6. **Large command that deletes tests to become shorter**
   - expected: reject as validation weakening.
7. **Real-device-only scratch probe, no file-write surface**
   - expected: bounded `EXCEPTION` with explicit reason.
8. **Long validation already represented by CI + compact summary**
   - expected: `HARNESS` / CI-MCP route rather than local reconstruction.
9. **Secret-bearing inline payload**
   - expected: reject; secret safety takes precedence.
10. **Multiple independent goals bundled into one shell call**
    - expected: split into bounded work units.

## 13. Verification strategy

Implementation acceptance should require:

- skill/unit tests green;
- live eval harness green;
- existing Agent Skills orchestrator contracts green;
- Agent Skills CI PR-head + merged-main green;
- SimCore CI PR-head + merged-main green as repository cross-impact evidence;
- no product/runtime/release files changed unless a later independent packet explicitly requires them;
- production identity unchanged.

A useful qualitative before/after evidence sample is acceptable, but product UI screenshots are not CI authority.

## 14. Rollout phases

### Phase 1 — Policy + skill pilot

Add:

- `RCR-D14` default;
- `agent-execution-compactness` skill;
- deterministic unit/eval coverage.

Do not add privileged hooks or shell interception.

### Phase 2 — Agent Skills CI enforcement

Make the skill's contract part of existing Agent Skills CI. Validate guidance/eval behavior, not arbitrary historical conversations.

### Phase 3 — Observe real usage

Collect bounded examples from actual repository work:

- giant multi-heredoc avoided;
- repo-native test command used;
- CI/MCP used for reusable long validation;
- legitimate exception cases.

Do not store raw private conversation/tool payloads merely for telemetry.

### Phase 4 — Optional stronger linting only if justified

If repeated evidence shows policy+skill is insufficient, consider a deterministic command-plan linter or executor wrapper.

Do not add an interception framework in v1 without evidence. A linter must remain a policy check and must not become a privileged execution authority.

## 15. Non-goals

This project does not:

- hide ChatGPT tool activity;
- modify ChatGPT mobile/web UI;
- promise that every client renders tools identically;
- ban all heredocs or inline Python;
- shorten commands by weakening tests;
- move project authority into agent tooling;
- replace GitHub CI, release, or production contracts;
- create a repository-wide shell executor;
- record raw private user conversations for enforcement.

## 16. Success criteria

v1 is successful when:

- the common policy clearly prefers compact execution without weakening evidence;
- the agent skill routes giant multi-heredoc construction to materialized/repo-native execution;
- small legitimate inline snippets remain allowed;
- evals cover both positive and exception cases;
- existing Agent Skills CI validates the contract;
- representative repository work can perform the same or stronger validation with materially smaller direct execution payloads;
- no production or release authority changes.

## 17. Recommended first implementation packet

One bounded PR after design merge:

1. add `RCR-D14` to `docs/REPOSITORY_COMMON_RULES.md`;
2. add `.agents/skills/agent-execution-compactness/SKILL.md`;
3. add deterministic skill tests/evals only;
4. make no product/runtime/release changes;
5. use existing Agent Skills CI as the validation lane.

A helper script should be added only if the skill/eval implementation proves it is necessary. Do not pre-emptively build an execution framework.

## 18. Read/result payload companion extension (#1849)

Repository-visible compactness has a third axis beyond inline execution-program size and repository-owned call fan-out:

```text
repository_owned_visible_read_payload
= repository source/result text selected for one semantic read question
```

The motivating case is a single repository/tool read that returns a very large source or result body even though only one local section is needed. Reducing call count alone does not solve that display-height problem.

The companion rule is:

```text
locate narrowly
→ read the smallest authoritative excerpt/projection that can answer the question
→ preserve source identity + UNKNOWN/conflict/failure context
→ expand only when completeness actually requires it
```

### 18.1 Selection order

For repository source/result reads, use this order when the available tool supports it:

1. if the owning location is unknown, use search/index/symbol/snippet discovery before avoidable whole-file retrieval;
2. if the file/path is known and the question is local, use a bounded line/range read or equivalent targeted excerpt;
3. if an established bounded CI/status projection already preserves source identities and uncertainty, use it for first pass and reserve raw logs/full bodies for targeted drill-down;
4. reuse an already captured bounded result/resource when sufficient instead of re-fetching or re-echoing the full source;
5. expand to a whole-file/full-body read when completeness, document structure, ordering, cross-section consistency, or another global property is genuinely part of the question.

This is a selection preference, not a universal byte/line ceiling. A short read that omits required evidence is worse than a longer correct read.

### 18.2 Required context that compactness may not remove

A bounded read must retain every fact needed for the claim, including when applicable:

- authoritative source locator/identity;
- currentness or freshness barriers;
- disagreement between authoritative sources;
- `UNKNOWN`, `CONFLICT`, partial, or failure state;
- failure provenance;
- security, permission, or trust context;
- cross-section relationships that the question actually requires.

A bounded excerpt or projection remains derived evidence. It does not become a new mutable truth owner.

### 18.3 Full-read exceptions are first-class

Whole-source retrieval is explicitly valid when the semantic question requires:

- global completeness;
- ordering across the document;
- cross-section consistency;
- whole-file schema/structure;
- proof of absence that cannot be established from a bounded index;
- or a source small enough that narrowing would add complexity without material compactness benefit.

The policy must not pressure agents into false confidence from a short excerpt.

### 18.4 Evaluation extension

The compactness fixture gains a separate `read_payload_evals` family so existing execution-route eval identities remain stable while the new companion behavior is machine-checked.

Required cases cover:

- known large source + local question -> `TARGETED_RANGE`;
- unknown location -> `SEARCH_SNIPPET`;
- existing bounded CI/status projection -> `BOUNDED_PROJECTION`;
- whole-document ordering/cross-section question -> `FULL_SOURCE_ALLOWED`.

Agent Skills CI should mechanically verify the guidance and fixture contract. SimCore CI remains repository cross-impact evidence. No new workflow, MCP authority, connector capability, writer, product/runtime/release surface, or host-UI guarantee is introduced.

### 18.5 Host UI boundary

This extension only reduces repository-owned source/result text selected by the agent or repository tool when evidence-equivalent narrowing exists. It does not control whether ChatGPT or another client collapses, expands, groups, or otherwise renders a tool card.

## 19. Connector-response selection companion extension (#1851)

Repository-visible compactness has a fourth agent-controlled concern beyond execution-program size, repository-owned call fan-out, and source-range/read selection:

```text
repository_owned_connector_response_surface
= connector action, projection, filtered endpoint, query, or broad fetch
  selected before retrieval for one semantic repository question
```

The motivating case is a single GitHub connector call that returns a very large nested JSON/full-object payload even though only a few fields are needed. The user supplied mobile screenshots from real canonical-main work showing this behavior, and generic `fetch` calls during #1851 authority inspection reproduced the same broad metadata/structured-content shape.

This extension targets **selection before retrieval**. It does not change the ChatGPT/GitHub connector implementation or response schema.

### 19.1 Selection order

When authority and evidence remain equivalent, prefer:

1. an existing bounded repository projection or harness that already owns the semantic result;
2. an action-specific connector operation that returns the needed object class, such as PR metadata, changed filenames, workflow job summaries, issue metadata, or commit status;
3. a server-side filtered/query-scoped endpoint using exact SHA/ref, check/job name, status context, file path, issue/PR number, or an equivalent selector;
4. the targeted source-read contract when source text itself is actually required;
5. broad generic fetch/full JSON only when completeness is required or no narrower available surface preserves the required authority/evidence;
6. reuse of already captured sufficient evidence inside one unchanged currentness barrier instead of repeating the same broad response.

This is a routing preference among connector/result surfaces, not a universal byte limit. A narrow result that omits required authority is worse than a broad correct result.

### 19.2 Required evidence that narrowing may not remove

Connector-result compactness must preserve when applicable:

- repository/ref/SHA and owning source identity;
- required freshness/currentness or post-mutation barriers;
- disagreement between authoritative sources;
- `UNKNOWN`, `CONFLICT`, partial, cancelled, skipped, or failure state;
- failure provenance;
- security, permission, branch-protection, and trust context;
- completeness, ordering, absence, or cross-object relationships required by the question.

Action-specific and filtered connector accesses remain derived read surfaces. They do not become mutable truth owners.

### 19.3 Broad-fetch exceptions and currentness reuse

Broad/full-object retrieval is explicitly valid when:

- the semantic question itself is completeness-sensitive;
- no available action-specific/filter/projection preserves the required authority;
- a direct canonical authority read has no compact equivalent;
- or the full object is required to retain failure/security/provenance context.

When a broad direct authority read is necessary, perform it only as often as the currentness contract requires. Capture the exact authority fact and reuse it within that barrier. A mutation, settling boundary, stale evidence, or explicit fresh-read requirement invalidates reuse and requires a new authority read.

### 19.4 Evaluation extension

The compactness fixture gains a separate `connector_response_evals` family. It does not change the existing ten execution-route eval identities or the `read_payload_evals` family.

Required companion selections are:

- action-specific metadata available -> `ACTION_SPECIFIC`;
- exact server-side filter available -> `FILTERED_ENDPOINT`;
- source text required -> `TARGETED_READ`;
- sufficient evidence already captured in the same currentness barrier -> `REUSE_CAPTURED`;
- required direct authority read with no compact equivalent -> `BROAD_FETCH_ALLOWED`.

These labels are companion selection outcomes only. They are not sixth execution routes and cannot appear as values of `Execution route:`.

### 19.5 Measurement and host boundary

Success for this extension means repository-side selection avoids broad connector responses when an evidence-equivalent narrower surface is available. Exact ChatGPT tool-card height, grouping, hidden reasoning display, cached/input/output token accounting, or Work credit reduction are outside repository control and require separate measurement if claimed.

No connector schema/implementation, Repository Read MCP, workflow permission, product/runtime/release/production authority, native protection, or host UI behavior changes are introduced by #1851.
