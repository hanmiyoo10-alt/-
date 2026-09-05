# Local Usage Dashboard — Upstream Idea Intake Automation

Status: **ACTIVE · REPOSITORY/PROCESS ONLY · NOT RELEASE AUTHORITY**

Tracking: #1572  
Warehouse: `docs/USAGE_DASHBOARD_IDEA_LIST.md` / #412  
Durable state: `.github/usage-dashboard/upstream-idea-intake-state.json`

## Purpose

Restore the intended automatic path:

```text
OFFICIAL LLMGATEWAY/GATEWAY UPSTREAM
        ↓
BOUNDED RECURRING WATCH
        ↓
SOURCE / EVIDENCE RECORD
        ↓
TRIAGE + DEDUPE
        ↓
CANONICAL IDEA WAREHOUSE
```

This is idea discovery only. Upstream release evidence never grants implementation or release authority.

## Reused repository pattern

The contract deliberately reuses two already-proven repository shapes instead of inventing a new subsystem.

### Source-to-catalog shape

SimCore reference intake established the useful separation:

```text
raw/source evidence
→ bounded analysis
→ deduplicated synthesis
→ research idea catalog
```

Relevant historical authorities include PR #973 (source-drop archive) and PR #1072 (deduplicated LightBoard idea catalog).

Usage Dashboard applies the same separation to official Gateway changes:

```text
public upstream evidence
→ durable scan evidence
→ source/truth triage
→ dedupe
→ USAGE_DASHBOARD_IDEA_LIST.md
```

### Scheduled durable convergence shape

Repository control-plane automation already uses recurring wakeups, durable state, idempotent convergence and quiet no-op behavior. The idea intake follows the same operational properties, while semantic upstream triage remains a ChatGPT condition-watch rather than a runtime/plugin poller.

## Execution owner

A recurring ChatGPT condition-watch is the execution owner.

Contract:

- cadence: every 6 hours;
- official public upstream only;
- no-change run: no repository mutation and no user notification;
- meaningful new/change evidence: record repository evidence, then reconcile the warehouse;
- ambiguous/inaccessible/login-only evidence: fail closed as `needs-evidence`;
- every run re-reads current repository/product authority before acting.

The durable repository state is not a scheduler. It is the executor-independent checkpoint used to prevent duplicate discovery and to make the automation inspectable/recoverable.

## Evidence and promotion rules

For each observed upstream capability:

1. preserve the exact official source reference/evidence first;
2. decide whether it is relevant to Local Usage Dashboard observability/account/read-only scope;
3. compare against existing warehouse IDs, feature issues, design docs and shipped functionality;
4. if already covered, update evidence/status instead of creating a duplicate;
5. if genuinely new, classify:
   - product-version impact;
   - importance;
   - difficulty;
   - source confidence;
   - UNKNOWN/privacy/identity implications;
   - extra I/O requirement;
6. promote to the canonical warehouse only after the classification is evidence-backed;
7. promotion remains backlog/research authority only.

## Fail-closed rules

Never:

- infer a live account value from public marketing/changelog text;
- convert missing source authority to `0`, `false`, Regular, enabled, disabled, supported or unsupported;
- retain auth/session/API-key/payment payloads;
- open one idea per model arrival when the existing model-catalog family owns it;
- duplicate an existing idea merely because upstream wording changed;
- auto-start implementation, allocate a Product version, merge runtime changes or deploy a release.

## Historical checkpoint

Issue #1494 is retained as the first durable upstream scan evidence. It is historical evidence, not a mutable global state document.

The initial dedupe set in `.github/usage-dashboard/upstream-idea-intake-state.json` includes the six candidates captured by #1494. `V-MODEL-LIFECYCLE-STATUS` is marked implemented by Product 5.100 so future scans update that family instead of re-adding it.

## Recovery contract

If the recurring executor is lost or disabled:

1. the state file and this contract remain authoritative for recovery;
2. restart from `lastDurableScan` plus current official upstream evidence;
3. re-read current warehouse/issues/designs before promotion;
4. never replay historical candidates as new ideas;
5. a recovery scan that finds no meaningful change must remain a silent no-op.

## Artifact boundary

This automation is repository/process only.

It must not change:

- `plugins/usage-dashboard/latest.js`;
- Plugin runtime source;
- Engine/Manager runtime artifacts;
- Product/Engine/Manager versions;
- snapshot/recent-request contracts;
- `release-usage-dashboard` production bytes.

Physical acceptance is not required for this repair because no shipped bytes or runtime semantics change.
