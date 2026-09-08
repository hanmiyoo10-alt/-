# Shared Plugin Primitive Candidates

Status: candidate registry only

This document records narrow cross-plugin primitives that have been exposed by real plugin delivery evidence. A candidate here is not implementation authority and does not change any plugin's release, deployment, merge, or physical-acceptance authority.

## Candidate 1 — Bounded Stage Failure Projection

Originating real evidence: Local Usage Dashboard 5.106 release transaction and its shared-standard re-evaluation.

Problem shape:

```text
trusted stage phase
-> bounded machine-readable failure code
-> optional sanitized trusted diagnostic token
-> durable receipt
```

Desired properties:

- the durable receipt names the stage/phase and stable failure class;
- the first actionable failure should not require unrelated log archaeology;
- only trusted-tool-generated bounded diagnostics may be projected;
- arbitrary stderr, response bodies, secrets, tokens, raw auth/session material, private IDs, and unbounded logs must never be copied into durable/public receipts;
- the diagnostic is descriptive only and never becomes release authority;
- failure projection must not weaken fail-closed behavior, exact identity checks, merge gates, deployment gates, or physical truth boundaries;
- adoption by another plugin must not require copying Usage Dashboard E-numbering or release topology.

Current portability verdict: `OPPORTUNITY`.

Promotion rule: do not turn this into a shared framework until a second real plugin demonstrates the same lifecycle responsibility or a repository-level owner can clearly remove duplicated per-plugin logic without weakening plugin-specific authority.
