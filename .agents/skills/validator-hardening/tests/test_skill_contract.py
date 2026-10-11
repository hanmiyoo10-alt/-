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
        self.evals = json.loads(EVALS.read_text(encoding="utf-8"))

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
            "exact object type",
            "blob, tree, symlink, and gitlink distinctions",
            "partial clone or lazy object availability",
            "replacement objects",
            "ambient Git repository, config, pathspec, trace, or environment poisoning",
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
        ):
            self.assertIn(required, self.text)

    def test_no_frozen_commit_sha_in_skill(self):
        self.assertIsNone(re.search(r"\b[0-9a-f]{40}\b", self.text))

    def test_eval_fixture_family_is_complete(self):
        self.assertIsInstance(self.evals, list)
        ids = {case["id"] for case in self.evals}
        self.assertTrue(
            {
                "path-ref-adversarial",
                "json-schema-adversarial",
                "git-object-adversarial",
                "narrow-validator-negative",
            }.issubset(ids)
        )
        negative = next(case for case in self.evals if case["id"] == "narrow-validator-negative")
        self.assertFalse(negative["should_trigger_broadening"])

    def test_no_runtime_helper_is_required(self):
        self.assertFalse((SKILL_ROOT / "scripts").exists())


if __name__ == "__main__":
    unittest.main()
