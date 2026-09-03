# Agent Skill Orchestrator O4-F0 Termux Domain Adapter Design — 2026-09-03

Date: 2026-09-03 KST

Status: **DESIGN FROZEN · DETERMINISTIC METADATA/EVIDENCE GENERALIZATION ONLY · ZERO MODEL CALLS · NO SKILL PROMOTION · NO O5 POLICY CHANGE**

Tracking authority: issue #1120.

Baseline: `main@43f4eb45b139d652db0e240a0d19843b09dde38d`.

## 1. Why O4-F0 exists

O4-F Termux Scout benchmark design is merged, but the canonical O1 evidence builder currently cannot construct its frozen Termux EvidencePackage. `tools/agent-skill-orchestrator/domains/registry.json` registers only Usage Dashboard, so `plugin:termux-large-doc-editor` is unregistered. More importantly, the domain-profile schema already permits authority kinds `declared_by`, `evidence`, and `current_state`, while `evidence.py::_classify_path()` and the EvidencePackage authority-class enum only materialize `guidelines`, `manifest`, `artifact`, `release_spec_dir`, and `domain_primary`.

Do not bypass `build_evidence_package()` for O4-F. Complete this deterministic authority-to-evidence path first.

## 2. Generic authority-class completion

Extend the existing evidence boundary so declared domain authority refs of these already-schema-valid kinds can be represented as source authority classes:

- `declared_by`
- `evidence`
- `current_state`

Rules:

1. `_classify_path()` checks exact declared authority-ref paths before falling back to `domain_primary`.
2. `_expected_source_sha()` requires the corresponding authority observation to be `OBSERVED` and uses its exact `source_sha` for these classes, just like manifest/artifact authority.
3. `evidence-package.schema.json` adds only those three enum values; no free-form class is introduced.
4. Existing `manifest`, `artifact`, `release_spec_dir`, `guidelines`, and `domain_primary` semantics stay unchanged.
5. An unregistered path remains rejected.
6. A declared authority path with UNKNOWN/MISSING observation cannot silently fall back to target repository SHA.

This is completion of already-declared domain metadata semantics, not a new model or plugin-specific heuristic.

## 3. Termux domain metadata

Add exactly one domain registry entry:

- `domain_id`: `termux-large-doc-editor`
- `scope`: `plugin:termux-large-doc-editor`
- `name`: `Termux Large Doc Editor`
- `lifecycle`: `prototype`
- `primary_path`: `plugins/termux/large-doc-editor/**`
- `guidelines_path`: `docs/TERMUX_DEVELOPMENT_GUIDELINES.md`
- authority refs:
  - `declared_by = docs/REPO_PROJECT_CATALOG.md`
  - `evidence = plugins/termux/large-doc-editor/README.md`
- `registration_semantics`: `domain_metadata_only_no_skill_promotion`

Do **not** add a release branch, manifest, release spec directory, production artifact, version, or current production state. Frozen Termux guidance explicitly says production release branch is `UNKNOWN — not established yet` and the Large Doc Editor README identifies the implementation as an evidence-gathering prototype, not a production release.

## 4. O4-F frozen-source behavior

O4-F later resolves authority for frozen source snapshot:

`f01c2ef304656de9254191ec2fb9a2c046642f21`

For that benchmark-only frozen authority snapshot:

- `declared_by` observation is `OBSERVED` at `f01c2ef...`;
- `evidence` observation is `OBSERVED` at `f01c2ef...`;
- guidelines and all primary source blocks use the same frozen target repository SHA through existing builder semantics;
- no release authority observation exists because none is declared.

This does not claim that `f01c2ef...` is current production. It is only the exact frozen retrospective source authority for the consumed O4-F case.

## 5. Required regression

Add/extend deterministic tests proving:

- model/domain registry still validates and unique scope/domain ids are enforced;
- Termux metadata has exactly the two declared authority refs above and no release-shaped ref;
- `resolve_authority()` creates an exact Termux snapshot from explicit `declared_by`/`evidence` observations;
- `build_evidence_package()` accepts bounded blocks from:
  - catalog (`declared_by`),
  - Termux guidelines (`guidelines`),
  - README (`evidence`),
  - Large Doc Editor source/test files (`domain_primary`);
- the resulting source authority classes are exact and canonical;
- declared authority with UNKNOWN/MISSING observation fails when its source block is requested;
- unrelated repository paths remain rejected;
- existing Usage Dashboard O1 evidence regression remains unchanged and green;
- no `PILOT_VALIDATED_SCOPES`, O5 policy, O5 evidence, model registry, runtime generation, plugin source, or release file changes.

Full Agent Skills CI, Plugin Control Plane observation, and SimCore Required CI are mandatory.

## 6. Non-goals

O4-F0 does not:

- execute O4-F models;
- create O4-F expected labels;
- promote Termux or SimCore as a validated Agent Skill scope;
- establish Termux production/release authority;
- change product/plugin/runtime/release/device bytes;
- change O5 thresholds, tie-breaks, budgets, or assignment evidence;
- start O6.

## 7. Exit

O4-F0 exits after an exact tested-head implementation merge and merged-main read-back showing canonical Termux authority/evidence construction works while all prior orchestrator regressions remain green. Only then may O4-F construct its frozen Termux benchmark fixture through the normal evidence builder.