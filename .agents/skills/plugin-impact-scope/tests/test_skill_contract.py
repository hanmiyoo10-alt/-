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
        self.assertIn("Preservation boundaries:", text)
        self.assertIn("Request identity:", text)
        self.assertIn("No-extra-I/O:", text)
        self.assertIn("minimal connected semantic boundary", text)
        self.assertIn("do not substitute a list of candidate files", text)
        self.assertIn("request-identity and no-extra-I/O preservation boundaries are explicitly checked", text)


if __name__ == "__main__":
    unittest.main()
