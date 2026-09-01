from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]


class ZeroCreditContextProfileContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.profile_path = ROOT / "local-context-profiles.json"
        cls.profile = json.loads(cls.profile_path.read_text(encoding="utf-8"))
        cls.workflow = (REPO_ROOT / ".github" / "workflows" / "agent-skill-zero-credit-eval.yml").read_text(encoding="utf-8")

    def test_every_head_needle_exists_in_its_own_source(self):
        for skill, cases in self.profile["profiles"].items():
            for case_id, specs in cases.items():
                for spec in specs:
                    if spec.get("ref") != "HEAD" or spec.get("mode") != "needle_windows":
                        continue
                    source = (REPO_ROOT / spec["path"]).read_text(encoding="utf-8")
                    for needle in spec["needles"]:
                        with self.subTest(skill=skill, case_id=case_id, path=spec["path"], needle=needle):
                            self.assertIn(needle, source)

    def test_catalog_and_registry_use_source_native_locators(self):
        specs = self.profile["profiles"]["plugin-authority-scan"]["1"]
        by_path = {spec["path"]: spec for spec in specs}
        catalog = by_path["docs/REPO_PROJECT_CATALOG.md"]
        registry = by_path[".github/plugin-control-plane/registry.json"]
        self.assertEqual(catalog["needles"], ["plugin:usage-dashboard"])
        self.assertIn('"usage-dashboard": {', registry["needles"])
        self.assertNotIn("plugin:usage-dashboard", registry["needles"])

    def test_failure_artifacts_include_hidden_eval_directory(self):
        self.assertIn("path: .agent-skill-zero-credit-eval/", self.workflow)
        self.assertIn("include-hidden-files: true", self.workflow)


if __name__ == "__main__":
    unittest.main()
