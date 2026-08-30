# Local Usage Dashboard — Designed Idea Auto-Consumption Policy

Status: **CANONICAL EXECUTION POLICY**

Tracking: #412

## Purpose

Version-updating Local Usage Dashboard work should not require the user to re-approve every already-designed idea one by one.

Once an idea that changes shipped Product / Plugin / Engine / Manager bytes has a complete, current design, ChatGPT may automatically consume that idea in a later monotonic release when it is useful and fits the release boundary.

## Automatic-consumption rule

A versioned idea is eligible for automatic consumption when all of the following are true:

1. the idea is `DESIGN READY` or stronger;
2. authoritative source/truth ownership is proven or the design explicitly defines a fail-closed UNKNOWN path;
3. privacy, identity, transaction, and forbidden-inference boundaries are explicit;
4. non-goals are explicit;
5. regression coverage and physical acceptance criteria are defined;
6. all prerequisites required by that design are satisfied;
7. a fresh implementation-time check confirms the design is still compatible with current production and source authority.

When those conditions hold, ChatGPT may use the idea automatically while designing or implementing later version updates. The user does **not** need to say `구현해`, `이 아이디어도 넣어`, or otherwise re-authorize each eligible idea separately.

## Release-boundary rules remain in force

Automatic consumption is not permission for arbitrary scope growth.

- Preserve `one release = one primary goal`.
- Strongly coupled designed ideas may share a bounded release only when regression and rollback boundaries remain clear.
- Otherwise consume eligible ideas as sequential monotonic releases.
- Re-check current production, source authority, exact component versions/hashes, next regression slot, and active gates immediately before implementation.
- If a design has become stale or its source authority changed, revalidate or amend the design before consuming it.
- If a prerequisite is missing, keep that idea fail-closed and continue only with safely independent work.

## User interaction rule

The normal operating model remains:

- ChatGPT handles source inspection, release design, implementation, regression, PR/CI, merge, main materialization, monotonic deployment, and repository evidence.
- The user is not asked to run development commands.
- The user is called only when real PocketRisu/Android physical validation is genuinely required, with exact observations to return.
- Routine per-idea implementation approval is not required once an idea is eligible under this policy.

## Safety / write boundary

An idea that is still `BLOCKED`, `INVESTIGATE`, or missing required transaction/idempotency/privacy authority is **not** automatically consumable merely because it appears in the idea warehouse.

Transactional or account-mutating work may become automatically consumable only after its own design and prerequisites explicitly establish implementation readiness and the release can preserve the required safety/rollback/idempotency contracts.

## Relationship to the idea list

`docs/USAGE_DASHBOARD_IDEA_LIST.md` remains the canonical idea warehouse and classification index. This policy clarifies execution behavior for ideas that have already crossed the design gate.

In short:

**idea captured → design completed/revalidated → eligible ideas may be automatically consumed in appropriate future version updates → full regression/release gates → physical validation only when required.**
