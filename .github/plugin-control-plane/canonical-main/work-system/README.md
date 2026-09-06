# Canonical Main Work System

The work system extends canonical-main's modular architecture from code boundaries to human/ChatGPT work boundaries.

Its purpose is to let multiple chats or workers make progress independently without turning conversation memory into authority or allowing scope to drift.

## Surfaces

- `#293` — raw append-only main-management conversation/audit log.
- `#462` — distilled long-term canonical-main memory.
- `#464` — mutable canonical-main idea inventory.
- `#465` — mutable canonical-main work queue.
- per-packet issues — bounded executable work units using `<!-- canonical-main-work-packet:v1 -->`.
- `#440` — normalized documentation event stream and durable-document promotion source.

Repository, Git, CI, release, and project authorities remain above all of these coordination surfaces.

## Work queue live-health contract

`#465` is coordination only. Its normal human-facing body MUST use pointer-only live-health semantics:

- `LIVE HEALTH: direct main + #485` is the only current-health pointer;
- the queue may show active packet, next candidate, coordination blocker, latest completed packet, and stable links to durable surfaces;
- it MUST NOT duplicate a current `main` SHA, Required state/run, production identity state, or native-protection state as live truth;
- when an exact SHA is required as packet evidence, it may appear only as explicitly historical synchronization/packet evidence and must never be presented as current health;
- if a reader needs current health, read direct current `main` and #485 rather than refreshing #465 merely to copy time-sensitive evidence.

This prevents a stale coordination queue from competing with the direct repository authority and the #485 derived operator projection.

## Live issue markers

- Idea inventory: `<!-- canonical-main-idea-inventory:v1 -->`
- Work queue: `<!-- canonical-main-work-queue:v1 -->`
- Work packet: `<!-- canonical-main-work-packet:v1 -->`

## Flow

```text
conversation / repository evidence
→ #293 raw audit
→ #462 distilled memory
→ #464 idea inventory
→ #465 packet queue
→ bounded packet issue
→ implementation / validation / PR
→ proven result
→ #462 memory update + #440 durable-doc event
```

No canonical-main idea should depend on chat-only state after capture.

## Idea rule

Ideas are classified first by system impact:

- `NO_SYSTEM_UPDATE`
- `SYSTEM_UPDATE_REQUIRED`

Then by:

- Importance: `최상 / 높음 / 중간 / 낮음`
- Difficulty: `낮음 / 중간 / 높음 / 매우 높음`
- Size: `작음 / 중간 / 큼 / 매우 큼`

Default ordering is higher importance, then lower difficulty, then smaller size. Uncertain system impact defaults to `SYSTEM_UPDATE_REQUIRED`.

Idea lifecycle:

`CAPTURED → DESIGNING → DESIGN_READY → PACKETIZED → IMPLEMENTED`

Alternate states: `HOLD / SUPERSEDED`.

## Work packet rule

A work packet is the smallest independently executable canonical-main work unit. Every packet declares:

1. stable packet ID;
2. one primary goal;
3. source idea or decision;
4. classification;
5. exact authority inputs to read first;
6. execution compactness plan;
7. bounded write scope;
8. dependencies and blockers;
9. expected outputs;
10. validation and acceptance criteria;
11. stop condition;
12. handoff summary and evidence.

Packet lifecycle:

`READY → CLAIMED → IN_PROGRESS → REVIEW → DONE`

Alternate states: `BLOCKED / CANCELLED / SUPERSEDED`.

## Execution compactness contract

Canonical-main packets make the existing repository-wide compact execution policy explicit at the packet boundary. This does not create a new compactness owner. `RCR-D14` remains the repository default and `.agents/skills/agent-execution-compactness/SKILL.md` owns the routing procedure and guardrail semantics.

Before constructing a non-trivial shell, heredoc, inline Python, temporary source/test, or similar local execution payload, the packet must select one existing route:

- `EXISTING_COMMAND`
- `HARNESS`
- `INLINE_SMALL`
- `MATERIALIZE`
- `EXCEPTION`

Prefer an existing repository-native command, harness, MCP surface, or CI lane when it preserves the required evidence. Otherwise, materialize larger source/test content through an appropriate file-edit surface and invoke it with a short command.

The existing `INLINE_SMALL` routing defaults remain approximately:

- at most 20 logical execution/program lines;
- at most 2 KiB of directly supplied source/program text;
- at most one generated source/test/program file.

Crossing any normal guardrail routes to `MATERIALIZE` unless an evidence-equivalent `HARNESS` is available or a bounded `EXCEPTION` has a concrete reason. Quoting, escaping, shell indirection, or heredoc wrapping does not turn a large directly supplied program into `INLINE_SMALL`. When size or file-count accounting is materially uncertain, prefer the safer larger-content route rather than guessing small.

The packet records its selected route, command/file surface, required validation preserved, guardrail accounting, and any exception reason before non-trivial execution. `EXCEPTION` without an explicit reason is invalid.

Compactness never removes required tests, authority reads, freshness barriers, uncertainty, failure provenance, or project-owned Git/CI/release/security/production gates. The repository can reduce repository-owned execution payloads and fan-out, but it does not claim it can hide, merge, or suppress ChatGPT host UI/activity cards.

## Proof / closure taxonomy

Packet lifecycle and proof/evidence disposition are separate axes. A packet can be `IN_PROGRESS` while some behavior is already `CONTRACT_PROVEN`, or can be `DONE` while explicitly non-blocking rare evidence remains `OBSERVATIONAL_PENDING`. Do not collapse these into one generic `PROVEN` label.

Use this common vocabulary across packet, design, memory, and audit projections:

- `IMPLEMENTED` — the declared implementation artifact/change exists at the relevant reviewed repository identity. This does not by itself prove behavior.
- `CONTRACT_PROVEN` — deterministic static/contract/CI evidence proves the declared contract within that evidence scope. This must not be promoted to `LIVE_PROVEN` by inference.
- `LIVE_PROVEN` — the declared behavior was observed on the real repository/runtime authority path named by the packet acceptance.
- `OBSERVATIONAL_PENDING` — naturally rare live evidence has not yet occurred. This is legal only when the packet acceptance explicitly declares that observation non-blocking.
- `BLOCKED_CAPABILITY` — a required external/platform capability is known unavailable. This preserves the blocker as evidence rather than converting it to green-by-absence.
- `DONE` — every acceptance item declared required by the packet is satisfied at its required proof level and there is no unresolved required `UNKNOWN` evidence.

Closure rules are fail closed:

1. `IMPLEMENTED` does not imply `CONTRACT_PROVEN` or `LIVE_PROVEN`.
2. `CONTRACT_PROVEN` does not imply `LIVE_PROVEN`.
3. A packet MUST NOT become `DONE` while any declared required acceptance item is unsatisfied or its required evidence is `UNKNOWN`.
4. `OBSERVATIONAL_PENDING` may coexist with `DONE` only when the packet acceptance explicitly labels that observation non-blocking.
5. `BLOCKED_CAPABILITY` may coexist with `DONE` only when the affected capability/evidence is explicitly non-blocking for that packet's acceptance; otherwise the packet remains blocked/not done.
6. Safety-critical live proof remains blocking whenever the activated packet declared it required.
7. Applying this taxonomy never retroactively weakens an already-activated packet's acceptance contract. In particular, v1.1 `V11-V1` keeps its original natural-live-observation requirement until that original acceptance is satisfied or explicitly redesigned through a separate reviewed decision.

The taxonomy is coordination/proof language only. The underlying Git, CI, release, production, branch-protection, incident, and project authorities still decide whether the cited evidence is true.

## Parallelism

Different packets may proceed in parallel only when their authority and write scopes do not conflict.

The same packet has one active implementation owner at a time. If real parallelism is useful, split the work into explicit sub-packets with disjoint outputs.

If a task grows beyond its primary goal, do not silently widen it. Create a new packet and connect the dependency.

Blocked work does not block unrelated packets.

This is the operational analogue of canonical-main's module split rule: oversized or mixed-responsibility code is split into modules; oversized or mixed-goal work is split into packets.

## Normal canonical-main startup

Routine read-only canonical-main orientation uses exactly two required reads:

1. read direct current `main` authority and capture the exact SHA;
2. read `#485` and its Canonical Operator Capsule.

The second read is a derived projection, not a replacement authority. If direct current `main` does not match the `MAIN` SHA rendered by `#485`, treat the view as settling or stale and refresh/wait for current evidence; never infer green state from the older capsule.

Deeper coordination surfaces are conditional rather than routine startup reads:

- read `#465` only when work execution, activation, ownership, or coordination is requested or already active;
- read `#462` only when distilled memory or historical operating context is needed;
- read `#464` only when idea/design identity, lifecycle, overlap, or priority is needed;
- read `#293` only when raw audit or conversation provenance is needed.

The repository shared interaction contract at `.github/plugin-control-plane/canonical-main/shared-interaction-contract.md` governs canonical-main/repository-scope interaction and pacing. It does not add a third authority read to this routine two-read orientation path; repository work follows the packet bootstrap below, which reads the contract explicitly.

This fast path ends as soon as repository work is requested. Execution still follows the packet bootstrap below, including repository common rules, the shared interaction contract, the packet itself, and every packet-named project/domain authority. The two-read protocol never authorizes a write, merge, release, protection change, or project/runtime action.

## Intent-aware read routing

The machine-readable routing contract lives in `work-system/policy.json` under `readRouting`. It is a deterministic read plan, not a new truth owner.

Every route starts with the same ordered base reads: `direct-main`, then `issue-485`.

- `STATUS_SESSION` adds nothing. Its exact route is only `direct-main + issue-485`, and when no additional intent exists the reader stops after those two reads.
- `EXECUTION` adds only `issue-465 + active-packet`, then escalates to the existing worker/packet bootstrap before any mutation.
- `MEMORY_CONTEXT` adds only `issue-462`.
- `IDEA_DESIGN_CONTEXT` adds only `issue-464` when idea/design identity, lifecycle, overlap, or priority is actually needed.
- `AUDIT_CONTEXT` adds only `issue-293`.
- `DESIGN_AUTHORITY_CONTEXT` adds only the relevant design authority named by the question or active packet; it does not imply a scan of all durable surfaces.

When more than one intent is genuinely present, combine the base reads with only the additions for those intents using a stable union. Never add unrelated durable surfaces “just in case.” Routine orientation MUST NOT scan `#462`, `#464`, and `#293` by default.

If direct current `main` and #485 disagree, the routing disposition is `SETTLING_OR_STALE`; missing agreement never becomes green-by-absence. A read plan never grants write, merge, release, production, or protection authority.

For a pure `STATUS_SESSION`, unchanged evidence is a read-only no-op: do not rewrite #465 or durable surfaces merely to refresh timestamps. Repository execution still follows the full packet bootstrap and all packet-named authorities.

## Worker / chat bootstrap

Before acting on a packet, a worker or chat must:

1. inspect current `main`;
2. read `docs/REPOSITORY_COMMON_RULES.md` as the repository-wide shared policy layer;
3. read `.github/plugin-control-plane/canonical-main/shared-interaction-contract.md` as the repository-wide reporting and work-pacing contract;
4. read the packet issue;
5. read every authority input named by the packet, including the owning project/domain contract;
6. before non-trivial shell, heredoc, inline Python, temporary source/test, or similar local execution, read/apply `.agents/skills/agent-execution-compactness/SKILL.md` and confirm the packet's declared execution route still fits the actual payload;
7. confirm the packet is not already actively owned by another implementation flow;
8. confirm write scope and dependencies are still valid.

If actual execution grows beyond the packet's declared compactness route, re-route before constructing the larger payload. In particular, do not continue with `INLINE_SMALL` after the existing guardrails have been crossed merely because the command can be hidden behind quoting or a heredoc.

The common-rules document supplies shared policy, and the shared interaction contract supplies repo-wide interaction/reporting/pacing behavior; neither owns mutable project truth. Owning repository/project authority still decides current production, release, runtime, deployment, and validation facts. Project/domain contracts may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior, but must not silently weaken a repository `HARD_INVARIANT`.

Conversation memory is context only, never sufficient authority.

## Handoff

A worker ending a packet session records a concise handoff on the packet issue:

- state reached;
- proof/closure taxonomy terms reached and their exact evidence scope;
- verified evidence;
- files/issues/PRs changed;
- unresolved required `UNKNOWN`s;
- explicitly non-blocking `OBSERVATIONAL_PENDING` / `BLOCKED_CAPABILITY` evidence, if any;
- blockers/dependencies;
- exact next action.

The next worker resumes from repository evidence, not from an assumed chat transcript.

## Authority boundary

The work system coordinates work; it does not authorize production or release changes. Existing exact-head CI, main-write, protection, release, and project-specific authorities remain unchanged.
