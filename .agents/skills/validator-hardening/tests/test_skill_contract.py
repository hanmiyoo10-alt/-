from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SKILL = SKILL_ROOT / "SKILL.md"
EVALS = SKILL_ROOT / "evals" / "evals.json"


class ValidatorHardeningSkillContractTests(unittest.TestCase):
    def setUp(self):
        self.text = SKILL.read_text(encoding="utf-8")
        self.eval_payload = json.loads(EVALS.read_text(encoding="utf-8"))
        self.evals = self.eval_payload["cases"]

    def test_frontmatter_name_matches_directory_and_description_is_bounded(self):
        self.assertTrue(self.text.startswith("---\n"))
        frontmatter = self.text.split("---\n", 2)[1]
        name = re.search(r"^name:\s*(\S+)\s*$", frontmatter, re.MULTILINE)
        self.assertIsNotNone(name)
        self.assertEqual(name.group(1), SKILL_ROOT.name)

        desc_lines = []
        collecting = False
        for line in frontmatter.splitlines():
            if line.startswith("description:"):
                collecting = True
                first = line.split(":", 1)[1].strip()
                if first not in {">-", ">", "|", "|-"}:
                    desc_lines.append(first)
                continue
            if collecting:
                if line.startswith("  "):
                    desc_lines.append(line.strip())
                else:
                    break
        description = " ".join(desc_lines).strip()
        self.assertGreater(len(description), 0)
        self.assertLessEqual(len(description), 1024)

    def test_current_authority_and_target_owner_are_required_first(self):
        for required in (
            "docs/REPOSITORY_COMMON_RULES.md",
            "docs/REPO_PROJECT_CATALOG.md",
            "current owning project/domain guideline or contract",
            "target validator/classifier source and current tests",
            "REVIEW_BLOCKED_UNKNOWN_OWNER",
            "REVIEW_OWNER_CONFLICT",
            "OUT_OF_SCOPE_FOR_CLAIM_WITH_OWNER_BASIS",
            "relative to the locked requested claim",
        ):
            self.assertIn(required, self.text)

    def test_fail_closed_evidence_semantics_are_explicit(self):
        for required in (
            "Emit or recommend a target `FAIL` only when current owner semantics and observed evidence prove a contract violation.",
            "Missing, ambiguous, unavailable, partial, malformed, or unsupported evidence remains `UNKNOWN`",
            "Never infer absence from incomplete discovery",
            "Do not fabricate defaults, provenance, current SHAs, versions, runtime state, or object identity.",
            "PROVEN_GAP",
        ):
            self.assertIn(required, self.text)

    def test_all_seven_hardening_dimensions_are_present(self):
        headings = (
            "#### A. Text, path, and ref inputs",
            "#### B. Structured data",
            "#### C. Source and AST patterns",
            "#### D. Git and object evidence",
            "#### E. Evidence semantics",
            "#### F. Resource bounds and determinism",
            "#### G. Authority and effect denial",
        )
        for heading in headings:
            self.assertIn(heading, self.text)

    def test_text_path_ref_edge_classes_are_present(self):
        for required in (
            "NUL and other control characters",
            "Unicode surrogate input",
            "normalization-sensitive forms",
            "traversal",
            "option-like refs or arguments",
            "encoded-byte limits",
        ):
            self.assertIn(required, self.text)

    def test_structured_data_edge_classes_are_present(self):
        for required in (
            "duplicate JSON keys",
            "wrong scalar/container types",
            "oversized documents",
            "deep nesting and recursion limits",
            "unknown/additional fields",
            "decode failure",
        ):
            self.assertIn(required, self.text)

    def test_ast_and_git_ambiguity_classes_are_present(self):
        for required in (
            "computed or dynamic expressions",
            "aliasing, indirection",
            "unsupported syntax",
            "exact Git object type",
            "validate expected type/mode combinations",
            "partial clone or lazy object availability",
            "replacement objects",
            "ambient Git repository, config, pathspec, trace, or environment poisoning",
            "exact tree-entry mode as a separate fact",
            "symlink mode `120000` -> `blob`",
            "gitlink mode `160000` -> `commit`",
        ):
            self.assertIn(required, self.text)

    def test_resource_bounds_and_determinism_are_preserved(self):
        for required in (
            "input-size ceilings",
            "scan/file/object-count ceilings",
            "recursion/depth ceilings",
            "subprocess timeout and output ceilings",
            "deterministic ordering and reason-code stability",
            "repeated identical immutable input",
            "generic execution-environment/dependency poisoning outside Git",
            "inherited `PATH`",
            "`PYTHONPATH`/module search path",
        ):
            self.assertIn(required, self.text)

    def test_skill_explicitly_denies_mutation_and_authority(self):
        for required in (
            "Do not auto-fix, rewrite, close, delete, merge, release, deploy, mutate production, mutate devices, or grant authority.",
            "Do not weaken or replace repository tests, Agent Skills CI, project CI, Required, branch protection, or release gates.",
            "read-only/advisory means no autofix or implicit writer",
            "no creation of a second mutable truth store",
        ):
            self.assertIn(required, self.text)

    def test_hypothesis_is_optional_feedback_only(self):
        for required in (
            "Property-based testing is optional guidance only",
            "use Hypothesis only from an already-authorized isolated development environment",
            "never make Hypothesis itself a runtime, production, or CI authority",
            "feedback amplifier",
        ):
            self.assertIn(required, self.text)
        self.assertNotIn("import hypothesis", self.text)

    def test_review_disposition_does_not_replace_target_result(self):
        for required in (
            "HARDENING_REVIEW_COMPLETE",
            "PARTIAL",
            "UNKNOWN",
            "CONFLICT",
            "A review disposition does not rewrite the target validator's own result.",
            "stop with review disposition `UNKNOWN` and reason code `REVIEW_BLOCKED_UNKNOWN_OWNER`",
            "reason code `REVIEW_BLOCKED_UNKNOWN_CLAIM`",
        ):
            self.assertIn(required, self.text)

    def test_no_frozen_commit_sha_in_skill(self):
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", self.text))

    def test_git_backed_actual_bytes_have_identity_beyond_clean_status(self):
        for required in (
            "neutralizes replacement-object substitution",
            "never treat `CLEAN` alone as byte identity",
            "actual bytes inspected even when the worktree reports `CLEAN`",
            "filter-normalized or otherwise transformed checkout bytes",
            "must not rely on `git status` cleanliness",
        ):
            self.assertIn(required, self.text)

    def test_mutable_inputs_are_revalidated_before_receipt(self):
        for required in (
            "prefer reading and executing from an immutable snapshot",
            "immediately before emitting the final receipt revalidate",
            "including a Git checkout/worktree or a non-Git mutable path",
            "recorded digest/equivalent exact identity for every mutable non-Git input",
            "every contributing source, helper, test, fixture, owner-contract, and executed-input identity",
            "regardless of storage mechanism",
            "UNKNOWN / REVIEW_INPUT_CHANGED_DURING_REVIEW",
        ):
            self.assertIn(required, self.text)

    def test_review_receipt_requires_exact_source_identity(self):
        for required in (
            "exact commit object ID",
            "worktree state as `CLEAN` or `DIRTY`",
            "every dirty input that contributes to the review",
            "record an immutable digest or bounded diff identity for each such dirty reviewed/executed input",
            "dirty contributing inputs cannot be bounded and identified completely",
            "reviewed source identity (exact commit/object/artifact identity)",
            "worktree state: CLEAN | DIRTY | NOT_APPLICABLE",
            "dirty reviewed/executed input identities (digest or bounded diff identity) when applicable",
        ):
            self.assertIn(required, self.text)

    def test_eval_fixture_family_is_complete(self):
        self.assertIsInstance(self.eval_payload, dict)
        self.assertEqual(self.eval_payload.get("skill"), "validator-hardening")
        self.assertIsInstance(self.evals, list)
        ids = {case["id"] for case in self.evals}
        self.assertTrue(
            {
                "path-ref-adversarial",
                "json-schema-adversarial",
                "source-ast-adversarial",
                "git-object-adversarial",
                "narrow-validator-negative",
                "unknown-owner-negative",
            }.issubset(ids)
        )
        ast_case = next(case for case in self.evals if case["id"] == "source-ast-adversarial")
        self.assertTrue(
            any(
                "computed" in assertion.lower() or "alias" in assertion.lower()
                for assertion in ast_case["assertions"]
            )
        )
        negative = next(case for case in self.evals if case["id"] == "narrow-validator-negative")
        self.assertIn("NOT_APPLICABLE_WITH_OWNER_BASIS", negative["expected_output"])
        grounded_ids = {
            "path-ref-adversarial",
            "json-schema-adversarial",
            "source-ast-adversarial",
            "git-object-adversarial",
            "narrow-validator-negative",
        }
        for case in self.evals:
            if case["id"] in grounded_ids:
                self.assertIn("Target:", case["prompt"])
                self.assertIn("Owner:", case["prompt"])
                self.assertIn("Claim:", case["prompt"])
                self.assertTrue(
                    "Guideline:" in case["prompt"] or "Guideline/contract:" in case["prompt"]
                )

    def test_read_only_eval_contract_does_not_fabricate_execution(self):
        positive_ids = {
            "path-ref-adversarial",
            "json-schema-adversarial",
            "source-ast-adversarial",
            "git-object-adversarial",
            "narrow-validator-negative",
        }
        for case in self.evals:
            if case["id"] not in positive_ids:
                continue
            self.assertIn("read-only static hardening review", case["expected_output"])
            self.assertIn("no owner tests or adversarial cases were executed", case["expected_output"])
            self.assertIn("PARTIAL", case["expected_output"])
            self.assertTrue(
                any("Does not claim owner tests" in assertion for assertion in case["assertions"])
            )

    def test_read_only_review_never_edits_target_checkout_for_cases(self):
        for required in (
            "propose a focused deterministic adversarial matrix without editing the repository under review",
            "mark every unexecuted case explicitly as proposed/not exercised",
            "do not claim that owner tests, commands, fuzzing, or adversarial inputs were run",
            "isolated temporary workspace/copy",
            "never edit the repository checkout under review merely to create review cases",
        ):
            self.assertIn(required, self.text)

    def test_eval_fixture_is_candidate_corpus_not_live_registration_claim(self):
        self.assertIn("### Eval fixture boundary", self.text)
        self.assertIn("candidate review corpus", self.text)
        self.assertIn("do not describe these fixtures as runnable through the public live-eval workflow", self.text)
        for case in self.evals:
            self.assertTrue(case["prompt"])
            self.assertTrue(case["expected_output"])
            self.assertTrue(case["assertions"])

    def test_executed_cases_require_runtime_identity_and_effect_containment(self):
        for required in (
            "owner-provided sandbox or equivalent proven effect containment",
            "a temporary directory alone is neither effect containment nor host-resource containment",
            "writes outside the workspace, subprocesses, network access, credentials, devices",
            "operating system/filesystem semantics when relevant",
            "interpreter/parser/runtime version",
            "Git and other material tool versions",
            "sandbox/containment identity",
            "do not claim `HARDENING_REVIEW_COMPLETE` from that execution",
            "execution surface/runtime/toolchain identity for each exercised case",
            "bounded host-resource containment",
            "outer wall-clock timeout plus CPU time, memory, process/thread count, filesystem growth, and output limits",
            "effect/resource containment identity for exercised cases",
            "isolated copy/workspace or proven no-write configuration",
            "an owner test proven not to load or execute the target",
            "any owner test that imports, invokes, loads, or otherwise executes the target under review",
            "requires the same proven effect containment and host-resource containment",
            "do not execute the target, including indirectly through owner tests",
        ):
            self.assertIn(required, self.text)

    def test_receipt_preserves_proposed_unexecuted_cases(self):
        self.assertIn(
            "proposed/not-exercised adversarial cases, with reason each remains unexecuted",
            self.text,
        )

    def test_exercised_cases_require_exact_input_and_replay_identity(self):
        for required in (
            "exact input digest or immutable locator",
            "a descriptive case name alone is insufficient",
            "generation seed/configuration needed for replay",
            "reduced/minimized example identity or bounded example value/locator",
            "cases actually exercised, each with exact input digest or immutable locator",
            "generated-case replay provenance when applicable",
        ):
            self.assertIn(required, self.text)

    def test_owner_conflict_is_not_missing_owner_unknown(self):
        for required in (
            "CONFLICT` and reason code `REVIEW_OWNER_CONFLICT",
            "Preserve the conflicting source references",
            "owner disagreement is instead `CONFLICT / REVIEW_OWNER_CONFLICT`",
        ):
            self.assertIn(required, self.text)
        conflict = next(case for case in self.evals if case["id"] == "owner-conflict-negative")
        self.assertIn("CONFLICT", conflict["expected_output"])
        self.assertIn("REVIEW_OWNER_CONFLICT", conflict["expected_output"])

    def test_external_validation_requires_immutable_provenance(self):
        for required in (
            "exact run/check/job identity",
            "exact tested source/head SHA and conclusion",
            "immutable or stable result locator",
            "tested identity matches the reviewed source identity",
            "stale, mismatched, or unattributable remote validation evidence",
            "external validation evidence used, if any",
        ):
            self.assertIn(required, self.text)

    def test_dimension_applicability_is_claim_scoped(self):
        for required in (
            "relative to the locked requested claim",
            "OUT_OF_SCOPE_FOR_CLAIM_WITH_OWNER_BASIS",
            "must not be exercised merely to broaden the review",
            "A narrow claim must not expand into unrelated validator behavior",
        ):
            self.assertIn(required, self.text)

    def test_no_runtime_helper_is_required(self):
        self.assertFalse((SKILL_ROOT / "scripts").exists())


if __name__ == "__main__":
    unittest.main()
