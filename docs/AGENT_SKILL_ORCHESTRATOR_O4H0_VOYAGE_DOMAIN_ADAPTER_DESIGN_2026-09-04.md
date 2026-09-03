# Agent Skill Orchestrator O4-H0 Voyage Domain Adapter Design — 2026-09-04

Date: 2026-09-04 KST

Status: **DESIGN FROZEN · DETERMINISTIC METADATA/EVIDENCE GENERALIZATION ONLY · ZERO MODEL CALLS · NO SKILL PROMOTION · NO O5 POLICY CHANGE**

Tracking authority: issue #1120.

Baseline: `main@2d232b99bdef0861c37938add23cefb6caef90e1`.

## 1. Why O4-H0 exists

O4-H has been preselected as the retrospective Scout benchmark reuse of `voyage-token-check-visible-refresh-heldout`, but the canonical O1 evidence builder currently cannot construct a Voyage EvidencePackage because `tools/agent-skill-orchestrator/domains/registry.json` does not register `plugin:voyage-token-check`.

Do not bypass `build_evidence_package()` and do not hand-author an alternate authority path. Complete the deterministic domain metadata adapter first.

## 2. Frozen Voyage authority boundary

The O4-H frozen repository source snapshot is:

`3908f71122f267375ee5eccb3fa3ca85564c634e`

At that snapshot, repository catalog and Voyage guidelines establish:

- canonical project root: `voyage-token-check/`;
- lifecycle: `design-evidence-validation`;
- current authority class: design/evidence;
- authority evidence: `voyage-token-check/DESIGN_STATUS.md`;
- canonical production plugin path, production release branch/source/version remain UNKNOWN.

O4-H0 must preserve those UNKNOWN fields. It must not create release-shaped authority merely to make the benchmark routable.

## 3. Domain metadata

Add exactly one registry entry:

- `domain_id`: `voyage-token-check`
- `scope`: `plugin:voyage-token-check`
- `name`: `Voyage Token Check`
- `lifecycle`: `design-evidence-validation`
- `primary_path`: `voyage-token-check/**`
- `guidelines_path`: `docs/VOYAGE_TOKEN_CHECK_GUIDELINES.md`
- authority refs:
  - `declared_by = docs/REPO_PROJECT_CATALOG.md`
  - `evidence = voyage-token-check/DESIGN_STATUS.md`
- `registration_semantics`: `domain_metadata_only_no_skill_promotion`

Do not add `release_branch`, `manifest`, `artifact`, `release_spec_dir`, production version, deployable plugin path, or writable memory authority.

`PROJECT_MEMORY.md`, `ARCHITECTURE.md`, `LIVE_REFRESH_CONTRACT.md`, and `SECURITY_CONTRACT.md` remain ordinary domain-primary evidence when selected; they are not silently promoted to production authority.

## 4. Frozen-source behavior

For the O4-H benchmark-only authority snapshot:

- `declared_by` observation is `OBSERVED` at `3908f711...`;
- `evidence` observation is `OBSERVED` at `3908f711...`;
- Voyage guidelines and primary-path source blocks use the same frozen target repository SHA through existing builder semantics;
- no release authority observation exists because none is declared.

This does not claim `3908f711...` is current production. It is only the immutable retrospective source snapshot for the consumed Voyage held-out.

## 5. Required regression

Prove:

- domain registry remains schema-valid with unique scope/domain ids;
- Voyage metadata is exact and contains no release-shaped authority;
- `impact_analysis` routing resolves for Voyage;
- `release_lookup` fails closed because no release branch is registered;
- `resolve_authority()` creates an exact snapshot from explicit `declared_by` and `evidence` observations;
- `build_evidence_package()` classifies catalog as `declared_by`, Voyage guidelines as `guidelines`, DESIGN_STATUS as `evidence`, and files under `voyage-token-check/**` as `domain_primary`;
- an unobserved declared evidence authority cannot be used as source evidence;
- unrelated repository paths remain rejected;
- existing Usage Dashboard and Termux deterministic regressions stay green;
- no `PILOT_VALIDATED_SCOPES`, plugin-impact-scope promotion state, O5 policy/evidence, model registry, generation/runtime, product/plugin/release/device bytes change.

Full Agent Skills CI, Plugin Control Plane observation, and SimCore Required CI are mandatory.

## 6. Non-goals

O4-H0 does not execute models, create O4-H expected labels, consume the O4-H case, promote Voyage as an Agent Skill validated scope, establish production/release authority, change O5 thresholds or assignments, or enter O6.

## 7. Exit

O4-H0 exits after exact tested-head merge and merged-main read-back proves canonical Voyage authority/evidence construction while all prior regressions remain green. Only then may O4-H freeze/build its Voyage retrospective benchmark inputs before any O4-H model output.
