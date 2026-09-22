# Mobile Coder Lab task handoff v1

Status: `V1 CONTRACT / #2359`

This contract owns only immutable coordination evidence for one Mobile Coder Lab semantic phase. It does not own packet lifecycle, routing, health, reservation, Git currentness, CI, merge, release, production, or dispatch authority.

## Authority composition

For mutable repository work, the surrounding orchestration remains:

```text
Work System packet + current authority
→ D-012 semantic route
→ bounded current status when relevant
→ packet/PR scope overlap
→ D-013 lease acquire/validate
→ Git/worktree/currentness guards
→ authorized mutation
→ validation
→ D-013 lease release
→ task completion receipt
```

The handoff objects record evidence from these owners. They never replace them.

## Two immutable envelope types

V1 defines exactly two semantic objects:

1. `MCL_TASK_MANIFEST` — the exact context for one semantic phase before execution.
2. `MCL_COMPLETION_RECEIPT` — the bounded result for that exact manifest after the phase reaches a safe stop.

`COMPLETE` is a phase disposition only. It never means the owning Work System packet is `DONE`.
## Manifest identity

A manifest binds one phase to:

- exact `packetRef` plus SHA-256 of the complete observed packet body;
- caller-stable `phaseId` and bounded `phaseClass`;
- D-012 route plus one exact executor, never `either`;
- normalized Work System `path:` / `surface:` scopes;
- D-013 workspace identity: isolated `repository`, fixed `landing_metadata`, or explicit non-repository `not_applicable`;
- optional observed base SHA as historical evidence only;
- whether D-013 lease evidence is required and, when required, the exact lease identity/acquisition generation;
- bounded source-authority, input, expected-output, and acceptance locators;
- one bounded stop condition;
- explicit false repository/device/merge/release/production authorization flags.

The packet-body hash is an observational snapshot anchor. It does not recreate or normalize packet lifecycle. Later packet-body movement makes the manifest stale for future mutation until current packet/lease/currentness evidence is re-established, while preserving its historical handoff value.

## Deterministic identity

The implementation canonicalizes object keys and set-like scope/reference fields before hashing.

`payloadSha256` identifies the canonical payload. `manifestId` or `receiptId` is a domain-separated digest derived from that payload hash.

JSON key order therefore cannot change identity. Byte-identical semantic replay is idempotent; the same claimed identity with different payload is `CONFLICT`.
## Completion receipt

A completion receipt binds back to one exact manifest by `manifestId`, manifest payload hash, packet, phase, and executor. It records only bounded locators for outputs, validations, and observed Git/GitHub evidence, plus workspace disposition, blockers, and required UNKNOWN evidence.

Allowed phase dispositions are:

- `COMPLETE` — required phase evidence is structurally present and no required UNKNOWN/blocker remains;
- `PARTIAL` — bounded progress exists but the phase is not complete;
- `BLOCKED` — current evidence prevents phase completion.

For `COMPLETE`, `repository` and `landing_metadata` workspaces must be `clean`; non-repository contexts must be `not_applicable`. At least one output locator and one validation locator are required.

None of these dispositions prove Work System `DONE`, `CONTRACT_PROVEN`, `LIVE_PROVEN`, merge authority, release readiness, or production state. Consumers must re-read those owners directly.

## Lease composition

When a manifest says `leaseRequirement=REQUIRED`, it carries only bounded D-013 acquisition evidence from ledger #2352.

Any completion receipt for that phase must record an explicit matching release with a later generation before the receipt is valid. The receipt cannot release, renew, transfer, or recover a lease.

When a later phase is mutable, that phase creates a new current manifest and acquires its own current D-013 lease.
## Routing and workspace composition

The implementation reuses Work System scope normalization and the public D-013 route/executor names. It validates compatibility; it does not select a route.

- route `S` may use exact executor `S` or the documented repository fallback `M`;
- every context-specific route must use the same exact executor context;
- repository-backed S work uses `server/*` under `/root/nyang-worktrees/`;
- repository-backed M work uses `mainphone/*` under `/data/data/com.termux/files/home/nyang-worktrees/`;
- fixed landing Git-metadata phases use the exact D-013 `landing_metadata` identity and matching `surface:mcl-landing-origin-main:<executor>` scope; arbitrary landing paths remain invalid;
- route `S` requires `repository` or `landing_metadata`, with the documented exact executor `M` fallback remaining valid;
- non-repository semantic contexts use explicit `not_applicable` repository identity.

A valid manifest does not prove the workspace currently exists, is clean, or is current. Those remain execution-time owner checks.

## Envelope transport

Repository code owns render/parse/integrity only. V1 adds no GitHub writer workflow, mutable task issue, queue, database, daemon, or scheduler.

When durable GitHub transport is useful, prefer posting the complete machine envelope as an append-only comment on the owning packet issue. Do not rewrite the packet body merely to store historical phase evidence.

The reserved markers are:

```text
<!-- mcl-task-manifest:v1 -->
<!-- mcl-task-completion-receipt:v1 -->
```

Each rendered envelope also has a matching closing marker and contains one `json` fence. There is no latest-comment-wins rule. Consumers select an explicit deterministic identity; missing, malformed, edited, duplicate-conflicting, or integrity-invalid evidence fails closed.
## Privacy boundary

The envelopes contain locators and hashes, not raw task payloads. V1 has no fields for device IDs, RDC/session IDs, ChatGPT/account identity, credentials, auth codes, tokens, private keys, raw private logs, shell command lines, environment dumps, notebook bodies, or arbitrary file contents.

Reference fields accept only bounded locator forms such as packet/issue/PR/run identifiers, exact commit locators, repository paths/docs, sanitized receipt locators, or GitHub URLs. Unknown fields fail closed rather than becoming an escape hatch for private payloads.

Semantic public executor names defined by D-012 are not private device identifiers.

## Multi-context work

A multi-context task uses one manifest and one result envelope per independently routed semantic phase.

Example:

```text
S repository phase
→ completion receipt after lease release
→ fresh S_TERMUX validation manifest
→ S_TERMUX completion receipt
```

The receipt transfers context, not an active reservation or write authority.

## Relationship to #2356

This contract deliberately does not repair the packet-lifecycle compatibility anomaly in #2356. It binds the exact packet body hash without manufacturing a lifecycle token. D-013 lease admission continues to enforce its own current packet-lifecycle requirement independently.
## Failure semantics

Envelope parsing or cross-validation never infers success from absence. Missing/malformed/integrity-invalid evidence is `UNKNOWN`; duplicate marker identity is `CONFLICT`; manifest/receipt cross-link, lease-release, required-UNKNOWN, blocker, or workspace convergence violations are `BLOCKED`.

Time passage has no semantic effect. V1 has no TTL, latest-wins rule, implicit supersession, or age-based completion.

## Non-goals

No automatic routing or dispatcher is introduced. No task database, mutable registry, new lease ledger, worktree creator/cleaner, device health owner, CI gate, Git writer, merge writer, release publisher, or production authority is introduced.

The Work System packet remains the resumable whole-task owner. Work Harness Work Record/Executor Handoff/Coordination Receipt remain generic repository coordination owners. This MCL contract is the smaller product-local phase continuity layer between independent S/M workers.

## Implementation surface

The v1 implementation is intentionally small:

```text
products/chatgpt-mobile-coder-lab/docs/task-handoff.md
products/chatgpt-mobile-coder-lab/coordination/task-handoff.cjs
products/chatgpt-mobile-coder-lab/coordination/tests/test-task-handoff.cjs
products/chatgpt-mobile-coder-lab/docs/decisions.md  # D-014 pointer only
```

Incompatible changes to identity, marker, route/workspace, lease-release, privacy, or authority semantics require reviewed versioning rather than silent v1 drift.

## Completion receipt set companion

The additive `completion-receipt-set.cjs` helper classifies multiple immutable D-014 `COMPLETE` receipt snapshots for one exact manifest. It reuses `task-handoff.cjs` receipt parsing and integrity checks; it does not define a second receipt schema.

Input is one bounded regular JSON file containing only:
- exact `manifestId`;
- bounded `receiptTexts` containing complete rendered D-014 receipt envelopes.

The helper collapses byte-equivalent receipt replay by `receiptId`, then compares the phase-completion core. Evidence-snapshot locators (`outputRefs`, `validationRefs`, `observedRefs`, and release `evidenceRef`) are deliberately excluded from that core.

Results are:
- `SINGLE` — one unique valid COMPLETE receipt;
- `MULTIPLE_EQUIVALENT` — multiple unique receipts with one completion core;
- `CONFLICT` — valid receipts disagree on completion-core semantics;
- `UNKNOWN` — malformed/invalid/non-COMPLETE/mismatched evidence cannot be classified safely.

For `SINGLE` and `MULTIPLE_EQUIVALENT`, `representativeReceiptId` is only the lexicographically smallest stable locator. It is not canonical truth, latest-wins selection, or evidence-strength ranking.

The classifier has no GitHub/network lookup, clock/age semantics, comment mutation, lease/worktree authority, or receipt rewrite path. It emits only bounded IDs/digests/disposition metadata and never raw receipt bodies.
