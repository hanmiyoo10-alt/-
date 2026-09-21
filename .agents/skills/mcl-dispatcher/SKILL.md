---
name: mcl-dispatcher
description: >-
  Produce bounded plan-only Mobile Coder Lab dispatch receipts. Read current
  D-012 routing before choosing a semantic route, then identify the current
  preflight owner and later guards without executing work or creating authority.
---

# Mobile Coder Lab Dispatcher

Plan-only orchestration skill for `products/chatgpt-mobile-coder-lab`.

This skill owns **planning only**. It does not own routing policy, device state,
work reservation, Git state, phase completion, CI, merge, release, runtime, or
production truth.

## Authority read order

Before every route choice:
1. read `docs/REPOSITORY_COMMON_RULES.md`;
2. read current Mobile Coder Lab authority;
3. read current `docs/device-routing.md` as D-012 routing authority;
4. read only the current route-specific owner needed after routing;
5. preserve later Work System, D-013, Git/currentness, CI and D-014 guards.

Do not copy or freeze a second complete D-012 route-precedence matrix here.
Current D-012 always wins over examples, remembered routes, or old eval data.
## Routing discipline

Route one bounded semantic subtask at a time. Semantic requirement is classified
**before** current status or availability is interpreted.

Blocked, offline, dirty, stale, missing, or `UNKNOWN` evidence does not silently
change a context-specific route into another route.

For ordinary device-agnostic repository work, preserve only the fallback D-012
currently documents. A possible M fallback is reported as `M_candidate`; this
skill never switches executor merely because S is unavailable.

Ambiguous semantic requirements remain `UNKNOWN`. Requirements that current
D-012 classifies outside reviewed ownership remain
`UNSUPPORTED_OR_SEPARATE_AUTHORITY`.

Examples may mention current public route names to test composition, but they
are not a local routing table and do not override current D-012.

## Multi-context decomposition

If one goal crosses semantic contexts, split it into ordered phase receipts.
For example, a native S-Termux service change can require:
- repository source phase under the current ordinary repository route;
- native verification/apply phase under the current S-Termux route.

Do not collapse repository mutation and runtime/device effects into one phase.
## Preflight owner selection

After route selection, consume only the current read-only owner named by current
D-012 or its linked contract.

When the selected route is supported by the current `mcl-preflight` contract,
use `preflight_owner=mcl-preflight` and keep `next_gate=preflight`.

Do not assume every future D-012 route is automatically supported by
`mcl-preflight`. Re-read the current preflight contract for the selected route.
Current `S_ANDROID_GUI`, `S_ANDROID_GUI_ADB_READ`, and
`S_ANDROID_GUI_ADB_ACTION` routes are supported there with
`executor=not_applicable`; preflight remains read-only and performs no GUI/ADB
effect or action authorization.

If a future current D-012 route is not supported by current `mcl-preflight`,
use `preflight_owner=route_owner` and follow that current route-specific owner
directly. This generic fallback is not a second frozen route table.

`sm-status` may supplement bounded observations after routing. It never
selects the route and never creates a whole-system readiness verdict.

Malformed, missing, blocked, conflicting, or unavailable owner evidence remains
blocked or `UNKNOWN` according to that owner. Never repair merely to complete
a dispatch plan.

## Repository mutable-work guard plan

A plan for repository mutation must keep this sequence separate:
current D-012 route -> selected preflight owner -> current packet/PR overlap
-> D-013 lease -> Git/worktree/currentness -> separately authorized mutation
-> validation/CI/main-write -> D-013 release -> D-014 receipt when required.
The dispatcher names these guards. It does not satisfy them.

Read-only repository work does not manufacture overlap or lease requirements.
For non-repository runtime/device/lab effects, lease and handoff requirements
remain `owner_defined` or `unknown` unless current authority explicitly
proves otherwise.

Workspace-holder is optional and may be named only when the surrounding current
repository packet separately requires that guard. The dispatcher never claims,
checks, releases, or cleans a holder.

## Receipt contract

Emit exactly one receipt per semantic phase:

```text
schema=mcl-dispatch-plan.v1
phase=<positive-index>/<positive-total>
route=<current-D-012-route|UNSUPPORTED_OR_SEPARATE_AUTHORITY|UNKNOWN>
executor=<public-semantic-executor|not_applicable|unknown>
preflight_owner=<mcl-preflight|route_owner|not_applicable|unknown>
repository_effect=<none|read_only|mutable|unknown>
overlap_guard=<required|not_required|unknown>
lease_guard=<required|owner_defined|not_required|unknown>
handoff_guard=<required|not_required|owner_defined|unknown>
fallback=<M_candidate|none|not_applicable|unknown>
next_gate=<preflight|route_owner|scope_overlap|lease_plan|git_currentness|owner_effect|separate_authority|blocked|unknown>
details=withheld
```
For a route whose current owner does not expose a reviewed repository/D-013
executor token, use `executor=not_applicable` rather than inventing one.

The receipt is a plan, not a task record, reservation, dispatch receipt, health
report, readiness result, authorization, or completion receipt.

Never add aggregate fields such as `health`, `ready`, `safe_to_mutate`,
`authorized`, `priority`, `owner_account`, or `completion`.

## Effect boundary

This skill must not:
- acquire or release D-013;
- create, check, release, or clean a workspace holder;
- fetch, sync, create, remove, switch, reset, stash, or clean a worktree;
- edit source, commit, push, open/merge/close a PR, or mutate a GitHub issue;
- invoke repository/device/runtime effects merely to prove dispatch;
- call a lease workflow or create a new workflow writer;
- create a daemon, background worker, scheduler, queue, or central task DB;
- repair a service, route, Git state, auth state, or device state;
- publish a release or mutate production/protection.

An effectful or autonomous dispatcher requires separate reviewed authority.
## Privacy

Expose only public semantic route/executor names, bounded guard disposition,
and public owner locators needed for the plan.

Never emit device IDs, RDC/session IDs, ChatGPT/account identity, credentials,
auth scopes, private runner payloads, raw private logs, shell command strings,
environment dumps, raw GUI hierarchy/node contents, or free-form diagnostics.

Private-route planning never constructs, requests, transports, or recovers a
sensitive command or payload. It may only point to an already-authorized
sanitized private owner when current D-012 does.

## Non-goals

This skill does not replace D-012, `mcl-preflight`, `sm-status`, D-013,
D-014, `mcl-coordination-operator`, Work System/Harness, route-specific
device owners, Git/currentness owners, CI, main-write, release, or production.

It does not choose work priority, assign work by ChatGPT account identity, or
treat #2352/#465 as a central task database.
