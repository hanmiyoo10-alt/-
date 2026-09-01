from __future__ import annotations

import importlib.util
import re
import sys
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SKILL = SKILL_ROOT / "SKILL.md"
DISCOVERY = SKILL_ROOT / "scripts" / "discover_impact.py"
VALIDATOR = SKILL_ROOT / "scripts" / "validate_impact_map.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


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

    def test_both_helpers_keep_usage_dashboard_as_only_validated_scope(self):
        discovery = load_module("impact_scope_discovery_contract", DISCOVERY)
        validator = load_module("impact_scope_validator_contract", VALIDATOR)
        self.assertEqual(discovery.PILOT_VALIDATED_SCOPES, {"plugin:usage-dashboard"})
        self.assertEqual(validator.PILOT_VALIDATED_SCOPES, {"plugin:usage-dashboard"})

    def test_generic_procedure_is_parameterized_without_scope_promotion(self):
        text = SKILL.read_text(encoding="utf-8")

        self.assertIn("Pilot validation is limited to `plugin:usage-dashboard`.", text)
        self.assertIn(
            "UNVALIDATED_SCOPE — plugin-impact-scope pilot currently validates only plugin:usage-dashboard.",
            text,
        )
        self.assertIn("Candidate evaluation authority is not validated-scope promotion.", text)

        for required in (
            "--scope <verified-plugin-scope>",
            "--root <bounded-project-root>",
            "request/event producer -> request/state metadata -> presentation or diagnostics consumer",
            "producer capture/write",
            "-> presentation consumer",
            "-> diagnostic or validation consumer",
        ):
            self.assertIn(required, text)

        for forbidden in (
            "--scope plugin:usage-dashboard",
            "--root plugins/usage-dashboard",
            "- Scope: `plugin:usage-dashboard`",
            "Engine -> request metadata -> Plugin UI/Diagnostics",
            "Manager provisioning -> Engine identity -> Diagnostics -> manifest/materializer",
            "Recent Requests or equivalent presentation consumer",
        ):
            self.assertNotIn(forbidden, text)

    def test_skill_assets_contain_no_frozen_product_version_or_sha(self):
        combined = "\n".join(
            path.read_text(encoding="utf-8") for path in [SKILL, DISCOVERY, VALIDATOR]
        )
        self.assertNotRegex(combined, r"3\.0\.0-alpha\.\d+")
        self.assertNotRegex(combined, r"\b[0-9a-f]{40}\b")
        self.assertNotRegex(combined, r"\b[0-9a-f]{64}\b")

    def test_cross_layer_output_contract_requires_flow_and_preservation_boundaries(self):
        text = SKILL.read_text(encoding="utf-8")
        self.assertIn("a file inventory is not a completed flow", text)
        self.assertIn("producer capture/write", text)
        self.assertIn("request/state metadata propagation", text)
        self.assertIn("Preservation boundaries", text)
        self.assertIn("Request identity", text)
        self.assertIn("No-extra-I/O", text)
        self.assertIn("minimal connected semantic boundary", text)
        self.assertIn("do not substitute a list of candidate files", text)
        self.assertIn("request-identity and no-extra-I/O preservation boundaries are explicitly checked", text)

    def test_grounding_hardening_rejects_document_order_placeholders_and_authority_inversion(self):
        text = SKILL.read_text(encoding="utf-8")

        for required in (
            "Evidence bundle order, file order, document order, roadmap succession, or section adjacency never proves a producer/consumer edge by itself.",
            "Evidence-document ordering is also candidate context only.",
            "Do not turn the sequence of evidence files, design documents, or roadmap documents into flow endpoints",
            "A negative authority or exclusion statement constrains claims; it must not be inverted into a positive runtime, generated-artifact, materializer, or release-surface claim.",
            "Treat authority exclusions as exclusions.",
            "Never emit report-template placeholder or instruction text as a field value.",
            "If a value cannot be grounded from current evidence, emit `UNKNOWN` instead.",
            "always reserve enough space to emit `Blocked claims` and `Verdict`",
        ):
            self.assertIn(required, text)

        for forbidden in (
            "current verified report or exact owning reads",
            "preserved boundary + source basis, not applicable, or UNKNOWN",
            "what boundary it protects",
        ):
            self.assertNotIn(forbidden, text)


if __name__ == "__main__":
    unittest.main()
