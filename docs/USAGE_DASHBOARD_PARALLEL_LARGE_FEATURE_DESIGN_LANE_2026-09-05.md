# Local Usage Dashboard — Parallel Large-Feature Design Lane

Date: 2026-09-05 KST  
Status: **PLANNING RULE FROZEN · NO LARGE FEATURE SELECTED YET**  
Authority: #1488

## Question

Can a bounded current release such as 5.99 be designed while a genuinely large Local Usage Dashboard feature is also being designed?

## Decision

Yes. Design work may proceed in parallel, but release authority remains separated by default.

The practical model is:

1. keep the current bounded release focused on its accepted primary goal;
2. create a separate issue/document for the large feature;
3. research its source authority, runtime ownership, privacy/fidelity boundaries, regression cost, migration needs, and physical acceptance independently;
4. freeze that design without forcing it into the already-bounded release;
5. combine implementation only if a later fresh review proves the large feature is actually compatible with the current release's risk and ownership envelope;
6. otherwise give the large feature its own next monotonic release transaction.

## Why separate design authority matters

A large feature can change one or more of:

- Engine capture/source behavior;
- Manager provisioning/runtime semantics;
- schema or persistence ownership;
- request identity or dedupe;
- refresh/network/CLI work;
- UI information architecture;
- migration/state compatibility;
- privacy/security boundaries;
- regression and physical acceptance scope.

Bundling those changes merely because the design happened during the same conversation would make diagnosis and rollback harder and would weaken the existing one-primary-goal release discipline.

Parallel design avoids that tradeoff: the larger idea can be fully explored without delaying or destabilizing the smaller release.

## What may still be absorbed into the current release

A follow-up can remain in the current release when it is a direct decomposition or presentation of the same already-authoritative source truth, introduces no meaningful new runtime owner, and does not materially widen acceptance risk.

The 5.99 DevPass/Credits request-count breakdown is an example of an absorbable amendment because the child-scope values are already required to compute the fail-closed combined total.

## What should stay separate

A feature should keep separate release authority when it introduces a new source, new I/O, schema/persistence ownership, major navigation/workflow changes, long-lived state, migration, new background lifecycle, sensitive data surface, or a materially broader device-verification matrix.

## User-action boundary

Parallel design does not increase user operational burden. The user remains responsible only for the normal `+` update and physical verification when a release reaches the PocketRisu acceptance gate. Source analysis, design, implementation, regression, PR/CI, merge, materialization, deployment, and repository evidence remain assistant-owned.

## Next step

The exact large feature has not yet been named. Once specified, open a dedicated feature authority and design document rather than widening #1487 implicitly.
