# Local Usage Dashboard — Shared Plugin Invariants Review — 2026-09-01

Status: **REVIEW COMPLETE — NO PRODUCT CHANGE AUTHORIZED**

Scope: `plugins/usage-dashboard/`  
Common policy owner: `docs/REPOSITORY_COMMON_RULES.md`  
Project guideline: `docs/USAGE_DASHBOARD_GUIDELINES.md`  
Sequencing index: #412

## 1. Fresh authority at review time

The repository common-rules layer is inherited by the Usage Dashboard guideline by reference. It owns shared behavioral/governance rules, not mutable Usage Dashboard production truth.

Fresh production authority during this review:

- production branch `release-usage-dashboard`
- production SHA `82c4f900cf548068d1eada957c982a5d78f1347b`
- Product `3.0.0-alpha.5.98`
- Engine `1.6.34`
- Manager `1.3.6`
- managed CLI `1.10.0`
- managed Models `1.280.0`
- contracts `1/1`
- repository deployment complete
- physical verification **PENDING** per #1055 comment `5483181037`

This review therefore does not alter or reopen 5.98. Any runtime change discovered later belongs to a new monotonic release after current physical authority is resolved.

## 2. Newly useful shared/plugin dossiers

### A. Plugin storage pending read-your-write — HIGH relevance

Source dossier:
`products/pocketrisu-helper-mod/docs/features/plugin/plugin-storage-pending-read-your-write/INVARIANT.md`

Adopted host invariant:

- newest pending storage intent is visible before older cache/server state;
- pending set reads as the queued value;
- pending remove reads as absent;
- snapshot reads apply the same rule;
- completion/failure ordering must not resurrect stale intent.

Usage Dashboard applicability:

- current Dashboard initializes through `Risuai.getLocalPluginStorage()`;
- state/token reads use awaited `getItem()`;
- migration/token/state writes use awaited storage writes;
- UI state transitions generally `await persist()` before dependent rendering/refresh actions;
- Request Ledger, Diagnostics mode, and latest normalized state rely on plugin storage.

Disposition: **ADOPT_AS_HOST_COMPATIBILITY_CONTRACT / REGRESSION GAP REVIEW**.

No current Dashboard bug is proven. Do not add another persistence owner, forced flush, polling path, or shadow cache. Future storage refactors should include a regression proving immediate post-write logical reads cannot be replaced by stale host/cache state.

### B. Handed-out view writeback authority — MEDIUM architectural relevance

Source dossier:
`products/pocketrisu-helper-mod/docs/features/plugin/plugin-handed-out-view-writeback-authority/INVARIANT.md`

General invariant:

- performance cache residency is not semantic authority;
- when change detection depends on a value previously handed to a caller, semantic provenance/identity must own the comparison;
- LRU/cache evidence may be only a fallback;
- bounded cache eviction must not change writeback semantics;
- provenance itself must remain bounded.

Usage Dashboard applicability:

The current Dashboard has no lazy asset-manifest compatibility/writeback surface, so the concrete feature is **NOT_APPLICABLE**. The general authority rule is applicable to future derived/cached UI or state reconciliation: a performance cache must never become truth about user intent, request identity, source provenance, or whether a value changed.

Disposition: **PRESERVE_AS_ARCHITECTURAL_GUARDRAIL; NO PORT**.

### C. Persist before runtime reload — HIGH host/update relevance

Source dossier:
`products/pocketrisu-helper-mod/docs/features/plugin/plugin-persist-before-runtime-reload/DESIGN.md`

Host-side rule:

`plugin mutation -> canonical durable save completes -> existing runtime reload`

The design specifically rejects a second flush API and preserves existing targeted V3 reload behavior.

Usage Dashboard applicability:

The normal `+` update/reload path is host-owned, not Usage Dashboard-owned. The lesson is important for release acceptance because repository exact-byte parity and actual installed-runtime convergence are distinct evidence gates. Usage Dashboard must not implement a competing host save/reload mechanism.

Disposition: **HOST_OWNED DEPENDENCY / PRESERVE NORMAL + UPDATE PATH**.

### D. Per-permission authorization tuple — MEDIUM security dependency

Source dossier:
`products/pocketrisu-helper-mod/docs/features/plugin-security/per-permission-authorization/INVARIANT.md`

Adopted host invariant:

- permission identity is `(pluginName, permissionDesc)`, encoded without delimiter ambiguity;
- one capability grant must not authorize another;
- resets operate on exact permission identities;
- concurrent prompts are serialized and rechecked.

Usage Dashboard applicability:

The Dashboard consumes host plugin APIs but does not own the host permission store. Any future feature requesting additional host capabilities must rely on this fail-closed host boundary rather than inventing local authorization state.

Disposition: **HOST_OWNED SECURITY CONTRACT / NO LOCAL PERMISSION CACHE**.

### E. Serialized schema compatibility — MEDIUM future state-schema relevance

Source dossier:
`products/pocketrisu-helper-mod/docs/features/prompt/prompt-block-role-schema-compatibility/INVARIANT.md`

General invariant:

- do not reuse an existing persisted key for a new meaning merely because the value type fits;
- allocate distinct fields when semantics differ;
- preserve old-save behavior;
- use explicit migration when consolidation is actually required.

Usage Dashboard applicability:

The Dashboard has a long-lived `STATE_KEY`, legacy state keys, and explicit migration flags. Future state additions/migrations should preserve historical field semantics and UNKNOWN/default behavior rather than reinterpret old serialized data.

Disposition: **ADOPT_AS_STATE-SCHEMA GUARDRAIL**.

### F. Lazy asset compatibility strengthening — feature NOT_APPLICABLE

`plugin-lazy-asset-compat-snapshot` adds useful general lessons about owner-aware identities, bounded provenance, and cache-vs-authority separation. The Dashboard has no corresponding asset-manifest API, so no feature or code should be ported.

Disposition: **REFERENCE ONLY**.

### G. SimCore plugin reference intake — OUT OF SCOPE

`references/simcore-plugin-idea-drop-2026-08-31/` explicitly declares itself SimCore reference/archive-only, not runtime/dependency/roadmap authority. It is not a Local Usage Dashboard feature source merely because the artifacts are plugins.

Disposition: **OUT_OF_SCOPE**.

## 3. Common-rules implications already aligned with Usage Dashboard

The inherited repository constitution reinforces existing Dashboard practice:

- fresh authority before acting;
- UNKNOWN remains UNKNOWN;
- no manufactured truth or validation gaming;
- scoped PASS/READY claims only;
- no Git secrets/private raw material;
- existing Git/CI/release/production gates remain authoritative;
- unresolved conflicts fail closed;
- stable baseline + small bounded change;
- one primary goal per release/work unit;
- evidence before repair and measurement before optimization;
- safe automation instead of user-manual repository commands;
- regression coverage for durable contracts;
- generated artifacts remain derived;
- diagnostics remain observational and bounded;
- routine releases use the normal update path;
- current health stays distinct from historical incidents;
- real-device acceptance remains a separate project-owned gate.

No duplicate copy of the common-rules body should be added to Usage Dashboard guidelines.

## 4. Local source reconciliation

Fresh source review found the current Dashboard already follows the conservative side of the strongest new storage rule:

- bootstrap awaits storage reads/writes;
- settings actions await token/state persistence before dependent stateful operations;
- Diagnostics state persistence is serialized;
- retained-state inventory already classifies persistent state/ledger ownership explicitly.

What is **not yet proven** by this review is a dedicated Dashboard regression simulating an in-flight host storage write followed by an immediate same-key read/snapshot. That remains a regression/evidence gap, not a product defect.

## 5. Recommended follow-up

Create a future repository-only compatibility audit/regression task, tentatively named:

`NV-PLUGIN-STORAGE-COMPAT`

Its scope should be byte-neutral unless evidence proves a local violation:

1. model/mock the host pending read-your-write contract without weakening host authority;
2. verify Dashboard write sequencing does not require stale re-reads to succeed;
3. verify ordered persistence tails retain newest intent;
4. verify failed writes remain failures and do not manufacture durable success;
5. verify no extra persistence owner, flush API, timer, poller, or cache is introduced;
6. keep full existing Usage Dashboard regression green.

Do **not** reserve a P-number until an implementation/audit pass fresh-checks the registry.

## 6. Verdict

The newly added shared plugin material is useful, but it does **not** justify changing the currently deployed 5.98 product.

Highest-value inherited lessons for Local Usage Dashboard are:

1. **pending intent outranks stale cache/server state while persistence is in flight**;
2. **performance cache is never semantic authority**;
3. **durable persistence precedes host runtime reload**;
4. **permission identity stays capability-specific and fail-closed**;
5. **persisted schema keys keep their historical meaning unless explicitly migrated**.

Canonical result:

**REVIEW COMPLETE / NO PRODUCT CHANGE AUTHORIZED / REPOSITORY-ONLY REGRESSION FOLLOW-UP RECOMMENDED.**
