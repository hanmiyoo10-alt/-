from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parents[1]
TERMUX_FROZEN_MAIN = "f01c2ef304656de9254191ec2fb9a2c046642f21"


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

    def test_impact_positive_profile_covers_required_boundaries(self):
        specs = self.profile["profiles"]["plugin-impact-scope"]["service-tier-fidelity"]
        self.assertLessEqual(len(specs), 12)
        by_path = {spec["path"]: spec for spec in specs}
        required = {
            "docs/REPO_PROJECT_CATALOG.md",
            ".github/plugin-control-plane/registry.json",
            "plugins/usage-dashboard/runtime/product-manifest.json",
            "plugins/usage-dashboard/runtime-src/bridge-engine/35-request-provenance-capture.part.mjs",
            "plugins/usage-dashboard/runtime-src/bridge-engine/40-sources.part.mjs",
            "plugins/usage-dashboard/src/12-service-tier.part.js",
            "plugins/usage-dashboard/src/14-request-ledger.part.js",
            "plugins/usage-dashboard/src/40-diagnostics.part.js",
            "plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs",
        }
        self.assertEqual(set(by_path), required)
        release_manifest = by_path["plugins/usage-dashboard/runtime/product-manifest.json"]
        self.assertEqual(release_manifest["ref"], "refs/remotes/origin/release-usage-dashboard")
        self.assertEqual(release_manifest["mode"], "full")
        self.assertIn("function requestLedgerKey(row) {", by_path["plugins/usage-dashboard/src/14-request-ledger.part.js"]["needles"])
        self.assertIn("selection-source path must not add", by_path["plugins/usage-dashboard/tests/p50-service-tier-selection-source-fidelity.cjs"]["needles"])

    def test_simcore_heldout_profile_is_frozen_before_human_answer(self):
        specs = self.profile["profiles"]["plugin-impact-scope"][
            "simcore-3m3-structured-sidecar-validation-heldout"
        ]
        self.assertLessEqual(len(specs), 8)
        refs = {spec["ref"] for spec in specs}
        self.assertEqual(
            refs,
            {
                "e4daaa427ed902ca6f8368c45d509f7fd0f26d42",
                "861100f4771967aa5b8ab8811d06f11702c0d3ff",
            },
        )
        paths = {spec["path"] for spec in specs}
        self.assertIn("docs/SIMCORE_GUIDELINES.md", paths)
        self.assertIn("docs/SIMCORE_CONTRACTS_V2.md", paths)
        self.assertIn("docs/SIMCORE_3M_SOURCE_INTELLIGENCE_MASTER_DESIGN_2026-09-01.md", paths)
        self.assertIn("plugins/simcore/latest.js", paths)
        self.assertNotIn("docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_IMPACT_SCOPE_2026-09-01.md", paths)
        self.assertNotIn("docs/SIMCORE_3M_3_STRUCTURED_SIDECAR_VALIDATION_DESIGN_2026-09-01.md", paths)
        self.assertTrue(all(spec["ref"] != "HEAD" for spec in specs))
        self.assertTrue(all("refs/remotes/origin/release-simcore" not in spec["ref"] for spec in specs))

    def test_termux_heldout_profile_is_compact_and_exactly_frozen(self):
        specs = self.profile["profiles"]["plugin-impact-scope"][
            "termux-large-doc-background-autosave-heldout"
        ]
        self.assertLessEqual(len(specs), 7)
        self.assertEqual({spec["ref"] for spec in specs}, {TERMUX_FROZEN_MAIN})
        self.assertTrue(all(spec["ref"] != "HEAD" for spec in specs))
        self.assertEqual(
            {spec["path"] for spec in specs},
            {
                "docs/REPO_PROJECT_CATALOG.md",
                "docs/TERMUX_DEVELOPMENT_GUIDELINES.md",
                "plugins/termux/large-doc-editor/README.md",
                "plugins/termux/large-doc-editor/web/app.js",
                "plugins/termux/large-doc-editor/server.py",
                "plugins/termux/large-doc-editor/chunk_store.py",
                "plugins/termux/large-doc-editor/tests/test_chunk_store.py",
            },
        )
        self.assertTrue(all(spec["mode"] == "needle_windows" for spec in specs))
        self.assertTrue(all(spec["max_bytes"] <= 9000 for spec in specs))

    def test_workflow_materializes_candidate_frozen_refs_generically(self):
        self.assertIn("frozen-ref-preflight-matrix.json", self.workflow)
        self.assertIn("candidate_frozen_source_snapshot", self.workflow)
        self.assertIn("mapfile -t frozen_shas", self.workflow)
        self.assertIn('git fetch --no-tags --depth=1 origin "$frozen_sha"', self.workflow)
        self.assertIn('ZERO_CREDIT_FROZEN_AUTHORITY_SHA:$frozen_sha', self.workflow)
        self.assertNotIn("release-simcore:refs/remotes/origin/release-simcore", self.workflow)
        self.assertNotIn("EVAL_CASE_ID' == 'simcore-3m3", self.workflow)
        self.assertNotIn("simcore-3m3-structured-sidecar-validation-heldout' ]]; then", self.workflow)

    def test_failure_artifacts_include_hidden_eval_directory(self):
        self.assertIn("path: .agent-skill-zero-credit-eval/", self.workflow)
        self.assertIn("include-hidden-files: true", self.workflow)


if __name__ == "__main__":
    unittest.main()
