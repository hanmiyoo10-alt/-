from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = SKILL_ROOT / "scripts" / "scan_authority.py"


def load_module():
    spec = importlib.util.spec_from_file_location("scan_authority", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


scan_authority = load_module()


REGISTRY = {
    "schemaVersion": 1,
    "plugins": {
        "usage-dashboard": {
            "displayName": "Local Usage Dashboard",
            "lifecycle": "production",
            "issueValues": ["usage-dashboard", "Local Usage Dashboard"],
            "paths": ["plugins/usage-dashboard/**", "docs/USAGE_DASHBOARD_*.md"],
            "authority": {
                "releaseBranch": "release-usage-dashboard",
                "manifest": "plugins/usage-dashboard/runtime/product-manifest.json",
                "artifact": "plugins/usage-dashboard/latest.js",
                "releaseSpecDir": ".github/usage-dashboard/releases",
            },
        },
        "other": {
            "displayName": "Other Plugin",
            "lifecycle": "prototype",
            "issueValues": ["other"],
            "paths": ["plugins/other/**"],
            "authority": {"evidence": "plugins/other/README.md"},
        },
    },
    "products": {},
}

CATALOG = """# Repository Project Catalog

| Scope | Name | Lifecycle | Primary path | Authority | Guidelines |
| --- | --- | --- | --- | --- | --- |
| plugin:usage-dashboard | Local Usage Dashboard | production | plugins/usage-dashboard/** | releaseBranch=release-usage-dashboard; manifest=plugins/usage-dashboard/runtime/product-manifest.json; artifact=plugins/usage-dashboard/latest.js; releaseSpecDir=.github/usage-dashboard/releases | docs/USAGE_DASHBOARD_GUIDELINES.md |
| plugin:other | Other Plugin | prototype | plugins/other/** | evidence=plugins/other/README.md | docs/OTHER_GUIDELINES.md |
"""


class FixtureRepo:
    def __init__(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.write(".github/plugin-control-plane/registry.json", json.dumps(REGISTRY))
        self.write("docs/REPO_PROJECT_CATALOG.md", CATALOG)
        self.write("docs/REPOSITORY_COMMON_RULES.md", "# common\n")
        self.write("docs/USAGE_DASHBOARD_GUIDELINES.md", "# usage\n")
        self.write("docs/OTHER_GUIDELINES.md", "# other\n")
        self.write("plugins/usage-dashboard/runtime/product-manifest.json", "{}\n")
        self.write("plugins/usage-dashboard/latest.js", "// artifact\n")
        (self.root / ".github/usage-dashboard/releases").mkdir(parents=True)
        self.write("plugins/other/README.md", "# other\n")

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


class AuthorityScanTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repo = FixtureRepo()

    def tearDown(self) -> None:
        self.repo.close()

    def test_exact_scope_resolves_without_mutation(self):
        before = self.repo.snapshot()
        result = scan_authority.scan(self.repo.root, "plugin:usage-dashboard")
        after = self.repo.snapshot()
        self.assertEqual(before, after)
        self.assertEqual(result["scope"], "plugin:usage-dashboard")
        self.assertTrue(result["pilot_validated"])
        self.assertEqual(result["truth_claim_status"], "LOCATOR_ONLY")
        self.assertFalse(result["mutation_performed"])
        self.assertEqual(
            result["declared_authority"]["manifest"],
            "plugins/usage-dashboard/runtime/product-manifest.json",
        )
        self.assertEqual(result["catalog_consistency"]["status"], "CONSISTENT")

    def test_display_name_and_path_resolve(self):
        by_name = scan_authority.scan(self.repo.root, "Local Usage Dashboard")
        by_path = scan_authority.scan(
            self.repo.root, "plugins/usage-dashboard/runtime/product-manifest.json"
        )
        self.assertEqual(by_name["scope"], "plugin:usage-dashboard")
        self.assertEqual(by_path["scope"], "plugin:usage-dashboard")

    def test_other_scope_is_locator_only_but_not_pilot_validated(self):
        result = scan_authority.scan(self.repo.root, "plugin:other")
        self.assertEqual(result["scope"], "plugin:other")
        self.assertFalse(result["pilot_validated"])
        self.assertEqual(result["truth_claim_status"], "LOCATOR_ONLY")

    def test_unknown_scope_fails_closed(self):
        with self.assertRaises(scan_authority.ScanError) as ctx:
            scan_authority.scan(self.repo.root, "not-a-plugin")
        self.assertEqual(ctx.exception.exit_code, 2)

    def test_ambiguous_alias_fails_closed(self):
        registry = json.loads(json.dumps(REGISTRY))
        registry["plugins"]["other"]["issueValues"].append("shared alias")
        registry["plugins"]["usage-dashboard"]["issueValues"].append("shared alias")
        self.repo.write(".github/plugin-control-plane/registry.json", json.dumps(registry))
        with self.assertRaises(scan_authority.ScanError) as ctx:
            scan_authority.scan(self.repo.root, "shared alias")
        self.assertEqual(ctx.exception.exit_code, 3)
        self.assertIn("ambiguous", str(ctx.exception))

    def test_registry_catalog_mismatch_is_reported_conflict(self):
        catalog = CATALOG.replace(
            "artifact=plugins/usage-dashboard/latest.js",
            "artifact=plugins/usage-dashboard/other.js",
            1,
        )
        self.repo.write("docs/REPO_PROJECT_CATALOG.md", catalog)
        result = scan_authority.scan(self.repo.root, "plugin:usage-dashboard")
        self.assertEqual(result["catalog_consistency"]["status"], "CONFLICT")
        self.assertIn("authority", result["catalog_consistency"]["mismatches"])

    def test_missing_catalog_scope_fails_closed(self):
        catalog = "\n".join(
            line for line in CATALOG.splitlines()
            if "plugin:usage-dashboard" not in line
        )
        self.repo.write("docs/REPO_PROJECT_CATALOG.md", catalog)
        with self.assertRaises(scan_authority.ScanError) as ctx:
            scan_authority.scan(self.repo.root, "plugin:usage-dashboard")
        self.assertEqual(ctx.exception.exit_code, 4)
        self.assertIn("registry/catalog conflict", str(ctx.exception))

    def test_missing_guideline_is_visible_not_invented(self):
        (self.repo.root / "docs/USAGE_DASHBOARD_GUIDELINES.md").unlink()
        result = scan_authority.scan(self.repo.root, "plugin:usage-dashboard")
        check = result["local_locator_checks"]["guideline"]
        self.assertFalse(check["exists_on_current_checkout"])

    def test_cli_json_error_is_machine_readable(self):
        proc = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--repo-root",
                str(self.repo.root),
                "--scope",
                "missing",
                "--json",
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(proc.returncode, 2)
        payload = json.loads(proc.stdout)
        self.assertEqual(payload["status"], "UNKNOWN")
        self.assertIn("error", payload)

    def test_skill_contains_no_frozen_usage_dashboard_version_or_sha(self):
        text = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
        script = SCRIPT.read_text(encoding="utf-8")
        combined = text + script
        self.assertNotRegex(combined, r"3\.0\.0-alpha\.\d+")
        self.assertNotRegex(combined, r"\b[0-9a-f]{40}\b")
        self.assertNotRegex(combined, r"\b[0-9a-f]{64}\b")

    def test_frontmatter_name_matches_directory_and_description_is_bounded(self):
        text = (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")
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


if __name__ == "__main__":
    unittest.main()
