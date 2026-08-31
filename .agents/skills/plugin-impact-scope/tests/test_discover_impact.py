from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "discover_impact.py"


def load_module():
    spec = importlib.util.spec_from_file_location("discover_impact", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


discover_impact = load_module()


class FixtureRepo:
    def __init__(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.write("plugins/usage-dashboard/src/engine.js", "const selection = row.serviceTierSelectionSource;\n")
        self.write("plugins/usage-dashboard/src/ui.js", "render(request.serviceTierSelectionSource);\n")
        self.write("plugins/usage-dashboard/tests/p45.cjs", "assert.ok('serviceTierSelectionSource');\n")
        self.write("plugins/usage-dashboard/README.md", "No runtime edge is proven by this text.\n")
        self.write("outside.txt", "serviceTierSelectionSource\n")

    def write(self, rel: str, content: str) -> None:
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def snapshot(self) -> dict[str, bytes]:
        return {
            str(path.relative_to(self.root)): path.read_bytes()
            for path in self.root.rglob("*")
            if path.is_file()
        }

    def close(self) -> None:
        self.temp.cleanup()


class DiscoverImpactTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FixtureRepo()

    def tearDown(self) -> None:
        self.repo.close()

    def test_usage_dashboard_discovery_is_read_only_and_candidate_only(self):
        before = self.repo.snapshot()
        result = discover_impact.discover(
            self.repo.root,
            "plugin:usage-dashboard",
            ["plugins/usage-dashboard"],
            ["serviceTierSelectionSource"],
        )
        after = self.repo.snapshot()
        self.assertEqual(before, after)
        self.assertTrue(result["pilot_validated"])
        self.assertFalse(result["mutation_performed"])
        self.assertEqual(result["truth_claim_status"], "MECHANICAL_CANDIDATES_ONLY")
        self.assertGreaterEqual(result["returned_results"], 3)
        self.assertTrue(all(item["evidence_class"] == "CANDIDATE_ONLY" for item in result["candidate_results"]))
        self.assertTrue(all(item["semantic_claim"] == "UNPROVEN" for item in result["candidate_results"]))

    def test_scope_outside_pilot_fails_closed(self):
        with self.assertRaises(discover_impact.DiscoveryError) as ctx:
            discover_impact.discover(
                self.repo.root,
                "plugin:simcore",
                ["plugins/usage-dashboard"],
                ["serviceTierSelectionSource"],
            )
        self.assertIn("UNVALIDATED_SCOPE", str(ctx.exception))

    def test_search_roots_are_bounded(self):
        result = discover_impact.discover(
            self.repo.root,
            "plugin:usage-dashboard",
            ["plugins/usage-dashboard/src"],
            ["serviceTierSelectionSource"],
        )
        paths = {item["path"] for item in result["candidate_results"]}
        self.assertNotIn("outside.txt", paths)
        self.assertNotIn("plugins/usage-dashboard/tests/p45.cjs", paths)

    def test_result_limit_is_enforced_and_reported(self):
        result = discover_impact.discover(
            self.repo.root,
            "plugin:usage-dashboard",
            ["plugins/usage-dashboard"],
            ["serviceTierSelectionSource"],
            max_results=2,
        )
        self.assertEqual(result["returned_results"], 2)
        self.assertTrue(result["truncated"])
        self.assertGreater(result["total_matches"], result["returned_results"])

    def test_no_match_does_not_claim_no_dependency(self):
        result = discover_impact.discover(
            self.repo.root,
            "plugin:usage-dashboard",
            ["plugins/usage-dashboard"],
            ["not-present-symbol"],
        )
        self.assertEqual(result["status"], "NO_MATCH")
        self.assertIn("does not prove", result["absence_semantics"])

    def test_cli_error_is_machine_readable(self):
        proc = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--repo-root",
                str(self.repo.root),
                "--scope",
                "plugin:simcore",
                "--root",
                "plugins/usage-dashboard",
                "--seed",
                "x",
                "--json",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 2)
        payload = json.loads(proc.stdout)
        self.assertEqual(payload["status"], "UNKNOWN")
        self.assertFalse(payload["mutation_performed"])

    def test_skill_contains_no_frozen_versions_or_sha_constants(self):
        combined = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8") + SCRIPT.read_text(encoding="utf-8")
        self.assertNotRegex(combined, r"3\.0\.0-alpha\.\d+")
        self.assertNotRegex(combined, r"\b[0-9a-f]{40}\b")
        self.assertNotRegex(combined, r"\b[0-9a-f]{64}\b")


if __name__ == "__main__":
    unittest.main()
