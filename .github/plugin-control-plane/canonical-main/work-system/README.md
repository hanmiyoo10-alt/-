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
6. bounded write scope;
7. dependencies and blockers;
8. expected outputs;
9. validation and acceptance criteria;
10. stop condition;
11. handoff summary and evidence.

Packet lifecycle:

`READY → CLAIMED → IN_PROGRESS → REVIEW → DONE`

Alternate states: `BLOCKED / CANCELLED / SUPERSEDED`.

## Parallelism

Different packets may proceed in parallel only when their authority and write scopes do not conflict.

The same packet has one active implementation owner at a time. If real parallelism is useful, split the work into explicit sub-packets with disjoint outputs.

If a task grows beyond its primary goal, do not silently widen it. Create a new packet and connect the dependency.

Blocked work does not block unrelated packets.

This is the operational analogue of canonical-main's module split rule: oversized or mixed-responsibility code is split into modules; oversized or mixed-goal work is split into packets.

## Worker / chat bootstrap

Before acting on a packet, a worker or chat must:

1. inspect current `main`;
2. read `docs/REPOSITORY_COMMON_RULES.md` as the repository-wide shared policy layer;
3. read the packet issue;
4. read every authority input named by the packet, including the owning project/domain contract;
5. confirm the packet is not already actively owned by another implementation flow;
6. confirm write scope and dependencies are still valid.

The common-rules document supplies shared policy, not mutable project truth. Owning repository/project authority still decides current production, release, runtime, deployment, and validation facts. Project/domain contracts may explicitly specialize repository `DEFAULT` and applicable `CONDITIONAL` behavior, but must not silently weaken a repository `HARD_INVARIANT`.

Conversation memory is context only, never sufficient authority.

## Handoff

A worker ending a packet session records a concise handoff on the packet issue:

- state reached;
- verified evidence;
- files/issues/PRs changed;
- unresolved UNKNOWNs;
- blockers/dependencies;
- exact next action.

The next worker resumes from repository evidence, not from an assumed chat transcript.

## Authority boundary

The work system coordinates work; it does not authorize production or release changes. Existing exact-head CI, main-write, protection, release, and project-specific authorities remain unchanged.
