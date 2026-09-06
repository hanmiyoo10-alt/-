# Repository Agent Visible Fan-out v1 Design

Date: 2026-09-07
Packet: #1766 `CHAT-VISIBLE-FANOUT-V1`

## Purpose

The repository already has a compact execution contract that reduces the amount of source/program text directly supplied to agent execution surfaces. That solves payload size, but it does not separately describe how many repository/tool invocations one semantic work unit should expose.

This design adds a companion metric and routing preference for **repository-owned visible fan-out**.

It does not claim control over ChatGPT product UI rendering, card grouping, hidden reasoning, or host-side activity presentation.

## Metric

```text
repository_owned_visible_fanout
= repository/tool invocations selected by the repository-side route
  for one semantic work unit
```

This is a repository-side proxy. The ChatGPT host may render tool activity differently, so the repository must not claim an exact host-card count.

## Semantic work unit

A semantic work unit is one bounded user or packet goal whose required authority, evidence, and completion condition can be stated together.

Examples:

- routine canonical-main status orientation;
- retrieve one CI verdict and its bounded reason;
- run one existing validation harness;
- inspect one current repository authority surface.

Independent goals are not one semantic work unit merely because they can be placed in one tool call.

## Preferred consolidation

When one existing repository-native composition, harness, MCP tool, script, or CI summary surface preserves the same required authority and evidence as several visible repository reads, prefer the composed surface.

Preferred shape:

```text
one semantic question
→ one existing composition/harness call
→ bounded result
→ targeted drill-down only if required
```

Example already implemented by #1760/#1761:

```text
routine canonical-main STATUS_SESSION
baseline: direct main + #485 as two visible repository reads
selected: canonical_main_status() as one composed read-only call
internal: bounded direct-main / #485 / coherence-barrier reads
```

The composition result remains derived and must expose its source identities. Internal reads do not manufacture a new truth owner.

## Required separation

Do not reduce fan-out by combining calls that must remain separate for correctness, authority, or evidence.

Preserve separate calls when any of these apply:

- independent semantic goals;
- distinct writes or mutation owners;
- required pre-write and post-write authority/currentness barriers;
- separate authoritative sources whose disagreement must remain visible;
- settling or failure verification that requires a later fresh read;
- targeted drill-down after a bounded summary is insufficient;
- security, permission, or trust boundaries;
- a composition would hide `UNKNOWN`, `CONFLICT`, failure provenance, or source identity.

Fan-out compactness never authorizes fewer validations or weaker evidence.

## Relationship to execution routes

This design does **not** add a sixth execution route.

The existing five routes remain:

1. `EXISTING_COMMAND`
2. `HARNESS`
3. `INLINE_SMALL`
4. `MATERIALIZE`
5. `EXCEPTION`

Visible fan-out is a companion selection criterion. For example, if an existing harness and three manual reads prove the same semantic result, `HARNESS` is preferred when it preserves the same evidence with lower repository-owned visible fan-out.

## Decision procedure

For one semantic work unit:

1. Identify the required authority, validation, and evidence.
2. Identify candidate existing repository-native surfaces.
3. Ask whether one candidate composition/harness preserves the same required evidence and source identities.
4. If yes, prefer the candidate with lower repository-owned visible fan-out.
5. If consolidation would cross an authority, mutation, failure, freshness, or semantic-goal boundary, preserve the required separate calls.
6. Drill down only when the bounded result is insufficient.

Correctness and evidence outrank the metric.

## Optional routing note

When useful, an agent may record:

```text
Visible fan-out: <baseline> → <selected>
Reason: <one sentence>
Evidence preserved: <authority/tests/source identities>
```

Do not emit the note when it would add more noise than the routing decision itself.

## Acceptance examples

### Consolidate

A read-only MCP composition returns the same direct authority identities and coherence disposition as two manual reads.

Expected: prefer one composed call.

### Preserve separation

A write operation requires a current precondition read, a write, and a later fresh verification read.

Expected: keep the required phases separate. Do not wrap them into one opaque call solely to reduce visible activity.

### Preserve drill-down

A compact CI summary reports an unknown infrastructure failure and names the exact job/log source.

Expected: read the summary first, then perform targeted detail retrieval because the first result is insufficient.

## Non-goals

- hiding or suppressing ChatGPT tool activity;
- intercepting the ChatGPT UI;
- manufacturing one giant opaque tool call;
- combining independent work merely to reduce an activity count;
- replacing project authority, Git/CI/release gates, or existing mutation ownership;
- treating low fan-out as proof of correctness.

## Completion principle

A lower fan-out route is better only when the same required authority, uncertainty, validation, and evidence remain inspectable. Compactness is successful when routine work becomes quieter without making the repository less truthful.