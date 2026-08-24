# Repository Plugin Control Plane — Design

Status: **DESIGN ONLY — implementation not started**

Recorded: `2026-08-25`

Reference architecture issue: `#267`.

## 1. Goal

Keep one canonical repository `main` while making each plugin feel operationally independent inside GitHub.

The target is:

```text
one integration truth
+
multiple plugin-scoped operational views
```

The system must make it easy to answer, per plugin:

- what production version is actually deployed;
- which PRs currently belong to the plugin;
- which issues currently belong to the plugin;
- which CI/release activity is relevant;
- which release branch is authoritative;
- whether real-device / live verification is pending when that plugin exposes an authoritative source for it.

This is an observability and coordination layer. It is **not** a second release system and it must not become a competing source of truth.

## 2. Non-goals

The control plane will not:

- create multiple permanent plugin-specific `main` branches;
- replace `main` as repository integration authority;
- replace any plugin's existing production branch;
- copy production versions into a new manually-maintained central database;
- rewrite plugin release systems into one generic release engine;
- infer unknown release/device state;
- commit a refreshed status file to `main` every time a PR, issue or CI run changes;
- execute untrusted PR code in a privileged metadata workflow;
- make unrelated plugin changes invalidate an active release transaction.

## 3. Core architectural rule

```text
canonical integration authority = main
plugin production authority     = plugin-owned release branch / release contract
control-plane authority         = classification + locators only
```

The central system stores **where to read truth**, not duplicated truth values.

For example, if SimCore already declares release identity through its existing manifest, the control plane references that authority. It does not maintain a second `simcoreVersion` value.

Likewise, Local Usage Dashboard keeps its own release manifest/spec/production branch contracts. The control plane consumes those contracts without changing their semantics.

## 4. High-level shape

```text
main
│
├─ .github/plugin-control-plane/
│  ├─ registry.json
│  └─ schemas / trusted controller code
│
├─ plugins/<plugin>/...
│
├─ trusted metadata workflows
│  ├─ classify PR
│  ├─ classify issue
│  └─ refresh status views
│
└─ GitHub operational surfaces
   ├─ plugin:* labels
   ├─ scope:* labels
   ├─ dynamic search links
   └─ one mutable status issue per plugin
```

`main` receives only durable configuration/code/documentation changes. Routine status changes update GitHub metadata or existing status issues rather than generating commits.

## 5. Central plugin registry

Introduce a small machine-readable registry, initially proposed as:

`/.github/plugin-control-plane/registry.json`

The registry contains plugin identity, path ownership and **locators** for existing authorities.

Illustrative shape only:

```json
{
  "schemaVersion": 1,
  "plugins": {
    "usage-dashboard": {
      "displayName": "Local Usage Dashboard",
      "paths": [
        "plugins/usage-dashboard/**",
        ".github/usage-dashboard/**"
      ],
      "releaseBranch": "release-usage-dashboard",
      "statusAdapter": "usage-dashboard"
    },
    "simcore": {
      "displayName": "SimCore",
      "paths": [
        "plugins/simcore/**"
      ],
      "releaseBranch": "release-simcore",
      "statusAdapter": "simcore"
    }
  }
}
```

The final implementation may use per-plugin descriptor files if that keeps reviews smaller. The important contract is that descriptors contain selectors/locators and do not duplicate mutable production facts.

### Registry invariants

- Plugin IDs are stable and machine-safe.
- Path rules are deterministic.
- No two plugins silently claim the same ordinary source path.
- Explicit shared/repository-level paths are supported.
- A missing authority produces `UNKNOWN` / omitted state, never a guessed value.
- Adding a new plugin is a small registry/configuration change, not a rewrite of the controller.

## 6. Scope classification

### 6.1 PR classification

A trusted metadata-only workflow reads the PR changed-file list and matches it against the registry.

It applies labels such as:

```text
plugin:usage-dashboard
plugin:simcore
plugin:devpass
plugin:termux
scope:shared
scope:repo
scope:unclassified
```

Rules:

1. A PR touching one plugin's owned paths receives that plugin label.
2. A PR touching multiple plugins receives all matching plugin labels.
3. A PR touching explicitly shared infrastructure receives `scope:shared` in addition to affected plugin labels when impact can be determined exactly.
4. Pure repository-level changes receive `scope:repo`.
5. Ambiguous changes receive `scope:unclassified`; the system does not guess.
6. Existing release/security workflows remain authoritative; labels are operational metadata only.

### Security boundary

If `pull_request_target` is used, the workflow must:

- run trusted workflow/controller code from the base repository;
- fetch changed-file metadata through the GitHub API;
- never checkout or execute PR head code while holding write credentials;
- request only the minimum metadata permissions required for labels/comments.

This workflow must not inherit candidate/release write authority.

## 7. Issue classification

Issues have no changed-file set, so classification must not infer plugin ownership from arbitrary prose.

Preferred sources, in order:

1. explicit plugin field from a repository issue form/template;
2. an existing `plugin:*` label supplied by the assistant/control surface;
3. explicit machine-readable command/marker if later needed;
4. otherwise `scope:unclassified`.

This preserves fail-closed behavior and avoids silently filing an issue under the wrong plugin.

Cross-plugin/repository issues may intentionally carry multiple plugin labels or `scope:shared` / `scope:repo`.

## 8. Operational views

GitHub does not need multiple `main` branches to provide multiple working views.

Each plugin gets dynamic query surfaces based on labels, for example:

```text
Open PRs      → is:pr is:open label:plugin:usage-dashboard
Open issues   → is:issue is:open label:plugin:usage-dashboard
Merged PRs    → is:pr is:merged label:plugin:usage-dashboard
Shared work   → label:scope:shared
```

A durable repository index can link to these searches.

Because the queries are dynamic, normal PR/issue movement does not require commits to `main`.

## 9. Plugin status issues

For a richer single-screen view, create one long-lived status issue per registered plugin.

Example conceptual body:

```text
Local Usage Dashboard

Production
- Version: <read from plugin authority>
- Release branch: release-usage-dashboard
- Production SHA: <read from production branch>

Work
- Open PRs: <dynamic links/count>
- Open issues: <dynamic links/count>
- Shared-impact work: <dynamic links/count>

Validation
- CI/release state: <only if an authoritative source exists>
- Physical verification: <only if an authoritative source exists; UNKNOWN/PENDING preserved>
```

The status issue is **derived presentation state**, not authority.

A trusted controller may update the same issue body in place after relevant events. It must not create a new issue per refresh and must not commit the rendered status into `main`.

If live status cannot be read reliably, the field stays `UNKNOWN` or is omitted.

## 10. Status adapters

Different plugins already expose release truth differently. The control plane should therefore use small read-only adapters rather than forcing every plugin into one manifest immediately.

An adapter:

- reads existing repository/production authority;
- emits normalized presentation fields;
- performs no product mutation;
- performs no release;
- never invents missing data.

Example normalized output:

```json
{
  "plugin": "usage-dashboard",
  "productionVersion": "...",
  "releaseBranch": "...",
  "productionSha": "...",
  "verification": "PENDING"
}
```

The normalized output is transient. The plugin's original manifest/spec/branch remains authoritative.

Adapters should be tiny and independently testable.

## 11. Shared and repository-level paths

The difficult case is not ordinary plugin source. It is shared infrastructure such as common workflows, root documentation or repository coordination tools.

The registry therefore needs explicit ownership classes:

```text
plugin-owned
shared-impact
repo-only
unclassified
```

A shared path must not automatically label every plugin unless the registry explicitly declares that impact.

This avoids turning every root documentation change into noise across all plugin views.

## 12. CI interaction

Phase 1 of the control plane is observational/classification only. It does not rewrite existing plugin CI triggers.

After the classifier is proven, plugin CI can optionally consume the same scope engine to reduce unrelated noise, but only where this preserves existing required validation.

Important rule:

> The control plane may reduce irrelevant orchestration, but it may not weaken a plugin's authoritative regression or release gate.

For Local Usage Dashboard specifically, E7 exact-SHA validation and release promotion remain untouched by this repository-level system.

## 13. Main-volatility isolation

The control plane complements the existing rule that unrelated `main` movement should not invalidate a plugin release transaction.

```text
main moves
│
├─ unrelated plugin/repo activity
│  └─ classification/view updates only
│
└─ touches the active plugin's declared authority surface
   └─ plugin release system decides whether new trusted-base validation is required
```

The central control plane does not make that release decision on behalf of the plugin.

## 14. Root repository presentation

The current root README can eventually become a stable repository hub rather than a frequently-generated dashboard.

Proposed stable structure:

```text
Repository Plugins

Local Usage Dashboard → operational view
SimCore               → operational view
DevPass               → operational view
Termux                 → operational view

Shared / Repository Work → shared view
```

The README contains durable links and architecture explanation only. Live numbers/status should come from dynamic searches/status issues so the README does not cause main churn.

## 15. Labels are indexes, not authority

`plugin:*` and `scope:*` labels provide navigation and automation selectors.

They do not determine:

- production version;
- release eligibility;
- validated SHA;
- release branch contents;
- physical verification truth.

If a label disagrees with code/release authority, the label is wrong and should be repaired; release authority does not change.

## 16. Failure behavior

The system must degrade safely.

### Classification failure

```text
classifier error
→ no guessed plugin ownership
→ scope:unclassified when possible
→ plugin release systems continue independently
```

### Status adapter failure

```text
adapter cannot read authority
→ UNKNOWN / unavailable
→ no copied stale value
→ no production mutation
```

### Metadata write failure

```text
label/status-issue update fails
→ observability degraded
→ merge/release authority unchanged
```

The Plugin Control Plane must never become a single point of failure for production releases.

## 17. Minimal permissions

Separate jobs/workflows by responsibility.

### Classifier

Needs only repository metadata read plus issue/PR label/comment write.

### Status reader

Needs repository/Actions metadata read. It should not receive contents write or release-branch write.

### Status issue updater

Needs issue write only after normalized status is computed from trusted sources.

No control-plane job should receive plugin production-branch write authority.

## 18. Testing strategy

Add repository-level contract tests before rollout.

Required cases:

- one-plugin PR classification;
- multi-plugin PR classification;
- shared-path classification;
- repo-only classification;
- ambiguous/unclassified behavior;
- issue explicit-scope parsing;
- adapter returns source-provided values only;
- missing values remain UNKNOWN;
- status rendering is deterministic;
- metadata workflow never executes PR head code;
- control-plane failure cannot block plugin release workflows;
- registry overlap is detected fail-closed.

A fixture set should use representative paths from the existing repository instead of production mutations.

## 19. Rollout plan

### CP0 — Inventory and contract

- Freeze plugin IDs and owned path surfaces.
- Record shared/repo-only paths.
- Define registry schema.
- No workflow behavior change.

### CP1 — PR scope classifier

- Implement trusted changed-path classifier.
- Apply `plugin:*` / `scope:*` labels.
- Add contract tests.
- Observe classification accuracy before consuming labels elsewhere.

### CP2 — Issue scope

- Add explicit plugin selector to issue forms/templates or equivalent machine-readable input.
- Fail closed to unclassified.

### CP3 — Operational views

- Add stable repository hub links.
- Create one status issue per active plugin.
- Add read-only adapters for plugins that already expose authoritative machine-readable state.

### CP4 — Optional CI noise reduction

- Reuse the proven scope engine for path-aware CI selection where safe.
- Do not weaken plugin-specific authoritative gates.

### CP5 — Mature control plane

- New plugin onboarding becomes registry + adapter + tests.
- Existing plugins retain independent release systems and production branches.

## 20. Initial plugin scope

Do not onboard every directory at once merely because it exists.

Start with the active, well-understood plugins whose authority is already clear:

1. Local Usage Dashboard;
2. SimCore.

Then add DevPass / Termux after their current release/status authority is inventoried.

Test fixtures such as `test-a`, `test-b`, and `_template` should not automatically become production operational views.

## 21. Acceptance criteria

The first useful implementation is complete when:

- `main` remains the only canonical integration branch;
- Usage Dashboard and SimCore PRs are automatically and correctly separable by plugin view;
- ambiguous work is visibly unclassified instead of guessed;
- no routine status refresh commits to `main`;
- production version/status displayed by the control plane is read from existing authority;
- control-plane failure cannot block either plugin's release path;
- one stable repository hub gives direct access to each plugin's PR/issue/status views;
- the system adds less operator state than it removes.

## 22. Design verdict

This repository does not need multiple permanent mains to feel modular.

The better structure is:

```text
one canonical main
+
plugin-owned source paths
+
plugin-owned production authority
+
central read-only classification/indexing layer
+
multiple dynamic operational views
```

The control plane should make repository activity easier to see without becoming another thing that product releases depend on.

> One integration truth, multiple operational views.
