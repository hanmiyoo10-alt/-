from __future__ import annotations

import re
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SKILL = SKILL_ROOT / "SKILL.md"


class SkillContractTests(unittest.TestCase):
    def test_frontmatter_name_matches_directory_and_description_is_bounded(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertTrue(text.startswith("---\n"))
        frontmatter = text.split("---\n", 2)[1]
        name_match = re.search(r"^name:\s*(\S+)\s*$", frontmatter, re.MULTILINE)
        self.assertIsNotNone(name_match)
        self.assertEqual(name_match.group(1), SKILL_ROOT.name)

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

    def test_routing_contract_has_exact_five_execution_routes(self):
        text = SKILL.read_text(encoding="utf-8")
        for route in ("EXISTING_COMMAND", "HARNESS", "INLINE_SMALL", "MATERIALIZE", "EXCEPTION"):
            self.assertIn(f"`{route}`", text)
        self.assertIn("Visible fan-out is a companion metric. It does not add a sixth execution route.", text)
        self.assertIn("### `REJECT`", text)
        self.assertIn("### `SPLIT`", text)

    def test_guardrails_are_present_and_advisory(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "approximately 20 logical execution/program lines or fewer",
            "approximately 2 KiB of source/program text or less",
            "at most one generated source/test/program file",
            "The v1 numbers are routing defaults, not security boundaries",
            "Crossing a compactness guardrail means choose a better surface. It never means skip validation.",
        ):
            self.assertIn(required, text)

    def test_multi_heredoc_and_mini_build_system_route_to_materialize(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("three modules is still `MATERIALIZE`", text)
        self.assertIn("Default anti-pattern:", text)
        self.assertIn("→ heredoc file A", text)
        self.assertIn("→ heredoc file B", text)
        self.assertIn("→ heredoc file C", text)
        self.assertIn("mini build system", text)

    def test_safety_and_validation_outrank_compactness(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "Correctness, safety, authority, evidence fidelity, and required validation outrank compactness.",
            "Never shorten an execution payload by deleting meaningful tests",
            "Never place secrets, credentials, tokens",
            "Do not bypass Git, CI, main-write, release, security, production",
            "Do not claim this repository can hide or suppress ChatGPT tool-activity UI.",
        ):
            self.assertIn(required, text)

    def test_visible_fanout_prefers_evidence_equivalent_composition(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "repository_owned_visible_fanout",
            "A **semantic work unit** is one bounded goal",
            "prefer the lower-fan-out surface",
            "one existing composition/harness call",
            "Internal bounded reads behind an existing composition remain auditable.",
        ):
            self.assertIn(required, text)

    def test_visible_fanout_preserves_required_separation(self):
        text = SKILL.read_text(encoding="utf-8")
        for required in (
            "required pre-write and post-write currentness or authority barriers",
            "settling or failure verification that requires a later fresh read",
            "targeted drill-down after a bounded summary proves insufficient",
            "consolidation would hide `UNKNOWN`, `CONFLICT`, failure provenance, or source identity",
            "Visible fan-out has no universal numeric ceiling",
            "Required semantic separation outranks a lower activity count.",
        ):
            self.assertIn(required, text)

    def test_visible_fanout_does_not_claim_host_ui_control(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("repository-side proxy", text)
        self.assertIn("not a claim about exact ChatGPT host-card rendering", text)
        self.assertIn("no claim is made that repository-side fan-out equals exact host UI card count", text)

    def test_skill_creates_no_execution_authority(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("development policy, not a source of mutable product, runtime, release, or production truth", text)
        self.assertIn("Do not invent a new writer, executor, privileged hook", text)
        self.assertIn("This routing note is advisory development policy. It does not become source authority.", text)


if __name__ == "__main__":
    unittest.main()
