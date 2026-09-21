---
name: mcl-execution-handoff
description: >-
  Evaluate the bounded Mobile Coder Lab coordination admission immediately before
  an already-authorized owner effect. Consume current dispatch-plan, preflight,
  overlap, D-013 lease, Git/worktree currentness, and D-014 manifest evidence;
  never execute, repair, route, or grant mutation authority.
---

# Mobile Coder Lab Execution Handoff

Coordination-only admission skill for `products/chatgpt-mobile-coder-lab`.

This skill answers one question only:

> Are the current bounded coordination facts mutually consistent enough to hand
> control to an already-authorized existing owner?

A `HANDOFF_READY` result is **not** execution permission created by this skill.
The source packet/current owner must already authorize the effect, and that owner
must still perform its own required currentness/effect guards.

## Authority read order

Before evaluating admission:
1. read `docs/REPOSITORY_COMMON_RULES.md`;
2. read current Mobile Coder Lab authority and current D-012;
3. consume one current `mcl-dispatch-plan.v1` phase from the plan-only dispatcher;
4. consume only the route-conditioned preflight/owner evidence already required;
5. consume current Work System overlap evidence;
6. consume current D-013 lease evidence from its owner;
7. consume current Git/worktree currentness evidence required by the source packet;
8. consume one valid D-014 `TASK_MANIFEST`;
9. re-read the source packet lifecycle/stage needed to prove that the intended
   mutation class is already authorized there.

Do not replace any of these owners with a locally copied truth table.

## V1 supported phase

V1 admission supports only the already-reviewed ordinary repository-backed
mutable route:

```text
route=S
executor=S | M
repository_effect=mutable
```

`M` is valid here only when the current dispatcher/D-012 phase already selected
the documented ordinary-repository fallback. This skill never switches executor.

For `repository_effect=read_only`, return `NOT_APPLICABLE`; read-only work does
not need an effect admission token.

For current context-specific routes such as `S_TERMUX`, `M`,
`M_PRIVATE_LAB`, `M_VM_LAB`, `S_PRIVATE_LOCAL`, `S_ANDROID_GUI`,
`S_ANDROID_GUI_ADB_READ`, and `S_ANDROID_GUI_ADB_ACTION`, return
`SEPARATE_OWNER_REQUIRED`. Their effect semantics remain with their current
owners.

## Required evidence chain

`HANDOFF_READY` is allowed only when every required evidence class below is
explicit, current for the same phase, and mutually consistent.

### 1. Dispatch plan identity

Require one valid `mcl-dispatch-plan.v1` phase with:
- positive phase index/total;
- `route=S`;
- exact `executor=S|M`;
- `repository_effect=mutable`;
- `overlap_guard=required`;
- `lease_guard=required`;
- no blocked/unknown/separate-authority disposition.

The plan is planning evidence only and grants no effect authority.

### 2. Route-conditioned preflight evidence

Require the current route/preflight owner evidence needed by the source packet.
Any required blocked, missing, malformed, `UNKNOWN`, or `CONFLICT` evidence
prevents handoff.

Do not synthesize an aggregate `healthy`, `ready`, or `safe_to_mutate`
verdict from owner fields.

### 3. Scope overlap

Require current Work System overlap evidence to be exactly `DISJOINT` for the
same normalized phase scopes. `OVERLAP`, `UNKNOWN`, `CONFLICT`, incomplete
discovery, or scope identity disagreement prevents handoff.

### 4. D-013 lease identity

Require one currently active D-013 lease matching all required phase facts:
- source packet ref;
- exact current packet-body SHA-256;
- route and executor;
- normalized scopes;
- repository workspace kind;
- exact branch/worktree identity;
- observed base SHA when required by the phase.

A released, missing, stale, ambiguous, or mismatched lease is not repaired here.

### 5. Git/worktree currentness

Require the source packet's current Git/worktree guard evidence to be satisfied
without required `UNKNOWN` or `CONFLICT`.

This skill does not fetch, switch, reset, sync, stash, clean, create, or delete
a worktree to make currentness pass.

### 6. D-014 manifest identity

Require one valid D-014 `TASK_MANIFEST` for the same semantic phase. At
minimum its:
- packet ref and packet-body digest;
- phase identity/class;
- route/executor;
- normalized scopes;
- workspace identity;
- observed base;
- required D-013 lease ID/evidence;
- bounded expected outputs, acceptance refs, and stop condition

must agree with the other current evidence.

Do not create a second handoff schema for facts already owned by D-014.

### 7. Source packet authority

The source packet must remain nonterminal, current, and already be at a stage
that authorizes the intended repository mutation class. A packet that is
terminal, only design/authority scope, or otherwise not mutation-capable blocks
handoff.

This skill does not advance packet lifecycle merely to make admission succeed.

## Disposition rules

Use the strongest evidence-preserving disposition:

- `HANDOFF_READY`: all required same-phase evidence is current and consistent;
- `NOT_APPLICABLE`: repository phase is read-only and needs no effect admission;
- `SEPARATE_OWNER_REQUIRED`: route/effect class is outside this V1;
- `CONFLICT`: two present evidence sources disagree on identity or semantics;
- `UNKNOWN`: required evidence is absent, malformed, incomplete, or cannot be
  classified safely;
- `BLOCKED`: evidence is valid enough to classify a definite blocking state,
  such as non-DISJOINT overlap, released/missing required active lease, terminal
  packet, or unsatisfied currentness guard.

Never convert `UNKNOWN` or `CONFLICT` into `BLOCKED` merely for a simpler
result, and never convert any non-ready state into `HANDOFF_READY`.

## Receipt contract

Emit exactly one bounded receipt per evaluated phase:

```text
schema=mcl-execution-handoff.v1
status=<HANDOFF_READY|BLOCKED|UNKNOWN|CONFLICT|SEPARATE_OWNER_REQUIRED|NOT_APPLICABLE>
packet_ref=<#N>
phase=<positive-index>/<positive-total>
route=<S|current-route>
executor=<S|M|not_applicable|unknown>
effect_class=<repository_mutation|separate_owner|none|unknown>
manifest_id=<sha256|not_applicable|unknown>
lease_id=<sha256|not_applicable|unknown>
next_owner=<existing_route_owner|none|unknown>
reason_codes=<ordered-fixed-list|none>
mutation_authorized=false
execution_authorized=false
details=withheld
```

`HANDOFF_READY` means only that the reviewed coordination/evidence chain is
coherent enough to return control to the existing source-packet/route owner.
It never means this skill may execute the effect.

The receipt carries no command, argv, shell fragment, free-form task prose,
private device/session/account identifier, credential, token, raw log,
environment dump, GUI hierarchy/content, or secret-bearing payload.

## Identity disagreement rules

Treat present cross-source identity disagreement as `CONFLICT`, including:
- packet ref or packet-body digest disagreement;
- phase disagreement;
- executor disagreement;
- normalized scope disagreement;
- branch/worktree/base disagreement;
- active lease ID disagreement;
- D-014 manifest identity disagreement.

Do not silently pick the newest-looking source.

Missing required evidence without contradictory present evidence remains
`UNKNOWN` unless the owner contract gives a definite bounded blocking state.

## No fallback after selection

Once the current plan names executor `S` or `M`, this skill never swaps to
the other executor because of later status, currentness, lease, or manifest
failure. Return the evidence-backed non-ready disposition instead.

## Effect boundary

This skill must not:
- acquire or release D-013;
- create, rewrite, or persist D-014 manifests/receipts;
- create/check/release a workspace holder;
- run Git fetch/pull/switch/checkout/reset/stash/clean;
- create, remove, or repair a worktree;
- edit source or generated artifacts;
- run shell commands, tests, linters, builds, TaskBridge, RDC, CI, GUI/ADB,
  private-lab, VM-lab, or route-owner effects;
- commit, push, open/merge/close a PR, or mutate an issue;
- dispatch a generic GitHub workflow;
- retry or repair failed owners automatically;
- create a queue, scheduler, daemon, standing worker, or mutable task database;
- grant mutation, execution, merge, release, production, runtime, or security
  authority.

Actual effect execution remains with the already-authorized existing owner.

## Relationship to Work Harness

Repository Work Harness is precedent, not replaced here. Its audited read-only
`invoke.cjs` remains its own execution owner, and generic mutating/workflow
routes remain `HANDOFF_ONLY`. Its authoritative-handoff pattern demonstrates
that a handoff can remain non-authoritative while the called writer rechecks
its own gate.

This MCL skill only specializes current D-012/D-013/D-014 composition and does
not modify Work Harness source, adapter registry, workflow permissions, or
invoke policy.

## Privacy

Only public semantic route/executor labels, bounded hashes/IDs, fixed reason
codes, and public owner locators needed for admission may be emitted.

Never request or expose private commands merely to validate admission. If a
private/context-specific owner cannot provide a reviewed bounded evidence
surface, return `SEPARATE_OWNER_REQUIRED`, `UNKNOWN`, or its owner-defined
blocked state.

## Non-goals

This is not an execution engine, command schema, autonomous dispatcher, task
runner, repository writer, device controller, workflow dispatcher, release
controller, production controller, or second coordination database.

A later separately reviewed packet may evaluate host-orchestrated invocation of
an existing owner after this admission contract is terminally proven.
