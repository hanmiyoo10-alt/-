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
